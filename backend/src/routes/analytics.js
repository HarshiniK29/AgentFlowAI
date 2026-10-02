import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Analytics, Workflow, Approval, ExecutionLog } from "../models.js";
import { asyncHandler } from "../utils.js";

const router=Router(); router.use(requireAuth);
router.get("/", asyncHandler(async(req,res)=>{
  const userId=req.user._id;
  const [counts,approvals,logs,trend]=await Promise.all([
    Workflow.aggregate([{$match:{createdBy:userId}},{$group:{_id:"$status",count:{$sum:1},timeSaved:{$sum:"$timeSavedMinutes"},tasks:{$sum:{$size:"$tasks"}}}}]),
    Approval.aggregate([{$match:{requestedBy:userId}},{$group:{_id:"$status",count:{$sum:1}}}]),
    ExecutionLog.aggregate([{$lookup:{from:"workflows",localField:"workflowId",foreignField:"_id",as:"wf"}},{$unwind:"$wf"},{$match:{"wf.createdBy":userId}},{$group:{_id:"$type",count:{$sum:1}}}]),
    Workflow.aggregate([{$match:{createdBy:userId}},{$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt"}},executions:{$sum:1},completed:{$sum:{$cond:[{$eq:["$status","completed"]},1,0]}},failed:{$sum:{$cond:[{$in:["$status",["failed","escalated","rejected"]]},1,0]}},timeSaved:{$sum:"$timeSavedMinutes"}}},{$sort:{_id:1}},{$limit:30}])
  ]);
  const map=Object.fromEntries(counts.map(x=>[x._id,x]));
  const total=counts.reduce((a,x)=>a+x.count,0), completed=map.completed?.count||0;
  res.json({
    summary:{totalWorkflows:total,activeWorkflows:(map.running?.count||0)+(map.planning?.count||0)+(map.awaiting_approval?.count||0),completedWorkflows:completed,failedWorkflows:(map.failed?.count||0)+(map.escalated?.count||0),rejectedWorkflows:map.rejected?.count||0,successRate:total?Math.round(completed/total*100):0,timeSavedMinutes:counts.reduce((a,x)=>a+(x.timeSaved||0),0),tasksAutomated:counts.reduce((a,x)=>a+(x.tasks||0),0)},
    approvals:Object.fromEntries(approvals.map(x=>[x._id,x.count])),
    events:Object.fromEntries(logs.map(x=>[x._id,x.count])),
    trend:trend.map(x=>({date:x._id,...x,_id:undefined}))
  });
}));
export default router;
