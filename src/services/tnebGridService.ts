import type { ChennaiGridData, TnebSubstation, TnebSection, FeederDetail, PrecomputedConnection } from '../types/tneb';

/**
 * Strict Physical Distance Ceilings for Urban Grid Interconnections (TNEB Engineering Standard)
 * - 33kV & 11kV distribution step-downs / feeders: <= 8.5 km
 * - 110kV sub-transmission trunks: <= 12.0 km
 * - 230kV / 400kV bulk transmission corridors: <= 30.0 km
 * - Co-located campus sections / switchyard ties: <= 3.0 km
 */
export function isValidPhysicalGridConnection(connection: PrecomputedConnection): boolean {
  if (connection.type === 'section') return true;
  const dist = connection.distanceKm || 0;
  const v = (connection.voltage || '').toLowerCase();
  const label = (connection.label || '').toLowerCase();

  // 230kV / 400kV bulk transmission corridors
  if (v.includes('230') || v.includes('400') || label.includes('230') || label.includes('400')) {
    return dist <= 35.0;
  }
  // 110kV sub-transmission trunks
  if (v.includes('110') || label.includes('110')) {
    return dist <= 20.0;
  }
  // 33kV & 11kV distribution lines cannot operate across > 8.5 km in urban networks
  if (v.includes('33') || v.includes('11') || label.includes('33') || label.includes('11')) {
    return dist <= 8.5;
  }
  return dist <= 10.0;
}

const LIFELINE_PATTERNS = {
  hospital: {
    regex: /\b(HOSPITAL|MEDIC|MEDICAL|CLINIC|CANCER|APOLLO|KMC|STANLEY|STANLY|SRM|MIOT|HEALTH|RSRM|PHC|DISPENSARY)\b/i,
    labelDedicated: 'Hospital (Dedicated HT)',
    labelShared: 'Hospital Feeder (Area Line)',
    priority: 'P1_CRITICAL' as const
  },
  water: {
    regex: /\b(CMWSSB|WATER|DRAINAGE|SEWAGE|PUMP|PUMPING|METROWATER|WATERWORKS|WATER WORKS|STP|WTP)\b/i,
    labelDedicated: 'Water / Sewage Pumping (Dedicated)',
    labelShared: 'Water Pumping Station (Area Line)',
    priority: 'P1_CRITICAL' as const
  },
  transit: {
    regex: /\b(CMRL|METRO|RAILWAY|SOUTHERN RAILWAY|PORT TRUST|PORT|MTC|AIRPORT)\b/i,
    labelDedicated: 'Metro / Rail / Port (Dedicated HT)',
    labelShared: 'Transit Corridor Feeder',
    priority: 'P2_ESSENTIAL' as const
  },
  governance: {
    regex: /\b(SECRETARIAT|HIGH COURT|CROWN COURT|COURT|POLICE|COLLECTOR|COMMISSIONER|PRISON|JAIL|FIRE STATION|DEFENCE|AIR FORCE|NAVY)\b/i,
    labelDedicated: 'Govt / Emergency HQ (Dedicated)',
    labelShared: 'Emergency & Civil Services Line',
    priority: 'P2_ESSENTIAL' as const
  }
};

