/**
 * geminiSubstationCopilotService.ts
 *
 * Tier-2 Asset-Level Tactical Copilot powered by Google Gemini.
 * Generates immediate, 3-point tactical switchyard directives tailored to
 * a specific substation's live health grade, elevation, connected circuits,
 * and the active disaster physics at the current timestep hour.
 */

import type { TnebSubstation } from '../types/tneb';
import type { ScenarioId, ScenarioTimestep } from './scenarioService';
import type { LiveOutage } from './liveOutageService';
import { getEnrichedHealthProfile } from './gridHealthService';

export type SubstationPosture =
  | 'SAFE_MONITOR'
  | 'DEWATERING_PUMP'
  | 'LOAD_SHED_SELECTIVE'
  | 'PRE_EMPTIVE_ISOLATE';

export interface SubstationTacticalAction {
  id: string;
  category: 'EQUIPMENT_PLINTH' | 'FEEDER_ISOLATION' | 'LIFELINE_LOOP' | 'GROUND_PATROL';
  action: string;
  urgency: 'IMMEDIATE' | 'WATCH' | 'STANDBY';
}

export interface SubstationCopilotAdvisory {
  substationCode: string;
  substationName: string;
  posture: SubstationPosture;
  postureRationale: string;
  actions: SubstationTacticalAction[];
  modelTag: string;
  cached: boolean;
  timestamp: string;
}

// In-memory LRU-style cache
const copilotCache = new Map<string, SubstationCopilotAdvisory>();

/**
 * Deterministic tactical heuristic engine (0ms offline fallback).
 * Evaluates the asset's active telemetry against environmental flood & wind physics.
 */
