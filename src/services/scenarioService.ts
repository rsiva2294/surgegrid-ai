/**
 * scenarioService.ts
 * 
 * Engine for driving disaster simulations (Cyclone Michaung Cat-3, 2015 Megafloods)
 * across discrete hourly timesteps with realistic weather, storm surge, and statutory grid impacts.
 */

export type ScenarioId = 'LIVE' | 'MICHAUNG_CAT3' | 'FLOODS_2015';

export interface ScenarioTimestep {
  timestep_hour: number;
  label: string;
  cyclone_distance_to_chennai_km?: number;
  mean_sea_level_pressure_hpa?: number;
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

export const SCENARIO_MILESTONES: Record<ScenarioId, MilestoneInfo[]> = {
  LIVE: [],
  MICHAUNG_CAT3: [
    {
      hour: -24,
      label: 'T-24h Watch',
      phase: 'WATCH',
      description: 'Cyclone Watch Advisory (Wind 65 km/h) • Lineman Foot Patrols Dispatched',
    },
    {
      hour: 0,
      label: 'T-0h Landfall Peak',
      phase: 'LANDFALL_PEAK',
      description: 'Eye Wall Landfall (Wind 110 km/h, Surge 3.2m) • Statutory Overhead Tripping',
    },
    {
      hour: 12,
      label: 'T+12h Restoration',
      phase: 'RESTORATION',
      description: 'Storm Departs • Phase-1 Lifeline Energization (Hospitals & Dewatering)',
    },
  ],
  FLOODS_2015: [
    {
      hour: -48,
      label: 'T-48h Inundation',
      phase: 'WATCH',
      description: 'Continuous Monsoonal Downpour • Low-lying Substations Sandbagged',
    },
    {
      hour: 0,
      label: 'T-0h Reservoir Spill',
      phase: 'LANDFALL_PEAK',
      description: 'Chembarambakkam 29,000 cusecs release • Adyar River Crest breaches 230kV yards',
    },
    {
      hour: 12,
      label: 'T+12h Grid Drainage',
      phase: 'RESTORATION',
      description: 'Floodwaters Receding • Mobile Diesel Dewatering & Megger Testing Underway',
    },
  ],
};

// In-memory cache of scenario datasets
const scenarioCache = new Map<ScenarioId, ScenarioData>();

export async function fetchScenarioData(id: ScenarioId): Promise<ScenarioData | null> {
  if (id === 'LIVE') return null;
  if (scenarioCache.has(id)) {
    return scenarioCache.get(id)!;
  }

  const filename = id === 'MICHAUNG_CAT3' ? 'michaung_class_cat3.json' : 'floods2015.json';
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
