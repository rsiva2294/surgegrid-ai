import { GoogleGenAI } from '@google/genai';
import type { TnebSubstation } from '../types/tneb';
import type { DisasterScenario } from '../components/Map/DisasterCockpitBar';
import type { LiveWeatherConditions } from './liveWeatherService';

export interface TacticalActionStep {
  id: string;
  stepNumber: number;
  stage: 'STAGE_1_ISOLATION' | 'STAGE_2_SAFETY' | 'STAGE_3_LIFELINE' | 'STAGE_4_RESTORATION' | 'STAGE_5_MONITORING';
  title: string;
  action: string;
  statutoryBasis: string;
  responsibleEntity: string;
  timeframeSla: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface TacticalDirectivePlan {
  planId: string;
  generatedAt: string;
  targetScope: 'CITY_WIDE_GRID' | 'SUBSTATION_TACTICAL';
  targetName: string;
  weatherSnapshot: string;
  disasterScenario: string;
  currentRiskLevel: string;
  executiveSummary: string;
  statutoryDirectives: string[];
  steps: TacticalActionStep[];
  smsDispatchFormat: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Deterministic Statutory Fallback generator citing official 2023 SDMP & 2017 TANGEDCO Manual
export function generateStatutoryDeterministicDirective(
  target: TnebSubstation | null,
  scenario: DisasterScenario,
  weather?: LiveWeatherConditions | null
): TacticalDirectivePlan {
  const isCityWide = !target;
  const targetName = isCityWide ? 'Greater Chennai Metro Transmission & Distribution Grid' : `${target.name} (${target.voltage} kV)`;
  const windSpeed = weather?.windSpeedKmh || (scenario === 'SEVERE_CYCLONE' ? 92 : scenario === 'CYCLONE_ALERT' ? 65 : 24);
  const elevation = target?.elevationM !== undefined ? `${target.elevationM}m MSL` : 'City-wide Average 6.4m MSL';
  const surgeRisk = target?.riskCategory === 'CRITICAL_SURGE_RISK' || scenario === 'EXTREME_SURGE';

  const planId = `IAP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const weatherSnapshot = weather
    ? `${weather.temperatureC.toFixed(1)}°C, Wind: ${weather.windSpeedKmh} km/h ${weather.windDirectionCardinal} (Gusts: ${weather.windGustKmh} km/h), Humidity: ${weather.humidityPercent}%`
    : `Wind: ${windSpeed} km/h, Ground Elevation: ${elevation}, Scenario: ${scenario.replace(/_/g, ' ')}`;

  const statutoryDirectives: string[] = [
    'TNSDMA SDMP 2023 §5.6: Pre-emptive tripping of overhead radial circuits mandated when wind gusts >= 80 km/h; underground cable rings remain energized.',
    'TNSDMA 2023 ESF 15: Mandatory restoration priority SLAs: P1 Lifelines <= 6 hours; P2 Public Utilities <= 12 hours; LT Domestic <= 48 hours.',
    'TANGEDCO Disaster Manual 2017 Rule 44: Mandatory physical Permit-To-Work (PTW) lineman line-patrol before circuit breaker re-closure.',
    'GCC CDMP 2023 §4.2: Joint inter-agency clearance: Fallen trees and stormwater drain suction clearance required prior to LT feeder charging.'
  ];

  const steps: TacticalActionStep[] = [];

  if (scenario === 'EXTREME_SURGE' || (target && target.elevationM !== undefined && target.elevationM <= 3.2)) {
    steps.push({
      id: 'step-1',
      stepNumber: 1,
      stage: 'STAGE_1_ISOLATION',
      title: 'Mandatory Yard Flood De-energization',
      action: `Pre-emptively trip 33kV switchgear and 11kV bus couplers. Lock out breakers to prevent catastrophic dielectric breakdown from saline seawater ingress (${elevation} vs 3.2m surge).`,
      statutoryBasis: 'TNSDMA SDMP 2023 §5.6 & TANGEDCO 2017 Manual Annexure 4',
      responsibleEntity: 'Shift Engineer (Substation Operations)',
      timeframeSla: 'Immediate (< 15 mins)',
      priority: 'CRITICAL'
    });
    steps.push({
      id: 'step-2',
      stepNumber: 2,
      stage: 'STAGE_2_SAFETY',
      title: 'Deploy High-Volume Mobile Diesel Dewatering Pumps',
      action: 'Position 100 HP submersible dewatering pumps at cable trench sumps. Monitor water level indicators before allowing auxiliary control transformer access.',
      statutoryBasis: 'GCC CDMP 2023 Flood SOP & TNEB Safety Manual Rule 29',
      responsibleEntity: 'TNEB Civil Maintenance & GCC Ripon Taskforce',
      timeframeSla: 'Within 2 Hours',
      priority: 'CRITICAL'
    });
  } else if (windSpeed >= 80 || scenario === 'SEVERE_CYCLONE') {
    steps.push({
      id: 'step-1',
      stepNumber: 1,
      stage: 'STAGE_1_ISOLATION',
      title: 'Overhead Radial Circuit Pre-emptive Tripping',
      action: `Open breakers on all overhead 11kV and 22kV radial distribution feeders. Maintain energized supply exclusively through underground cable loops with Ring Main Units (RMUs).`,
      statutoryBasis: 'TNSDMA SDMP 2023 §5.6 (Cyclone Wind De-energization Mandate)',
      responsibleEntity: 'Assistant Executive Engineer (AEE / Grid Operation)',
      timeframeSla: 'Immediate (< 15 mins)',
      priority: 'CRITICAL'
    });
    steps.push({
      id: 'step-2',
      stepNumber: 2,
      stage: 'STAGE_2_SAFETY',
      title: 'Lineman Foot Patrol & Permit-To-Work (PTW) Verification',
      action: 'Dispatch sectional line squads for physical walking inspection. Confirm zero snapped conductors, uprooted trees across cross-arms, or dangling live wires before any breaker re-close.',
      statutoryBasis: 'TANGEDCO Manual 2017 Rule 44 (PTW Physical Verification)',
      responsibleEntity: 'Section Officer (AE) & Lineman Squad',
      timeframeSla: 'Within 2 Hours of Landfall',
      priority: 'HIGH'
    });
  } else {
    steps.push({
      id: 'step-1',
      stepNumber: 1,
      stage: 'STAGE_1_ISOLATION',
      title: 'Bus Coupler & Feeder Telemetry Synchronization',
      action: 'Verify SCADA RTU telemetry across incoming and outgoing feeders. Inspect oil temperature indicators (OTI) and winding temperature indicators (WTI) on power transformers.',
      statutoryBasis: 'TANGEDCO Grid Code 2017 Operating Standard 12.1',
      responsibleEntity: 'Substation Shift In-Charge',
      timeframeSla: 'Routine 2-Hour Watch',
      priority: 'HIGH'
    });
  }

  // Priority 1 Lifelines restoration step
  steps.push({
    id: 'step-3',
    stepNumber: steps.length + 1,
    stage: 'STAGE_3_LIFELINE',
    title: 'Priority 1 Lifeline Circuit Isolation & Preservation',
    action: target?.feeders?.some(f => f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water')
      ? `Prioritize continuous supply to connected critical lifeline feeders (${target.feeders.filter(f => f.lifelineCategory).map(f => f.name).join(', ')}). Switch to alternate 33kV source loop if primary trips.`
      : 'Maintain dedicated auxiliary power feeds to Government Multi-Speciality Hospitals, CMWSSB sewage/water pumping plants, and CMRL Metro traction.',
    statutoryBasis: 'TNSDMA 2023 Chapter 8 (ESF 15 Lifeline Restoration Standard)',
    responsibleEntity: 'AEE Distribution & GCC Ripon Building Liaison',
    timeframeSla: '<= 6 Hours Maximum SLA',
    priority: 'CRITICAL'
  });

  // Stage 4: Sequential Energization
  steps.push({
    id: 'step-4',
    stepNumber: steps.length + 1,
    stage: 'STAGE_4_RESTORATION',
    title: '5-Stage Sequential Restoration Protocol',
    action: 'Execute sequential energization: S1 EHT Grid -> S2 Sub-Transmission Ring -> S3 P1 Lifeline Feeders -> S4 RMU Loops -> S5 LT Street DTRs. Never back-feed uninspected secondary neutrals.',
    statutoryBasis: 'TANGEDCO Disaster Recovery Manual 2017 §8.3',
    responsibleEntity: 'Executive Engineer (EE / Operation & Maintenance)',
    timeframeSla: 'Phased (6h to 48h)',
    priority: 'HIGH'
  });

  // Stage 5: Inter-agency clearance
  steps.push({
    id: 'step-5',
    stepNumber: steps.length + 1,
    stage: 'STAGE_5_MONITORING',
    title: 'Joint Inter-Agency Clearance with GCC & Fire Services',
    action: 'Verify GCC tree-felling squads have cleared arterial road right-of-ways and CMWSSB has verified zero stagnant water above DTR plinth base (minimum 1.5m clearance).',
    statutoryBasis: 'Greater Chennai Corporation CDMP 2023 Inter-Agency SOP',
    responsibleEntity: 'TNEB AE Section Officer & GCC Ward Taskforce',
    timeframeSla: 'Continuous Post-Incident',
    priority: 'MEDIUM'
  });

  // 2G SMS Dispatch format for quick copy
  const smsDispatchFormat = `[SURGEGRID-IAP] ${targetName}
SOP-${planId} @ ${nowStr}
COND: ${scenario} (${windSpeed} km/h)
1.TRIP OH: ${windSpeed >= 80 ? 'MANDATORY (SDMP §5.6)' : 'STANDBY'}
2.PTW: TANGEDCO R44 strict lineman inspection before reclose
3.LIFELINE: P1 Hospital/CMWSSB supply priority <=6h
4.RESTORE: Sequential S1->S5. No back-feed.`;

  return {
    planId,
    generatedAt: `${new Date().toLocaleDateString('en-IN')} ${nowStr}`,
    targetScope: isCityWide ? 'CITY_WIDE_GRID' : 'SUBSTATION_TACTICAL',
    targetName,
    weatherSnapshot,
    disasterScenario: scenario,
    currentRiskLevel: surgeRisk ? 'CRITICAL RISK (LEVEL 4)' : windSpeed >= 80 ? 'HIGH SEVERE RISK (LEVEL 3)' : 'NORMAL OPERATIONAL (LEVEL 1)',
    executiveSummary: isCityWide
      ? `City-wide emergency operational directive for Greater Chennai Grid under ${scenario.replace(/_/g, ' ')}. Enforcing TNSDMA 2023 statutory protocols with strict protection of critical civic lifelines and underground cable rings.`
      : `Tactical field directive for ${target.name} (${target.voltage} kV). Ground elevation is ${elevation} with ${target.feeders?.length || 0} distribution feeders. Directing sequential restoration and PTW clearance per TANGEDCO 2017 & TNSDMA 2023 standards.`,
    statutoryDirectives,
    steps,
    smsDispatchFormat
  };
}

export async function generateGeminiStatutoryDirective(
  target: TnebSubstation | null,
  scenario: DisasterScenario,
  weather?: LiveWeatherConditions | null
): Promise<TacticalDirectivePlan> {
  const deterministicFallback = generateStatutoryDeterministicDirective(target, scenario, weather);

  if (!GEMINI_API_KEY) {
    return deterministicFallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `You are the Lead Grid Dispatcher & Disaster Command Officer for Tamil Nadu Generation and Distribution Corporation (TANGEDCO) and Tamil Nadu State Disaster Management Authority (TNSDMA).

TARGET INFRASTRUCTURE: ${deterministicFallback.targetName}
SCOPE: ${deterministicFallback.targetScope}
DISASTER SCENARIO: ${scenario}
CURRENT WEATHER: ${deterministicFallback.weatherSnapshot}
SUBSTATION ELEVATION: ${target?.elevationM !== undefined ? `${target.elevationM}m MSL` : 'Unknown'}
FEEDERS COUNT: ${target?.feeders?.length || 'Grid Wide'}
LIFELINES PRESENT: ${target?.feeders?.filter(f => f.lifelineCategory).map(f => `${f.name} (${f.lifelineCategory})`).join(', ') || 'Hospitals, Water Plants, Metro'}

STATUTORY MANDATES TO QUOTE:
1. TNSDMA SDMP 2023 §5.6: Mandatory tripping of overhead radial lines when wind >= 80 km/h; preserve underground ring circuits.
2. TNSDMA 2023 Chapter 8 (ESF 15): Restoration SLAs (P1 Hospitals/Water <= 6h, P2 Transit/Govt <= 12h, Domestic LT <= 48h).
3. TANGEDCO Disaster Recovery Manual 2017: Rule 44 Lineman physical Permit-To-Work (PTW) foot-patrol clearance before re-closing; 5-Stage Sequential Restoration (S1 Bulk EHT -> S2 Hub -> S3 P1 Lifelines -> S4 RMU Loops -> S5 LT).
4. GCC CDMP 2023: Inter-agency tree clearance & drain pump suction verification.

Generate a JSON object conforming strictly to this format:
{
  "executiveSummary": "Concise high-command briefing paragraph",
  "currentRiskLevel": "CRITICAL RISK (LEVEL 4) / HIGH SEVERE RISK (LEVEL 3) / NORMAL OPERATIONAL",
  "steps": [
    {
      "stepNumber": 1,
      "stage": "STAGE_1_ISOLATION" or "STAGE_2_SAFETY" or "STAGE_3_LIFELINE" or "STAGE_4_RESTORATION" or "STAGE_5_MONITORING",
      "title": "Clear actionable step title",
      "action": "Specific technical command with switchgear and circuit details",
      "statutoryBasis": "Exact quote and section of TNSDMA 2023 or TANGEDCO 2017",
      "responsibleEntity": "Role name (e.g. AE Operation, Lineman Squad, Ripon Taskforce)",
      "timeframeSla": "Statutory SLA timeframe",
      "priority": "CRITICAL" | "HIGH" | "MEDIUM"
    }
  ],
  "smsDispatchFormat": "Concise 160-char format for 2G emergency SMS broadcast to linemen"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        ...deterministicFallback,
        executiveSummary: parsed.executiveSummary || deterministicFallback.executiveSummary,
        currentRiskLevel: parsed.currentRiskLevel || deterministicFallback.currentRiskLevel,
        steps: Array.isArray(parsed.steps) && parsed.steps.length > 0
          ? parsed.steps.map((s: Partial<TacticalActionStep>, i: number) => ({
              id: `gemini-step-${i + 1}`,
              stepNumber: s.stepNumber || i + 1,
              stage: s.stage || deterministicFallback.steps[i]?.stage || 'STAGE_1_ISOLATION',
              title: s.title || `Action Step ${i + 1}`,
              action: s.action || '',
              statutoryBasis: s.statutoryBasis || 'TNSDMA SDMP 2023 / TANGEDCO 2017 Manual',
              responsibleEntity: s.responsibleEntity || 'TNEB AE Section Officer',
              timeframeSla: s.timeframeSla || '<= 6 Hours',
              priority: s.priority || 'HIGH'
            }))
          : deterministicFallback.steps,
        smsDispatchFormat: parsed.smsDispatchFormat || deterministicFallback.smsDispatchFormat
      };
    }
  } catch (err) {
    console.warn('Gemini API directive failed or offline; using statutory deterministic fallback:', err);
  }

  return deterministicFallback;
}
