import mongoose from "mongoose";

const { Schema, model } = mongoose;

const refreshSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  userAgent: String,
  ip: String
}, { timestamps: true });

export const RefreshSession = model("RefreshSession", refreshSchema);

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String },
  googleId: { type: String, unique: true, sparse: true, index: true },
  avatar: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
  notificationSettings: {
    workflow: { type: Boolean, default: true },
    approval: { type: Boolean, default: true },
    risk: { type: Boolean, default: true }
  },
  apiKeys: [{ name: String, keyHash: String, lastFour: String, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true, toJSON: { transform: (_doc, ret) => { delete ret.passwordHash; if (ret.apiKeys) ret.apiKeys = ret.apiKeys.map(k => ({name:k.name,lastFour:k.lastFour,createdAt:k.createdAt})); return ret; } } });
export const User = model("User", userSchema);

const workflowSchema = new Schema({
  goal: { type: String, required: true, maxlength: 2000 },
  intent: String,
  status: { type: String, enum: ["draft","planning","running","awaiting_approval","completed","failed","rejected","escalated"], default: "draft", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tasks: { type: [Schema.Types.Mixed], default: [] },
  results: { type: Schema.Types.Mixed, default: {} },
  validations: { type: Schema.Types.Mixed, default: {} },
  risks: { type: Schema.Types.Mixed, default: {} },
  recoveries: { type: [Schema.Types.Mixed], default: [] },
  memoriesUsed: { type: [Schema.Types.Mixed], default: [] },
  pendingTaskId: String,
  startedAt: Date,
  completedAt: Date,
  timeSavedMinutes: { type: Number, default: 0 },
  confidence: Number,
  error: String,
  version: { type: Number, default: 1 }
}, { timestamps: true });
workflowSchema.index({ createdBy: 1, createdAt: -1 });
export const Workflow = model("Workflow", workflowSchema);

const taskSchema = new Schema({
  workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
  taskId: { type: String, required: true },
  taskName: String,
  description: String,
  tool: String,
  status: String,
  priority: Number,
  requiresApproval: Boolean,
  startedAt: Date,
  completedAt: Date,
  output: Schema.Types.Mixed,
  validation: Schema.Types.Mixed
}, { timestamps: true });
taskSchema.index({ workflowId: 1, taskId: 1 }, { unique: true });
export const Task = model("Task", taskSchema);

const approvalSchema = new Schema({
  workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
  taskId: { type: String, required: true },
  action: String,
  riskLevel: { type: String, enum: ["SAFE","MEDIUM","HIGH"], default: "HIGH" },
  riskScore: Number,
  reason: String,
  status: { type: String, enum: ["Pending","Approved","Rejected"], default: "Pending", index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  reviewNote: String
}, { timestamps: true });
approvalSchema.index({ requestedBy: 1, status: 1, createdAt: -1 });
export const Approval = model("Approval", approvalSchema);

const logSchema = new Schema({
  workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
  type: { type: String, enum: ["info","agent","error","retry","approval","success"], default: "info" },
  agent: String,
  message: String,
  metadata: Schema.Types.Mixed,
  at: { type: Date, default: Date.now, index: true }
});
export const ExecutionLog = model("ExecutionLog", logSchema);

const analyticsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, index: true },
  totalWorkflows: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  rejected: { type: Number, default: 0 },
  tasksAutomated: { type: Number, default: 0 },
  timeSavedMinutes: { type: Number, default: 0 },
  totalApprovals: { type: Number, default: 0 },
  approvedApprovals: { type: Number, default: 0 },
  daily: [{ date: String, executions: Number, completed: Number, failed: Number, timeSaved: Number }]
}, { timestamps: true });
export const Analytics = model("Analytics", analyticsSchema);

const resetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, unique: true, required: true },
  expiresAt: { type: Date, index: { expires: 0 } }
}, { timestamps: true });
export const PasswordReset = model("PasswordReset", resetSchema);
