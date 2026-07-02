import React, { useEffect, useState } from "react";
import { useApp } from "./context/AppContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import QuickAddModal from "./components/modals/QuickAddModal.jsx";
import ManualAddModal from "./components/modals/ManualAddModal.jsx";
import CommandPaletteModal from "./components/modals/CommandPaletteModal.jsx";
import DynamicIcon from "./components/icons/DynamicIcon.jsx";
import DashboardView from "./views/DashboardView.jsx";
import TimelineView from "./views/TimelineView.jsx";
import CalendarView from "./views/CalendarView.jsx";
import ReportsView from "./views/ReportsView.jsx";
import OperationsReportsView from "./views/OperationsReportsView.jsx";
import ProductivityView from "./views/ProductivityView.jsx";
import ExportView from "./views/ExportView.jsx";
import TasksView from "./views/TasksView.jsx";
import SettingsView from "./views/SettingsView.jsx";

const VIEW_LABELS = {
  dashboard: "Dashboard",
  timeline: "Timeline-First",
  calendar: "Calendar Grid",
  reports: "Executive Reports",
  "operations-reports": "Operations Reports",
  productivity: "Productivity Analysis",
  tasks: "Tasks & Focus",
  export: "Data Portability",
  settings: "Workspace Controls",
};

export default function App() {
  const { currentView } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Closing the drawer whenever the active view changes keeps navigation
  // feeling responsive on mobile instead of leaving the overlay stuck open.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentView]);

  return (
    <div className="w-full h-full flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="glow-overlay top-[-100px] left-[-100px] animate-glow-slow"></div>

      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile-only top bar: the sidebar is hidden below the lg breakpoint,
            so this is the only way to open navigation or see the current
            section on a phone or narrow tablet. */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-900 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm sticky top-0 z-20">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <DynamicIcon name="menu" className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {VIEW_LABELS[currentView] || "ShiftFlow"}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentView === "dashboard" && <DashboardView />}
          {currentView === "timeline" && <TimelineView />}
          {currentView === "calendar" && <CalendarView />}
          {currentView === "reports" && <ReportsView />}
          {currentView === "operations-reports" && <OperationsReportsView />}
          {currentView === "productivity" && <ProductivityView />}
          {currentView === "tasks" && <TasksView />}
          {currentView === "export" && <ExportView />}
          {currentView === "settings" && <SettingsView />}
        </main>
      </div>

      <QuickAddModal />
      <ManualAddModal />
      <CommandPaletteModal />
    </div>
  );
}
