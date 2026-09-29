import React from 'react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M, getQuote } from '../../data/officialSources';
import { useOfficialFlood } from '../../services/officialFloodLayers';

interface FloodExposureCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

/**
 * Flood exposure for one substation. Everything shown is a fact, and only what applies to THIS substation:
 * 1. facts from our grid data (elevation, coast distance),
 * 2. the official flood maps (OpenCity, Greater Chennai Corporation) that this location falls in,
 * 3. the official plan's action, quoted word for word, only when one of the flags below applies.
 * No model output and no region-wide history is shown here.
 */
export const FloodExposureCard: React.FC<FloodExposureCardProps> = ({ substation, isLight }) => {
  const elevation = substation.elevationM as number;
  const atOrBelowAverage = elevation <= CHENNAI_AVERAGE_ELEVATION_M;
  const { flood } = useOfficialFlood(substation.code);

  const box = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100';
  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const sub = isLight ? 'text-slate-400' : 'text-slate-500';
  const value = isLight ? 'text-slate-900' : 'text-white';

  const renderQuote = (q: { quote: string; citation: string } | null) =>
    q ? (
      <blockquote
        className={`italic border-l-2 pl-2.5 text-[11px] leading-relaxed ${
          isLight ? 'text-slate-800 border-indigo-300' : 'text-slate-200 border-indigo-500/60'
        }`}
      >
        &ldquo;{q.quote}&rdquo;
        <span className={`block not-italic text-[10px] font-mono mt-0.5 ${label}`}>{q.citation}</span>
      </blockquote>
    ) : null;

  const renderRow = (name: string, text: string) => (
    <div key={name} className="flex items-baseline justify-between gap-3">
      <span className={`text-[11px] ${label}`}>{name}</span>
      <strong className={`text-xs tabular-nums text-right ${value}`}>{text}</strong>
    </div>
  );

  const title = (r: string) => r.charAt(0) + r.slice(1).toLowerCase();

  // Only the official-map lines that are true for this substation.
  const mapRows: React.ReactNode[] = [];
  if (flood) {
    if (flood.nrsc2015) mapRows.push(renderRow('Inside the 2015 flood extent (NRSC satellite map)', 'Yes'));
    if (flood.returnPeriod) mapRows.push(renderRow('Flood-hazard map rating (5 to 100-year maps, highest)', title(flood.returnPeriod)));
    if (flood.inundationZone) mapRows.push(renderRow('GCC flood inundation zone (worst class)', flood.inundationZone));
    if (flood.stagnation2015Within500m > 0) mapRows.push(renderRow('2015 water-stagnation points within 500 m', String(flood.stagnation2015Within500m)));
    if (flood.hotspots2020Within500m > 0) mapRows.push(renderRow('2020 monsoon flood hotspots within 500 m', String(flood.hotspots2020Within500m)));
  }

  // The plan's action applies when this yard is low, inside the 2015 extent, or in a Moderate/High hazard zone.
  const reasons: string[] = [];
  if (atOrBelowAverage) reasons.push(`yard at ${elevation} m MSL, at or below Chennai's ${CHENNAI_AVERAGE_ELEVATION_M} m average`);
  if (flood?.nrsc2015) reasons.push('inside the 2015 flood extent');
  if (flood?.returnPeriod === 'HIGH' || flood?.returnPeriod === 'MODERATE') {
    reasons.push(`${title(flood.returnPeriod)} rating on the official flood-hazard maps`);
  }

  return (
    <div className={`p-3 rounded-xl border space-y-3 shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'}`}>
      <div>
        <span className="font-semibold text-xs flex items-center gap-1.5">
          <span>🌊</span>
          <span>Flood exposure</span>
        </span>
        <span className={`text-[10px] block mt-0.5 ${label}`}>Grid data and official flood maps for this substation. No model output.</span>
      </div>

      {/* 1. Facts from our grid data */}
      <div className={`p-3 rounded-xl border space-y-1.5 ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>From our grid data</div>
        {renderRow('Yard elevation (SRTM terrain data)', `${elevation} m MSL`)}
        {renderRow('Chennai average elevation (GCC City DMP 2023)', `${CHENNAI_AVERAGE_ELEVATION_M} m MSL`)}
        {renderRow('Compared with the average', atOrBelowAverage ? 'At or below' : 'Above')}
        {renderRow('Distance to coast', substation.distanceToCoastKm !== undefined ? `${substation.distanceToCoastKm} km` : 'n/a')}
      </div>

      {/* 2. Official flood maps this location falls in */}
      <div className={`p-3 rounded-xl border space-y-1.5 ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>Official flood maps (OpenCity, GCC)</div>
        {!flood && <span className={`text-[11px] ${label}`}>Official flood-map data not available.</span>}
        {flood && mapRows.length === 0 && (
          <span className={`text-[11px] ${label}`}>This location is not inside any of the official flood layers checked.</span>
        )}
        {mapRows}
        {flood && (
          <span className={`text-[10px] block ${sub}`}>
            A map check of this substation&apos;s location, not a prediction. A location outside a map is not proven safe, because a map may
            not cover the area.
          </span>
        )}
      </div>

      {/* 3. The plan's action, only when it applies to this substation */}
      {reasons.length > 0 && (
        <div className={`p-3 rounded-xl border space-y-2 ${box}`}>
          <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>What the official plans say</div>
          <p className="text-[11px]">Applies here: {reasons.join('; ')}.</p>
          {renderQuote(getQuote('mop-identify-flood-prone'))}
          {renderQuote(getQuote('mop-dewatering-pump-arranged'))}
        </div>
      )}
    </div>
  );
};
