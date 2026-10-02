import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Check,
  Loader2,
  AlertTriangle,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import api from "../api";
import {
  Card,
  PageTitle,
  StatusPill,
  useToast,
} from "../App";

// ============================================================
// WORKFLOW STAGES
// ============================================================

const stages = [
  ["goal", "User Goal"],
  ["planner", "Planner"],
  ["executor", "Executor"],
  ["validator", "Validator"],
  ["recovery", "Recovery"],
  ["approval", "Approval"],
  ["result", "Completed"],
];

// ============================================================
// EXECUTION PAGE
// ============================================================

export default function Execution() {
  const { id } = useParams();
  const [q] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const notify = useToast();

  // ============================================================
  // LOAD WORKFLOW
  // ============================================================

  const load = async () => {
    try {
      const response = await api.get(`/workflow/${id}`);
      setData(response.data);
    } catch (error) {
      notify(
        error?.response?.data?.message ||
          "Failed to load workflow execution."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    load();
  }, [id]);

  // ============================================================
  // AUTO EXECUTION
  // ============================================================

  useEffect(() => {
    if (
      data?.workflow?.status === "draft" &&
      q.get("auto") === "1" &&
      !starting
    ) {
      setStarting(true);

      api
        .post("/workflow/execute", {
          workflowId: id,
        })
        .then(() => load())
        .catch((error) => {
          notify(
            error?.response?.data?.message ||
              "Execution failed"
          );
        })
        .finally(() => {
          setStarting(false);
        });
    }
  }, [data, q, id, starting]);

  // ============================================================
  // SOCKET.IO LIVE UPDATES
  // ============================================================

  useEffect(() => {
    const base =
      import.meta.env.VITE_SOCKET_URL ||
      window.location.origin;

    let socket;

    import("socket.io-client").then(({ io }) => {
      socket = io(base);

      socket.emit("join-workflow", id);

      const events = [
        "workflow-running",
        "workflow-completed",
        "workflow-failed",
        "approval-created",
      ];

      events.forEach((event) => {
        socket.on(event, load);
      });
    });

    return () => {
      socket?.disconnect();
    };
  }, [id]);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading execution...
      </div>
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================

  if (!data?.workflow) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-slate-500">
        Workflow execution could not be found.
      </div>
    );
  }

  const w = data.workflow;

  // ============================================================
  // DETERMINE CURRENT STAGE
  // ============================================================

  const current =
    w.status === "completed"
      ? "result"
      : w.status === "awaiting_approval"
      ? "approval"
      : w.status === "failed" || w.status === "escalated"
      ? "recovery"
      : w.tasks?.some(
          (task) => task.status === "completed"
        )
      ? "executor"
      : "planner";

  const activeIndex = stages.findIndex(
    ([key]) => key === current
  );

  // ============================================================
  // REACT FLOW NODES
  // ============================================================

  const nodes = stages.map(([key, label], index) => ({
    id: key,

    position: {
      x: index * 190,
      y: 70,
    },

    data: {
      label: (
        <div
          className={`px-4 py-3 rounded-xl border text-center min-w-[140px] ${
            index < activeIndex
              ? "border-emerald-400/30 bg-emerald-400/10"
              : index === activeIndex
              ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,.12)]"
              : "border-slate-700 bg-slate-900/80"
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {key}
          </div>

          <div className="text-sm text-white mt-1">
            {label}
          </div>
        </div>
      ),
    },

    type: "default",
  }));

  // ============================================================
  // REACT FLOW EDGES
  //
  // IMPORTANT:
  // map(([a], [b])) was WRONG.
  //
  // Array.map() provides:
  //   item
  //   index
  //   array
  //
  // The old code attempted to destructure the numeric index
  // as [b], producing:
  //
  //   TypeError: number 0 is not iterable
  //
  // Correct:
  //   map(([a, b]) => ...)
  // ============================================================

  const edges = stages
    .slice(0, -1)
    .map(([a, b]) => ({
      id: `${a}-${b}`,

      source: a,

      target: b,

      animated:
        a === stages[activeIndex]?.[0],

      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    }));

  // ============================================================
  // TASK COUNTS
  // ============================================================

  const tasks = Array.isArray(w.tasks)
    ? w.tasks
    : [];

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const memoriesUsed = Array.isArray(w.memoriesUsed)
    ? w.memoriesUsed.length
    : 0;

  const logs = Array.isArray(data.logs)
    ? data.logs
    : [];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* ======================================================
          PAGE TITLE
      ====================================================== */}

      <PageTitle
        eyebrow="Execution Monitor"
        title={w.goal || "Workflow Execution"}
        desc={`Workflow ${w._id || id}`}
        action={
          <StatusPill status={w.status} />
        }
      />

      {/* ======================================================
          EXECUTION OVERVIEW
      ====================================================== */}

      <div className="grid xl:grid-cols-3 gap-5">

        {/* React Flow */}

        <Card className="xl:col-span-2 p-0 overflow-hidden">
          <div className="h-[300px] bg-slate-950/30">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              proOptions={{
                hideAttribution: true,
              }}
            >
              <Background color="#172033" />

              <Controls />

              <MiniMap />
            </ReactFlow>
          </div>
        </Card>

        {/* Execution Confidence */}

        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-600">
            Execution confidence
          </div>

          <div className="text-4xl font-semibold text-white mt-2">
            {w.confidence ?? "—"}

            <span className="text-lg text-slate-600">
              %
            </span>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <Info
              label="Tasks"
              value={tasks.length}
            />

            <Info
              label="Completed"
              value={completedTasks}
            />

            <Info
              label="Time saved"
              value={`${w.timeSavedMinutes || 0} min`}
            />

            <Info
              label="Memories used"
              value={memoriesUsed}
            />
          </div>
        </Card>
      </div>

      {/* ======================================================
          TASK GRAPH + LIVE TIMELINE
      ====================================================== */}

      <div className="grid xl:grid-cols-2 gap-5 mt-5">

        {/* Task Graph */}

        <Card>
          <div className="flex justify-between mb-4">
            <div>
              <h2 className="text-white font-medium">
                Task graph
              </h2>

              <p className="text-xs text-slate-600">
                Agent plan and validation state
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <div
                  key={
                    task.id ||
                    task._id ||
                    `task-${index}`
                  }
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60"
                >
                  {/* Status Icon */}

                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      task.status === "completed"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : task.status === "failed"
                        ? "bg-red-400/10 text-red-300"
                        : "bg-cyan-400/10 text-cyan-300"
                    }`}
                  >
                    {task.status === "completed" ? (
                      <Check size={16} />
                    ) : task.status === "failed" ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    )}
                  </div>

                  {/* Task Information */}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200">
                      {task.name ||
                        task.title ||
                        "Unnamed task"}
                    </div>

                    <div className="text-xs text-slate-600 truncate">
                      {task.description ||
                        "No description available"}
                    </div>
                  </div>

                  {/* Tool */}

                  <span className="text-xs text-slate-500">
                    {task.tool || "—"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-600 py-4">
                No tasks available yet.
              </div>
            )}
          </div>
        </Card>

        {/* Live Timeline */}

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Clock3
              size={18}
              className="text-cyan-300"
            />

            <h2 className="text-white font-medium">
              Live timeline
            </h2>
          </div>

          <div className="space-y-4 max-h-[390px] overflow-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div
                  key={
                    log._id ||
                    log.id ||
                    `log-${index}`
                  }
                  className="flex gap-3"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />

                  <div className="min-w-0">
                    <div className="text-sm text-slate-300">
                      {log.message ||
                        "Workflow event"}
                    </div>

                    <div className="text-[11px] text-slate-600">
                      {log.at
                        ? new Date(
                            log.at
                          ).toLocaleTimeString()
                        : "—"}{" "}
                      ·{" "}
                      {log.agent || "system"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-600 text-sm">
                No events recorded yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ======================================================
          APPROVAL REQUIRED
      ====================================================== */}

      {w.status === "awaiting_approval" && (
        <Card className="mt-5 border-amber-400/20 bg-amber-400/5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-amber-300" />

            <div>
              <div className="text-white font-medium">
                Human approval required
              </div>

              <div className="text-sm text-slate-500">
                Review this action in the Approval Center
                before the agent can continue.
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function Info({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="text-slate-200">
        {value}
      </span>
    </div>
  );
}