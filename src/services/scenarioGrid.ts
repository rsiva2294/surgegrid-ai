/**
 * scenarioGrid.ts
 *
 * Per-cell hourly rain for the hindcast scenarios (NASA GPM IMERG, ~11 km / 0.1 degree cells), built by
 * scripts/build_scenario_grids.py. A cell is a satellite estimate averaged over about 11 km, not a street-level value,
 * so every substation in a cell gets the same number. Wind is not gridded (ERA5-Land has no data over the coastal
 * cells); the city-wide wind stays in the area-mean scenario file.
 */

import { getImdRainClass, type ImdRainClass } from '../data/officialSources';
import type { SimulationScenarioId } from './scenarioService';

export interface GridCell {
  id: string;
  /** South-west corner of the cell. */
  lat0: number;
  lng0: number;
  /** Substations in our grid data that fall in this cell. */
  substations: number;
}

export interface ScenarioGrid {
  scenario: string;
  cellSizeDeg: number;
  cells: GridCell[];
  /** Scenario hours (T-0 is the peak-rain hour), same as the area-mean scenario file. */
  hours: number[];
  /** rainMm[cellIndex][hourIndex]: rain in that hour, mm. */
  rainMm: number[][];
}

const cache = new Map<SimulationScenarioId, ScenarioGrid>();

export async function fetchScenarioGrid(id: SimulationScenarioId): Promise<ScenarioGrid | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const file = id === 'MICHAUNG_2023' ? 'michaung2023' : id === 'FLOODS_2015' ? 'floods2015' : 'monsoon2020';
  try {
    const res = await fetch(`/data/scenarios/${file}_grid.json`);
    if (!res.ok) return null;
    const grid = (await res.json()) as ScenarioGrid;
    cache.set(id, grid);
    return grid;
  } catch (err) {
    console.warn(`Scenario grid ${id} did not load:`, err);
    return null;
  }
}

/** Index of the grid cell holding a point, or -1 when the point is in none of the cells. */
export function cellIndexFor(grid: ScenarioGrid, lat: number, lng: number): number {
  const d = grid.cellSizeDeg;
  const lat0 = Math.round(Math.floor(lat / d + 1e-9) * d * 1e4) / 1e4;
  const lng0 = Math.round(Math.floor(lng / d + 1e-9) * d * 1e4) / 1e4;
  return grid.cells.findIndex(c => c.lat0 === lat0 && c.lng0 === lng0);
}

const WINDOW_HOURS = 24;

/** Rain (mm) in the cell over the 24 hours ending at `hour` (inclusive); fewer hours if the data starts later. */
export function rolling24hRain(grid: ScenarioGrid, cellIndex: number, hour: number): number | null {
  const end = grid.hours.indexOf(hour);
  const row = grid.rainMm[cellIndex];
  if (end === -1 || !row) return null;
  let sum = 0;
  for (let k = Math.max(0, end - WINDOW_HOURS + 1); k <= end; k++) sum += row[k] ?? 0;
  return sum;
}

export interface CellRainState {
  cellIndex: number;
  mm24: number;
  rainClass: ImdRainClass;
}

/** 24-hour rain and IMD class of the cell holding a point, at one hour. Null when the point is in no cell. */
export function rainStateAt(grid: ScenarioGrid, lat: number, lng: number, hour: number): CellRainState | null {
  const cellIndex = cellIndexFor(grid, lat, lng);
  if (cellIndex === -1) return null;
  const mm24 = rolling24hRain(grid, cellIndex, hour);
  if (mm24 === null) return null;
  return { cellIndex, mm24, rainClass: getImdRainClass(mm24) };
}
