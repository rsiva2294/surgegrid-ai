/**
 * gridProtocol.ts
 *
 * Universal Grid Protocol & Model Context Protocol (MCP) Interface for SurgeGrid AI.
 *
 * Decouples regional DISCOM datasets (TNEB, OPTCL, MSEDCL, WBSEDCL, BESCOM)
 * from frontend presentation components and Google Gemini AI Agent workflows.
 */

import type { ChennaiGridData, TnebSubstation, TnebSection } from '../types/tneb';

export type VoltageClass =
  | 'EHV_400KV'       // National / Regional Bulk Grid Interconnection
  | 'EHV_230KV'       // State Transmission Trunk Ring
  | 'HV_110KV'        // Sub-Transmission Urban Ring
  | 'MV_33KV'         // Primary Urban Distribution Substation
  | 'MV_11KV';        // Secondary Feeder Distribution

export type LifelineClass =
  | 'CRITICAL_HOSPITAL'       // Level-1 Trauma, Medical Colleges, ICU Backup
  | 'MUNICIPAL_WATER_SEWAGE'  // Water Treatment & Sewage Pumping Stations (e.g. CMWSSB, BWSSB)
  | 'METRO_TRANSIT_PORT'      // Rail, Metro, International Airport, Seaport
  | 'EMERGENCY_GOVERNANCE'    // State Disaster Management Authority, Police HQ, Fire Command
  | 'COMMERCIAL_INDUSTRIAL';  // Standard Retail & Industrial Feeder

export type CircuitOperationalState =
  | 'ENERGIZED_NORMAL'
  | 'PREEMPTIVE_SAFETY_ISOLATED'
  | 'CYCLONE_TRIPPED'
  | 'WATERLOGGED_LOCKED_OUT'
  | 'STAGE_RESTORED';

export interface GridRegionManifest {
  /** Unique utility / region identifier (e.g. "IN-TN-CHENNAI", "IN-OD-PURI", "IN-MH-MUMBAI") */
  id: string;
  name: string;
  shortName: string;
  state: string;
  country: 'India';
  discom: string;
  disasterManagementAgency: string; // e.g. "TNSDMA", "OSDMA", "APSDMA", "MCGM Disaster Cell"
  centerCoordinates: { lat: number; lng: number };
  defaultZoom: number;
  cycloneBasin: 'Bay of Bengal' | 'Arabian Sea';
  cycloneRiskLevel: 'VERY_HIGH_RISK_ZONE' | 'HIGH_RISK_ZONE' | 'MODERATE_RISK_ZONE';
  historicalEvents: string[];
  statutorySopStandard: string; // e.g. "TNSDMA ESF-15 & TANGEDCO 5-Stage Protocol"
}

export interface NormalizedSubstation {
  id: string;
  code: string;
  name: string;
  coordinates: { lat: number; lng: number };
  voltageClass: VoltageClass;
  plinthElevationMslMeters: number;
  criticalInundationDepthCm: number;
  lifelineCategory: LifelineClass;
  totalFeeders: number;
  totalDistributionTransformers: number;
  connectedConsumers: number;
  operationalState: CircuitOperationalState;
  statutoryJurisdiction: string;
  rawNodeRef?: TnebSubstation | Record<string, unknown>;
}

export interface SurgeVulnerabilityAssessment {
  substationId: string;
  substationName: string;
  surgeDepthCm: number;
  isPlinthSubmerged: boolean;
  recommendedAction: 'MAINTAIN_ENERGIZED' | 'PREPARE_ISOLATION' | 'MANDATORY_PREEMPTIVE_SHUTDOWN';
  reasoning: string;
  lifelinesAtRisk: string[];
  dispatchUrgency: 'ROUTINE' | 'ELEVATED' | 'CRITICAL_IMMEDIATE';
}

export interface TripActionReceipt {
  transactionId: string;
  timestamp: string;
  substationId: string;
  actionTaken: CircuitOperationalState;
  initiatedBy: string; // e.g. "SurgeGrid-Anticipatory-AI" or "TNEB-GCC-Disaster-Desk"
  affectedFeedersCount: number;
  restorationSlaHours: number;
  status: 'EXECUTED_SUCCESS' | 'SCADA_ACKNOWLEDGED' | 'SIMULATED';
}

export interface DisasterAdvisoryDocument {
  advisoryId: string;
  issuedAt: string;
  issuingAuthority: string;
  targetAgency: string;
  severityLevel: 'YELLOW' | 'ORANGE' | 'RED';
  headline: string;
  executiveSummary: string;
  actionChecklist: string[];
  substationsAffected: string[];
  digitalPublicGoodCompliance: boolean;
}

