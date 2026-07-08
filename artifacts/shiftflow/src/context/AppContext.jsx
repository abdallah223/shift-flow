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

const ACTIVE_ACTIVITY_KEY = "shiftflow_active_activity";
const SESSION_ALIVE_KEY = "shiftflow_session_alive";

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
  // Wall-clock refs so the interval always shows real elapsed time even when
  // the browser throttles setInterval (minimized tab, background, etc.)
  const timerBaseRef = useRef(0);       // seconds accumulated before current run
  const timerRunSinceRef = useRef(null); // Date.now() when current run started

  // Keep localStorage in sync every second (timerSeconds changes every tick).
  // This means the last saved value is always ≤1s stale — no pagehide needed.
  useEffect(() => {
    if (activeActivity) {
      localStorage.setItem(
        ACTIVE_ACTIVITY_KEY,
        JSON.stringify({ ...activeActivity, isPaused, timerSeconds }),
      );
    }
  }, [activeActivity, isPaused, timerSeconds]);

  useEffect(() => {
    const init = async () => {
      await dbInstance.init();

      // --- Refresh vs. tab-close detection ---
      // sessionStorage survives refreshes but is wiped when the tab closes.
      const isRefresh = sessionStorage.getItem(SESSION_ALIVE_KEY) === "1";
      sessionStorage.setItem(SESSION_ALIVE_KEY, "1");

      const persistedRaw = localStorage.getItem(ACTIVE_ACTIVITY_KEY);

      if (persistedRaw) {
        const persisted = JSON.parse(persistedRaw);

        const { isPaused: savedPaused, ...activityData } = persisted;

        if (isRefresh) {
          if (savedPaused) {
            // Was paused before refresh — restore frozen value, refs stay idle
            const frozen = persisted.timerSeconds ?? 0;
            timerBaseRef.current = frozen;
            timerRunSinceRef.current = null;
            setActiveActivity(activityData);
            setTimerSeconds(frozen);
            setIsPaused(true);
          } else {
            // Was running before refresh — anchor runSince to actual startTime
            // so the wall-clock computation is correct immediately
            timerBaseRef.current = 0;
            timerRunSinceRef.current = new Date(persisted.startTime).getTime();
            const elapsedSeconds = Math.max(
              0,
              Math.floor((Date.now() - timerRunSinceRef.current) / 1000),
            );
            setActiveActivity(activityData);
            setTimerSeconds(elapsedSeconds);
            setIsPaused(false);
          }
        } else {
          // Tab was closed — restore paused at the exact second the tab closed.
          const frozenSeconds = persisted.timerSeconds ?? 0;
          timerBaseRef.current = frozenSeconds;
          timerRunSinceRef.current = null;
          setActiveActivity(activityData);
          setTimerSeconds(frozenSeconds);
          setIsPaused(true);
        }
      }

      // Load categories
      const cats = await dbInstance.getAll("categories");
      if (cats.length === 0) {
        for (const c of DEFAULT_CATEGORIES) {
          await dbInstance.put("categories", c);
        }
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(cats);
      }

      // Load activities (may include the newly-saved one from tab-close above)
      const logs = await dbInstance.getAll("activities");
      setActivities(
        logs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
      );

      const favs = await dbInstance.getAll("favorites");
      setFavorites(favs);

      const tmps = await dbInstance.getAll("templates");
      setTemplates(tmps);

      const savedTasks = await dbInstance.getAll("tasks");
      setTasks(
        [...savedTasks].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        ),
      );

      const settings = await dbInstance.getAll("settings");
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
    };

    init();
  }, []);

  useEffect(() => {
    if (activeActivity && !isPaused) {
      timerRef.current = setInterval(() => {
        if (timerRunSinceRef.current !== null) {
          setTimerSeconds(
            timerBaseRef.current +
              Math.floor((Date.now() - timerRunSinceRef.current) / 1000),
          );
        }
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
    setWorkHoursGoal(Number(val));
    dbInstance.put("settings", { key: "workHoursGoal", value: val });
  };

  const startNewActivity = async (
    title,
    categoryName,
    project = "General",
    notes = "",
    extraFields = {},
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
      startTime: now.toISOString(),
      endTime: null,
      duration: 0,
      ...extraFields,
    };

    timerBaseRef.current = 0;
    timerRunSinceRef.current = Date.now();
    setActiveActivity(newAct);
    setTimerSeconds(0);
    setIsPaused(false);
    // localStorage will be updated by the sync useEffect above
  };

  const stopCurrentActivity = async () => {
    if (!activeActivity) return;

    const now = new Date();
    const start = new Date(activeActivity.startTime);

    const elapsedMinutes = Math.max(1, Math.round((now - start) / 60000));

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

    // If this activity was linked to a task, write the elapsed seconds back
    if (activeActivity.taskId) {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== activeActivity.taskId) return t;
          const updated = {
            ...t,
            trackedSeconds: (t.trackedSeconds || 0) + timerSeconds,
            updatedAt: now.toISOString(),
          };
          dbInstance.put("tasks", updated);
          return updated;
        }),
      );
    }

    setActiveActivity(null);
    setTimerSeconds(0);
    setIsPaused(false);
    localStorage.removeItem(ACTIVE_ACTIVITY_KEY);
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

    // Floor to minute precision so that sub-minute gaps between activities
    // (e.g. activity ends at 10:00:30, new entry starts at 10:00:00) are not
    // incorrectly flagged as overlaps.
    const floorMin = (ms) => Math.floor(ms / 60000) * 60000;
    const ns = floorMin(newStart.getTime());
    const ne = floorMin(newEnd.getTime());

    const isHistoricalOverlap = activities.some((act) => {
      if (!act.endTime) return false; // skip entries with no end time
      const actStart = floorMin(new Date(act.startTime).getTime());
      const actEnd = floorMin(new Date(act.endTime).getTime());
      return ns < actEnd && ne > actStart;
    });

    if (isHistoricalOverlap) {
      return {
        success: false,
        error: "Time range directly overlaps with a previously logged entry.",
      };
    }

    if (activeActivity) {
      const activeStart = floorMin(new Date(activeActivity.startTime).getTime());
      if (ne > activeStart) {
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

  const updateActivity = async (id, patch) => {
    const target = activities.find((a) => a.id === id);
    if (!target) return;
    const updated = { ...target, ...patch };
    await dbInstance.put("activities", updated);
    setActivities((prev) =>
      prev
        .map((a) => (a.id === id ? updated : a))
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
    );
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
      task.project || "General",
      activityNotes,
      { taskId: task.id },
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

  const togglePause = () => {
    setIsPaused((prev) => {
      if (prev) {
        // Resuming — start a new run period from now
        timerRunSinceRef.current = Date.now();
      } else {
        // Pausing — accumulate elapsed seconds and stop the run period
        if (timerRunSinceRef.current !== null) {
          timerBaseRef.current +=
            Math.floor((Date.now() - timerRunSinceRef.current) / 1000);
          timerRunSinceRef.current = null;
        }
      }
      return !prev;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
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
        updateActivity,
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
