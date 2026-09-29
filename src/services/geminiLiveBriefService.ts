/**
 * geminiLiveBriefService.ts
 *
 * Live-day status brief for ONE substation (no scenario playing). Gemini gets only facts from our data and real
 * readings, and writes a short plain summary. It never chooses actions, quotes plans, predicts or advises.
 * Facts sent: the SurgeGrid health score (ours, 90-day outage record), live outage notices, yard elevation,
 * the official flood-map checks that are true for the place, feeder counts, ward relief-centre count and the
 * live weather when the Weather API returned it. Anything unavailable is left out, never filled in.
 * If Gemini is unavailable, or its reply breaks a rule, the rule-based summary of the same facts is shown.
 */

import type { TnebSubstation } from '../types/tneb';
import type { LiveOutage } from './liveOutageService';
import type { LiveWeatherConditions } from './liveWeatherService';
import { getEnrichedHealthProfile } from './gridHealthService';
import { getCachedOfficialFlood, describeOfficialFlood } from './officialFloodLayers';
import { generateJson } from './geminiClient';
import { isOverheadFeeder } from './geminiSopService';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../data/officialSources';

export interface SubstationBrief {
  summary: string;
  /** True when Gemini wrote the summary. */
  fromGemini: boolean;
  modelTag: string;
  /** The fact lines the summary is based on (also sent to Gemini). */
  facts: string[];
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CHARS = 420;
const cache = new Map<string, { at: number; brief: SubstationBrief }>();

const SYSTEM_INSTRUCTION =
  'You write a short status summary of one electricity substation in Chennai for a control-room engineer. ' +
  'Use only the facts in the input. Write two or three plain sentences. ' +
  "Say that the health score is SurgeGrid's own rating when you mention it. " +
  'Never add numbers, names, causes or facts that are not in the input. ' +
  'Do not predict, forecast, warn, advise actions, or say a place is or is not at risk, safe, or likely to flood; only state what the input states.';

const BANNED = /\b(will|likely|expected to|forecast|predict\w*|at risk|danger\w*|safe|should|must|recommend\w*)\b/i;

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) || [];
}

function weatherLine(w: LiveWeatherConditions | null | undefined, lat: number, lng: number): string | null {
  // Only a reading that was requested for this substation's location.
  if (!w || w.locationKey !== `${lat.toFixed(2)},${lng.toFixed(2)}`) return null;
  const parts: string[] = [];
  if (w.conditionText) parts.push(w.conditionText);
  if (w.temperatureC !== null) parts.push(`${w.temperatureC.toFixed(0)} °C`);
  if (w.windSpeedKmh !== null) parts.push(`wind ${w.windSpeedKmh.toFixed(0)} km/h`);
  if (w.humidityPercent !== null) parts.push(`humidity ${w.humidityPercent.toFixed(0)}%`);
  if (w.precipitationProbability !== null) parts.push(`rain probability ${w.precipitationProbability.toFixed(0)}%`);
  return parts.length > 0 ? `LIVE WEATHER (Google Maps Platform Weather API): ${parts.join(', ')}` : null;
}

