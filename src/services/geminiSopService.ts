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
import { generateJson } from './geminiClient';
import { getCachedOfficialFlood } from './officialFloodLayers';
import {
  CHENNAI_AVERAGE_ELEVATION_M,
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
  /**
   * Counts for the step on screen (our order, see simulationExposure.ts): `flood` = sites to check first, `overhead` = sites to
   * check with overhead or mixed feeders, `lifeline` = hospital and water feeders at the sites to check; `toCheck` of
   * `withFloodFact` sites have Heavy rain or worse here. Without a step result they fall back to grid-data counts.
   */
  exposure: {
    flood: number;
    overhead: number;
    lifeline: number;
    toCheck?: number;
    withFloodFact?: number;
  };
  /** Sites to check first at this step, spread across the city (our order). */
  checkFirstSites?: string[];
  actionItems: SopActionItem[];
  geminiModelTag: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Official-quote SOP
// ---------------------------------------------------------------------------

export type SopPhase = 'WATCH' | 'CRITICAL' | 'RESTORATION';
// flood = sites where water can get in (2015 extent or low yard); transmission = 230/110 kV sites (for ERS towers);
// none = planning or city-wide actions that apply to every site to check, with no site chips.
type TargetGroup = 'flood' | 'transmission' | 'overhead' | 'lifeline' | 'none';
type ScenarioKey = 'MICHAUNG_2023';

export interface RuleMeta {
  title: string;
  category: SopCategory;
  group: TargetGroup;
}

// Short labels are ours; the quote and citation shown beneath each one are official.
export const RULE_META: Record<string, RuleMeta> = {
  'mop-diesel-7-days': { title: 'Keep diesel for substation generators', category: 'FIELD', group: 'none' },
  'mop-check-inventories': { title: 'Check and top up inventories near the likely area', category: 'FIELD', group: 'none' },
  'mop-move-ers-towers': { title: 'Move ERS towers to the nearest substation', category: 'FIELD', group: 'transmission' },
  'mop-deploy-manpower': { title: 'Deploy expert manpower to the nearest station', category: 'FIELD', group: 'none' },
  'mop-identify-flood-prone': { title: 'Identify flood-prone substations', category: 'FIELD', group: 'none' },
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
};

const PHASE_TITLES: Record<ScenarioKey, Record<SopPhase, string>> = {
  MICHAUNG_2023: {
    WATCH: 'Cyclone approaching: standby actions from the official plans',
    CRITICAL: 'Cyclone impact: safety and switch-off actions from the official plans',
    RESTORATION: 'After the storm: safe recharge and restoration priority',
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

export function resolvePhase(timestep: ScenarioTimestep): SopPhase {
  const hour = timestep.timestep_hour;
  if (hour < 0) return 'WATCH';
  return hour > 0 && timestep.total_precipitation_1hr_mm < RAIN_STOPPED_MM ? 'RESTORATION' : 'CRITICAL';
}

// ---- Targets from our own data ------------------------------------------------

interface SopTargets {
  flood: string[];
  transmission: string[];
  overhead: string[];
  lifeline: string[];
  /** Sites to check first, spread across the city (at most one per ~11 km cell), for the line at the top. */
  checkFirst?: string[];
  counts: { flood: number; overhead: number; lifeline: number };
  /** Set when the targets come from the step's sites to check. */
  step?: { toCheck: number; withFloodFact: number };
}

const MAX_TARGETS = 4;

export function isOverheadFeeder(f: FeederDetail): boolean {
  const cfg = (f.config || '').toUpperCase();
  return cfg.includes('OH') || cfg.includes('OVERHEAD') || cfg.includes('MIXED');
}

/**
 * Chennai's average elevation, from the GCC City DMP 2023 Preface ("barely 2.0 meters above mean sea level").
 * The scenarios model no storm surge, so "flood" targets are the lowest-lying substations by the
 * elevation stored in the grid data (Earth Engine terrain data).
 */

/** The step's sites to check (Check first / Check next), from computeExposure. */
export interface StepSites {
  sites: { substation: TnebSubstation; tier: 'first' | 'next'; mm24: number }[];
  withFloodFact: number;
}

function isLifelineFeeder(f: FeederDetail): boolean {
  return f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water';
}

/** The ~11 km (0.1 degree) cell a site is in, so a list can take at most one site per area. */
function cellKey(ss: TnebSubstation): string {
  return `${Math.floor(ss.lat * 10)}_${Math.floor(ss.lng * 10)}`;
}

/** The first `n` sites of a ranked list, at most one per ~11 km cell, so one cluster cannot fill the list. */
function spread<T>(ranked: T[], site: (x: T) => TnebSubstation, n: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of ranked) {
    const key = cellKey(site(x));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
    if (out.length === n) break;
  }
  return out;
}

const MAX_CHECK_FIRST = 6;

/**
 * Targets for one step, each list spread across the city and ranked by rain here (ties by consumers served):
 * - checkFirst: the sites to check first (the line at the top);
 * - flood (dewatering, sandbags, pumping out): check-first sites inside the 2015 flood extent or with a yard at or below 2 m;
 * - transmission (ERS towers): 230 kV and 110 kV sites among the check-first sites;
 * - overhead: sites to check with the most overhead feeders; lifeline: sites to check serving the most hospital and water feeders.
 */
function buildStepTargets(step: StepSites): SopTargets {
  const nameOf = (ss: TnebSubstation) => ss.cleanName || ss.name;
  const byRain = (a: StepSites['sites'][number], b: StepSites['sites'][number]) =>
    b.mm24 - a.mm24 || (b.substation.totalConsumers ?? 0) - (a.substation.totalConsumers ?? 0);
  const first = step.sites.filter(x => x.tier === 'first').sort(byRain);
  const waterCanEnter = (ss: TnebSubstation) =>
    Boolean(getCachedOfficialFlood(ss.code)?.nrsc2015) || (ss.elevationM !== undefined && ss.elevationM <= CHENNAI_AVERAGE_ELEVATION_M);
  const floodPool = first.filter(x => waterCanEnter(x.substation));
  const transmissionPool = first.filter(x => x.substation.tier === 'bulk' || x.substation.tier === 'subtransmission');
  const overheadRanked = step.sites
    .map(x => ({ x, n: (x.substation.feeders || []).filter(isOverheadFeeder).length }))
    .filter(y => y.n > 0)
    .sort((a, b) => (a.x.tier === b.x.tier ? b.n - a.n : a.x.tier === 'first' ? -1 : 1));
  const lifelineRanked = step.sites
    .map(x => ({ x, n: (x.substation.feeders || []).filter(isLifelineFeeder).length }))
    .filter(y => y.n > 0)
    .sort((a, b) => b.n - a.n);
  return {
    checkFirst: spread(first, x => x.substation, MAX_CHECK_FIRST).map(x => nameOf(x.substation)),
    flood: spread(floodPool, x => x.substation, MAX_TARGETS).map(x => nameOf(x.substation)),
    transmission: spread(transmissionPool, x => x.substation, MAX_TARGETS).map(x => nameOf(x.substation)),
    overhead: spread(overheadRanked, y => y.x.substation, MAX_TARGETS).map(y => nameOf(y.x.substation)),
    lifeline: spread(lifelineRanked, y => y.x.substation, MAX_TARGETS).map(y => nameOf(y.x.substation)),
    counts: {
      flood: first.length,
      overhead: overheadRanked.length,
      lifeline: lifelineRanked.reduce((sum, y) => sum + y.n, 0),
    },
    step: { toCheck: step.sites.length, withFloodFact: step.withFloodFact },
  };
}

function buildTargets(substations: TnebSubstation[]): SopTargets {
  const nameOf = (ss: TnebSubstation) => ss.cleanName || ss.name;

  const withElevation = substations
    .filter(ss => ss.elevationM !== undefined)
    .sort((a, b) => (a.elevationM as number) - (b.elevationM as number));
  const lowLying = withElevation.filter(ss => (ss.elevationM as number) <= CHENNAI_AVERAGE_ELEVATION_M);

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
    transmission: [],
    overhead: overheadRanked.slice(0, MAX_TARGETS).map(x => nameOf(x.ss)),
    lifeline: lifelineRanked.slice(0, MAX_TARGETS).map(x => nameOf(x.ss)),
    counts: {
      flood: lowLying.length,
      overhead: overheadRanked.length,
      lifeline: lifelineRanked.reduce((sum, x) => sum + x.n, 0),
    },
  };
}

/** The substation lists and counts as prompt lines. */
function targetLines(targets: SopTargets): string {
  if (targets.step) {
    return [
      "SUBSTATION LISTS for this step (SurgeGrid's own order, not official: Heavy rain or worse already recorded at the site, as the satellite total for the last 24 hours or the nearest IMD gauge's latest daily total, and a flood fact from official maps or the GCC 2015 register):",
      `flood (sites to check first inside the 2015 flood extent or with a yard at or below 2 m): ${targets.flood.join(', ') || 'none'}`,
      `transmission (230 kV and 110 kV sites among the sites to check first): ${targets.transmission.join(', ') || 'none'}`,
      `overhead (sites to check with overhead or mixed feeders): ${targets.overhead.join(', ') || 'none'}`,
      `lifeline (sites to check with hospital or water feeders): ${targets.lifeline.join(', ') || 'none'}`,
      `COUNTS: ${targets.step.toCheck} of ${targets.step.withFloodFact} substations with a flood fact had Heavy rain or worse (recorded totals, not this hour); ` +
        `${targets.counts.flood} to check first; ${targets.counts.overhead} of the sites to check have overhead or mixed feeders; ` +
        `${targets.counts.lifeline} hospital and water feeders at the sites to check`,
    ].join('\n');
  }
  return [
    'SUBSTATION LISTS (names from our grid data):',
    `flood (lowest-lying): ${targets.flood.join(', ') || 'none'}`,
    `overhead: ${targets.overhead.join(', ') || 'none'}`,
    `lifeline: ${targets.lifeline.join(', ') || 'none'}`,
    `COUNTS: ${targets.counts.flood} substations at or below 2.0 m MSL; ${targets.counts.overhead} substations with overhead or mixed feeders; ${targets.counts.lifeline} hospital and water feeders`,
  ].join('\n');
}

function targetsFor(group: TargetGroup, targets: SopTargets): string[] {
  if (group === 'transmission') return targets.transmission;
  return group === 'none' ? [] : targets[group];
}

function fallbackNote(group: TargetGroup, targets: SopTargets): string | undefined {
  if (targets.step) {
    const { toCheck } = targets.step;
    switch (group) {
      case 'flood':
        return toCheck === 0
          ? 'No substation with a flood fact had Heavy rain or worse yet at this step.'
          : targets.flood.length === 0
          ? 'None of the sites to check first is inside the 2015 flood extent or has a yard at or below 2 m.'
          : 'Sites to check first that are inside the 2015 flood extent or have a yard at or below 2 m (our match), one per area, most rain first.';
      case 'transmission':
        return toCheck === 0
          ? undefined
          : targets.transmission.length === 0
          ? 'None of the sites to check first is a 230 kV or 110 kV substation.'
          : '230 kV and 110 kV substations among the sites to check first (our match), one per area.';
      case 'none':
        return toCheck === 0 ? undefined : `Applies to all ${toCheck} sites to check at this step; no single site is named.`;
      case 'overhead':
        return toCheck === 0 ? undefined : `${targets.counts.overhead} of the ${toCheck} sites to check have overhead or mixed feeders.`;
      case 'lifeline':
        return toCheck === 0 ? undefined : `${targets.counts.lifeline} hospital and water feeders are fed from the sites to check.`;
      default:
        return undefined;
    }
  }
  switch (group) {
    case 'flood':
      return `${targets.counts.flood} substations sit at or below ${CHENNAI_AVERAGE_ELEVATION_M} m MSL, the average elevation of Chennai; the lowest-lying are listed.`;
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
  return hour === 0 ? 'T-0h' : `T${hour > 0 ? '+' : ''}${hour}h`;
}

function buildDirective(
  scenarioId: ScenarioId,
  timestep: ScenarioTimestep,
  substations: TnebSubstation[],
  step?: StepSites | null
): BuiltDirective | null {
  const scenarioKey = scenarioKeyOf(scenarioId);
  if (!scenarioKey) return null;

  const hour = timestep.timestep_hour;
  const windKmh = Math.abs(timestep.wind_speed_10m_kmh);
  const rainMm = timestep.total_precipitation_1hr_mm;
  const phase = resolvePhase(timestep);
  const imdClass = getImdCycloneClass(windKmh);
  const targets = step ? buildStepTargets(step) : buildTargets(substations);

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

  const summaryEn = targets.step
    ? `${hourLabel(hour)}: ${targets.step.toCheck} of ${targets.step.withFloodFact} substations with a flood fact had Heavy rain or worse in the last 24 hours ` +
      `or the latest IMD gauge day (${targets.counts.flood} to check first; our order). This hour, city-mean rain ${rainMm.toFixed(1)} mm/h, wind ${windKmh.toFixed(0)} km/h. ` +
      `The actions below are quoted from official disaster management plans.`
    : `${hourLabel(hour)}: area-mean rain ${rainMm.toFixed(1)} mm/h, wind ${windKmh.toFixed(0)} km/h${imdClass ? ` (IMD class: ${imdClass.name})` : ''}. ` +
      `${targets.counts.flood} substations sit at or below ${CHENNAI_AVERAGE_ELEVATION_M} m MSL, the average elevation of Chennai. ` +
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
    exposure: { ...targets.counts, ...(targets.step ?? {}) },
    checkFirstSites: targets.checkFirst,
    actionItems,
    geminiModelTag: 'Official quotes · rule-based',
    timestamp: `${hourLabel(hour)} ${timestep.label || ''}`.trim(),
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
  step?: StepSites | null
): GeminiSopDirective | null {
  return buildDirective(scenarioId, timestep, substations, step)?.directive ?? null;
}

// ---- Gemini wording layer --------------------------------------------------------

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  MICHAUNG_2023: 'Cyclone Michaung, December 2023 (hindcast)',
};

/** Human-readable scenario name for prompts. */
export function scenarioLabel(id: ScenarioId): string {
  return SCENARIO_LABELS[id as ScenarioKey] ?? id;
}

const geminiSopCache = new Map<string, GeminiSopDirective>();
const MAX_NOTE_CHARS = 220;
const MAX_SUMMARY_CHARS = 420;

const SOP_SYSTEM_INSTRUCTION =
  'You help a power-utility control room in Chennai during a cyclone or flood. You are given a fixed list of official actions ' +
  '(each with an id and an exact quote) and lists of substation names taken from our own grid data. ' +
  'For each action, choose which of the listed substations it applies to and write one short note that ties the action to the data provided. ' +
  'Also write a two-sentence summary of the situation. ' +
  'Rules: use only substation names that appear in the lists; never add numbers, thresholds, times, quantities, clause numbers or facts that are not in the input; ' +
  'never restate, reword or cite the quotes; if an action has no list, return an empty applyTo. ' +
  'Describe only what the input states; do not conclude that a place is flood-prone, vulnerable, at risk or will flood unless the input says so. ' +
  'The rain behind the substation lists is a total already recorded (the last 24 hours, or the latest IMD gauge day), so write it in the past tense ' +
  '("had heavy rain or worse"), never as rain falling now; the city-mean rain and wind are for this hour only. ' +
  'Do not describe wind or rain with words that are not in the input (such as light, moderate or strong wind). ' +
  'Never say that a fact causes, indicates, suggests or calls for an action; state the facts, and say only that the listed action applies to the named substations.';

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) || [];
}

