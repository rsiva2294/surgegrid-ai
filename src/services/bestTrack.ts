/**
 * bestTrack.ts
 *
 * The observed best track of Cyclone Michaung: every row of Table 1 of the IMD final report (3-hourly), built by
 * scripts/build_best_track.py into public/data/scenarios/michaung2023_track.json. The map draws it as a line and moves a
 * storm marker along it. Between two IMD fixes the position is a straight line between them (our interpolation, labelled so).
 */

import { useEffect, useState } from 'react';
import type { TrackGrade } from '../data/imdBulletins';

export interface TrackPoint {
  utc: string;
  ms: number;
  lat: number;
  lng: number;
  grade: TrackGrade;
  windKt: number;
  pressureHpa: number;
  row: string;
}

export interface BestTrack {
  source: string;
  landfall: { text: string; lat: number; lng: number; utcFrom: string; utcTo: string };
  points: TrackPoint[];
}

/** Marker colour by IMD grade. */
export const GRADE_COLOR: Record<TrackGrade, string> = {
  D: '#64748b',
  DD: '#0284c7',
  CS: '#f59e0b',
  SCS: '#dc2626',
};

let cache: BestTrack | null = null;
let pending: Promise<BestTrack | null> | null = null;

function load(): Promise<BestTrack | null> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/data/scenarios/michaung2023_track.json')
      .then(res => (res.ok ? (res.json() as Promise<Omit<BestTrack, 'points'> & { points: Omit<TrackPoint, 'ms'>[] }>) : null))
      .then(d => {
        if (!d) return null;
        cache = { ...d, points: d.points.map(p => ({ ...p, ms: Date.parse(p.utc) })) };
        return cache;
      })
      .catch(() => null);
  }
  return pending;
}

/** The track once loaded, or null while loading or if unavailable. */
export function useBestTrack(): BestTrack | null {
  const [data, setData] = useState<BestTrack | null>(cache);
  useEffect(() => {
    let alive = true;
    load().then(d => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

export interface StormNow {
  lat: number;
  lng: number;
  /** The IMD fix at or before this time (its grade and wind apply). */
  last: TrackPoint;
  /** The track from its first fix to this position. */
  path: { lat: number; lng: number }[];
}

/** Where the storm centre was at a time (ms since epoch), or null before the first fix or after the last one. */
export function stormAt(points: TrackPoint[], ms: number): StormNow | null {
  if (points.length < 2 || ms < points[0].ms || ms > points[points.length - 1].ms) return null;
  let i = 0;
  while (i < points.length - 2 && points[i + 1].ms <= ms) i++;
  const a = points[i];
  const b = points[i + 1];
  const t = Math.min(1, Math.max(0, (ms - a.ms) / (b.ms - a.ms)));
  const lat = a.lat + (b.lat - a.lat) * t;
  const lng = a.lng + (b.lng - a.lng) * t;
  const last = t >= 1 ? b : a;
  const path = points.filter(p => p.ms <= ms).map(p => ({ lat: p.lat, lng: p.lng }));
  path.push({ lat, lng });
  return { lat, lng, last, path };
}
