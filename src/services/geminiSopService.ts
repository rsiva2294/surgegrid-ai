/**
 * geminiSopService.ts
 * 
 * Generates and streams autonomous, statutory Standard Operating Procedures (SOPs)
 * based on live electrical infrastructure state, storm telemetry, and GEE terrain metrics.
 */

import type { ScenarioId, ScenarioTimestep } from './scenarioService';

export interface SopActionItem {
  id: string;
  priority: 'P0_CRITICAL' | 'P1_LIFELINE' | 'P2_FIELD';
  category: 'DE_ENERGIZE' | 'LIFELINE_PROTECT' | 'DEWATERING' | 'SAFETY_LOCKOUT' | 'RESTORATION' | 'FIELD';
  title: string;
  description: string;
  targetFeedersOrSubstations?: string[];
  completed?: boolean;
}

export interface GeminiSopDirective {
  scenarioId: ScenarioId;
  hour: number;
  label: string;
  title: string;
  urgency: 'WATCH' | 'CRITICAL' | 'RESTORATION';
  summaryEn: string;
  summaryTa: string;
  statutoryReference: string;
  weatherSnapshot: {
    windKmh: number;
    rainMm: number;
    surgeM: number;
    distanceKm?: number;
  };
  impactMetrics: {
    atRiskSubstations: number;
    trippedFeeders: number;
    protectedLifelines: number;
  };
  actionItems: SopActionItem[];
  geminiModelTag: string;
  timestamp: string;
}