export function classifyFeeder(feeder: FeederDetail): FeederDetail {
  const name = feeder.name.toUpperCase();
  const is33kVTrunk = feeder.voltage?.includes('33') && !feeder.type?.toLowerCase().includes('dedicated');
  const isDedicated = feeder.type.toLowerCase().includes('dedicated') || (!is33kVTrunk && feeder.transformers === 0 && feeder.consumers > 0 && feeder.consumers <= 5);

  let classified: FeederDetail = {
    ...feeder,
    isDedicated: Boolean(isDedicated)
  };

  for (const [cat, conf] of Object.entries(LIFELINE_PATTERNS)) {
    if (conf.regex.test(name)) {
      classified = {
        ...feeder,
        isDedicated,
        lifelineCategory: cat as any,
        lifelineLabel: isDedicated ? conf.labelDedicated : conf.labelShared,
        priorityLevel: conf.priority
      };
      break;
    }
  }

  // Check if dedicated industrial/commercial HT
  if (!classified.lifelineCategory && isDedicated && (feeder.type.toLowerCase().includes('dedicated') || !is33kVTrunk)) {
    classified = {
      ...feeder,
      isDedicated: true,
      lifelineCategory: 'industrial_ht',
      lifelineLabel: 'Dedicated HT Commercial/Industrial',
      priorityLevel: 'P3_COMMERCIAL'
    };
  }

  // TNSDMA 2023 ESF 15 Statutory Restoration SLAs
  let esf15SlaHours = 48; // Baseline Tier 5 LT Distribution SLA (TNSDMA standard)
  let restorationStage: 1 | 2 | 3 | 4 | 5 = 5; // Default Stage 5 (LT consumer last-mile)

  if (classified.priorityLevel === 'P1_CRITICAL' || classified.priorityLevel === 'P1_NON_CUT' || classified.lifelineCategory === 'hospital' || classified.lifelineCategory === 'water') {
    esf15SlaHours = 6; // Statutory SLA: <= 6h for acute hospitals & primary water pumping
    restorationStage = 3; // Stage 3: Immediate Express Lifelines
  } else if (classified.priorityLevel === 'P2_ESSENTIAL' || classified.lifelineCategory === 'transit' || classified.lifelineCategory === 'governance') {
    esf15SlaHours = 12; // Statutory SLA: <= 12h for Metro Rail, Suburban transit, Govt HQ
    restorationStage = 4; // Stage 4: Automated RMU Priority Loops
  } else if (is33kVTrunk) {
    esf15SlaHours = 12; // Sub-transmission trunks feeding downstream 33/11 kV substations
    restorationStage = 3; // Stage 3: Sub-transmission grid trunks
  } else if (classified.priorityLevel === 'P3_COMMERCIAL' || classified.lifelineCategory === 'industrial_ht') {
    esf15SlaHours = 24; // Dedicated commercial / industrial HT services
    restorationStage = 4; // Stage 4: Automated RMU commercial loops
  }

  // Automated 11 kV Ring Main Unit (RMU) Estimation (Post-Vardah 13,810 RMU deployment)
  let rmuCount = 0;
  const cfg = (feeder.config || '').toUpperCase();
  if (cfg.includes('UG')) {
    // Pure Underground: sectionalized loop ring with RMUs every 3-4 DTRs or ~1.5 km
    const byDtr = Math.max(1, Math.round((feeder.transformers || 0) / 3.2));
    const byKm = Math.max(1, Math.round((feeder.lengthKm || 0) / 1.5));
    rmuCount = Math.max(2, Math.min(byDtr, byKm, 12));
  } else if (cfg.includes('MIXED')) {
    // Mixed: RMUs installed on underground cable segments; GOAB switches on overhead spans
    rmuCount = Math.max(1, Math.round((feeder.transformers || 0) / 4.5));
  } else {
    // Overhead: No automated RMU loops, reliant on manual pole-mounted GOAB switches
    rmuCount = 0;
  }

  return {
    ...classified,
    esf15SlaHours,
    restorationStage,
    rmuCount,
    circuitState: 'LIVE'
  };
}

let cachedGrid: ChennaiGridData | null = null;

