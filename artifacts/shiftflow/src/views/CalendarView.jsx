import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";

export default function CalendarView() {
  const { activities } = useApp();
  const [selectedDateLog, setSelectedDateLog] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());

  const heatMap = useMemo(() => {
    const mapping = {};
    activities.forEach((act) => {
      if (act.category === "Leave (Planned)" || act.category === "Leave (Unplanned)") return;
      const dateStr = new Date(act.startTime).toDateString();
      mapping[dateStr] = (mapping[dateStr] || 0) + act.duration;
    });
    return mapping;
  }, [activities]);

  const currentMonthDays = useMemo(() => {
    const days = [];
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  }, [viewDate]);

  const selectDay = (date) => {
    if (!date) return;
    const matchLogs = activities.filter(
      (a) => new Date(a.startTime).toDateString() === date.toDateString(),
    );
    setSelectedDateLog({
      date: date.toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      logs: matchLogs,
    });
  };

  const changeMonth = (offset) => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  };

  const changeYear = (offset) => {
    setViewDate(
      (prev) => new Date(prev.getFullYear() + offset, prev.getMonth(), 1),
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
          Work Intensity Heatmap
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Color intensity representation of completed hours mapped to calendar
          grids.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm max-w-xl h-fit lg:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeYear(-1)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Previous year"
              >
                «
              </button>
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Previous month"
              >
                ‹
              </button>
            </div>

            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {viewDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(1)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Next month"
              >
                ›
              </button>
              <button
                onClick={() => changeYear(1)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Next year"
              >
                »
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span
                key={day}
                className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider py-1 font-mono"
              >
                {day}
              </span>
            ))}

            {currentMonthDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;

              const minutes = heatMap[date.toDateString()] || 0;
              const hours = minutes / 60;

              let heatBg =
                "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-400";
              if (hours > 0 && hours <= 2)
                heatBg =
                  "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-500/25";
              else if (hours > 2 && hours <= 6)
                heatBg =
                  "bg-brand-100 dark:bg-brand-500/35 text-brand-800 dark:text-brand-100 border-brand-300 dark:border-brand-500/40";
              else if (hours > 6)
                heatBg =
                  "bg-brand-600 text-white border-brand-700 font-bold shadow-md shadow-brand-500/15";

              return (
                <button
                  key={idx}
                  onClick={() => selectDay(date)}
                  className={`heat-cell p-3 rounded-lg border flex flex-col items-center justify-center relative group select-none transition-all duration-150 ${heatBg}`}
                >
                  <span className="text-xs">{date.getDate()}</span>
                  {hours > 0 && (
                    <span className="text-[8px] opacity-85 mt-1 font-mono">
                      {hours.toFixed(1)}h
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">
            Daily Log Inspector
          </h3>
          {selectedDateLog ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
                {selectedDateLog.date}
              </h4>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {selectedDateLog.logs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No operations logged on this date.
                  </p>
                ) : (
                  selectedDateLog.logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {log.title}
                        </span>
                        <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 shrink-0 ml-2">
                          {log.duration} mins
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {log.category} • {log.project}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-16 text-center">
              Click any active date grid to view detailed chronological events.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
