/**
 * simulationExposure.ts
 *
 * The "Exposed now" list at one step of a hindcast, using the same facts and order as the site briefing card
 * (`computeBriefing` in siteBriefing.ts), so the list and the card always agree:
 * - "Rain here" is the higher of the satellite 24-hour value over the site's cell and the nearest IMD gauge reading of the
 *   latest IMD day that had ended at the step.
 * - Check first: rain here at IMD's Heavy class or worse, and a strong flood fact (inside the 2015 extent, High on the
 *   hazard maps, or a ward location at 3 ft or deeper in the GCC 2015 register).
 * - Check next: Heavy or worse, and a weaker flood fact (Moderate hazard rating, or yard at or below 2 m).
 * The order is ours, not an official rule. It is not a prediction of flooding or of any outage.
 */

import type { TnebSubstation } from '../types/tneb';
import { IMD_RAIN_CLASSES, getImdRainClass, type ImdRainClass } from '../data/officialSources';
import { getCachedOfficialFlood, type SubstationOfficialFlood } from './officialFloodLayers';
import { wardFacts, type GccPlanData } from './gccPlan';
import type { ScenarioGrid } from './scenarioGrid';
import type { ScenarioTimestep } from './scenarioService';
import type { GaugePoints } from './gaugePoints';
import { computeBriefing, type BriefingTier } from './siteBriefing';

/** Lowest 24-hour rain (mm) that counts as heavy rain: IMD's "Heavy" class limit. */
export const HEAVY_RAIN_MIN_MM = (IMD_RAIN_CLASSES.find(c => c.name === 'Heavy') as ImdRainClass).minMm;

export interface ExposedSubstation {
  substation: TnebSubstation;
  tier: Extract<BriefingTier, 'first' | 'next'>;
  /** Rain here, mm, and where it came from. */
  mm24: number;
  source: 'gauge' | 'satellite';
  rainClass: ImdRainClass;
  flood: SubstationOfficialFlood | null;
  /** Short flood facts for the row. */
  reasons: string[];
}

export interface SimulationExposure {
  exposed: ExposedSubstation[];
  firstCount: number;
  /** Substations with any flood fact in our data, at any rain level. */
  floodFlaggedCount: number;
  total: number;
}

export function computeExposure(
  substations: TnebSubstation[],
  grid: ScenarioGrid,
  timestep: ScenarioTimestep | null | undefined,
  gauges: GaugePoints | null,
  gccPlan: GccPlanData | null
): SimulationExposure {
  const exposed: ExposedSubstation[] = [];
  let floodFlaggedCount = 0;
  for (const s of substations) {
    if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
    const flood = getCachedOfficialFlood(s.code);
    const b = computeBriefing(s, timestep, grid, gauges, flood, wardFacts(gccPlan, s.gccWard));
    if (b.tier === 'none') continue;
    floodFlaggedCount++;
    if ((b.tier !== 'first' && b.tier !== 'next') || b.hereMm === null || !b.hereSource) continue;
    exposed.push({
      substation: s,
      tier: b.tier,
      mm24: b.hereMm,
      source: b.hereSource,
      rainClass: getImdRainClass(b.hereMm),
      flood,
      reasons: b.chips,
    });
  }
  exposed.sort((a, b) => (a.tier === b.tier ? b.mm24 - a.mm24 : a.tier === 'first' ? -1 : 1));
  return { exposed, firstCount: exposed.filter(e => e.tier === 'first').length, floodFlaggedCount, total: substations.length };
}
