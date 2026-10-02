import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Approval, Workflow } from "../models.js";
import { runAgent } from "../services/ai.js";
import { asyncHandler } from "../utils.js";
import { emitWorkflow } from "../services/socket.js";

const router=Router(); router.use(requireAuth);

router.get("/", asyncHandler(async(req,res)=>{
  const approvals=await Approval.find({requestedBy:req.user._id}).sort({createdAt:-1}).limit(100).lean();
  res.json({approvals});
}));
router.post("/create", asyncHandler(async(req,res)=>{
  const {workflowId,taskId}=req.body;
  const wf=await Workflow.findOne({_id:workflowId,createdBy:req.user._id});
  if(!wf) return res.status(404).json({message:"Workflow not found"});
  const risk=wf.risks?.[taskId]||{};
  const approval=await Approval.create({workflowId,taskId,action:wf.tasks.find(t=>t.id===taskId)?.name||"Agent action",riskLevel:risk.level||"HIGH",riskScore:risk.score||60,reason:risk.reason||"Human review required",requestedBy:req.user._id});
  emitWorkflow(workflowId,"approval-created",{approval});
  res.status(201).json({approval});
}));

router.post("/approve", asyncHandler(async(req,res)=>{
  const {approvalId,note}=req.body;
  const approval=await Approval.findOne({_id:approvalId,requestedBy:req.user._id,status:"Pending"});
  if(!approval) return res.status(404).json({message:"Pending approval not found"});
  const wf=await Workflow.findOne({_id:approval.workflowId,createdBy:req.user._id});
  if(!wf) return res.status(404).json({message:"Workflow not found"});
  approval.status="Approved"; approval.reviewedBy=req.user._id; approval.reviewedAt=new Date(); approval.reviewNote=note||""; await approval.save();
  try {
    const run=await runAgent({
      goal:wf.goal,workflow_id:wf.id,user_id:req.user._id.toString(),tasks:wf.tasks,
      results:wf.results,validations:wf.validations,risks:wf.risks,approved_tasks:[approval.taskId]
    });
    wf.status=run.status; wf.tasks=run.tasks; wf.results=run.results; wf.validations=run.validations; wf.risks=run.risks;
    wf.recoveries=run.recoveries; wf.memoriesUsed=run.memories_used; wf.pendingTaskId=run.pending_task_id; wf.confidence=run.confidence;
    if(run.status==="completed") wf.completedAt=new Date();
    await wf.save();
    if(run.status==="awaiting_approval") emitWorkflow(wf.id,"approval-created",{});
    else if(run.status==="completed") emitWorkflow(wf.id,"workflow-completed",{confidence:run.confidence});
    else if(["failed","escalated"].includes(run.status)) emitWorkflow(wf.id,"workflow-failed",{status:run.status});
    res.json({approval,workflow:wf,run});
  } catch(e) {
    wf.status="failed"; wf.error=e.response?.data?.detail||e.message; await wf.save();
    res.status(502).json({message:"Could not resume AI workflow",detail:wf.error});
  }
}));

router.post("/reject", asyncHandler(async(req,res)=>{
  const {approvalId,note}=req.body;
  const approval=await Approval.findOne({_id:approvalId,requestedBy:req.user._id,status:"Pending"});
  if(!approval) return res.status(404).json({message:"Pending approval not found"});
  const wf=await Workflow.findOne({_id:approval.workflowId,createdBy:req.user._id});
  approval.status="Rejected"; approval.reviewedBy=req.user._id; approval.reviewedAt=new Date(); approval.reviewNote=note||""; await approval.save();
  wf.status="rejected"; wf.error=note||"Human rejected the pending action"; wf.completedAt=new Date(); await wf.save();
  emitWorkflow(wf.id,"workflow-failed",{status:"rejected",reason:wf.error});
  res.json({approval,workflow:wf});
}));
export default router;
