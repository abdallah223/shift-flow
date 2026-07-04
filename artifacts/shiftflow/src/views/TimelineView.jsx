import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSegmentForHour = (hour) => {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
};

const parseDateInput = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const datePresets = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "7 Days" },
  { id: "month", label: "30 Days" },
  { id: "custom", label: "Custom" },
];

export default function TimelineView() {
  const {
    activities,
    updateActivity,
    deleteActivity,
    triggerUndo,
    historyUndo,
    startNewActivity,
    setShowManualAdd,
  } = useApp();
  const [datePreset, setDatePreset] = useState("today");
  const [editingNotes, setEditingNotes] = useState({}); // { [actId]: draftString }
  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString(new Date()),
  );
  const [selectedSegment, setSelectedSegment] = useState("All");

  const filteredActivities = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const selected = parseDateInput(selectedDate || getLocalDateString(today));

    return activities.filter((act) => {
      const activityDate = new Date(act.startTime);
      const activityDay = new Date(
        activityDate.getFullYear(),
        activityDate.getMonth(),
        activityDate.getDate(),
      );
      const activityTimestamp = activityDay.getTime();

      let matchesDate = true;
      if (datePreset === "today") {
        matchesDate = activityTimestamp === startOfToday.getTime();
      } else if (datePreset === "yesterday") {
        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        matchesDate = activityTimestamp === yesterday.getTime();
      } else if (datePreset === "week") {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 6);
        matchesDate =
          activityTimestamp >= weekAgo.getTime() &&
          activityTimestamp <= startOfToday.getTime();
      } else if (datePreset === "month") {
        const monthAgo = new Date(startOfToday);
        monthAgo.setDate(monthAgo.getDate() - 29);
        matchesDate =
          activityTimestamp >= monthAgo.getTime() &&
          activityTimestamp <= startOfToday.getTime();
      } else if (datePreset === "custom") {
        matchesDate = activityTimestamp === selected.getTime();
      }

      const matchesSegment =
        selectedSegment === "All" ||
        getSegmentForHour(new Date(act.startTime).getHours()) ===
          selectedSegment;

      return matchesDate && matchesSegment;
    });
  }, [activities, datePreset, selectedDate, selectedSegment]);

  const groupedActivities = useMemo(() => {
    const groups = { Morning: [], Afternoon: [], Evening: [] };

    filteredActivities.forEach((act) => {
      const segment = getSegmentForHour(new Date(act.startTime).getHours());
      groups[segment].push(act);
    });

    return groups;
  }, [filteredActivities]);

  const hasVisibleItems = Object.values(groupedActivities).some(
    (items) => items.length > 0,
  );
  const resetFilters = () => {
    setDatePreset("today");
    setSelectedDate(getLocalDateString(new Date()));
    setSelectedSegment("All");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 p-4 shadow-sm backdrop-blur space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start md:self-auto">
          {datePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                datePreset === preset.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === "custom" && (
          <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Choose date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 shadow-sm"
            />
          </label>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Segment</span>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="All">All segments</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Reset to today
          </button>
        </div>
      </div>

      {historyUndo && (
        <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-between text-xs text-brand-600 dark:text-brand-300 animate-slideUp">
          <span className="font-mono">
            Removed "{historyUndo.title}" from chronological ledger
            successfully.
          </span>
          <button
            onClick={triggerUndo}
            className="font-bold underline hover:text-brand-700 dark:hover:text-brand-100 transition-all"
          >
            Undo Action
          </button>
        </div>
      )}

      <div className="space-y-8 relative before:absolute before:top-2 before:bottom-2 before:left-5 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
        {hasVisibleItems ? (
          Object.entries(groupedActivities).map(([timeOfDay, items]) => {
            if (items.length === 0) return null;

            return (
              <div key={timeOfDay} className="space-y-3 relative">
                <div className="flex items-center space-x-2 pl-2">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center justify-center z-10 shadow-sm">
                    <DynamicIcon
                      name={
                        timeOfDay === "Morning"
                          ? "sun"
                          : timeOfDay === "Afternoon"
                            ? "cloud"
                            : "moon"
                      }
                      className="w-3 h-3 text-brand-500 dark:text-brand-400"
                    />
                  </div>
                  <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase font-mono">
                    {timeOfDay} Segment
                  </h3>
                </div>

                <div className="space-y-3 pl-10">
                  {items.map((act) => {
                    const formattedStart = new Date(
                      act.startTime,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const formattedEnd = act.endTime
                      ? new Date(act.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Active";

                    const formattedDate = new Date(
                      act.startTime,
                    ).toLocaleDateString([], {
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
                            <DynamicIcon
                              name={act.icon || "code"}
                              className="w-5 h-5"
                              style={{ color: act.color }}
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {act.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <span
                                className="font-bold"
                                style={{ color: act.color }}
                              >
                                {act.category}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {formattedDate}
                              </span>
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
                            {editingNotes[act.id] !== undefined ? (
                              <div className="mt-2 max-w-2xl">
                                <textarea
                                  autoFocus
                                  value={editingNotes[act.id]}
                                  onChange={(e) =>
                                    setEditingNotes((prev) => ({
                                      ...prev,
                                      [act.id]: e.target.value,
                                    }))
                                  }
                                  rows={3}
                                  className="w-full rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                                  placeholder="Add progression notes…"
                                />
                                <div className="mt-1.5 flex gap-2">
                                  <button
                                    onClick={() => {
                                      updateActivity(act.id, {
                                        notes: editingNotes[act.id],
                                      });
                                      setEditingNotes((prev) => {
                                        const n = { ...prev };
                                        delete n[act.id];
                                        return n;
                                      });
                                    }}
                                    className="rounded-md bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-500"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingNotes((prev) => {
                                        const n = { ...prev };
                                        delete n[act.id];
                                        return n;
                                      })
                                    }
                                    className="rounded-md border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group/notes mt-2 flex max-w-2xl items-start gap-1">
                                {act.notes ? (
                                  <p className="flex-1 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs italic leading-relaxed text-slate-500 dark:border-slate-900 dark:bg-slate-950/40 dark:text-slate-500">
                                    {act.notes}
                                  </p>
                                ) : (
                                  <span className="text-[11px] italic text-slate-400 dark:text-slate-600">
                                    No notes
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    setEditingNotes((prev) => ({
                                      ...prev,
                                      [act.id]: act.notes || "",
                                    }))
                                  }
                                  className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-slate-100 group-hover/notes:opacity-100 dark:text-slate-500 dark:hover:bg-slate-800"
                                  title="Edit notes"
                                >
                                  <DynamicIcon name="pencil" className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() =>
                              startNewActivity(
                                act.title,
                                act.category,
                                act.project,
                                act.notes,
                              )
                            }
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
          })
        ) : (
          <div className="py-16 text-center max-w-sm mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <DynamicIcon name="activity" className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No entries match these filters
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
              Try selecting a different date or segment, or reset back to today.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
