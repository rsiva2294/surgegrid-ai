import React from 'react';
import { Wind, AlertTriangle } from 'lucide-react';
import type { LiveWeatherConditions } from '../../services/liveWeatherService';

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
  liveWeather?: LiveWeatherConditions | null;
}

export const DisasterCockpitBar: React.FC<DisasterCockpitBarProps> = ({
  disasterScenario,
  setDisasterScenario,
  crisisTriageFilter,
  setCrisisTriageFilter,
  poorStabilityCount,
  waterloggingRiskCount,
  liveOutagesCount = 0,
  isLight,
  liveWeather
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5 w-auto max-w-[calc(100vw-2rem)]">
      <div className={`pointer-events-auto rounded-2xl p-1 border flex items-center gap-1 transition-all ${
        isLight
          ? 'bg-white/98 border-slate-300/90 text-slate-900 shadow-[0_10px_35px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 backdrop-blur-md'
          : 'bg-slate-900/95 border-slate-700/80 text-white shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
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
          {/* LIVE Weather / Standard Grid Monitoring (replaces static Normal) */}
          <button
            type="button"
            onClick={() => setDisasterScenario('NORMAL')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              disasterScenario === 'NORMAL'
                ? (isLight ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-500 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300 hover:text-white')
            }`}
            title="Real-time Chennai Grid Conditions via Google Maps Weather API (WeatherNext 3)"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                disasterScenario === 'NORMAL'
                  ? (isLight ? 'bg-white' : 'bg-slate-950')
                  : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                disasterScenario === 'NORMAL'
                  ? (isLight ? 'bg-white' : 'bg-slate-950')
                  : 'bg-emerald-500'
              }`}></span>
            </span>
            <span className="tracking-wide uppercase font-bold">Live</span>
            {liveWeather && (
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-bold ${
                disasterScenario === 'NORMAL'
                  ? (isLight ? 'bg-emerald-700/80 text-white' : 'bg-slate-950/30 text-slate-950')
                  : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
              }`}>
                {Math.round(liveWeather.temperatureC)}°C
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDisasterScenario('CYCLONE_ALERT')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
              disasterScenario === 'CYCLONE_ALERT'
                ? (isLight ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm' : 'bg-yellow-400 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300 hover:text-white')
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
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300 hover:text-white')
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
                : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300 hover:text-white')
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

      {/* Dynamic Statutory Protocol Readout Strip for Emergency Drills */}
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
      <div className={`pointer-events-auto rounded-xl p-1 border flex items-center gap-1.5 transition-all text-xs ${
        isLight
          ? 'bg-white/98 border-slate-300/90 text-slate-800 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/10 backdrop-blur-md'
          : 'bg-slate-900/95 border-slate-700/80 text-white shadow-[0_8px_30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
      }`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${isLight ? 'text-slate-600 font-bold' : 'text-slate-400 font-bold'}`}>
          Triage:
        </span>

        {/* 1. Poor Stability (<75 Health Score) */}
        <button
          type="button"
          onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'poor_stability' ? 'all' : 'poor_stability')}
          className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            crisisTriageFilter === 'poor_stability'
              ? (isLight ? 'bg-amber-600 text-white font-bold shadow-xs' : 'bg-amber-500 text-slate-950 font-bold shadow-xs')
              : (isLight 
                  ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-300/70 font-semibold' 
                  : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 font-semibold shadow-2xs')
          }`}
          title="Filter to infrastructure with poor operational stability & resiliency health score < 75"
        >
          <span>⚠️ Poor Stability (&lt;75)</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
            crisisTriageFilter === 'poor_stability' 
              ? 'bg-black/25 text-white' 
              : (isLight ? 'bg-amber-200/80 text-amber-950' : 'bg-amber-500/20 text-amber-200 border border-amber-500/30')
          }`}>
            {poorStabilityCount}
          </span>
        </button>

        {/* 2. Waterlogging / Elevation Vulnerability */}
        <button
          type="button"
          onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'waterlogging_risk' ? 'all' : 'waterlogging_risk')}
          className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            crisisTriageFilter === 'waterlogging_risk'
              ? (isLight ? 'bg-cyan-600 text-white font-bold shadow-xs' : 'bg-cyan-500 text-slate-950 font-bold shadow-xs')
              : (isLight 
                  ? 'bg-cyan-50/70 hover:bg-cyan-100 text-cyan-900 border border-cyan-300/70 font-semibold' 
                  : 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/40 font-semibold shadow-2xs')
          }`}
          title="Filter to infrastructure vulnerable to waterlogging because elevation is not high enough (<= 3.2m MSL or High Flood / Surge Hazard)"
        >
          <span>🌊 Waterlogging Risk</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
            crisisTriageFilter === 'waterlogging_risk' 
              ? 'bg-black/25 text-white' 
              : (isLight ? 'bg-cyan-200/80 text-cyan-950' : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30')
          }`}>
            {waterloggingRiskCount}
          </span>
        </button>

        {/* 3. Live Outages */}
        <button
          type="button"
          onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'outages' ? 'all' : 'outages')}
          className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            crisisTriageFilter === 'outages'
              ? (isLight ? 'bg-orange-600 text-white font-bold shadow-xs' : 'bg-orange-500 text-slate-950 font-bold shadow-xs')
              : (isLight 
                  ? 'bg-orange-50/70 hover:bg-orange-100 text-orange-900 border border-orange-300/70 font-semibold' 
                  : 'bg-orange-950/40 hover:bg-orange-900/50 text-orange-300 border border-orange-500/40 font-semibold shadow-2xs')
          }`}
          title="Filter to grid nodes with active live outages or maintenance today (outage.nammamap.in)"
        >
          <span className="flex items-center gap-1">⚡ Live Outages</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
            crisisTriageFilter === 'outages' 
              ? 'bg-black/25 text-white' 
              : liveOutagesCount > 0 
              ? (isLight ? 'bg-orange-500 text-white' : 'bg-orange-400 text-slate-950') 
              : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-orange-500/20 text-orange-200 border border-orange-500/30')
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
