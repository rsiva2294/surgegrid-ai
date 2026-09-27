export type VoltageTier = 'bulk' | 'subtransmission' | 'distribution';

export type LifelineCategory = 'hospital' | 'water' | 'transit' | 'governance' | 'industrial_ht';
export type PriorityLevel = 'P1_CRITICAL' | 'P1_NON_CUT' | 'P2_ESSENTIAL' | 'P3_COMMERCIAL';
export type FloodRiskCategory = 'CRITICAL_SURGE_RISK' | 'HIGH_WATERLOGGING_RISK' | 'MODERATE_RISK' | 'SAFE';

export type CircuitState = 'LIVE' | 'PRE_EMPTIVE_SAFETY_ISOLATION' | 'STORM_FAULT_TRIPPED' | 'AWAITING_PATROL_CLEARANCE' | 'STAGE_RESTORED';

export interface FeederDetail {
  name: string;
  code: string;
  voltage: string; // e.g. "11 kV", "33 kV"
  lengthKm: number;
  transformers: number; // no_of_dt
  consumers: number; // conscount
  config: string; // "UG", "Overhead", "Mixed"
  type: string; // "Distribution", "Dedicated (HT Service)", "Interconnector"
  isDedicated?: boolean;
  lifelineCategory?: LifelineCategory;
  lifelineLabel?: string;
  priorityLevel?: PriorityLevel;
  outageCount?: number;
  outageDates?: string[];
  uniqueOutageDays?: number;
  tripRisk?: 'CRITICAL' | 'ELEVATED' | 'MODERATE';
  // TNSDMA 2023 & TANGEDCO 2017 Disaster Management Extensions
  esf15SlaHours?: number; // Statutory restoration SLA (6h for P1, 12h for P2/Trunk, 24h for Commercial, 48h for LT)
  rmuCount?: number; // Automated 11 kV Ring Main Units count for sectionalizing
  restorationStage?: 1 | 2 | 3 | 4 | 5; // TANGEDCO 5-Stage Sequential Protocol
  circuitState?: CircuitState;
  preEmptiveTripReason?: 'WIND_GUST_EXCEEDED' | 'PLINTH_INUNDATION_RISK' | 'YARD_SUBMERGED' | 'NONE';
  clearancePending?: boolean; // Lineman physical foot-patrol clearance certificate required
  isCmwssbSps?: boolean; // Dedicated lifeline to CMWSSB Sewage Pumping Station
  isGccShelterFeed?: boolean; // Direct feed to designated GCC Disaster Relief Center / Shelter
}

export type GridConfidenceTier = 'L1_VERIFIED' | 'L2_PROBABLE' | 'L3_UNVERIFIED';

export type VerificationMethod =
  | 'polygon_containment'
  | 'dual_endpoint_circuit'
  | 'collocated_switchyard'
  | 'nominal_stepdown_proximity'
  | 'surveyed_eht_line'
  | 'jurisdictional_office';

export interface PrecomputedConnection {
  id: string;
  name: string;
  type: 'substation' | 'section';
  relation: 'outgoing_feeder' | 'incoming_feeder' | 'colocated_stepdown' | 'campus_section';
  label: string;
  voltage?: string;
  tier?: VoltageTier;
  distanceKm: number;
  lat: number;
  lng: number;
  confidenceTier?: GridConfidenceTier;
  scopingRole?: 'PHYSICAL_TOPOLOGY_ONLY' | 'ADVISORY_ONLY';
  verificationMethod?: VerificationMethod;
  feederCode?: string;
  polygonVerified?: boolean;
}

export interface TnebSubstation {
  name: string;
  cleanName: string;
  code: string;
  voltage: string;
  tier: VoltageTier;
  capacity: number;
  circleCode: string;
  circle: string;
  district: string;
  regionCode: string;
  lat: number;
  lng: number;
  totalConsumers: number;
  totalTransformers: number;
  totalFeedersCount: number;
  feeders: FeederDetail[];
  connections?: PrecomputedConnection[];
  elevationM?: number;
  riskCategory?: FloodRiskCategory;
  compositeRiskScore?: number;
  distanceToCoastKm?: number;
  anticipatorySop?: string;
  historicalOutagesCount?: number;
  powerTransformersCount?: number;
  totalCapacityMva?: number;
  incomingFeedersCount?: number;
  incomingFeederNames?: string[];
  peakDemandMva?: number;
  // TNSDMA & TANGEDCO Disaster Planning Benchmarks
  plinthElevationM?: number; // Yard equipment & switchgear plinth clearance (typically 1.5m above local GL)
  benchmarked2015FloodDepthM?: number; // 2015 Floods benchmark submersion depth (up to 1.8m / 6ft)
  yardDewateringRequired?: boolean; // Requires high-capacity mobile pumps before yard can be re-energized
  statutoryDeenergized?: boolean; // Pre-emptively isolated under TNSDMA Section 5.6 public safety mandate
  // Municipal & Satellite Vulnerability Ground Truth (GCC CDMP 2023 & GEE 200 Wards)
  gccZone?: number;
  gccZoneName?: string;
  gccWard?: number;
  geeFloodCategory?: string;
  geeRunoffMm?: number;
  geeImperviousPct?: number;
  wardCouncillorMobile?: string;
  wardCmwssbMobile?: string;
  wardTangedcoMobile?: string;
  wardGccAeMobile?: string;
  wardReliefSheltersCount?: number;
}

export interface TnebSection {
  name: string;
  cleanName: string;
  code: string;
  circleCode: string;
  circle: string;
  district: string;
  subdivision: string;
  division: string;
  region: string;
  regionCode: string;
  lat: number;
  lng: number;
  mobile: string;
  email: string;
  address: string;
  breakdownCode: string;
  boundary?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  // Municipal & Satellite Vulnerability Ground Truth (GCC CDMP 2023 & GEE 200 Wards)
  gccZone?: number;
  gccZoneName?: string;
  gccWard?: number;
  geeFloodCategory?: string;
  geeRunoffMm?: number;
  geeImperviousPct?: number;
  wardCouncillorMobile?: string;
  wardCmwssbMobile?: string;
  wardTangedcoMobile?: string;
  wardGccAeMobile?: string;
  wardReliefSheltersCount?: number;
}

export interface GccWardDisasterInfo {
  ward: number;
  zone: number;
  zoneName: string;
  councillorMobile: string;
  cmwssbAeMobile?: string;
  tangedcoAeMobile?: string;
  gccAeMobile?: string;
  gccElecMobile?: string;
  policeMobile?: string;
  fireMobile?: string;
  reliefSheltersCount?: number;
  geeRunoffMm?: number;
  geeImperviousPct?: number;
  geeElevationMeanM?: number;
  geeFloodCategory?: string;
  geeFloodScore?: number;
}

export interface ChennaiGridData {
  version: string;
  source: string;
  counts: {
    substations: number;
    sections: number;
  };
  substations: TnebSubstation[];
  sections: TnebSection[];
}
