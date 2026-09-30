/**
 * siteBriefing.ts
 *
 * The facts behind the site briefing for one substation at the hindcast step on screen, shared by the briefing card and the
 * Gemini wording of the plan actions so both say the same thing. Rain: the satellite (IMERG) 24-hour total over the site's
 * cell and the IMD gauge readings of the latest IMD day that had ended. Flood: official map checks and the GCC registers.
 * The tier ("Check first" and so on) is our order, not an official rule; the plans set no rain level for action.
 */

import { useEffect, useState } from 'react';
import type { TnebSubstation } from '../types/tneb';
import type { ScenarioTimestep } from './scenarioService';
import { CHENNAI_AVERAGE_ELEVATION_M, IMD_RAIN_CLASSES, getImdRainClass } from '../data/officialSources';
import { useOfficialFlood, type SubstationOfficialFlood } from './officialFloodLayers';
import { DEPTH_TEXT, useGccPlan, wardFacts, type WardFacts } from './gccPlan';
import { cellIndexFor, fetchScenarioGrid, rolling24hRain, type ScenarioGrid } from './scenarioGrid';
import { fetchGaugePoints, gaugeWindowFor, nearbyGauges, type GaugePoints, type GaugeStation, type GaugeWindow } from './gaugePoints';

export const GAUGE_KM = 10;
const HEAVY_MM = IMD_RAIN_CLASSES.find(c => c.name === 'Heavy')!.minMm;

export type BriefingTier = 'first' | 'next' | 'watch' | 'none';
export const TIER_TITLE: Record<BriefingTier, string> = {
  first: 'Check first',
  next: 'Check next',
  watch: 'Watch',
  none: 'No flood flag in our data',
};

export const rainClassName = (mm: number) => getImdRainClass(mm).name;

export interface SiteBriefing {
  loaded: boolean;
  /** Satellite 24-hour rain to this step over the site's cell, mm; null outside our cells. */
  satMm: number | null;
  /** The latest IMD gauge day that had ended at this step, and how many hours before the step it ended. */
  win: GaugeWindow | null;
  ageH: number | null;
  /** Up to three gauges within GAUGE_KM: the nearest, then the nearest with a reading that day. */
  near: { station: GaugeStation; km: number }[];
  allAboveSat: boolean;
  /** "Rain here": the higher of the satellite value and the nearest gauge reading, with a line naming which. */
  hereMm: number | null;
  hereText: string | null;
  /** Where "rain here" came from. */
  hereSource: 'gauge' | 'satellite' | null;
  /** Short flood-fact labels for list rows. */
  chips: string[];
  tier: BriefingTier;
  /** Up to two flood facts, strongest first. */
  reasons: string;
  headSub: string | null;
}

export function useSiteBriefing(substation: TnebSubstation, timestep: ScenarioTimestep | null | undefined): SiteBriefing {
  const { flood } = useOfficialFlood(substation.code);
  const ward = wardFacts(useGccPlan(), substation.gccWard);
  const [grid, setGrid] = useState<ScenarioGrid | null>(null);
  const [gauges, setGauges] = useState<GaugePoints | null>(null);

  useEffect(() => {
    fetchScenarioGrid('MICHAUNG_2023').then(setGrid);
    fetchGaugePoints().then(setGauges);
  }, []);

  return computeBriefing(substation, timestep, grid, gauges, flood, ward);
}