export function generateDeterministicTacticalAdvisory(
  substation: TnebSubstation,
  scenarioId: ScenarioId | string,
  timestep?: ScenarioTimestep | null,
  liveOutages: LiveOutage[] = []
): SubstationCopilotAdvisory {
  const profile = getEnrichedHealthProfile(substation, liveOutages);
  const elevation = substation.elevationM !== undefined ? substation.elevationM : 6.0;
  const surgeM = timestep ? timestep.simulated_storm_surge_msl_m : 0;
  const windKmh = timestep ? Math.abs(timestep.wind_speed_10m_kmh) : 25;

  const feeders = substation.feeders || [];
  const ohCount = feeders.filter(f => f.config?.toLowerCase().includes('overhead') || f.config?.toLowerCase().includes('mixed')).length;
  const hospitalLifelines = feeders.filter(f => f.lifelineCategory === 'hospital' || f.isDedicated);

  let posture: SubstationPosture = 'SAFE_MONITOR';
  let postureRationale = `Yard elevation (${elevation.toFixed(1)}m MSL) and Grade ${profile.healthGrade} health provide stable margin under nominal baseline conditions.`;
  const actions: SubstationTacticalAction[] = [];

  const isSubmerged = elevation <= surgeM + 0.3 || (substation.hydroRisk?.cycloneIsolateRecommended && scenarioId !== 'NORMAL');
  const isFloodThreat = elevation <= surgeM + 0.9 || substation.riskCategory === 'CRITICAL_SURGE_RISK';
  const isHighWind = windKmh >= 75;

  if (isSubmerged) {
    posture = 'PRE_EMPTIVE_ISOLATE';
    postureRationale = `Critical yard submersion danger: elevation ${elevation.toFixed(1)}m MSL breached by ${surgeM.toFixed(1)}m surge. Pre-emptive de-energization required to prevent bus flashover.`;
    actions.push({
      id: 'act-1',
      category: 'FEEDER_ISOLATION',
      action: `De-energize all ${feeders.length} outgoing feeders and open bus coupler breakers before yard plinth submerges.`,
      urgency: 'IMMEDIATE'
    });
    actions.push({
      id: 'act-2',
      category: 'EQUIPMENT_PLINTH',
      action: 'Lock out Automatic Circuit Reclosers (ACR) to stop repeated reclosing into waterlogged yard bus.',
      urgency: 'IMMEDIATE'
    });
    actions.push({
      id: 'act-3',
      category: 'LIFELINE_LOOP',
      action: hospitalLifelines.length > 0
        ? `Signal ${hospitalLifelines.map(h => h.name).slice(0, 2).join(' & ')} to transfer to secondary diesel generation immediately.`
        : 'Lock control room battery bank and seal cable trench sump entries.',
      urgency: 'IMMEDIATE'
    });
  } else if (isFloodThreat) {
    posture = 'DEWATERING_PUMP';
    postureRationale = `Substation plinth margin is under 0.9m against active storm surge (${surgeM.toFixed(1)}m MSL). Cable trench dewatering is critical.`;
    actions.push({
      id: 'act-1',
      category: 'EQUIPMENT_PLINTH',
      action: 'Position and activate 50HP mobile diesel dewatering pumps at the 33kV switchyard cable trenches.',
      urgency: 'IMMEDIATE'
    });
    actions.push({
      id: 'act-2',
      category: 'EQUIPMENT_PLINTH',
      action: 'Conduct hourly physical water gauge readings at transformer plinth base; alarm threshold set at +15cm.',
      urgency: 'WATCH'
    });
    actions.push({
      id: 'act-3',
      category: 'LIFELINE_LOOP',
      action: hospitalLifelines.length > 0
        ? `Verify underground ring feeds to ${hospitalLifelines[0].name} to ensure uninterrupted supply during surface pooling.`
        : 'Prepare feeder isolation sequence if runoff water breaches yard plinth level.',
      urgency: 'WATCH'
    });
  } else if (isHighWind && ohCount > 0) {
    posture = 'LOAD_SHED_SELECTIVE';
    postureRationale = `Sustained winds at ${windKmh.toFixed(0)} km/h hazard ${ohCount} overhead spans. Selective radial shedding advised to preserve station bus.`;
    actions.push({
      id: 'act-1',
      category: 'FEEDER_ISOLATION',
      action: `Pre-emptively trip ${ohCount} tree-exposed overhead radial circuits to prevent phase-to-ground conductor snaps.`,
      urgency: 'IMMEDIATE'
    });
    actions.push({
      id: 'act-2',
      category: 'GROUND_PATROL',
      action: 'Dispatch emergency lineman patrol to monitor incoming line tension and stay-wire integrity.',
      urgency: 'WATCH'
    });
    actions.push({
      id: 'act-3',
      category: 'LIFELINE_LOOP',
      action: 'Maintain underground feeder circuits in service to ensure continuous power to essential urban loads.',
      urgency: 'WATCH'
    });
  } else {
    posture = 'SAFE_MONITOR';
    postureRationale = `Grid asset operating within stable safety thresholds. Equipment plinth has ${Math.max(0, elevation - surgeM).toFixed(1)}m clearance above active flood level.`;
    actions.push({
      id: 'act-1',
      category: 'EQUIPMENT_PLINTH',
      action: 'Maintain nominal supervisory SCADA monitoring; verify station auxiliary supply and DC battery bank.',
      urgency: 'STANDBY'
    });
    actions.push({
      id: 'act-2',
      category: 'GROUND_PATROL',
      action: 'Confirm switchyard flood gate closure and check sump pump auto-start float switches.',
      urgency: 'STANDBY'
    });
    actions.push({
      id: 'act-3',
      category: 'LIFELINE_LOOP',
      action: 'Keep downstream feeder relay health telemetry unmuted and linked to Central SLDC.',
      urgency: 'STANDBY'
    });
  }

  return {
    substationCode: substation.code,
    substationName: substation.cleanName || substation.name,
    posture,
    postureRationale,
    actions,
    modelTag: 'Deterministic Grid Safety Model',
    cached: false,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Calls live Gemini 2.5 Flash API for asset-specific tactical advice.
 * Uses ultra-compact prompt (< 60 tokens) and JSON response schema.
 * Caches responses by substation + scenario + timestep.
 */
export async function fetchSubstationTacticalAdvisory(
  substation: TnebSubstation,
  scenarioId: ScenarioId | string,
  timestep?: ScenarioTimestep | null,
  liveOutages: LiveOutage[] = []
): Promise<SubstationCopilotAdvisory> {
  const fallback = generateDeterministicTacticalAdvisory(substation, scenarioId, timestep, liveOutages);

  const hour = timestep ? timestep.timestep_hour : 0;
  const cacheKey = `${substation.code}_${scenarioId}_${hour}`;

  if (copilotCache.has(cacheKey)) {
    const cachedItem = copilotCache.get(cacheKey)!;
    return { ...cachedItem, cached: true };
  }

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    copilotCache.set(cacheKey, fallback);
    return fallback;
  }

  const profile = getEnrichedHealthProfile(substation, liveOutages);
  const elevation = substation.elevationM !== undefined ? substation.elevationM : 6.0;
  const surgeM = timestep ? timestep.simulated_storm_surge_msl_m : 0;
  const windKmh = timestep ? Math.abs(timestep.wind_speed_10m_kmh) : 25;
  const rainMm = timestep ? timestep.total_precipitation_1hr_mm : 0;
  const feeders = substation.feeders || [];
  const ohCount = feeders.filter(f => f.config?.toLowerCase().includes('overhead') || f.config?.toLowerCase().includes('mixed')).length;
  const ugCount = feeders.length - ohCount;
  const lifelineCount = feeders.filter(f => f.lifelineCategory || f.isDedicated).length;

  const compactPrompt = `ASSET: ${substation.cleanName || substation.name} (${substation.voltage}) | ELEV: ${elevation.toFixed(1)}m MSL (${substation.riskCategory || 'NORMAL'})
TODAY_HEALTH: Grade ${profile.healthGrade} (${profile.healthScore}/100) | TRIPS_30D: ${profile.unscheduledTripsCount} | CLEAN_STREAK: ${profile.cleanStreakDays ?? 90}d
DISASTER: ${scenarioId} @ T${hour >= 0 ? '+' : ''}${hour}h | SURGE: ${surgeM.toFixed(1)}m MSL | WIND: ${windKmh.toFixed(0)} km/h | RAIN: ${rainMm.toFixed(0)} mm/h
CIRCUITS: ${feeders.length} Feeders (${ugCount} UG, ${ohCount} OH) | LIFELINES: ${lifelineCount}
TASK: Output posture & 3 precise switchyard directives.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are the TNEB Senior Grid Protection Engineer in Chennai. Strictly follow TNSDMA §5.6 electrical safety rules. Determine the operational posture and provide exactly 3 concise, highly actionable switchyard directives (equipment plinth dewatering, breaker tripping, or hospital lifeline loop protection). Return strictly JSON.'
              }
            ]
          },
          contents: [{ parts: [{ text: compactPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                posture: {
                  type: 'STRING',
                  enum: ['SAFE_MONITOR', 'DEWATERING_PUMP', 'LOAD_SHED_SELECTIVE', 'PRE_EMPTIVE_ISOLATE']
                },
                postureRationale: { type: 'STRING' },
                actions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      id: { type: 'STRING' },
                      category: {
                        type: 'STRING',
                        enum: ['EQUIPMENT_PLINTH', 'FEEDER_ISOLATION', 'LIFELINE_LOOP', 'GROUND_PATROL']
                      },
                      action: { type: 'STRING' },
                      urgency: {
                        type: 'STRING',
                        enum: ['IMMEDIATE', 'WATCH', 'STANDBY']
                      }
                    },
                    required: ['id', 'category', 'action', 'urgency']
                  }
                }
              },
              required: ['posture', 'postureRationale', 'actions']
            },
            temperature: 0.2
          }
        })
      }
    );

    if (!res.ok) {
      console.warn('Gemini Substation Copilot returned non-200:', res.status);
      copilotCache.set(cacheKey, fallback);
      return fallback;
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      copilotCache.set(cacheKey, fallback);
      return fallback;
    }

    const parsed = JSON.parse(rawText);
    const enriched: SubstationCopilotAdvisory = {
      substationCode: substation.code,
      substationName: substation.cleanName || substation.name,
      posture: parsed.posture || fallback.posture,
      postureRationale: parsed.postureRationale || fallback.postureRationale,
      actions: Array.isArray(parsed.actions) && parsed.actions.length > 0 ? parsed.actions : fallback.actions,
      modelTag: 'Gemini 2.5 Flash · Tactical Copilot',
      cached: false,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    copilotCache.set(cacheKey, enriched);
    return enriched;
  } catch (err) {
    console.warn('Gemini Substation Copilot fetch error, using deterministic fallback:', err);
    copilotCache.set(cacheKey, fallback);
    return fallback;
  }
}
