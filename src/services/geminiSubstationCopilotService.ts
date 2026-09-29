/**
 * geminiSubstationCopilotService.ts
 *
 * Substation Copilot: what to do at ONE substation during a scenario hour.
 * Same rule as the city-wide SOP: every action is a word-for-word quote from an official disaster
 * management plan (src/data/officialSources.ts, docs/SOURCES.md). Our grid data only decides which
 * flags apply to the substation. Gemini may pick feeders from lists we give it and word one short
 * note; it never chooses flags, writes actions or cites the plans.
 */

import type { TnebSubstation, FeederDetail } from '../types/tneb';
import type { ScenarioId, ScenarioTimestep } from './scenarioService';
import type { LiveOutage } from './liveOutageService';
import { getEnrichedHealthProfile } from './gridHealthService';
import { getCachedOfficialFlood, describeOfficialFlood } from './officialFloodLayers';
import { generateJson } from './geminiClient';
import {
  CHENNAI_AVERAGE_ELEVATION_M,
  formatCitation,
  getImdCycloneClass,
  getOfficialRule,
  type OfficialRule,
} from '../data/officialSources';
import {
  RULE_META,
  isGroundedText,
  isOverheadFeeder,
  resolvePhase,
  scenarioLabel,
  type SopCategory,
  type SopPhase,
} from './geminiSopService';

export type SubstationFlagId = 'LOW_LYING' | 'FLOOD_MAP' | 'OVERHEAD' | 'LIFELINE';

export interface SubstationFlag {
  id: SubstationFlagId;
  label: string;
  /** Fact from our grid data behind the flag. */
  detail: string;
}

export interface SubstationTacticalAction {
  /** Id of the official rule in officialSources.ts. */
  id: string;
  category: SopCategory;
  /** Short label (ours). The quote and citation beneath it are official. */
  title: string;
  quote: string;
  citation: string;
  /** Feeder names from our data that this action applies to, when relevant. */
  feeders?: string[];
}

export interface SubstationCopilotAdvisory {
  substationCode: string;
  substationName: string;
  phase: SopPhase;
  flags: SubstationFlag[];
  actions: SubstationTacticalAction[];
  /** One sentence tying the actions to this substation's data. */
  note?: string;
  modelTag: string;
  cached: boolean;
  timestamp: string;
}

// Official actions used for each flag and phase. Every id exists in officialSources.ts.
type FlagKey = SubstationFlagId | 'BASE';
const FLOOD_ACTIONS: Record<SopPhase, string[]> = {
  WATCH: ['mop-dewatering-pump-arranged', 'tangedco-sandbags'],
  CRITICAL: ['tangedco-pump-out-flood', 'mop-mobile-dg-sets'],
  RESTORATION: ['tangedco-pump-out-flood'],
};

const FLAG_ACTIONS: Record<FlagKey, Record<SopPhase, string[]>> = {
  LOW_LYING: FLOOD_ACTIONS,
  FLOOD_MAP: FLOOD_ACTIONS,
  OVERHEAD: {
    WATCH: ['gcc-check-transformers-pillar-boxes'],
    CRITICAL: ['tangedco-oh-lines-out-of-service', 'mop-switch-off-if-required'],
    RESTORATION: ['tangedco-no-recharge-before-patrol'],
  },
  LIFELINE: {
    WATCH: ['mop-diesel-7-days'],
    CRITICAL: ['gcc-run-dg-set-relief-campus'],
    RESTORATION: ['mop-restore-priority'],
  },
  BASE: {
    WATCH: ['gcc-check-transformers-pillar-boxes'],
    CRITICAL: ['mop-switch-off-if-required'],
    RESTORATION: ['tangedco-no-recharge-before-patrol'],
  },
};

const MAX_ACTIONS = 4;
const MAX_FEEDER_NAMES = 3;
const MAX_NOTE_CHARS = 240;

const copilotCache = new Map<string, SubstationCopilotAdvisory>();

function isLifelineFeeder(f: FeederDetail): boolean {
  return f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water';
}

interface SubstationFacts {
  elevation: number | undefined;
  /** Official flood-map lines that are true for this location (empty if none or not loaded). */
  floodMapLines: string[];
  /** True when inside the 2015 extent or rated Moderate/High on the official hazard maps. */
  onFloodMap: boolean;
  total: number;
  overhead: FeederDetail[];
  underground: number;
  lifeline: FeederDetail[];
}

function gatherFacts(substation: TnebSubstation): SubstationFacts {
  const feeders = substation.feeders || [];
  const overhead = feeders.filter(isOverheadFeeder);
  const officialFlood = getCachedOfficialFlood(substation.code);
  return {
    elevation: substation.elevationM,
    floodMapLines: officialFlood ? describeOfficialFlood(officialFlood) : [],
    onFloodMap: Boolean(officialFlood && (officialFlood.nrsc2015 || officialFlood.returnPeriod === 'HIGH' || officialFlood.returnPeriod === 'MODERATE')),
    total: feeders.length,
    overhead,
    underground: feeders.length - overhead.length,
    lifeline: feeders.filter(isLifelineFeeder),
  };
}

