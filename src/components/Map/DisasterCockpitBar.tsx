import React from 'react';
import { Wind, AlertTriangle } from 'lucide-react';

export type DisasterScenario = 'NORMAL' | 'CYCLONE_ALERT' | 'SEVERE_CYCLONE' | 'EXTREME_SURGE';

export type CrisisTriageFilter = 'all' | 'poor_stability' | 'waterlogging_risk' | 'outages';

export interface DisasterCockpitBarProps {
  disasterScenario: DisasterScenario;
  setDisasterScenario: (scenario: DisasterScenario) => void;
  crisisTriageFilter: CrisisTriageFilter;
  setCrisisTriageFilter: (filter: CrisisTriageFilter) => void;
  poorStabilityCount: number;
  waterloggingRiskCount: number;
  liveOutagesCount?: number;
  substationsCount?: number;
  isLight: boolean;
}

export const DisasterCockpitBar: React.FC<DisasterCockpitBarProps> = ({
  disasterScenario,
  setDisasterScenario,
  crisisTriageFilter,
  setCrisisTriageFilter,
  poorStabilityCount,
  waterloggingRiskCount,
  liveOutagesCount = 0,
  isLight
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5 w-auto max-w-[calc(100vw-2rem)]">
      <div className={`pointer-events-auto rounded-2xl p-1 shadow-2xl border flex items-center gap-1 transition-all ${
        isLight
          ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-300/40 backdrop-blur-md'
          : 'bg-slate-900/90 border-slate-700/80 text-white shadow-black/60 backdrop-blur-md'
      }`}>
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 border-r shrink-0 border-current/10">
          <Wind className={`w-3.5 h-3.5 ${
            disasterScenario === 'NORMAL' ? (isLight ? 'text-emerald-600' : 'text-emerald-400') :
            disasterScenario === 'CYCLONE_ALERT' ? (isLight ? 'text-yellow-600' : 'text-yellow-400') :
            disasterScenario === 'SEVERE_CYCLONE' ? (isLight ? 'text-amber-600' : 'text-amber-400') :
            (isLight ? 'text-rose-600' : 'text-rose-400')
          }`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Disaster Protocol
          </span>
        </div>

        <div className="flex items-center gap-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setDisasterScenario('NORMAL')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              disasterScenario === 'NORMAL'
                ? (isLight ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-500 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
            }`}
          >
            <span>🌤️</span>
            <span>Normal</span>
          </button>

          <button
            type="button"
            onClick={() => setDisasterScenario('CYCLONE_ALERT')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              disasterScenario === 'CYCLONE_ALERT'
                ? (isLight ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm' : 'bg-yellow-400 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
            }`}
            title="Cyclone Watch Alert (Wind 65 km/h, Surge 0.8m) • Standby Mode"
          >
            <span>🟡</span>
            <span>Alert</span>
          </button>

          <button
            type="button"
            onClick={() => setDisasterScenario('SEVERE_CYCLONE')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              disasterScenario === 'SEVERE_CYCLONE'
                ? (isLight ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-500 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
            }`}
            title="Cyclone Michaung / Vardah Landfall (Wind 90 km/h) • Statutory Pre-Emptive Trip of Overhead Lines"
          >
            <span>🌀</span>
            <span>Severe</span>
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${
              disasterScenario === 'SEVERE_CYCLONE'
                ? (isLight ? 'bg-amber-700 text-white' : 'bg-slate-950 text-amber-300 font-bold')
                : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
            }`}>
              &gt;80k
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDisasterScenario('EXTREME_SURGE')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              disasterScenario === 'EXTREME_SURGE'
                ? (isLight ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-500 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
            }`}
            title="Catastrophic Coastal Surge (3.2m Surge) • Exceeds TNSDMA 3.0m Regulatory Threshold"
          >
            <span>🌊</span>
            <span>Surge</span>
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${
              disasterScenario === 'EXTREME_SURGE'
                ? (isLight ? 'bg-rose-700 text-white' : 'bg-slate-950 text-rose-300 font-bold')
                : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
            }`}>
              3.2m
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Statutory Protocol Readout Strip */}
      {disasterScenario !== 'NORMAL' && (
        <div className={`pointer-events-auto px-3.5 py-1 rounded-full text-xs shadow-md border flex items-center justify-center gap-2 backdrop-blur-md text-center max-w-xl transition-all ${
          disasterScenario === 'CYCLONE_ALERT'
            ? (isLight ? 'bg-yellow-50/95 border-yellow-300 text-yellow-900 shadow-yellow-500/10' : 'bg-yellow-950/85 border-yellow-700/80 text-yellow-200 shadow-black/40') :
          disasterScenario === 'SEVERE_CYCLONE'
            ? (isLight ? 'bg-amber-50/95 border-amber-300 text-amber-900 shadow-amber-500/10' : 'bg-amber-950/85 border-amber-700/80 text-amber-200 shadow-black/40') :
            (isLight ? 'bg-rose-50/95 border-rose-300 text-rose-900 shadow-rose-500/10' : 'bg-rose-950/85 border-rose-700/80 text-rose-200 shadow-black/40')
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold tracking-tight text-center">
            {disasterScenario === 'CYCLONE_ALERT' && 'Cyclone Watch Advisory (Wind 65 km/h) • Lineman Foot Patrols Alerted'}
            {disasterScenario === 'SEVERE_CYCLONE' && 'TNSDMA §5.6 Mandate: Overhead Radial Lines Tripped (>80 km/h) • UG Ring Feeders Preserved'}
            {disasterScenario === 'EXTREME_SURGE' && 'TNSDMA 3.0m Surge Mandate: Substation Inundation & Mobile Dewatering Active'}
          </span>
        </div>
      )}

      {/* Disaster Triage Quick Filters */}
      <div className={`pointer-events-auto rounded-xl p-1 shadow-lg border flex items-center gap-1 transition-all text-xs ${
        isLight
          ? 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-200/60 backdrop-blur-md'
          : 'bg-slate-900/90 border-slate-700/80 text-white shadow-black/50 backdrop-blur-md'
      }`}>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 text-slate-500">
          Triage:
        </span>

        {/* 1. Poor Stability (<75 Health Score) */}
        <button
          type="button"
          onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'poor_stability' ? 'all' : 'poor_stability')}
          className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            crisisTriageFilter === 'poor_stability'
              ? (isLight ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'bg-amber-500 text-slate-950 font-bold shadow-xs')
              : (isLight ? 'hover:bg-amber-50 text-amber-700' : 'hover:bg-amber-950/60 text-amber-300')
          }`}
          title="Filter to infrastructure with poor operational stability & resiliency health score < 75"
        >
          <span>⚠️ Poor Stability (&lt;75)</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-bold">
            {poorStabilityCount}
          </span>
        </button>

        {/* 2. Waterlogging / Elevation Vulnerability */}
        <button
          type="button"
          onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'waterlogging_risk' ? 'all' : 'waterlogging_risk')}
          className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            crisisTriageFilter === 'waterlogging_risk'
              ? (isLight ? 'bg-cyan-600 text-white font-semibold shadow-xs' : 'bg-cyan-500 text-slate-950 font-bold shadow-xs')
              : (isLight ? 'hover:bg-cyan-50 text-cyan-700' : 'hover:bg-cyan-950/60 text-cyan-300')
          }`}
          title="Filter to infrastructure vulnerable to waterlogging because elevation is not high enough (<= 3.2m MSL or High Flood / Surge Hazard)"
        >
          <span>🌊 Waterlogging Risk</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-bold">
            {waterloggingRiskCount}
          </span>
        </button>

        {/* 3. Live Outages */}
        <button
          type="button"
          onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'outages' ? 'all' : 'outages')}
          className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            crisisTriageFilter === 'outages'
              ? (isLight ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'bg-amber-500 text-slate-950 font-bold shadow-xs')
              : (isLight ? 'hover:bg-amber-50 text-amber-700' : 'hover:bg-amber-950/60 text-amber-300')
          }`}
          title="Filter to grid nodes with active live outages or maintenance today (outage.nammamap.in)"
        >
          <span className="flex items-center gap-1">⚡ Live Outages</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
            liveOutagesCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-black/20'
          }`}>
            {liveOutagesCount}
          </span>
        </button>

        {/* Clear Filter / Back to Full Grid */}
        {crisisTriageFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setCrisisTriageFilter('all')}
            className={`ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Clear filter and show full grid (default)"
          >
            <span>✕ Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};
