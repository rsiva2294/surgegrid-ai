/**
 * optclOdishaAdapter.ts
 *
 * Reference MCP Adapter for Coastal Odisha (OPTCL / GRIDCO / TPCODL - Cyclone Fani & Phailin Belt).
 * Demonstrates plug-and-play modularity: any state utility plugs their GIS/SCADA schema into
 * the Universal Grid Protocol without modifying a single UI component.
 */

import type {
  GridMcpProvider,
  GridRegionManifest,
  NormalizedGridDataset,
  SurgeVulnerabilityAssessment,
  TripActionReceipt,
  DisasterAdvisoryDocument
} from '../gridProtocol';
import type { TnebSubstation } from '../../types/tneb';

export const ODISHA_MANIFEST: GridRegionManifest = {
  id: 'IN-OD-COASTAL',
  name: 'Coastal Odisha / Puri & Paradip Cyclone Corridor',
  shortName: 'Odisha (OPTCL)',
  state: 'Odisha',
  country: 'India',
  discom: 'OPTCL / GRIDCO / TP Central Odisha Distribution Ltd',
  disasterManagementAgency: 'Odisha State Disaster Management Authority (OSDMA)',
  centerCoordinates: { lat: 19.8135, lng: 85.8312 },
  defaultZoom: 11,
  cycloneBasin: 'Bay of Bengal',
  cycloneRiskLevel: 'VERY_HIGH_RISK_ZONE',
  historicalEvents: [
    'Cyclone Fani (May 2019 - Category 5, 215 km/h winds, extensive 400kV tower collapses in Puri)',
    'Cyclone Phailin (Oct 2013 - Massive storm surge and sea water inundation)',
    'Super Cyclone 1999 (Worst coastal disaster, Paradip port grid completely flattened)'
  ],
  statutorySopStandard: 'OSDMA Standard Operating Procedure for Coastal Cyclonic Defense'
};

/**
 * Blueprint substations representing OPTCL / TPCODL critical transmission backbone in Puri/Paradip
 */
const ODISHA_BLUEPRINT_SUBSTATIONS: TnebSubstation[] = [
  {
    code: 'OPTCL-PURI-220',
    name: '220/132/33kV Samuka (Puri) Grid Substation',
    cleanName: 'Samuka Puri 220kV Switchyard',
    voltage: '220 kV',
    tier: 'bulk',
    capacity: 320,
    circleCode: 'PURI-TRAN',
    circle: 'Puri Transmission Circle',
    district: 'Puri',
    regionCode: 'OD-CENTRAL',
    lat: 19.805,
    lng: 85.819,
    totalConsumers: 19200,
    totalTransformers: 30,
    totalFeedersCount: 2,
    feeders: [
      {
        name: 'Puri District Hospital Feeder',
        code: 'OD-F-01',
        voltage: '33 kV',
        lengthKm: 4.2,
        transformers: 18,
        consumers: 12400,
        config: 'UG',
        type: 'Dedicated (HT Service)',
        isDedicated: true,
        lifelineCategory: 'hospital',
        lifelineLabel: 'Puri District HQ Hospital',
        priorityLevel: 'P1_CRITICAL',
        tripRisk: 'MODERATE'
      },
      {
        name: 'Swargadwar Cyclone Shelter Feeder',
        code: 'OD-F-02',
        voltage: '11 kV',
        lengthKm: 3.1,
        transformers: 12,
        consumers: 6800,
        config: 'Mixed',
        type: 'Distribution',
        lifelineCategory: 'governance',
        lifelineLabel: 'OSDMA Multi-Purpose Cyclone Shelter',
        priorityLevel: 'P1_CRITICAL',
        tripRisk: 'CRITICAL'
      }
    ]
  },
  {
    code: 'OPTCL-PARADIP-220',
    name: '220/33kV Paradip Port Bulk Switchyard',
    cleanName: 'Paradip Port Bulk Switchyard',
    voltage: '220 kV',
    tier: 'bulk',
    capacity: 250,
    circleCode: 'PARADIP-TRAN',
    circle: 'Jagatsinghpur Transmission Circle',
    district: 'Jagatsinghpur',
    regionCode: 'OD-COASTAL',
    lat: 20.292,
    lng: 86.671,
    totalConsumers: 8500,
    totalTransformers: 24,
    totalFeedersCount: 1,
    feeders: [
      {
        name: 'Paradip Port Trust Main Dock Feeder',
        code: 'OD-F-03',
        voltage: '33 kV',
        lengthKm: 5.6,
        transformers: 24,
        consumers: 8500,
        config: 'UG',
        type: 'Dedicated (HT Service)',
        isDedicated: true,
        lifelineCategory: 'transit',
        lifelineLabel: 'Paradip Port Container & Oil Berth',
        priorityLevel: 'P2_ESSENTIAL',
        tripRisk: 'CRITICAL'
      }
    ]
  }
];

