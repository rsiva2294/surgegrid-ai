import type { TnebSubstation, OutageHistoryEvent, SubstationHealthProfile } from '../types/tneb';
import { type LiveOutage, getOutagesForSubstation } from './liveOutageService';

/**
 * Resiliency cut-off threshold (Health score < 75 denotes Strained/Fragile infrastructure)
 */
export const RESILIENCY_CUTOFF_SCORE = 75;

export function isSubstationAtRisk(substation: TnebSubstation, liveOutages?: LiveOutage[]): boolean {
  const profile = getEnrichedHealthProfile(substation, liveOutages);
  return profile.healthScore < RESILIENCY_CUTOFF_SCORE;
}

/**
 * Evaluates whether a substation is at risk from waterlogging / inundation
 * because its elevation isn't high enough or it sits in a high waterlogging / surge zone.
 */
export function isSubstationWaterloggingRisk(substation: TnebSubstation): boolean {
  if (!substation) return false;
  return (
    substation.riskCategory === 'HIGH_WATERLOGGING_RISK' ||
    substation.riskCategory === 'CRITICAL_SURGE_RISK' ||
    (substation.elevationM !== undefined && substation.elevationM <= 3.2)
  );
}

/**
 * Classifies an outage description into preventive maintenance vs forced trip.
 */
/**
 * Classifies an outage description into preventive maintenance vs forced trip.
 */
export function classifyOutageCategory(workType?: string): 'periodic_maintenance' | 'forced_trip' | 'emergency_repair' {
  if (!workType) return 'forced_trip';
  const wt = workType.toUpperCase();

  // 1. Planned maintenance, civic shifting, conversions, and scheduled rectifications
  if (
    wt.includes('RECTIFICATION') ||
    wt.includes('POLE SHIFTING') ||
    wt.includes('SHIFTING') ||
    wt.includes('CONVERSION') ||
    wt.includes('HEIGHTENING') ||
    wt.includes('RAISING') ||
    wt.includes('MAINTENANCE') ||
    wt.includes('SS MAINTENANCE') ||
    wt.includes('PM') ||
    wt.includes('OVERHAUL') ||
    wt.includes('TREE') ||
    wt.includes('CLEARANCE') ||
    wt.includes('PRE-MONSOON') ||
    wt.includes('SERVICING') ||
    wt.includes('EARTHING') ||
    wt.includes('CAPACITOR') ||
    wt.includes('TESTING') ||
    wt.includes('SHUTDOWN') ||
    wt.includes('SHUT DOWN')
  ) {
    return 'periodic_maintenance';
  }

  // 2. Emergency repairs (non-outage planned repairs)
  if (wt.includes('EMERGENCY REPAIR') || wt.includes('DAMAGE POLE REPLACEMENT')) {
    return 'emergency_repair';
  }

  // 3. Genuine forced trips / equipment failures
  if (
    wt.includes('FAILURE') ||
    wt.includes('FAULT') ||
    wt.includes('TRIP') ||
    wt.includes('TRIPPED') ||
    wt.includes('BREAKDOWN') ||
    wt.includes('FIRE') ||
    wt.includes('PUNCTURE') ||
    wt.includes('BURNT') ||
    wt.includes('SNAP') ||
    wt.includes('DISC') ||
    wt.includes('JUMPER CUT')
  ) {
    return 'forced_trip';
  }

  return 'periodic_maintenance';
}

/**
 * Classifies operational scope:
 * - 'yard_core': Services the parent substation directly (transformers, busbars, circuit breakers, switchgear, plinth).
 * - 'feeder_corridor': Services downstream sub-infra lines radiating outward (tree trimming, insulators, cables, jumpers).
 * - 'lt_street': Localized street-level low-tension distribution (pillar heightening, pillar maintenance, fuse, LT cable).
 */
export function classifyScope(workType?: string, feeder?: string): 'yard_core' | 'feeder_corridor' | 'lt_street' {
  if (!workType) return feeder ? 'feeder_corridor' : 'yard_core';
  const wt = workType.toUpperCase();

  // 1. Street-level Low Tension (LT) & Pillar works
  if (
    wt.includes('PILLAR') ||
    wt.includes('LT ') ||
    wt.includes('LT CABLE') ||
    wt.includes('LT CONDUCTOR') ||
    wt.includes('STREET') ||
    wt.includes('SERVICE WIRE') ||
    wt.includes('CONSUMER') ||
    wt.includes('FUSE')
  ) {
    return 'lt_street';
  }

  // 2. Bulk High-Voltage Switchyard Core
  if (
    wt.includes('TRANSFORMER') ||
    wt.includes('OIL') ||
    wt.includes('BUSBAR') ||
    wt.includes('BREAKER') ||
    wt.includes('SWITCHGEAR') ||
    wt.includes('EARTHING') ||
    wt.includes('SS MAINTENANCE') ||
    wt.includes('SUBSTATION') ||
    wt.includes('BATTERY') ||
    wt.includes('PLINTH') ||
    wt.includes('THERMOGRAPHY')
  ) {
    return 'yard_core';
  }

  // 3. Medium-Voltage Feeder Corridor lines
  return 'feeder_corridor';
}

