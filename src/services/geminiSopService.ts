/**
 * geminiSopService.ts
 *
 * Builds the city-wide Standard Operating Procedure (SOP) for a scenario hour.
 * Every action is a word-for-word quote from an official disaster management plan
 * (src/data/officialSources.ts, docs/SOURCES.md). Our grid data only decides which
 * substations an action is applied to. Gemini may choose targets from lists we give
 * it and word a short note; it never writes, changes or cites the quotes.
 */

import type { ScenarioId, ScenarioTimestep } from './scenarioService';
import type { TnebSubstation, FeederDetail } from '../types/tneb';
import type { LiveOutage } from './liveOutageService';
import { getEnrichedHealthProfile } from './gridHealthService';
import {
  OFFICIAL_SOURCES,
  formatCitation,
  getImdCycloneClass,
  getOfficialRule,
  type OfficialRule,
  type OfficialSourceId,
} from '../data/officialSources';

export type SopCategory =
  | 'DE_ENERGIZE'
  | 'LIFELINE_PROTECT'
  | 'DEWATERING'
  | 'SAFETY_LOCKOUT'
  | 'RESTORATION'
  | 'FIELD';

export interface SopActionItem {
  /** Id of the official rule in officialSources.ts. */
  id: string;
  category: SopCategory;
  /** Short label (ours). The quote and citation below it are official. */
  title: string;
  /** Word-for-word quote from the official plan. */
  quote: string;
  /** Plan name and page. */
  citation: string;
  /** One sentence tying the action to our data. Numbers in it come from the data only. */
  note?: string;
  targetFeedersOrSubstations?: string[];
  completed?: boolean;
}

export interface CompromisedSubstationSummary {
  name: string;
  cleanName: string;
  code: string;
  voltage: string;
  healthGrade: 'A' | 'B' | 'C' | 'D';
  healthScore: number;
  unscheduledTripsCount: number;
  elevationM: number;
  riskCategory: string;
  vulnerabilityReason: string;
  disasterScore: number;
}

export interface GeminiSopDirective {
  scenarioId: ScenarioId;
  hour: number;
  label: string;
  title: string;
  urgency: 'WATCH' | 'CRITICAL' | 'RESTORATION';
  summaryEn: string;
  /** Short names of the official plans quoted in this directive. */
  sources: string[];
  weatherSnapshot: {
    windKmh: number;
    rainMm: number;
    /** Surface pressure in hPa (ERA5-Land), when the scenario file has it. */
    pressureHpa: number | null;
    /** IMD cyclone class for the wind speed, or null below the lowest class (88 km/h). */
    imdClass: string | null;
  };
  /** Counts taken from our grid data, not estimates. `flood` = substations at or below Chennai's average elevation. */
  exposure: {
    flood: number;
    overhead: number;
    lifeline: number;
  };
  actionItems: SopActionItem[];
  geminiModelTag: string;
  timestamp: string;
  compromisedAssets?: CompromisedSubstationSummary[];
}

/**
 * SurgeGrid's own ranking of substations that combine poor health with flood exposure.
 * The weights below are ours and are NOT taken from any official plan.
 * (Scheduled for review in the "only official facts" clean-up, step 3.)
 */
