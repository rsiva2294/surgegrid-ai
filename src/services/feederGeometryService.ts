/**
 * feederGeometryService.ts
 * 
 * Asynchronous On-Demand Vector Loader for Ground-Truth Feeder Wire Geometries 
 * and Distribution Transformer (DTR) Points.
 * 
 * Tier 2: /data/feeders/{circleCode}.json (MultiLineString street geometries)
 * Tier 3: /data/dtr/{circleCode}.json (Surveyed DTR points with kVA and metered consumers)
 */

export interface FeederGeometry {
  name: string;
  code: string;
  ss_code: string;
  volt: string;
  len: number;
  dts: number;
  cons: number;
  type: 'LineString' | 'MultiLineString';
  coords: [number, number][] | [number, number][][]; // [lng, lat]
}

export interface DTRPoint {
  id: string;
  name: string;
  kva: number;
  cons: number;
  lat: number;
  lng: number;
}

// In-memory LRU/map cache to avoid redundant network fetches
const feederCircleCache = new Map<string, Record<string, FeederGeometry>>();
const dtrCircleCache = new Map<string, Record<string, DTRPoint[]>>();

/**
 * Fetch surveyed feeder wire geometry on demand by circle and feeder code
 */
export async function getFeederGeometry(circleCode: string, feederCode: string): Promise<FeederGeometry | null> {
  if (!circleCode || !feederCode) return null;
  const cir = circleCode.padStart(4, '0');

  try {
    if (!feederCircleCache.has(cir)) {
      const res = await fetch(`/data/feeders/${cir}.json`);
      if (!res.ok) {
        console.warn(`Feeder geometry file for circle ${cir} not found.`);
        return null;
      }
      const data = await res.json();
      feederCircleCache.set(cir, data);
    }

    const circleMap = feederCircleCache.get(cir);
    return circleMap?.[feederCode] || null;
  } catch (err) {
    console.error(`Failed to load feeder geometry for ${feederCode} in circle ${cir}:`, err);
    return null;
  }
}

/**
 * Fetch surveyed distribution transformer points on demand by circle and feeder code
 */
export async function getFeederTransformers(circleCode: string, feederCode: string): Promise<DTRPoint[]> {
  if (!circleCode || !feederCode) return [];
  const cir = circleCode.padStart(4, '0');

  try {
    if (!dtrCircleCache.has(cir)) {
      const res = await fetch(`/data/dtr/${cir}.json`);
      if (!res.ok) {
        console.warn(`DTR file for circle ${cir} not found.`);
        return [];
      }
      const data = await res.json();
      dtrCircleCache.set(cir, data);
    }

    const circleMap = dtrCircleCache.get(cir);
    return circleMap?.[feederCode] || [];
  } catch (err) {
    console.error(`Failed to load DTRs for ${feederCode} in circle ${cir}:`, err);
    return [];
  }
}
