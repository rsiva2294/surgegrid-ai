import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, AlertCircle, Wrench, ChevronDown, ChevronUp, Clock, Zap, Sparkles, RefreshCw } from 'lucide-react';
import type { TnebSubstation, OutageHistoryEvent } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import { getEnrichedHealthProfile, calculateDynamicRisk, formatDisplayDate } from '../../services/gridHealthService';
import type { LiveOutage } from '../../services/liveOutageService';
import type { ScenarioTimestep } from '../../services/scenarioService';
import {
  fetchSubstationTacticalAdvisory,
  generateDeterministicTacticalAdvisory,
  type SubstationCopilotAdvisory
} from '../../services/geminiSubstationCopilotService';

interface SubstationHealthCardProps {
  substation: TnebSubstation;
  isLight: boolean;
  disasterScenario: DisasterScenario;
  liveOutages?: LiveOutage[];
  currentTimestep?: ScenarioTimestep | null;
}

export const SubstationHealthCard: React.FC<SubstationHealthCardProps> = ({
  substation,
  isLight,
  disasterScenario,
  liveOutages = [],
  currentTimestep
}) => {
  const [showEmptyLog, setShowEmptyLog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'yard_core' | 'feeder_corridor' | 'lt_street'>('all');
  const [copilotAdvisory, setCopilotAdvisory] = useState<SubstationCopilotAdvisory | null>(null);
  const [isLoadingCopilot, setIsLoadingCopilot] = useState(false);

  useEffect(() => {
    if (disasterScenario === 'NORMAL' || disasterScenario === 'LIVE') {
      setCopilotAdvisory(null);
      return;
    }
    // Show the rule-based advisory immediately, then upgrade it with Gemini once the hour stops changing.
    setCopilotAdvisory(generateDeterministicTacticalAdvisory(substation, disasterScenario, currentTimestep, liveOutages));
    setIsLoadingCopilot(true);
    let isSubscribed = true;
    const timer = setTimeout(() => {
      fetchSubstationTacticalAdvisory(substation, disasterScenario, currentTimestep, liveOutages)
        .then((advisory) => {
          if (isSubscribed) {
            setCopilotAdvisory(advisory);
            setIsLoadingCopilot(false);
          }
        })
        .catch((err) => {
          console.warn('Failed to load substation copilot:', err);
          if (isSubscribed) setIsLoadingCopilot(false);
        });
    }, 600);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [substation.code, disasterScenario, currentTimestep?.timestep_hour, liveOutages]);

  useEffect(() => {
    setShowEmptyLog(false);
    setIsExpanded(false);
    setScopeFilter('all');
  }, [substation.code]);

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

  const renderEventCard = (event: OutageHistoryEvent, key: string | number) => {
    const isMaintenance = event.category === 'periodic_maintenance';
    return (
      <div
        key={event.id || key}
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
      <div className="grid grid-cols-3 gap-2 text-center">
        <div
          className={`py-2 px-1.5 rounded-lg border shadow-2xs flex flex-col justify-between ${
            isLight ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950' : 'bg-emerald-950/60 border-emerald-700 text-emerald-100'
          }`}
        >
          <span className={`text-[10px] uppercase font-semibold block ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
            🛠️ Scheduled PM
          </span>
          <strong className={`text-xs font-bold block my-0.5 tabular-nums ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
            {profile.periodicMaintenanceCount} {profile.periodicMaintenanceCount === 1 ? 'Run' : 'Runs'}
          </strong>
          {(profile.yardCoreMaintenanceCount !== undefined || profile.feederMaintenanceCount !== undefined || profile.ltStreetMaintenanceCount !== undefined) ? (
            <span className={`text-[9px] block opacity-85 leading-tight ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
              {profile.yardCoreMaintenanceCount || 0} Yard • {profile.feederMaintenanceCount || 0} Line {profile.ltStreetMaintenanceCount ? `• ${profile.ltStreetMaintenanceCount} St` : ''}
            </span>
          ) : (
            <span className={`text-[9px] block opacity-75 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              Preventive PM
            </span>
          )}
        </div>

        <div
          className={`py-2 px-1.5 rounded-lg border shadow-2xs flex flex-col justify-between ${
            profile.unscheduledTripsCount > 0
              ? isLight
                ? 'bg-rose-100/70 border-rose-300 text-rose-950'
                : 'bg-rose-950/60 border-rose-700 text-rose-100'
              : isLight
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-slate-800/80 border-slate-700 text-slate-200'
          }`}
        >
          <span
            className={`text-[10px] uppercase font-semibold block ${
              profile.unscheduledTripsCount > 0
                ? isLight
                  ? 'text-rose-800'
                  : 'text-rose-300'
                : isLight
                ? 'text-slate-600'
                : 'text-slate-400'
            }`}
          >
            ⚠️ Forced Trips
          </span>
          <strong
            className={`text-xs font-bold block my-0.5 tabular-nums ${
              profile.unscheduledTripsCount > 0
                ? isLight
                  ? 'text-rose-950'
                  : 'text-rose-200'
                : isLight
                ? 'text-slate-800'
                : 'text-slate-200'
            }`}
          >
            {profile.unscheduledTripsCount} {profile.unscheduledTripsCount === 1 ? 'Trip' : 'Trips'}
          </strong>
          {profile.cleanStreakDays !== undefined ? (
            <span className={`text-[9px] block opacity-85 leading-tight ${
              profile.unscheduledTripsCount > 0
                ? isLight ? 'text-rose-800' : 'text-rose-300'
                : isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {profile.cleanStreakDays === 0 && (profile.activeLiveTripCount || 0) > 0 ? (
                <span className="text-rose-600 font-bold">⚠️ Broken today</span>
              ) : (
                `${profile.cleanStreakDays}d clean run`
              )}
            </span>
          ) : (
            <span className={`text-[9px] block opacity-75 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Incident record
            </span>
          )}
        </div>

        <div
          className={`py-2 px-1.5 rounded-lg border shadow-2xs flex flex-col justify-between ${
            profile.disasterRiskMultiplier > 1.0
              ? isLight
                ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                : 'bg-amber-950/60 border-amber-700 text-amber-100'
              : isLight
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-slate-800/80 border-slate-700 text-slate-200'
          }`}
        >
          <span className={`text-[10px] uppercase font-semibold block ${
            profile.disasterRiskMultiplier > 1.0
              ? isLight ? 'text-amber-800' : 'text-amber-300'
              : isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            Risk Factor
          </span>
          <strong
            className={`text-xs font-bold block my-0.5 tabular-nums ${
              profile.disasterRiskMultiplier > 1.0
                ? isLight
                  ? 'text-amber-900'
                  : 'text-amber-200'
                : isLight
                ? 'text-emerald-800'
                : 'text-emerald-300'
            }`}
          >
            {profile.disasterRiskMultiplier.toFixed(2)}x Multiplier
          </strong>
          <span className={`text-[9px] block opacity-85 leading-tight ${
            profile.disasterRiskMultiplier > 1.0
              ? isLight ? 'text-amber-800' : 'text-amber-300'
              : isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {profile.disasterRiskMultiplier > 1.0 ? 'Disaster Impact' : 'Nominal Baseline'}
          </span>
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
              <span title="SurgeGrid's own model: base risk multiplied by a factor from the health grade. Not from the official plans.">SurgeGrid risk multiplier, our model ({disasterScenario.replace('_', ' ')})</span>
              <span className="font-mono">{baseRisk} → {dynamicRisk.finalRisk} / 100</span>
            </div>
            <p className="text-[11px] mt-0.5 opacity-90">{dynamicRisk.rationale}</p>
          </div>
        </div>
      )}

      {/* Tier-2 Gemini Substation Tactical Advisory Card */}
      {disasterScenario !== 'NORMAL' && copilotAdvisory && (
        <div
          className={`rounded-xl border p-3 transition-all shadow-xs ${
            isLight
              ? 'bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border-indigo-200 text-slate-900'
              : 'bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border-indigo-500/40 text-slate-100'
          }`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-400" />
              </div>
              <span className="font-bold text-xs tracking-tight text-indigo-950 dark:text-indigo-200 truncate">
                SUBSTATION COPILOT
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                OFFICIAL QUOTES
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isLoadingCopilot && (
                <RefreshCw className="w-2.5 h-2.5 text-indigo-400 animate-spin" />
              )}
              {copilotAdvisory.cached && (
                <span className="text-[9px] px-1 py-0.2 rounded font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  Cached
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {currentTimestep ? `T${currentTimestep.timestep_hour >= 0 ? '+' : ''}${currentTimestep.timestep_hour}h` : 'LIVE'}
              </span>
            </div>
          </div>

          {/* Flags from our grid data */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {copilotAdvisory.flags.length === 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600">
                No flags in our data
              </span>
            )}
            {copilotAdvisory.flags.map(flag => (
              <span
                key={flag.id}
                title={flag.detail}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border cursor-help ${
                  flag.id === 'LOW_LYING'
                    ? (isLight ? 'bg-cyan-100 text-cyan-950 border-cyan-300' : 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40')
                    : flag.id === 'OVERHEAD'
                    ? (isLight ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-500/20 text-amber-200 border-amber-500/40')
                    : (isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40')
                }`}
              >
                {flag.label}
              </span>
            ))}
          </div>

          {/* Note tying the actions to this substation's data */}
          {copilotAdvisory.note && (
            <p className="text-[11px] leading-relaxed mb-2.5 text-slate-700 dark:text-slate-300 bg-indigo-500/5 dark:bg-indigo-950/20 p-2 rounded border border-indigo-500/10">
              {copilotAdvisory.note}
            </p>
          )}

          {/* Official actions */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Official actions (quoted)</span>
              <span>({copilotAdvisory.actions.length})</span>
            </div>
            {copilotAdvisory.actions.map((act, idx) => (
              <div
                key={act.id || idx}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs"
              >
                <div className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-snug">{act.title}</div>
                <blockquote className="mt-1 text-[11px] italic leading-relaxed text-slate-700 dark:text-slate-300 border-l-2 border-indigo-300 dark:border-indigo-500/60 pl-2">
                  &ldquo;{act.quote}&rdquo;
                  <span className="block not-italic text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{act.citation}</span>
                </blockquote>
                {act.feeders && act.feeders.length > 0 && (
                  <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="font-bold uppercase tracking-wider">Feeders: </span>
                    <span className="font-mono">{act.feeders.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="truncate">{copilotAdvisory.modelTag}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoadingCopilot(true);
                fetchSubstationTacticalAdvisory(substation, disasterScenario, currentTimestep, liveOutages, { force: true }).then((res) => {
                  setCopilotAdvisory(res);
                  setIsLoadingCopilot(false);
                });
              }}
              className="hover:underline flex items-center gap-1 shrink-0 text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Re-evaluate
            </button>
          </div>
        </div>
      )}

      {/* 90-Day Incident & Maintenance Log Section */}
      <div>
        {profile.events.length === 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setShowEmptyLog(!showEmptyLog)}
              className={`w-full py-1.5 px-2 rounded-lg font-medium text-xs flex items-center justify-between transition-colors ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>90-Day Incident & Maintenance Log (0)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                Clean Record {showEmptyLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showEmptyLog && (
              <div className="mt-1.5 p-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700/60 text-center">
                <p className="text-slate-400 text-xs italic">
                  No outage or maintenance notices recorded in the past 90 days (clean operational record).
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Header row */}
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`} />
                <span>90-Day Incident & Maintenance Log ({profile.events.length})</span>
              </span>
              <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {isExpanded ? 'Full History' : 'Latest Notice'}
              </span>
            </div>

            {/* When NOT expanded: Show ONLY the most recent event */}
            {!isExpanded && (
              <div className="space-y-1.5">
                {renderEventCard(profile.events[0], 'latest')}

                {profile.events.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className={`w-full py-1 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/70'
                    }`}
                  >
                    <span>+ View {profile.events.length - 1} earlier {profile.events.length - 1 === 1 ? 'record' : 'records'}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-75" />
                  </button>
                )}
              </div>
            )}

            {/* When EXPANDED: Show filters + scrollable list + collapse button */}
            {isExpanded && (
              <div className="space-y-1.5">
                {/* Segmented Scope Filter Pills */}
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
                    <p className="text-center py-2.5 text-slate-400 text-xs italic">
                      No recorded incidents matching this scope filter.
                    </p>
                  ) : (
                    filteredEvents.map((event, idx) => renderEventCard(event, idx))
                  )}
                </div>

                {/* Collapse Button */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className={`w-full py-1 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80'
                  }`}
                >
                  <span>Collapse to Latest Only</span>
                  <ChevronUp className="w-3.5 h-3.5 opacity-75" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
