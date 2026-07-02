import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { dbInstance } from "../db/database.js";
import DynamicIcon from "../components/icons/DynamicIcon.jsx";

export default function SettingsView() {
  const { categories, setCategories, activities, activeActivity, workHoursGoal, updateWorkHoursGoal } = useApp();
  const [newCatName, setNewCatName] = useState("");

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      window.alert(`A category named "${trimmed}" already exists.`);
      return;
    }

    const newCat = {
      name: trimmed,
      color: "#6366f1",
      bg: "rgba(99, 102, 241, 0.15)",
      icon: "tag",
    };

    const savedId = await dbInstance.put("categories", newCat);
    newCat.id = savedId;
    setCategories((prev) => [...prev, newCat]);
    setNewCatName("");
  };

  const handleDeleteCategory = async (cat) => {
    if (categories.length <= 1) {
      window.alert("You need at least one operational category.");
      return;
    }
    if (activeActivity?.category === cat.name) {
      window.alert(
        "This category is in use by the activity you're currently tracking. Stop it before deleting.",
      );
      return;
    }
    const inUseCount = activities.filter((a) => a.category === cat.name).length;
    const confirmMessage = inUseCount > 0
      ? `"${cat.name}" is used by ${inUseCount} logged ${inUseCount === 1 ? "activity" : "activities"}. Those entries will keep the label, but you won't be able to pick it for new ones. Delete anyway?`
      : `Delete the "${cat.name}" category?`;
    if (!window.confirm(confirmMessage)) return;

    await dbInstance.delete("categories", cat.id);
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Workspace Controls</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage categories, work objectives, keyboard bindings, and local DB parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">Operational Categories</h3>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Add custom operational category..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs text-white font-semibold transition-all"
            >
              Add
            </button>
          </form>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900/60 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <DynamicIcon name="trash" className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-900 shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">Shift parameters</h3>

          <div className="space-y-1.5">
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Daily working objective hours
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={workHoursGoal}
              onChange={(e) => updateWorkHoursGoal(e.target.value)}
              onBlur={(e) => updateWorkHoursGoal(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 text-xs focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Keyboard shortcuts bindings
            </h4>
            <div className="space-y-2">
              {[
                { key: "N", desc: "Launch Quick Add activity drawer" },
                { key: "Space", desc: "Play/Pause current active work timer" },
                { key: "E", desc: "Jump to Data Portability / Export" },
                { key: "O", desc: "Jump to Operations Reports" },
                { key: "Esc", desc: "Close any open dialog" },
                { key: "Ctrl + K", desc: "Toggle visual command palette search" },
              ].map((sh, index) => (
                <div key={index} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">{sh.desc}</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono rounded text-[10px] uppercase">
                    {sh.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