function buildFlags(facts: SubstationFacts): SubstationFlag[] {
  const flags: SubstationFlag[] = [];
  if (facts.elevation !== undefined && facts.elevation <= CHENNAI_AVERAGE_ELEVATION_M) {
    flags.push({
      id: 'LOW_LYING',
      label: 'Low-lying yard',
      detail: `Yard elevation ${facts.elevation} m MSL, at or below Chennai's average of ${CHENNAI_AVERAGE_ELEVATION_M} m.`,
    });
  }
  if (facts.onFloodMap) {
    flags.push({
      id: 'FLOOD_MAP',
      label: 'On an official flood map',
      detail: `Official flood-map checks: ${facts.floodMapLines.join('; ')}.`,
    });
  }
  if (facts.overhead.length > 0) {
    flags.push({
      id: 'OVERHEAD',
      label: `Overhead feeders (${facts.overhead.length})`,
      detail: `${facts.overhead.length} of ${facts.total} feeders are overhead or mixed.`,
    });
  }
  if (facts.lifeline.length > 0) {
    flags.push({
      id: 'LIFELINE',
      label: `Hospital/water feeders (${facts.lifeline.length})`,
      detail: `${facts.lifeline.length} hospital or water feeders: ${facts.lifeline
        .slice(0, MAX_FEEDER_NAMES)
        .map(f => f.name)
        .join(', ')}.`,
    });
  }
  return flags;
}

function feederNamesFor(flag: FlagKey, facts: SubstationFacts): string[] {
  if (flag === 'OVERHEAD') return facts.overhead.slice(0, MAX_FEEDER_NAMES).map(f => f.name);
  if (flag === 'LIFELINE') return facts.lifeline.slice(0, MAX_FEEDER_NAMES).map(f => f.name);
  return [];
}

interface BuiltAdvisory {
  advisory: SubstationCopilotAdvisory;
  facts: SubstationFacts;
  /** Which feeder names each action may use (empty for actions without feeders). */
  allowedFeeders: Record<string, string[]>;
}

function buildAdvisory(
  substation: TnebSubstation,
  timestep: ScenarioTimestep | null | undefined,
  liveOutages: LiveOutage[]
): BuiltAdvisory {
  const profile = getEnrichedHealthProfile(substation, liveOutages);
  const phase: SopPhase = timestep ? resolvePhase(timestep) : 'WATCH';
  const facts = gatherFacts(substation);
  const flags = buildFlags(facts);

  const flagKeys: FlagKey[] = flags.length > 0 ? flags.map(f => f.id) : ['BASE'];
  const actions: SubstationTacticalAction[] = [];
  const allowedFeeders: Record<string, string[]> = {};
  const seen = new Set<string>();

  for (const key of flagKeys) {
    for (const id of FLAG_ACTIONS[key][phase]) {
      const rule = getOfficialRule(id);
      const meta = RULE_META[id];
      if (!rule || !meta || seen.has(id) || actions.length >= MAX_ACTIONS) continue;
      seen.add(id);
      const feeders = feederNamesFor(key, facts);
      allowedFeeders[id] = feeders;
      actions.push({
        id,
        category: meta.category,
        title: meta.title,
        quote: rule.quote,
        citation: formatCitation(rule),
        feeders: feeders.length > 0 ? feeders : undefined,
      });
    }
  }

  const advisory: SubstationCopilotAdvisory = {
    substationCode: substation.code,
    substationName: substation.cleanName || substation.name,
    phase,
    flags,
    actions,
    note: `Health grade ${profile.healthGrade} (${profile.healthScore}/100), ${profile.unscheduledTripsCount} unscheduled trips in the last 90 days.`,
    modelTag: 'Official quotes · rule-based',
    cached: false,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
  return { advisory, facts, allowedFeeders };
}

/** Rule-based advisory: flags from our data, actions quoted from the official plans. Always available. */
export function generateDeterministicTacticalAdvisory(
  substation: TnebSubstation,
  _scenarioId: ScenarioId | string,
  timestep?: ScenarioTimestep | null,
  liveOutages: LiveOutage[] = []
): SubstationCopilotAdvisory {
  return buildAdvisory(substation, timestep, liveOutages).advisory;
}

const COPILOT_SYSTEM_INSTRUCTION =
  'You help a substation engineer in Chennai during a cyclone or flood. You are given facts about one substation from our grid data ' +
  'and a fixed list of official actions (each with an id and an exact quote). ' +
  'For each action, choose which of the listed feeder names it applies to, and write one short note (one sentence) that ties the actions to the facts provided. ' +
  'Rules: use only feeder names that appear in the lists; never add numbers, thresholds, times, quantities, clause numbers or facts that are not in the input; ' +
  'never restate, reword or cite the quotes; if an action has no feeder list, return an empty feeders array. ' +
  'Describe only what the input states; do not conclude that a place is flood-prone, at risk or will flood unless the input says so. ' +
  'Never say that a fact causes, indicates, suggests or calls for an action; state the facts, and say only that the listed actions apply.';

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) || [];
}

