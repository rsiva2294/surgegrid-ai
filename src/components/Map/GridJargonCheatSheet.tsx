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
          <strong className="text-rose-700 dark:text-rose-400 font-bold block">P1 lifeline (SurgeGrid class):</strong>
          <span className="opacity-90">Hospital or water feeder, identified from the feeder name. The national plan lists drainage pumping, drinking water plants and hospitals for priority restoration (MoP DMP 2021, p. 239).</span>
        </div>
        <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
          <strong className="text-purple-700 dark:text-purple-400 font-bold block">Operator decision:</strong>
          <span className="opacity-90">The plans say supply may be switched off “if required” (MoP DMP 2021, p. 246). They give no wind or flood level that forces it.</span>
        </div>
        <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
          <strong className="text-sky-700 dark:text-cyan-400 font-bold block">RMU (Ring Main Unit):</strong>
          <span className="opacity-90">Switchgear on an 11 kV ring. It lets a faulty section be isolated while the rest of the ring stays supplied.</span>
        </div>
        <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
          <strong className="text-amber-700 dark:text-amber-400 font-bold block">IMD cyclone classes:</strong>
          <span className="opacity-90">Severe 88-117 km/h, Very Severe 118-167, Extra Severe 168-221, Super 222 and above (MoP DMP 2021, Table-4).</span>
        </div>
      </div>
    </div>
  );
};
