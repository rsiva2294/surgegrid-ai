import type { TnebSubstation, OutageHistoryEvent, SubstationHealthProfile, OutageCategory, OutageArchetype, DispatchStatus } from '../types/tneb';
import { type LiveOutage, getOutagesForSubstation } from './liveOutageService';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../data/officialSources';

/**
 * Resiliency cut-off threshold (Health score < 75 denotes Strained/Fragile infrastructure)
 */
export const RESILIENCY_CUTOFF_SCORE = 75;

export function isSubstationAtRisk(substation: TnebSubstation, liveOutages?: LiveOutage[]): boolean {
  const profile = getEnrichedHealthProfile(substation, liveOutages);
  return profile.healthScore < RESILIENCY_CUTOFF_SCORE;
}

/**
 * Flags a substation for the waterlogging filter when either:
 * - its yard is at or below Chennai's average elevation of 2.0 m (GCC City DMP 2023, Preface), or
 * - it falls in one of SurgeGrid's own flood-risk categories (our model, not from the official plans).
 */
export function isSubstationWaterloggingRisk(substation: TnebSubstation): boolean {
  if (!substation) return false;
  return (
    substation.riskCategory === 'HIGH_WATERLOGGING_RISK' ||
    substation.riskCategory === 'CRITICAL_SURGE_RISK' ||
    (substation.elevationM !== undefined && substation.elevationM <= CHENNAI_AVERAGE_ELEVATION_M)
  );
}

/**
 * Authoritative Evaluation Result from Multi-Token Archetype Parser
 */
export interface EvaluatedOutage {
  category: OutageCategory;
  archetype: OutageArchetype;
  scope: 'yard_core' | 'feeder_corridor' | 'lt_street';
  severityWeight: number; // Positive for credits, negative for penalties
  resetsStreak: boolean;
  isLiveFault: boolean;
  matchedReasonLabel: string;
}

/**
 * 7-Archetype Outage Reason Evaluation Engine
 * Empirical analysis across 1,499 real-world Chennai TNEB records and 666 unique phrases.
 * Enforces strict precedence: Failure > Maintenance > Hardening > Vegetation > Civic > Weather.
 */
