import React, { useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import Chart from "chart.js/auto";
import { useApp } from "../context/AppContext.jsx";
import { dbInstance } from "../db/database.js";
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

export default function ExportView() {
  const { activities, setActivities } = useApp();

  const [exportPreset, setExportPreset] = useState("today");
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

    if (exportPreset === "today") {
      temp = temp.filter((a) => {
        const activityDate = new Date(a.startTime);
        const activityDay = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate(),
        );
        return activityDay.getTime() === startOfToday.getTime();
      });
    } else if (exportPreset === "yesterday") {
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
    } else if (exportPreset === "week") {
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
    } else if (exportPreset === "month") {
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
    } else if (exportPreset === "custom") {
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
        temp = temp.filter((a) => {
          const activityDate = new Date(a.startTime);
          return activityDate.getTime() <= endLimit.getTime();
        });
      }
    }
    return temp;
  }, [activities, exportPreset, startDate, endDate]);

  const getExportMetrics = (activitiesList) => {
    if (!activitiesList || activitiesList.length === 0) {
      return {
        totalMinutes: 0,
        workMinutes: 0,
        breakMinutes: 0,
        totalHours: "0.0",
        workHours: "0.0",
        breakHours: "0.0",
        activityCount: 0,
        longestActivity: { title: "N/A", duration: 0, category: "N/A" },
        topProject: "N/A",
        categories: [],
        projects: [],
        dateStr: new Date().toLocaleDateString(),
      };
    }

    let totalMinutes = 0;
    let workMinutes = 0;
    let breakMinutes = 0;
    let longest = { title: "None", duration: 0, category: "" };
    const categoryMap = {};
    const projectMap = {};

    activitiesList.forEach((act) => {
      const duration = Number(act.duration) || 0;
      totalMinutes += duration;
      if (isNonWorkCategory(act.category)) {
        breakMinutes += duration;
      } else {
        workMinutes += duration;
      }

      if (duration > longest.duration) {
        longest = { title: act.title, duration, category: act.category };
      }

      if (act.category) {
        if (!categoryMap[act.category]) {
          categoryMap[act.category] = {
            minutes: 0,
            color: act.color || "#6366f1",
          };
        }
        categoryMap[act.category].minutes += duration;
      }

      if (act.project) {
        projectMap[act.project] = (projectMap[act.project] || 0) + duration;
      }
    });

    let topProject = "General";
    let maxProjectMins = 0;
    Object.entries(projectMap).forEach(([pName, mins]) => {
      if (mins > maxProjectMins) {
        maxProjectMins = mins;
        topProject = pName;
      }
    });

    const categories = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        minutes: data.minutes,
        percentage:
          totalMinutes > 0
            ? Math.round((data.minutes / totalMinutes) * 100)
            : 0,
        color: data.color,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const projects = Object.entries(projectMap)
      .map(([name, minutes]) => ({
        name,
        minutes,
        percentage:
          totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return {
      totalMinutes,
      workMinutes,
      breakMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      workHours: (workMinutes / 60).toFixed(1),
      breakHours: (breakMinutes / 60).toFixed(1),
      activityCount: activitiesList.length,
      longestActivity: longest,
      topProject,
      categories,
      projects,
      dateStr: new Date().toLocaleDateString(),
    };
  };

  const exportMetrics = useMemo(
    () => getExportMetrics(filteredActivities),
    [filteredActivities],
  );

  const getRangeLabel = () => {
    if (exportPreset === "today") return "Today";
    if (exportPreset === "yesterday") return "Yesterday";
    if (exportPreset === "week") return "Last 7 Days";
    if (exportPreset === "month") return "Last 30 Days";
    if (exportPreset === "custom") {
      if (startDate && endDate) return `${startDate} → ${endDate}`;
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
      return "Custom Range";
    }
    return "All Time";
  };

  const generateCSV = () => {
    if (filteredActivities.length === 0) return;
    let csv =
      "data:text/csv;charset=utf-8,ID,Date,Start Time,End Time,Category,Deliverable / Activity,Project,Duration (Mins),Notes\n";

    filteredActivities.forEach((act) => {
      const formattedDate = new Date(act.startTime).toLocaleDateString();
      const formattedStart = new Date(act.startTime).toLocaleTimeString();
      const formattedEnd = act.endTime
        ? new Date(act.endTime).toLocaleTimeString()
        : "Active";
      const escapedTitle = `"${act.title.replace(/"/g, '""')}"`;
      const escapedNotes = `"${(act.notes || "").replace(/"/g, '""')}"`;
      csv += `${act.id},${formattedDate},${formattedStart},${formattedEnd},${act.category},${escapedTitle},${act.project},${act.duration},${escapedNotes}\n`;
    });

    const uri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", uri);
    link.setAttribute(
      "download",
      `ShiftFlow_Filtered_Timesheet_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateExcel = async () => {
    if (filteredActivities.length === 0) return;

    const metrics = getExportMetrics(filteredActivities);
    const workbook = new ExcelJS.Workbook();
    let hourlyImageId = null;

    const timelineSheet = workbook.addWorksheet("1. Detailed Timeline");
    timelineSheet.views = [{ showGridLines: true }];
    timelineSheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Date", key: "date", width: 14 },
      { header: "Start Time", key: "startTime", width: 15 },
      { header: "End Time", key: "endTime", width: 15 },
      { header: "Category / Activity Type", key: "category", width: 24 },
      { header: "Deliverable Output Description", key: "title", width: 45 },
      { header: "Target Project", key: "project", width: 22 },
      { header: "Duration (Minutes)", key: "duration", width: 18 },
      { header: "Detailed Operational Notes", key: "notes", width: 40 },
    ];

    filteredActivities.forEach((act) => {
      const actDate = new Date(act.startTime);
      const formattedDate = actDate.toLocaleDateString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const formattedStart = actDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const formattedEnd = act.endTime
        ? new Date(act.endTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Active/In Progress";
      timelineSheet.addRow({
        id: act.id,
        date: formattedDate,
        startTime: formattedStart,
        endTime: formattedEnd,
        category: act.category,
        title: act.title,
        project: act.project,
        duration: act.duration,
        notes: act.notes || "",
      });
    });

    const headerRow = timelineSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FFFFFF" },
        name: "Segoe UI",
        size: 11,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4F46E5" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    timelineSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.height = 22;
      const isEven = rowNumber % 2 === 0;
      row.eachCell((cell) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "E2E8F0" } },
          left: { style: "thin", color: { argb: "E2E8F0" } },
          bottom: { style: "thin", color: { argb: "E2E8F0" } },
          right: { style: "thin", color: { argb: "E2E8F0" } },
        };
        if (isEven) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F8FAFC" },
          };
        }
      });
    });

    const summarySheet = workbook.addWorksheet("2. Key Performance Metrics");
    summarySheet.views = [{ showGridLines: true }];
    summarySheet.getColumn(1).width = 32;
    summarySheet.getColumn(2).width = 40;

    summarySheet.addRow([
      "EXECUTIVE SHIFT WORKSPACE SUMMARY",
      "VALUE / OUTPUT DETAILS",
    ]);
    summarySheet.addRow([
      "Total Cumulative Logged Duration",
      `${metrics.totalHours} Hours`,
    ]);
    summarySheet.addRow([
      "Net Operational Focus Delivery",
      `${metrics.workHours} Hours`,
    ]);
    summarySheet.addRow([
      "Operational Break / Recharge Time",
      `${metrics.breakHours} Hours`,
    ]);
    summarySheet.addRow([
      "Timeline Segments Processed",
      `${metrics.activityCount} Activities`,
    ]);
    summarySheet.addRow([
      "Longest Standalone engaged activity",
      `"${metrics.longestActivity.title}" (${metrics.longestActivity.duration} mins)`,
    ]);
    summarySheet.addRow(["Primary Target Scope Focus", metrics.topProject]);

    const sHeader = summarySheet.getRow(1);
    sHeader.height = 28;
    sHeader.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FFFFFF" },
        size: 11,
        name: "Segoe UI",
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0F172A" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    summarySheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      row.height = 24;
      row.eachCell((cell) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.border = { bottom: { style: "thin", color: { argb: "CBD5E1" } } };
      });
      row.getCell(1).font = {
        bold: true,
        name: "Segoe UI",
        size: 10,
        color: { argb: "475569" },
      };
    });

    const chartSheet = workbook.addWorksheet("3. Category Allocations");
    chartSheet.views = [{ showGridLines: true }];
    chartSheet.getColumn(1).width = 24;
    chartSheet.getColumn(2).width = 18;
    chartSheet.getColumn(3).width = 15;
    chartSheet.getColumn(4).width = 30;

    chartSheet.addRow([
      "Operational Category",
      "Total Duration (Mins)",
      "Shift Share (%)",
      "Visual Allocation Chart Bar",
    ]);
    metrics.categories.forEach((cat) => {
      const percent = cat.percentage;
      const filledBlocks = Math.round(percent / 5);
      const barStr = "█".repeat(filledBlocks) + "░".repeat(20 - filledBlocks);
      chartSheet.addRow([cat.name, cat.minutes, `${percent}%`, `[${barStr}]`]);
    });

    const cHeader = chartSheet.getRow(1);
    cHeader.height = 28;
    cHeader.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FFFFFF" },
        name: "Segoe UI",
        size: 11,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "10B981" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    chartSheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      row.height = 22;
      row.eachCell((cell) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.border = { bottom: { style: "thin", color: { argb: "E2E8F0" } } };
      });
      row.getCell(4).font = {
        name: "Courier New",
        bold: true,
        color: { argb: "10B981" },
        size: 10,
      };
    });

    try {
      const hourlyTotals = new Array(24).fill(0);
      filteredActivities.forEach((act) => {
        const start = new Date(act.startTime);
        const end = act.endTime
          ? new Date(act.endTime)
          : new Date(start.getTime() + Number(act.duration || 0) * 60000);
        let s = start.getHours() * 60 + start.getMinutes();
        let e = end.getHours() * 60 + end.getMinutes();
        if (e <= s) e = s + (Number(act.duration || 0) || 0);
        s = Math.max(0, Math.min(24 * 60 - 1, s));
        e = Math.max(0, Math.min(24 * 60, e));
        for (let m = s; m < e; m++) {
          const h = Math.floor(m / 60);
          if (h >= 0 && h < 24) hourlyTotals[h] += 1;
        }
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1200, 360);

      const labels = Array.from(
        { length: 24 },
        (_, i) => `${i.toString().padStart(2, "0")}:00`,
      );

      const tmpChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Minutes of Active Segment per Hour",
              data: hourlyTotals.map((v) => Math.min(60, Math.round(v))),
              borderColor: "#4F46E5",
              borderWidth: 3,
              backgroundColor: "rgba(79, 70, 229, 0.12)",
              fill: true,
              tension: 0.3,
              pointBackgroundColor: "#4F46E5",
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: false,
          devicePixelRatio: 1.5,
          plugins: {
            legend: {
              display: true,
              labels: {
                font: { family: "Segoe UI", size: 11, weight: "bold" },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 60,
              title: {
                display: true,
                text: "Active Operations (Minutes)",
                font: { family: "Segoe UI", size: 10 },
              },
            },
            x: {
              title: {
                display: true,
                text: "Hour of Day (24h format)",
                font: { family: "Segoe UI", size: 10 },
              },
            },
          },
        },
      });

      const imgBase = canvas.toDataURL("image/png");
      const imageId = workbook.addImage({
        base64: imgBase.split(",")[1],
        extension: "png",
      });
      hourlyImageId = imageId;
      tmpChart.destroy();
    } catch (err) {
      console.error("Hourly line chart generation failed", err);
    }

    const daySheet = workbook.addWorksheet("4. Day Timeline");
    daySheet.views = [{ showGridLines: true }];

    const dayCols = [{ header: "Activity / Time", key: "act", width: 40 }];
    for (let i = 0; i < 48; i++) {
      const hh = Math.floor(i / 2)
        .toString()
        .padStart(2, "0");
      const mm = i % 2 === 0 ? "00" : "30";
      dayCols.push({ header: `${hh}:${mm}`, key: `t${i}`, width: 4 });
    }
    daySheet.columns = dayCols;

    const hexToARGB = (hex) => {
      if (!hex) return "FF6366F1";
      const clean = hex.replace("#", "").toUpperCase();
      return `FF${clean}`;
    };

    filteredActivities.forEach((act) => {
      const start = new Date(act.startTime);
      const end = act.endTime
        ? new Date(act.endTime)
        : new Date(start.getTime() + Number(act.duration || 0) * 60000);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      const startIndex = Math.floor(startMinutes / 30);
      const endIndex = Math.max(
        0,
        Math.min(47, Math.ceil(endMinutes / 30) - 1),
      );

      const rowVals = [];
      const formattedStart = start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const formattedEnd = end
        ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Active";
      rowVals.push(`${formattedStart} - ${formattedEnd}  ${act.title}`);
      for (let i = 0; i < 48; i++) rowVals.push("");
      const row = daySheet.addRow(rowVals);

      const colorHex =
        act.color && act.color.startsWith("#")
          ? act.color
          : act.color || "#6366f1";
      const argb = hexToARGB(colorHex);
      for (let i = startIndex; i <= endIndex; i++) {
        const cell = row.getCell(i + 2);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
      }
    });

    const legendStart = daySheet.lastRow.number + 2;
    daySheet.getCell(`A${legendStart}`).value = "Legend:";
    if (metrics.categories && metrics.categories.length > 0) {
      metrics.categories.forEach((cat, idx) => {
        const cell = daySheet.getCell(legendStart + idx, 1);
        cell.value = `${cat.name} — ${cat.percentage}% (${cat.minutes} mins)`;
        const colorCell = daySheet.getCell(legendStart + idx, 2);
        colorCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: hexToARGB(cat.color || "#6366f1") },
        };
      });
    }

    const memoSheet = workbook.addWorksheet("5. Executive Manager Summary");
    memoSheet.views = [{ showGridLines: false }];
    memoSheet.getColumn(1).width = 90;

    const titleRow = memoSheet.addRow([
      "SHIFTFLOW COMPLIANT WORKSPACE BRIEFING REPORT",
    ]);
    titleRow.getCell(1).font = {
      bold: true,
      size: 13,
      color: { argb: "4F46E5" },
      name: "Segoe UI",
    };

    memoSheet.addRow([]);

    const assessmentRow = memoSheet.addRow([
      `DATE OF ASSESSMENT: ${metrics.dateStr}`,
    ]);
    assessmentRow.getCell(1).font = { bold: true, size: 10, name: "Segoe UI" };

    const assessorRow = memoSheet.addRow([
      "ASSESSOR / WORKER: ShiftFlow Local Node Verification",
    ]);
    assessorRow.getCell(1).font = { bold: true, size: 10, name: "Segoe UI" };

    const targetRow = memoSheet.addRow([
      "TARGET DISTRIBUTION: Executive Leadership Review",
    ]);
    targetRow.getCell(1).font = { bold: true, size: 10, name: "Segoe UI" };

    memoSheet.addRow([]);

    const generalMetricsHead = memoSheet.addRow([
      "1. GENERAL ENGAGEMENT METRICS",
    ]);
    generalMetricsHead.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: "0F172A" },
      name: "Segoe UI",
    };

    memoSheet.addRow([
      `During this shift, a total cumulative duration of ${metrics.totalHours} hours was recorded locally.`,
    ]);
    memoSheet.addRow([
      `Direct workspace productivity measures represent ${metrics.workHours} hours of focused, goal-oriented deliverables.`,
    ]);
    memoSheet.addRow([
      `A resting timeline benchmark of ${metrics.breakHours} hours of planned intermission was logged.`,
    ]);

    memoSheet.addRow([]);

    const deliverablesHead = memoSheet.addRow([
      "2. DELIVERABLES & HIGH-IMPACT RECONCILIATIONS",
    ]);
    deliverablesHead.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: "0F172A" },
      name: "Segoe UI",
    };

    memoSheet.addRow([
      `• Focus Project Matrix: Primary development hours converged on "${metrics.topProject}".`,
    ]);
    memoSheet.addRow([
      `• Timeline Block Analytics: ${metrics.activityCount} micro-milestones were recorded.`,
    ]);
    memoSheet.addRow([
      `• Peak Performance Delivery: The single longest engaged session was devoted to: `,
    ]);
    memoSheet.addRow([
      `  "${metrics.longestActivity.title}" under category [${metrics.longestActivity.category}] taking ${metrics.longestActivity.duration} mins.`,
    ]);

    memoSheet.addRow([]);

    const integrityHead = memoSheet.addRow([
      "3. INTEGRITY & LOCAL-FIRST COMPLIANCE ATTESTATION",
    ]);
    integrityHead.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: "0F172A" },
      name: "Segoe UI",
    };

    memoSheet.addRow([
      "The timeline outputs logged in Sheet 1 conform to local browser validation criteria.",
    ]);
    memoSheet.addRow([
      "All records are chronologically locked with auto-calculated durations.",
    ]);

    memoSheet.addRow([]);

    const catAllocationHead = memoSheet.addRow([
      "4. CATEGORY ALLOCATIONS — Activity Category Allocation Share",
    ]);
    catAllocationHead.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: "0F172A" },
      name: "Segoe UI",
    };

    if (metrics.categories && metrics.categories.length > 0) {
      metrics.categories.forEach((cat) => {
        memoSheet.addRow([
          `• ${cat.name}: ${cat.minutes} mins (${cat.percentage}%)`,
        ]);
      });
    } else {
      memoSheet.addRow(["No category allocations recorded."]);
    }

    memoSheet.addRow([]);

    const primaryMetricsHead = memoSheet.addRow([
      "Primary Operational Metrics Summary",
    ]);
    primaryMetricsHead.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: "0F172A" },
      name: "Segoe UI",
    };

    memoSheet.addRow([
      `Total Cumulative Logged Duration: ${metrics.totalHours} Hours`,
    ]);
    memoSheet.addRow([
      `Net Engineering Focus Delivery: ${metrics.workHours} Hours`,
    ]);
    memoSheet.addRow([
      `Operational Break / Recharge Time: ${metrics.breakHours} Hours`,
    ]);
    memoSheet.addRow([
      `Timeline Segments Processed: ${metrics.activityCount} Activities`,
    ]);
    memoSheet.addRow([
      `Longest Standalone engaged activity: "${metrics.longestActivity.title}" (${metrics.longestActivity.duration} mins)`,
    ]);
    memoSheet.addRow([`Primary Target Scope Focus: ${metrics.topProject}`]);

    memoSheet.addRow([]);

    const conclusionHead = memoSheet.addRow([
      "5. EXECUTIVE SUMMARY CONCLUSION",
    ]);
    conclusionHead.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: "0F172A" },
      name: "Segoe UI",
    };

    const productivePct =
      metrics.totalMinutes > 0
        ? Math.round((metrics.workMinutes / metrics.totalMinutes) * 100)
        : 0;
    const topCat =
      metrics.categories && metrics.categories[0]
        ? metrics.categories[0]
        : null;
    const conclusions = [];
    conclusions.push(
      `During the assessed period (${metrics.dateStr}), total logged time was ${metrics.totalHours} hours, with ${metrics.workHours} hours (${productivePct}%) recorded as productive delivery.`,
    );
    if (topCat)
      conclusions.push(
        `Dominant activity category: ${topCat.name} — ${topCat.percentage}% (${topCat.minutes} mins).`,
      );
    conclusions.push(
      `Primary project focus: ${metrics.topProject}. Longest session: "${metrics.longestActivity.title}" (${metrics.longestActivity.duration} mins).`,
    );
    if (productivePct >= 70) {
      conclusions.push(
        "Recommendation: Sustain current workflows; formalize peak windows for planning and collaboration.",
      );
    } else if (productivePct >= 45) {
      conclusions.push(
        "Recommendation: Protect 1–2 uninterrupted deep-focus blocks per shift to improve delivery cadence.",
      );
    } else {
      conclusions.push(
        "Recommendation: Reduce context switching; re-balance tasks and introduce scheduled deep-work periods.",
      );
    }

    conclusions.forEach((c) => memoSheet.addRow([c]));

    memoSheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (!cell.font) cell.font = { name: "Segoe UI", size: 10 };
      });
    });

    if (hourlyImageId) {
      try {
        const hourlyChartSheet = workbook.addWorksheet(
          "6. Hourly Activity Chart",
        );
        hourlyChartSheet.views = [{ showGridLines: false }];
        hourlyChartSheet.addImage(hourlyImageId, {
          tl: { col: 1, row: 1 },
          ext: { width: 850, height: 320 },
        });
      } catch (err) {
        console.error("Failed to attach hourly image to workbook", err);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ShiftFlow_Enterprise_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const metrics = getExportMetrics(filteredActivities);

    const primaryColor = [79, 70, 229];
    const slateDark = [15, 23, 42];
    const textGray = [100, 116, 139];
    const lightSlate = [248, 250, 252];

    const drawPageDecorations = (pageNum) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text("SHIFTFLOW EXECUTIVE WORKSPACE VERIFICATION REPORT", 15, 12);
      doc.text(`PAGE ${pageNum}`, 180, 12);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 15, 195, 15);
    };

    const hexToRgb = (hex) => {
      if (!hex) return [99, 102, 241];
      const clean = hex.replace("#", "");
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return [r, g, b];
    };

    drawPageDecorations(1);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Executive Shift Assessment", 15, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(
      `Operational Assessment Date: ${metrics.dateStr}  |  Compliance Engine: Local Node Verification`,
      15,
      34,
    );

    doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 42, 54, 28, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`${metrics.totalHours} hrs`, 20, 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text("TOTAL ENGAGEMENT", 20, 62);

    doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.rect(78, 42, 54, 28, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${metrics.workHours} hrs`, 83, 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text("PRODUCTIVE DELIVERY", 83, 62);

    doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.rect(141, 42, 54, 28, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`${metrics.breakHours} hrs`, 146, 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text("REST / INTERMISSION", 146, 62);

    let y = 78;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(
      "3. Category Allocations — Activity Category Allocation Share",
      15,
      y,
    );
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);

    const barMaxWidth = 120;
    const barX = 20;
    (metrics.categories || []).slice(0, 8).forEach((cat, idx) => {
      const rowY = y + idx * 10 + 6;
      doc.setFontSize(9);
      doc.setTextColor(34, 34, 34);
      doc.text(
        `${cat.name} — ${cat.percentage}% (${cat.minutes} mins)`,
        barX,
        rowY,
      );
      const rgb = hexToRgb(cat.color || "#6366f1");
      const w = Math.max(2, Math.round((cat.percentage / 100) * barMaxWidth));
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(barX + 90, rowY - 4, w, 6, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(barX + 90, rowY - 4, barMaxWidth, 6, "S");
    });

    y += Math.min(8, (metrics.categories || []).length) * 10 + 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text("Primary Operational Metrics Summary", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const metricsLines = [
      `Total Engagement: ${metrics.totalHours} hrs`,
      `Productive Delivery: ${metrics.workHours} hrs`,
      `Rest / Intermission: ${metrics.breakHours} hrs`,
      `Timeline Entries: ${metrics.activityCount}`,
      `Top Project Focus: ${metrics.topProject}`,
      `Longest Session: "${metrics.longestActivity.title}" (${metrics.longestActivity.duration} mins)`,
    ];
    metricsLines.forEach((line, i) => {
      doc.text(line, 20, y + i * 6);
    });

    y += metricsLines.length * 6 + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text("4. Executive Manager Summary", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);

    const topCat =
      metrics.categories && metrics.categories[0]
        ? metrics.categories[0]
        : null;
    const productivePct =
      metrics.totalMinutes > 0
        ? Math.round((metrics.workMinutes / metrics.totalMinutes) * 100)
        : 0;
    const conclusionParts = [];
    conclusionParts.push(
      `During the assessed period (${metrics.dateStr}), the workspace recorded ${metrics.totalHours} total hours, of which ${metrics.workHours} hours (${productivePct}%) were classified as productive delivery.`,
    );
    if (topCat) {
      conclusionParts.push(
        `The dominant activity category was "${topCat.name}" representing ${topCat.percentage}% of time (${topCat.minutes} mins).`,
      );
    }
    conclusionParts.push(
      `The primary project focus was "${metrics.topProject}", and the single longest session was "${metrics.longestActivity.title}" (${metrics.longestActivity.duration} mins).`,
    );

    if (productivePct >= 70) {
      conclusionParts.push(
        "Recommend: Sustain current workflows; consider formalizing peak windows for collaborative planning.",
      );
    } else if (productivePct >= 45) {
      conclusionParts.push(
        "Recommend: Increase focus on priority deliverables by protecting 1-2 uninterrupted blocks per shift.",
      );
    } else {
      conclusionParts.push(
        "Recommend: Review task distribution and reduce context switching; schedule dedicated deep-focus blocks.",
      );
    }

    const conclusionText = conclusionParts.join(" ");
    const split = doc.splitTextToSize(conclusionText, 170);
    doc.text(split, 15, y);

    doc.save(
      `ShiftFlow_Executive_Workspace_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

  const createLocalBackup = () => {
    const backupData = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        workspace: {
          activities,
          categories: [],
          favorites: [],
          templates: [],
          settings: [],
        },
      },
      null,
      2,
    );
    const blob = new Blob([backupData], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ShiftFlow_Local_Ledger_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const restoreLocalBackup = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          await dbInstance.clear("activities");
          for (const act of parsed) {
            delete act.id;
            await dbInstance.put("activities", act);
          }
          const updatedLogs = await dbInstance.getAll("activities");
          setActivities(updatedLogs);
        }
      } catch (err) {
        console.error("Restore failure: ", err);
      }
    };
    fileReader.readAsText(e.target.files[0]);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Executive Portability
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Generate clean reports or secure local data backups completely
          client-side.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm space-y-4 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <DynamicIcon name="calendar" className="w-4 h-4 text-brand-500" />
              <span>Configure Export Date Range</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a preset range or configure custom boundaries. Exports will
              respect this range.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start md:self-auto">
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
                onClick={() => setExportPreset(preset.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  exportPreset === preset.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {exportPreset === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none text-slate-900 dark:text-slate-200 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none text-slate-900 dark:text-slate-200 font-mono"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Matching segments to export:
            </span>
            <strong className="font-mono text-brand-600 dark:text-brand-400 text-sm">
              {filteredActivities.length}
            </strong>
            <span className="rounded-full bg-slate-100 dark:bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {getRangeLabel()}
            </span>
          </div>
          {filteredActivities.length === 0 && (
            <span className="text-red-500 dark:text-red-400 font-semibold text-[11px]">
              No logs found in this date range.
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Logged hours
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
              {exportMetrics.totalHours}h
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Productive delivery
            </p>
            <p className="mt-1 text-lg font-bold text-brand-600 dark:text-brand-400">
              {exportMetrics.workHours}h
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Top project
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {exportMetrics.topProject}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Longest session
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {exportMetrics.longestActivity.title === "None"
                ? "No entries"
                : `${exportMetrics.longestActivity.title} (${exportMetrics.longestActivity.duration}m)`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        <div className="card-lift p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between hover:border-brand-500/40 transition-all">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
              Export Structured Excel Sheet
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              Sleek multi-sheet workbook including metrics summaries, timeline
              raw grids with Dates, category allocation share bars, and a
              high-resolution hourly line chart.
            </p>
          </div>
          <button
            onClick={generateExcel}
            disabled={filteredActivities.length === 0}
            className={`p-3 rounded-xl border transition-all ${
              filteredActivities.length === 0
                ? "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                : "bg-slate-50 dark:bg-slate-900/60 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white border-slate-200 dark:border-slate-800"
            }`}
          >
            <DynamicIcon name="download" className="w-5 h-5" />
          </button>
        </div>

        <div className="card-lift p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between hover:border-brand-500/40 transition-all">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
              Export Executive PDF Dossier
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Stunning, multi-page vector PDF with KPI widgets, category share
              bar graphics, and page-wrapped timeline trees.
            </p>
          </div>
          <button
            onClick={generatePDF}
            disabled={filteredActivities.length === 0}
            className={`p-3 rounded-xl border transition-all ${
              filteredActivities.length === 0
                ? "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                : "bg-slate-50 dark:bg-slate-900/60 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white border-slate-200 dark:border-slate-800"
            }`}
          >
            <DynamicIcon name="file-text" className="w-5 h-5" />
          </button>
        </div>

        <div className="card-lift p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between hover:border-brand-500/40 transition-all">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
              Export Raw CSV Log
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Generic plain-text schema optimized for universal compatibility.
            </p>
          </div>
          <button
            onClick={generateCSV}
            disabled={filteredActivities.length === 0}
            className={`p-3 rounded-xl border transition-all ${
              filteredActivities.length === 0
                ? "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                : "bg-slate-50 dark:bg-slate-900/60 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white border-slate-200 dark:border-slate-800"
            }`}
          >
            <DynamicIcon name="table" className="w-5 h-5" />
          </button>
        </div>

        <div className="card-lift p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm flex items-center justify-between hover:border-brand-500/40 transition-all">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
              Backup IndexedDB Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete system snapshotted down into portable JSON arrays.
            </p>
          </div>
          <button
            onClick={createLocalBackup}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white border border-slate-200 dark:border-slate-800 transition-all"
          >
            <DynamicIcon name="archive" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm col-span-1 md:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
            Restore/Import System Backups
          </h3>
          <p className="text-xs text-slate-500">
            Restore dynamic snapshots back into IndexedDB. Note: This clears
            previous logs.
          </p>
          <label className="inline-block px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer transition-all">
            <span>Choose Snapshot JSON file</span>
            <input
              type="file"
              accept=".json"
              onChange={restoreLocalBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