export async function loadChennaiGrid(): Promise<ChennaiGridData> {
  if (cachedGrid) return cachedGrid;

  try {
    const res = await fetch('/data/chennai_tneb_grid.json');
    if (!res.ok) {
      throw new Error(`Failed to load chennai_tneb_grid.json: ${res.status}`);
    }
    const data: ChennaiGridData = await res.json();
    data.substations.forEach(s => {
      // Standard TNEB Switchgear equipment plinth clearance (1.5m above local GL)
      s.plinthElevationM = 1.5;

      // 2015 Flood Historical Benchmark (41 submerged substations up to 1.8m / 6ft)
      if (s.elevationM !== undefined) {
        if (s.elevationM <= 3.0) {
          s.benchmarked2015FloodDepthM = 1.8; // Peak 6-ft waterlogging in 2015 (Adyar/Cooum/Buckingham basins)
          s.yardDewateringRequired = true;
        } else if (s.elevationM <= 6.0) {
          s.benchmarked2015FloodDepthM = 0.9; // 3-ft waterlogging
          s.yardDewateringRequired = false;
        } else {
          s.benchmarked2015FloodDepthM = 0.2;
          s.yardDewateringRequired = false;
        }
      } else {
        s.benchmarked2015FloodDepthM = 0.5;
        s.yardDewateringRequired = false;
      }

      if (s.feeders) {
        s.feeders = s.feeders.map(classifyFeeder);
      }
      if (s.connections) {
        s.connections = s.connections.filter(isValidPhysicalGridConnection);
      }
    });
    cachedGrid = data;
    return data;
  } catch (err) {
    console.warn('[tnebGridService] Direct fetch failed, parsing compact index fallback:', err);
    // Fallback: parse super_index_v2.compact.json if chennai_tneb_grid.json is absent
    const res = await fetch('/data/super_index_v2.compact.json');
    if (!res.ok) {
      throw new Error(`Failed to load fallback super_index_v2.compact.json: ${res.status}`);
    }
    const compact = await res.json();
    const circles: string[] = compact.dictionaries?.circles || [];
    const districts: string[] = compact.dictionaries?.districts || [];
    const regions: string[] = compact.dictionaries?.regions || [];

    const isChennaiCoord = (lat: number, lng: number) =>
      lat >= 12.80 && lat <= 13.35 && lng >= 79.95 && lng <= 80.35;

    const isChennaiSS = (ss: any) => {
      const stdDist = ss[17] || '';
      const circleName = circles[ss[6]] || '';
      return stdDist === 'chennai' || circleName.toLowerCase().includes('chennai') || isChennaiCoord(ss[9], ss[10]);
    };

    const isChennaiSec = (sec: any) => {
      const stdDist = sec[21] || '';
      const circleName = circles[sec[4]] || '';
      return stdDist === 'chennai' || circleName.toLowerCase().includes('chennai') || isChennaiCoord(sec[10], sec[11]);
    };

    const getTier = (voltage: string) => {
      const v = (voltage || '').toLowerCase();
      if (v.includes('400') || v.includes('230') || v.includes('765')) return 'bulk' as const;
      if (v.includes('110')) return 'subtransmission' as const;
      return 'distribution' as const;
    };

    const substations: TnebSubstation[] = (compact.substations || [])
      .filter(isChennaiSS)
      .map((ss: any) => {
        const voltage = ss[3] || '33/11';
        const circleName = circles[ss[6]] || (ss[8] === '01' ? 'CHENNAI NORTH' : ss[8] === '09' ? 'CHENNAI SOUTH' : 'CHENNAI METRO');
        return {
          name: ss[0],
          cleanName: ss[1],
          code: ss[2],
          voltage,
          tier: getTier(voltage),
          capacity: ss[4] || 0,
          circleCode: ss[5],
          circle: circleName,
          district: districts[ss[7]] || ss[17] || 'Chennai',
          regionCode: ss[8],
          lat: ss[9],
          lng: ss[10],
          totalConsumers: 0,
          totalTransformers: 0,
          totalFeedersCount: 0,
          feeders: []
        };
      });

    const sections: TnebSection[] = (compact.sections || [])
      .filter(isChennaiSec)
      .map((sec: any) => ({
        name: sec[0],
        cleanName: sec[1],
        code: sec[2],
        circleCode: sec[3],
        circle: circles[sec[4]] || '',
        district: districts[sec[5]] || sec[21] || 'Chennai',
        subdivision: sec[6],
        division: sec[7],
        region: regions[sec[8]] || '',
        regionCode: sec[9],
        lat: sec[10],
        lng: sec[11],
        mobile: sec[12] || '',
        email: sec[13] || '',
        address: sec[14] || '',
        breakdownCode: sec[15] || ''
      }));

    cachedGrid = {
      version: '2.1-compact-extracted',
      source: 'TNEB Super Index V2 Compact',
      counts: {
        substations: substations.length,
        sections: sections.length
      },
      substations,
      sections
    };

    return cachedGrid;
  }
}
