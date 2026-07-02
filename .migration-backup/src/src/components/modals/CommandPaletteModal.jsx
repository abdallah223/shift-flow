import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import DynamicIcon from "../icons/DynamicIcon.jsx";

export default function CommandPaletteModal() {
  const { showCommandPalette, setShowCommandPalette, startNewActivity, categories } = useApp();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (showCommandPalette && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCommandPalette]);

  if (!showCommandPalette) return null;

  const matches = categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (categoryName) => {
    startNewActivity(`Working on deliverables`, categoryName);
    setShowCommandPalette(false);
    setQuery("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={() => setShowCommandPalette(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <DynamicIcon name="search" className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type an operational category name to instantly log and transition tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-xs"
          />
          <button
            onClick={() => setShowCommandPalette(false)}
            className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 uppercase font-mono tracking-widest font-bold"
          >
            Esc
          </button>
        </div>

        <div className="p-2 max-h-64 overflow-y-auto">
          {matches.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.name)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-left transition-all duration-150 text-xs text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="font-semibold">Start {cat.name} activity</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Instant Trigger</span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic p-4 text-center">
              No categories matching criteria.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
