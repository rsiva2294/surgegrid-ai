/**
 * imdBulletins.ts
 *
 * What IMD said and recorded about Cyclone Michaung at the time of each timeline step: quotes from its press releases
 * and from its final report, and the observed best-track position from that report. Quotes are word for word (spacing
 * repaired where the PDF text was broken); scripts/verify_imd_quotes.py checks each one, and each best-track row,
 * against the PDF text. These are IMD's statements then, in forecast wording where it says "likely", not our claims and
 * not plan quotes. The bulletin used for a step is the latest one in our set issued before that step; a later
 * bulletin is marked as such.
 */

export interface ImdBulletin {
  id: string;
  /** Short label for the card. */
  label: string;
  file: string;
  /** Link to the PDF when IMD publishes it at a known address. */
  url?: string;
}

const base = 'https://internal.imd.gov.in/press_release/';

export const IMD_BULLETINS: Record<string, ImdBulletin> = {
  b3dec: { id: 'b3dec', label: 'Press Release, 13:30 IST, 3 Dec 2023', file: '20231203_pr_2669.pdf', url: `${base}20231203_pr_2669.pdf` },
  b4dec: { id: 'b4dec', label: 'Press Release 4, 13:00 IST, 4 Dec 2023', file: '20231204_pr_2671.pdf', url: `${base}20231204_pr_2671.pdf` },
  b5dec: { id: 'b5dec', label: 'Press Release 5, 11:00 IST, 5 Dec 2023', file: '20231205_pr_2674.pdf', url: `${base}20231205_pr_2674.pdf` },
  b6dec: { id: 'b6dec', label: 'Press Release 6, 13:30 IST, 6 Dec 2023', file: '20231206_pr_2677.pdf', url: `${base}20231206_pr_2677.pdf` },
  report: { id: 'report', label: 'IMD final report on Michaung, Dec 2023', file: '26_0580dd_Michaung Report_Final_Sir.pdf' },
};

export interface ImdQuote {
  bulletin: string;
  /** What kind of statement it is, so a forecast is never read as an observation. */
  kind: 'Observed rain' | 'Observed wind' | 'Rain warning' | 'Wind warning' | 'Forecast' | 'Damage expected' | 'Landfall';
  text: string;
}

export interface ImdStepNote {
  quotes: ImdQuote[];
}

const A = 'b3dec';
const B = 'b4dec';
const C = 'b5dec';
const R = 'report';

/** Keyed by scenario hour (T-0 = peak-rain hour, 3 Dec 2023 21:00 UTC = 02:30 IST on 4 Dec). */
export const IMD_STEP_NOTES: Record<number, ImdStepNote> = {
  // T-24h = 02:30 IST, 3 Dec: before the first bulletin in our set; the best-track line still applies.
  [-24]: { quotes: [] },
  // T-6h = 20:30 IST, 3 Dec
  [-6]: {
    quotes: [
      {
        bulletin: A,
        kind: 'Rain warning',
        text: 'North Coastal Tamil Nadu & Puducherry: Light to moderate rainfall at most places with heavy to very heavy rainfall at a few places with isolated extremely heavy falls is very likely on 3rd & 4th',
      },
    ],
  },
  // T-0h = 02:30 IST, 4 Dec
  [0]: {
    quotes: [
      {
        bulletin: A,
        kind: 'Wind warning',
        text: 'Gale wind speed reaching 60-70 kmph gusting to 80 kmph is prevailing over Southwest Bay of Bengal. It is likely to gradually increase becoming 70-80 kmph gusting to 90 kmph from 3rd December evening for subsequent 12 hours.',
      },
      {
        bulletin: A,
        kind: 'Observed rain',
        text: 'Heavy to very heavy rainfall reported at isolated places over Tamil Nadu and Rayalaseema',
      },
    ],
  },
  // T+12h = 14:30 IST, 4 Dec
  [12]: {
    quotes: [
      {
        bulletin: B,
        kind: 'Observed rain',
        text: 'Heavy to very heavy rainfall with isolated extremely heavy rainfall reported over Tamil Nadu',
      },
      {
        bulletin: B,
        kind: 'Wind warning',
        text: 'Gale wind speed reaching 60-70 kmph gusting to 80 kmph is prevailing along and off north Tamilnadu coast (Chennai and to its north).',
      },
      {
        bulletin: R,
        kind: 'Observed wind',
        text: 'High Wind Speed Recorder at Chennai (NBK) recorded wind speed of about 75 kmph (40-45 knots) in gusts during early hours to noon of 04th December 2023.',
      },
      {
        bulletin: R,
        kind: 'Observed wind',
        text: 'NBK AWS 30 kt (56 kmph) on 04th / 14:15 IST',
      },
      {
        bulletin: B,
        kind: 'Damage expected',
        text: 'Localized Flooding of roads and closure of underpasses mainly in urban areas of the above region',
      },
    ],
  },
  // T+36h = 14:30 IST, 5 Dec
  [36]: {
    quotes: [
      {
        bulletin: C,
        kind: 'Forecast',
        text: 'cross south Andhra Pradesh coast close to Bapatla during next 4 hours as a Severe Cyclonic Storm with a maximum sustained wind speed of 90-100 kmph gusting to 110 kmph',
      },
      {
        bulletin: C,
        kind: 'Wind warning',
        text: 'Squally wind speed reaching 30-40 kmph gusting to 50 kmph is prevailing along and off north Tamilnadu coast (Chennai and to its north)',
      },
      {
        bulletin: R,
        kind: 'Landfall',
        text: 'Crossed South Andhra Pradesh coast close to south of Bapatla during 0700-0900 UTC (1230-1430 IST) of 05th December near Lat 15.7 deg. N and Lon 80.3 deg. E as a severe Cyclonic Storm with the maximum sustained wind speed of 50 knots (90-100 kmph gusting to 110 kmph)',
      },
    ],
  },
};

