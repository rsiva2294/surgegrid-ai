import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { IMD_BULLETINS, TRACK_GRADE_NAMES, distanceToChennaiKm, istLabel, type BestTrackPoint, type ImdStepNote } from '../../data/imdBulletins';

interface ImdAtTheTimeCardProps {
  isLight: boolean;
  /** "14:30 IST, 4 Dec": when this step is. */
  stepTime: string | null;
  note: ImdStepNote;
  /** IMD's observed best-track position for this step (final report). */
  track: BestTrackPoint | null;
}

/**
 * What IMD said about Cyclone Michaung around the current step, quoted from its own press releases (see
 * src/data/imdBulletins.ts). IMD's statements at the time, in its forecast wording: context, not our claims.
 */
export const ImdAtTheTimeCard: React.FC<ImdAtTheTimeCardProps> = ({ isLight, stepTime, note, track }) => {
  // Folded by default: the site card carries IMD's statement for the step; open it for the full set.
  const [open, setOpen] = useState(false);

  const card = isLight
    ? 'bg-white/95 border-slate-300/90 text-slate-800 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10'
    : 'bg-slate-900/95 border-slate-700/80 text-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.7)] ring-1 ring-white/10';
  const muted = isLight ? 'text-slate-600' : 'text-slate-400';
  const kindCls = isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-800 text-slate-300 border border-slate-700';

  // Group consecutive quotes by bulletin so each bulletin's label and link appear once.
  const groups: { bulletin: string; quotes: ImdStepNote['quotes'] }[] = [];
  note.quotes.forEach(q => {
    const last = groups[groups.length - 1];
    if (last && last.bulletin === q.bulletin) last.quotes.push(q);
    else groups.push({ bulletin: q.bulletin, quotes: [q] });
  });

  return (
    <div className={`pointer-events-auto w-[min(40rem,calc(100vw-1rem))] rounded-xl border p-2.5 text-[11px] space-y-1.5 backdrop-blur-md ${card}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-xs">
          IMD at the time {stepTime && <span className={`font-mono font-semibold ${muted}`}>· {stepTime}</span>}
        </span>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-label={open ? 'Minimize' : 'Expand'}
          className={`p-0.5 rounded ${muted} hover:opacity-80`}
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {open && (
        <div className="max-h-[8.5rem] overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
          {track && (
            <div className="space-y-0.5">
              <span className={`block text-[10px] font-mono ${muted}`} title={`Table 1, best track positions, in ${IMD_BULLETINS.report.file}`}>
                {IMD_BULLETINS.report.label}
              </span>
              <p className="leading-snug">
                <span className={`mr-1 px-1 rounded text-[9px] font-semibold ${kindCls}`}>Best track</span>
                {TRACK_GRADE_NAMES[track.grade]}, {track.lat.toFixed(1)}°N {track.lng.toFixed(1)}°E at {istLabel(track.utc)}
                {track.nearestEarlier ? ' (nearest earlier row)' : ''}: {track.windKt} kt (about {Math.round(track.windKt * 1.85)} km/h), {track.pressureHpa} hPa.
                About {Math.round(distanceToChennaiKm(track.lat, track.lng) / 5) * 5} km from Chennai
                <span className={muted}> (our calculation)</span>.
              </p>
            </div>
          )}
          {note.quotes.length === 0 ? (
            <p className={`text-[10px] ${muted}`}>No IMD bulletin in our set was issued before this step (the first is 13:30 IST on 3 December).</p>
          ) : (
            groups.map(g => {
              const b = IMD_BULLETINS[g.bulletin];
              return (
                <div key={`${g.bulletin}-${g.quotes[0].kind}`} className="space-y-1">
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block text-[10px] font-mono underline ${muted}`}
                      title={`Open ${b.file}`}
                    >
                      {b.label}
                    </a>
                  ) : (
                    <span className={`block text-[10px] font-mono ${muted}`} title={b.file}>
                      {b.label}
                    </span>
                  )}
                  {g.quotes.map(q => (
                    <p key={q.text.slice(0, 40)} className="leading-snug">
                      <span className={`mr-1 px-1 rounded text-[9px] font-semibold ${kindCls}`}>{q.kind}</span>
                      <span className="italic">&ldquo;{q.text}&rdquo;</span>
                    </p>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
