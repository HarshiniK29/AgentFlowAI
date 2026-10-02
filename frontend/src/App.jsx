import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Workflow,
  Activity,
  ShieldCheck,
  BarChart3,
  Settings,
  BrainCircuit,
  LogOut,
  Menu,
  X,
  Zap,
  Clock3,
  RefreshCw,
} from "lucide-react";

import api, { setAccessToken } from "./api";
import { clearAuth, toast } from "./store";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Builder from "./pages/Builder";
import Execution from "./pages/Execution";
import Approvals from "./pages/Approvals";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/Settings";
import Memory from "./pages/Memory";
import Landing from "./pages/Landing";
import Monitoring from "./pages/Monitoring";
import History from "./pages/History";

// ============================================================
// NAVIGATION
// ============================================================

const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/builder", "Workflow Builder", Workflow],
  ["/history", "Workflow History", Clock3],
  ["/monitoring", "Agent Monitoring", Activity],
  ["/approvals", "Approval Center", ShieldCheck],
  ["/analytics", "Analytics", BarChart3],
  ["/memory", "Agent Memory", BrainCircuit],
  ["/settings", "Settings", Settings],
];

// Defensive navigation list.
// This prevents malformed values such as 0, false, null, etc.
// from causing "number 0 is not iterable".
const safeNav = nav.filter(
  (item) => Array.isArray(item) && item.length >= 3
);

// ============================================================
// APPLICATION SHELL
// ============================================================