/**
 * Normalizes any incoming date string (e.g. DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD)
 * to standard ISO YYYY-MM-DD format for reliable comparison, sorting, and storage.
 */
export function normalizeToISODate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  // If YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

/**
 * Formats any date string into an executive, uniform display string: "DD MMM YYYY" (e.g. "27 Sep 2026")
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const iso = normalizeToISODate(dateStr);
  const parts = iso.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(m, 10) - 1;
    const monthName = months[monthIdx] || m;
    return `${d} ${monthName} ${y}`;
  }
  return dateStr;
}

/**
 * Standardizes event date parsing and computes age in days relative to current evaluation date.
 */
export function getEventAgeInDays(dateStr: string, referenceDateStr?: string): number {
  if (!dateStr) return 90;
  try {
    const isoDate = normalizeToISODate(dateStr);
    const eventTime = new Date(isoDate).getTime();
    // Dynamically default to current system date so event age and penalties automatically decay as calendar days advance
    const todayIso = new Date().toISOString().slice(0, 10);
    const refDate = referenceDateStr || todayIso;
    const refTime = new Date(refDate).getTime();
    const diffDays = Math.round((refTime - eventTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 60;
  }
}

/**
 * Computes a calibrated SubstationHealthProfile from a 90-day event list taking into account:
 * 1. Scope-based base penalties: yard_core (18), feeder_corridor (8 * feederFactor), lt_street (3)
 * 2. Feeder scale normalization: radial line trip penalty scales as 4 / sqrt(feederCount)
 * 3. Recency decay: live/1d (1.25x), <=14d (1.0x), 15-45d (0.75x), >45d (0.50x)
 * 4. Post-trip maintenance relief: subsequent PM provides 45% relief (0.55x) on past trip penalty
 * 5. Proactive maintenance credits: up to +12 points across yard, feeder, and street upkeep
 * 6. Clean operating streak bonus: +3 points for 60+ days without trips
 * 7. Maintenance neglect penalties: -12 for 0 PM with trips; -6 for unaddressed trip after last PM
 */
export function computeHealthProfile(
  events: OutageHistoryEvent[] = [],
  fallbackOutageCount = 0,
  feederCount = 10
): SubstationHealthProfile {
  let resolvedEvents: OutageHistoryEvent[] = events.map(e => ({
    ...e,
    date: normalizeToISODate(e.date),
    scope: e.scope || classifyScope(e.workType, e.feeder)
  }));

  // If no detailed events are stored yet but a historical count exists
  if (resolvedEvents.length === 0 && fallbackOutageCount > 0) {
    const pmCount = Math.max(1, Math.round(fallbackOutageCount * 0.65));
    const tripCount = Math.max(0, fallbackOutageCount - pmCount);

    const dates = ['2026-09-04', '2026-08-20', '2026-08-05', '2026-07-28', '2026-07-10'];
    const pmTypes = [
      { name: 'Power Transformer Oil Filtration & Testing', scope: 'yard_core' as const },
      { name: 'Pre-Monsoon Feeder Corridor Tree Trimming', scope: 'feeder_corridor' as const },
      { name: 'Scheduled SS Maintenance & Busbar Inspection', scope: 'yard_core' as const },
      { name: 'Breaker Contact Servicing & Earthing Audit', scope: 'yard_core' as const }
    ];
    const tripTypes = [
      { name: '11kV Feeder Transient Tripping (Overload)', scope: 'feeder_corridor' as const },
      { name: 'Tree Branch Flashover during High Winds', scope: 'feeder_corridor' as const },
      { name: 'Insulator Puncture & Section Isolation', scope: 'feeder_corridor' as const }
    ];

    for (let i = 0; i < pmCount; i++) {
      const pmType = pmTypes[i % pmTypes.length];
      resolvedEvents.push({
        id: `pm-gen-${i}`,
        date: dates[i % dates.length],
        workType: pmType.name,
        category: 'periodic_maintenance',
        scope: pmType.scope,
        timing: '09:00 - 14:00',
        durationHours: 5,
        location: 'Substation Switchyard'
      });
    }

    for (let j = 0; j < tripCount; j++) {
      const tripType = tripTypes[j % tripTypes.length];
      resolvedEvents.push({
        id: `trip-gen-${j}`,
        date: dates[(j + pmCount) % dates.length],
        workType: tripType.name,
        category: 'forced_trip',
        scope: tripType.scope,
        timing: '15:30 - 17:00',
        durationHours: 1.5,
        location: 'Feeder Line Corridor'
      });
    }
  }

  // Sort descending by date (most recent first)
  resolvedEvents.sort((a, b) => b.date.localeCompare(a.date));

  let periodicMaintenanceCount = 0;
  let yardCoreMaintenanceCount = 0;
  let feederMaintenanceCount = 0;
  let ltStreetMaintenanceCount = 0;
  let unscheduledTripsCount = 0;
  let lastMaintenanceDate: string | undefined;
  let lastTripDate: string | undefined;

  for (const e of resolvedEvents) {
    if (e.category === 'periodic_maintenance') {
      periodicMaintenanceCount++;
      if (e.scope === 'yard_core') yardCoreMaintenanceCount++;
      else if (e.scope === 'lt_street') ltStreetMaintenanceCount++;
      else feederMaintenanceCount++;

      if (!lastMaintenanceDate || e.date > lastMaintenanceDate) {
        lastMaintenanceDate = e.date;
      }
    } else {
      unscheduledTripsCount++;
      if (!lastTripDate || e.date > lastTripDate) {
        lastTripDate = e.date;
      }
    }
  }

  // Base score: 100 (Represents a clean, fully resilient operational baseline)
  let score = 100;
  const numFeeders = Math.max(1, feederCount);

  // 1. TRIP PENALTIES WITH SCOPE WEIGHTING, FEEDER NORMALIZATION, RECENCY DECAY & POST-TRIP RELIEF
  for (const e of resolvedEvents) {
    if (e.category === 'periodic_maintenance') continue;

    const ageDays = getEventAgeInDays(e.date);
    let basePenalty = 0;

    if (e.scope === 'yard_core') {
      // Primary switchyard equipment breakdown
      basePenalty = 18;
    } else if (e.scope === 'feeder_corridor') {
      // 11kV Radial feeder line trip - normalized by substation network scale
      const feederFactor = Math.max(0.45, Math.min(1.0, 4 / Math.sqrt(numFeeders)));
      basePenalty = 8 * feederFactor; // ~3.6 to 8 points per feeder trip
    } else {
      // Local LT street distribution pillar / fuse issue
      basePenalty = 3;
    }

    // Recency decay:
    let recencyFactor = 1.0;
    if (e.isLiveActive || ageDays <= 1) recencyFactor = 1.25;
    else if (ageDays <= 14) recencyFactor = 1.0;
    else if (ageDays <= 45) recencyFactor = 0.75;
    else recencyFactor = 0.50;

    let penalty = basePenalty * recencyFactor;

    // Post-Trip Maintenance Relief:
    // If maintenance occurred chronologically AFTER the trip, apply 45% relief (0.55 multiplier)
    const hasPostTripPM = resolvedEvents.some(
      pm => pm.category === 'periodic_maintenance' && pm.date > e.date
    );
    if (hasPostTripPM) {
      penalty *= 0.55;
    }

    score -= penalty;
  }

  // 2. PROACTIVE MAINTENANCE CREDITS (rewards active upkeep across corridors)
  const yardCredits = Math.min(6, yardCoreMaintenanceCount * 2);
  const feederCredits = Math.min(6, feederMaintenanceCount * 1.5);
  const ltCredits = Math.min(3, ltStreetMaintenanceCount * 1);
  score += Math.min(12, yardCredits + feederCredits + ltCredits);

  // 3. CLEAN OPERATING STREAK BONUS (for zero-trip operations)
  let cleanStreakDays = 90;
  if (lastTripDate) {
    cleanStreakDays = getEventAgeInDays(lastTripDate);
  }
  if (cleanStreakDays >= 60 && periodicMaintenanceCount > 0 && unscheduledTripsCount === 0) {
    score += 3;
  }

  // 4. NEGLECT & UNRESOLVED PENALTIES
  if (periodicMaintenanceCount === 0 && unscheduledTripsCount > 0) {
    score -= 12; // Unaddressed trips with zero PM in 90 days
  }
  if (unscheduledTripsCount > 0 && lastTripDate && (!lastMaintenanceDate || lastMaintenanceDate < lastTripDate)) {
    score -= 6; // Unresolved vulnerability: trip happened after last PM
  }

  // Score clamping between 15 and 100
  const healthScore = Math.max(15, Math.min(100, Math.round(score)));

  // Health Grade Mapping
  let healthGrade: 'A' | 'B' | 'C' | 'D' = 'A';
  let disasterRiskMultiplier = 1.0;

  if (healthScore >= 85) {
    healthGrade = 'A';
    disasterRiskMultiplier = 1.0;
  } else if (healthScore >= 75) {
    healthGrade = 'B';
    disasterRiskMultiplier = 1.10;
  } else if (healthScore >= 55) {
    healthGrade = 'C';
    disasterRiskMultiplier = 1.25;
  } else {
    healthGrade = 'D';
    disasterRiskMultiplier = 1.45;
  }

  return {
    totalOutages90d: periodicMaintenanceCount + unscheduledTripsCount,
    periodicMaintenanceCount,
    unscheduledTripsCount,
    yardCoreMaintenanceCount,
    feederMaintenanceCount,
    ltStreetMaintenanceCount,
    cleanStreakDays,
    healthScore,
    healthGrade,
    disasterRiskMultiplier,
    lastMaintenanceDate,
    lastTripDate,
    events: resolvedEvents
  };
}

/**
 * Calculates dynamic disaster failure risk based on physical flood/wind risk
 * modulated by operational asset health.
 */
export function calculateDynamicRisk(
  baseRisk: number = 20,
  healthProfile?: SubstationHealthProfile,
  disasterScenario: string = 'NORMAL'
): { finalRisk: number; multiplier: number; rationale: string } {
  if (disasterScenario === 'NORMAL' || !healthProfile) {
    return {
      finalRisk: baseRisk,
      multiplier: 1.0,
      rationale: 'Baseline operational risk under normal grid dispatch conditions.'
    };
  }

  const multiplier = healthProfile.disasterRiskMultiplier;
  const finalRisk = Math.min(100, Math.round(baseRisk * multiplier));

  let rationale = '';
  if (healthProfile.healthGrade === 'A') {
    rationale = `Asset Health Grade A (${healthProfile.healthScore}/100, ${healthProfile.periodicMaintenanceCount} PMs, ${healthProfile.cleanStreakDays || 30}d clean streak): Proactive maintenance provides high operational resilience against environmental stress.`;
  } else if (healthProfile.healthGrade === 'B') {
    rationale = `Asset Health Grade B (${healthProfile.healthScore}/100): Healthy switchyard with past events addressed by maintenance; resilient against flood stress.`;
  } else if (healthProfile.healthGrade === 'C') {
    rationale = `Asset Health Grade C (<75 Resiliency cut-off, ${healthProfile.unscheduledTripsCount} trips): Strained sub-infra or recent unhealed trips elevate disaster failure risk by ${multiplier}x.`;
  } else {
    rationale = `Asset Health Grade D (${healthProfile.unscheduledTripsCount} trips, neglected PM): Chronic tripping and unaddressed faults compound flood hazard; high priority for emergency inspection.`;
  }

  return { finalRisk, multiplier, rationale };
}

/**
 * Merges real-time live outages into the 90-day history profile.
 */
export function getEnrichedHealthProfile(
  substation: TnebSubstation,
  liveOutages: LiveOutage[] = []
): SubstationHealthProfile {
  const existingEvents: OutageHistoryEvent[] = substation.healthProfile?.events || substation.outageHistory || [];
  
  // Filter live outages matching this specific substation
  const matchingOutages = getOutagesForSubstation(substation, liveOutages);
  const activeEvents: OutageHistoryEvent[] = matchingOutages.map(o => ({
    id: o.outageFingerprint || `live-${normalizeToISODate(o.date)}-${o.substation}`,
    date: normalizeToISODate(o.date),
    workType: o.workType || 'Active Grid Outage',
    category: classifyOutageCategory(o.workType),
    scope: classifyScope(o.workType, o.feeder),
    timing: o.fromTime && o.toTime ? `${o.fromTime} - ${o.toTime}` : undefined,
    location: o.location,
    feeder: o.feeder,
    isLiveActive: true
  }));

  // Deduplicate against existing events by normalized date and workType
  const mergedEvents = [
    ...activeEvents,
    ...existingEvents.filter(e => {
      const eDate = normalizeToISODate(e.date);
      return !activeEvents.some(a => a.date === eDate && a.workType === e.workType);
    })
  ];

  return computeHealthProfile(
    mergedEvents,
    substation.historicalOutagesCount || 0,
    (substation.feeders || []).length
  );
}
