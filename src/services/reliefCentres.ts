/**
 * reliefCentres.ts
 *
 * GCC relief centres grouped by ward, plus a backup-substation suggestion per substation.
 * Built offline by scripts/build_relief_centres.py. The GCC list has no coordinates, so wards are placed at a point inside
 * their official polygon, never at a centre's real site.
 */

import { useEffect, useState } from 'react';

export interface ReliefCentre {
  address: string;
  officer: string;
  contact: string;
}

export interface ReliefWard {
  zone: string;
  /** A point inside the ward polygon (not the centre's real site), or null if the ward polygon is missing. */
  lat: number | null;
  lng: number | null;
  centres: ReliefCentre[];
}

export interface BackupSuggestion {
  code: string;
  name: string;
  /** Straight-line distance in km. */
  km: number;
}

export interface ReliefCentreData {
  generated: string;
  source: string;
  method: string;
  wards: Record<string, ReliefWard>;
  backups: Record<string, BackupSuggestion>;
}

let cache: ReliefCentreData | null = null;
let pending: Promise<ReliefCentreData | null> | null = null;

export function loadReliefCentres(): Promise<ReliefCentreData | null> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/data/relief_centres.json')
      .then(res => (res.ok ? (res.json() as Promise<ReliefCentreData>) : null))
      .then(data => {
        cache = data;
        return data;
      })
      .catch(() => null);
  }
  return pending;
}

export function useReliefCentres(): ReliefCentreData | null {
  const [data, setData] = useState<ReliefCentreData | null>(cache);
  useEffect(() => {
    let alive = true;
    loadReliefCentres().then(d => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
