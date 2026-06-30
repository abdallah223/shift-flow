import React from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "./icons/DynamicIcon.jsx";

export default function CurrentActivityCard() {
  const { activeActivity, stopCurrentActivity, timerSeconds, isPaused, setIsPaused, setShowQuickAdd } = useApp();

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  };

  if (!activeActivity) {
    return (
      <div className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-slow">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900/80 flex items-center justify-center">
            <DynamicIcon name="coffee" className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              No active work log running
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Ready to instantly record milestones on your shift.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 font-semibold text-xs text-white shadow-lg shadow-brand-600/20 flex items-center space-x-2 transition-all self-end md:self-auto"
        >
          <DynamicIcon name="plus" className="w-3.5 h-3.5" />
          <span>Log Activity</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center space-x-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center relative shrink-0"
          style={{ backgroundColor: activeActivity.color + "20" }}
        >
          <div
            className="absolute inset-0 rounded-xl opacity-20 border"
            style={{ borderColor: activeActivity.color }}
          />
          <DynamicIcon
            name={activeActivity.icon || "code"}
            className="w-6 h-6 animate-pulse"
            style={{ color: activeActivity.color }}
          />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ color: activeActivity.color, backgroundColor: activeActivity.color + "15" }}
            >
              {activeActivity.category}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {activeActivity.project}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">{activeActivity.title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-6 self-end md:self-auto">
        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 tracking-wider timer-glow">
            {formatTime(timerSeconds)}
          </span>
          <p className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold tracking-widest uppercase">
            Elapsed Time
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2.5 rounded-lg border transition-all ${
              isPaused
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "bg-slate-200 dark:bg-slate-900/80 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-800"
            }`}
            title={isPaused ? "Resume tracking" : "Pause tracking"}
          >
            <DynamicIcon name={isPaused ? "play" : "pause"} className="w-5 h-5" />
          </button>
          <button
            onClick={stopCurrentActivity}
            className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
            title="Complete Activity Log"
          >
            <DynamicIcon name="square" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
