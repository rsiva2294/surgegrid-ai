import type { ChennaiGridData, TnebSubstation, TnebSection } from '../types/tneb';

let cachedGrid: ChennaiGridData | null = null;

export async function loadChennaiGrid(): Promise<ChennaiGridData> {
  if (cachedGrid) return cachedGrid;

  try {
    const res = await fetch('/data/chennai_tneb_grid.json');
    if (!res.ok) {
      throw new Error(`Failed to load chennai_tneb_grid.json: ${res.status}`);
    }
    const data: ChennaiGridData = await res.json();
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
