import React, { useMemo } from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";

export default function TimelineView() {
  const { activities, deleteActivity, triggerUndo, historyUndo, startNewActivity, setShowManualAdd } = useApp();

  const groupedActivities = useMemo(() => {
    const groups = { Morning: [], Afternoon: [], Evening: [] };

    activities.forEach((act) => {
      const date = new Date(act.startTime);
      const startHour = date.getHours();
      if (startHour < 12) {
        groups.Morning.push(act);
      } else if (startHour < 17) {
        groups.Afternoon.push(act);
      } else {
        groups.Evening.push(act);
      }
    });

    return groups;
  }, [activities]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
            Timeline-First Work Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sequential timeline representation of completed deliveries.
          </p>
        </div>
        <button
          onClick={() => setShowManualAdd(true)}
          className="px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 font-semibold text-xs text-white flex items-center space-x-1.5 shadow-md shadow-brand-500/10 transition-all"
          title="Add a past task manually without overlapping"
        >
          <DynamicIcon name="clock" className="w-4 h-4" />
          <span>Add Retroactive Entry</span>
        </button>
      </div>

      {historyUndo && (
        <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-between text-xs text-brand-600 dark:text-brand-300 animate-slideUp">
          <span className="font-mono">Removed "{historyUndo.title}" from chronological ledger successfully.</span>
          <button
            onClick={triggerUndo}
            className="font-bold underline hover:text-brand-700 dark:hover:text-brand-100 transition-all"
          >
            Undo Action
          </button>
        </div>
      )}

      <div className="space-y-8 relative before:absolute before:top-2 before:bottom-2 before:left-5 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
        {Object.entries(groupedActivities).map(([timeOfDay, items]) => {
          if (items.length === 0) return null;

          return (
            <div key={timeOfDay} className="space-y-3 relative">
              <div className="flex items-center space-x-2 pl-2">
                <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center justify-center z-10 shadow-sm">
                  <DynamicIcon
                    name={timeOfDay === "Morning" ? "sun" : timeOfDay === "Afternoon" ? "cloud" : "moon"}
                    className="w-3 h-3 text-brand-500 dark:text-brand-400"
                  />
                </div>
                <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase font-mono">
                  {timeOfDay} Segment
                </h3>
              </div>

              <div className="space-y-3 pl-10">
                {items.map((act) => {
                  const formattedStart = new Date(act.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const formattedEnd = act.endTime
                    ? new Date(act.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Active";

                  const formattedDate = new Date(act.startTime).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={act.id}
                      className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-150 flex items-start justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-start space-x-3.5">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: act.color + "15" }}
                        >
                          <DynamicIcon name={act.icon || "code"} className="w-5 h-5" style={{ color: act.color }} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{act.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-bold" style={{ color: act.color }}>
                              {act.category}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{formattedDate}</span>
                            <span>•</span>
                            <span>{act.project}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                              {formattedStart} - {formattedEnd}
                            </span>
                            {act.duration > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                                  {act.duration} mins
                                </span>
                              </>
                            )}
                          </div>
                          {act.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-900 leading-relaxed max-w-2xl">
                              {act.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => startNewActivity(act.title, act.category, act.project, act.notes)}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 text-brand-600 dark:text-brand-400"
                          title="Restart activity"
                        >
                          <DynamicIcon name="play" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteActivity(act.id)}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 text-red-500 dark:text-red-400"
                          title="Delete entry"
                        >
                          <DynamicIcon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {activities.length === 0 && (
          <div className="py-16 text-center max-w-sm mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <DynamicIcon name="activity" className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your shift timeline is empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
              Start recording shift events during your workday. Logs will appear chronologically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
