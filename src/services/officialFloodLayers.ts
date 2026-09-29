/**
 * officialFloodLayers.ts
 *
 * Per-substation results of checking its mapped location against official flood layers from OpenCity's
 * Greater Chennai Corporation (GCC) profile. Built offline by scripts/build_official_flood_layers.py.
 * These are map checks, not predictions.
 */

import { useEffect, useState } from 'react';
import { CHENNAI_AVERAGE_ELEVATION_M } from '../data/officialSources';

export type FloodMapRating = 'LOW' | 'MODERATE' | 'HIGH';
export type InundationZoneClass = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';

export interface SubstationOfficialFlood {
  /** Inside the NRSC 2015 flood extent. */
  nrsc2015: boolean;
  /** Highest rating across the 5, 10, 25, 50 and 100-year flood maps it falls in, or null if in none. */
  returnPeriod: FloodMapRating | null;
  /** Worst class of the GCC flood inundation zones it falls in, or null if in none. */
  inundationZone: InundationZoneClass | null;
  stagnation2015Within500m: number;
  hotspots2020Within500m: number;
}

export interface OfficialFloodLayers {
  generated: string;
  source: string;
  method: string;
  layers: Record<string, string>;
  substations: Record<string, SubstationOfficialFlood>;
}

let cache: OfficialFloodLayers | null = null;
let pending: Promise<OfficialFloodLayers | null> | null = null;

export function loadOfficialFloodLayers(): Promise<OfficialFloodLayers | null> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/data/official_flood_layers.json')
      .then(res => (res.ok ? (res.json() as Promise<OfficialFloodLayers>) : null))
      .then(data => {
        cache = data;
        return data;
      })
      .catch(() => null);
  }
  return pending;
}

/** Returns the official-layer results for one substation, or null while loading or if unavailable. */
export function useOfficialFlood(code: string | undefined): { meta: OfficialFloodLayers | null; flood: SubstationOfficialFlood | null } {
  const [meta, setMeta] = useState<OfficialFloodLayers | null>(cache);
  useEffect(() => {
    let alive = true;
    loadOfficialFloodLayers().then(d => {
      if (alive) setMeta(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { meta, flood: meta && code ? meta.substations[code] ?? null : null };
}

/** Result for one substation if the file has already been loaded, otherwise null. Never triggers a load. */
export function getCachedOfficialFlood(code: string): SubstationOfficialFlood | null {
  return cache?.substations[code] ?? null;
}

/** True once the official flood-layer file is loaded. Use it so memoized filters recompute after the load. */
export function useOfficialFloodLoaded(): boolean {
  const [loaded, setLoaded] = useState(cache !== null);
  useEffect(() => {
    let alive = true;
    loadOfficialFloodLayers().then(d => {
      if (alive && d) setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return loaded;
}

/**
 * The one rule for "flood-flagged": yard at or below Chennai's 2.0 m average (GCC City DMP 2023), inside the NRSC 2015 flood
 * extent, or rated Moderate or High on the official flood-hazard maps. Facts and map checks only.
 */
export function isOfficiallyFloodFlagged(elevationM: number | undefined, flood: SubstationOfficialFlood | null): boolean {
  return (
    (elevationM !== undefined && elevationM <= CHENNAI_AVERAGE_ELEVATION_M) ||
    Boolean(flood?.nrsc2015) ||
    flood?.returnPeriod === 'HIGH' ||
    flood?.returnPeriod === 'MODERATE'
  );
}
