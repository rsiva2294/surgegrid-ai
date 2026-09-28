import React, { useState } from 'react';
import { Activity, ShieldCheck, AlertCircle, Wrench, ChevronDown, ChevronUp, Clock, Zap } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import { getEnrichedHealthProfile, calculateDynamicRisk, formatDisplayDate } from '../../services/gridHealthService';
import type { LiveOutage } from '../../services/liveOutageService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  // Default to collapsed to prevent cognitive overload on initial load
  const [showLog, setShowLog] = useState(false);
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

  const gradeBadgeVariant: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    A: 'success',
    B: 'info',
    C: 'warning',
    D: 'danger'
  };

  const gradeLabels: Record<string, string> = {
    A: 'Resilient',
    B: 'Stable',
    C: 'Strained',
    D: 'Fragile'
  };

  return (
    <Card
      className={cn(
        "p-3 flex flex-col gap-2.5 text-xs transition-all",
        isLight ? "bg-slate-50/90 border-slate-200" : "bg-slate-950/70 border-slate-800 shadow-xs"
      )}
    >
      {/* Header: Asset Health & Grade */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity className="size-3.5 text-indigo-500 shrink-0" />
          <span className={cn("font-bold text-xs truncate", isLight ? "text-slate-900" : "text-slate-100")}>
            Operational Health &amp; Resilience
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={gradeBadgeVariant[profile.healthGrade] || 'info'}>
            GRADE {profile.healthGrade} • {profile.healthScore}/100 {gradeLabels[profile.healthGrade]}
          </Badge>
        </div>
      </div>

      {/* Real-time Dispatch Status Alert Banner */}
      {profile.dispatchStatus && profile.dispatchStatus !== 'NORMAL' && (
        <div
          className={cn(
            "py-1.5 px-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-between gap-1.5 transition-all",
            profile.dispatchStatus === 'ACTIVE_TRIP'
              ? isLight
                ? "bg-rose-50 border-rose-200 text-rose-900 ring-1 ring-rose-300/40"
                : "bg-rose-950/40 border-rose-800/60 text-rose-300 ring-1 ring-rose-500/20"
              : profile.dispatchStatus === 'EMERGENCY_REPAIR'
              ? isLight
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-amber-950/40 border-amber-800/60 text-amber-300"
              : profile.dispatchStatus === 'PLANNED_MAINTENANCE'
              ? isLight
                ? "bg-sky-50 border-sky-200 text-sky-900"
                : "bg-sky-950/40 border-sky-800/60 text-sky-300"
              : isLight
              ? "bg-slate-100 border-slate-300 text-slate-700"
              : "bg-slate-900 border-slate-700 text-slate-300"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                profile.dispatchStatus === 'ACTIVE_TRIP'
                  ? "bg-rose-500 animate-ping"
                  : profile.dispatchStatus === 'EMERGENCY_REPAIR'
                  ? "bg-amber-500 animate-pulse"
                  : "bg-sky-500"
              )}
            />
            <span className="font-bold truncate">
              {profile.dispatchStatus === 'ACTIVE_TRIP'
                ? `Active Interruption (${profile.activeLiveTripCount} Live Breakdown${(profile.activeLiveTripCount || 0) > 1 ? 's' : ''})`
                : profile.dispatchStatus === 'EMERGENCY_REPAIR'
                ? 'Emergency Repair in Progress'
                : profile.dispatchStatus === 'PLANNED_MAINTENANCE'
                ? 'Scheduled Maintenance Active'
                : 'Civic Safety De-energization'}
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
          className={cn(
            "py-1.5 px-1 rounded-lg border",
            isLight ? "bg-emerald-50/60 border-emerald-200/60" : "bg-emerald-950/30 border-emerald-800/60"
          )}
        >
          <span className={cn("text-[10px] uppercase font-sans font-medium block", isLight ? "text-emerald-700" : "text-emerald-400")}>
            Scheduled PM
          </span>
          <strong className={cn("text-xs font-bold block mt-0.5", isLight ? "text-emerald-900" : "text-emerald-300")}>
            {profile.periodicMaintenanceCount} {profile.periodicMaintenanceCount === 1 ? 'Run' : 'Runs'}
          </strong>
          {(profile.yardCoreMaintenanceCount !== undefined || profile.feederMaintenanceCount !== undefined || profile.ltStreetMaintenanceCount !== undefined) && (
            <span className={cn("text-[9px] block mt-0.5 opacity-80", isLight ? "text-emerald-800" : "text-emerald-400")}>
              {profile.yardCoreMaintenanceCount || 0} Yard • {profile.feederMaintenanceCount || 0} Line {profile.ltStreetMaintenanceCount ? `• ${profile.ltStreetMaintenanceCount} St` : ''}
            </span>
          )}
        </div>

        <div
          className={cn(
            "py-1.5 px-1 rounded-lg border",
            profile.unscheduledTripsCount > 0
              ? isLight
                ? "bg-rose-50/60 border-rose-200/60"
                : "bg-rose-950/30 border-rose-800/60"
              : isLight
              ? "bg-slate-100/60 border-slate-200"
              : "bg-slate-900/60 border-slate-800"
          )}
        >
          <span
            className={cn(
              "text-[10px] uppercase font-sans font-medium block",
              profile.unscheduledTripsCount > 0
                ? isLight ? "text-rose-700" : "text-rose-400"
                : isLight ? "text-slate-500" : "text-slate-400"
            )}
          >
            Forced Trips
          </span>
          <strong
            className={cn(
              "text-xs font-bold block mt-0.5",
              profile.unscheduledTripsCount > 0
                ? isLight ? "text-rose-900" : "text-rose-300"
                : isLight ? "text-slate-700" : "text-slate-300"
            )}
          >
            {profile.unscheduledTripsCount} {profile.unscheduledTripsCount === 1 ? 'Trip' : 'Trips'}
          </strong>
          {profile.cleanStreakDays !== undefined && (
            <span className={cn("text-[9px] block mt-0.5 opacity-80", isLight ? "text-slate-600" : "text-slate-400")}>
              {profile.cleanStreakDays === 0 && (profile.activeLiveTripCount || 0) > 0 ? (
                <span className="text-rose-500 font-bold">Broken today</span>
              ) : (
                `${profile.cleanStreakDays}d clean run`
              )}
            </span>
          )}
        </div>

        <div
          className={cn(
            "py-1.5 px-1 rounded-lg border",
            isLight ? "bg-white/80 border-slate-200" : "bg-slate-900/60 border-slate-800"
          )}
        >
          <span className={cn("text-[10px] uppercase font-sans font-medium block", isLight ? "text-slate-500" : "text-slate-400")}>
            Risk Factor
          </span>
          <strong
            className={cn(
              "text-xs font-bold block mt-0.5",
              profile.disasterRiskMultiplier > 1.0
                ? isLight ? "text-amber-700" : "text-amber-400"
                : isLight ? "text-emerald-700" : "text-emerald-400"
            )}
          >
            {profile.disasterRiskMultiplier.toFixed(2)}x Multiplier
          </strong>
        </div>
      </div>

      {/* Disaster Vulnerability Multiplier Impact */}
      {disasterScenario !== 'NORMAL' && (
        <div
          className={cn(
            "p-2 rounded-lg border text-xs leading-relaxed flex items-start gap-2",
            profile.disasterRiskMultiplier > 1.15
              ? isLight
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-rose-950/30 border-rose-800/60 text-rose-200"
              : isLight
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-emerald-950/30 border-emerald-800/60 text-emerald-200"
          )}
        >
          {profile.disasterRiskMultiplier > 1.15 ? (
            <AlertCircle className="size-3.5 shrink-0 text-rose-500 mt-0.5" />
          ) : (
            <ShieldCheck className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
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

      {/* Collapsible 90-Day Incident & Maintenance Log */}
      <div className="border-t border-border pt-2 flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowLog(!showLog)}
          className="w-full justify-between h-7 text-xs font-medium"
        >
          <span className="flex items-center gap-1.5">
            <Clock className="size-3 text-muted-foreground" />
            <span>90-Day Incident &amp; Maintenance Log</span>
          </span>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 font-mono">
              {profile.events.length}
            </Badge>
            {showLog ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </div>
        </Button>

        {showLog && (
          <div className="flex flex-col gap-1.5 pt-1 animate-in fade-in-50 duration-200">
            {/* Segmented Scope Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-medium no-scrollbar">
              <Button
                type="button"
                variant={scopeFilter === 'all' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setScopeFilter('all')}
                className="h-5 px-2 text-[10px]"
              >
                All ({profile.events.length})
              </Button>

              {yardCoreCount > 0 && (
                <Button
                  type="button"
                  variant={scopeFilter === 'yard_core' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setScopeFilter('yard_core')}
                  className="h-5 px-2 text-[10px]"
                >
                  <span>Switchyard Core ({yardCoreCount})</span>
                </Button>
              )}

              {feederCount > 0 && (
                <Button
                  type="button"
                  variant={scopeFilter === 'feeder_corridor' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setScopeFilter('feeder_corridor')}
                  className="h-5 px-2 text-[10px]"
                >
                  <span>Feeder Line ({feederCount})</span>
                </Button>
              )}

              {ltStreetCount > 0 && (
                <Button
                  type="button"
                  variant={scopeFilter === 'lt_street' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setScopeFilter('lt_street')}
                  className="h-5 px-2 text-[10px]"
                >
                  <span>LT Street ({ltStreetCount})</span>
                </Button>
              )}
            </div>

            {/* Event List */}
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <p className="text-center py-2 text-muted-foreground text-xs italic">
                  No recorded incidents matching this scope filter.
                </p>
              ) : (
                filteredEvents.map((event, idx) => {
                  const isMaintenance = event.category === 'periodic_maintenance';
                  return (
                    <div
                      key={event.id || idx}
                      className={cn(
                        "p-2 rounded-lg border text-[11px] leading-tight flex items-start gap-2",
                        event.isLiveActive
                          ? isLight
                            ? "bg-red-50 border-red-300 text-red-900 ring-1 ring-red-400/20"
                            : "bg-red-950/40 border-red-500/50 text-red-200"
                          : isMaintenance
                          ? isLight
                            ? "bg-white border-emerald-200/60 text-slate-800"
                            : "bg-slate-900/60 border-emerald-950 text-slate-200"
                          : isLight
                          ? "bg-white border-amber-200/60 text-slate-800"
                          : "bg-slate-900/60 border-amber-950 text-slate-200"
                      )}
                    >
                      {event.isLiveActive ? (
                        <Zap className="size-3.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                      ) : isMaintenance ? (
                        <Wrench className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
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
                            <Badge variant="danger" className="text-[9px] py-0 px-1">
                              ACTIVE TODAY
                            </Badge>
                          )}
                          <Badge variant={isMaintenance ? 'success' : 'warning'} className="text-[9px] py-0 px-1">
                            {isMaintenance ? 'Periodic PM' : 'Unscheduled'}
                          </Badge>
                          {event.scope && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal">
                              {event.scope === 'yard_core'
                                ? 'Switchyard Core'
                                : event.scope === 'lt_street'
                                ? 'LT Street Work'
                                : 'Feeder Line'}
                            </Badge>
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
    </Card>
  );
};
