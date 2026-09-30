/**
 * gaugePoints.ts
 *
 * IMD's observed rain-gauge readings for Chennai-area stations during Cyclone Michaung, with the station coordinates,
 * built by scripts/build_gauge_points.py from IMD's final report (24 hours to 08:30 IST, 3, 4 and 5 December) and the
 * Tamil Nadu rain-gauge station list. IMD's lists only include stations with 7 cm or more, so a station missing for a
 * day is "not listed" (under about 70 mm, or not reporting), never zero.
 */

export interface GaugeWindow {
  id: string;
  label: string;
  /** End of the 24-hour window, UTC (08:30 IST = 03:00 UTC). */
  endUtc: string;
}

export interface GaugeStation {
  name: string;
  district: string;
  lat: number;
  lng: number;
  /** IMD gauge total per window id, mm; null when the station is not in IMD's list for that day. */
  mm: Record<string, number | null>;
  /** Satellite (IMERG) rain of the station's cell over the same 24 hours, mm; null outside our cells. */
  sat: Record<string, number | null>;
}

export interface GaugePoints {
  source: string;
  note: string;
  windows: GaugeWindow[];
  stations: GaugeStation[];
}

let cache: GaugePoints | null = null;

export async function fetchGaugePoints(): Promise<GaugePoints | null> {
  if (cache) return cache;
  try {
    const res = await fetch('/data/scenarios/michaung2023_gauges.json');
    if (!res.ok) return null;
    cache = (await res.json()) as GaugePoints;
    return cache;
  } catch (err) {
    console.warn('Rain-gauge points did not load:', err);
    return null;
  }
}

/** The latest 24-hour window that had already ended at the step time (UTC), or null when none had. */
export function gaugeWindowFor(g: GaugePoints, stepUtc: string | undefined): GaugeWindow | null {
  if (!stepUtc) return null;
  const t = Date.parse(stepUtc.endsWith('Z') ? stepUtc : `${stepUtc}Z`);
  if (Number.isNaN(t)) return null;
  let best: GaugeWindow | null = null;
  for (const w of g.windows) {
    if (Date.parse(w.endUtc) <= t) best = w;
  }
  return best;
}
