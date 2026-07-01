import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";
import CurrentActivityCard from "../components/CurrentActivityCard.jsx";
import { isNonWorkCategory } from "../utils/activityHelpers.js";

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export default function DashboardView() {
  const {
    activities,
    favorites,
    startNewActivity,
    activeActivity,
    workHoursGoal,
    theme,
  } = useApp();

  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState(getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateString(new Date()));
  const dailyChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const dailyChartInstanceRef = useRef(null);
  const categoryChartInstanceRef = useRef(null);

  const filteredActivities = useMemo(() => {
    let temp = [...activities];
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const selectedStart = startDate ? parseDateInput(startDate) : null;
    const selectedEnd = endDate ? parseDateInput(endDate) : null;

    if (datePreset === "today") {
      temp = temp.filter((activity) => {
        const activityDate = new Date(activity.startTime);
        const activityDay = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate(),
        );
        return activityDay.getTime() === startOfToday.getTime();
      });
    } else if (datePreset === "yesterday") {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      temp = temp.filter((activity) => {
        const activityDate = new Date(activity.startTime);
        const activityDay = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate(),
        );
        return activityDay.getTime() === yesterday.getTime();
      });
    } else if (datePreset === "week") {
      const weekAgo = new Date(startOfToday);
      weekAgo.setDate(weekAgo.getDate() - 6);
      temp = temp.filter((activity) => {
        const activityDate = new Date(activity.startTime);
        const activityDay = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate(),
        );
        return (
          activityDay.getTime() >= weekAgo.getTime() &&
          activityDay.getTime() <= startOfToday.getTime()
        );
      });
    } else if (datePreset === "month") {
      const monthAgo = new Date(startOfToday);
      monthAgo.setDate(monthAgo.getDate() - 29);
      temp = temp.filter((activity) => {
        const activityDate = new Date(activity.startTime);
        const activityDay = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate(),
        );
        return (
          activityDay.getTime() >= monthAgo.getTime() &&
          activityDay.getTime() <= startOfToday.getTime()
        );
      });
    } else if (datePreset === "custom") {
      if (selectedStart) {
        const startLimit = new Date(
          selectedStart.getFullYear(),
          selectedStart.getMonth(),
          selectedStart.getDate(),
        );
        temp = temp.filter((activity) => {
          const activityDate = new Date(activity.startTime);
          const activityDay = new Date(
            activityDate.getFullYear(),
            activityDate.getMonth(),
            activityDate.getDate(),
          );
          return activityDay.getTime() >= startLimit.getTime();
        });
      }
      if (selectedEnd) {
        const endLimit = new Date(
          selectedEnd.getFullYear(),
          selectedEnd.getMonth(),
          selectedEnd.getDate(),
          23,
          59,
          59,
          999,
        );
        temp = temp.filter(
          (activity) =>
            new Date(activity.startTime).getTime() <= endLimit.getTime(),
        );
      }
    }

    return temp;
  }, [activities, datePreset, startDate, endDate]);

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayActs = activities.filter(
      (activity) => new Date(activity.startTime).toDateString() === today,
    );
    const totalMinutes = todayActs.reduce(
      (acc, curr) => acc + (Number(curr.duration) || 0),
      0,
    );
    const count = todayActs.length;

    return {
      minutes: totalMinutes,
      hours: (totalMinutes / 60).toFixed(1),
      count,
    };
  }, [activities]);

  const rangeStats = useMemo(() => {
    const totalMinutes = filteredActivities.reduce(
      (acc, curr) => acc + (Number(curr.duration) || 0),
      0,
    );
    const count = filteredActivities.length;

    return {
      minutes: totalMinutes,
      hours: (totalMinutes / 60).toFixed(1),
      count,
    };
  }, [filteredActivities]);

  const operationalHighlights = useMemo(() => {
    const totalMinutes = filteredActivities.reduce(
      (acc, curr) => acc + (Number(curr.duration) || 0),
      0,
    );
    const productiveMinutes = filteredActivities.reduce((acc, curr) => {
      const duration = Number(curr.duration) || 0;
      return acc + (isNonWorkCategory(curr.category) ? 0 : duration);
    }, 0);
    const focusRatio =
      totalMinutes > 0
        ? Math.round((productiveMinutes / totalMinutes) * 100)
        : 0;
    const hourlyLoad = Array(24).fill(0);
    filteredActivities.forEach((activity) => {
      const hour = new Date(activity.startTime).getHours();
      hourlyLoad[hour] += Number(activity.duration) || 0;
    });
    const peakHour = hourlyLoad.reduce(
      (best, value, idx) => (value > best.value ? { value, idx } : best),
      { value: -1, idx: 0 },
    );
    const categoryMap = {};
    filteredActivities.forEach((activity) => {
      categoryMap[activity.category] =
        (categoryMap[activity.category] || 0) +
        (Number(activity.duration) || 0);
    });
    const topCategory =
      Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "No data";
    const activeDays = new Set(
      filteredActivities.map((activity) =>
        new Date(activity.startTime).toDateString(),
      ),
    ).size;

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      focusRatio,
      peakHour: `${String(peakHour.idx).padStart(2, "0")}:00`,
      topCategory,
      activeDays,
    };
  }, [filteredActivities]);

  const chartData = useMemo(() => {
    const dailyMap = {};
    const categoryMap = {};

    filteredActivities.forEach((activity) => {
      const dateKey = new Date(activity.startTime).toISOString().slice(0, 10);
      dailyMap[dateKey] =
        (dailyMap[dateKey] || 0) + (Number(activity.duration) || 0);
      categoryMap[activity.category] =
        (categoryMap[activity.category] || 0) +
        (Number(activity.duration) || 0);
    });

    const sortedDailyKeys = Object.keys(dailyMap).sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      dailyLabels: sortedDailyKeys,
      dailyValues: sortedDailyKeys.map((key) => dailyMap[key]),
      categoryLabels: Object.keys(categoryMap),
      categoryValues: Object.values(categoryMap),
    };
  }, [filteredActivities]);

  const getRangeLabel = () => {
    if (datePreset === "all") return "All Time";
    if (datePreset === "today") return "Today";
    if (datePreset === "yesterday") return "Yesterday";
    if (datePreset === "week") return "Last 7 Days";
    if (datePreset === "month") return "Last 30 Days";
    if (datePreset === "custom") {
      if (startDate && endDate) return `${startDate} → ${endDate}`;
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
      return "Custom Range";
    }
    return "All Time";
  };

  const resetFilters = () => {
    setDatePreset("all");
    setStartDate(getLocalDateString(new Date()));
    setEndDate(getLocalDateString(new Date()));
  };

  useEffect(() => {
    const textColor = theme === "dark" ? "#94a3b8" : "#475569";
    const gridColor =
      theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

    if (dailyChartRef.current) {
      if (dailyChartInstanceRef.current)
        dailyChartInstanceRef.current.destroy();
      const ctx = dailyChartRef.current.getContext("2d");
      dailyChartInstanceRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: chartData.dailyLabels,
          datasets: [
            {
              label: "Minutes",
              data: chartData.dailyValues,
              borderColor: "#6366f1",
              backgroundColor: "rgba(99, 102, 241, 0.14)",
              tension: 0.3,
              fill: true,
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { grid: { color: gridColor }, ticks: { color: textColor } },
            x: { grid: { display: false }, ticks: { color: textColor } },
          },
          plugins: { legend: { display: false } },
        },
      });
    }

    if (categoryChartRef.current) {
      if (categoryChartInstanceRef.current)
        categoryChartInstanceRef.current.destroy();
      const ctx = categoryChartRef.current.getContext("2d");
      categoryChartInstanceRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: chartData.categoryLabels,
          datasets: [
            {
              data: chartData.categoryValues,
              backgroundColor: [
                "#6366f1",
                "#f43f5e",
                "#10b981",
                "#8b5cf6",
                "#ec4899",
                "#eab308",
                "#14b8a6",
              ],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: textColor, font: { family: "Inter", size: 10 } },
            },
          },
        },
      });
    }

    return () => {
      if (dailyChartInstanceRef.current)
        dailyChartInstanceRef.current.destroy();
      if (categoryChartInstanceRef.current)
        categoryChartInstanceRef.current.destroy();
    };
  }, [chartData, theme]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Operational Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live shift visibility, throughput signals, and instant task logging
            in one view.
          </p>
        </div>
      </div>

      <CurrentActivityCard />

      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950 self-start">
          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "week", label: "7 Days" },
            { id: "month", label: "30 Days" },
            { id: "custom", label: "Custom" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${datePreset === preset.id ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === "custom" && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            {getRangeLabel()}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {filteredActivities.length} segments • {rangeStats.hours} hrs
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset to today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-lift p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
              Shift Completion Ratio
            </span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {todayStats.hours}{" "}
              <span className="text-xs font-normal text-slate-500">
                / {workHoursGoal} hrs
              </span>
            </h3>
            <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full progress-shimmer"
                style={{
                  width: `${Math.min(100, (Number(todayStats.hours) / workHoursGoal) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <DynamicIcon
              name="clock"
              className="w-5 h-5 text-brand-500 dark:text-brand-400"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
              Active Shift Events
            </span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {todayStats.count} segments
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <DynamicIcon
              name="layers"
              className="w-5 h-5 text-violet-600 dark:text-violet-400"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
              Current Status
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
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
            <DynamicIcon
              name={activeActivity ? "zap" : "coffee"}
              className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Productivity Analysis
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-200">
                {operationalHighlights.focusRatio}% focus
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DynamicIcon name="sparkles" className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Peak operational window is around {operationalHighlights.peakHour}{" "}
            with {operationalHighlights.totalHours} hours tracked.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Executive Reports
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-200">
                {operationalHighlights.topCategory}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <DynamicIcon name="bar-chart-3" className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            The largest recorded load is concentrated in{" "}
            {operationalHighlights.topCategory} across{" "}
            {operationalHighlights.activeDays} active days.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Range Activity Trend
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Minutes logged by day for the current range
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950">
              {getRangeLabel()}
            </span>
          </div>
          <div className="relative h-64">
            <canvas ref={dailyChartRef} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Category Allocation
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Distribution of activity minutes by category
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950">
              Mix
            </span>
          </div>
          <div className="relative h-64">
            <canvas ref={categoryChartRef} />
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
          return {
            label: days[d.getDay()],
            mins,
            isToday: dateStr === today.toDateString(),
          };
        });
        const maxMins = Math.max(...strip.map((s) => s.mins), 1);
        return (
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <DynamicIcon
                    name="trending-up"
                    className="w-4 h-4 text-brand-500"
                  />
                  <span>7-Day Activity Pulse</span>
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Recorded minutes across the last seven days
                </p>
              </div>
              <span className="rounded-full bg-slate-100 dark:bg-slate-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                This week
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 h-36">
              {strip.map((day, i) => {
                const valueLabel =
                  day.mins >= 60
                    ? `${(day.mins / 60).toFixed(1)}h`
                    : `${day.mins}m`;
                const barHeight = `${Math.max(8, (day.mins / maxMins) * 100)}%`;
                return (
                  <div
                    key={i}
                    className="group flex flex-1 flex-col items-center gap-2"
                  >
                    <span
                      className={`text-[11px] font-semibold ${day.isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-300"}`}
                    >
                      {valueLabel}
                    </span>
                    <div className="relative flex h-24 w-full items-end justify-center">
                      <div className="absolute inset-x-0 bottom-0 h-full rounded-2xl bg-slate-100 dark:bg-slate-800/80" />
                      <div
                        className={`relative w-full rounded-t-2xl border border-white/40 shadow-sm transition-all duration-500 group-hover:scale-[1.02] ${day.isToday ? "bg-brand-500" : "bg-brand-500/25 dark:bg-brand-500/20"}`}
                        style={{ height: barHeight }}
                        title={`${day.label}: ${valueLabel}`}
                      />
                      <div className="pointer-events-none absolute -top-8 rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm opacity-0 transition group-hover:opacity-100">
                        {day.label}: {valueLabel}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${day.isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}
                    >
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {(() => {
        const todayActs = filteredActivities;
        if (todayActs.length === 0) return null;
        const catMap = {};
        let total = 0;
        todayActs.forEach((a) => {
          catMap[a.category] = {
            mins: (catMap[a.category]?.mins || 0) + a.duration,
            color: a.color,
          };
          total += a.duration;
        });
        const cats = Object.entries(catMap).sort(
          (a, b) => b[1].mins - a[1].mins,
        );
        return (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
              <DynamicIcon name="flag" className="w-4 h-4 text-brand-500" />
              <span>Range Breakdown</span>
            </h3>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
              {cats.map(([name, data], i) => (
                <div
                  key={i}
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${total > 0 ? (data.mins / total) * 100 : 0}%`,
                    background: data.color,
                  }}
                  title={`${name}: ${data.mins}m`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {cats.map(([name, data], i) => (
                <div key={i} className="flex items-center space-x-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: data.color }}
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    {name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {data.mins}m
                  </span>
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
            No pinned templates yet. Create an activity and enable "Pin to
            Dashboard Favorites" to create quick triggers.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                onClick={() =>
                  startNewActivity(
                    fav.title,
                    fav.category,
                    fav.project,
                    fav.notes,
                  )
                }
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all duration-150 flex items-center justify-between group"
              >
                <div className="truncate mr-2">
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate">
                    {fav.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {fav.category}
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 opacity-60 group-hover:opacity-100">
                  <DynamicIcon
                    name="play"
                    className="w-3 h-3 text-brand-500 dark:text-brand-400"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