function Shell({ children }) {
  const dispatch = useDispatch();
  const loc = useLocation();
  const navigate = useNavigate();

  const user = useSelector((state) => state.auth.user);

  const [open, setOpen] = React.useState(false);

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Logout locally even if the server request fails.
    }

    setAccessToken(null);
    dispatch(clearAuth());
    navigate("/login");
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64
        border-r border-slate-800/70
        bg-[#090d15]/95 backdrop-blur-xl
        transform
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        transition-transform`}
      >
        <div className="h-full flex flex-col p-4">
          {/* Logo */}

          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-4 mb-3"
            onClick={() => setOpen(false)}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center">
              <Zap className="text-white" size={22} />
            </div>

            <div>
              <div className="font-bold text-white">AgentFlow</div>

              <div className="text-[10px] uppercase tracking-[.22em] text-cyan-400">
                Autonomous AI
              </div>
            </div>
          </Link>

          {/* Navigation */}

          <nav className="space-y-1 flex-1">
            {safeNav.map((item) => {
              // Extra defensive protection.
              if (!Array.isArray(item) || item.length < 3) {
                return null;
              }

              const [to, label, Icon] = item;

              // Make sure the icon is actually available.
              if (!Icon) {
                return null;
              }

              return (
                <Link
                  key={to}
                  onClick={() => setOpen(false)}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                    loc.pathname === to
                      ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/15"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User / Logout */}

          <div className="border-t border-slate-800/70 pt-3">
            <div className="px-3 py-3">
              <div className="text-sm text-white truncate">
                {user?.name || "AgentFlow User"}
              </div>

              <div className="text-xs text-slate-500 truncate">
                {user?.email || ""}
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================
          MOBILE SIDEBAR OVERLAY
      ====================================================== */}

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="md:pl-64 min-h-screen">
        {/* Header */}

        <header
          className="sticky top-0 z-20 h-16
          border-b border-slate-800/70
          bg-[#080b12]/80 backdrop-blur-xl
          flex items-center px-4 md:px-8"
        >
          {/* Mobile menu */}

          <button
            className="md:hidden mr-3 text-slate-300"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation menu"
          >
            {open ? <X /> : <Menu />}
          </button>

          {/* Tagline */}

          <div className="flex-1 text-sm text-slate-500">
            From Intent to Action. Fully Autonomous.
          </div>

          {/* Platform status */}

          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full
              bg-emerald-400
              shadow-[0_0_12px_#34d399]"
            />

            <span className="text-xs text-slate-400">
              Platform online
            </span>
          </div>
        </header>

        {/* Page content */}

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// PROTECTED ROUTE
// ============================================================

function Protected({ children }) {
  const { user, ready } = useSelector((state) => state.auth);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080b12] flex items-center justify-center text-slate-400">
        <RefreshCw className="animate-spin mr-2" />
        Loading AgentFlow...
      </div>
    );
  }

  return user ? (
    <Shell>{children}</Shell>
  ) : (
    <Navigate to="/login" replace />
  );
}

// ============================================================
// MAIN APPLICATION
// ============================================================

function App() {
  return (
    <Routes>
      {/* ======================================================
          PUBLIC ROUTES
      ====================================================== */}

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route path="/" element={<Landing />} />

      {/* ======================================================
          PROTECTED ROUTES
      ====================================================== */}

      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />

      <Route
        path="/builder"
        element={
          <Protected>
            <Builder />
          </Protected>
        }
      />

      <Route
        path="/history"
        element={
          <Protected>
            <History />
          </Protected>
        }
      />

      <Route
        path="/monitoring"
        element={
          <Protected>
            <Monitoring />
          </Protected>
        }
      />

      <Route
        path="/execution/:id"
        element={
          <Protected>
            <Execution />
          </Protected>
        }
      />

      <Route
        path="/approvals"
        element={
          <Protected>
            <Approvals />
          </Protected>
        }
      />

      <Route
        path="/analytics"
        element={
          <Protected>
            <Analytics />
          </Protected>
        }
      />

      <Route
        path="/memory"
        element={
          <Protected>
            <Memory />
          </Protected>
        }
      />

      <Route
        path="/settings"
        element={
          <Protected>
            <SettingsPage />
          </Protected>
        }
      />

      {/* ======================================================
          UNKNOWN ROUTE
      ====================================================== */}

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

// ============================================================
// TOAST HOOK
// ============================================================

export function useToast() {
  const dispatch = useDispatch();

  return (message) => {
    dispatch(toast(message));

    setTimeout(() => {
      dispatch(toast(null));
    }, 3500);
  };
}

// ============================================================
// CARD COMPONENT
// ============================================================

export const Card = ({ children, className = "" }) => (
  <div className={`glass rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

// ============================================================
// PAGE TITLE COMPONENT
// ============================================================

export const PageTitle = ({
  eyebrow,
  title,
  desc,
  action,
}) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
    <div>
      <div className="text-xs uppercase tracking-[.2em] text-cyan-400 mb-2">
        {eyebrow}
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold text-white">
        {title}
      </h1>

      {desc && (
        <p className="text-slate-500 mt-1 text-sm">
          {desc}
        </p>
      )}
    </div>

    {action}
  </div>
);

// ============================================================
// STATUS PILL COMPONENT
// ============================================================

export const StatusPill = ({ status }) => {
  const statusClasses = {
    completed:
      "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",

    running:
      "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",

    awaiting_approval:
      "text-amber-300 bg-amber-400/10 border-amber-400/20",

    failed:
      "text-red-300 bg-red-400/10 border-red-400/20",

    escalated:
      "text-orange-300 bg-orange-400/10 border-orange-400/20",

    rejected:
      "text-red-300 bg-red-400/10 border-red-400/20",

    draft:
      "text-slate-300 bg-slate-400/10 border-slate-400/20",

    planning:
      "text-violet-300 bg-violet-400/10 border-violet-400/20",
  };

  const className =
    statusClasses[status] ||
    "text-slate-300 bg-slate-400/10 border-slate-400/20";

  const displayStatus = String(status ?? "").replaceAll(
    "_",
    " "
  );

  return (
    <span
      className={`px-2.5 py-1 rounded-full border text-[11px] font-medium uppercase tracking-wide ${className}`}
    >
      {displayStatus}
    </span>
  );
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default App;