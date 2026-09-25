// SurgeGrid AI Domain Types (Track 5: Extreme Weather & Climate Risk Modeling)

export type AlertPhase = 
  | 'WATCH_PHASE'
  | 'WARNING_PHASE'
  | 'EVACUATION_ISOLATION_PHASE'
  | 'LANDFALL_IMPACT'
  | 'RECOVERY_RESTORATION';

export type SubstationRiskCategory = 
  | 'CRITICAL_SURGE_RISK'
  | 'HIGH_WATERLOGGING_RISK'
  | 'MODERATE_RISK'
  | 'LOW_ELEVATION_RISK';

export type WardFloodCategory = 
  | 'SEVERE_INUNDATION_ZONE'
  | 'MODERATE_WATERLOGGING_ZONE'
  | 'LOW_FLOOD_RISK_ZONE';

export type ShelterGridStatus = 
  | 'AT_RISK_GRID_ISOLATION'
  | 'GRID_RESILIENT';

// 1. Google DeepMind WeatherNext 3 Hourly Timestep
export interface WeatherNextTimestep {
  timestep_hour: number;
  label: string;
  cyclone_distance_to_chennai_km: number;
  mean_sea_level_pressure_hpa: number;
  mean_sea_level_pressure_pa: number;
  wind_speed_10m_ms: number;
  wind_speed_10m_kmh: number;
  wind_speed_100m_ms: number;
  u_component_of_wind_10m_ms: number;
  v_component_of_wind_10m_ms: number;
  total_precipitation_1hr_m: number;
  total_precipitation_1hr_mm: number;
  imerg_tp_1hr_mm: number;
  simulated_storm_surge_msl_m: number;
  temperature_2m_k: number;
  temperature_2m_c: number;
  dewpoint_temperature_2m_k: number;
  total_cloud_cover_fraction: number;
  alert_phase: AlertPhase;
}

export interface WeatherNextPayload {
  model: string;
  architecture: string;
  spatial_resolution: string;
  temporal_resolution: string;
  target_location: string;
  scenario: string;
  total_timesteps: number;
  timesteps: WeatherNextTimestep[];
}

// 2. TNEB Substation Risk Node (10 GEE Satellite Bands)
export interface SubstationRiskNode {
  name: string;
  circle: string;
  district: string;
  coordinates: [number, number]; // [lon, lat]
  elevation_m: number;
  slope_degrees: number;
  distance_to_coastline_km: number;
  urban_impervious_built_pct: number;
  jrc_historical_water_occurrence_1984_2021_pct: number;
  dynamic_world_water_prob_2024_2026_pct: number;
  sentinel2_mndwi_2024_2026?: number;
  cyclone_benchmark_rainfall_mm: number;
  gpm_peak_rainfall_rate_mmh: number;
  cyclone_peak_wind_gust_kmh: number;
  soil_moisture_saturation_pct: number;
  simulated_surface_runoff_mm: number;
  historical_q3_2026_outages: number;
  connected_feeders_count: number;
  connected_sections_count: number;
  feeders: string[];
  sections: string[];
  composite_risk_score: number;
  risk_category: SubstationRiskCategory;
  anticipatory_sop: string;
}

export interface SubstationsPayload {
  metadata: {
    satellite_missions: string;
    scope: string;
    total_substations: number;
    critical_surge_count: number;
    high_waterlogging_count: number;
    moderate_count: number;
    safe_count: number;
  };
  substations: SubstationRiskNode[];
}

// 3. GCC Ward Vulnerability Node (GEE Zonal Stats)
export interface WardVulnerabilityNode {
  ward_number: number;
  zone_number: string | number;
  elevation_mean_m: number;
  elevation_min_m: number;
  p10_elevation_m?: number;
  urban_impervious_built_pct: number;
  jrc_historical_water_occurrence_1984_2021_pct: number;
  dynamic_world_water_prob_2024_2026_pct: number;
  cyclone_benchmark_rainfall_accum_mm: number;
  cyclone_max_wind_gust_kmh: number;
  soil_moisture_saturation_pct: number;
  simulated_surface_runoff_mm: number;
  ward_flood_risk_score?: number;
  flood_risk_category: WardFloodCategory;
}

export interface WardsPayload {
  metadata: {
    satellite_missions: string;
    scope: string;
    severe_inundation_wards_count: number;
    moderate_wards_count: number;
    low_wards_count: number;
  };
  wards: WardVulnerabilityNode[];
}

// 4. GCC Relief Shelter Grid & Drainage Fusion
export interface ShelterGridFusionNode {
  shelter_id: string;
  zone: string;
  ward: number;
  address: string;
  officer_in_charge: string;
  emergency_contact: string;
  coordinates: [number, number]; // [lon, lat]
  ward_topography: {
    mean_elevation_msl: number;
    min_elevation_msl: number;
    water_probability_2026_pct: number;
    flood_category: string;
  };
  stormwater_drainage: {
    drain_segments_count: number;
    total_network_km: number;
    uphill_backflow_risk_pct: number;
    min_road_elevation_m: number;
  };
  grid_power_resilience: {
    primary_substation: {
      name: string;
      circle: string;
      elevation_m: number;
      distance_km: number;
      risk_category: string;
    };
    backup_safe_substation: {
      name: string;
      circle: string;
      elevation_m: number;
      distance_km: number;
    };
    shelter_grid_status: ShelterGridStatus;
    anticipatory_power_protocol: string;
  };
  evacuation_route_status: {
    is_access_road_submerged: boolean;
    evacuation_advisory: string;
  };
}

export interface SheltersPayload {
  metadata: {
    description: string;
    total_relief_centers_evaluated: number;
    shelters_requiring_backup_grid_transfer: number;
    shelters_on_resilient_grid_nodes: number;
  };
  shelters: ShelterGridFusionNode[];
}

// 5. GCC Stormwater Drain Segment
export interface DrainFeature {
  type: 'Feature';
  properties: {
    id: string;
    is_uphill: boolean;
    slope: number;
    length_m: number;
    dimension: string;
    ward_no: number;
    road_elevation_m: number;
    status: string;
    gradient_desc: string;
    from_node: string;
    to_node: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

// 6. Gemini 3.7 Flash Action Plan Output
export interface GeminiActionPlan {
  scenario_summary: string;
  timestamp: string;
  total_megawatts_at_risk: number;
  substations_to_deenergize: {
    substation: string;
    circle: string;
    elevation_msl: string;
    deenergize_lead_time: string;
    reason: string;
    backup_switch_order: string;
  }[];
  shelters_emergency_reroutes: {
    shelter_name: string;
    ward: number;
    primary_feeder: string;
    backup_tie_line_substation: string;
    distance_km: number;
    officer_contact: string;
  }[];
  civic_early_warning_dispatches: {
    ward: number;
    zone: string;
    language: 'English' | 'Tamil';
    broadcast_text: string;
    evacuation_corridor: string;
  }[];
  parametric_insurance_trigger: {
    cyclone_intensity_category: string;
    estimated_asset_exposure_inr_crores: number;
    liquidity_payout_trigger_pct: number;
    recommended_immediate_disaster_advance_inr: string;
  };
}
