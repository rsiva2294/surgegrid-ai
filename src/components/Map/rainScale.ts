import { IMD_RAIN_CLASSES } from '../../data/officialSources';

/**
 * Colour scale for the 24-hour rain layer. The colour is continuous in mm, so cells that fall in the same IMD class
 * still look different. The stops sit on IMD's class limits (Moderate 15.6, Heavy 64.5, Very heavy 115.6, Extremely
 * heavy 204.5 mm) so the legend can label the class breaks. Below 2.5 mm the cell is left clear.
 */
interface Stop {
  mm: number;
  rgb: [number, number, number];
  opacity: number;
}

export const RAIN_STOPS: Stop[] = [
  { mm: 2.5, rgb: [219, 234, 254], opacity: 0 },
  { mm: 15.6, rgb: [191, 219, 254], opacity: 0.22 },
  { mm: 64.5, rgb: [96, 165, 250], opacity: 0.32 },
  { mm: 115.6, rgb: [37, 99, 235], opacity: 0.38 },
  { mm: 204.5, rgb: [76, 29, 149], opacity: 0.44 },
  { mm: 300, rgb: [59, 7, 100], opacity: 0.5 },
];

export const RAIN_SCALE_MAX_MM = RAIN_STOPS[RAIN_STOPS.length - 1].mm;

const hex = (rgb: number[]) => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

export function rainFill(mm24: number): { color: string; opacity: number } {
  const first = RAIN_STOPS[0];
  const last = RAIN_STOPS[RAIN_STOPS.length - 1];
  if (mm24 <= first.mm) return { color: hex(first.rgb), opacity: 0 };
  if (mm24 >= last.mm) return { color: hex(last.rgb), opacity: last.opacity };
  for (let i = 1; i < RAIN_STOPS.length; i++) {
    const a = RAIN_STOPS[i - 1];
    const b = RAIN_STOPS[i];
    if (mm24 <= b.mm) {
      const t = (mm24 - a.mm) / (b.mm - a.mm);
      return {
        color: hex(a.rgb.map((v, k) => v + (b.rgb[k] - v) * t)),
        opacity: a.opacity + (b.opacity - a.opacity) * t,
      };
    }
  }
  return { color: hex(last.rgb), opacity: last.opacity };
}

/** IMD class limits to mark on the legend (the classes that are Moderate and above). */
export const RAIN_LEGEND_BREAKS = IMD_RAIN_CLASSES.filter(c => c.minMm >= 15.6);

/** Return periods (years) of the GCC flood hazard maps we can draw. */
export const HAZARD_YEARS = [5, 10, 25, 50, 100] as const;
export type HazardYears = (typeof HAZARD_YEARS)[number];