// ---- Observed best track (IMD final report, Table 1) ------------------------------------------------------------

export type TrackGrade = 'D' | 'DD' | 'CS' | 'SCS';

export const TRACK_GRADE_NAMES: Record<TrackGrade, string> = {
  D: 'Depression',
  DD: 'Deep depression',
  CS: 'Cyclonic storm',
  SCS: 'Severe cyclonic storm',
};

export interface BestTrackPoint {
  /** Time of the table row, UTC, ISO. */
  utc: string;
  lat: number;
  lng: number;
  grade: TrackGrade;
  /** Estimated maximum sustained surface wind, knots. */
  windKt: number;
  pressureHpa: number;
  /** The table row as printed (used by scripts/verify_imd_quotes.py). */
  row: string;
  /** Set when the table has no row at exactly the step time and this is the nearest earlier one. */
  nearestEarlier?: boolean;
}

/** Keyed by scenario hour. The table is 3-hourly, so most steps have an exact row. */
export const IMD_BEST_TRACK: Record<number, BestTrackPoint> = {
  [-24]: { utc: '2023-12-02T18:00:00Z', lat: 11.1, lng: 82.7, grade: 'DD', windKt: 30, pressureHpa: 996, row: '1800 11.1 82.7 2.0 996 30 6 DD', nearestEarlier: true },
  [-6]: { utc: '2023-12-03T15:00:00Z', lat: 12.4, lng: 81.9, grade: 'CS', windKt: 40, pressureHpa: 994, row: '1500 12.4 81.9 2.5 994 40 8 CS' },
  [0]: { utc: '2023-12-03T21:00:00Z', lat: 13.0, lng: 81.4, grade: 'CS', windKt: 45, pressureHpa: 992, row: '2100 13.0 81.4 3.0 992 45 10 CS' },
  [12]: { utc: '2023-12-04T09:00:00Z', lat: 13.7, lng: 80.7, grade: 'SCS', windKt: 50, pressureHpa: 988, row: '0900 13.7 80.7 3.0 988 50 14 SCS' },
  [36]: { utc: '2023-12-05T09:00:00Z', lat: 15.8, lng: 80.3, grade: 'SCS', windKt: 50, pressureHpa: 990, row: '0900 15.8 80.3 - 990 50 12 SCS' },
};

/** Chennai (Nungambakkam), used only to say how far the storm centre was. Our calculation, not IMD's. */
const CHENNAI = { lat: 13.0827, lng: 80.2707 };

export function distanceToChennaiKm(lat: number, lng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - CHENNAI.lat);
  const dLng = rad(lng - CHENNAI.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(CHENNAI.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14:30 IST, 4 Dec" for a UTC timestamp (the scenario files give UTC without a zone mark). */
export function istLabel(utcIso: string | undefined): string | null {
  if (!utcIso) return null;
  const t = Date.parse(utcIso.endsWith('Z') ? utcIso : `${utcIso}Z`);
  if (Number.isNaN(t)) return null;
  const ist = new Date(t + 5.5 * 3600 * 1000);
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} IST, ${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]}`;
}