/**
 * Asks Gemini to choose feeders and word a note for the rule-based actions. Invalid or ungrounded output
 * is discarded. Failures are NOT cached, and `force` skips the cache, so Re-evaluate can retry.
 */
export async function fetchSubstationTacticalAdvisory(
  substation: TnebSubstation,
  scenarioId: ScenarioId | string,
  timestep?: ScenarioTimestep | null,
  liveOutages: LiveOutage[] = [],
  options: { force?: boolean } = {}
): Promise<SubstationCopilotAdvisory> {
  const built = buildAdvisory(substation, timestep, liveOutages);
  const { advisory: fallback, facts, allowedFeeders } = built;
  if (!timestep || scenarioId === 'LIVE' || scenarioId === 'NORMAL' || fallback.actions.length === 0) return fallback;

  const cacheKey = `${substation.code}_${scenarioId}_${timestep.timestep_hour}_${built.facts.floodMapLines.length}`;
  if (!options.force) {
    const cached = copilotCache.get(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const profile = getEnrichedHealthProfile(substation, liveOutages);
  const imd = getImdCycloneClass(timestep.wind_speed_10m_kmh);
  const actionLines = fallback.actions
    .map(a => `${a.id}|${(a.feeders || []).join('; ') || 'none'}|${(getOfficialRule(a.id) as OfficialRule).quote}`)
    .join('\n');
  const officialFlood = getCachedOfficialFlood(substation.code);
  const officialFloodLines = officialFlood ? describeOfficialFlood(officialFlood) : null;
  const officialFloodText = officialFloodLines === null ? 'not loaded' : officialFloodLines.length > 0 ? officialFloodLines.join('; ') : 'not inside any of the official flood layers checked';
  const prompt = `SCENARIO: ${scenarioLabel(scenarioId as ScenarioId)}
TIME: T${timestep.timestep_hour >= 0 ? '+' : ''}${timestep.timestep_hour}h (T-0 is the peak-rain hour) | PHASE: ${fallback.phase}
WEATHER (area mean): wind ${Math.abs(timestep.wind_speed_10m_kmh).toFixed(0)} km/h${imd ? ` (IMD class ${imd.name})` : ''} | rain ${timestep.total_precipitation_1hr_mm.toFixed(1)} mm/h
SUBSTATION: ${fallback.substationName} (${substation.voltage}) | yard elevation ${facts.elevation !== undefined ? `${facts.elevation} m MSL` : 'unknown'} | health grade ${profile.healthGrade} (${profile.healthScore}/100) | ${profile.unscheduledTripsCount} unscheduled trips in 90 days
FEEDERS: ${facts.total} total | ${facts.overhead.length} overhead or mixed | ${facts.underground} underground | ${facts.lifeline.length} hospital or water
FLAGS: ${fallback.flags.map(f => f.label).join(', ') || 'none'}
HEALTH (SurgeGrid's own rating): ${profile.periodicMaintenanceCount} scheduled maintenance runs and ${profile.unscheduledTripsCount} unscheduled trips in the last 90 days | live outage notices matched today: ${liveOutages.length}
OFFICIAL FLOOD MAPS (location check): ${officialFloodText}
ACTIONS (id|feeder names to use|exact quote):
${actionLines}`;
  const promptNumbers = new Set(numbersIn(prompt));
  const ruleIds = fallback.actions.map(a => a.id);

  try {
    const parsed = (await generateJson({
      systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
      prompt,
      responseSchema: {
        type: 'OBJECT',
        properties: {
          note: { type: 'STRING' },
          actions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                ruleId: { type: 'STRING', enum: ruleIds },
                feeders: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['ruleId', 'feeders'],
            },
          },
        },
        required: ['note', 'actions'],
      },
    })) as { note?: unknown; actions?: unknown } | null;
    if (!parsed) return fallback;

    const byRule = new Map<string, { feeders?: unknown }>();
    if (Array.isArray(parsed.actions)) {
      for (const a of parsed.actions) {
        if (a && typeof a.ruleId === 'string' && ruleIds.includes(a.ruleId)) byRule.set(a.ruleId, a);
      }
    }

    const actions = fallback.actions.map(act => {
      const g = byRule.get(act.id);
      if (!g || !Array.isArray(g.feeders)) return act;
      const allowed = new Set(allowedFeeders[act.id] || []);
      const chosen = (g.feeders as unknown[]).filter((n): n is string => typeof n === 'string' && allowed.has(n));
      return chosen.length > 0 ? { ...act, feeders: chosen } : act;
    });

    const noteOk = isGroundedText(parsed.note, promptNumbers, MAX_NOTE_CHARS);

    const enriched: SubstationCopilotAdvisory = {
      ...fallback,
      actions,
      note: noteOk ? (parsed.note as string) : fallback.note,
      modelTag: 'Gemini 2.5 Flash · wording only, quotes are official',
    };
    copilotCache.set(cacheKey, enriched);
    return enriched;
  } catch (err) {
    console.warn('Gemini Substation Copilot error, using rule-based text:', err);
    return fallback;
  }
}
