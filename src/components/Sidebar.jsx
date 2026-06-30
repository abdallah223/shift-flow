import React from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "./icons/DynamicIcon.jsx";

export default function Sidebar() {
  const { currentView, setCurrentView, activeActivity, theme, toggleTheme, setShowCommandPalette } = useApp();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { id: "timeline", label: "Timeline-First", icon: "activity" },
    { id: "calendar", label: "Calendar Grid", icon: "calendar" },
    { id: "reports", label: "Executive Reports", icon: "bar-chart-3" },
    { id: "export", label: "Data Portability", icon: "download" },
    { id: "settings", label: "Workspace Controls", icon: "sliders" },
  ];

  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 shrink-0 flex flex-col justify-between p-5 h-full z-20 transition-all duration-300">
      <div className="space-y-6">
        <div className="flex items-center space-x-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="font-bold text-white tracking-wider text-sm font-mono">CC</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-880 dark:text-slate-100 leading-none">
              ShiftFlow
            </h1>
            <span className="text-[10px] text-brand-500 font-semibold tracking-widest uppercase">
              Ops Supervisor v1.2
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowCommandPalette(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700/60 transition-all"
        >
          <div className="flex items-center space-x-2">
            <DynamicIcon name="search" className="w-3.5 h-3.5" />
            <span>Search actions...</span>
          </div>
          <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-805 text-[9px] text-slate-500 dark:text-slate-400 rounded font-mono uppercase">
            Ctrl+K
          </kbd>
        </button>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                currentView === item.id
                  ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/15"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5"
              }`}
            >
              <DynamicIcon name={item.icon} className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800/60">
        {activeActivity && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                TRACKING ACTIVE
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {activeActivity.title}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all"
            title="Toggle visual theme"
          >
            <DynamicIcon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <span className="text-[11px] text-slate-500 font-mono font-medium">Local-First Engine</span>
        </div>
      </div>
    </aside>
  );
}
