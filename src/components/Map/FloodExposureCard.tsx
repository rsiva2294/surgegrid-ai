import React from 'react';
import type { TnebSubstation } from '../../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M, getQuote } from '../../data/officialSources';

interface FloodExposureCardProps {
  substation: TnebSubstation;
  isLight: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  CRITICAL_SURGE_RISK: 'Critical surge',
  HIGH_WATERLOGGING_RISK: 'Waterlogging risk',
  LOW_ELEVATION_RISK: 'Low elevation',
  MODERATE_RISK: 'Moderate',
  SAFE: 'Safe elevation',
};

/**
 * Flood exposure for one substation, in three clearly separated parts:
 * 1. facts from our grid data,
 * 2. what the official plans say (word-for-word quotes with pages),
 * 3. model output, collapsed and labelled as not official data.
 */
export const FloodExposureCard: React.FC<FloodExposureCardProps> = ({ substation, isLight }) => {
  const elevation = substation.elevationM as number;
  const atOrBelowAverage = elevation <= CHENNAI_AVERAGE_ELEVATION_M;
  const hydro = substation.hydroRisk;

  const box = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100';
  const label = isLight ? 'text-slate-500' : 'text-slate-400';
  const sub = isLight ? 'text-slate-400' : 'text-slate-500';
  const value = isLight ? 'text-slate-900' : 'text-white';

  const sixFeet = getQuote('tangedco-2015-six-feet');
  const keptOff = getQuote('tangedco-2015-substations-kept-off');
  const dewater = getQuote('mop-dewatering-pump-arranged');

  const modelNote = 'Model output from terrain and rainfall data. It is not an observation and not official data.';

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

  return (
    <div className={`p-3 rounded-xl border space-y-3 shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'}`}>
      <div>
        <span className="font-semibold text-xs flex items-center gap-1.5">
          <span>🌊</span>
          <span>Flood exposure</span>
        </span>
        <span className={`text-[10px] block mt-0.5 ${label}`}>
          Grid data first, then what the official plans say, then model output (collapsed).
        </span>
      </div>

      {/* 1. Facts from our grid data */}
      <div className={`p-3 rounded-xl border space-y-1.5 ${box}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${label}`}>From our grid data</div>
        {renderRow("Yard elevation (SRTM terrain data)", `${elevation} m MSL`)}
        {renderRow("Chennai average elevation (GCC City DMP 2023)", `${CHENNAI_AVERAGE_ELEVATION_M} m MSL`)}
        {renderRow('Compared with the average', atOrBelowAverage ? 'At or below' : 'Above')}
        {renderRow("Distance to coast", substation.distanceToCoastKm !== undefined ? `${substation.distanceToCoastKm} km` : 'n/a')}
        {renderRow('SurgeGrid flood category (our model)', CATEGORY_LABELS[substation.riskCategory ?? ''] ?? 'n/a')}
        <span className={`text-[10px] block ${sub}`}>The flood category comes from SurgeGrid&apos;s own model, not from the plans.</span>
      </div>

      {/* 2. What the official plans say */}
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

      {/* 3. Model output, collapsed */}
      {hydro && (
        <div className="space-y-2">
          <details className={`rounded-xl border ${box}`}>
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2">
              <span>2015 flood model</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                Model output, not official data
              </span>
            </summary>
            <div className="px-3 pb-3 space-y-1.5">
              {renderRow("Modelled water depth at the yard", hydro.flood2015DepthM > 0 ? `${hydro.flood2015DepthM} m` : 'No modelled water')}
              {renderRow("Homes fed from flooded areas (modelled)", hydro.flood2015ConsAtRisk > 0 ? hydro.flood2015ConsAtRisk.toLocaleString() : 'None')}
              {renderRow("Transformers in flooded areas (modelled)", hydro.flood2015DtrsAtRisk > 0 ? String(hydro.flood2015DtrsAtRisk) : 'None')}
              <span className={`text-[10px] block ${sub}`}>{modelNote}</span>
            </div>
          </details>

          <details className={`rounded-xl border ${box}`}>
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2">
              <span>What-if severe cyclone model</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                Hypothetical, not Michaung
              </span>
            </summary>
            <div className="px-3 pb-3 space-y-1.5">
              {renderRow("Modelled peak water depth at the yard", hydro.cycloneMaxDepthM > 0 ? `${hydro.cycloneMaxDepthM} m` : 'No modelled water')}
              {renderRow("Homes fed from flooded areas (modelled)", hydro.cycloneConsAtRisk > 0 ? hydro.cycloneConsAtRisk.toLocaleString() : 'None')}
              {renderRow("Transformers in flooded areas (modelled)", hydro.cycloneDtrsAtRisk > 0 ? String(hydro.cycloneDtrsAtRisk) : 'None')}
              {renderRow(
                'Modelled first-failure hour',
                hydro.cycloneFirstFailHour !== null && hydro.cycloneFirstFailHour !== undefined
                  ? `T${hydro.cycloneFirstFailHour > 0 ? '+' : ''}${hydro.cycloneFirstFailHour}h in the what-if`
                  : 'None'
              )}
              <span className={`text-[10px] block ${sub}`}>
                {modelNote} It comes from a scripted severe-cyclone what-if, not from the real Michaung data.
              </span>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
