/**
 * sewerageStations.ts
 *
 * CMWSSB sewerage pumping stations (sewage, not storm water) from the TNGIS layer "CMWSSB Sewerage Pumping Stations".
 * Built offline by scripts/build_sewerage_pumping_stations.py. Each station sits at the centre of its TNGIS polygon.
 */

import { useEffect, useState } from 'react';

export interface SewerageStation {
  name: string;
  road: string;
  lat: number;
  lng: number;
}

export interface NearestStation {
  /** Index into `stations`. */
  i: number;
  /** Straight-line distance in km. */
  km: number;
  within1km: number;
}

export interface SewerageStationData {
  generated: string;
  source: string;
  method: string;
  stations: SewerageStation[];
  nearest: Record<string, NearestStation>;
}

let cache: SewerageStationData | null = null;
let pending: Promise<SewerageStationData | null> | null = null;

export function loadSewerageStations(): Promise<SewerageStationData | null> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/data/sewerage_pumping_stations.json')
      .then(res => (res.ok ? (res.json() as Promise<SewerageStationData>) : null))
      .then(data => {
        cache = data;
        return data;
      })
      .catch(() => null);
  }
  return pending;
}

export function useSewerageStations(): SewerageStationData | null {
  const [data, setData] = useState<SewerageStationData | null>(cache);
  useEffect(() => {
    let alive = true;
    loadSewerageStations().then(d => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
