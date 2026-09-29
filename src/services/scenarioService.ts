/**
 * scenarioService.ts
 * 
 * Engine for driving disaster simulations (Cyclone Michaung Dec 2023, 2015 floods, monsoon spell Nov 2020)
 * across hourly timesteps. Both scenarios are real hindcasts built from NASA GPM IMERG rain and ERA5-Land wind (no storm surge is modelled).
 */

export type ScenarioId = 'LIVE' | 'MICHAUNG_2023' | 'FLOODS_2015' | 'MONSOON_2020';

export type SimulationScenarioId = Exclude<ScenarioId, 'LIVE'>;

/** Data file for each hindcast scenario (all built from NASA IMERG rain + ERA5-Land wind). */
export const SCENARIO_FILES: Record<SimulationScenarioId, string> = {
  MICHAUNG_2023: 'michaung2023.json',
  FLOODS_2015: 'floods2015.json',
  MONSOON_2020: 'monsoon2020.json',
};

/** Hour the timeline starts at when a scenario is opened. */
export const SCENARIO_START_HOUR: Record<SimulationScenarioId, number> = {
  MICHAUNG_2023: -24,
  FLOODS_2015: -48,
  MONSOON_2020: -24,
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
  phase: 'WATCH' | 'LANDFALL_PEAK' | 'RESTORATION';
  description: string;
}

// T-0h is the hour of peak rain in each hindcast (not a landfall time). Descriptions state only what the data shows.
export const SCENARIO_MILESTONES: Record<ScenarioId, MilestoneInfo[]> = {
  LIVE: [],
  MICHAUNG_2023: [
    { hour: -24, label: 'T-24h', phase: 'WATCH', description: '24 hours before the peak-rain hour' },
    { hour: 0, label: 'T-0h Peak rain', phase: 'LANDFALL_PEAK', description: 'Peak-rain hour of the hindcast' },
    { hour: 12, label: 'T+12h', phase: 'RESTORATION', description: '12 hours after the peak-rain hour' },
  ],
  FLOODS_2015: [
    { hour: -48, label: 'T-48h', phase: 'WATCH', description: '48 hours before the peak-rain hour' },
    { hour: 0, label: 'T-0h Peak rain', phase: 'LANDFALL_PEAK', description: 'Peak-rain hour of the hindcast' },
    { hour: 12, label: 'T+12h', phase: 'RESTORATION', description: '12 hours after the peak-rain hour' },
  ],
  MONSOON_2020: [
    { hour: -24, label: 'T-24h', phase: 'WATCH', description: '24 hours before the peak-rain hour' },
    { hour: 0, label: 'T-0h Peak rain', phase: 'LANDFALL_PEAK', description: 'Peak-rain hour of the hindcast' },
    { hour: 12, label: 'T+12h', phase: 'RESTORATION', description: '12 hours after the peak-rain hour' },
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
