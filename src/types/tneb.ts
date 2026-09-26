export type VoltageTier = 'bulk' | 'subtransmission' | 'distribution';

export interface FeederDetail {
  name: string;
  code: string;
  voltage: string; // e.g. "11 kV", "33 kV"
  lengthKm: number;
  transformers: number; // no_of_dt
  consumers: number; // conscount
  config: string; // "UG", "Overhead", "Mixed"
  type: string; // "Distribution", "Dedicated (HT Service)", "Interconnector"
}

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
