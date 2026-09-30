import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Navigation2 } from 'lucide-react';
import { HAZARD_YEARS, RAIN_LEGEND_BREAKS, RAIN_SCALE_MAX_MM, RAIN_STOPS, rainFill, type HazardYears } from './rainScale';
import { compassName } from '../../services/scenarioGrid';

export interface HoverCell {
  label: string;
  mm24: number;
  className: string;
  substations: number;
}

interface SimulationMapPanelProps {
  isLight: boolean;
  stepLabel: string;
  showRain: boolean;
  setShowRain: (v: boolean) => void;
  showFlood2015: boolean;
  setShowFlood2015: (v: boolean) => void;
  showHazard: boolean;
  setShowHazard: (v: boolean) => void;
  hazardYears: HazardYears;
  setHazardYears: (v: HazardYears) => void;
  hover: HoverCell | null;
  showGauges: boolean;
  setShowGauges: (v: boolean) => void;
  /** The gauge window shown at this step and how many gauges IMD lists in it; null window = none had ended yet. */
  gaugeInfo: { label: string | null; listed: number } | null;
  windSpeedKmh: number | null;
  windFromDeg: number | null;
}

const rampGradient = () => {
  const stops = RAIN_STOPS.map(s => {
    const f = rainFill(s.mm);
    return `${f.color}${Math.round((Math.max(f.opacity, 0.1) / RAIN_STOPS[RAIN_STOPS.length - 1].opacity) * 255).toString(16).padStart(2, '0')} ${(s.mm / RAIN_SCALE_MAX_MM) * 100}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
};

/**
 * Legend and switches for the storm layers shown while a hindcast scenario plays: 24-hour rain by ~11 km cell,
 * city-wide wind, and the fixed official flood maps.
 */
export const SimulationMapPanel: React.FC<SimulationMapPanelProps> = ({
  isLight,
  stepLabel,
  showRain,
  setShowRain,
  showFlood2015,
  setShowFlood2015,
  showHazard,
  setShowHazard,
  hazardYears,
  setHazardYears,
  hover,
  showGauges,
  setShowGauges,
  gaugeInfo,
  windSpeedKmh,
  windFromDeg,
}) => {
  const [open, setOpen] = useState(true);
  const [showNote, setShowNote] = useState(false);

  const card = isLight
    ? 'bg-white/95 border-slate-300/90 text-slate-800 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10'
    : 'bg-slate-900/95 border-slate-700/80 text-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.7)] ring-1 ring-white/10';
  const muted = isLight ? 'text-slate-600' : 'text-slate-400';
  const row = 'flex items-center gap-2 cursor-pointer select-none';
  const iconBtn = `p-0.5 rounded ${muted} hover:opacity-80`;

  return (
    <div
      className={`pointer-events-auto shrink-0 w-full rounded-xl border p-2.5 text-[11px] space-y-2 backdrop-blur-md ${card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-xs">
          Storm on the map <span className={`font-mono font-semibold ${muted}`}>· {stepLabel}</span>
        </span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => setShowNote(v => !v)} aria-expanded={showNote} aria-label="About these layers" className={iconBtn}>
            <Info className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? 'Minimize' : 'Expand'} className={iconBtn}>
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {showNote && (
        <p className={`text-[10px] leading-snug ${muted}`}>
          Rain is a NASA IMERG satellite estimate averaged over cells of about 11 km, so every substation in a cell gets that cell&apos;s
          value. Class names and limits are IMD&apos;s, applied here to a rolling 24-hour total. Wind is the ERA5-Land area mean (no data over
          coastal cells), smoothed and not gusts: IMD&apos;s Nungambakkam and Meenambakkam weather stations recorded 56 to 68 km/h on 4
          December, with gusts of 75 to 90 km/h. IMD&apos;s rain gauges also read higher than these cells: at the 7, 16 and 10 stations we
          could place, the satellite cell held about a third (3 Dec), three-quarters (4 Dec) and three-fifths (5 Dec) of the gauge total for
          the 24 hours to 08:30 IST (medians 30 vs 80 mm, 147 vs 195 mm, 115 vs 170 mm). The flood maps are fixed official layers,
          not this hour.
        </p>
      )}

      {open && (
        <>
          <div className="space-y-1">
            <label className={row}>
              <input type="checkbox" checked={showRain} onChange={e => setShowRain(e.target.checked)} className="accent-blue-600" />
              <span className="font-semibold">Rain, last 24 hours <span className={`font-normal ${muted}`}>(satellite estimate)</span></span>
            </label>
            <div className="pl-5">
              <div className="h-2 rounded-full border border-slate-400/40" style={{ background: rampGradient() }} aria-hidden />
              <div className="relative h-6" aria-hidden>
                {RAIN_LEGEND_BREAKS.map(b => (
                  <span
                    key={b.name}
                    className={`absolute top-0 text-[9px] leading-tight -translate-x-1/2 text-center whitespace-nowrap ${muted}`}
                    style={{ left: `${Math.min(92, (b.minMm / RAIN_SCALE_MAX_MM) * 100)}%` }}
                  >
                    <span className="block">|</span>
                    {b.name === 'Extremely heavy' ? 'Extreme' : b.name}
                  </span>
                ))}
              </div>
              <div className={`min-h-[1.5rem] text-[10px] leading-snug ${hover ? '' : muted}`}>
                {hover ? (
                  <>
                    <span className="font-mono">{hover.label}</span>: <strong>{hover.mm24.toFixed(0)} mm</strong> · {hover.className} ·{' '}
                    {hover.substations} substation{hover.substations === 1 ? '' : 's'}
                  </>
                ) : (
                  'Point at a cell to read it.'
                )}
              </div>
            </div>
          </div>

          <div className={`pt-1.5 border-t space-y-0.5 ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <label className={row}>
              <input type="checkbox" checked={showGauges} onChange={e => setShowGauges(e.target.checked)} className="accent-slate-700" />
              <span className="inline-block w-2.5 h-2.5 rounded-[2px] border border-slate-700 bg-blue-500" aria-hidden />
              <span className="font-semibold">IMD rain gauges</span>
            </label>
            <p className={`pl-5 text-[10px] leading-snug ${muted}`}>
              {gaugeInfo && gaugeInfo.label
                ? `${gaugeInfo.label}: ${gaugeInfo.listed} gauges listed by IMD (same colours as the rain layer). Point at one for its reading and the satellite cell.`
                : 'No gauge window had ended yet at this step.'}
            </p>
          </div>

          <div className={`flex items-center gap-2 pt-1.5 border-t ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <span className="font-semibold">Wind</span>
            {windSpeedKmh !== null && windFromDeg !== null ? (
              <>
                <Navigation2
                  className="w-3.5 h-3.5 text-sky-600 shrink-0"
                  style={{ transform: `rotate(${(windFromDeg + 180) % 360}deg)` }}
                  aria-hidden
                />
                <span className="font-mono">
                  {windSpeedKmh.toFixed(0)} km/h from {compassName(windFromDeg)}
                </span>
                <span className={muted}>city mean</span>
              </>
            ) : windSpeedKmh !== null ? (
              <span className="font-mono">
                {windSpeedKmh.toFixed(0)} km/h <span className={muted}>city mean</span>
              </span>
            ) : (
              <span className={muted}>no reading</span>
            )}
          </div>

          <div className={`pt-1.5 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <div className={`text-[10px] uppercase tracking-wider font-semibold ${muted}`}>Official flood maps (fixed)</div>
            <label className={row}>
              <input type="checkbox" checked={showFlood2015} onChange={e => setShowFlood2015(e.target.checked)} className="accent-cyan-600" />
              <span>2015 flood extent (past event)</span>
            </label>
            <div className="flex items-center gap-2">
              <label className={row}>
                <input type="checkbox" checked={showHazard} onChange={e => setShowHazard(e.target.checked)} className="accent-orange-600" />
                <span>Flood hazard map</span>
              </label>
              <select
                value={hazardYears}
                onChange={e => setHazardYears(Number(e.target.value) as HazardYears)}
                aria-label="Return period of the flood hazard map"
                className={`ml-auto rounded border px-1 py-0.5 text-[10px] ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-600 text-slate-100'
                }`}
              >
                {HAZARD_YEARS.map(y => (
                  <option key={y} value={y}>
                    {y}-year
                  </option>
                ))}
              </select>
            </div>
            {showHazard && (
              <div className={`flex items-center gap-2 pl-5 text-[10px] ${muted}`}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#facc15' }} /> Low
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#f97316' }} /> Moderate
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#dc2626' }} /> High
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
