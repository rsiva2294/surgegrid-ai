/**
 * disasterUtils.ts
 * 
 * Disaster state calculators, status resolvers, and tripping heuristics
 * based on TNSDMA statutory protocols, elevation thresholds, and overhead/underground topology.
 */

import type { TnebSubstation, FeederDetail } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';

export interface FeederDisasterStatus {
  state: 'LIVE' | 'PRE_EMPTIVE_SAFETY_ISOLATION' | 'STORM_FAULT_TRIPPED' | 'AWAITING_PATROL_CLEARANCE' | 'STAGE_RESTORED';
  isTripped: boolean;
  reason: string;
  badgeText: string;
  badgeBg: string;
  badgeTextCol: string;
  badgeBorder: string;
  icon: string;
}

export function getFeederDisasterStatus(
  f: FeederDetail,
  ss: TnebSubstation | null,
  scenario: DisasterScenario,
  isLight: boolean,
  simulatedWeather?: { windKmh: number; surgeM: number; rainMm?: number } | null
): FeederDisasterStatus {
  if (scenario === 'NORMAL' || scenario === 'LIVE') {
    return {
      state: 'LIVE',
      isTripped: false,
      reason: 'Normal Operating Conditions • Grid Synchronized',
      badgeText: 'ONLINE',
      badgeBg: isLight ? 'bg-emerald-50' : 'bg-emerald-950/40',
      badgeTextCol: isLight ? 'text-emerald-800' : 'text-emerald-300',
      badgeBorder: isLight ? 'border-emerald-200' : 'border-emerald-500/30',
      icon: '🟢'
    };
  }

  // Simulation Weather or Static Scenario Defaults
  const currentSurgeM = simulatedWeather ? simulatedWeather.surgeM : (scenario === 'EXTREME_SURGE' ? 3.2 : 0.8);
  const currentWindKmh = simulatedWeather ? simulatedWeather.windKmh : (scenario === 'SEVERE_CYCLONE' ? 92 : scenario === 'CYCLONE_ALERT' ? 65 : 40);

  // Extreme Surge / Inundation: Substation yard flooded if ground elevation <= surge depth (TNSDMA 2023 threshold)
  const isYardFlooded = (scenario === 'EXTREME_SURGE' || scenario === 'MICHAUNG_CAT3' || scenario === 'FLOODS_2015') && 
    (ss?.elevationM !== undefined && ss.elevationM <= (scenario === 'FLOODS_2015' ? 4.0 : currentSurgeM));

  if (isYardFlooded) {
    return {
      state: 'PRE_EMPTIVE_SAFETY_ISOLATION',
      isTripped: true,
      reason: `Substation Yard Inundated (Elevation ${ss?.elevationM}m <= Flood/Surge ${currentSurgeM}m) • Statutory De-energization to Prevent Lethal Water Conduction • Mobile Dewatering Mandated`,
      badgeText: 'YARD FLOOD TRIP',
      badgeBg: isLight ? 'bg-rose-100' : 'bg-rose-950/70',
      badgeTextCol: isLight ? 'text-rose-900 font-bold' : 'text-rose-200 font-bold',
      badgeBorder: isLight ? 'border-rose-400' : 'border-rose-500/50',
      icon: '🌊'
    };
  }

  const cfg = (f.config || '').toUpperCase();
  const isOverhead = cfg.includes('OH') || cfg.includes('OVERHEAD') || cfg.includes('MIXED');

  // Severe cyclone (> 80 km/h) mandates statutory pre-emptive shutdown of overhead & mixed radial lines
  if ((scenario === 'SEVERE_CYCLONE' || scenario === 'EXTREME_SURGE' || currentWindKmh > 80) && isOverhead) {
    return {
      state: 'PRE_EMPTIVE_SAFETY_ISOLATION',
      isTripped: true,
      reason: `TNSDMA Statutory Mandate (§5.6): Wind ${currentWindKmh.toFixed(0)} km/h > 80 km/h • Pre-Emptive De-energization to Prevent Public Electrocution from Fallen Lines`,
      badgeText: 'PRE-EMPTIVE TRIP (WIND)',
      badgeBg: isLight ? 'bg-amber-100' : 'bg-amber-950/70',
      badgeTextCol: isLight ? 'text-amber-900 font-bold' : 'text-amber-200 font-bold',
      badgeBorder: isLight ? 'border-amber-400' : 'border-amber-500/50',
      icon: '⚠️'
    };
  }

  if ((scenario === 'CYCLONE_ALERT' || currentWindKmh > 60) && isOverhead) {
    return {
      state: 'AWAITING_PATROL_CLEARANCE',
      isTripped: false,
      reason: 'Cyclone Alert (Wind 65 km/h): Lineman Foot Patrol Alert • Tree-Trimming Standby at GCC Control Room',
      badgeText: 'CYCLONE WATCH',
      badgeBg: isLight ? 'bg-yellow-50' : 'bg-yellow-950/40',
      badgeTextCol: isLight ? 'text-yellow-800' : 'text-yellow-300',
      badgeBorder: isLight ? 'border-yellow-300' : 'border-yellow-500/30',
      icon: '🟡'
    };
  }

  // Pure underground cables withstand surface cyclonic winds
  return {
    state: 'LIVE',
    isTripped: false,
    reason: 'Underground Cable Feeder • Subsurface Ingress Resilient • Energized per TANGEDCO Post-Vardah Hardening Standard',
    badgeText: 'LIVE (UG CABLE)',
    badgeBg: isLight ? 'bg-cyan-50' : 'bg-cyan-950/40',
    badgeTextCol: isLight ? 'text-cyan-800 font-semibold' : 'text-cyan-300 font-semibold',
    badgeBorder: isLight ? 'border-cyan-300' : 'border-cyan-500/30',
    icon: '⚡'
  };
}
