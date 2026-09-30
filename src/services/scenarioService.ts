/**
 * scenarioService.ts
 * 
 * Engine for driving disaster simulations (Cyclone Michaung Dec 2023, 2015 floods, monsoon spell Nov 2020)
 * across hourly timesteps. Both scenarios are real hindcasts built from NASA GPM IMERG rain and ERA5-Land wind (no storm surge is modelled).
 */

export type ScenarioId = 'LIVE' | 'MICHAUNG_2023';

export type SimulationScenarioId = Exclude<ScenarioId, 'LIVE'>;

/** Data file for each hindcast scenario (all built from NASA IMERG rain + ERA5-Land wind). */
export const SCENARIO_FILES: Record<SimulationScenarioId, string> = {
  MICHAUNG_2023: 'michaung2023.json',
};

export function isSimulationScenario(id: string): id is SimulationScenarioId {
  return Object.prototype.hasOwnProperty.call(SCENARIO_FILES, id);
}

export interface ScenarioTimestep {
  timestep_hour: number;
  label: string;
  cyclone_distance_to_chennai_km?: number;
  mean_sea_level_pressure_hpa?: number;
  surface_pressure_hpa?: number | null;
  wind_speed_10m_kmh: number;
  total_precipitation_1hr_mm: number;
  simulated_storm_surge_msl_m: number;
  temperature_2m_c?: number;
  alert_phase?: string;
  utc?: string;
}

export interface ScenarioData {
  model: string;
  scenario: string;
  total_timesteps: number;
  timesteps: ScenarioTimestep[];
}

export interface MilestoneInfo {
  hour: number;
  label: string;
  description: string;
}

/** How long playback stays on each step before moving to the next. */
export const STEP_DWELL_MS = 6000;

/** The map plays the real hours between two steps over this long: while playing, and when a step is clicked. */
export const GLIDE_PLAY_MS = 2500;
export const GLIDE_CLICK_MS = 1200;

// The five steps the timeline plays through: two before the peak-rain hour, the peak, two after.
// T-0h is the hour of peak rain in each hindcast (not a landfall time). Each hour exists in the scenario file.
// The last step is the first hour where rain stays below 0.1 mm/h for six hours (Michaung), or the last
// hour of the data. Descriptions state only what the data shows. The phase of each step comes from `resolvePhase`, not from this list.
export const SCENARIO_MILESTONES: Record<ScenarioId, MilestoneInfo[]> = {
  LIVE: [],
  MICHAUNG_2023: [
    { hour: -24, label: 'T-24h', description: '24 hours before the peak-rain hour' },
    { hour: -6, label: 'T-6h', description: '6 hours before the peak-rain hour' },
    { hour: 0, label: 'T-0h Peak rain', description: 'Peak-rain hour of the hindcast' },
    { hour: 12, label: 'T+12h', description: '12 hours after the peak-rain hour' },
    { hour: 36, label: 'T+36h', description: 'From here hourly rain stays below 0.1 mm for six hours' },
  ],
};

// In-memory cache of scenario datasets
const scenarioCache = new Map<ScenarioId, ScenarioData>();

export async function fetchScenarioData(id: ScenarioId): Promise<ScenarioData | null> {
  if (id === 'LIVE') return null;
  if (scenarioCache.has(id)) {
    return scenarioCache.get(id)!;
  }

  const filename = SCENARIO_FILES[id];
  try {
    const res = await fetch(`/data/scenarios/${filename}`);
    if (!res.ok) {
      console.error(`Failed to fetch scenario data: ${res.statusText}`);
      return null;
    }
    const data: ScenarioData = await res.json();
    scenarioCache.set(id, data);
    return data;
  } catch (err) {
    console.error(`Error loading scenario ${id}:`, err);
    return null;
  }
}
