import React from 'react';
import { Waves } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../../data/officialSources';
import { useOfficialFlood } from '../../services/officialFloodLayers';

interface FloodExposureCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

const title = (r: string) => r.charAt(0) + r.slice(1).toLowerCase();

/**
 * Flood exposure for one substation, laid out like the health card: a badge, three tiles, and chips.
 * Everything is a fact or an official map check (OpenCity, Greater Chennai Corporation), never a model output
 * or a prediction. Only the map lines that are true for this location are shown.
 */
export const FloodExposureCard: React.FC<FloodExposureCardProps> = ({ substation, isLight }) => {
  const elevation = substation.elevationM as number;
  const atOrBelowAverage = elevation <= CHENNAI_AVERAGE_ELEVATION_M;
  const { flood } = useOfficialFlood(substation.code);

  const layerHit = Boolean(flood && (flood.nrsc2015 || flood.returnPeriod || flood.inundationZone));

  const badge = !flood
    ? { text: 'Flood-map data unavailable', cls: isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700' }
    : flood.nrsc2015
    ? { text: 'INSIDE 2015 FLOOD EXTENT', cls: isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' }
    : layerHit
    ? { text: 'ON AN OFFICIAL FLOOD MAP', cls: isLight ? 'bg-sky-100 text-sky-900 border-sky-300' : 'bg-sky-500/20 text-cyan-300 border-sky-500/40' }
    : { text: 'IN NO OFFICIAL FLOOD LAYER', cls: isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700' };

  const neutral = isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-800/80 border-slate-700 text-slate-200';
  const neutralLabel = isLight ? 'text-slate-600' : 'text-slate-400';
  const tone = (kind: 'cyan' | 'amber' | 'rose' | 'sky' | 'neutral') =>
    kind === 'cyan'
      ? isLight ? 'bg-cyan-100/70 border-cyan-300 text-cyan-950' : 'bg-cyan-950/60 border-cyan-700 text-cyan-100'
      : kind === 'amber'
      ? isLight ? 'bg-amber-100/70 border-amber-300 text-amber-950' : 'bg-amber-950/60 border-amber-700 text-amber-100'
      : kind === 'rose'
      ? isLight ? 'bg-rose-100/70 border-rose-300 text-rose-950' : 'bg-rose-950/60 border-rose-700 text-rose-100'
      : kind === 'sky'
      ? isLight ? 'bg-sky-100/70 border-sky-300 text-sky-950' : 'bg-sky-950/60 border-sky-700 text-sky-100'
      : neutral;

  const rating = flood?.returnPeriod ?? null;
  const ratingTone = rating === 'HIGH' ? 'rose' : rating === 'MODERATE' ? 'amber' : rating === 'LOW' ? 'sky' : 'neutral';

  const tile = (label: string, value: string, sub: string, kind: 'cyan' | 'amber' | 'rose' | 'sky' | 'neutral') => (
    <div className={`py-2 px-1.5 rounded-lg border shadow-2xs flex flex-col justify-between ${tone(kind)}`}>
      <span className={`text-[10px] uppercase font-semibold block ${kind === 'neutral' ? neutralLabel : 'opacity-80'}`}>{label}</span>
      <strong className="text-xs font-bold block my-0.5 tabular-nums">{value}</strong>
      <span className="text-[9px] block opacity-85 leading-tight">{sub}</span>
    </div>
  );

  const chipCls = `px-2 py-0.5 rounded-md text-[10px] font-medium border ${
    isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-700 text-slate-300'
  }`;
  const chips: string[] = [];
  if (flood?.inundationZone) chips.push(`GCC inundation zone: ${flood.inundationZone}`);
  if (flood && flood.stagnation2015Within500m > 0) chips.push(`${flood.stagnation2015Within500m} 2015 stagnation point${flood.stagnation2015Within500m > 1 ? 's' : ''} within 500 m`);
  if (flood && flood.hotspots2020Within500m > 0) chips.push(`${flood.hotspots2020Within500m} 2020 flood hotspot${flood.hotspots2020Within500m > 1 ? 's' : ''} within 500 m`);
  if (substation.distanceToCoastKm !== undefined) chips.push(`${substation.distanceToCoastKm} km from the coast`);

  return (
    <div
      className={`p-3 rounded-xl border space-y-2.5 text-xs shrink-0 ${
        isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-700/80 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Waves className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
          <span className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Flood exposure</span>
        </div>
        <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border whitespace-nowrap ${badge.cls}`}>{badge.text}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {tile(
          'Yard elevation',
          `${elevation} m`,
          `${atOrBelowAverage ? 'at or below' : 'above'} Chennai avg ${CHENNAI_AVERAGE_ELEVATION_M} m`,
          atOrBelowAverage ? 'amber' : 'neutral'
        )}
        {tile('2015 flood extent', flood ? (flood.nrsc2015 ? 'Yes' : 'No') : 'n/a', 'NRSC satellite map', flood?.nrsc2015 ? 'cyan' : 'neutral')}
        {tile('Hazard map rating', rating ? title(rating) : flood ? 'None' : 'n/a', '5 to 100-year maps, highest', ratingTone)}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => (
            <span key={c} className={chipCls}>
              {c}
            </span>
          ))}
        </div>
      )}

      <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
        Official maps (OpenCity, GCC). A map check of this location, not a prediction. Outside a map is not proven safe.
      </span>
    </div>
  );
};
