import React from 'react';

interface GridJargonCheatSheetProps {
  onClose: () => void;
  isLight: boolean;
}

export const GridJargonCheatSheet: React.FC<GridJargonCheatSheetProps> = ({ onClose, isLight }) => {
  return (
    <div
      className={`p-2.5 rounded-xl border text-xs leading-relaxed space-y-2 shrink-0 ${
        isLight ? 'bg-sky-50/90 border-sky-200 text-slate-800' : 'bg-slate-900/90 border-slate-700 text-slate-200'
      }`}
    >
      <div className="font-bold text-xs flex items-center justify-between border-b pb-1 border-slate-200/60 dark:border-slate-800">
        <span className="flex items-center gap-1.5">
          <span>⚡</span>
          <span>TNEB & Disaster Terminology Cheat Sheet</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xs px-1"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
          <strong className="text-rose-700 dark:text-rose-400 font-bold block">P1 NON-CUT (Statutory Lifeline):</strong>
          <span className="opacity-90">Essential service (water pumping, hospital). Exempt from rolling load-shedding during power crises.</span>
        </div>
        <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
          <strong className="text-purple-700 dark:text-purple-400 font-bold block">ESF 15: 6h SLA (Disaster Mandate):</strong>
          <span className="opacity-90">Emergency Support Function 15 (Energy): Under TNSDMA rules, power must be restored within 6 hours.</span>
        </div>
        <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
          <strong className="text-sky-700 dark:text-cyan-400 font-bold block">RMU (Ring Main Unit):</strong>
          <span className="opacity-90">Automated underground switches that allow rapid power re-routing through backup loop circuits without digging.</span>
        </div>
        <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
          <strong className="text-amber-700 dark:text-amber-400 font-bold block">Stage 3 Restoration:</strong>
          <span className="opacity-90">TANGEDCO storm protocol: Restored right after grid substations, ahead of commercial and domestic lines.</span>
        </div>
      </div>
    </div>
  );
};
