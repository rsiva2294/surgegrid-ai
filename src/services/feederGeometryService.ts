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

import { get, set } from 'idb-keyval';

// In-memory RAM cache for fast synchronous access within session
const feederCircleCache = new Map<string, Record<string, FeederGeometry>>();
const dtrCircleCache = new Map<string, Record<string, DTRPoint[]>>();

/**
 * Fetch surveyed feeder wire geometry on demand by circle and feeder code.
 * Uses 2-tier caching:
 * 1. Fast in-memory Map (0ms)
 * 2. Persistent IndexedDB disk cache (< 15ms)
 * 3. Network fetch fallback with automatic disk caching
 */
export async function getFeederGeometry(circleCode: string, feederCode: string): Promise<FeederGeometry | null> {
  if (!circleCode || !feederCode) return null;
  const cir = circleCode.padStart(4, '0');

  try {
    // 1. In-memory cache check
    if (feederCircleCache.has(cir)) {
      return feederCircleCache.get(cir)?.[feederCode] || null;
    }

    // 2. Persistent IndexedDB check
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

    // 3. Network fetch fallback
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
 * Uses 2-tier caching:
 * 1. Fast in-memory Map (0ms)
 * 2. Persistent IndexedDB disk cache (< 15ms)
 * 3. Network fetch fallback with automatic disk caching
 */
export async function getFeederTransformers(circleCode: string, feederCode: string): Promise<DTRPoint[]> {
  if (!circleCode || !feederCode) return [];
  const cir = circleCode.padStart(4, '0');

  try {
    // 1. In-memory cache check
    if (dtrCircleCache.has(cir)) {
      return dtrCircleCache.get(cir)?.[feederCode] || [];
    }

    // 2. Persistent IndexedDB check
    const idbKey = `sg_dtr_circle_${cir}`;
    try {
      const cached = await get<Record<string, DTRPoint[]>>(idbKey);
      if (cached && Object.keys(cached).length > 0) {
        dtrCircleCache.set(cir, cached);
        return cached[feederCode] || [];
      }
    } catch (idbErr) {
      console.warn(`[feederGeometryService] IDB read error for DTRs in circle ${cir}:`, idbErr);
    }

    // 3. Network fetch fallback
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