export class OptclOdishaMcpAdapter implements GridMcpProvider {
  readonly manifest: GridRegionManifest = ODISHA_MANIFEST;

  async loadGridDataset(): Promise<NormalizedGridDataset> {
    return {
      manifest: this.manifest,
      substations: ODISHA_BLUEPRINT_SUBSTATIONS,
      sections: [],
      totalCapacityMva: 1600
    };
  }

  async evaluateSurgeVulnerability(
    surgeDepthMeters: number,
    windGustKmh: number,
    substationId?: string
  ): Promise<SurgeVulnerabilityAssessment[]> {
    const data = await this.loadGridDataset();
    const targetNodes = substationId
      ? data.substations.filter((s) => s.code === substationId || s.name === substationId)
      : data.substations;

    return targetNodes.map((ss) => ({
      substationId: ss.code,
      substationName: ss.name,
      surgeDepthCm: Math.round(surgeDepthMeters * 100),
      isPlinthSubmerged: surgeDepthMeters >= 1.0,
      recommendedAction: surgeDepthMeters >= 1.0 || windGustKmh > 120
        ? 'MANDATORY_PREEMPTIVE_SHUTDOWN'
        : 'PREPARE_ISOLATION',
      reasoning: `OSDMA coastal storm surge threshold model: ${surgeDepthMeters}m surge with ${windGustKmh} km/h wind gusts. (Basis: OSDMA Super-Cyclone Hardening Standard)`,
      lifelinesAtRisk: (ss.feeders || []).map((f) => f.name),
      dispatchUrgency: surgeDepthMeters >= 1.0 ? 'CRITICAL_IMMEDIATE' : 'ELEVATED'
    }));
  }

  async executePreemptiveTrip(substationId: string, reason: string): Promise<TripActionReceipt> {
    return {
      transactionId: `TRIP-OD-${Date.now()}-${substationId}`,
      timestamp: new Date().toISOString(),
      substationId,
      actionTaken: 'PREEMPTIVE_SAFETY_ISOLATED',
      initiatedBy: `SurgeGrid-Anticipatory-AI / OSDMA Grid Cell (Basis: ${reason})`,
      affectedFeedersCount: 2,
      restorationSlaHours: 4,
      status: 'SCADA_ACKNOWLEDGED'
    };
  }

  async generateStatutoryAdvisory(
    substationId: string,
    alertLevel: 'YELLOW' | 'ORANGE' | 'RED'
  ): Promise<DisasterAdvisoryDocument> {
    return {
      advisoryId: `ADV-OSDMA-SG-${Date.now()}`,
      issuedAt: new Date().toISOString(),
      issuingAuthority: 'SurgeGrid AI / OSDMA Disaster Risk Reduction Wing',
      targetAgency: 'OPTCL State Load Dispatch Centre & District Collectorate',
      severityLevel: alertLevel,
      headline: `OSDMA ${alertLevel} EMERGENCY: Anticipatory Cyclone Grid Isolation Protocol for ${substationId}`,
      executiveSummary: 'Anticipatory flood and wind defense protocol triggered under OSDMA Super-Cyclone Hardening Standards.',
      actionChecklist: [
        'Secure coastal 220kV tower switchyard gates.',
        'Transfer district hospital loads to dedicated backup DG sets.',
        'De-energize 11kV overhead lines crossing coastal storm surge waterways.'
      ],
      substationsAffected: [substationId],
      digitalPublicGoodCompliance: true
    };
  }
}
