/**
 * disasterUtils.ts
 *
 * Feeder status shown on the feeder cards while a scenario runs.
 * The official plans give no wind-speed or flood-depth trigger for switching supply off; they say
 * supply may be switched off "if required". So nothing here trips a feeder. It flags only facts from
 * our grid data (yard elevation, overhead or underground) and shows the relevant official quote.
 */

import type { TnebSubstation, FeederDetail } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import { CHENNAI_AVERAGE_ELEVATION_M, IMD_CLASS_CITATION, getImdCycloneClass, getQuote } from '../../data/officialSources';

export interface FeederDisasterDetail {
  text: string;
  quote?: string;
  citation?: string;
}

export interface FeederDisasterStatus {
  state: 'LIVE' | 'FLAGGED';
  reason: string;
  details: FeederDisasterDetail[];
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
  simulatedWeather?: { windKmh: number; rainMm?: number } | null
): FeederDisasterStatus {
  if (scenario === 'NORMAL' || scenario === 'LIVE') {
    return {
      state: 'LIVE',
      reason: 'Normal operating conditions',
      details: [],
      badgeText: 'ONLINE',
      badgeBg: isLight ? 'bg-emerald-50' : 'bg-emerald-950/40',
      badgeTextCol: isLight ? 'text-emerald-800' : 'text-emerald-300',
      badgeBorder: isLight ? 'border-emerald-200' : 'border-emerald-500/30',
      icon: '🟢'
    };
  }

  const elevation = ss?.elevationM;
  const isLowLying = elevation !== undefined && elevation <= CHENNAI_AVERAGE_ELEVATION_M;
  const cfg = (f.config || '').toUpperCase();
  const isOverhead = cfg.includes('OH') || cfg.includes('OVERHEAD') || cfg.includes('MIXED');

  const tags: string[] = [];
  const details: FeederDisasterDetail[] = [];

  if (isLowLying) {
    tags.push('LOW-LYING YARD');
    details.push({
      text: `Yard elevation ${elevation} m MSL is at or below Chennai's average elevation (${CHENNAI_AVERAGE_ELEVATION_M} m, GCC City DMP 2023).`,
      ...(getQuote('mop-dewatering-pump-arranged') ?? {})
    });
  }

  if (isOverhead) {
    tags.push('OPERATOR DECISION');
    details.push({
      text: 'Overhead or mixed feeder. The plans leave switching supply off to the operator.',
      ...(getQuote('tangedco-oh-lines-out-of-service') ?? {})
    });
    const imd = simulatedWeather ? getImdCycloneClass(simulatedWeather.windKmh) : null;
    if (imd) {
      details.push({
        text: `Wind is in the IMD "${imd.name}" cyclone class (${imd.minKmh} km/h and above).`,
        citation: IMD_CLASS_CITATION
      });
    }
  } else {
    tags.push('UNDERGROUND');
    details.push({
      text: 'Underground feeder, the option the national plan recommends in cyclone-prone areas.',
      ...(getQuote('mop-underground-in-cyclone-areas') ?? {})
    });
  }

  const flagged = isLowLying || isOverhead;
  return {
    state: flagged ? 'FLAGGED' : 'LIVE',
    reason: details.map(d => d.text).join(' '),
    details,
    badgeText: tags.join(' · '),
    badgeBg: isLowLying
      ? (isLight ? 'bg-cyan-50' : 'bg-cyan-950/40')
      : isOverhead
      ? (isLight ? 'bg-amber-50' : 'bg-amber-950/40')
      : (isLight ? 'bg-emerald-50' : 'bg-emerald-950/40'),
    badgeTextCol: isLowLying
      ? (isLight ? 'text-cyan-900' : 'text-cyan-200')
      : isOverhead
      ? (isLight ? 'text-amber-900' : 'text-amber-200')
      : (isLight ? 'text-emerald-900' : 'text-emerald-200'),
    badgeBorder: isLowLying
      ? (isLight ? 'border-cyan-300' : 'border-cyan-500/40')
      : isOverhead
      ? (isLight ? 'border-amber-300' : 'border-amber-500/40')
      : (isLight ? 'border-emerald-300' : 'border-emerald-500/40'),
    icon: isLowLying ? '🌊' : isOverhead ? '⚠️' : '⚡'
  };
}
