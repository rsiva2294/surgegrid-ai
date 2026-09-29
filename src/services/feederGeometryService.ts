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
  kva: number | string;
  cons: number;
  lat: number;
  lng: number;
  poles?: number | null; // 0 = Plinth ground-mount (inundation risk), 2 = DP pole structure
  htFeeders?: number | null; // >= 2 = Loop-in / Loop-out RMU switchable node
  ltFeeders?: number | null; // Number of outgoing LT service lines
  make?: string | null; // Equipment manufacturer for disaster replacement contracts
  scheme?: string | null;
}

import { get, set } from 'idb-keyval';

// In-memory RAM cache for fast synchronous access within session
const feederCircleCache = new Map<string, Record<string, FeederGeometry>>();
const dtrCircleCache = new Map<string, Record<string, DTRPoint[]>>();
const ssShardCache = new Map<string, { feeders: Record<string, FeederGeometry>; dtrs: Record<string, DTRPoint[]> }>();

/**
 * Fetch substation-level shard containing both feeders and DTRs (~20-80 KB vs ~3.9 MB circle file).
 */
async function fetchSubstationShard(ssCode: string) {
  if (!ssCode) return null;
  if (ssShardCache.has(ssCode)) {
    return ssShardCache.get(ssCode)!;
  }

  const idbKey = `sg_ss_shard_${ssCode}_v1`;
  try {
    const cached = await get<{ feeders: Record<string, FeederGeometry>; dtrs: Record<string, DTRPoint[]> }>(idbKey);
    if (cached && (Object.keys(cached.feeders || {}).length > 0 || Object.keys(cached.dtrs || {}).length > 0)) {
      ssShardCache.set(ssCode, cached);
      return cached;
    }
  } catch (idbErr) {
    console.warn(`[feederGeometryService] IDB read error for substation shard ${ssCode}:`, idbErr);
  }

  try {
    const res = await fetch(`/data/substation_feeders/${ssCode}.json`);
    if (res.ok) {
      const data = await res.json();
      const shard = {
        feeders: data.feeders || {},
        dtrs: data.dtrs || {}
      };
      ssShardCache.set(ssCode, shard);
      set(idbKey, shard).catch(() => {});
      return shard;
    }
  } catch {
    // Shard fetch failed, fallback to circle file
  }

  return null;
}

/**
 * Fetch surveyed feeder wire geometry on demand by circle and feeder code.
 * Fast path: Substation-level shard (~20-80 KB).
 * Fallback: Circle-level geometry file (~2.5 MB).
 */
export async function getFeederGeometry(
  circleCode: string,
  feederCode: string,
  substationCode?: string
): Promise<FeederGeometry | null> {
  if (!circleCode || !feederCode) return null;

  // 1. Try Substation-Level Shard (fastest, lightweight payload)
  if (substationCode) {
    const ssShard = await fetchSubstationShard(substationCode);
    if (ssShard?.feeders?.[feederCode]) {
      return ssShard.feeders[feederCode];
    }
  }

  const cir = circleCode.padStart(4, '0');

  try {
    // 2. In-memory cache check
    if (feederCircleCache.has(cir)) {
      return feederCircleCache.get(cir)?.[feederCode] || null;
    }

    // 3. Persistent IndexedDB check
    const idbKey = `sg_feeders_circle_${cir}`;
    try {
      const cached = await get<Record<string, FeederGeometry>>(idbKey);
      if (cached && Object.keys(cached).length > 0) {
        feederCircleCache.set(cir, cached);
        return cached[feederCode] || null;
      }
    } catch (idbErr) {
      console.warn(`[feederGeometryService] IDB read error for circle ${cir}:`, idbErr);
    }

    // 4. Circle network fetch fallback
    const res = await fetch(`/data/feeders/${cir}.json`);
    if (!res.ok) {
      console.warn(`Feeder geometry file for circle ${cir} not found.`);
      return null;
    }
    const data: Record<string, FeederGeometry> = await res.json();
    feederCircleCache.set(cir, data);

    // Save to IndexedDB asynchronously
    set(idbKey, data).catch(err => {
      console.warn(`[feederGeometryService] Failed to cache circle ${cir} in IndexedDB:`, err);
    });

    return data[feederCode] || null;
  } catch (err) {
    console.error(`Failed to load feeder geometry for ${feederCode} in circle ${cir}:`, err);
    return null;
  }
}

/**
 * Fetch surveyed distribution transformer points on demand by circle and feeder code.
 * Fast path: Substation-level shard (~20-80 KB).
 * Fallback: Circle-level DTR file (~1.5 MB).
 */
export async function getFeederTransformers(
  circleCode: string,
  feederCode: string,
  substationCode?: string
): Promise<DTRPoint[]> {
  if (!circleCode || !feederCode) return [];

  // 1. Try Substation-Level Shard (fastest, lightweight payload)
  if (substationCode) {
    const ssShard = await fetchSubstationShard(substationCode);
    if (ssShard?.dtrs?.[feederCode]) {
      return ssShard.dtrs[feederCode];
    }
  }

  const cir = circleCode.padStart(4, '0');

  try {
    // 2. In-memory cache check
    if (dtrCircleCache.has(cir)) {
      return dtrCircleCache.get(cir)?.[feederCode] || [];
    }

    // 3. Persistent IndexedDB check (versioned to v2 for enriched DR metadata)
    const idbKey = `sg_dtr_circle_${cir}_v2`;
    try {
      const cached = await get<Record<string, DTRPoint[]>>(idbKey);
      if (cached && Object.keys(cached).length > 0) {
        dtrCircleCache.set(cir, cached);
        return cached[feederCode] || [];
      }
    } catch (idbErr) {
      console.warn(`[feederGeometryService] IDB read error for DTRs in circle ${cir}:`, idbErr);
    }

    // 4. Circle network fetch fallback
    const res = await fetch(`/data/dtr/${cir}.json`);
    if (!res.ok) {
      console.warn(`DTR file for circle ${cir} not found.`);
      return [];
    }
    const data: Record<string, DTRPoint[]> = await res.json();
    dtrCircleCache.set(cir, data);

    // Save to IndexedDB asynchronously
    set(idbKey, data).catch(err => {
      console.warn(`[feederGeometryService] Failed to cache DTRs for circle ${cir} in IndexedDB:`, err);
    });

    return data[feederCode] || [];
  } catch (err) {
    console.error(`Failed to load DTRs for ${feederCode} in circle ${cir}:`, err);
    return [];
  }
}