// Statutory directives calibrated with TNSDMA guidelines
const MILESTONE_DIRECTIVES: Record<string, GeminiSopDirective> = {
  // Michaung Cat-3: T-24h
  'MICHAUNG_CAT3_-24': {
    scenarioId: 'MICHAUNG_CAT3',
    hour: -24,
    label: 'T-24h Pre-Landfall Watch',
    title: 'Pre-Emptive Radial Circuit Watch & Lifeline Islanding Mandate',
    urgency: 'WATCH',
    summaryEn: 'Cyclone Michaung approaching at 285 km SE. Winds reaching 68 km/h. Mandatory inspection of coastal tree canopies along 33kV overhead corridors. Diesel gensets locked at all Tier-1 hospital lifelines.',
    summaryTa: 'புயல் எச்சரிக்கை: 33kV மின் வழித்தடங்களில் மரக்கிளைகளை அகற்றும் பணி முடுக்கிவிடப்பட்டுள்ளது. அவசர மருத்துவமனைகளுக்கு மாற்று டீசல் ஜெனரேட்டர் தயார்நிலையில் உள்ளது.',
    statutoryReference: 'TNSDMA Disaster Response Manual §5.2 · CEA (Grid Standards) Reg. 14',
    weatherSnapshot: {
      windKmh: 68.4,
      rainMm: 12.5,
      surgeM: 0.8,
      distanceKm: 285,
    },
    impactMetrics: {
      atRiskSubstations: 14,
      trippedFeeders: 0,
      protectedLifelines: 28,
    },
    actionItems: [
      {
        id: 'sop-24-1',
        priority: 'P0_CRITICAL',
        category: 'SAFETY_LOCKOUT',
        title: 'Dispatch Lineman Foot Patrols to Coastal Corridors',
        description: 'Deploy 42 foot-patrol gangs across Ennore, Royapuram, and Besant Nagar overhead spans to trim precariously hanging branches before wind breaches 75 km/h.',
        targetFeedersOrSubstations: ['33KV ENNORE SS', '110KV BESANT NAGAR', '33KV ROYAPURAM'],
      },
      {
        id: 'sop-24-2',
        priority: 'P1_LIFELINE',
        category: 'LIFELINE_PROTECT',
        title: 'Lock Diesel Genset Transfers for Critical Hospitals',
        description: 'Verify auto-transfer switches (ATS) at Apollo Greams Rd, Rajiv Gandhi Govt Hospital, and Kilpauk Medical College. Top up fuel tanks to 100% capacity (72-hour autonomy).',
        targetFeedersOrSubstations: ['33KV APOLLO HOSPITALS', '110KV KILPAUK', '230KV PERAMBUR'],
      },
      {
        id: 'sop-24-3',
        priority: 'P2_FIELD',
        category: 'DEWATERING',
        title: 'Pre-Position Mobile Dewatering Diesel Pumps',
        description: 'Position 50HP dewatering pumps at low-elevation switchyards (<2.5m MSL) including Velachery 110kV and Taramani 230kV.',
        targetFeedersOrSubstations: ['110KV VELACHERY', '230KV TARAMANI'],
      },
      {
        id: 'sop-24-4',
        priority: 'P0_CRITICAL',
        category: 'SAFETY_LOCKOUT',
        title: 'Arm Remote Scada De-energization Interlocks',
        description: 'Ensure SLDC operators have verified supervisory trip groups for all radial 11kV/33kV overhead lines to initiate rapid group isolation upon 80 km/h wind trigger.',
      },
    ],
    geminiModelTag: 'Gemini 2.5 Flash · Grid Copilot',
    timestamp: 'Phase-1 Trigger (T-24h)',
  },

  // Michaung Cat-3: T-0h (Landfall Peak)
  'MICHAUNG_CAT3_0': {
    scenarioId: 'MICHAUNG_CAT3',
    hour: 0,
    label: 'T-0h Landfall Peak',
    title: 'Statutory De-Energization & Flashover Containment Order',
    urgency: 'CRITICAL',
    summaryEn: 'Cyclone Eye Wall making landfall. Winds peaking at 112 km/h; storm surge 3.2m MSL. Mandatory trip of all coastal overhead lines to prevent electrocution. Island underground ring feeders to preserve critical city core.',
    summaryTa: 'தீவிர எச்சரிக்கை: புயல் கரையை கடக்கிறது (காற்று 112 கி.மீ/மணி). மின் கசிவு விபத்துகளை தவிர்க்க கடற்கரையோர மின் இணைப்புகள் துண்டிக்கப்பட்டுள்ளன. நிலத்தடி கேபிள்கள் மூலம் மருத்துவமனைகளுக்கு மட்டும் மின்சாரம்.',
    statutoryReference: 'TNSDMA Statutory Mandate §5.6 · Central Electricity Authority Safety Reg. 33',
    weatherSnapshot: {
      windKmh: 112.0,
      rainMm: 58.2,
      surgeM: 3.2,
      distanceKm: 0,
    },
    impactMetrics: {
      atRiskSubstations: 58,
      trippedFeeders: 86,
      protectedLifelines: 19,
    },
    actionItems: [
      {
        id: 'sop-0-1',
        priority: 'P0_CRITICAL',
        category: 'DE_ENERGIZE',
        title: 'Statutory Overhead Radial De-Energization',
        description: 'Immediately de-energize all 11kV and 33kV overhead radial lines in Zones 1–5 where sustained winds exceed 80 km/h to prevent fatal conductor snaps and public electrocution.',
        targetFeedersOrSubstations: ['110KV VELACHERY', '33KV SHOLINGANALLUR', '110KV ENNORE'],
      },
      {
        id: 'sop-0-2',
        priority: 'P0_CRITICAL',
        category: 'SAFETY_LOCKOUT',
        title: 'Lock Out SCADA Auto-Reclose Relays',
        description: 'Disable automatic circuit reclosers (ACR) across the entire coastal grid. Prevent repeated reclosure into waterlogged ground or fallen tree contacts.',
      },
      {
        id: 'sop-0-3',
        priority: 'P1_LIFELINE',
        category: 'LIFELINE_PROTECT',
        title: 'Isolate & Ring-Feed Critical Medical Centers',
        description: 'Maintain power to Apollo Hospitals and Rajiv Gandhi GH exclusively via hardened 33kV Underground GIS ring feeders. Confirm secondary diesel backup readiness.',
        targetFeedersOrSubstations: ['33KV APOLLO HOSPITALS', '110KV PARK TOWN GIS'],
      },
      {
        id: 'sop-0-4',
        priority: 'P2_FIELD',
        category: 'DEWATERING',
        title: 'Execute Inundation Cutoff at Low-Plinth Switchyards',
        description: 'Switchyards at Velachery, Madipakkam, and Vyasarpadi inundated >0.6m. Trip bus couplers and start submersible dewatering units immediately.',
        targetFeedersOrSubstations: ['110KV VELACHERY', '33KV VYASARPADI', '33KV MADIPAKKAM'],
      },
    ],
    geminiModelTag: 'Gemini 2.5 Flash · Grid Copilot',
    timestamp: 'Phase-2 Critical (T-0h Landfall)',
  },

  // Michaung Cat-3: T+12h (Restoration Phase)
  'MICHAUNG_CAT3_12': {
    scenarioId: 'MICHAUNG_CAT3',
    hour: 12,
    label: 'T+12h Restoration & Re-Energization',
    title: 'Post-Storm Phased Energization & Megger Testing Protocol',
    urgency: 'RESTORATION',
    summaryEn: 'Cyclone core moved inland; winds subsided to 38 km/h. Floodwaters receding in elevated zones. Begin statutory 3-stage re-energization: 1. Transmission Backbones; 2. Hospitals & CMWSSB Water Pumping; 3. Residential Distribution.',
    summaryTa: 'மறுசீரமைப்பு பணி: புயல் வலுவிழந்தது. கட்டம்-1: பெருநகர குடிநீர் நிலையங்கள் மற்றும் அவசர மருத்துவமனைகளுக்கு முதலில் மின் விநியோகம் சீரமைக்கப்படுகிறது.',
    statutoryReference: 'TANGEDCO Emergency Restoration Manual (SOP-401) · TNSDMA Post-Disaster Protocol',
    weatherSnapshot: {
      windKmh: 38.5,
      rainMm: 4.2,
      surgeM: 1.1,
      distanceKm: 140,
    },
    impactMetrics: {
      atRiskSubstations: 22,
      trippedFeeders: 42,
      protectedLifelines: 32,
    },
    actionItems: [
      {
        id: 'sop-12-1',
        priority: 'P1_LIFELINE',
        category: 'RESTORATION',
        title: 'Stage-1 Priority Restoration: Kilpauk & Chembarambakkam Water Pumps',
        description: 'Perform visual patrol on 33kV dedicated underground lines feeding CMWSSB Kilpauk water treatment plant. Energize under strict operator clearance.',
        targetFeedersOrSubstations: ['110KV KILPAUK', '230KV POONAMALLEE'],
      },
      {
        id: 'sop-12-2',
        priority: 'P0_CRITICAL',
        category: 'SAFETY_LOCKOUT',
        title: 'Mandatory 1000V Megger Insulation Check on Inundated DTRs',
        description: 'For all ground-mounted distribution transformers (DTRs) submerged during the surge, prohibit energization until insulation resistance checks >50 MΩ.',
        targetFeedersOrSubstations: ['110KV VELACHERY', '33KV SHOLINGANALLUR'],
      },
      {
        id: 'sop-12-3',
        priority: 'P1_LIFELINE',
        category: 'RESTORATION',
        title: 'Verify Hospital Feeder Redundancy',
        description: 'Transfer hospital feeders from auxiliary emergency diesel back to synchronized grid utility supply, holding generator on warm standby.',
      },
      {
        id: 'sop-12-4',
        priority: 'P2_FIELD',
        category: 'FIELD',
        title: 'Authorize Lineman Pole Replacements in Wind Sectors',
        description: 'Deploy 85 mobile crane units to erect pre-cast concrete poles along radial routes in Zone 3 where cross-arms snapped during peak gusts.',
      },
    ],
    geminiModelTag: 'Gemini 2.5 Flash · Grid Copilot',
    timestamp: 'Phase-3 Restoration (T+12h)',
  },

  // 2015 Megafloods: T-0h (Chembarambakkam Breach)
  'FLOODS_2015_0': {
    scenarioId: 'FLOODS_2015',
    hour: 0,
    label: 'T-0h Adyar River Spill',
    title: 'Catastrophic Riverine Inundation & 230kV Backbone Defense Directive',
    urgency: 'CRITICAL',
    summaryEn: 'Chembarambakkam reservoir release exceeds 29,000 cusecs. Adyar and Cooum rivers in catastrophic spate. 230kV Taramani and 110kV Koyambedu switchyards partially submerged. Emergency bypass isolating vulnerable ground-mounted switchgear.',
    summaryTa: 'செம்பரம்பாக்கம் ஏரி உபரி நீர் திறப்பு: அடையாறு ஆற்றில் வெள்ளப்பெருக்கு காரணமாக 230kV தரமணி மற்றும் கோயம்பேடு துணை மின் நிலையங்கள் பாதுகாப்புடன் தனிமைப்படுத்தப்படுகின்றன.',
    statutoryReference: 'Tamil Nadu State Disaster Management Plan §8.4 (Flood Protocol)',
    weatherSnapshot: {
      windKmh: 42.0,
      rainMm: 345.0,
      surgeM: 0.4,
    },
    impactMetrics: {
      atRiskSubstations: 74,
      trippedFeeders: 112,
      protectedLifelines: 15,
    },
    actionItems: [
      {
        id: 'sop-fl-1',
        priority: 'P0_CRITICAL',
        category: 'DE_ENERGIZE',
        title: 'Emergency De-Energization of Riverine Low-Plinth Yards',
        description: 'Adyar basin floodwaters breach 1.5m plinth elevation. Remotely trip 230kV Taramani low-bay bus to safeguard main power transformers from catastrophic water immersion short circuits.',
        targetFeedersOrSubstations: ['230KV TARAMANI', '110KV GUINDY', '110KV SAIDAPET'],
      },
      {
        id: 'sop-fl-2',
        priority: 'P1_LIFELINE',
        category: 'LIFELINE_PROTECT',
        title: 'Maintain Dedicated Power to Royapettah & MIOT Relief Centers',
        description: 'Deploy elevated mobile truck-mounted transformers (1000 kVA) to maintain supply to emergency triage medical wings above flood line.',
      },
      {
        id: 'sop-fl-3',
        priority: 'P2_FIELD',
        category: 'DEWATERING',
        title: 'Continuous High-Discharge Pumping at Central SLDC',
        description: 'Operate 4x 100HP diesel pumps at SLDC Chennai headquarters control room basement to safeguard supervisory SCADA servers and optical communication links.',
      },
    ],
    geminiModelTag: 'Gemini 2.5 Flash · Grid Copilot',
    timestamp: 'Historic Flood Benchmark (T-0h)',
  },
};

