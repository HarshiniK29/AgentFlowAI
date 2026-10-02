import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Workflow, Task, ExecutionLog, Approval, Analytics } from "../models.js";
import { asyncHandler } from "../utils.js";
import { planAgent, runAgent } from "../services/ai.js";
import { emitWorkflow } from "../services/socket.js";

const router=Router();
router.use(requireAuth);

async function persistRun(wf, run) {
  wf.status=run.status; wf.tasks=run.tasks||wf.tasks; wf.results=run.results||{};
  wf.validations=run.validations||{}; wf.risks=run.risks||{}; wf.recoveries=run.recoveries||[];
  wf.memoriesUsed=run.memories_used||[]; wf.pendingTaskId=run.pending_task_id||undefined;
  wf.confidence=run.confidence ?? wf.confidence;
  if(!wf.startedAt) wf.startedAt=new Date();
  if(["completed","failed","escalated","rejected"].includes(run.status)) wf.completedAt=new Date();
  if(run.status==="completed") wf.timeSavedMinutes=Math.max(5, Math.round((wf.tasks?.length||1)*7));
  await wf.save();

  await Task.deleteMany({workflowId:wf._id});
  if(wf.tasks?.length) await Task.insertMany(wf.tasks.map(t=>({
    workflowId:wf._id, taskId:t.id, taskName:t.name, description:t.description, tool:t.tool,
    status:t.status, priority:t.priority, requiresApproval:t.requires_approval ?? t.requiresApproval,
    output:run.results?.[t.id], validation:run.validations?.[t.id]
  })), {ordered:false});

  const lines=run.logs||[];
  if(lines.length) await ExecutionLog.insertMany(lines.map((message,i)=>({
    workflowId:wf._id,
    type:/error|failed/i.test(message)?"error":/approval/i.test(message)?"approval":/retry|recover/i.test(message)?"retry":/completed|success/i.test(message)?"success":"agent",
    agent:/Planner/i.test(message)?"Planner":/Executor/i.test(message)?"Executor":/Validator/i.test(message)?"Validator":/Recovery/i.test(message)?"Recovery":/Risk/i.test(message)?"Risk":"System",
    message, at:new Date(Date.now()+i)
  })));
}

async function ensureApproval(wf, userId) {
  if(wf.status!=="awaiting_approval" || !wf.pendingTaskId) return null;
  const risk=wf.risks?.[wf.pendingTaskId] || {};
  const task=wf.tasks.find(t=>t.id===wf.pendingTaskId);
  const existing=await Approval.findOne({workflowId:wf._id,taskId:wf.pendingTaskId,status:"Pending"});
  if(existing) return existing;
  return Approval.create({
    workflowId:wf._id, taskId:wf.pendingTaskId,
    action:task?.name || "Approve pending action",
    riskLevel:risk.level||"HIGH", riskScore:risk.score||60, reason:risk.reason||"Agent requested human approval",
    requestedBy:userId
  });
}

router.post("/create", asyncHandler(async(req,res)=>{
  const {goal}=req.body;
  if(typeof goal!=="string"||goal.trim().length<5) return res.status(400).json({message:"Goal must be at least 5 characters"});
  const wf=await Workflow.create({goal:goal.trim(),createdBy:req.user._id,status:"planning"});
  emitWorkflow(wf._id.toString(),"workflow-created",{status:"planning",goal:wf.goal});
  try {
    const plan=await planAgent({goal:wf.goal,workflow_id:wf._id.toString(),user_id:req.user._id.toString()});
    wf.intent=plan.intent; wf.tasks=plan.tasks; wf.status="draft"; await wf.save();
    await Task.insertMany(plan.tasks.map(t=>({workflowId:wf._id,taskId:t.id,taskName:t.name,description:t.description,tool:t.tool,status:t.status,priority:t.priority,requiresApproval:t.requires_approval})));
    emitWorkflow(wf._id.toString(),"workflow-created",{status:"draft",tasks:wf.tasks});
    res.status(201).json({workflow:wf});
  } catch(e) {
    wf.status="failed"; wf.error=e.response?.data?.detail||e.message; await wf.save();
    emitWorkflow(wf._id.toString(),"workflow-failed",{error:wf.error});
    res.status(502).json({message:"AI planning service unavailable",detail:wf.error,workflow:wf});
  }
}));

router.post("/execute", asyncHandler(async(req,res)=>{
  const {workflowId, simulate_failures}=req.body;
  const wf=await Workflow.findOne({_id:workflowId,createdBy:req.user._id});
  if(!wf) return res.status(404).json({message:"Workflow not found"});
  if(["completed","rejected"].includes(wf.status)) return res.status(409).json({message:`Workflow is already ${wf.status}`});
  wf.status="running"; if(!wf.startedAt) wf.startedAt=new Date(); await wf.save();
  emitWorkflow(wf.id,"workflow-running",{tasks:wf.tasks});
  try {
    const run=await runAgent({
      goal:wf.goal,workflow_id:wf.id,user_id:req.user._id.toString(),tasks:wf.tasks||[],
      results:wf.results||{},validations:wf.validations||{},risks:wf.risks||{},
      approved_tasks:[],simulate_failures:simulate_failures||{}
    });
    await persistRun(wf,run);
    if(run.status==="awaiting_approval") {
      const approval=await ensureApproval(wf,req.user._id);
      emitWorkflow(wf.id,"approval-created",{approval});
    } else if(run.status==="completed") emitWorkflow(wf.id,"workflow-completed",{confidence:run.confidence});
    else if(["failed","escalated"].includes(run.status)) emitWorkflow(wf.id,"workflow-failed",{status:run.status});
    res.json({workflow:wf,run});
  } catch(e) {
    wf.status="failed"; wf.error=e.response?.data?.detail||e.message; await wf.save();
    await ExecutionLog.create({workflowId:wf._id,type:"error",agent:"Gateway",message:wf.error});
    emitWorkflow(wf.id,"workflow-failed",{error:wf.error});
    res.status(502).json({message:"AI execution service unavailable",detail:wf.error});
  }
}));

router.get("/history", asyncHandler(async(req,res)=>{
  const page=Math.max(1,Number(req.query.page||1)), limit=Math.min(50,Math.max(1,Number(req.query.limit||20)));
  const [items,total]=await Promise.all([
    Workflow.find({createdBy:req.user._id}).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),
    Workflow.countDocuments({createdBy:req.user._id})
  ]);
  res.json({items,total,page,limit});
}));

router.get("/:id", asyncHandler(async(req,res)=>{
  const wf=await Workflow.findOne({_id:req.params.id,createdBy:req.user._id}).lean();
  if(!wf) return res.status(404).json({message:"Workflow not found"});
  const [tasks,logs,approvals]=await Promise.all([
    Task.find({workflowId:wf._id}).sort({priority:1}).lean(),
    ExecutionLog.find({workflowId:wf._id}).sort({at:1}).lean(),
    Approval.find({workflowId:wf._id}).sort({createdAt:-1}).lean()
  ]);
  res.json({workflow:wf,tasks,logs,approvals});
}));

export default router;
