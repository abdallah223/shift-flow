import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { dbInstance } from "../db/database.js";
import { DEFAULT_CATEGORIES } from "../data/categories.js";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [theme, setTheme] = useState("dark");
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeActivity, setActiveActivity] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [historyUndo, setHistoryUndo] = useState(null);

  const [workHoursGoal, setWorkHoursGoal] = useState(8);

  const timerRef = useRef(null);
  const tickCountRef = useRef(0);
  const timerSecondsRef = useRef(0);

  useEffect(() => {
    timerSecondsRef.current = timerSeconds;
  }, [timerSeconds]);

  // Persist the in-progress timer session (active activity + elapsed
  // seconds + pause state) so a page refresh, tab close, or crash doesn't
  // silently wipe out whatever the person was tracking.
  const persistActiveSession = (activity, seconds, paused) => {
    if (!activity) {
      dbInstance.delete("settings", "activeSession").catch(() => {});
      return;
    }
    dbInstance
      .put("settings", {
        key: "activeSession",
        value: {
          activity,
          timerSeconds: seconds,
          isPaused: paused,
          lastSavedAt: new Date().toISOString(),
        },
      })
      .catch(() => {});
  };

  useEffect(() => {
    dbInstance.init().then(() => {
      dbInstance.getAll("categories").then(async (cats) => {
        if (cats.length === 0) {
          for (const c of DEFAULT_CATEGORIES) {
            await dbInstance.put("categories", c);
          }
          setCategories(DEFAULT_CATEGORIES);
        } else {
          setCategories(cats);
        }
      });

      dbInstance.getAll("activities").then((logs) => {
        const sorted = logs.sort(
          (a, b) => new Date(b.startTime) - new Date(a.startTime),
        );
        setActivities(sorted);
      });

      dbInstance.getAll("favorites").then(setFavorites);
      dbInstance.getAll("templates").then(setTemplates);
      dbInstance.getAll("tasks").then((savedTasks) => {
        const sortedTasks = [...savedTasks].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
        setTasks(sortedTasks);
      });
      dbInstance.getAll("settings").then((settings) => {
        const themeSetting = settings.find((s) => s.key === "theme");
        if (themeSetting) {
          setTheme(themeSetting.value);
          document.documentElement.className = themeSetting.value;
        } else {
          document.documentElement.className = "dark";
        }
        const goalSetting = settings.find((s) => s.key === "workHoursGoal");
        if (goalSetting) {
          setWorkHoursGoal(Number(goalSetting.value));
        }

        // Restore a timer session that was still running when the app was
        // last closed. If it wasn't paused, credit the elapsed real-world
        // time that passed while the app was closed.
        const sessionSetting = settings.find((s) => s.key === "activeSession");
        if (sessionSetting?.value?.activity) {
          const {
            activity,
            timerSeconds: savedSeconds,
            isPaused: savedPaused,
            lastSavedAt,
          } = sessionSetting.value;
          let restoredSeconds = savedSeconds || 0;
          if (!savedPaused && lastSavedAt) {
            const gapSeconds = Math.max(
              0,
              Math.round((Date.now() - new Date(lastSavedAt).getTime()) / 1000),
            );
            restoredSeconds += gapSeconds;
          }
          setActiveActivity(activity);
          setTimerSeconds(restoredSeconds);
          setIsPaused(!!savedPaused);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (activeActivity && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          const next = prev + 1;
          // Checkpoint the session every ~10s so an unexpected close
          // doesn't lose more than a few seconds of tracked time.
          tickCountRef.current += 1;
          if (tickCountRef.current % 10 === 0) {
            persistActiveSession(activeActivity, next, false);
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeActivity, isPaused]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.className = newTheme;
    dbInstance.put("settings", { key: "theme", value: newTheme });
  };

  const updateWorkHoursGoal = (val) => {
    const parsed = Number(val);
    const clamped = Number.isFinite(parsed)
      ? Math.min(24, Math.max(1, parsed))
      : 8;
    setWorkHoursGoal(clamped);
    dbInstance.put("settings", { key: "workHoursGoal", value: clamped });
  };

  const startNewActivity = async (
    title,
    categoryName,
    project = "General",
    notes = "",
    taskId = null,
  ) => {
    if (activeActivity) {
      await stopCurrentActivity();
    }

    const cat =
      categories.find((c) => c.name === categoryName) ||
      categories[0] ||
      DEFAULT_CATEGORIES[0];
    const now = new Date();

    const newAct = {
      title: title || "Working on deliverables",
      category: cat.name,
      color: cat.color || "#6366f1",
      icon: cat.icon || "headphones",
      project: project || "General",
      notes: notes || "",
      // Explicit link back to the source task (if any) so start/stop and
      // time-tracking credit-back don't depend on fragile string matching
      // against the project/title, which breaks as soon as a task has its
      // own Project/Team Scope value.
      taskId,
      startTime: now.toISOString(),
      endTime: null,
      duration: 0,
    };

    setActiveActivity(newAct);
    setTimerSeconds(0);
    setIsPaused(false);
    tickCountRef.current = 0;
    persistActiveSession(newAct, 0, false);
  };

  const togglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      persistActiveSession(activeActivity, timerSecondsRef.current, next);
      return next;
    });
  };

  const stopCurrentActivity = async () => {
    if (!activeActivity) return;

    const now = new Date();

    // Use the on-screen timer (timerSeconds) as the source of truth for
    // duration rather than raw wall-clock time. The timer already excludes
    // any time spent paused, so this keeps pause actually meaningful —
    // previously the saved duration always counted paused time as worked.
    const elapsedMinutes = Math.max(1, Math.round(timerSeconds / 60));

    const completedAct = {
      ...activeActivity,
      endTime: now.toISOString(),
      duration: elapsedMinutes,
    };

    const savedId = await dbInstance.put("activities", completedAct);
    completedAct.id = savedId;

    setActivities((prev) => {
      const next = [completedAct, ...prev];
      return next.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    });

    // If this activity was started from a Task (see toggleTaskActivity),
    // credit the tracked time back onto that task so the "time tracked"
    // figure on the Tasks board actually reflects work done. This is keyed
    // off the explicit taskId link rather than the project label or title,
    // since either of those can be duplicated or changed by the user.
    if (completedAct.taskId) {
      const linkedTask = tasks.find((t) => t.id === completedAct.taskId);
      if (linkedTask) {
        const updatedTask = {
          ...linkedTask,
          trackedSeconds: (linkedTask.trackedSeconds || 0) + timerSeconds,
          updatedAt: now.toISOString(),
        };
        await dbInstance.put("tasks", updatedTask);
        setTasks((prev) =>
          prev.map((t) => (t.id === linkedTask.id ? updatedTask : t)),
        );
      }
    }

    setActiveActivity(null);
    setTimerSeconds(0);
    setIsPaused(false);
    tickCountRef.current = 0;
    persistActiveSession(null, 0, false);
  };

  const addManualActivity = async (
    title,
    categoryName,
    project,
    notes,
    startTimeStr,
    endTimeStr,
  ) => {
    const newStart = new Date(startTimeStr);
    const newEnd = new Date(endTimeStr);
    const now = new Date();

    if (newStart >= newEnd) {
      return {
        success: false,
        error: "End time must be logically after the start time.",
      };
    }

    if (newEnd > now) {
      return {
        success: false,
        error: "Cannot log retroactive activities into the future.",
      };
    }

    const isHistoricalOverlap = activities.some((act) => {
      const actStart = new Date(act.startTime).getTime();
      const actEnd = act.endTime
        ? new Date(act.endTime).getTime()
        : now.getTime();
      return newStart.getTime() < actEnd && newEnd.getTime() > actStart;
    });

    if (isHistoricalOverlap) {
      return {
        success: false,
        error: "Time range directly overlaps with a previously logged entry.",
      };
    }

    if (activeActivity) {
      const activeStart = new Date(activeActivity.startTime).getTime();
      if (
        newStart.getTime() < now.getTime() &&
        newEnd.getTime() > activeStart
      ) {
        return {
          success: false,
          error:
            "Time range overlaps with your currently running tracking session.",
        };
      }
    }

    const cat =
      categories.find((c) => c.name === categoryName) ||
      categories[0] ||
      DEFAULT_CATEGORIES[0];
    const elapsedMinutes = Math.max(1, Math.round((newEnd - newStart) / 60000));

    const newAct = {
      title: title || "Manual retroactive entry",
      category: cat.name,
      color: cat.color || "#6366f1",
      icon: cat.icon || "headphones",
      project: project || "General",
      notes: notes || "",
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      duration: elapsedMinutes,
    };

    const savedId = await dbInstance.put("activities", newAct);
    newAct.id = savedId;

    setActivities((prev) => {
      const updated = [...prev, newAct];
      return updated.sort(
        (a, b) => new Date(b.startTime) - new Date(a.startTime),
      );
    });

    return { success: true };
  };

  const addLeaveEntry = async ({ date, type = "planned", notes = "" }) => {
    const rawDate = new Date(date);
    const start = new Date(rawDate);
    start.setHours(8, 0, 0, 0);
    const end = new Date(rawDate);
    end.setHours(17, 0, 0, 0);

    const targetDayKey = rawDate.toDateString();
    const hasOverlap = activities.some((act) => {
      const actStart = new Date(act.startTime);
      const actEnd = act.endTime ? new Date(act.endTime) : new Date();
      if (actStart.toDateString() !== targetDayKey) return false;
      return start.getTime() < actEnd.getTime() && end.getTime() > actStart.getTime();
    });

    if (hasOverlap) {
      return {
        success: false,
        error:
          "That date already has logged activity or a leave entry overlapping this window.",
      };
    }

    const category =
      type === "planned" ? "Leave (Planned)" : "Leave (Unplanned)";
    const title = type === "planned" ? "Planned leave" : "Unplanned absence";

    const leaveEntry = {
      title,
      category,
      color: type === "planned" ? "#10b981" : "#f59e0b",
      icon: "coffee",
      project: "Operations",
      notes:
        notes ||
        (type === "planned"
          ? "Marked from Operations Reports"
          : "Auto-flagged absence"),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: 540,
    };

    const savedId = await dbInstance.put("activities", leaveEntry);
    leaveEntry.id = savedId;

    setActivities((prev) => {
      const updated = [leaveEntry, ...prev];
      return updated.sort(
        (a, b) => new Date(b.startTime) - new Date(a.startTime),
      );
    });

    return { success: true };
  };

  const deleteActivity = async (id) => {
    const target = activities.find((a) => a.id === id);
    if (target) {
      setHistoryUndo(target);
    }
    await dbInstance.delete("activities", id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const triggerUndo = async () => {
    if (historyUndo) {
      const restoredId = await dbInstance.put("activities", historyUndo);
      const restoredItem = { ...historyUndo, id: restoredId };
      setActivities((prev) =>
        [restoredItem, ...prev].sort(
          (a, b) => new Date(b.startTime) - new Date(a.startTime),
        ),
      );
      setHistoryUndo(null);
    }
  };

  const createTask = async ({
    title,
    notes = "",
    dueDate = "",
    priority = "medium",
    team = "",
    project = "",
    operationalCategory = "",
    details = "",
  }) => {
    const now = new Date().toISOString();
    const task = {
      title,
      notes,
      dueDate,
      priority,
      team,
      project,
      operationalCategory,
      details,
      completed: false,
      trackedSeconds: 0,
      subtasks: [],
      createdAt: now,
      updatedAt: now,
    };

    const savedId = await dbInstance.put("tasks", task);
    task.id = savedId;
    setTasks((prev) => [task, ...prev]);
    return { success: true };
  };

  const updateTask = async (taskId, patch) => {
    const target = tasks.find((item) => item.id === taskId);
    if (!target) return { success: false, error: "Task not found" };

    const updated = {
      ...target,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await dbInstance.put("tasks", updated);
    setTasks((prev) =>
      prev.map((item) => (item.id === taskId ? updated : item)),
    );
    return { success: true };
  };

  const addSubtask = async (taskId, title) => {
    const target = tasks.find((item) => item.id === taskId);
    if (!target) return { success: false, error: "Task not found" };

    const subtask = { id: `${taskId}-${Date.now()}`, title, completed: false };
    const updated = {
      ...target,
      subtasks: [...(target.subtasks || []), subtask],
      updatedAt: new Date().toISOString(),
    };
    await dbInstance.put("tasks", updated);
    setTasks((prev) =>
      prev.map((item) => (item.id === taskId ? updated : item)),
    );
    return { success: true };
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    const target = tasks.find((item) => item.id === taskId);
    if (!target) return { success: false, error: "Task not found" };

    const updated = {
      ...target,
      subtasks: (target.subtasks || []).map((subtask) =>
        subtask.id === subtaskId
          ? { ...subtask, completed: !subtask.completed }
          : subtask,
      ),
      updatedAt: new Date().toISOString(),
    };
    await dbInstance.put("tasks", updated);
    setTasks((prev) =>
      prev.map((item) => (item.id === taskId ? updated : item)),
    );
    return { success: true };
  };

  const toggleTaskComplete = async (taskId) => {
    const target = tasks.find((item) => item.id === taskId);
    if (!target) return { success: false, error: "Task not found" };

    const updated = {
      ...target,
      completed: !target.completed,
      updatedAt: new Date().toISOString(),
    };
    await dbInstance.put("tasks", updated);
    setTasks((prev) =>
      prev.map((item) => (item.id === taskId ? updated : item)),
    );
    return { success: true };
  };

  const toggleTaskActivity = async (task) => {
    // Identify the running session by taskId, not by comparing project
    // labels/titles — those can be duplicated across tasks or changed by
    // the user, which previously made "Stop activity" silently fail to
    // match and start a duplicate session instead.
    const isActiveTask = activeActivity && activeActivity.taskId === task.id;
    if (isActiveTask) {
      await stopCurrentActivity();
      return { success: true, action: "stopped" };
    }

    const activityNotes = [
      task.notes,
      task.details,
      task.team ? `Team: ${task.team}` : "",
      task.project ? `Project: ${task.project}` : "",
      task.operationalCategory ? `Category: ${task.operationalCategory}` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    await startNewActivity(
      task.title,
      task.operationalCategory || "Tasks",
      task.project || "Tasks",
      activityNotes,
      task.id,
    );
    return { success: true, action: "started" };
  };

  const deleteTask = async (taskId) => {
    await dbInstance.delete("tasks", taskId);
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
  };

  const toggleFavorite = async (activity) => {
    const isFav = favorites.some(
      (f) => f.title === activity.title && f.category === activity.category,
    );
    if (isFav) {
      const target = favorites.find(
        (f) => f.title === activity.title && f.category === activity.category,
      );
      await dbInstance.delete("favorites", target.id);
      setFavorites((prev) => prev.filter((f) => f.id !== target.id));
    } else {
      const newFav = {
        title: activity.title,
        category: activity.category,
        project: activity.project || "General",
        notes: activity.notes || "",
      };
      const id = await dbInstance.put("favorites", newFav);
      newFav.id = id;
      setFavorites((prev) => [...prev, newFav]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }

      // Escape should close whichever modal is open, regardless of
      // whether focus is currently inside an input.
      if (e.key === "Escape") {
        setShowCommandPalette((prev) => {
          if (prev) return false;
          return prev;
        });
        setShowQuickAdd((prev) => (prev ? false : prev));
        setShowManualAdd((prev) => (prev ? false : prev));
        return;
      }

      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.tagName === "SELECT"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          setShowQuickAdd(true);
          break;
        case " ":
          e.preventDefault();
          if (activeActivity) {
            togglePause();
          }
          break;
        case "e":
          e.preventDefault();
          setCurrentView("export");
          break;
        case "o":
          e.preventDefault();
          setCurrentView("operations-reports");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeActivity]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        theme,
        toggleTheme,
        categories,
        setCategories,
        activities,
        setActivities,
        favorites,
        setFavorites,
        templates,
        setTemplates,
        activeActivity,
        setActiveActivity,
        timerSeconds,
        setTimerSeconds,
        isPaused,
        setIsPaused,
        togglePause,
        searchQuery,
        setSearchQuery,
        showQuickAdd,
        setShowQuickAdd,
        showManualAdd,
        setShowManualAdd,
        showCommandPalette,
        setShowCommandPalette,
        historyUndo,
        triggerUndo,
        setHistoryUndo,
        startNewActivity,
        stopCurrentActivity,
        deleteActivity,
        addManualActivity,
        addLeaveEntry,
        tasks,
        createTask,
        updateTask,
        addSubtask,
        toggleSubtask,
        toggleTaskComplete,
        toggleTaskActivity,
        deleteTask,
        toggleFavorite,
        workHoursGoal,
        updateWorkHoursGoal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
