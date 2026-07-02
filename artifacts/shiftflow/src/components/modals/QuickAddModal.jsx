import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import DynamicIcon from "../icons/DynamicIcon.jsx";

export default function QuickAddModal() {
  const { showQuickAdd, setShowQuickAdd, categories, startNewActivity, toggleFavorite } = useApp();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (categories.length > 0) {
      setCategory(categories[0].name);
    }
  }, [categories]);

  if (!showQuickAdd) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    startNewActivity(title, category, project, notes);

    if (isFav) {
      toggleFavorite({ title, category, project, notes });
    }

    setTitle("");
    setProject("");
    setNotes("");
    setIsFav(false);
    setShowQuickAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col space-y-4 animate-scaleIn">
        <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
            <DynamicIcon name="plus" className="text-brand-500 dark:text-brand-400" />
            <span>Live Ops Tracking</span>
          </h3>
          <button
            onClick={() => setShowQuickAdd(false)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
          >
            <DynamicIcon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              What deliverable are you tracking?
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Conducted QA review on Team A"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg p-3 text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Operational Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Project/Team Scope
              </label>
              <input
                type="text"
                placeholder="e.g. Support Team Alpha"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5 text-slate-805 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Details / Milestone notes (Optional)
            </label>
            <textarea
              placeholder="Brief highlights of this activity..."
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
              <input
                type="checkbox"
                checked={isFav}
                onChange={(e) => setIsFav(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-brand-500 focus:ring-0"
              />
              <span>Pin to Dashboard Favorites</span>
            </label>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition-all"
            >
              Start Tracking Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
