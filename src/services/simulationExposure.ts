/**
 * simulationExposure.ts
 *
 * Which substations are "exposed now" at one step of a hindcast: the app's one flood-flag rule (yard at or below
 * Chennai's 2.0 m average, inside the NRSC 2015 flood extent, or Moderate/High on the official flood-hazard maps)
 * AND a rain cell at IMD's Heavy class or worse over the last 24 hours. Both parts are facts: an official map check
 * and the satellite rain estimate for the cell. This is not a prediction of flooding or of any outage.
 */

import type { TnebSubstation } from '../types/tneb';
import { CHENNAI_AVERAGE_ELEVATION_M, IMD_RAIN_CLASSES, type ImdRainClass } from '../data/officialSources';
import { getCachedOfficialFlood, isOfficiallyFloodFlagged, type SubstationOfficialFlood } from './officialFloodLayers';
import { rainStateAt, type ScenarioGrid } from './scenarioGrid';

/** Lowest 24-hour rain (mm) that counts as heavy rain: IMD's "Heavy" class limit. */
export const HEAVY_RAIN_MIN_MM = (IMD_RAIN_CLASSES.find(c => c.name === 'Heavy') as ImdRainClass).minMm;

export interface ExposedSubstation {
  substation: TnebSubstation;
  mm24: number;
  rainClass: ImdRainClass;
  flood: SubstationOfficialFlood | null;
  /** Why the site is flood-flagged, as short facts. */
  reasons: string[];
}

export interface SimulationExposure {
  exposed: ExposedSubstation[];
  /** Substations that are flood-flagged at any rain level. */
  floodFlaggedCount: number;
  total: number;
}

function floodReasons(elevationM: number | undefined, flood: SubstationOfficialFlood | null): string[] {
  const out: string[] = [];
  if (elevationM !== undefined && elevationM <= CHENNAI_AVERAGE_ELEVATION_M) out.push(`Yard ${elevationM} m`);
  if (flood?.nrsc2015) out.push('2015 flood extent');
  if (flood?.returnPeriod === 'HIGH' || flood?.returnPeriod === 'MODERATE') {
    out.push(`Hazard map: ${flood.returnPeriod === 'HIGH' ? 'High' : 'Moderate'}`);
  }
  return out;
}

export function computeExposure(substations: TnebSubstation[], grid: ScenarioGrid, hour: number): SimulationExposure {
  const exposed: ExposedSubstation[] = [];
  let floodFlaggedCount = 0;
  for (const s of substations) {
    if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
    const flood = getCachedOfficialFlood(s.code);
    if (!isOfficiallyFloodFlagged(s.elevationM, flood)) continue;
    floodFlaggedCount++;
    const rain = rainStateAt(grid, s.lat, s.lng, hour);
    if (!rain || rain.mm24 < HEAVY_RAIN_MIN_MM) continue;
    exposed.push({ substation: s, mm24: rain.mm24, rainClass: rain.rainClass, flood, reasons: floodReasons(s.elevationM, flood) });
  }
  exposed.sort((a, b) => b.mm24 - a.mm24);
  return { exposed, floodFlaggedCount, total: substations.length };
}
