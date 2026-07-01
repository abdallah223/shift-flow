import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";
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

export default function ProductivityView() {
  const { activities, categories, favorites, templates, theme } = useApp();
  const dailyChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const focusChartRef = useRef(null);
  const dailyChartInstanceRef = useRef(null);
  const categoryChartInstanceRef = useRef(null);
  const focusChartInstanceRef = useRef(null);

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
    const dailyDist = {};
    const hourCounts = Array(24).fill(0);
    let productiveMinutes = 0;
    let breakMinutes = 0;
    let totalMinutes = 0;
    let longest = { title: "No entries", duration: 0 };
    let activeDays = new Set();
    let firstStart = null;
    let lastEnd = null;

    filteredActivities.forEach((act) => {
      const duration = Number(act.duration) || 0;
      totalMinutes += duration;
      const dateKey = new Date(act.startTime).toISOString().slice(0, 10);
      dailyDist[dateKey] = (dailyDist[dateKey] || 0) + duration;
      activeDays.add(dateKey);

      const start = new Date(act.startTime);
      const hour = start.getHours();
      hourCounts[hour] += duration;

      if (!firstStart || start < firstStart) firstStart = start;
      const end = act.endTime ? new Date(act.endTime) : start;
      if (!lastEnd || end > lastEnd) lastEnd = end;

      if (isNonWorkCategory(act.category)) {
        breakMinutes += duration;
      } else {
        productiveMinutes += duration;
      }

      categoryDist[act.category] = (categoryDist[act.category] || 0) + duration;
      projectDist[act.project] = (projectDist[act.project] || 0) + duration;

      if (duration > longest.duration) {
        longest = { title: act.title, duration };
      }
    });

    const dailyData = Object.entries(dailyDist)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, minutes]) => ({ date, minutes }));

    const peakHour = hourCounts.reduce(
      (best, value, idx) => (value > best.value ? { value, idx } : best),
      { value: -1, idx: 0 },
    );
    const focusRatio =
      totalMinutes > 0
        ? Math.round((productiveMinutes / totalMinutes) * 100)
        : 0;
    const avgSession =
      filteredActivities.length > 0
        ? Math.round(totalMinutes / filteredActivities.length)
        : 0;
    const topCategory = Object.entries(categoryDist).sort(
      (a, b) => b[1] - a[1],
    )[0] || ["No data", 0];
    const topProject = Object.entries(projectDist).sort(
      (a, b) => b[1] - a[1],
    )[0] || ["No data", 0];

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      productiveHours: (productiveMinutes / 60).toFixed(1),
      breakHours: (breakMinutes / 60).toFixed(1),
      focusRatio,
      avgSession,
      activeDays: activeDays.size,
      peakHour: `${String(peakHour.idx).padStart(2, "0")}:00`,
      longest,
      topCategory: { name: topCategory[0], minutes: topCategory[1] },
      topProject: { name: topProject[0], minutes: topProject[1] },
      categories: Object.entries(categoryDist).map(([name, minutes]) => ({
        name,
        minutes,
      })),
      dailyData,
      operationalWindow:
        firstStart && lastEnd
          ? `${firstStart.toLocaleDateString()} → ${lastEnd.toLocaleDateString()}`
          : "No window",
      categoryCount: Object.keys(categoryDist).length,
      projectCount: Object.keys(projectDist).length,
      activeCategories: Object.keys(categoryDist).length,
      activeProjects: Object.keys(projectDist).length,
      categoryCoverage:
        Object.keys(categoryDist).length > 0
          ? Math.round(
              (Object.keys(categoryDist).length /
                Math.max(Object.keys(categoryDist).length, 1)) *
                100,
            )
          : 0,
      systemHealth:
        focusRatio >= 70
          ? "High focus"
          : focusRatio >= 45
            ? "Balanced"
            : "Needs reset",
      workspaceSignals: [
        `Tracked ${filteredActivities.length} activity segments`,
        `Top category: ${topCategory[0]}`,
        `Peak working hour: ${String(peakHour.idx).padStart(2, "0")}:00`,
      ],
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

  const exportAnalysis = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      range: getRangeLabel(),
      summary: {
        totalHours: analytics.totalHours,
        productiveHours: analytics.productiveHours,
        breakHours: analytics.breakHours,
        focusRatio: analytics.focusRatio,
        averageSessionMinutes: analytics.avgSession,
        activeDays: analytics.activeDays,
        peakHour: analytics.peakHour,
        topCategory: analytics.topCategory.name,
        topProject: analytics.topProject.name,
        operationalWindow: analytics.operationalWindow,
        categoryCount: analytics.categoryCount,
        projectCount: analytics.projectCount,
        systemHealth: analytics.systemHealth,
      },
      categories: analytics.categories,
      dailyData: analytics.dailyData,
      workspace: {
        activities: filteredActivities,
        categories,
        favorites,
        templates,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ShiftFlow_Productivity_Analysis_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
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
          labels: analytics.dailyData.map((d) => d.date),
          datasets: [
            {
              label: "Minutes",
              data: analytics.dailyData.map((d) => d.minutes),
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
          labels: analytics.categories.map((c) => c.name),
          datasets: [
            {
              data: analytics.categories.map((c) => c.minutes),
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

    if (focusChartRef.current) {
      if (focusChartInstanceRef.current)
        focusChartInstanceRef.current.destroy();
      const ctx = focusChartRef.current.getContext("2d");
      focusChartInstanceRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Productive", "Break"],
          datasets: [
            {
              label: "Minutes",
              data: [
                Number(analytics.productiveHours) * 60 || 0,
                Number(analytics.breakHours) * 60 || 0,
              ],
              backgroundColor: ["#10b981", "#f59e0b"],
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
      if (dailyChartInstanceRef.current)
        dailyChartInstanceRef.current.destroy();
      if (categoryChartInstanceRef.current)
        categoryChartInstanceRef.current.destroy();
      if (focusChartInstanceRef.current)
        focusChartInstanceRef.current.destroy();
    };
  }, [analytics, theme]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Productivity Analysis
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Systems-style operational review of throughput, focus quality, and
            work distribution.
          </p>
        </div>
        <button
          type="button"
          onClick={exportAnalysis}
          className="px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 font-semibold text-xs text-white flex items-center space-x-1.5 shadow-md shadow-brand-500/10 transition-all"
        >
          <DynamicIcon name="download" className="w-4 h-4" />
          <span>Export Analysis</span>
        </button>
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
            {filteredActivities.length} segments • {analytics.activeDays} active
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Throughput
          </span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
            {analytics.totalHours} hrs
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Focus Index
          </span>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {analytics.focusRatio}%
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Avg. Session
          </span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
            {analytics.avgSession} mins
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Peak Window
          </span>
          <h3 className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-1">
            {analytics.peakHour}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Daily Throughput Trend
            </h3>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              System load
            </span>
          </div>
          <div className="relative h-64">
            <canvas ref={dailyChartRef} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Focus Balance
            </h3>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Capacity mix
            </span>
          </div>
          <div className="relative h-64">
            <canvas ref={focusChartRef} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Category Load Distribution
            </h3>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Operational mix
            </span>
          </div>
          <div className="relative h-64">
            <canvas ref={categoryChartRef} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Workspace Intelligence
          </h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Operational window
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {analytics.operationalWindow}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                System health
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {analytics.systemHealth}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Signals
              </p>
              <ul className="mt-1 space-y-1">
                {analytics.workspaceSignals.map((signal) => (
                  <li key={signal} className="leading-relaxed">
                    • {signal}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Operational Diagnostics
          </h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Primary load
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {analytics.topCategory.name}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Primary project
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {analytics.topProject.name}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Longest session
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {analytics.longest.title} ({analytics.longest.duration}m)
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Performance Notes
          </h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Capacity outlook
              </p>
              <p className="mt-1 leading-relaxed">
                Focus performance is running at {analytics.focusRatio}% against{" "}
                {analytics.totalHours} hours of recorded system activity.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Operational recommendation
              </p>
              <p className="mt-1 leading-relaxed">
                The largest load is centered on {analytics.topCategory.name}.
                Consider protecting {analytics.peakHour} as a priority window
                for high-value delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
