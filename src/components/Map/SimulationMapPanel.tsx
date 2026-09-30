import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Navigation2 } from 'lucide-react';
import { HAZARD_YEARS, type HazardYears } from './rainScale';
import { compassName } from '../../services/scenarioGrid';
import { GRADE_COLOR } from '../../services/bestTrack';
import { TRACK_GRADE_NAMES, type TrackGrade } from '../../data/imdBulletins';

interface SimulationMapPanelProps {
  isLight: boolean;
  stepLabel: string;
  showFlood2015: boolean;
  setShowFlood2015: (v: boolean) => void;
  showHazard: boolean;
  setShowHazard: (v: boolean) => void;
  hazardYears: HazardYears;
  setHazardYears: (v: HazardYears) => void;
  showGauges: boolean;
  setShowGauges: (v: boolean) => void;
  /** The gauge window shown at this step and how many gauges IMD lists in it; null window = none had ended yet. */
  gaugeInfo: { label: string | null; listed: number } | null;
  windSpeedKmh: number | null;
  windFromDeg: number | null;
  /** IMD's observed track: null when the file is not loaded. */
  track: {
    show: boolean;
    setShow: (v: boolean) => void;
    onFit: () => void;
    /** Where the centre is at the step, in words (grade, wind, distance to Chennai); null outside the track's dates. */
    now: string | null;
  } | null;
  /** The time the map is showing (moves while the hours glide between steps). */
  clockLabel: string | null;
  /** Play the hours between steps (a switch; off by default when the device asks for reduced motion). */
  animate: { on: boolean; set: (v: boolean) => void; reducedMotion: boolean };
}

/**
 * Legend and switches for the layers shown while a hindcast plays: the fixed official flood maps (where water stood before,
 * not Michaung), what the substation colours mean, IMD's track and rain gauges, and the city-wide wind. The satellite rain
 * cells are not drawn: at ~11 km they covered whole neighbourhoods in one colour; rain numbers are in the site card and list.
 */
