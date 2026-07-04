import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";

const formatDuration = (seconds = 0) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatDate = (value) => {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const priorityStyles = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

export default function TasksView() {
  const {
    tasks,
    createTask,
    addSubtask,
    toggleSubtask,
    toggleTaskComplete,
    toggleTaskActivity,
    deleteTask,
    activeActivity,
    categories,
  } = useApp();

  const [filter, setFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [draft, setDraft] = useState({
    title: "",
    notes: "",
    dueDate: "",
    priority: "medium",
    project: "",
    operationalCategory: categories[0]?.name || "",
  });
  const [subtaskDrafts, setSubtaskDrafts] = useState({});
  const [feedback, setFeedback] = useState("");

  const matchesDateFilter = (task) => {
    if (!task.dueDate) return datePreset === "all";

    const taskDate = new Date(task.dueDate);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (datePreset === "all") {
      if (!dateFrom && !dateTo) return true;
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (taskDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (taskDate > toDate) return false;
      }
      return true;
    }

    if (datePreset === "today") {
      return taskDate.toDateString() === startOfToday.toDateString();
    }

    if (datePreset === "week") {
      const weekAgo = new Date(startOfToday);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return taskDate >= weekAgo && taskDate <= startOfToday;
    }

    if (datePreset === "month") {
      const monthAgo = new Date(startOfToday);
      monthAgo.setDate(monthAgo.getDate() - 29);
      return taskDate >= monthAgo && taskDate <= startOfToday;
    }

    if (datePreset === "custom") {
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (taskDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (taskDate > toDate) return false;
      }
      return true;
    }

    return true;
  };

  const filteredTasks = useMemo(() => {
    const base = [...tasks];
    const sorted = base.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );

    return sorted.filter((task) => {
      if (filter === "active" && task.completed) return false;
      if (filter === "done" && !task.completed) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter)
        return false;
      if (
        categoryFilter !== "all" &&
        task.operationalCategory !== categoryFilter
      )
        return false;
      return matchesDateFilter(task);
    });
  }, [
    tasks,
    filter,
    priorityFilter,
    categoryFilter,
    datePreset,
    dateFrom,
    dateTo,
  ]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.completed).length;
    const active = tasks.filter((task) => !task.completed).length;
    const tracked = tasks.reduce(
      (sum, task) => sum + Number(task.trackedSeconds || 0),
      0,
    );

    return { total, done, active, tracked };
  }, [tasks]);

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      setFeedback("Add a short task title before saving.");
      return;
    }

    const result = await createTask({
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      dueDate: draft.dueDate,
      priority: draft.priority,
      project: draft.project.trim(),
      operationalCategory: draft.operationalCategory.trim(),
    });

    if (result?.success) {
      setDraft({
        title: "",
        notes: "",
        dueDate: "",
        priority: "medium",
        project: "",
        operationalCategory: categories[0]?.name || "",
      });
      setFeedback("Task added to your focus board.");
    } else {
      setFeedback(result?.error || "Could not save the task.");
    }
  };

  const handleAddSubtask = async (taskId) => {
    const title = (subtaskDrafts[taskId] || "").trim();
    if (!title) return;

    await addSubtask(taskId, title);
    setSubtaskDrafts((prev) => ({ ...prev, [taskId]: "" }));
  };

  const handleTaskActivityToggle = async (task) => {
    await toggleTaskActivity(task);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
            Tasks & To-Do Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Capture work, break it into subtasks, and start timing every focus
            block.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Total tasks
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {stats.total}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Open work
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {stats.active}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Completed
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {stats.done}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Tracked time
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {formatDuration(stats.tracked)}
          </h3>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          New task
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Create a task quickly, then add detail and subtasks as needed.
        </p>
        <form onSubmit={handleCreateTask} className="mt-4 space-y-3">
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Task title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Draft rollout plan"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">Operational Category</span>
              <select
                value={draft.operationalCategory}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    operationalCategory: e.target.value,
                  }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">Project / Team Scope</span>
              <input
                type="text"
                value={draft.project}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, project: e.target.value }))
                }
                placeholder="Support Team Alpha"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[0.8fr_0.8fr_1.2fr_auto]">
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">Due date</span>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">Priority</span>
              <select
                value={draft.priority}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, priority: e.target.value }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            {/* <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">Project / Team Scope</span>
              <input
                type="text"
                value={draft.project}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, project: e.target.value }))
                }
                placeholder="Support Team Alpha"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </label> */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700"
              >
                Create task
              </button>
            </div>
          </div>

          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Details / Milestone notes</span>
            <textarea
              value={draft.notes}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Capture context, blockers, or next steps"
              rows="3"
              className="min-h-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </label>
        </form>
        {feedback && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {feedback}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Open" },
            { id: "done", label: "Done" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${filter === item.id ? "bg-brand-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Date</span>
            <div className="flex gap-2">
              {[
                { id: "all", label: "All" },
                { id: "today", label: "Today" },
                { id: "week", label: "7d" },
                { id: "month", label: "30d" },
                { id: "custom", label: "Custom" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${datePreset === preset.id ? "bg-brand-600 text-white" : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </label>
          {datePreset === "custom" && (
            <>
              <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <span className="mb-1">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>
              <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <span className="mb-1">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>
            </>
          )}
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setDatePreset("all");
              setDateFrom("");
              setDateTo("");
              setPriorityFilter("all");
              setCategoryFilter("all");
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {filteredTasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No tasks match this view yet. Create your first one above.
            </div>
          )}

          {filteredTasks.map((task) => {
            const subtasksDone =
              task.subtasks?.filter((item) => item.completed).length || 0;
            const progressPercent = task.subtasks?.length
              ? Math.round((subtasksDone / task.subtasks.length) * 100)
              : 0;

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-4 shadow-sm ${task.completed ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30" : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/50"}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className={`rounded-full p-1.5 ${task.completed ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300"}`}
                      >
                        <DynamicIcon name="check-square" className="h-4 w-4" />
                      </button>
                      <h4
                        className={`text-sm font-semibold ${task.completed ? "text-emerald-700 line-through dark:text-emerald-300" : "text-slate-800 dark:text-slate-200"}`}
                      >
                        {task.title}
                      </h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${priorityStyles[task.priority] || priorityStyles.medium}`}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Due {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {task.notes}
                      </p>
                    )}
                    {(task.project || task.operationalCategory) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {task.project && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                            Project: {task.project}
                          </span>
                        )}
                        {task.operationalCategory && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                            Category: {task.operationalCategory}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {task.subtasks?.length
                          ? `${subtasksDone}/${task.subtasks.length} subtasks done`
                          : "No subtasks yet"}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDuration(task.trackedSeconds || 0)} tracked
                      </span>
                    </div>
                    {task.subtasks?.length > 0 && (
                      <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-900">
                        <div
                          className="h-2 rounded-full bg-brand-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleTaskActivityToggle(task)}
                      className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-all ${activeActivity && activeActivity.project === "Tasks" && activeActivity.title === task.title ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                    >
                      {activeActivity &&
                      activeActivity.project === "Tasks" &&
                      activeActivity.title === task.title
                        ? "Stop activity"
                        : "Start activity"}
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-600 transition-all hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {task.subtasks?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {task.subtasks.map((subtask) => (
                      <label
                        key={subtask.id}
                        className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.completed || false}
                          onChange={() => toggleSubtask(task.id, subtask.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span
                          className={
                            subtask.completed
                              ? "text-slate-400 line-through"
                              : ""
                          }
                        >
                          {subtask.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={subtaskDrafts[task.id] || ""}
                    onChange={(e) =>
                      setSubtaskDrafts((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    placeholder="Add a subtask"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  />
                  <button
                    onClick={() => handleAddSubtask(task.id)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition-all hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
