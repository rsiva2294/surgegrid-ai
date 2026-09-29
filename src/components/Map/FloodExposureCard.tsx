import React from 'react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M, getQuote } from '../../data/officialSources';
import { useOfficialFlood } from '../../services/officialFloodLayers';

interface FloodExposureCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

/**
 * Flood exposure for one substation, in three clearly separated parts, all facts:
 * 1. facts from our grid data (elevation, coast distance),
 * 2. checks against official flood maps (OpenCity, Greater Chennai Corporation),
 * 3. what the official disaster plans say (word-for-word quotes with pages).
 * No model output is shown here.
 */
export const FloodExposureCard: React.FC<FloodExposureCardProps> = ({ substation, isLight }) => {
  const elevation = substation.elevationM as number;
  const atOrBelowAverage = elevation <= CHENNAI_AVERAGE_ELEVATION_M;
  const { meta, flood } = useOfficialFlood(substation.code);

  const box = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100';
  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const sub = isLight ? 'text-slate-400' : 'text-slate-500';
  const value = isLight ? 'text-slate-900' : 'text-white';

  const sixFeet = getQuote('tangedco-2015-six-feet');
  const keptOff = getQuote('tangedco-2015-substations-kept-off');
  const dewater = getQuote('mop-dewatering-pump-arranged');

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

  const rating = (r: string | null, none: string) => (r ? r.charAt(0) + r.slice(1).toLowerCase() : none);

  return (
    <div className={`p-3 rounded-xl border space-y-3 shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'}`}>
      <div>
        <span className="font-semibold text-xs flex items-center gap-1.5">
          <span>🌊</span>
          <span>Flood exposure</span>
        </span>
        <span className={`text-[10px] block mt-0.5 ${label}`}>
          Grid data, official flood maps, and what the official plans say. No model output.
        </span>
      </div>

      {/* 1. Facts from our grid data */}
      <div className={`p-3 rounded-xl border space-y-1.5 ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>From our grid data</div>
        {renderRow('Yard elevation (SRTM terrain data)', `${elevation} m MSL`)}
        {renderRow('Chennai average elevation (GCC City DMP 2023)', `${CHENNAI_AVERAGE_ELEVATION_M} m MSL`)}
        {renderRow('Compared with the average', atOrBelowAverage ? 'At or below' : 'Above')}
        {renderRow('Distance to coast', substation.distanceToCoastKm !== undefined ? `${substation.distanceToCoastKm} km` : 'n/a')}
      </div>

      {/* 2. Checks against official flood maps */}
      <div className={`p-3 rounded-xl border space-y-1.5 ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>Official flood maps (OpenCity, GCC)</div>
        {flood ? (
          <>
            {renderRow('Inside the 2015 flood extent (NRSC satellite map)', flood.nrsc2015 ? 'Yes' : 'No')}
            {renderRow('Flood-hazard map rating (5 to 100-year maps, highest)', rating(flood.returnPeriod, 'In none of the maps'))}
            {renderRow('GCC flood inundation zone (worst class)', flood.inundationZone ?? 'In no mapped zone')}
            {renderRow('2015 water-stagnation points within 500 m', String(flood.stagnation2015Within500m))}
            {renderRow('2020 monsoon flood hotspots within 500 m', String(flood.hotspots2020Within500m))}
            <span className={`text-[10px] block ${sub}`}>
              Each line checks this substation&apos;s mapped location against an official map. It is not a prediction, and being outside a
              map does not mean the site is safe, because a map may not cover the area. Source: {meta?.source}.
            </span>
          </>
        ) : (
          <span className={`text-[11px] ${label}`}>Official flood-map data not available.</span>
        )}
      </div>

      {/* 3. What the official plans say */}
      <div className={`p-3 rounded-xl border space-y-2 ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>What the official plans say</div>
        {atOrBelowAverage && (
          <div className="space-y-1">
            <p className="text-[11px]">This yard is at or below Chennai&apos;s average elevation. The national power-sector plan says:</p>
            {renderQuote(dewater)}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-[11px]">In the 2015 floods, TANGEDCO recorded:</p>
          {renderQuote(sixFeet)}
          {renderQuote(keptOff)}
          <span className={`text-[10px] block ${sub}`}>These are region-wide facts, not a record for this substation.</span>
        </div>
      </div>
    </div>
  );
};
