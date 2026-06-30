import React from "react";
import { useApp } from "./context/AppContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import QuickAddModal from "./components/modals/QuickAddModal.jsx";
import ManualAddModal from "./components/modals/ManualAddModal.jsx";
import CommandPaletteModal from "./components/modals/CommandPaletteModal.jsx";
import DashboardView from "./views/DashboardView.jsx";
import TimelineView from "./views/TimelineView.jsx";
import CalendarView from "./views/CalendarView.jsx";
import ReportsView from "./views/ReportsView.jsx";
import ExportView from "./views/ExportView.jsx";
import SettingsView from "./views/SettingsView.jsx";

export default function App() {
  const { currentView } = useApp();

  return (
    <div className="w-full h-full flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 select-none">
      <div className="glow-overlay top-[-100px] left-[-100px] animate-glow-slow"></div>

      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 relative z-10">
        {currentView === "dashboard" && <DashboardView />}
        {currentView === "timeline" && <TimelineView />}
        {currentView === "calendar" && <CalendarView />}
        {currentView === "reports" && <ReportsView />}
        {currentView === "export" && <ExportView />}
        {currentView === "settings" && <SettingsView />}
      </main>

      <QuickAddModal />
      <ManualAddModal />
      <CommandPaletteModal />
    </div>
  );
}
