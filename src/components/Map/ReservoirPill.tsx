import React, { useEffect, useRef, useState } from 'react';
import type { ReservoirData } from '../../services/reservoirService';

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

const fmt = (n: number | null, digits = 0) =>
  n === null ? '–' : n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface PillProps {
  data: ReservoirData;
  isLight: boolean;
}

/** App-bar pill beside the weather pill (LIVE only): combined storage of the six CMWSSB supply reservoirs, with a per-reservoir dropdown. */
export const ReservoirPill: React.FC<PillProps> = ({ data, isLight }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all select-none ${
          isLight
            ? 'bg-slate-50/95 hover:bg-white border-slate-200/90 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/[0.03]'
            : 'bg-slate-900/85 hover:bg-slate-900 border-slate-700/80 text-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ring-1 ring-white/[0.05]'
        }`}
        title={`Chennai supply reservoirs, combined storage as on ${fmtDate(data.asOn)} (CMWSSB). Click for each reservoir.`}
      >
        <span aria-hidden="true">💧</span>
        <span className="hidden md:inline">Reservoirs</span>
        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold ${
          isLight ? 'bg-sky-100 text-sky-900' : 'bg-sky-500/20 text-sky-200 border border-sky-500/30'
        }`}>
          {fmt(data.total.storagePct, 1)}%
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[min(34rem,calc(100vw-1.5rem))]">
          <ReservoirDetail data={data} isLight={isLight} />
        </div>
      )}
    </div>
  );
};

interface DetailProps {
  data: ReservoirData;
  isLight: boolean;
}

/** Per-reservoir figures exactly as CMWSSB publishes them, with the source and date. */
export const ReservoirDetail: React.FC<DetailProps> = ({ data, isLight }) => {
  const muted = isLight ? 'text-slate-600' : 'text-slate-400';
  const line = isLight ? 'border-slate-200' : 'border-slate-700/70';
  return (
    <div className={`pointer-events-auto rounded-xl border p-2.5 text-xs max-w-full overflow-x-auto ${
      isLight
        ? 'bg-white/98 border-slate-300/90 text-slate-800 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/10 backdrop-blur-md'
        : 'bg-slate-900/95 border-slate-700/80 text-white shadow-[0_8px_30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
    }`}>
      <div className="font-bold mb-1.5">Chennai supply reservoirs, as on {fmtDate(data.asOn)}</div>
      <table className="w-full border-collapse">
        <thead>
          <tr className={`text-[11px] ${muted}`}>
            <th className="text-left font-semibold pr-3 pb-1">Reservoir</th>
            <th className="text-right font-semibold pr-3 pb-1">Storage</th>
            <th className="text-right font-semibold pr-3 pb-1">mcft / capacity</th>
            <th className="text-right font-semibold pr-3 pb-1">In / out (cusecs)</th>
            <th className="text-right font-semibold pb-1">Same day last year</th>
          </tr>
        </thead>
        <tbody>
          {data.reservoirs.map(r => (
            <tr key={r.name} className={`border-t ${line}`}>
              <td className="py-0.5 pr-3">{titleCase(r.name)}</td>
              <td className="py-0.5 pr-3 text-right font-mono">{fmt(r.storagePct, 1)}%</td>
              <td className="py-0.5 pr-3 text-right font-mono">{fmt(r.storageMcft)} / {fmt(r.capacityMcft)}</td>
              <td className="py-0.5 pr-3 text-right font-mono">{fmt(r.inflowCusecs)} / {fmt(r.outflowCusecs)}</td>
              <td className="py-0.5 text-right font-mono">{fmt(r.lastYearStorageMcft)} mcft</td>
            </tr>
          ))}
          <tr className={`border-t ${line} font-bold`}>
            <td className="py-0.5 pr-3">Total</td>
            <td className="py-0.5 pr-3 text-right font-mono">{fmt(data.total.storagePct, 1)}%</td>
            <td className="py-0.5 pr-3 text-right font-mono">{fmt(data.total.storageMcft)} / {fmt(data.total.capacityMcft)}</td>
            <td className="py-0.5 pr-3 text-right font-mono">{fmt(data.total.inflowCusecs)} / {fmt(data.total.outflowCusecs)}</td>
            <td className="py-0.5 text-right font-mono">{fmt(data.total.lastYearStorageMcft)} mcft</td>
          </tr>
        </tbody>
      </table>
      <div className={`mt-1.5 text-[11px] ${muted}`}>
        Source:{' '}
        <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {data.source}
        </a>
        . Figures as published; "–" means none reported.
      </div>
    </div>
  );
};
