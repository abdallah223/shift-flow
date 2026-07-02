import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import DynamicIcon from "../icons/DynamicIcon.jsx";

export default function ManualAddModal() {
  const { showManualAdd, setShowManualAdd, categories, addManualActivity } = useApp();

  const formatDTL = (d) => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(d - tzoffset).toISOString().slice(0, 16);
  };

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [startDt, setStartDt] = useState("");
  const [endDt, setEndDt] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0].name);
    }
    if (showManualAdd) {
      const now = new Date();
      const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setStartDt(formatDTL(anHourAgo));
      setEndDt(formatDTL(now));
      setErrorMsg("");
    }
  }, [categories, showManualAdd]);

  if (!showManualAdd) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const result = await addManualActivity(title, category, project, notes, startDt, endDt);

    if (result.success) {
      setTitle("");
      setProject("");
      setNotes("");
      setShowManualAdd(false);
    } else {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col space-y-4 animate-scaleIn">
        <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
            <DynamicIcon name="clock" className="text-emerald-500 dark:text-emerald-400" />
            <span>Manual Activity Entry</span>
          </h3>
          <button
            onClick={() => setShowManualAdd(false)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
          >
            <DynamicIcon name="x" className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Forgot to start the tracker? Add a retroactive entry here. The system will strictly verify to ensure
          times do not overlap with existing logs.
        </p>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-semibold flex items-start space-x-2">
            <DynamicIcon name="x" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Activity Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Conducted QA review on Team A"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg p-2.5 text-slate-805 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg p-2.5 text-slate-850 dark:text-slate-200 focus:outline-none"
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

          <div className="grid grid-cols-2 gap-3 border-y border-slate-150 dark:border-slate-800/60 py-3">
            <div className="space-y-1.5">
              <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startDt}
                onChange={(e) => setStartDt(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-2 text-slate-805 dark:text-slate-200 focus:outline-none font-mono text-[10px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                End Time
              </label>
              <input
                type="datetime-local"
                required
                value={endDt}
                onChange={(e) => setEndDt(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-2 text-slate-805 dark:text-slate-200 focus:outline-none font-mono text-[10px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
            >
              <DynamicIcon name="check-circle" className="w-4 h-4" />
              <span>Save Retroactive Log</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