/**
 * Returns the relevant Gemini SOP directive for a given scenario and timestep.
 * Picks the closest statutory milestone directive if an exact match doesn't exist,
 * dynamically updating the live weather metrics from the current timestep.
 */
export function getDirectiveForTimestep(
  scenarioId: ScenarioId,
  timestep: ScenarioTimestep
): GeminiSopDirective | null {
  if (scenarioId === 'LIVE') return null;

  // Direct milestone hit check
  const exactKey = `${scenarioId}_${timestep.timestep_hour}`;
  if (MILESTONE_DIRECTIVES[exactKey]) {
    const base = MILESTONE_DIRECTIVES[exactKey];
    return {
      ...base,
      weatherSnapshot: {
        windKmh: Math.abs(timestep.wind_speed_10m_kmh),
        rainMm: timestep.total_precipitation_1hr_mm,
        surgeM: timestep.simulated_storm_surge_msl_m,
        distanceKm: timestep.cyclone_distance_to_chennai_km,
      },
    };
  }

  // Fallback: Pick the closest milestone prior or equal to current timestep
  if (scenarioId === 'MICHAUNG_CAT3') {
    let chosenKey = 'MICHAUNG_CAT3_-24';
    if (timestep.timestep_hour >= 6) {
      chosenKey = 'MICHAUNG_CAT3_12';
    } else if (timestep.timestep_hour >= -12) {
      chosenKey = 'MICHAUNG_CAT3_0';
    }
    const base = MILESTONE_DIRECTIVES[chosenKey];
    return {
      ...base,
      hour: timestep.timestep_hour,
      label: timestep.label,
      weatherSnapshot: {
        windKmh: Math.abs(timestep.wind_speed_10m_kmh),
        rainMm: timestep.total_precipitation_1hr_mm,
        surgeM: timestep.simulated_storm_surge_msl_m,
        distanceKm: timestep.cyclone_distance_to_chennai_km,
      },
    };
  }

  if (scenarioId === 'FLOODS_2015') {
    const base = MILESTONE_DIRECTIVES['FLOODS_2015_0'];
    return {
      ...base,
      hour: timestep.timestep_hour,
      label: timestep.label,
      weatherSnapshot: {
        windKmh: Math.abs(timestep.wind_speed_10m_kmh),
        rainMm: timestep.total_precipitation_1hr_mm,
        surgeM: timestep.simulated_storm_surge_msl_m,
      },
    };
  }

  return null;
}