export const SimulationMapPanel: React.FC<SimulationMapPanelProps> = ({
  isLight,
  stepLabel,
  showFlood2015,
  setShowFlood2015,
  showHazard,
  setShowHazard,
  hazardYears,
  setHazardYears,
  showGauges,
  setShowGauges,
  gaugeInfo,
  windSpeedKmh,
  windFromDeg,
  track,
  clockLabel,
  animate,
}) => {
  // Folded by default; the colour key for the substations stays visible when folded.
  const [open, setOpen] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const card = isLight
    ? 'bg-white/95 border-slate-300/90 text-slate-800 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10'
    : 'bg-slate-900/95 border-slate-700/80 text-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.7)] ring-1 ring-white/10';
  const muted = isLight ? 'text-slate-600' : 'text-slate-400';
  const row = 'flex items-center gap-2 cursor-pointer select-none';
  const iconBtn = `p-0.5 rounded ${muted} hover:opacity-80`;

  return (
    <div
      className={`pointer-events-auto shrink-0 w-full rounded-xl border p-3 text-[13px] space-y-2 backdrop-blur-md ${card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm">
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

      {clockLabel && (
        <div className="flex items-center justify-between gap-2">
          <span className={`font-mono text-xs ${muted}`}>
            Map time: <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{clockLabel}</span>
          </span>
          <label
            className="inline-flex items-center gap-1 text-xs cursor-pointer select-none"
            title={animate.reducedMotion ? 'Your device asks for reduced motion, so this starts off. Tick it to play the hours between steps.' : 'Play the real hours between steps'}
          >
            <input type="checkbox" checked={animate.on} onChange={e => animate.set(e.target.checked)} className="accent-blue-600" />
            Animate between steps
          </label>
        </div>
      )}

      {showNote && (
        <p className={`text-xs leading-snug ${muted}`}>
          The glow around a substation uses the site card&apos;s order: rain here (the higher of the NASA IMERG satellite 24-hour value over an
          ~11 km cell and the nearest IMD gauge reading) at IMD&apos;s Heavy class or worse, with a flood fact from the official maps or the
          GCC 2015 register. Wind is the ERA5-Land area mean (no data over
          coastal cells), smoothed and not gusts: IMD&apos;s Nungambakkam and Meenambakkam weather stations recorded 56 to 68 km/h on 4
          December, with gusts of 75 to 90 km/h. IMD&apos;s rain gauges also read higher than these cells: at the 7, 16 and 10 stations we
          could place, the satellite cell held about a third (3 Dec), three-quarters (4 Dec) and three-fifths (5 Dec) of the gauge total for
          the 24 hours to 08:30 IST (medians 30 vs 80 mm, 147 vs 195 mm, 115 vs 170 mm). The flood maps are fixed official layers,
          not this hour.
        </p>
      )}

      <div className="space-y-1">
        <div className={`text-xs uppercase tracking-wider font-semibold ${muted}`}>Glow around a substation (our order)</div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-red-500/30 ring-2 ring-red-600/70" /> Check first
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500/25 ring-[1.5px] ring-orange-600/60" /> Check next
          </span>
        </div>
      </div>

      {open && (
        <>
          <div className={`pt-1.5 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <div className={`text-xs uppercase tracking-wider font-semibold ${muted}`}>Where water stood before (not a Michaung map)</div>
            <label className={row}>
              <input type="checkbox" checked={showFlood2015} onChange={e => setShowFlood2015(e.target.checked)} className="accent-cyan-600" />
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(8, 145, 178, 0.3)' }} />
              <span>2015 flood extent <span className={muted}>(NRSC satellite map)</span></span>
            </label>
            <div className="flex items-center gap-2">
              <label className={row}>
                <input type="checkbox" checked={showHazard} onChange={e => setShowHazard(e.target.checked)} className="accent-orange-600" />
                <span>Flood hazard map <span className={muted}>(GCC)</span></span>
              </label>
              <select
                value={hazardYears}
                onChange={e => setHazardYears(Number(e.target.value) as HazardYears)}
                aria-label="Return period of the flood hazard map"
                className={`ml-auto rounded border px-1 py-0.5 text-xs ${
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
              <div className={`flex items-center gap-2 pl-5 text-xs ${muted}`}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#facc15' }} /> Low
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#f97316' }} /> Moderate
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#dc2626' }} /> High
              </div>
            )}
            <p className={`text-xs leading-snug ${muted}`}>
              No map shows where water stood during Michaung, so these fixed official maps show where it has stood before.
            </p>
          </div>

          {track && (
            <div className={`pt-1.5 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
              <div className="flex items-center justify-between gap-2">
                <label className={row}>
                  <input type="checkbox" checked={track.show} onChange={e => track.setShow(e.target.checked)} className="accent-red-600" />
                  <span className="font-semibold">Cyclone track <span className={`font-normal ${muted}`}>(IMD, observed)</span></span>
                </label>
                <button
                  type="button"
                  onClick={track.onFit}
                  className={`px-1.5 py-0.5 rounded border text-xs font-semibold ${
                    isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Show whole storm
                </button>
              </div>
              <div className="pl-5 space-y-0.5">
                <div className="text-xs leading-snug">{track.now ?? <span className={muted}>The storm is outside IMD&apos;s track dates at this step.</span>}</div>
                <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${muted}`}>
                  {(['D', 'DD', 'CS', 'SCS'] as TrackGrade[]).map(g => (
                    <span key={g} className="inline-flex items-center gap-1" title={TRACK_GRADE_NAMES[g]}>
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: GRADE_COLOR[g] }} />
                      {g}
                    </span>
                  ))}
                  <span>solid = travelled, dotted = still to come</span>
                </div>
                <p className={`text-xs leading-snug ${muted}`}>
                  IMD gives a position every 3 hours; between two of them the marker moves on a straight line (our interpolation).
                </p>
              </div>
            </div>
          )}

          <div className={`pt-1.5 border-t space-y-0.5 ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <label className={row}>
              <input type="checkbox" checked={showGauges} onChange={e => setShowGauges(e.target.checked)} className="accent-slate-700" />
              <span className="inline-block w-2.5 h-2.5 rounded-[2px] border border-slate-700 bg-blue-500" aria-hidden />
              <span className="font-semibold">IMD rain gauges</span>
            </label>
            <p className={`pl-5 text-xs leading-snug ${muted}`}>
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

        </>
      )}
    </div>
  );
};
