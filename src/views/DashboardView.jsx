import React, { useMemo } from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";
import CurrentActivityCard from "../components/CurrentActivityCard.jsx";

export default function DashboardView() {
  const { activities, favorites, startNewActivity, activeActivity, workHoursGoal, setShowQuickAdd } = useApp();

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayActs = activities.filter((a) => new Date(a.startTime).toDateString() === today);
    const totalMinutes = todayActs.reduce((acc, curr) => acc + curr.duration, 0);
    const count = todayActs.length;

    return {
      minutes: totalMinutes,
      hours: (totalMinutes / 60).toFixed(1),
      count,
    };
  }, [activities]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
            Ops Supervisory Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Shift timeline summaries, automatic durations, and instant logging.
          </p>
        </div>
      </div>

      <CurrentActivityCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-lift p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
              Shift Completion Ratio
            </span>
            <h3 className="text-2xl font-bold text-slate-850 dark:text-slate-100 mt-1">
              {todayStats.hours} <span className="text-xs font-normal text-slate-500">/ {workHoursGoal} hrs</span>
            </h3>
            <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full progress-shimmer"
                style={{ width: `${Math.min(100, (Number(todayStats.hours) / workHoursGoal) * 100)}%` }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <DynamicIcon name="clock" className="w-5 h-5 text-brand-500 dark:text-brand-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
              Active Shift Events
            </span>
            <h3 className="text-2xl font-bold text-slate-850 dark:text-slate-100 mt-1">
              {todayStats.count} segments
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <DynamicIcon name="layers" className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
              Current Status
            </span>
            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 mt-1 truncate">
              {activeActivity ? "In Progress" : "Idle / Break"}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${activeActivity ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
              ></span>
              <span className="text-[10px] text-slate-500">
                {activeActivity ? activeActivity.category : "No task running"}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DynamicIcon name={activeActivity ? "zap" : "coffee"} className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {(() => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date();
        const strip = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          const dateStr = d.toDateString();
          const mins = activities
            .filter((a) => new Date(a.startTime).toDateString() === dateStr)
            .reduce((s, a) => s + a.duration, 0);
          return { label: days[d.getDay()], mins, isToday: dateStr === today.toDateString() };
        });
        const maxMins = Math.max(...strip.map((s) => s.mins), 1);
        return (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
                <DynamicIcon name="trending-up" className="w-4 h-4 text-brand-500" />
                <span>7-Day Activity</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">This week</span>
            </div>
            <div className="flex items-end justify-between gap-1.5 h-16">
              {strip.map((day, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <div className="w-full rounded-t-md relative flex items-end justify-center" style={{ height: "48px" }}>
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${day.isToday ? "bg-brand-500" : "bg-brand-500/25 dark:bg-brand-500/20"}`}
                      style={{ height: `${Math.max(4, (day.mins / maxMins) * 48)}px` }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${day.isToday ? "text-brand-500" : "text-slate-400"}`}>
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {(() => {
        const today = new Date().toDateString();
        const todayActs = activities.filter((a) => new Date(a.startTime).toDateString() === today);
        if (todayActs.length === 0) return null;
        const catMap = {};
        let total = 0;
        todayActs.forEach((a) => {
          catMap[a.category] = { mins: (catMap[a.category]?.mins || 0) + a.duration, color: a.color };
          total += a.duration;
        });
        const cats = Object.entries(catMap).sort((a, b) => b[1].mins - a[1].mins);
        return (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
              <DynamicIcon name="flag" className="w-4 h-4 text-brand-500" />
              <span>Today's Breakdown</span>
            </h3>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
              {cats.map(([name, data], i) => (
                <div
                  key={i}
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(data.mins / total) * 100}%`, background: data.color }}
                  title={`${name}: ${data.mins}m`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {cats.map(([name, data], i) => (
                <div key={i} className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: data.color }} />
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{name}</span>
                  <span className="text-[11px] font-mono text-slate-400">{data.mins}m</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
            <DynamicIcon name="star" className="w-4 h-4 text-yellow-500" />
            <span>Quick Access Favorites</span>
          </h3>
        </div>
        {favorites.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-800/80 text-center text-xs text-slate-500">
            No pinned templates yet. Create an activity and enable "Pin to Dashboard Favorites" to create quick
            triggers.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                onClick={() => startNewActivity(fav.title, fav.category, fav.project, fav.notes)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all duration-150 flex items-center justify-between group"
              >
                <div className="truncate mr-2">
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate">
                    {fav.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">{fav.category}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 opacity-60 group-hover:opacity-100">
                  <DynamicIcon name="play" className="w-3 h-3 text-brand-500 dark:text-brand-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