/**
 * Wording Gemini may not use: predictions, warnings, advice, and words that say one fact causes or calls for something.
 * A sentence that contains any of these is discarded and the rule-based text is used instead.
 */
export const BANNED_WORDING =
  /\b(will|likely|expected to|forecast\w*|predict\w*|at risk|danger\w*|safe|should|must|need\w*|indicat\w*|suggest\w*|recommend\w*|because|therefore|due to|call\w* for|requir\w*|flood-prone|prone|vulnerab\w*|susceptib\w*|experienc\w*|(?:light|moderate|strong|gentle|calm|high) winds?)\b/i;

/** A generated sentence is accepted only if every number in it already appears in the prompt and it uses no banned wording. */
export function isGroundedText(text: unknown, promptNumbers: Set<string>, maxChars: number): text is string {
  if (typeof text !== 'string' || text.trim() === '' || text.length > maxChars) return false;
  if (BANNED_WORDING.test(text)) return false;
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
  step?: StepSites | null
): Promise<GeminiSopDirective | null> {
  const built = buildDirective(scenarioId, timestep, substations, step);
  if (!built) return null;
  const { directive: fallback, targets, ruleIds } = built;

  if (ruleIds.length === 0) return fallback;

  const cacheKey = `${scenarioId}_${timestep.timestep_hour}_${targets.flood.join('-')}_${targets.overhead.join('-')}_${targets.lifeline.join('-')}_${targets.counts.flood}_${targets.step?.toCheck ?? 'grid'}`;
  const cached = geminiSopCache.get(cacheKey);
  if (cached) return cached;

  const w = fallback.weatherSnapshot;
  const actionLines = ruleIds
    .map(id => `${id}|${RULE_META[id].group}|${(getOfficialRule(id) as OfficialRule).quote}`)
    .join('\n');
  const prompt = `SCENARIO: ${SCENARIO_LABELS[scenarioId as ScenarioKey]}
TIME: ${hourLabel(timestep.timestep_hour)} (T-0 is the peak-rain hour)
WEATHER THIS HOUR (city mean): wind ${w.windKmh.toFixed(0)} km/h${w.imdClass ? ` (IMD class ${w.imdClass})` : ''} | rain ${w.rainMm.toFixed(1)} mm/h
${targetLines(targets)}
ACTIONS (id|list to use|exact quote):
${actionLines}`;

  const promptNumbers = new Set(numbersIn(prompt));

  try {
    const parsed = (await generateJson({
      systemInstruction: SOP_SYSTEM_INSTRUCTION,
      prompt,
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
    })) as { summaryEn?: unknown; actions?: unknown } | null;
    if (!parsed) return fallback;

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
