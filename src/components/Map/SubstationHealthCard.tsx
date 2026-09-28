import React, { useState } from 'react';
import { Activity, ShieldCheck, AlertCircle, Wrench, ChevronDown, ChevronUp, Clock, Zap } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import { getEnrichedHealthProfile, calculateDynamicRisk, formatDisplayDate } from '../../services/gridHealthService';
import type { LiveOutage } from '../../services/liveOutageService';

interface SubstationHealthCardProps {
  substation: TnebSubstation;
  isLight: boolean;
  disasterScenario: DisasterScenario;
  liveOutages?: LiveOutage[];
}

export const SubstationHealthCard: React.FC<SubstationHealthCardProps> = ({
  substation,
  isLight,
  disasterScenario,
  liveOutages = []
}) => {
  const [showLog, setShowLog] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'yard_core' | 'feeder_corridor' | 'lt_street'>('all');

  const profile = getEnrichedHealthProfile(substation, liveOutages);
  const baseRisk = substation.compositeRiskScore || 25;
  const dynamicRisk = calculateDynamicRisk(baseRisk, profile, disasterScenario);

  const yardCoreCount = profile.events.filter(e => e.scope === 'yard_core').length;
  const feederCount = profile.events.filter(e => e.scope === 'feeder_corridor').length;
  const ltStreetCount = profile.events.filter(e => e.scope === 'lt_street').length;

  const filteredEvents = scopeFilter === 'all'
    ? profile.events
    : profile.events.filter(e => e.scope === scopeFilter);

  const gradeColors = {
    A: isLight
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    B: isLight
      ? 'bg-sky-100 text-sky-900 border-sky-300'
      : 'bg-sky-500/20 text-cyan-300 border-sky-500/40',
    C: isLight
      ? 'bg-amber-100 text-amber-900 border-amber-300'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    D: isLight
      ? 'bg-rose-100 text-rose-900 border-rose-300'
      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  };

  const gradeLabels = {
    A: 'Resilient',
    B: 'Stable',
    C: 'Strained',
    D: 'Fragile'
  };

  return (
    <div
      className={`p-3 rounded-xl border space-y-2.5 text-xs transition-all ${
        isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-700/80 shadow-xs'
      }`}
    >
      {/* Header: Asset Health & Grade */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            Operational Resiliency & 90-Day Log
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border whitespace-nowrap ${
              gradeColors[profile.healthGrade]
            }`}
          >
            GRADE {profile.healthGrade} • {profile.healthScore}/100 {gradeLabels[profile.healthGrade]}
          </span>
        </div>
      </div>

      {/* Real-time Dispatch Status Alert Banner */}
      {profile.dispatchStatus && profile.dispatchStatus !== 'NORMAL' && (
        <div
          className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-between gap-1.5 transition-all ${
            profile.dispatchStatus === 'ACTIVE_TRIP'
              ? isLight
                ? 'bg-rose-50 border-rose-200 text-rose-900 ring-1 ring-rose-300/40'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300 ring-1 ring-rose-500/20'
              : profile.dispatchStatus === 'EMERGENCY_REPAIR'
              ? isLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              : profile.dispatchStatus === 'PLANNED_MAINTENANCE'
              ? isLight
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : 'bg-sky-950/40 border-sky-800/60 text-sky-300'
              : isLight
              ? 'bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                profile.dispatchStatus === 'ACTIVE_TRIP'
                  ? 'bg-rose-500 animate-ping'
                  : profile.dispatchStatus === 'EMERGENCY_REPAIR'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-sky-500'
              }`}
            />
            <span className="font-bold truncate">
              {profile.dispatchStatus === 'ACTIVE_TRIP'
                ? `🔴 Active Interruption (${profile.activeLiveTripCount} Live Breakdown${(profile.activeLiveTripCount || 0) > 1 ? 's' : ''})`
                : profile.dispatchStatus === 'EMERGENCY_REPAIR'
                ? '🟡 Emergency Repair in Progress'
                : profile.dispatchStatus === 'PLANNED_MAINTENANCE'
                ? '🔵 Scheduled Maintenance Active'
                : '⚪ Civic Safety De-energization'}
            </span>
          </div>

          {profile.assetDurabilityScore !== undefined && profile.assetDurabilityScore !== profile.healthScore && (
            <span className="text-[10px] opacity-80 shrink-0 font-mono">
              90d Durability: {profile.assetDurabilityScore}/100
            </span>
          )}
        </div>
      )}

      {/* 3-Month Breakdown Metric Badges */}
      <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
        <div
          className={`py-1.5 px-1 rounded-lg border ${
            isLight ? 'bg-emerald-50/60 border-emerald-100' : 'bg-emerald-950/30 border-emerald-800/60'
          }`}
        >
          <span className={`text-[10px] uppercase font-sans font-medium block ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
            🛠️ Scheduled PM
          </span>
          <strong className={`text-xs font-bold block mt-0.5 ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
            {profile.periodicMaintenanceCount} {profile.periodicMaintenanceCount === 1 ? 'Run' : 'Runs'}
          </strong>
          {(profile.yardCoreMaintenanceCount !== undefined || profile.feederMaintenanceCount !== undefined || profile.ltStreetMaintenanceCount !== undefined) && (
            <span className={`text-[9px] block mt-0.5 opacity-80 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
              {profile.yardCoreMaintenanceCount || 0} Yard • {profile.feederMaintenanceCount || 0} Line {profile.ltStreetMaintenanceCount ? `• ${profile.ltStreetMaintenanceCount} St` : ''}
            </span>
          )}
        </div>

        <div
          className={`py-1.5 px-1 rounded-lg border ${
            profile.unscheduledTripsCount > 0
              ? isLight
                ? 'bg-rose-50/60 border-rose-100'
                : 'bg-rose-950/30 border-rose-800/60'
              : isLight
              ? 'bg-slate-100/60 border-slate-200'
              : 'bg-slate-900/60 border-slate-700/80'
          }`}
        >
          <span
            className={`text-[10px] uppercase font-sans font-medium block ${
              profile.unscheduledTripsCount > 0
                ? isLight
                  ? 'text-rose-700'
                  : 'text-rose-400'
                : isLight
                ? 'text-slate-500'
                : 'text-slate-400'
            }`}
          >
            ⚠️ Forced Trips
          </span>
          <strong
            className={`text-xs font-bold block mt-0.5 ${
              profile.unscheduledTripsCount > 0
                ? isLight
                  ? 'text-rose-900'
                  : 'text-rose-300'
                : isLight
                ? 'text-slate-700'
                : 'text-slate-300'
            }`}
          >
            {profile.unscheduledTripsCount} {profile.unscheduledTripsCount === 1 ? 'Trip' : 'Trips'}
          </strong>
          {profile.cleanStreakDays !== undefined && (
            <span className={`text-[9px] block mt-0.5 opacity-80 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {profile.cleanStreakDays === 0 && (profile.activeLiveTripCount || 0) > 0 ? (
                <span className="text-rose-500 font-bold">⚠️ Broken today</span>
              ) : (
                `${profile.cleanStreakDays}d clean run`
              )}
            </span>
          )}
        </div>

        <div
          className={`py-1.5 px-1 rounded-lg border ${
            isLight ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-slate-700/80'
          }`}
        >
          <span className={`text-[10px] uppercase font-sans font-medium block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Risk Factor
          </span>
          <strong
            className={`text-xs font-bold block mt-0.5 ${
              profile.disasterRiskMultiplier > 1.0
                ? isLight
                  ? 'text-amber-700'
                  : 'text-amber-400'
                : isLight
                ? 'text-emerald-700'
                : 'text-emerald-400'
            }`}
          >
            {profile.disasterRiskMultiplier.toFixed(2)}x Multiplier
          </strong>
        </div>
      </div>

      {/* Disaster Vulnerability Multiplier Impact */}
      {disasterScenario !== 'NORMAL' && (
        <div
          className={`p-2 rounded-lg border text-xs leading-relaxed flex items-start gap-2 ${
            profile.disasterRiskMultiplier > 1.15
              ? isLight
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              : isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
          }`}
        >
          {profile.disasterRiskMultiplier > 1.15 ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between font-bold">
              <span>Disaster Impact Multiplier ({disasterScenario.replace('_', ' ')})</span>
              <span className="font-mono">{baseRisk} → {dynamicRisk.finalRisk} / 100</span>
            </div>
            <p className="text-[11px] mt-0.5 opacity-90">{dynamicRisk.rationale}</p>
          </div>
        </div>
      )}

      {/* Toggle Button for Detailed 90-Day Event Log */}
      <div>
        <button
          type="button"
          onClick={() => setShowLog(!showLog)}
          className={`w-full py-1 px-2 rounded-lg font-medium text-xs flex items-center justify-between transition-colors ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>90-Day Incident & Maintenance Log ({profile.events.length})</span>
          </span>
          {showLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showLog && (
          <div className="mt-2 space-y-1.5">
            {/* Option 1: Segmented Scope Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-medium no-scrollbar">
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-2 py-0.5 rounded-md transition-all shrink-0 ${
                  scopeFilter === 'all'
                    ? isLight
                      ? 'bg-slate-800 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-900 font-bold shadow-xs'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                All ({profile.events.length})
              </button>

              {yardCoreCount > 0 && (
                <button
                  type="button"
                  onClick={() => setScopeFilter('yard_core')}
                  className={`px-2 py-0.5 rounded-md transition-all shrink-0 flex items-center gap-1 ${
                    scopeFilter === 'yard_core'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isLight
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                      : 'bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 border border-blue-800/40'
                  }`}
                >
                  <span>🏛️ Yard Core</span>
                  <span className="opacity-80 font-mono">({yardCoreCount})</span>
                </button>
              )}

              {feederCount > 0 && (
                <button
                  type="button"
                  onClick={() => setScopeFilter('feeder_corridor')}
                  className={`px-2 py-0.5 rounded-md transition-all shrink-0 flex items-center gap-1 ${
                    scopeFilter === 'feeder_corridor'
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : isLight
                      ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
                      : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 border border-purple-800/40'
                  }`}
                >
                  <span>⚡ Feeder Line</span>
                  <span className="opacity-80 font-mono">({feederCount})</span>
                </button>
              )}

              {ltStreetCount > 0 && (
                <button
                  type="button"
                  onClick={() => setScopeFilter('lt_street')}
                  className={`px-2 py-0.5 rounded-md transition-all shrink-0 flex items-center gap-1 ${
                    scopeFilter === 'lt_street'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : isLight
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                      : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border border-amber-800/40'
                  }`}
                >
                  <span>🏘️ LT Street Work</span>
                  <span className="opacity-80 font-mono">({ltStreetCount})</span>
                </button>
              )}
            </div>

            {/* Event List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <p className="text-center py-2 text-slate-400 text-xs italic">
                  No recorded incidents matching this scope filter.
                </p>
              ) : (
                filteredEvents.map((event, idx) => {
                  const isMaintenance = event.category === 'periodic_maintenance';
                  return (
                    <div
                      key={event.id || idx}
                      className={`p-2 rounded-lg border text-[11px] leading-tight flex items-start gap-2 ${
                        event.isLiveActive
                          ? isLight
                            ? 'bg-red-50 border-red-300 text-red-900 ring-1 ring-red-400/20'
                            : 'bg-red-950/40 border-red-500/50 text-red-200'
                          : isMaintenance
                          ? isLight
                            ? 'bg-white border-emerald-100 text-slate-800'
                            : 'bg-slate-900/60 border-emerald-950 text-slate-200'
                          : isLight
                          ? 'bg-white border-amber-100 text-slate-800'
                          : 'bg-slate-900/60 border-amber-950 text-slate-200'
                      }`}
                    >
                      {event.isLiveActive ? (
                        <Zap className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                      ) : isMaintenance ? (
                        <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate">
                            {event.workType}
                          </span>
                          <span className="font-mono text-[10px] opacity-75 shrink-0">
                            {formatDisplayDate(event.date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-[10px] opacity-80 flex-wrap">
                          {event.isLiveActive && (
                            <span className="px-1.5 py-0.2 rounded font-bold uppercase bg-red-600 text-white text-[9px]">
                              ACTIVE TODAY
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded font-medium ${
                              isMaintenance
                                ? isLight
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-emerald-900/40 text-emerald-300'
                                : isLight
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-amber-900/40 text-amber-300'
                            }`}
                          >
                            {isMaintenance ? 'Periodic PM' : 'Unscheduled'}
                          </span>
                          {event.scope && (
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${
                                event.scope === 'yard_core'
                                  ? isLight
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                                  : event.scope === 'lt_street'
                                  ? isLight
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                                  : isLight
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                              }`}
                            >
                              {event.scope === 'yard_core'
                                ? '🏛️ Switchyard Core'
                                : event.scope === 'lt_street'
                                ? '🏘️ LT Street Work'
                                : '⚡ Feeder Line'}
                            </span>
                          )}
                          {event.feeder && (
                            <span className="font-mono truncate max-w-[130px]">
                              ⚡ {event.feeder}
                            </span>
                          )}
                          {event.timing && (
                            <span>({event.timing})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
