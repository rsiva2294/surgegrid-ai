export interface Substation {
  name: string;
  circle: string;
  district: string;
  coordinates: [number, number]; // [lng, lat]
  elevation_m: number;
  slope_degrees: number;
  satellite_water_probability_2026_pct: number;
  sentinel2_mndwi_2026: number;
  historical_q3_2026_outages: number;
  connected_feeders_count: number;
  connected_sections_count: number;
  feeders: string[];
  sections: string[];
  composite_risk_score: number;
  risk_category: 'CRITICAL_SURGE_RISK' | 'HIGH_WATERLOGGING_RISK' | 'MODERATE_RISK' | 'LOW_ELEVATION_RISK';
  anticipatory_sop: string;
  distance_to_coastline_km: number;
  urban_impervious_built_pct: number;
  ancestral_lakebed_hazard?: boolean;
  lakebed_details?: {
    name: string;
    name_ta?: string;
    status: string;
    historical_area_ha: number;
    current_area_ha: number;
    replaced_by: string;
    dist_m: number;
    clay_saturation_multiplier: number;
    hydrological_note: string;
  } | null;
}

export interface LostWaterBody {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    name: string;
    name_ta?: string;
    type: string;
    status: string;
    historical_area_ha: number;
    current_area_ha: number;
    replaced_by: string;
    approx_radius_m: number;
    source: string;
    notes: string;
    notes_ta?: string;
    coinciding_hotspots?: string[];
  };
}

export interface FloodHotspot {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: number;
    slno: number;
    name: string;
    category: string;
    monsoon: string;
    source: string;
    coinciding_lost_lake?: string;
    dist_to_lost_lake_m?: number;
  };
}

export interface ReliefShelter {
  shelter_id: string;
  name: string;
  ward: number;
  zone: number;
  address: string;
  officer_in_charge?: string;
  emergency_contact?: string;
  coordinates: [number, number]; // [lng, lat]
  road_elevation_m?: number;
  elevation_m?: number;
  drain_backflow_risk_pct?: number;
  shelter_viability_status: 'SAFE_HAVEN' | 'COMPROMISED_INUNDATION';
  compromised_reason?: string;
  recommended_safe_shelter?: {
    shelter_id: string;
    name: string;
    ward: number;
    zone: number;
    elevation_m: number;
    distance_km: number;
    rerouting_advisory: string;
  } | null;
  primary_substation?: string;
  backup_safe_substation?: string;
}

export interface Reservoir {
  id: string;
  name: string;
  name_ta: string;
  river_basin: string;
  capacity_mcft: number;
  current_storage_mcft: number;
  storage_pct: number;
  headroom_mcft: number;
  full_tank_level_ft: number;
  current_level_ft: number;
  inflow_cusecs: number;
  outflow_cusecs: number;
  rainfall_24h_mm: number;
  emergency_sluice_threat: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  fluvial_corridor_warning: string;
  threatened_substations: string[];
  catchment_area_sqkm: number;
}

export interface ReservoirData {
  city: string;
  observed_at: string;
  data_source: string;
  summary: {
    total_capacity_mcft: number;
    total_storage_mcft: number;
    storage_pct: number;
    total_headroom_mcft: number;
    tightest_margin_reservoir: string;
    overall_fluvial_threat: string;
    fluvial_threat_summary: string;
  };
  reservoirs: Reservoir[];
}

export interface WeatherStep {
  timestep_hour: string;
  hours_to_landfall: number;
  wind_speed_10m_kmh: number;
  imerg_tp_1hr_mm: number;
  rainfall_24h_cumulative_mm: number;
  mean_sea_level_pressure_hpa: number;
  simulated_storm_surge_msl_m: number;
  alert_phase: string;
  phase_description: string;
}

export interface RiverFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat][]
  };
  properties: {
    name: string;
    [key: string]: any;
  };
}
