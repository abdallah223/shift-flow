import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useApp } from "../context/AppContext.jsx";

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

export default function ReportsView() {
  const { activities, theme } = useApp();
  const categoryCanvasRef = useRef(null);
  const projectCanvasRef = useRef(null);
  const categoryChartRef = useRef(null);
  const projectChartRef = useRef(null);

  const [datePreset, setDatePreset] = useState("today");
  const [startDate, setStartDate] = useState(getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateString(new Date()));

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
      temp = temp.filter((a) => {
        const activityDate = new Date(a.startTime);
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
      temp = temp.filter((a) => {
        const activityDate = new Date(a.startTime);
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
      temp = temp.filter((a) => {
        const activityDate = new Date(a.startTime);
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
      temp = temp.filter((a) => {
        const activityDate = new Date(a.startTime);
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
        temp = temp.filter((a) => {
          const activityDate = new Date(a.startTime);
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
          (a) => new Date(a.startTime).getTime() <= endLimit.getTime(),
        );
      }
    }

    return temp;
  }, [activities, datePreset, startDate, endDate]);

  const analytics = useMemo(() => {
    const categoryDist = {};
    const projectDist = {};
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let longestActivity = { title: "No entries", duration: 0, category: "—" };
    let activeDays = new Set();

    filteredActivities.forEach((act) => {
      const duration = Number(act.duration) || 0;
      if (act.category === "Break / Lunch") {
        totalBreakMinutes += duration;
      } else {
        totalWorkMinutes += duration;
      }
      categoryDist[act.category] = (categoryDist[act.category] || 0) + duration;
      projectDist[act.project] = (projectDist[act.project] || 0) + duration;

      const dayKey = new Date(act.startTime).toDateString();
      activeDays.add(dayKey);

      if (duration > longestActivity.duration) {
        longestActivity = {
          title: act.title,
          duration,
          category: act.category,
        };
      }
    });

    const categories = Object.entries(categoryDist).map(([name, val]) => ({
      name,
      val,
    }));
    const projects = Object.entries(projectDist).map(([name, val]) => ({
      name,
      val,
    }));
    const topCategory = categories.sort((a, b) => b.val - a.val)[0] || {
      name: "No data",
      val: 0,
    };
    const topProject = projects.sort((a, b) => b.val - a.val)[0] || {
      name: "No data",
      val: 0,
    };
    const totalMinutes = totalWorkMinutes + totalBreakMinutes;
    const productivePct =
      totalMinutes > 0
        ? Math.round((totalWorkMinutes / totalMinutes) * 100)
        : 0;

    return {
      categories,
      projects,
      totalHours: (totalMinutes / 60).toFixed(1),
      workHours: (totalWorkMinutes / 60).toFixed(1),
      breakHours: (totalBreakMinutes / 60).toFixed(1),
      activityCount: filteredActivities.length,
      averageSessionMinutes:
        filteredActivities.length > 0
          ? Math.round(totalMinutes / filteredActivities.length)
          : 0,
      longestActivity,
      topCategory,
      topProject,
      productivePct,
      activeDays: activeDays.size,
    };
  }, [filteredActivities]);

  const getRangeLabel = () => {
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
    setDatePreset("today");
    setStartDate(getLocalDateString(new Date()));
    setEndDate(getLocalDateString(new Date()));
  };

  useEffect(() => {
    const textColor = theme === "dark" ? "#94a3b8" : "#475569";
    const gridColor =
      theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

    if (categoryCanvasRef.current && analytics.categories.length > 0) {
      if (categoryChartRef.current) categoryChartRef.current.destroy();

      const ctx = categoryCanvasRef.current.getContext("2d");
      categoryChartRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: analytics.categories.map((c) => c.name),
          datasets: [
            {
              data: analytics.categories.map((c) => c.val),
              backgroundColor: [
                "#6366f1",
                "#f43f5e",
                "#10b981",
                "#8b5cf6",
                "#ec4899",
                "#eab308",
                "#14b8a6",
                "#3b82f6",
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

    if (projectCanvasRef.current && analytics.projects.length > 0) {
      if (projectChartRef.current) projectChartRef.current.destroy();

      const ctx = projectCanvasRef.current.getContext("2d");
      projectChartRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: analytics.projects.map((p) => p.name),
          datasets: [
            {
              label: "Minutes allocated",
              data: analytics.projects.map((p) => p.val),
              backgroundColor: "#6366f1",
              borderRadius: 6,
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

    return () => {
      if (categoryChartRef.current) categoryChartRef.current.destroy();
      if (projectChartRef.current) projectChartRef.current.destroy();
    };
  }, [analytics, theme]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
          Executive Shift Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Deep aggregated allocation metrics, productivity charts, and breakdown
          summaries.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 shadow-sm"
              />
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="mb-1">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 shadow-sm"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 dark:bg-slate-950 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300">
            {getRangeLabel()}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {analytics.activityCount} segments • {analytics.activeDays} active
            day{analytics.activeDays === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Reset to today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Accumulated Hours
          </span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-250 mt-1">
            {analytics.totalHours} hrs
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Productive Work Delivery
          </span>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {analytics.workHours} hrs
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Break & Idle allocation
          </span>
          <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400 mt-1">
            {analytics.breakHours} hrs
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Focus Ratio
          </span>
          <h3 className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-1">
            {analytics.productivePct}%
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Avg. Session Length
          </span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-250 mt-1">
            {analytics.averageSessionMinutes} mins
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Longest Session
          </span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-250 mt-1">
            {analytics.longestActivity.title === "No entries"
              ? "No entries"
              : `${analytics.longestActivity.title} (${analytics.longestActivity.duration}m)`}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
            Category Distribution (Minutes)
          </h3>
          <div className="relative h-64 flex items-center justify-center">
            {analytics.categories.length > 0 ? (
              <canvas ref={categoryCanvasRef} />
            ) : (
              <p className="text-xs text-slate-500 italic">
                Not enough visual timeline telemetry to populate breakdown
                charts.
              </p>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
            Project Distribution (Minutes)
          </h3>
          <div className="relative h-64 flex items-center justify-center">
            {analytics.projects.length > 0 ? (
              <canvas ref={projectCanvasRef} />
            ) : (
              <p className="text-xs text-slate-500 italic">
                No project allocations logged yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Executive Insights
          </h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Top category
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {analytics.topCategory.name}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Top project
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {analytics.topProject.name}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Readout
              </p>
              <p className="mt-1 leading-relaxed">
                This range shows {analytics.productivePct}% productive time
                across {analytics.activityCount} logged segments with the
                longest session centered on {analytics.longestActivity.title}.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Allocation Snapshot
          </h3>
          <div className="mt-4 space-y-2 text-sm">
            {analytics.categories.length > 0 ? (
              analytics.categories.slice(0, 5).map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2"
                >
                  <span className="text-slate-600 dark:text-slate-400">
                    {item.name}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.val} mins
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">
                No category data for the selected period.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