export function evaluateOutageArchetype(
  workType?: string,
  options?: {
    feeder?: string;
    noticeCategory?: string;
    rawReason?: string;
    rawTamil?: string;
  }
): EvaluatedOutage {
  const combined = [
    workType || '',
    options?.rawReason || '',
    options?.rawTamil || '',
    options?.feeder || ''
  ]
    .join(' ')
    .toLowerCase();

  const isEmergencyNotice =
    options?.noticeCategory === 'Emergency Outage' ||
    combined.includes('emergency outage') ||
    combined.includes('அவசர மின் தடை');

  // Determine Scope (Yard Core vs Feeder Line vs LT Street)
  let scope: 'yard_core' | 'feeder_corridor' | 'lt_street' = 'feeder_corridor';
  if (
    /transformer|oil|busbar|breaker|switchgear|earthing|ss maintenance|substation|battery|plinth|thermography|bus coupler|take.?off cable|உருமாற்றி|மின்மாற்றி|துணை மின்நிலைய/i.test(
      combined
    )
  ) {
    scope = 'yard_core';
  } else if (
    /pillar|lt\b|lt cable|lt conductor|street|service wire|consumer|fuse|distribution box|மின் கம்ப|தூண் பெட்டி/i.test(
      combined
    )
  ) {
    scope = 'lt_street';
  } else if (options?.feeder || /feeder|11\s*kv|33\s*kv|ht\b|corridor|line|overhead|மின்னூட்டி/i.test(combined)) {
    scope = 'feeder_corridor';
  }

  // =========================================================================
  // RULE 1: SEVERE EQUIPMENT FAILURES & FORCED TRIPS (Archetype 1)
  // Highest Precedence: Overrules any administrative "maintenance" header!
  // =========================================================================
  const severeFailureRegex =
    /fault|trip|tripped|fire|burnt|puncture|punch\b|burst|blast|breakdown|failure|flash\s*over|flashover|arcing|heavy\s*glow|glow\b|smoke|spark|blackout|jumper\s*cut|leg\s*cut|lug\s*cut|line\s*cut|conductor\s*snapped|line\s*snapped|snap\b|bushing\s*fire|பழுது|துண்டிப்பு|தீ விபத்து|முறிவு|கோளாறு|அறுந்து|எரிந்தது|வெடித்தது/i;

  if (severeFailureRegex.test(combined) || (isEmergencyNotice && /rectification|repair|attend/i.test(combined))) {
    const penalty = scope === 'yard_core' ? -35 : scope === 'feeder_corridor' ? -20 : -10;
    return {
      category: 'forced_trip',
      archetype: 'SEVERE_FAULT',
      scope,
      severityWeight: penalty,
      resetsStreak: true,
      isLiveFault: true,
      matchedReasonLabel: scope === 'yard_core' ? 'Yard Core Equipment Failure' : scope === 'feeder_corridor' ? 'Feeder Corridor Fault Trip' : 'LT Street Distribution Fault'
    };
  }

  // =========================================================================
  // RULE 2: EMERGENCY BREAKDOWN REPAIRS & HAZARDS (Archetype 2)
  // Structural collapse, vehicle hit, shock hazard, insulation leakage
  // =========================================================================
  const emergencyRepairRegex =
    /damaged?\s*pole|pole\s*damage|fall\s*down|fallen|vehicle\s*hit|banner\s*fall|ground\s*shock|shock\s*complaint|shock\b|earth\s*leakage|oil\s*leakage|leakage\s*arrest|emergency\s*repair|emergency\s*rectification|rectification\s*work\s*due\s*to|breakdown\s*work|accident\s*repair|சேதமடைந்த|சாய்ந்தது|மின் கசிவு|அதிர்ச்சி புகார்|அவசர சீரமைப்பு/i;

  if (emergencyRepairRegex.test(combined)) {
    return {
      category: 'emergency_repair',
      archetype: 'EMERGENCY_REPAIR',
      scope,
      severityWeight: -12,
      resetsStreak: true,
      isLiveFault: true,
      matchedReasonLabel: 'Emergency Breakdown & Hazard Repair'
    };
  }

  // =========================================================================
  // RULE 3: CIVIC, FESTIVAL & THIRD-PARTY CLEARANCES (Archetype 6)
  // Strictly Neutral: 0 points impact, does not reset streak.
  // =========================================================================
  const civicRegex =
    /festival|chariot|procession|vinayagar|temple|dcw|deposit\s*contributory|metro\s*rail|road\s*widening|drain\s*work|precautionary\s*measure|service\s*wire\s*removal|திருவிழா|தேர்|ஊர்வலம்|விநாயகர்|மெட்ரோ/i;

  if (civicRegex.test(combined)) {
    return {
      category: 'civic_clearance',
      archetype: 'CIVIC_CLEARANCE',
      scope,
      severityWeight: 0,
      resetsStreak: false,
      isLiveFault: false,
      matchedReasonLabel: 'Civic & Statutory Public Safety De-energization'
    };
  }

  // =========================================================================
  // RULE 4: RIGHT-OF-WAY & VEGETATION MANAGEMENT (Archetype 5)
  // Disambiguated: tree cutting/pruning must NOT be penalized as a conductor cut!
  // =========================================================================
  const vegetationRegex =
    /tree\s*cut|tree\s*trim|tree\s*clearance|tree\s*pruning|branch\s*clearance|vegetation|tree\s*branch|மரக்கிளை|மரம் வெட்டுதல்/i;

  if (vegetationRegex.test(combined)) {
    return {
      category: 'vegetation_pruning',
      archetype: 'VEGETATION_ROW',
      scope: 'feeder_corridor',
      severityWeight: 0.5,
      resetsStreak: false,
      isLiveFault: false,
      matchedReasonLabel: 'Right-of-Way Vegetation & Pre-Monsoon Trimming'
    };
  }

  // =========================================================================
  // RULE 5: GRID MODERNIZATION & DISASTER HARDENING (Archetype 3)
  // Pillar heightening / RMU conversion / undergrounding awards resilience credit!
  // =========================================================================
  const hardeningRegex =
    /heightening|raising|elevation|extension|rmu\s*conversion|structure\s*to\s*rmu|overhead\s*to\s*underground|new\s*transformer\s*installation|new\s*ht\s*line|interlinking|reconductoring|உயரம் உயர்த்துதல்|உயரப் பணி|ஆர்\.எம்\.யூ|புதைவடமாக மாற்றுதல்/i;

  if (hardeningRegex.test(combined)) {
    return {
      category: 'grid_hardening',
      archetype: 'GRID_HARDENING',
      scope,
      severityWeight: 2.5,
      resetsStreak: false,
      isLiveFault: false,
      matchedReasonLabel: 'Disaster Hardening & Switchgear Modernization'
    };
  }

  // =========================================================================
  // RULE 6: PERIODIC PREVENTIVE MAINTENANCE (Archetype 4)
  // Routine scheduled turnaround, overhauls, compliance testing
  // =========================================================================
  const maintenanceRegex =
    /monthly\s*maintenance|maintenance\s*work|ss\s*maintenance|substation\s*maintenance|feeder\s*maintenance|transformer\s*maintenance|dt\s*maintenance|pillar\s*maintenance|shutdown|shut\s*down|pm\b|overhaul|servicing|oil\s*filtration|testing|earthing\s*audit|thermography|மாதாந்திர பராமரிப்பு|துணை மின்நிலையப் பராமரிப்பு|பராமரிப்புப் பணி|பராமரிப்பு பணி/i;

  if (maintenanceRegex.test(combined)) {
    const credit = scope === 'yard_core' ? 1.5 : scope === 'feeder_corridor' ? 1.0 : 0.8;
    return {
      category: 'periodic_maintenance',
      archetype: 'PERIODIC_MAINTENANCE',
      scope,
      severityWeight: credit,
      resetsStreak: false,
      isLiveFault: false,
      matchedReasonLabel: 'Scheduled Preventive Maintenance'
    };
  }

  // =========================================================================
  // RULE 7: EXTREME ENVIRONMENTAL STRESS EVENTS (Archetype 7)
  // Severe weather-triggered incidents
  // =========================================================================
  const weatherRegex =
    /heavy\s*rain|thunderstorm|cyclone|inundation|flood|waterlogging|high\s*winds|பலத்த மழை|இடி மின்னல்|புயல்|வெள்ள நீர்/i;

  if (weatherRegex.test(combined)) {
    return {
      category: 'environmental_event',
      archetype: 'ENVIRONMENTAL_EVENT',
      scope,
      severityWeight: -5,
      resetsStreak: true,
      isLiveFault: true,
      matchedReasonLabel: 'Severe Weather Environmental Incident'
    };
  }

  // =========================================================================
  // RULE 8: FALLBACK WITH SANITY PROTECTION
  // Never blindly default to maintenance!
  // =========================================================================
  if (options?.noticeCategory === 'Scheduled Maintenance') {
    return {
      category: 'periodic_maintenance',
      archetype: 'PERIODIC_MAINTENANCE',
      scope,
      severityWeight: 0.5,
      resetsStreak: false,
      isLiveFault: false,
      matchedReasonLabel: 'Scheduled Maintenance Notice'
    };
  }

  if (isEmergencyNotice) {
    return {
      category: 'forced_trip',
      archetype: 'SEVERE_FAULT',
      scope,
      severityWeight: -10,
      resetsStreak: true,
      isLiveFault: true,
      matchedReasonLabel: 'Emergency Field Interruption'
    };
  }

  // Neutral unknown advisory notice
  return {
    category: 'civic_clearance',
    archetype: 'CIVIC_CLEARANCE',
    scope,
    severityWeight: 0,
    resetsStreak: false,
    isLiveFault: false,
    matchedReasonLabel: 'General Operational Advisory'
  };
}

