/**
 * sectionBoundaries.ts
 *
 * Section-office boundary polygons live in their own file (public/data/section_boundaries.json, 1.2 MB) and are
 * loaded only when a section office is selected, so they do not slow the first load of the map.
 */

import { useEffect, useState } from 'react';

export interface SectionBoundary {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: any;
}

type BoundaryMap = Record<string, SectionBoundary>;

let cache: BoundaryMap | null = null;
let pending: Promise<BoundaryMap | null> | null = null;

export function loadSectionBoundaries(): Promise<BoundaryMap | null> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/data/section_boundaries.json')
      .then(res => (res.ok ? (res.json() as Promise<BoundaryMap>) : null))
      .then(data => {
        cache = data;
        return data;
      })
      .catch(() => null);
  }
  return pending;
}

/** Boundary polygon for a section office code, or null while loading or if it has none. */
export function useSectionBoundary(code: string | undefined): SectionBoundary | null {
  const [all, setAll] = useState<BoundaryMap | null>(cache);
  useEffect(() => {
    if (!code || all) return;
    let alive = true;
    loadSectionBoundaries().then(d => {
      if (alive) setAll(d);
    });
    return () => {
      alive = false;
    };
  }, [code, all]);
  return code && all ? all[code] ?? null : null;
}
