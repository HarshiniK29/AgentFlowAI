import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from "lucide-react";

import api from "../api";
import {
  Card,
  PageTitle,
  StatusPill,
} from "../App";


// ============================================================
// MONITORING PAGE
// ============================================================

export default function Monitoring() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadMonitoring = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/workflow/history?limit=50"
        );

        if (!mounted) return;

        const data = response?.data;

        if (Array.isArray(data)) {
          setItems(data);
        } else if (Array.isArray(data?.items)) {
          setItems(data.items);
        } else if (Array.isArray(data?.workflows)) {
          setItems(data.workflows);
        } else if (Array.isArray(data?.history)) {
          setItems(data.history);
        } else {
          setItems([]);
        }
      } catch (err) {
        if (!mounted) return;

        console.error("Failed to load monitoring data:", err);

        setError(
          err?.response?.data?.message ||
            "Unable to load monitoring data."
        );

        setItems([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMonitoring();

    return () => {
      mounted = false;
    };
  }, []);


  // ==========================================================
  // METRICS
  // ==========================================================

  const total = items.length;

  const running = items.filter(
    (item) =>
      ["running", "executing"].includes(
        String(item?.status || "").toLowerCase()
      )
  ).length;

  const completed = items.filter(
    (item) =>
      ["completed", "success", "succeeded"].includes(
        String(item?.status || "").toLowerCase()
      )
  ).length;

  const failed = items.filter(
    (item) =>
      ["failed", "error", "rejected"].includes(
        String(item?.status || "").toLowerCase()
      )
  ).length;


  // ==========================================================
  // METRIC CARD
  // ==========================================================

  function Metric({ icon: Icon, label, value }) {
    return (
      <Card>
        <div className="flex items-center justify-between">

          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {label}
            </div>

            <div className="text-2xl font-semibold text-white mt-2">
              {value}
            </div>
          </div>

          <div className="h-10 w-10 rounded-xl bg-cyan-400/10 flex items-center justify-center">
            <Icon
              size={18}
              className="text-cyan-300"
            />
          </div>

        </div>
      </Card>
    );
  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div>

      <PageTitle
        eyebrow="Operations"
        title="Agent Monitoring"
        desc="Monitor workflow activity and agent execution status in real time."
      />


      {/* ======================================================
          METRICS
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

        <Metric
          icon={Radio}
          label="Total Workflows"
          value={total}
        />

        <Metric
          icon={Activity}
          label="Running"
          value={running}
        />

        <Metric
          icon={CheckCircle2}
          label="Completed"
          value={completed}
        />

        <Metric
          icon={AlertTriangle}
          label="Failed"
          value={failed}
        />

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <Card className="mb-6 border border-red-400/20">

          <div className="flex items-center gap-3 text-red-300">

            <AlertTriangle size={18} />

            <span className="text-sm">
              {error}
            </span>

          </div>

        </Card>
      )}


      {/* ======================================================
          MONITORING TABLE
      ====================================================== */}

      <Card>

        <div className="flex items-center justify-between mb-5">

          <div>
            <h2 className="text-lg font-semibold text-white">
              Workflow Activity
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Recent workflow executions and their current status.
            </p>
          </div>

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-xs text-slate-400">
              Live
            </span>

          </div>

        </div>


        {/* Loading */}

        {loading && (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading monitoring data...
          </div>
        )}


        {/* Empty */}

        {!loading && items.length === 0 && !error && (
          <div className="py-12 text-center">

            <Activity
              size={32}
              className="mx-auto text-slate-600 mb-3"
            />

            <div className="text-sm text-slate-400">
              No workflow activity yet.
            </div>

            <div className="text-xs text-slate-600 mt-1">
              Start a workflow from the Workflow Builder.
            </div>

          </div>
        )}


        {/* Data */}

        {!loading && items.length > 0 && (
          <div className="space-y-2">

            {items.map((item, index) => {

              const status =
                item?.status ||
                item?.state ||
                "draft";

              const workflowName =
                item?.name ||
                item?.title ||
                item?.goal ||
                `Workflow ${index + 1}`;

              const id =
                item?._id ||
                item?.id ||
                index;

              return (
                <div
                  key={id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition"
                >

                  {/* Workflow information */}

                  <div className="min-w-0">

                    <div className="flex items-center gap-3">

                      <div className="h-9 w-9 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0">
                        <Activity
                          size={17}
                          className="text-cyan-300"
                        />
                      </div>

                      <div className="min-w-0">

                        <div className="text-sm font-medium text-white truncate">
                          {workflowName}
                        </div>

                        <div className="text-xs text-slate-500 mt-1 truncate">
                          {item?.goal || item?.description || "Agent workflow"}
                        </div>

                      </div>

                    </div>

                  </div>


                  {/* Status */}

                  <div className="flex items-center gap-4">

                    <StatusPill
                      status={String(status).toLowerCase()}
                    />

                    <div className="text-xs text-slate-500 hidden sm:block">
                      {item?.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "Recent"}
                    </div>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </Card>

    </div>
  );
}