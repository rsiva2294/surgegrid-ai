/**
 * reservoirService.ts
 *
 * Daily storage of the six Chennai supply reservoirs, as published by CMWSSB at https://cmwssb.tn.gov.in/lake-level.
 * The page has no API and no CORS headers, so the Cloud Function `surgegridReservoirs` (reservoir-proxy/) reads the table
 * and returns it as JSON. Figures are passed through as published; nothing is estimated here.
 */

import { useEffect, useState } from 'react';

export interface ReservoirReading {
  name: string;
  fullTankFt: number | null;
  capacityMcft: number | null;
  levelFt: number | null;
  storageMcft: number | null;
  storagePct: number | null;
  inflowCusecs: number | null;
  outflowCusecs: number | null;
  rainfallMm: number | null;
  lastYearStorageMcft: number | null;
}

export interface ReservoirData {
  /** Date the figures are for, YYYY-MM-DD. */
  asOn: string;
  source: string;
  sourceUrl: string;
  reservoirs: ReservoirReading[];
  total: Omit<ReservoirReading, 'name'>;
}

let cache: { at: number; data: ReservoirData } | null = null;
let pending: Promise<ReservoirData | null> | null = null;
const CLIENT_CACHE_MS = 15 * 60 * 1000;

export function loadReservoirs(): Promise<ReservoirData | null> {
  if (cache && Date.now() - cache.at < CLIENT_CACHE_MS) return Promise.resolve(cache.data);
  if (!pending) {
    pending = fetch('/api/reservoirs')
      .then(res => (res.ok ? (res.json() as Promise<ReservoirData>) : null))
      .then(data => {
        if (data && data.total && typeof data.total.storagePct === 'number' && Array.isArray(data.reservoirs)) {
          cache = { at: Date.now(), data };
          return data;
        }
        return cache ? cache.data : null;
      })
      .catch(() => (cache ? cache.data : null))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** Reservoir readings, or null while loading or if the source is unavailable (callers then show nothing). */
export function useReservoirs(enabled: boolean): ReservoirData | null {
  const [data, setData] = useState<ReservoirData | null>(cache ? cache.data : null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadReservoirs().then(d => {
      if (alive && d) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return data;
}