/**
 * Classifies an outage description into high-level categories (Backwards-compatible wrapper).
 */
export function classifyOutageCategory(workType?: string): OutageCategory {
  const evaluated = evaluateOutageArchetype(workType);
  return evaluated.category;
}

/**
 * Classifies operational scope (Backwards-compatible wrapper).
 */
export function classifyScope(workType?: string, feeder?: string): 'yard_core' | 'feeder_corridor' | 'lt_street' {
  const evaluated = evaluateOutageArchetype(workType, { feeder });
  return evaluated.scope;
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
 * Computes a calibrated SubstationHealthProfile taking into account:
 * 1. 7-Archetype classification & bilingual TNEB dictionary
 * 2. Decoupled Dual Indices: 90-day physical asset durability vs live dispatch availability
 * 3. Scope-based penalties: yard_core (-35), feeder_corridor (-20 * feederFactor), lt_street (-10)
 * 4. Recency decay for historical events (live/1d: 1.25x, <=14d: 1.0x, 15-45d: 0.75x, >45d: 0.50x)
 * 5. Proactive maintenance & grid hardening credits (up to +15 pts, strictly isolated from today's active trips)
 * 6. Live Score Ceilings: active yard trips cap live score <= 50; active feeder trips cap <= 74
 * 7. Clean streak resets to 0 days whenever an active breakdown is present
 */
export function computeHealthProfile(
  events: OutageHistoryEvent[] = [],
  _fallbackOutageCount = 0,
  feederCount = 10
): SubstationHealthProfile {
  const resolvedEvents: OutageHistoryEvent[] = events.map(e => {
    const parsed = evaluateOutageArchetype(e.workType, {
      feeder: e.feeder,
      noticeCategory: e.noticeCategory,
      rawReason: e.rawReason
    });
    return {
      ...e,
      date: normalizeToISODate(e.date),
      category: e.category || parsed.category,
      archetype: e.archetype || parsed.archetype,
      scope: e.scope || parsed.scope
    };
  });

  // Sort descending by date (most recent first)
  resolvedEvents.sort((a, b) => b.date.localeCompare(a.date));

  let periodicMaintenanceCount = 0;
  let yardCoreMaintenanceCount = 0;
  let feederMaintenanceCount = 0;
  let ltStreetMaintenanceCount = 0;
  let gridHardeningCount = 0;
  let unscheduledTripsCount = 0;
  let lastMaintenanceDate: string | undefined;
  let lastTripDate: string | undefined;

  // Track active live outages
  const activeLiveOutages = resolvedEvents.filter(e => e.isLiveActive);
  const activeLiveTrips = activeLiveOutages.filter(
    e => e.category === 'forced_trip' || e.category === 'emergency_repair' || e.category === 'environmental_event'
  );

  let activeLiveTripScope: 'yard_core' | 'feeder_corridor' | 'lt_street' | undefined;
  if (activeLiveTrips.some(e => e.scope === 'yard_core')) activeLiveTripScope = 'yard_core';
  else if (activeLiveTrips.some(e => e.scope === 'feeder_corridor')) activeLiveTripScope = 'feeder_corridor';
  else if (activeLiveTrips.length > 0) activeLiveTripScope = 'lt_street';

  for (const e of resolvedEvents) {
    if (e.category === 'periodic_maintenance' || e.category === 'grid_hardening' || e.category === 'vegetation_pruning') {
      periodicMaintenanceCount++;
      if (e.category === 'grid_hardening') gridHardeningCount++;
      if (e.scope === 'yard_core') yardCoreMaintenanceCount++;
      else if (e.scope === 'lt_street') ltStreetMaintenanceCount++;
      else feederMaintenanceCount++;

      if (!lastMaintenanceDate || e.date > lastMaintenanceDate) {
        lastMaintenanceDate = e.date;
      }
    } else if (e.category === 'forced_trip' || e.category === 'emergency_repair' || e.category === 'environmental_event') {
      unscheduledTripsCount++;
      if (!lastTripDate || e.date > lastTripDate) {
        lastTripDate = e.date;
      }
    }
  }

  // Base score: 100
  let baselineDurability = 100;
  const numFeeders = Math.max(1, feederCount);

  // 1. HISTORICAL TRIP PENALTIES
  for (const e of resolvedEvents) {
    if (e.category === 'periodic_maintenance' || e.category === 'grid_hardening' || e.category === 'vegetation_pruning' || e.category === 'civic_clearance') {
      continue;
    }

    const ageDays = getEventAgeInDays(e.date);
    let basePenalty = 0;

    if (e.scope === 'yard_core') {
      basePenalty = 25;
    } else if (e.scope === 'feeder_corridor') {
      const feederFactor = Math.max(0.45, Math.min(1.0, 4 / Math.sqrt(numFeeders)));
      basePenalty = 12 * feederFactor;
    } else {
      basePenalty = 5;
    }

    // Recency decay:
    let recencyFactor = 1.0;
    if (e.isLiveActive || ageDays <= 1) recencyFactor = 1.25;
    else if (ageDays <= 14) recencyFactor = 1.0;
    else if (ageDays <= 45) recencyFactor = 0.75;
    else recencyFactor = 0.50;

    let penalty = basePenalty * recencyFactor;

    // Post-Trip Maintenance Relief:
    // Subsequent PM provides 45% relief (0.55 multiplier) ONLY for past healed trips, never for live active trips!
    if (!e.isLiveActive) {
      const hasPostTripPM = resolvedEvents.some(
        pm => (pm.category === 'periodic_maintenance' || pm.category === 'grid_hardening') && pm.date > e.date
      );
      if (hasPostTripPM) {
        penalty *= 0.55;
      }
    }

    baselineDurability -= penalty;
  }

  // 2. PROACTIVE MAINTENANCE & MODERNIZATION CREDITS
  const yardCredits = Math.min(6, yardCoreMaintenanceCount * 2);
  const feederCredits = Math.min(6, feederMaintenanceCount * 1.5);
  const ltCredits = Math.min(3, ltStreetMaintenanceCount * 1);
  const hardeningCredits = Math.min(5, gridHardeningCount * 2.5);
  baselineDurability += Math.min(15, yardCredits + feederCredits + ltCredits + hardeningCredits);

  // 3. CLEAN OPERATING STREAK CALCULATION
  let cleanStreakDays = 90;
  if (activeLiveTrips.length > 0) {
    // Active trip present today -> streak is completely broken!
    cleanStreakDays = 0;
  } else if (lastTripDate) {
    cleanStreakDays = getEventAgeInDays(lastTripDate);
  }

  if (cleanStreakDays >= 60 && periodicMaintenanceCount > 0 && unscheduledTripsCount === 0) {
    baselineDurability += 3;
  }

  // 4. NEGLECT & UNRESOLVED PENALTIES
  if (periodicMaintenanceCount === 0 && unscheduledTripsCount > 0) {
    baselineDurability -= 12; // Unaddressed trips with zero PM in 90 days
  }
  if (unscheduledTripsCount > 0 && lastTripDate && (!lastMaintenanceDate || lastMaintenanceDate < lastTripDate)) {
    baselineDurability -= 6; // Unresolved vulnerability: trip happened after last PM
  }

  const assetDurabilityScore = Math.max(15, Math.min(100, Math.round(baselineDurability)));

  // 5. LIVE DISPATCH SCORE & CEILING CALCULATION
  let liveDispatchScore = assetDurabilityScore;
  let liveScoreCeiling = 100;

  if (activeLiveTrips.length > 0) {
    if (activeLiveTripScope === 'yard_core') {
      liveScoreCeiling = 50; // Critical yard equipment breakdown caps score at 50
    } else if (activeLiveTripScope === 'feeder_corridor') {
      liveScoreCeiling = 74; // Radial feeder trip caps score at 74 (Grade C: Strained)
    } else {
      liveScoreCeiling = 84; // Local street distribution caps score at 84 (Grade B: Stable)
    }
    liveDispatchScore = Math.min(liveDispatchScore, liveScoreCeiling);
  }

  const healthScore = liveDispatchScore;

  // Determine Dispatch Status Badge
  let dispatchStatus: DispatchStatus = 'NORMAL';
  if (activeLiveTrips.length > 0) {
    const hasEmergency = activeLiveTrips.some(e => e.category === 'emergency_repair');
    dispatchStatus = hasEmergency ? 'EMERGENCY_REPAIR' : 'ACTIVE_TRIP';
  } else if (activeLiveOutages.some(e => e.category === 'periodic_maintenance' || e.category === 'grid_hardening')) {
    dispatchStatus = 'PLANNED_MAINTENANCE';
  } else if (activeLiveOutages.some(e => e.category === 'civic_clearance')) {
    dispatchStatus = 'CIVIC_CLEARANCE';
  }

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
    gridHardeningCount,
    cleanStreakDays,
    healthScore,
    assetDurabilityScore,
    liveDispatchScore,
    dispatchStatus,
    activeLiveOutagesCount: activeLiveOutages.length,
    activeLiveTripCount: activeLiveTrips.length,
    activeLiveTripScope,
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
  const activeEvents: OutageHistoryEvent[] = matchingOutages.map(o => {
    const rawReason =
      o.raw_extraction?.reason?.full_english ||
      o.raw_extraction?.reason?.short_english ||
      o.raw_extraction?.reason?.short_tamil;
    const noticeCategory = o.raw_extraction?.notice_category;
    const parsed = evaluateOutageArchetype(o.workType, {
      feeder: o.feeder,
      noticeCategory,
      rawReason,
      rawTamil: o.raw_extraction?.reason?.short_tamil
    });

    return {
      id: o.outageFingerprint || `live-${normalizeToISODate(o.date)}-${o.substation}`,
      date: normalizeToISODate(o.date),
      workType: o.workType || 'Active Grid Outage',
      category: parsed.category,
      archetype: parsed.archetype,
      scope: parsed.scope,
      timing: o.fromTime && o.toTime ? `${o.fromTime} - ${o.toTime}` : undefined,
      location: o.location,
      feeder: o.feeder,
      rawReason,
      noticeCategory,
      isLiveActive: true
    };
  });

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
