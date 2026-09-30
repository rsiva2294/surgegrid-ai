import React from 'react';
import { Waves } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../../data/officialSources';
import { useOfficialFlood } from '../../services/officialFloodLayers';
import { DEPTH_TEXT, useGccPlan, wardFacts, type DepthClass } from '../../services/gccPlan';

interface FloodExposureCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

const title = (r: string) => r.charAt(0) + r.slice(1).toLowerCase();

const DEPTH_ORDER: DepthClass[] = ['veryHigh', 'high', 'medium', 'low'];
const DEPTH_BAR: Record<DepthClass, string> = {
  veryHigh: 'bg-rose-600',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-sky-300',
};

/**
 * Flood exposure for one substation, in order of importance: a headline, the ward's flood history (year strip and 2015 depth
 * bar), the three site checks, and the detail behind them in a fold. Everything is a fact or an official map check
 * (OpenCity, Greater Chennai Corporation), never a model output or a prediction.
 */
export const FloodExposureCard: React.FC<FloodExposureCardProps> = ({ substation, isLight }) => {
  const elevation = substation.elevationM as number;
  const atOrBelowAverage = elevation <= CHENNAI_AVERAGE_ELEVATION_M;
  const { flood } = useOfficialFlood(substation.code);
  const facts = wardFacts(useGccPlan(), substation.gccWard);

  const layerHit = Boolean(flood && (flood.nrsc2015 || flood.returnPeriod || flood.inundationZone));
  const rating = flood?.returnPeriod ?? null;
  const deepWard = facts?.reg2015 && (facts.reg2015.deepest === 'veryHigh' || facts.reg2015.deepest === 'high');

  const headline = !flood
    ? 'Flood-map data is unavailable for this site.'
    : flood.nrsc2015
    ? 'Inside the 2015 flood extent'
    : layerHit
    ? 'On an official flood map'
    : 'On no official flood map (not proof of safety)';
  const headlineSub = facts?.reg2015
    ? `Ward ${substation.gccWard}: ${facts.reg2015.n} flooded location${facts.reg2015.n > 1 ? 's' : ''} in 2015, deepest ${DEPTH_TEXT[facts.reg2015.deepest]}.`
    : null;
  const kind = !flood ? 'neutral' : flood.nrsc2015 && deepWard ? 'rose' : flood.nrsc2015 ? 'cyan' : layerHit ? 'sky' : 'neutral';
  const barTone =
    kind === 'rose'
      ? isLight ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-rose-950/50 border-rose-700 text-rose-100'
      : kind === 'cyan'
      ? isLight ? 'bg-cyan-50 border-cyan-300 text-cyan-950' : 'bg-cyan-950/50 border-cyan-700 text-cyan-100'
      : kind === 'sky'
      ? isLight ? 'bg-sky-50 border-sky-300 text-sky-950' : 'bg-sky-950/50 border-sky-700 text-sky-100'
      : isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-800/80 border-slate-700 text-slate-200';

  const label = isLight ? 'text-slate-600' : 'text-slate-400';
  const rule = isLight ? 'border-slate-200' : 'border-slate-800';
  const chipCls = `px-2 py-0.5 rounded-md text-xs font-medium border ${
    isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-700 text-slate-300'
  }`;

  const row = (name: string, value: string, sub: string, warn = false) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{name}</div>
        <div className={`text-xs leading-tight ${label}`}>{sub}</div>
      </div>
      <strong className={`text-[13px] tabular-nums shrink-0 ${warn ? (isLight ? 'text-amber-700' : 'text-amber-300') : ''}`}>{value}</strong>
    </div>
  );

  const details: string[] = [];
  if (flood?.inundationZone) details.push(`GCC inundation zone: ${flood.inundationZone}`);
  if (flood && flood.stagnation2015Within500m > 0) details.push(`${flood.stagnation2015Within500m} 2015 stagnation point${flood.stagnation2015Within500m > 1 ? 's' : ''} within 500 m`);
  if (flood && flood.hotspots2020Within500m > 0) details.push(`${flood.hotspots2020Within500m} 2020 flood hotspot${flood.hotspots2020Within500m > 1 ? 's' : ''} within 500 m`);
  if (substation.distanceToCoastKm !== undefined) details.push(`${substation.distanceToCoastKm} km from the coast`);

  const years = facts ? [...facts.allYears, '2023'] : [];
  const listed = (y: string) => (y === '2023' ? (facts?.in2023.length ?? 0) > 0 : Boolean(facts?.yearsListed.includes(y)));
  const listedCount = years.filter(listed).length;
  const counts = facts?.reg2015?.counts;
  const total = facts?.reg2015?.n ?? 0;

  return (
    <div
      className={`p-3 rounded-xl border space-y-2.5 text-[13px] shrink-0 ${
        isLight ? 'bg-slate-50/90 border-slate-200 text-slate-900' : 'bg-slate-950/70 border-slate-700/80 shadow-xs text-slate-100'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Waves className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
        <span className="font-bold text-sm truncate">Flood exposure</span>
      </div>

      <div className={`px-2.5 py-2 rounded-lg border ${barTone}`}>
        <div className="text-sm font-bold leading-snug">{headline}</div>
        {headlineSub && <div className="text-[13px] leading-snug mt-0.5 opacity-90">{headlineSub}</div>}
      </div>

      {facts && listedCount > 0 && (
        <div className={`pt-2 border-t space-y-2 ${rule}`}>
          <div className="flex items-baseline justify-between gap-2">
            <div className={`text-xs uppercase tracking-wider font-semibold ${label}`}>Ward {substation.gccWard} flood history (GCC lists)</div>
            <span className={`text-xs ${label}`}>{listedCount} of {years.length} years</span>
          </div>
          <div className="flex items-end justify-between gap-1">
            {years.map(y => {
              const on = listed(y);
              const tip = y === '2023'
                ? on ? `Listed for the 2023 north-east monsoon (includes Michaung): ${facts.in2023.join('; ')}` : 'Not on the 2023 north-east monsoon list'
                : on ? `Ward has a location in the ${y} register` : `No location in the ${y} register`;
              return (
                <div key={y} className="flex flex-col items-center gap-1 flex-1" title={tip}>
                  <span className={`w-3.5 h-3.5 rounded-full border-2 ${on ? 'bg-cyan-600 border-cyan-600' : isLight ? 'border-slate-300' : 'border-slate-600'}`} />
                  <span className={`text-xs tabular-nums ${on ? '' : label}`}>{y === '2023' ? '2023*' : `'${y.slice(2)}`}</span>
                </div>
              );
            })}
          </div>
          {counts && total > 0 && (
            <div className="space-y-1">
              <div className="flex h-2.5 rounded-full overflow-hidden" role="img" aria-label={`2015 register, ward ${substation.gccWard}: ${total} locations by depth`}>
                {DEPTH_ORDER.filter(c => counts[c] > 0).map(c => (
                  <div key={c} className={DEPTH_BAR[c]} style={{ width: `${(counts[c] / total) * 100}%` }} title={`${counts[c]} ${DEPTH_TEXT[c]}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                <span className={label}>2015 depths, {total} locations:</span>
                {DEPTH_ORDER.filter(c => counts[c] > 0).map(c => (
                  <span key={c} className="inline-flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-sm ${DEPTH_BAR[c]}`} />
                    <strong>{counts[c]}</strong> {DEPTH_TEXT[c]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`pt-1 border-t divide-y ${rule} ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
        {row(
          'Yard elevation',
          `${elevation} m`,
          `${atOrBelowAverage ? 'at or below' : 'above'} Chennai average ${CHENNAI_AVERAGE_ELEVATION_M} m`,
          atOrBelowAverage
        )}
        {row('Inside the 2015 flood extent', flood ? (flood.nrsc2015 ? 'Yes' : 'No') : 'n/a', 'NRSC satellite map', Boolean(flood?.nrsc2015))}
        {row('Official hazard map rating', rating ? title(rating) : flood ? 'None' : 'n/a', 'across the 5 to 100-year maps', rating === 'HIGH' || rating === 'MODERATE')}
      </div>

      <details className={`text-xs ${label}`}>
        <summary className="cursor-pointer font-semibold select-none">More detail and sources</summary>
        {details.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {details.map(d => (
              <span key={d} className={chipCls}>
                {d}
              </span>
            ))}
          </div>
        )}
        <p className="mt-1.5 leading-snug">
          Official maps (OpenCity, GCC). A map check of this location, not a prediction. Outside a map is not proven safe. Ward records are
          the GCC plan 2024 street lists by ward, not exact points. The plan has registers for 2015 and 2017 to 2022 (none for 2016); *2023: the north-east monsoon list, which includes
          Michaung and has no depth classes.
        </p>
      </details>
    </div>
  );
};