export function buildBriefFacts(
  substation: TnebSubstation,
  liveOutages: LiveOutage[],
  weather: LiveWeatherConditions | null | undefined,
  reliefCentreCount: number | null
): string[] {
  const profile = getEnrichedHealthProfile(substation, liveOutages);
  const feeders = substation.feeders || [];
  const overhead = feeders.filter(isOverheadFeeder).length;
  const lifeline = feeders.filter(f => f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water').length;
  const flood = getCachedOfficialFlood(substation.code);

  const facts: string[] = [];
  facts.push(`SUBSTATION: ${substation.cleanName || substation.name} (${substation.voltage} kV)`);
  if (substation.elevationM !== undefined) {
    facts.push(`YARD ELEVATION: ${substation.elevationM} m above sea level; Chennai average is ${CHENNAI_AVERAGE_ELEVATION_M} m (GCC plan)`);
  }
  facts.push(
    `SURGEGRID HEALTH SCORE (our own rating from the last 90 days of outage records): grade ${profile.healthGrade}, ${profile.healthScore} out of 100; ` +
      `${profile.unscheduledTripsCount} unscheduled trips and ${profile.periodicMaintenanceCount} scheduled maintenance runs in the last 90 days`
  );
  facts.push(
    liveOutages.length > 0
      ? `LIVE OUTAGE NOTICES: ${liveOutages.length} today` +
          liveOutages
            .slice(0, 2)
            .map(
              o =>
                ` | ${o.workType || 'work type not stated'}${o.fromTime && o.toTime ? ` (${o.fromTime} to ${o.toTime})` : ''}${
                  o.location ? `, ${o.location}` : ''
                }`
            )
            .join('')
      : 'LIVE OUTAGE NOTICES: none matched today'
  );
  if (flood) {
    const lines = describeOfficialFlood(flood);
    facts.push(
      `OFFICIAL FLOOD MAPS (location check): ${lines.length > 0 ? lines.join('; ') : 'not inside any of the official flood layers checked'}`
    );
  }
  facts.push(`FEEDERS: ${feeders.length} total, ${overhead} overhead or mixed, ${lifeline} hospital or water`);
  if (reliefCentreCount !== null) facts.push(`RELIEF CENTRES: ${reliefCentreCount} listed by GCC in this ward`);
  const w = weatherLine(weather, substation.lat, substation.lng);
  if (w) facts.push(w);
  return facts;
}

/** Plain summary of the same facts. Always available. */
function ruleSummary(substation: TnebSubstation, liveOutages: LiveOutage[]): string {
  const profile = getEnrichedHealthProfile(substation, liveOutages);
  const flood = getCachedOfficialFlood(substation.code);
  const floodLines = flood ? describeOfficialFlood(flood) : [];
  const parts: string[] = [];
  parts.push(
    `SurgeGrid health score (our own rating): grade ${profile.healthGrade}, ${profile.healthScore}/100, with ${profile.unscheduledTripsCount} unscheduled trips in the last 90 days.`
  );
  parts.push(
    liveOutages.length > 0
      ? `${liveOutages.length} live outage notice${liveOutages.length > 1 ? 's' : ''} matched today.`
      : 'No live outage notice matched today.'
  );
  if (substation.elevationM !== undefined) {
    parts.push(
      `Yard elevation is ${substation.elevationM} m (Chennai average ${CHENNAI_AVERAGE_ELEVATION_M} m)` +
        (flood ? `; ${floodLines.length > 0 ? floodLines.join('; ') : 'not inside any official flood layer checked'}.` : '.')
    );
  }
  return parts.join(' ');
}

export function ruleBrief(
  substation: TnebSubstation,
  liveOutages: LiveOutage[],
  weather: LiveWeatherConditions | null | undefined,
  reliefCentreCount: number | null
): SubstationBrief {
  return {
    summary: ruleSummary(substation, liveOutages),
    fromGemini: false,
    modelTag: 'Rule-based summary of our data',
    facts: buildBriefFacts(substation, liveOutages, weather, reliefCentreCount),
  };
}

export async function fetchSubstationBrief(
  substation: TnebSubstation,
  liveOutages: LiveOutage[],
  weather: LiveWeatherConditions | null | undefined,
  reliefCentreCount: number | null,
  options: { force?: boolean } = {}
): Promise<SubstationBrief> {
  const fallback = ruleBrief(substation, liveOutages, weather, reliefCentreCount);
  const prompt = fallback.facts.join('\n');
  const key = `${substation.code}|${prompt}`;
  if (!options.force) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.brief;
  }

  const promptNumbers = new Set(numbersIn(prompt));
  try {
    const parsed = (await generateJson({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt,
      responseSchema: { type: 'OBJECT', properties: { summary: { type: 'STRING' } }, required: ['summary'] },
    })) as { summary?: unknown } | null;
    const text = parsed && typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const ok = text !== '' && text.length <= MAX_CHARS && !BANNED.test(text) && numbersIn(text).every(n => promptNumbers.has(n));
    if (!ok) return fallback;
    const brief: SubstationBrief = {
      ...fallback,
      summary: text,
      fromGemini: true,
      modelTag: 'Gemini 2.5 Flash · summary of our data',
    };
    cache.set(key, { at: Date.now(), brief });
    return brief;
  } catch (err) {
    console.warn('Gemini live brief error, using rule-based summary:', err);
    return fallback;
  }
}