export function extractTopCompromisedInfra(
  substations: TnebSubstation[],
  liveOutages: LiveOutage[] = [],
  timestep?: ScenarioTimestep | null,
  limit = 6
): CompromisedSubstationSummary[] {
  if (!substations || substations.length === 0) return [];

  const surgeM = timestep ? timestep.simulated_storm_surge_msl_m : 0;
  const windKmh = timestep ? Math.abs(timestep.wind_speed_10m_kmh) : 25;

  const scored: CompromisedSubstationSummary[] = substations.map((ss) => {
    const profile = getEnrichedHealthProfile(ss, liveOutages);
    const elevation = ss.elevationM !== undefined ? ss.elevationM : 6.0;

    let disasterScore = 0;

    // 1. Health Grade & Trip degradation ("Today's" chronic status)
    if (profile.healthGrade === 'D') {
      disasterScore += 70;
    } else if (profile.healthGrade === 'C') {
      disasterScore += 45;
    } else if (profile.healthGrade === 'B') {
      disasterScore += 15;
    }
    disasterScore += (100 - profile.healthScore) * 1.2;
    disasterScore += Math.min(profile.unscheduledTripsCount * 5, 50);

    // 2. Physical terrain & storm surge inundation compounding
    if (elevation <= surgeM + 0.3) {
      disasterScore += 65; // Direct water breach into switchyard equipment
    } else if (elevation <= 3.2) {
      disasterScore += 30; // Critical low-lying flood bowl
    }

    if (ss.riskCategory === 'CRITICAL_SURGE_RISK') {
      disasterScore += 35;
    } else if (ss.riskCategory === 'HIGH_WATERLOGGING_RISK') {
      disasterScore += 25;
    }

    // 3. High-wind corridor vulnerability
    if (windKmh >= 75) {
      const distCoast = ss.distanceToCoastKm ?? 10;
      if (distCoast <= 6) disasterScore += 30;
      const hasOverhead = ss.feeders?.some(
        f => f.config?.toLowerCase().includes('overhead') || f.config?.toLowerCase().includes('mixed')
      );
      if (hasOverhead) disasterScore += 20;
    }

    const cleanName = ss.cleanName || ss.name.replace(/^(110\/33-11KV|230\/110KV|33\/11 KV|110\/11 KV SS|33\/11KV|110KV|230KV|33KV)\s*/i, '').trim();

    const vulnerabilityReason = [
      `Grade ${profile.healthGrade} (${profile.healthScore}/100)`,
      elevation <= 3.2 ? `${elevation.toFixed(1)}m MSL Plinth` : null,
      profile.unscheduledTripsCount > 0 ? `${profile.unscheduledTripsCount} Trips` : null,
      ss.riskCategory === 'CRITICAL_SURGE_RISK' ? 'Coastal Surge Zone' : null,
      ss.riskCategory === 'HIGH_WATERLOGGING_RISK' ? 'Flood Basin' : null
    ].filter(Boolean).join(' • ');

    return {
      name: ss.name,
      cleanName,
      code: ss.code,
      voltage: ss.voltage,
      healthGrade: profile.healthGrade,
      healthScore: profile.healthScore,
      unscheduledTripsCount: profile.unscheduledTripsCount,
      elevationM: elevation,
      riskCategory: ss.riskCategory || 'MODERATE_RISK',
      vulnerabilityReason,
      disasterScore,
    };
  });

  scored.sort((a, b) => b.disasterScore - a.disasterScore);
  return scored.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Official-quote SOP
// ---------------------------------------------------------------------------

type SopPhase = 'WATCH' | 'CRITICAL' | 'RESTORATION';
type TargetGroup = 'flood' | 'overhead' | 'lifeline' | 'none';
type ScenarioKey = 'MICHAUNG_2023' | 'FLOODS_2015' | 'MONSOON_2020';

interface RuleMeta {
  title: string;
  category: SopCategory;
  group: TargetGroup;
}

// Short labels are ours; the quote and citation shown beneath each one are official.
const RULE_META: Record<string, RuleMeta> = {
  'mop-diesel-7-days': { title: 'Keep diesel for substation generators', category: 'FIELD', group: 'flood' },
  'mop-check-inventories': { title: 'Check and top up inventories near the likely area', category: 'FIELD', group: 'none' },
  'mop-move-ers-towers': { title: 'Move ERS towers to the nearest substation', category: 'FIELD', group: 'flood' },
  'mop-deploy-manpower': { title: 'Deploy expert manpower to the nearest station', category: 'FIELD', group: 'flood' },
  'mop-identify-flood-prone': { title: 'Identify flood-prone substations', category: 'FIELD', group: 'flood' },
  'mop-dewatering-pump-arranged': { title: 'Arrange dewatering pumps', category: 'DEWATERING', group: 'flood' },
  'mop-trigger-mechanism': { title: 'Set the trigger that starts the action plan', category: 'FIELD', group: 'none' },
  'mop-switch-off-if-required': { title: 'Switch supply off if required', category: 'DE_ENERGIZE', group: 'flood' },
  'mop-mobile-dg-sets': { title: 'Move mobile DG sets to run the dewatering pumps', category: 'DEWATERING', group: 'flood' },
  'mop-restore-priority': { title: 'Restore vital installations first', category: 'RESTORATION', group: 'lifeline' },
  'mop-emergency-operation-centre': { title: 'Run an Emergency Operation Centre', category: 'RESTORATION', group: 'none' },
  'mop-mobile-substation-12-24h': { title: 'Use mobile substations for temporary restoration', category: 'RESTORATION', group: 'flood' },
  'tangedco-oh-lines-out-of-service': { title: 'Keep overhead lines out of service in flood-affected areas', category: 'DE_ENERGIZE', group: 'overhead' },
  'tangedco-no-recharge-before-patrol': { title: 'Recharge only after the feeders are patrolled', category: 'SAFETY_LOCKOUT', group: 'none' },
  'tangedco-retaining-wall': { title: 'Protect outdoor substations against flood entry', category: 'FIELD', group: 'flood' },
  'tangedco-pump-out-flood': { title: 'Pump floodwater out of the substation', category: 'DEWATERING', group: 'flood' },
  'tangedco-sandbags': { title: 'Keep sandbags to stop water entering', category: 'FIELD', group: 'flood' },
  'tangedco-diesel-pumps-low-lying': { title: 'Keep diesel pumps for low-lying substations', category: 'DEWATERING', group: 'flood' },
  'sdmp-disconnect-at-cyclone-strike': { title: 'Disconnect supply as the cyclone strikes', category: 'DE_ENERGIZE', group: 'none' },
  'gcc-cut-off-during-flooding': { title: 'Cut supply off during flooding if required', category: 'DE_ENERGIZE', group: 'flood' },
  'gcc-check-transformers-pillar-boxes': { title: 'Check transformers and pillar boxes', category: 'FIELD', group: 'none' },
  'gcc-run-dg-set-relief-campus': { title: 'Run DG sets at relief campuses and offices', category: 'LIFELINE_PROTECT', group: 'none' },
  'gcc-generators-sewage-pumping': { title: 'Keep generator sets in sewage pumping stations', category: 'LIFELINE_PROTECT', group: 'lifeline' },
};

// Which official actions appear in which phase. Every id exists in officialSources.ts.
// Rain-flood actions, used for the 2015 floods and the 2020 monsoon spell.
const FLOOD_PHASE_RULES: Partial<Record<SopPhase, string[]>> = {
    WATCH: [
      'mop-identify-flood-prone',
      'mop-trigger-mechanism',
      'mop-dewatering-pump-arranged',
      'tangedco-sandbags',
      'tangedco-retaining-wall',
      'gcc-check-transformers-pillar-boxes',
    ],
    CRITICAL: [
      'mop-switch-off-if-required',
      'gcc-cut-off-during-flooding',
      'tangedco-oh-lines-out-of-service',
      'tangedco-pump-out-flood',
      'mop-mobile-dg-sets',
      'tangedco-diesel-pumps-low-lying',
    ],
    RESTORATION: [
      'tangedco-no-recharge-before-patrol',
      'mop-restore-priority',
      'mop-mobile-substation-12-24h',
      'mop-emergency-operation-centre',
      'gcc-generators-sewage-pumping',
    ],
};

const PHASE_RULES: Record<ScenarioKey, Partial<Record<SopPhase, string[]>>> = {
  MICHAUNG_2023: {
    WATCH: [
      'mop-diesel-7-days',
      'mop-check-inventories',
      'mop-move-ers-towers',
      'mop-deploy-manpower',
      'mop-identify-flood-prone',
      'mop-dewatering-pump-arranged',
    ],
    CRITICAL: [
      'sdmp-disconnect-at-cyclone-strike',
      'tangedco-oh-lines-out-of-service',
      'mop-switch-off-if-required',
      'tangedco-pump-out-flood',
      'mop-mobile-dg-sets',
      'gcc-run-dg-set-relief-campus',
    ],
    RESTORATION: [
      'tangedco-no-recharge-before-patrol',
      'mop-restore-priority',
      'mop-mobile-substation-12-24h',
      'mop-emergency-operation-centre',
      'gcc-generators-sewage-pumping',
    ],
  },
  FLOODS_2015: FLOOD_PHASE_RULES,
  MONSOON_2020: FLOOD_PHASE_RULES,
};

const PHASE_TITLES: Record<ScenarioKey, Record<SopPhase, string>> = {
  MICHAUNG_2023: {
    WATCH: 'Cyclone approaching: standby actions from the official plans',
    CRITICAL: 'Cyclone impact: safety and switch-off actions from the official plans',
    RESTORATION: 'After the storm: safe recharge and restoration priority',
  },
  FLOODS_2015: {
    WATCH: 'Flood watch: substation flood preparation from the official plans',
    CRITICAL: 'Flood response: switch-off and dewatering actions from the official plans',
    RESTORATION: 'After the flood: safe recharge and restoration priority',
  },
  MONSOON_2020: {
    WATCH: 'Heavy monsoon rain expected: substation flood preparation from the official plans',
    CRITICAL: 'Heavy monsoon rain: switch-off and dewatering actions from the official plans',
    RESTORATION: 'After the rain: safe recharge and restoration priority',
  },
};

/**
 * Phase rules use only what the scenario data shows. T-0 is the peak-rain hour of the hindcast.
 * - Before T-0: WATCH.
 * - From T-0 while rain continues (hourly rain of 0.1 mm or more): CRITICAL.
 * - After T-0 once hourly rain drops below 0.1 mm: RESTORATION (the rain has effectively stopped).
 * Wind is shown with its IMD cyclone class but does not drive the phase, because the hindcast wind is an
 * area average and sits below the lowest IMD class.
 */
const RAIN_STOPPED_MM = 0.1;

function resolvePhase(timestep: ScenarioTimestep): SopPhase {
  const hour = timestep.timestep_hour;
  if (hour < 0) return 'WATCH';
  return hour > 0 && timestep.total_precipitation_1hr_mm < RAIN_STOPPED_MM ? 'RESTORATION' : 'CRITICAL';
}

// ---- Targets from our own data ------------------------------------------------

interface SopTargets {
  flood: string[];
  overhead: string[];
  lifeline: string[];
  counts: { flood: number; overhead: number; lifeline: number };
}

const MAX_TARGETS = 4;

function isOverheadFeeder(f: FeederDetail): boolean {
  const cfg = (f.config || '').toUpperCase();
  return cfg.includes('OH') || cfg.includes('OVERHEAD') || cfg.includes('MIXED');
}

/**
 * Chennai's average elevation, from the GCC City DMP 2023 Preface ("barely 2.0 meters above mean sea level").
 * The scenarios model no storm surge, so "flood" targets are the lowest-lying substations by the
 * elevation stored in the grid data (Earth Engine terrain data).
 */
const AVERAGE_ELEVATION_M = 2.0;

function buildTargets(substations: TnebSubstation[]): SopTargets {
  const nameOf = (ss: TnebSubstation) => ss.cleanName || ss.name;

  const withElevation = substations
    .filter(ss => ss.elevationM !== undefined)
    .sort((a, b) => (a.elevationM as number) - (b.elevationM as number));
  const lowLying = withElevation.filter(ss => (ss.elevationM as number) <= AVERAGE_ELEVATION_M);

  const overheadRanked = substations
    .map(ss => ({ ss, n: (ss.feeders || []).filter(isOverheadFeeder).length }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const lifelineRanked = substations
    .map(ss => ({
      ss,
      n: (ss.feeders || []).filter(f => f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water').length,
    }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n);

  return {
    flood: withElevation.slice(0, MAX_TARGETS).map(nameOf),
    overhead: overheadRanked.slice(0, MAX_TARGETS).map(x => nameOf(x.ss)),
    lifeline: lifelineRanked.slice(0, MAX_TARGETS).map(x => nameOf(x.ss)),
    counts: {
      flood: lowLying.length,
      overhead: overheadRanked.length,
      lifeline: lifelineRanked.reduce((sum, x) => sum + x.n, 0),
    },
  };
}

function targetsFor(group: TargetGroup, targets: SopTargets): string[] {
  return group === 'none' ? [] : targets[group];
}

function fallbackNote(group: TargetGroup, targets: SopTargets): string | undefined {
  switch (group) {
    case 'flood':
      return `${targets.counts.flood} substations sit at or below ${AVERAGE_ELEVATION_M} m MSL, the average elevation of Chennai; the lowest-lying are listed.`;
    case 'overhead':
      return `${targets.counts.overhead} substations have overhead or mixed feeders in the grid data.`;
    case 'lifeline':
      return `${targets.counts.lifeline} hospital and water feeders in the grid data; the substations listed serve the most.`;
    default:
      return undefined;
  }
}

// ---- Directive assembly ----------------------------------------------------------

interface BuiltDirective {
  directive: GeminiSopDirective;
  targets: SopTargets;
  ruleIds: string[];
}

function scenarioKeyOf(scenarioId: ScenarioId): ScenarioKey | null {
  return scenarioId === 'LIVE' ? null : scenarioId;
}

function hourLabel(hour: number): string {
  return `T${hour >= 0 ? '+' : ''}${hour}h`;
}

function buildDirective(
  scenarioId: ScenarioId,
  timestep: ScenarioTimestep,
  substations: TnebSubstation[],
  liveOutages: LiveOutage[]
): BuiltDirective | null {
  const scenarioKey = scenarioKeyOf(scenarioId);
  if (!scenarioKey) return null;

  const hour = timestep.timestep_hour;
  const windKmh = Math.abs(timestep.wind_speed_10m_kmh);
  const rainMm = timestep.total_precipitation_1hr_mm;
  const phase = resolvePhase(timestep);
  const imdClass = getImdCycloneClass(windKmh);
  const targets = buildTargets(substations);

  const ruleIds = (PHASE_RULES[scenarioKey][phase] || []).filter(id => getOfficialRule(id) && RULE_META[id]);
  // The data note is shown once per target group, on the first action that uses it, to avoid repeating it.
  const groupsWithNote = new Set<TargetGroup>();
  const actionItems: SopActionItem[] = ruleIds.map(id => {
    const rule = getOfficialRule(id) as OfficialRule;
    const meta = RULE_META[id];
    const names = targetsFor(meta.group, targets);
    const note = groupsWithNote.has(meta.group) ? undefined : fallbackNote(meta.group, targets);
    if (note) groupsWithNote.add(meta.group);
    return {
      id,
      category: meta.category,
      title: meta.title,
      quote: rule.quote,
      citation: formatCitation(rule),
      note,
      targetFeedersOrSubstations: names.length > 0 ? names : undefined,
    };
  });

  const sourceIds = new Set<OfficialSourceId>();
  ruleIds.forEach(id => sourceIds.add((getOfficialRule(id) as OfficialRule).sourceId));
  const sources = Array.from(sourceIds).map(sid => OFFICIAL_SOURCES[sid].shortName);

  const summaryEn =
    `${hourLabel(hour)}: area-mean rain ${rainMm.toFixed(1)} mm/h, wind ${windKmh.toFixed(0)} km/h${imdClass ? ` (IMD class: ${imdClass.name})` : ''}. ` +
    `${targets.counts.flood} substations sit at or below ${AVERAGE_ELEVATION_M} m MSL, the average elevation of Chennai. ` +
    `The actions below are quoted from official disaster management plans.`;

  const directive: GeminiSopDirective = {
    scenarioId,
    hour,
    label: hourLabel(hour),
    title: PHASE_TITLES[scenarioKey][phase],
    urgency: phase,
    summaryEn,
    sources,
    weatherSnapshot: {
      windKmh,
      rainMm,
      pressureHpa: timestep.surface_pressure_hpa ?? null,
      imdClass: imdClass
        ? `${imdClass.name} (${imdClass.minKmh}${imdClass.maxKmh ? `-${imdClass.maxKmh}` : '+'} km/h)`
        : null,
    },
    exposure: targets.counts,
    actionItems,
    geminiModelTag: 'Official quotes · rule-based',
    timestamp: `${hourLabel(hour)} ${timestep.label || ''}`.trim(),
    compromisedAssets: extractTopCompromisedInfra(substations, liveOutages, timestep, 6),
  };

  return { directive, targets, ruleIds };
}

/**
 * Returns the SOP for a scenario hour, built only from quoted official actions.
 * Substation names and counts come from our grid data. No Gemini call is made here.
 */
export function getDirectiveForTimestep(
  scenarioId: ScenarioId,
  timestep: ScenarioTimestep,
  substations: TnebSubstation[] = [],
  liveOutages: LiveOutage[] = []
): GeminiSopDirective | null {
  return buildDirective(scenarioId, timestep, substations, liveOutages)?.directive ?? null;
}

// ---- Gemini wording layer --------------------------------------------------------

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  MICHAUNG_2023: 'Cyclone Michaung, December 2023 (hindcast)',
  FLOODS_2015: '2015 Chennai floods (hindcast)',
  MONSOON_2020: 'Northeast monsoon rain spell, mid-November 2020 (hindcast)',
};

const geminiSopCache = new Map<string, GeminiSopDirective>();
const MAX_NOTE_CHARS = 220;
const MAX_SUMMARY_CHARS = 420;

const SOP_SYSTEM_INSTRUCTION =
  'You help a power-utility control room in Chennai during a cyclone or flood. You are given a fixed list of official actions ' +
  '(each with an id and an exact quote) and lists of substation names taken from our own grid data. ' +
  'For each action, choose which of the listed substations it applies to and write one short note that ties the action to the data provided. ' +
  'Also write a two-sentence summary of the situation. ' +
  'Rules: use only substation names that appear in the lists; never add numbers, thresholds, times, quantities, clause numbers or facts that are not in the input; ' +
  'never restate, reword or cite the quotes; if an action has no list, return an empty applyTo.';

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) || [];
}

/** A generated sentence is accepted only if every number in it already appears in the prompt. */
function isGroundedText(text: unknown, promptNumbers: Set<string>, maxChars: number): text is string {
  if (typeof text !== 'string' || text.trim() === '' || text.length > maxChars) return false;
  return numbersIn(text).every(n => promptNumbers.has(n));
}

/**
 * Asks Gemini 2.5 Flash to choose targets and word a short note for each quoted action.
 * Gemini cannot change the quotes or citations. Any invalid or ungrounded output is
 * discarded and the rule-based text stays. Falls back completely on any failure.
 */
export async function fetchLiveGeminiDirective(
  scenarioId: ScenarioId,
  timestep: ScenarioTimestep,
  substations: TnebSubstation[] = [],
  liveOutages: LiveOutage[] = []
): Promise<GeminiSopDirective | null> {
  const built = buildDirective(scenarioId, timestep, substations, liveOutages);
  if (!built) return null;
  const { directive: fallback, targets, ruleIds } = built;

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || ruleIds.length === 0) {
    return fallback;
  }

  const cacheKey = `${scenarioId}_${timestep.timestep_hour}_${targets.flood.join('-')}_${targets.overhead.join('-')}_${targets.lifeline.join('-')}`;
  const cached = geminiSopCache.get(cacheKey);
  if (cached) return cached;

  const w = fallback.weatherSnapshot;
  const actionLines = ruleIds
    .map(id => `${id}|${RULE_META[id].group}|${(getOfficialRule(id) as OfficialRule).quote}`)
    .join('\n');
  const prompt = `SCENARIO: ${SCENARIO_LABELS[scenarioId as ScenarioKey]}
TIME: ${hourLabel(timestep.timestep_hour)} (T-0 is the peak-rain hour)
WEATHER (area mean): wind ${w.windKmh.toFixed(0)} km/h${w.imdClass ? ` (IMD class ${w.imdClass})` : ''} | rain ${w.rainMm.toFixed(1)} mm/h
SUBSTATION LISTS (names from our grid data):
flood (lowest-lying): ${targets.flood.join(', ') || 'none'}
overhead: ${targets.overhead.join(', ') || 'none'}
lifeline: ${targets.lifeline.join(', ') || 'none'}
COUNTS: ${targets.counts.flood} substations at or below 2.0 m MSL; ${targets.counts.overhead} substations with overhead or mixed feeders; ${targets.counts.lifeline} hospital and water feeders
ACTIONS (id|list to use|exact quote):
${actionLines}`;

  const promptNumbers = new Set(numbersIn(prompt));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SOP_SYSTEM_INSTRUCTION }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                summaryEn: { type: 'STRING' },
                actions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      ruleId: { type: 'STRING', enum: ruleIds },
                      applyTo: { type: 'ARRAY', items: { type: 'STRING' } },
                      note: { type: 'STRING' },
                    },
                    required: ['ruleId', 'applyTo', 'note'],
                  },
                },
              },
              required: ['summaryEn', 'actions'],
            },
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn('Gemini API returned status:', res.status);
      return fallback;
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return fallback;

    const parsed = JSON.parse(rawText);
    const byRule = new Map<string, { applyTo?: unknown; note?: unknown }>();
    if (Array.isArray(parsed.actions)) {
      for (const a of parsed.actions) {
        if (a && typeof a.ruleId === 'string' && ruleIds.includes(a.ruleId)) byRule.set(a.ruleId, a);
      }
    }

    const actionItems = fallback.actionItems.map(item => {
      const g = byRule.get(item.id);
      if (!g) return item;
      const allowed = new Set(targetsFor(RULE_META[item.id].group, targets));
      const chosen = Array.isArray(g.applyTo)
        ? (g.applyTo as unknown[]).filter((n): n is string => typeof n === 'string' && allowed.has(n))
        : [];
      return {
        ...item,
        note: item.note !== undefined && isGroundedText(g.note, promptNumbers, MAX_NOTE_CHARS) ? g.note : item.note,
        targetFeedersOrSubstations: chosen.length > 0 ? chosen : item.targetFeedersOrSubstations,
      };
    });

    const enriched: GeminiSopDirective = {
      ...fallback,
      summaryEn: isGroundedText(parsed.summaryEn, promptNumbers, MAX_SUMMARY_CHARS) ? parsed.summaryEn : fallback.summaryEn,
      actionItems,
      geminiModelTag: 'Gemini 2.5 Flash · wording only, quotes are official',
    };

    geminiSopCache.set(cacheKey, enriched);
    return enriched;
  } catch (err) {
    console.warn('Gemini live call error, using rule-based text:', err);
    return fallback;
  }
}
