import React from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "./icons/DynamicIcon.jsx";

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const {
    currentView,
    setCurrentView,
    activeActivity,
    theme,
    toggleTheme,
    setShowCommandPalette,
  } = useApp();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { id: "timeline", label: "Timeline-First", icon: "activity" },
    { id: "calendar", label: "Calendar Grid", icon: "calendar" },
    { id: "tasks", label: "Tasks & Focus", icon: "check-square" },
    { id: "reports", label: "Executive Reports", icon: "bar-chart-3" },
    {
      id: "operations-reports",
      label: "Operations Reports",
      icon: "file-text",
    },
    { id: "productivity", label: "Productivity Analysis", icon: "activity" },
    { id: "export", label: "Data Portability", icon: "download" },
    { id: "settings", label: "Workspace Controls", icon: "sliders" },
  ];

  return (
    <>
      {/* Backdrop: only rendered/interactive on mobile while the drawer is open */}
      {mobileOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 sm:w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 shrink-0 flex flex-col justify-between p-5 h-full transition-transform duration-300 lg:static lg:translate-x-0 lg:z-20 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-1 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                <span className="font-bold text-white tracking-wider text-sm font-mono">
                  CC
                </span>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                  ShiftFlow
                </h1>
                <span className="text-[10px] text-brand-500 font-semibold tracking-widest uppercase">
                  Ops Supervisor v1.2
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close navigation menu"
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors"
            >
              <DynamicIcon name="x" className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowCommandPalette(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700/60 transition-all shrink-0"
          >
            <div className="flex items-center space-x-2">
              <DynamicIcon name="search" className="w-3.5 h-3.5" />
              <span>Search actions...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-[9px] text-slate-500 dark:text-slate-400 rounded font-mono uppercase">
              Ctrl+K
            </kbd>
          </button>

          {/* Scrolls independently so the full menu stays reachable even on
              short viewports, instead of overflowing off the bottom of the screen. */}
          <nav className="space-y-1 overflow-y-auto min-h-0" aria-label="Main navigation">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                aria-current={currentView === item.id ? "page" : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  currentView === item.id
                    ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/15"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5"
                }`}
              >
                <DynamicIcon name={item.icon} className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800/60 shrink-0">
          {activeActivity && (
            <button
              onClick={() => setCurrentView("tasks")}
              className="w-full text-left p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col space-y-1 hover:bg-emerald-500/15 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  Tracking active
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {activeActivity.title}
              </p>
            </button>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all"
              title="Toggle visual theme"
              aria-label="Toggle light and dark theme"
            >
              <DynamicIcon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <span className="text-[11px] text-slate-500 font-mono font-medium">
              Local-First Engine
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
