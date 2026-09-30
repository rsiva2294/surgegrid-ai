import React from 'react';
import type { FeederDetail, TnebSubstation } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import { getFeederLifelineBadge } from './mapIcons';
import { getFeederDisasterStatus } from './disasterUtils';
import { getQuote } from '../../data/officialSources';

interface FeederCardItemProps {
  feeder: FeederDetail;
  isFeederActive: boolean;
  selectedSubstation: TnebSubstation | null;
  disasterScenario: DisasterScenario;
  isLight: boolean;
  onSelectFeeder: (f: FeederDetail) => void;
}

export const FeederCardItem: React.FC<FeederCardItemProps> = ({
  feeder: f,
  isFeederActive,
  selectedSubstation,
  disasterScenario,
  isLight,
  onSelectFeeder
}) => {
  const badge = getFeederLifelineBadge(f, isLight);
  const isNonCut = f.priorityLevel === 'P1_NON_CUT' || f.priorityLevel === 'P1_CRITICAL';

  return (
    <button
      type="button"
      onClick={() => onSelectFeeder(f)}
      className={`w-full feeder-card-virtual text-left p-2 rounded-xl text-[12.5px] border transition-all ${
        isFeederActive
          ? (isNonCut
              ? (isLight
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-sm'
                  : 'bg-rose-950/70 border-rose-400 ring-2 ring-rose-500/40 shadow-sm')
              : (isLight
                  ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300 shadow-sm'
                  : 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-500/40 shadow-sm'))
          : (isLight
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
              : 'bg-slate-950/50 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700')
      }`}
    >
      {/* Feeder Name & Technical Badges */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 truncate">
          <span
            className={`font-semibold text-[13px] truncate ${
              isFeederActive
                ? (isNonCut
                    ? (isLight ? 'text-rose-950 font-bold' : 'text-rose-200 font-bold')
                    : (isLight ? 'text-sky-950 font-bold' : 'text-cyan-200 font-bold'))
                : (isLight ? 'text-slate-900' : 'text-slate-100')
            }`}
            title={f.name}
          >
            {f.name}
          </span>
          {isFeederActive && (
            <span
              className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                isNonCut ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
              }`}
            >
              ON MAP
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {f.outageCount && f.outageCount > 0 ? (
            <span
              className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold flex items-center gap-0.5 ${
                f.outageCount >= 4
                  ? (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40')
                  : f.outageCount >= 2
                  ? (isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40')
                  : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
              }`}
              title={f.outageDates ? `Recorded trips: ${f.outageDates.join(', ')}` : undefined}
            >
              <span>⚡ {f.outageCount} {f.outageCount === 1 ? 'Trip' : 'Trips'}</span>
            </span>
          ) : null}
          <span
            className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold cursor-help ${
              f.voltage.includes('33')
                ? (isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300')
                : (isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300')
            }`}
            title={`Operating Distribution Voltage: ${f.voltage}`}
          >
            {f.voltage}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold cursor-help ${
              isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
            }`}
            title={f.config === 'UG' ? 'Underground cable. The national power-sector plan recommends underground cable in cyclone-prone areas (MoP DMP 2021, p. 111).' : 'Overhead or mixed line'}
          >
            {f.config}
          </span>
        </div>
      </div>

      {/* Row 1: Primary Lifeline / Service Classification */}
      {badge && (
        <div className="flex items-center gap-1.5 my-0.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-md font-bold text-xs border flex items-center gap-1 ${badge.badgeBg}`}
            title={`${badge.label}: classified by SurgeGrid from the feeder name. The national plan lists vital installations such as hospitals and drinking water plants for priority restoration (MoP DMP 2021, p. 239).`}
          >
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold cursor-help ${badge.prioBg}`}
            title={
              f.priorityLevel === 'P1_NON_CUT' || f.priorityLevel === 'P1_CRITICAL'
                ? 'P1 (SurgeGrid class): hospital or water feeder, identified from the feeder name. Official basis: vital installations are restored on a priority basis (MoP DMP 2021, p. 239).'
                : 'SurgeGrid priority class, identified from the feeder name. Not an official rating.'
            }
          >
            {badge.prioText}
          </span>
          {f.isDedicated && (
            <span
              className={`text-xs font-mono cursor-help ${isLight ? 'text-slate-500' : 'text-slate-400'}`}
              title="Dedicated Service: Exclusive point-to-point line supplying a single bulk consumer or facility."
            >
              • Dedicated Line
            </span>
          )}
        </div>
      )}

      {!badge && f.voltage?.includes('33') && !f.type?.toLowerCase().includes('dedicated') && (
        <div className="flex items-center gap-1.5 my-0.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-md font-bold text-xs border flex items-center gap-1 ${
              isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
            title="33 kV Sub-Transmission Trunk: Inter-substation bulk link supplying local distribution yards."
          >
            <span>⚡</span>
            <span>33 kV Trunk</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold cursor-help ${
              isLight ? 'bg-amber-700 text-white font-bold' : 'bg-amber-500 text-slate-950 font-black'
            }`}
            title="Inter-Substation Link: Connects multiple TNEB substations in a loop network."
          >
            INTER-SS
          </span>
        </div>
      )}

      {/* Row 2: street-line length to patrol before recharging */}
      {f.ltLengthKm !== undefined && f.ltLengthKm > 0 && (
        <div className="flex items-center gap-1.5 my-0.5 flex-wrap text-xs font-mono">
          {f.ltLengthKm !== undefined && f.ltLengthKm > 0 && (
            <span
              className={`px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-help border ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={`${f.ltLengthKm} km of low-tension street lines. TANGEDCO DMP 2017, p. 73: “${getQuote('tangedco-no-recharge-before-patrol')?.quote ?? ''}”`}
            >
              <span>🚶</span>
              <span>{f.ltLengthKm} km Patrol</span>
            </span>
          )}
        </div>
      )}

      {/* Scenario flags: facts from our data plus the relevant official quote (no trip states) */}
      {disasterScenario !== 'NORMAL' && (() => {
        const dStatus = getFeederDisasterStatus(f, selectedSubstation, disasterScenario, isLight);
        return (
          <div className={`mt-1.5 p-2 rounded-xl text-[12.5px] leading-relaxed border flex items-start gap-2 ${dStatus.badgeBg} ${dStatus.badgeTextCol} ${dStatus.badgeBorder}`}>
            <span className="shrink-0 mt-0.5">{dStatus.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">
                <span>{dStatus.badgeText}</span>
              </div>
              {dStatus.details.map((d, i) => (
                <div key={i} className="mt-1 font-sans leading-relaxed">
                  <p className="opacity-90">{d.text}</p>
                  {d.quote && (
                    <blockquote className="mt-0.5 italic border-l-2 border-current/30 pl-2 opacity-90">
                      &ldquo;{d.quote}&rdquo;
                      {d.citation && <span className="block not-italic text-xs opacity-80">{d.citation}</span>}
                    </blockquote>
                  )}
                  {!d.quote && d.citation && <span className="block text-xs opacity-80">{d.citation}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Row 3: Consumers, DTRs, Length & Map Action */}
      <div className={`flex items-center justify-between text-xs font-mono mt-1.5 ${
        isLight ? 'text-slate-600' : 'text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          {f.consumers > 0 ? (
            <span
              className={`font-semibold cursor-help ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}
              title={`${f.consumers.toLocaleString()} metered consumers connected to this feeder`}
            >
              👥 {f.consumers.toLocaleString()}
            </span>
          ) : f.isDedicated || f.type?.toLowerCase().includes('dedicated') ? (
            <span
              className={`font-semibold cursor-help ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
              title="Dedicated point-to-point service supplying a single bulk consumer (factory, tech park, or campus)"
            >
              👥 1 Bulk Consumer
            </span>
          ) : (
            <span className="opacity-75">{f.type}</span>
          )}
          {f.transformers > 0 && (
            <span
              className={`cursor-help ${isFeederActive ? (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') : ''}`}
              title={`${f.transformers} Distribution Transformers (DTRs) stepping down voltage along this feeder route`}
            >
              • ⚡ {f.transformers} DTRs
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {f.lengthKm > 0 && (
            <span
              className="opacity-70 cursor-help"
              title={`Total feeder line length: ${f.lengthKm} km`}
            >
              {f.lengthKm} km
            </span>
          )}
          <span className={`underline font-semibold ${
            isFeederActive
              ? (isNonCut
                  ? (isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-bold')
                  : (isLight ? 'text-sky-700 font-bold' : 'text-cyan-400 font-bold'))
              : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
          }`}>
            {isFeederActive ? 'Dismiss' : 'View on Map'}
          </span>
        </div>
      </div>
    </button>
  );
};