export interface NormalizedGridDataset {
  manifest: GridRegionManifest;
  substations: TnebSubstation[];
  sections: TnebSection[];
  totalCapacityMva?: number;
  rawPayload?: ChennaiGridData;
}

/**
 * Standard MCP Provider Interface for Indian Electrical Grids.
 * Any state utility or municipality implements this contract to plug into SurgeGrid AI.
 */
export interface GridMcpProvider {
  /** Metadata describing this region, state, and utility */
  readonly manifest: GridRegionManifest;

  /** Initialize and fetch the normalized substation and feeder dataset */
  loadGridDataset(): Promise<NormalizedGridDataset>;

  /** Simulate anticipatory cyclone storm surge vulnerability */
  evaluateSurgeVulnerability(
    surgeDepthMeters: number,
    windGustKmh: number,
    substationId?: string
  ): Promise<SurgeVulnerabilityAssessment[]>;

  /** Execute preemptive line-tripping protocol to prevent transformer burnout */
  executePreemptiveTrip(
    substationId: string,
    reason: string
  ): Promise<TripActionReceipt>;

  /** Generate statutory early-warning advisory dispatch for municipal/disaster authorities */
  generateStatutoryAdvisory(
    substationId: string,
    alertLevel: 'YELLOW' | 'ORANGE' | 'RED'
  ): Promise<DisasterAdvisoryDocument>;
}

/**
 * Official Tool Declarations for Google Gemini 3.7 Flash Model Context Protocol (MCP) Integration.
 * Allows Gemini to autonomously query, inspect, and execute disaster mitigation on any connected Indian grid.
 */
export const GRID_MCP_TOOL_DEFINITIONS = [
  {
    name: 'mcp_grid_get_region_manifest',
    description: 'Retrieves metadata for the active regional electrical grid, including DISCOM identity, disaster authority, and cyclone risk basin.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'mcp_grid_get_substations',
    description: 'Queries substations and transmission nodes filtered by voltage class, flood risk category, or lifeline category.',
    parameters: {
      type: 'object',
      properties: {
        voltageClass: {
          type: 'string',
          enum: ['EHV_400KV', 'EHV_230KV', 'HV_110KV', 'MV_33KV', 'MV_11KV'],
          description: 'Filter by operating voltage tier'
        },
        lifelineCategory: {
          type: 'string',
          enum: ['CRITICAL_HOSPITAL', 'MUNICIPAL_WATER_SEWAGE', 'METRO_TRANSIT_PORT', 'EMERGENCY_GOVERNANCE'],
          description: 'Filter by critical civil lifeline'
        },
        minConsumers: {
          type: 'number',
          description: 'Filter substations serving at least this number of citizens'
        }
      }
    }
  },
  {
    name: 'mcp_grid_evaluate_surge_risk',
    description: 'Simulates cyclone storm-surge inundation and predicts critical plinth submergence across electrical switchyards.',
    parameters: {
      type: 'object',
      properties: {
        surgeDepthMeters: {
          type: 'number',
          description: 'Projected tidal surge / flood height in meters above Mean Sea Level'
        },
        windGustKmh: {
          type: 'number',
          description: 'Anticipated peak sustained wind gusts in km/h'
        },
        substationId: {
          type: 'string',
          description: 'Optional specific substation ID to inspect'
        }
      },
      required: ['surgeDepthMeters', 'windGustKmh']
    }
  },
  {
    name: 'mcp_grid_execute_safety_trip',
    description: 'Authorizes pre-landfall anticipatory circuit isolation to protect high-voltage transformers from catastrophic short-circuit burnout.',
    parameters: {
      type: 'object',
      properties: {
        substationId: {
          type: 'string',
          description: 'Target substation code or ID (e.g. SS-14)'
        },
        reason: {
          type: 'string',
          description: 'Statutory basis for shutdown (e.g. PLINTH_INUNDATION_IMMINENT)'
        }
      },
      required: ['substationId', 'reason']
    }
  },
  {
    name: 'mcp_grid_generate_advisory',
    description: 'Generates an official early-warning disaster advisory dispatch formatted for State Disaster Management Authorities and Municipal Commissioners.',
    parameters: {
      type: 'object',
      properties: {
        substationId: {
          type: 'string',
          description: 'Affected substation'
        },
        alertLevel: {
          type: 'string',
          enum: ['YELLOW', 'ORANGE', 'RED'],
          description: 'IMD-aligned storm severity code'
        }
      },
      required: ['substationId', 'alertLevel']
    }
  }
];