/** The briefing for one site from loaded data; also used for every site in the "Exposed now" list. */
export function computeBriefing(
  substation: TnebSubstation,
  timestep: ScenarioTimestep | null | undefined,
  grid: ScenarioGrid | null,
  gauges: GaugePoints | null,
  flood: SubstationOfficialFlood | null,
  ward: WardFacts | null
): SiteBriefing {
  const hour = timestep?.timestep_hour ?? 0;
  const utc = timestep?.utc;
  const hasPoint = typeof substation.lat === 'number' && typeof substation.lng === 'number';

  const cell = grid && hasPoint ? cellIndexFor(grid, substation.lat, substation.lng) : -1;
  const satMm = grid && timestep && cell >= 0 ? rolling24hRain(grid, cell, hour) : null;

  const win = gauges ? gaugeWindowFor(gauges, utc) : null;
  const stepMs = utc ? Date.parse(utc.endsWith('Z') ? utc : `${utc}Z`) : NaN;
  const ageH = win && !Number.isNaN(stepMs) ? Math.round((stepMs - Date.parse(win.endUtc)) / 3600000) : null;
  // The nearest gauge, then the nearest ones with a reading that day, so an unlisted neighbour does not hide a real value.
  const within = gauges && hasPoint ? nearbyGauges(gauges, substation.lat, substation.lng, GAUGE_KM, Infinity) : [];
  const near =
    within.length === 0 || !win
      ? within.slice(0, 3)
      : [within[0], ...within.slice(1).filter(n => n.station.mm[win.id] != null), ...within.slice(1).filter(n => n.station.mm[win.id] == null)].slice(0, 3);
  const listed = win ? near.filter(n => n.station.mm[win.id] != null) : [];
  const allAboveSat =
    listed.length > 0 &&
    listed.every(n => {
      const sat = n.station.sat[win!.id];
      return sat != null && (n.station.mm[win!.id] as number) > sat;
    });

  const nearestRead = win ? near.find(n => n.station.mm[win.id] != null) : undefined;
  const gaugeMm = nearestRead && win ? (nearestRead.station.mm[win.id] as number) : null;
  const useGauge = gaugeMm !== null && (satMm === null || gaugeMm > satMm);
  const hereMm = useGauge ? gaugeMm : satMm;
  const hereText =
    hereMm === null
      ? null
      : useGauge && nearestRead
      ? `${rainClassName(hereMm)} rain (${nearestRead.station.name} gauge, ${hereMm} mm)`
      : `${rainClassName(hereMm)} rain (satellite, ${Math.round(hereMm)} mm)`;

  // Why this site: official flood facts, strongest first.
  const strong: string[] = [];
  const other: string[] = [];
  if (flood?.nrsc2015) strong.push('inside the 2015 flood extent');
  if (flood?.returnPeriod === 'HIGH') strong.push('High on the official hazard maps');
  if (ward?.reg2015 && (ward.reg2015.deepest === 'veryHigh' || ward.reg2015.deepest === 'high'))
    strong.push(`ward ${substation.gccWard} had a flooded spot ${DEPTH_TEXT[ward.reg2015.deepest]} deep in 2015`);
  if (flood?.returnPeriod === 'MODERATE') other.push('Moderate on the official hazard maps');
  if (substation.elevationM !== undefined && substation.elevationM <= CHENNAI_AVERAGE_ELEVATION_M)
    other.push(`yard at ${substation.elevationM} m, at or below the city average`);
  // Not used for the order: 172 of the 178 substations with a ward sit in a ward that appears in some GCC list, so it separates
  // almost nothing. The flood card still shows the ward's history.

  const chips: string[] = [];
  if (flood?.nrsc2015) chips.push('2015 extent');
  if (flood?.returnPeriod === 'HIGH' || flood?.returnPeriod === 'MODERATE') chips.push(`Hazard ${flood.returnPeriod === 'HIGH' ? 'High' : 'Moderate'}`);
  if (ward?.reg2015 && (ward.reg2015.deepest === 'veryHigh' || ward.reg2015.deepest === 'high')) chips.push(`Ward ${DEPTH_TEXT[ward.reg2015.deepest]} (2015)`);
  if (substation.elevationM !== undefined && substation.elevationM <= CHENNAI_AVERAGE_ELEVATION_M) chips.push(`Yard ${substation.elevationM} m`);

  const heavy = hereMm !== null && hereMm >= HEAVY_MM;
  const tier: BriefingTier = !strong.length && !other.length ? 'none' : heavy && strong.length ? 'first' : heavy ? 'next' : 'watch';
  const reasons = [...strong, ...other].slice(0, 2).join('; ');
  const headSub =
    tier === 'none'
      ? hereText
      : tier === 'watch'
      ? `${hereText ? `${hereText}, below Heavy so far` : 'No rain reading yet'}. ${reasons.charAt(0).toUpperCase()}${reasons.slice(1)}.`
      : `${hereText} on a site with a flood record: ${reasons}.`;

  const hereSource = hereMm === null ? null : useGauge ? 'gauge' : 'satellite';
  return { loaded: Boolean(grid && gauges), satMm, win, ageH, near, allAboveSat, hereMm, hereText, hereSource, chips, tier, reasons, headSub };
}

/** The briefing as prompt lines for Gemini, and a key that changes when the facts do. */
export function briefingForPrompt(b: SiteBriefing): { lines: string; key: string } {
  const sat = b.satMm === null ? 'no satellite cell' : `${Math.round(b.satMm)} mm (${rainClassName(b.satMm)})`;
  const gauge = b.win
    ? b.near
        .map(n => {
          const mm = n.station.mm[b.win!.id];
          return `${n.station.name} ${n.km.toFixed(1)} km: ${mm == null ? 'not listed (under about 70 mm or no report)' : `${mm} mm (${rainClassName(mm)})`}`;
        })
        .join('; ') || `no IMD gauge within ${GAUGE_KM} km`
    : 'no IMD gauge day had ended yet';
  const lines = `RAIN AT THIS STEP: satellite 24 h over the site's 11 km cell: ${sat} | IMD gauges${b.win ? ` (${b.win.label}, ended ${b.ageH} h before this step)` : ''}: ${gauge}
RAIN HERE (the higher of satellite and nearest gauge reading): ${b.hereText ?? 'none'}
FLOOD FACTS FOR THIS SITE: ${b.reasons || 'none in our data'}`;
  return { lines, key: `${b.tier}_${b.hereMm ?? 'x'}_${b.win?.id ?? 'none'}` };
}
