import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";

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

export default function OperationsReportsView() {
  const { activities, addLeaveEntry } = useApp();
  const [datePreset, setDatePreset] = useState("today");
  const [startDate, setStartDate] = useState(getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateString(new Date()));
  const [activeReportTab, setActiveReportTab] = useState("leaves");
  const [leaveDraftDate, setLeaveDraftDate] = useState(
    getLocalDateString(new Date()),
  );
  const [leaveDraftType, setLeaveDraftType] = useState("planned");
  const [leaveDraftNotes, setLeaveDraftNotes] = useState("");
  const [leaveFeedback, setLeaveFeedback] = useState("");

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

  const rangeDates = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const selectedStart = startDate ? parseDateInput(startDate) : null;
    const selectedEnd = endDate ? parseDateInput(endDate) : null;

    let startValue = null;
    let endValue = null;

    if (datePreset === "all") {
      if (filteredActivities.length > 0) {
        const dates = filteredActivities.map(
          (activity) => new Date(activity.startTime),
        );
        startValue = new Date(Math.min(...dates));
        endValue = new Date(Math.max(...dates));
      } else {
        startValue = startOfToday;
        endValue = startOfToday;
      }
    } else if (datePreset === "today") {
      startValue = startOfToday;
      endValue = startOfToday;
    } else if (datePreset === "yesterday") {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      startValue = yesterday;
      endValue = yesterday;
    } else if (datePreset === "week") {
      const weekAgo = new Date(startOfToday);
      weekAgo.setDate(weekAgo.getDate() - 6);
      startValue = weekAgo;
      endValue = startOfToday;
    } else if (datePreset === "month") {
      const monthAgo = new Date(startOfToday);
      monthAgo.setDate(monthAgo.getDate() - 29);
      startValue = monthAgo;
      endValue = startOfToday;
    } else if (datePreset === "custom") {
      startValue = selectedStart;
      endValue = selectedEnd;
    }

    if (!startValue || !endValue) {
      startValue = startOfToday;
      endValue = startOfToday;
    }

    const dates = [];
    const cursor = new Date(startValue);
    cursor.setHours(0, 0, 0, 0);
    const finish = new Date(endValue);
    finish.setHours(0, 0, 0, 0);

    while (cursor <= finish) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }, [filteredActivities, datePreset, startDate, endDate]);

  const reportData = useMemo(() => {
    const days = rangeDates.map((dayDate) => {
      const dayStart = new Date(dayDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayActivities = filteredActivities.filter((activity) => {
        const activityDate = new Date(activity.startTime);
        return activityDate >= dayStart && activityDate <= dayEnd;
      });

      const workMinutes = dayActivities.reduce((sum, activity) => {
        const duration = Number(activity.duration) || 0;
        const isNonWork = /break|lunch|leave|vacation|holiday|sick|off/i.test(
          activity.category || "",
        );
        return sum + (isNonWork ? 0 : duration);
      }, 0);

      const leaveMinutes = dayActivities.reduce((sum, activity) => {
        const duration = Number(activity.duration) || 0;
        const isNonWork = /break|lunch|leave|vacation|holiday|sick|off/i.test(
          activity.category || "",
        );
        return sum + (isNonWork ? duration : 0);
      }, 0);

      const categories = [
        ...new Set(dayActivities.map((activity) => activity.category)),
      ];
      const explicitLeave = dayActivities.find((activity) =>
        /leave|vacation|holiday|sick|off/i.test(activity.category || ""),
      );
      const isLeaveDay = workMinutes === 0;
      let leaveLabel = "Active day";
      let leaveType = "active";

      if (isLeaveDay) {
        if (explicitLeave) {
          const planned = /planned/i.test(explicitLeave.category || "");
          leaveLabel = planned ? "Planned leave" : "Unplanned absence";
          leaveType = planned ? "planned" : "unplanned";
        } else {
          leaveLabel = "Auto-detected off-day";
          leaveType = "auto-detected";
        }
      }

      return {
        date: dayDate.toISOString().slice(0, 10),
        workMinutes,
        leaveMinutes,
        hours: (workMinutes + leaveMinutes) / 60,
        workHours: workMinutes / 60,
        leaveHours: leaveMinutes / 60,
        segments: dayActivities.length,
        categories,
        isLeaveDay,
        leaveLabel,
        leaveType,
      };
    });

    const leaveEntries = days
      .filter((day) => day.isLeaveDay)
      .map((day) => ({
        date: day.date,
        title: day.leaveLabel,
        category:
          day.leaveType === "planned"
            ? "Planned leave"
            : day.leaveType === "unplanned"
              ? "Unplanned absence"
              : "Auto-detected off-day",
        duration: day.leaveMinutes,
      }));

    let longestStreak = 0;
    let streak = 0;
    let recoveryCount = 0;

    days.forEach((day, index) => {
      if (day.isLeaveDay) {
        streak += 1;
        longestStreak = Math.max(longestStreak, streak);
        const nextDay = days[index + 1];
        if (nextDay && nextDay.workMinutes > 0) {
          recoveryCount += 1;
        }
      } else {
        streak = 0;
      }
    });

    const workdays = days.filter((day) => day.workMinutes > 0).length;
    const leaveDays = leaveEntries.length;
    const plannedLeaveDays = leaveEntries.filter(
      (entry) => entry.category === "Planned leave",
    ).length;
    const unplannedAbsenceDays = leaveEntries.filter(
      (entry) => entry.category === "Unplanned absence",
    ).length;
    const autoDetectedDays = leaveEntries.filter(
      (entry) => entry.category === "Auto-detected off-day",
    ).length;
    const leaveBalance = Math.max(0, workdays - leaveDays);
    const recoveryRate =
      leaveDays > 0 ? ((recoveryCount / leaveDays) * 100).toFixed(0) : "100";

    return {
      days,
      leaveEntries,
      workdays,
      leaveDays,
      plannedLeaveDays,
      unplannedAbsenceDays,
      autoDetectedDays,
      leaveBalance,
      longestStreak,
      recoveryRate,
      averageHoursPerDay:
        days.length > 0
          ? (
              days.reduce((sum, day) => sum + day.hours, 0) / days.length
            ).toFixed(1)
          : "0.0",
      totalWorkMinutes: days.reduce((sum, day) => sum + day.workMinutes, 0),
      totalLeaveMinutes: days.reduce((sum, day) => sum + day.leaveMinutes, 0),
    };
  }, [filteredActivities, rangeDates]);

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
    setDatePreset("today");
    setStartDate(getLocalDateString(new Date()));
    setEndDate(getLocalDateString(new Date()));
  };

  const handleLeaveSubmit = async (event) => {
    event.preventDefault();
    if (!leaveDraftDate) {
      setLeaveFeedback("Select a date before saving a leave entry.");
      return;
    }

    const result = await addLeaveEntry({
      date: leaveDraftDate,
      type: leaveDraftType,
      notes: leaveDraftNotes,
    });

    if (result?.success) {
      setLeaveFeedback(
        `${leaveDraftType === "planned" ? "Planned leave" : "Unplanned absence"} saved for ${leaveDraftDate}.`,
      );
      setLeaveDraftNotes("");
      setLeaveDraftType("planned");
      setLeaveDraftDate(getLocalDateString(new Date()));
    } else {
      setLeaveFeedback(result?.error || "Leave entry could not be saved.");
    }
  };

  const exportTabReport = (tabName) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      range: getRangeLabel(),
      tab: tabName,
      summary: {
        totalWorkMinutes: reportData.totalWorkMinutes,
        totalLeaveMinutes: reportData.totalLeaveMinutes,
        workdays: reportData.workdays,
        leaveDays: reportData.leaveDays,
        averageHoursPerDay: reportData.averageHoursPerDay,
        plannedLeaveDays: reportData.plannedLeaveDays,
        unplannedAbsenceDays: reportData.unplannedAbsenceDays,
        autoDetectedDays: reportData.autoDetectedDays,
        leaveBalance: reportData.leaveBalance,
        longestConsecutiveOffDays: reportData.longestStreak,
        recoveryRate: `${reportData.recoveryRate}%`,
      },
      days: reportData.days,
      leaves: reportData.leaveEntries,
      chartSeries: reportData.days.map((day) => ({
        date: day.date,
        workHours: day.workHours,
        leaveHours: day.leaveHours,
        status: day.leaveType,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ShiftFlow_${tabName.replace(/\s+/g, "_")}_Report_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
            Operations Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Leave tracking, workday review, and daily hour reporting in a
            dedicated workspace.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
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
            {filteredActivities.length} segments •{" "}
            {reportData.averageHoursPerDay} hrs/day avg
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Workdays
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {reportData.workdays}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Leave days
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {reportData.leaveDays}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Leave balance
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {reportData.leaveBalance}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Average hours
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
            {reportData.averageHoursPerDay} hrs/day
          </h3>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Manual leave entry
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Capture planned or unplanned leave so coverage patterns stay
              visible.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              {reportData.plannedLeaveDays} planned
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              {reportData.unplannedAbsenceDays} unplanned
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {reportData.autoDetectedDays} auto-detected
            </span>
          </div>
        </div>

        <form
          onSubmit={handleLeaveSubmit}
          className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.9fr_1.5fr_auto]"
        >
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Date</span>
            <input
              type="date"
              value={leaveDraftDate}
              onChange={(e) => setLeaveDraftDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </label>
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Type</span>
            <select
              value={leaveDraftType}
              onChange={(e) => setLeaveDraftType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="planned">Planned leave</option>
              <option value="unplanned">Unplanned absence</option>
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span className="mb-1">Notes</span>
            <input
              type="text"
              value={leaveDraftNotes}
              onChange={(e) => setLeaveDraftNotes(e.target.value)}
              placeholder="Optional context"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700"
          >
            Save leave
          </button>
        </form>
        {leaveFeedback && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {leaveFeedback}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Operations Reporting Tabs
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Leave, workday, and daily hour views for the active range
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "leaves", label: "Leaves Tracker" },
              { id: "workdays", label: "Workdays" },
              { id: "hours", label: "Hours / Day" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${activeReportTab === tab.id ? "bg-brand-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {activeReportTab === "leaves" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Leave coverage
                  </p>
                  <h4 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
                    {reportData.leaveDays} leave day
                    {reportData.leaveDays === 1 ? "" : "s"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => exportTabReport("Leaves Tracker")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Export report
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {reportData.leaveEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    No leave days were detected for the selected range.
                  </div>
                ) : (
                  reportData.leaveEntries.map((entry, index) => (
                    <div
                      key={`${entry.date}-${index}`}
                      className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {entry.title}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {entry.duration}m
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {entry.category} • {entry.date}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeReportTab === "workdays" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Workday count
                  </p>
                  <h4 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
                    {reportData.workdays} active workday
                    {reportData.workdays === 1 ? "" : "s"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => exportTabReport("Workdays")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Export report
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {reportData.days.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {day.date}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {day.workMinutes > 0
                          ? `${day.workHours.toFixed(1)}h`
                          : "off"}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {day.segments} segment{day.segments === 1 ? "" : "s"} •{" "}
                      {day.categories.join(", ") || "No categories"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReportTab === "hours" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Average hours per day
                  </p>
                  <h4 className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">
                    {reportData.averageHoursPerDay} hrs/day
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => exportTabReport("Hours Per Day")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Export report
                </button>
              </div>
              <div className="space-y-2">
                {reportData.days.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {day.date}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {day.hours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-950">
                      <div
                        className="h-2 rounded-full bg-brand-500"
                        style={{
                          width: `${Math.max(6, Math.min(100, (Number(day.hours) / Math.max(8, Number(reportData.averageHoursPerDay) || 8)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
