/**
 * gccPlan.ts
 *
 * Ward-level records from the Greater Chennai Corporation "City Disaster Management Perspective Plan 2024", built by
 * scripts/build_gcc_plan_2024.py (public/data/gcc_plan_2024.json):
 *  - the plan's inundation registers, "Depth of Inundation During Monsoon" 2015, 2017 to 2022: named streets with a depth
 *    class (above 5 ft, 3 to 5 ft, 2 to 3 ft, under 2 ft), counted per ward (each register matches the plan's printed total);
 *  - the 2023 north-east monsoon list of inundated locations (names, no depth classes);
 *  - relief-centre capacity and facilities, as printed in the plan's table, for zones where the parse passed its row checks (12 of 15).
 * The plan gives street names and ward numbers, not coordinates, so these are facts about a ward, not about a point.
 */

import { useEffect, useState } from 'react';

export type DepthClass = 'veryHigh' | 'high' | 'medium' | 'low';

export interface YearRecord {
  n: number;
  veryHigh: number;
  high: number;
  medium: number;
  low: number;
  /** Up to four locations in the two deepest classes. */
  deep: string[];
}

export interface PlanReliefCentre {
  name: string;
  capacity: number | null;
  streets: string;
  water: boolean | null;
  toilets: boolean | null;
  cooking: boolean | null;
}

export interface WardRecord {
  inundation: Record<string, YearRecord>;
  in2023: string[];
  relief: PlanReliefCentre[];
}

export interface GccPlanData {
  source: string;
  registers: Record<string, { pages: string; locations: number }>;
  wards: Record<string, WardRecord>;
}

let cache: GccPlanData | null = null;
let pending: Promise<GccPlanData | null> | null = null;

function load(): Promise<GccPlanData | null> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/data/gcc_plan_2024.json')
      .then(res => (res.ok ? (res.json() as Promise<GccPlanData>) : null))
      .then(d => {
        cache = d;
        return d;
      })
      .catch(() => null);
  }
  return pending;
}

/** The plan data once loaded, or null while loading or if unavailable. */
export function useGccPlan(): GccPlanData | null {
  const [data, setData] = useState<GccPlanData | null>(cache);
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

export const DEPTH_TEXT: Record<DepthClass, string> = {
  veryHigh: 'above 5 ft',
  high: '3 to 5 ft',
  medium: '2 to 3 ft',
  low: 'under 2 ft',
};

const ORDER: DepthClass[] = ['veryHigh', 'high', 'medium', 'low'];

export interface WardFacts {
  /** The 2015 register for the ward, or null when the ward has no location in it. */
  reg2015: { n: number; deepest: DepthClass; deepNames: string[] } | null;
  /** Register years (of those in the plan) in which the ward has at least one location. */
  yearsListed: string[];
  registerYears: number;
  in2023: string[];
  relief: PlanReliefCentre[];
}

export function wardFacts(data: GccPlanData | null, ward: number | string | undefined): WardFacts | null {
  if (!data || ward === undefined || ward === null) return null;
  const w = data.wards[String(ward)];
  if (!w) return null;
  const y15 = w.inundation['2015'];
  const deepest = y15 ? ORDER.find(c => y15[c] > 0) : undefined;
  return {
    reg2015: y15 && deepest ? { n: y15.n, deepest, deepNames: y15.deep } : null,
    yearsListed: Object.keys(w.inundation).sort(),
    registerYears: Object.keys(data.registers).length,
    in2023: w.in2023,
    relief: w.relief,
  };
}
