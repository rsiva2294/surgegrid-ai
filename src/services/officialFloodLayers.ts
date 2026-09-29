/**
 * officialFloodLayers.ts
 *
 * Per-substation results of checking its mapped location against official flood layers from OpenCity's
 * Greater Chennai Corporation (GCC) profile. Built offline by scripts/build_official_flood_layers.py.
 * These are map checks, not predictions.
 */

import { useEffect, useState } from 'react';

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
