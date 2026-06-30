import React, { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import { useApp } from "../context/AppContext.jsx";

export default function ReportsView() {
  const { activities, theme } = useApp();
  const categoryCanvasRef = useRef(null);
  const projectCanvasRef = useRef(null);
  const categoryChartRef = useRef(null);
  const projectChartRef = useRef(null);

  const analytics = useMemo(() => {
    const categoryDist = {};
    const projectDist = {};
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;

    activities.forEach((act) => {
      if (act.category === "Break / Lunch") {
        totalBreakMinutes += act.duration;
      } else {
        totalWorkMinutes += act.duration;
      }
      categoryDist[act.category] = (categoryDist[act.category] || 0) + act.duration;
      projectDist[act.project] = (projectDist[act.project] || 0) + act.duration;
    });

    return {
      categories: Object.entries(categoryDist).map(([name, val]) => ({ name, val })),
      projects: Object.entries(projectDist).map(([name, val]) => ({ name, val })),
      totalHours: ((totalWorkMinutes + totalBreakMinutes) / 60).toFixed(1),
      workHours: (totalWorkMinutes / 60).toFixed(1),
      breakHours: (totalBreakMinutes / 60).toFixed(1),
    };
  }, [activities]);

  useEffect(() => {
    const textColor = theme === "dark" ? "#94a3b8" : "#475569";
    const gridColor = theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

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
            legend: { position: "bottom", labels: { color: textColor, font: { family: "Inter", size: 10 } } },
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
            { label: "Minutes allocated", data: analytics.projects.map((p) => p.val), backgroundColor: "#6366f1", borderRadius: 6 },
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
          Deep aggregated allocation metrics, productivity charts, and breakdown summaries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Accumulated Hours
          </span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-250 mt-1">{analytics.totalHours} hrs</h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Productive Work Delivery
          </span>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{analytics.workHours} hrs</h3>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Break & Idle allocation
          </span>
          <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400 mt-1">{analytics.breakHours} hrs</h3>
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
                Not enough visual timeline telemetry to populate breakdown charts.
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
              <p className="text-xs text-slate-500 italic">No project allocations logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
