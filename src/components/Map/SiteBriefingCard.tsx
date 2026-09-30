import React, { useState } from 'react';
import { CloudRain, Info } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import type { ScenarioTimestep } from '../../services/scenarioService';
import { IMD_BULLETINS, IMD_STEP_NOTES, istLabel, type ImdQuote } from '../../data/imdBulletins';
import { resolvePhase, type SopPhase } from '../../services/geminiSopService';
import { GAUGE_KM, TIER_TITLE, rainClassName as cls, useSiteBriefing } from '../../services/siteBriefing';

interface SiteBriefingCardProps {
  substation: TnebSubstation;
  isLight: boolean;
  currentTimestep: ScenarioTimestep;
}

const STAGE_NAME: Record<SopPhase, string> = { WATCH: 'Standby', CRITICAL: 'Impact', RESTORATION: 'Restoration' };
// For the site card, rain statements first; the other kinds are on the "IMD at the time" card.
const QUOTE_ORDER: ImdQuote['kind'][] = ['Observed rain', 'Rain warning', 'Damage expected', 'Landfall', 'Forecast', 'Wind warning', 'Observed wind'];

/**
 * What is true for one substation at the hindcast step on screen: a headline (our order), IMD's statement for the step, the
 * satellite rain over its cell and the nearest IMD gauge readings of the latest day that had ended. Facts from `useSiteBriefing`.
 */
export const SiteBriefingCard: React.FC<SiteBriefingCardProps> = ({ substation, isLight, currentTimestep }) => {
  const b = useSiteBriefing(substation, currentTimestep);
  const [showNotes, setShowNotes] = useState(false);
  const { satMm, win, ageH, near, allAboveSat, tier, headSub } = b;
  const gauges = b.loaded;
  const grid = b.loaded;

  const muted = isLight ? 'text-slate-500' : 'text-slate-400';
  const rule = isLight ? 'border-slate-200' : 'border-slate-700/80';
  const hour = currentTimestep.timestep_hour;
  const stepLabel = `T${hour >= 0 ? '+' : ''}${hour}h`;
  const stage = STAGE_NAME[resolvePhase(currentTimestep)];
  const when = istLabel(currentTimestep.utc);

  const TIER = {
    first: { title: TIER_TITLE.first, tone: isLight ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-rose-950/40 border-rose-700/60 text-rose-100' },
    next: { title: TIER_TITLE.next, tone: isLight ? 'bg-orange-50 border-orange-300 text-orange-900' : 'bg-orange-950/40 border-orange-700/60 text-orange-100' },
    watch: { title: TIER_TITLE.watch, tone: isLight ? 'bg-white border-sky-200 text-sky-900' : 'bg-slate-900/60 border-sky-800/60 text-sky-100' },
    none: { title: TIER_TITLE.none, tone: isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-700 text-slate-300' },
  }[tier];

  const quote = [...(IMD_STEP_NOTES[hour]?.quotes ?? [])].sort((a, b) => QUOTE_ORDER.indexOf(a.kind) - QUOTE_ORDER.indexOf(b.kind))[0];

  const head = `text-xs uppercase tracking-wider font-semibold ${muted}`;

  return (
    <div
      className={`p-3.5 rounded-xl border space-y-3 text-[13px] leading-snug shrink-0 ${
        isLight ? 'bg-sky-50/80 border-sky-200 text-slate-900' : 'bg-sky-950/30 border-sky-800/60 text-slate-100'
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <CloudRain className={`w-4 h-4 shrink-0 ${isLight ? 'text-sky-700' : 'text-sky-300'}`} />
          <span className="font-bold text-sm truncate">At {stepLabel}{when ? ` · ${when}` : ''}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isLight ? 'bg-sky-100 text-sky-800' : 'bg-sky-900/60 text-sky-200'}`}
            title="Stage from the replay hour: before the peak-rain hour is standby, after it restoration once the rain stops (our rule)."
          >
            {stage}
          </span>
          <button
            type="button"
            onClick={() => setShowNotes(v => !v)}
            aria-expanded={showNotes}
            aria-label="How this card is worked out"
            className={`p-0.5 rounded ${muted} hover:opacity-80`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showNotes && (
        <div className={`text-xs leading-snug space-y-1 ${muted}`}>
          <p>Our order: IMD rain class here, then official flood facts. The plans set no rain level for action.</p>
          <p>
            Rain here is the higher of the satellite value and the nearest gauge reading. {allAboveSat ? 'Here the gauges read more than the satellite for the same day (our comparison). ' : ''}
            &ldquo;Not listed&rdquo; means under about 70 mm, or no report. Gauges: IMD final report on Michaung, section 8.1; classes from IMD.
          </p>
        </div>
      )}

      <div className={`px-3 py-2.5 rounded-lg border ${TIER.tone}`}>
        <div className="text-sm font-bold">{TIER.title}</div>
        {headSub && <div className="mt-0.5 opacity-90">{headSub}</div>}
      </div>

      {quote && (
        <div className={`pt-2.5 border-t ${rule}`}>
          <div className={head}>IMD said · {quote.kind.toLowerCase()}</div>
          <blockquote className="mt-1 italic">&ldquo;{quote.text}&rdquo;</blockquote>
          <div className={`text-xs mt-0.5 ${muted}`}>{IMD_BULLETINS[quote.bulletin]?.label ?? quote.bulletin}</div>
        </div>
      )}

      <div className={`pt-2.5 border-t space-y-2 ${rule}`}>
        <div className={head}>Rain here</div>

        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold">Satellite, last 24 h</div>
            <div className={`text-xs ${muted}`}>NASA IMERG, average over an 11 km square</div>
          </div>
          <strong className="tabular-nums shrink-0">
            {satMm === null ? (grid ? 'no cell' : '…') : `${Math.round(satMm)} mm · ${cls(satMm)}`}
          </strong>
        </div>

        <div>
          <div className="font-semibold">IMD rain gauges within {GAUGE_KM} km</div>
          <div className={`text-xs ${muted}`}>
            {!gauges
              ? 'Loading…'
              : win
              ? `${win.label}${ageH !== null ? `, ended ${ageH} h before this step` : ''}`
              : 'No IMD gauge day had ended yet (the first is 24 h to 08:30 IST, 3 Dec).'}
          </div>
          {gauges && win && near.length === 0 && (
            <div className={`mt-1 ${muted}`}>No IMD gauge in our list is within {GAUGE_KM} km of this site.</div>
          )}
          {win && near.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {near.map(({ station, km }) => {
                const mm = station.mm[win.id];
                const sat = station.sat[win.id];
                return (
                  <li key={station.name} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {station.name} <span className={`text-xs ${muted}`}>· {km.toFixed(1)} km</span>
                    </span>
                    {mm == null ? (
                      <span className={`text-xs shrink-0 ${muted}`} title="Not in IMD's list for this day: under about 70 mm, or the station did not report.">
                        not listed
                      </span>
                    ) : (
                      <strong className="tabular-nums shrink-0" title={sat != null ? `Satellite over the gauge's cell for the same 24 h: ${sat} mm.` : undefined}>
                        {mm} mm · {cls(mm)}
                        {sat != null && <span className={`text-xs font-normal ${muted}`}> (sat. {sat})</span>}
                      </strong>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
