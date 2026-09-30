/**
 * imdBulletins.ts
 *
 * What IMD said about Cyclone Michaung at the time of each timeline step, quoted from its own press releases.
 * Quotes are word for word (spacing repaired where the PDF text was broken); scripts/verify_imd_quotes.py checks each
 * one against the PDF text. These are IMD's statements then, in forecast wording where it says "likely", not our claims
 * and not plan quotes. The bulletin used for a step is the latest one in our set issued before that step; a later
 * bulletin is marked as such.
 */

export interface ImdBulletin {
  id: string;
  /** Short label for the card. */
  label: string;
  /** Local time of issue, ISO with the IST offset. */
  issuedIst: string;
  file: string;
  url: string;
}

const base = 'https://internal.imd.gov.in/press_release/';

export const IMD_BULLETINS: Record<string, ImdBulletin> = {
  b3dec: { id: 'b3dec', label: 'Press Release, 13:30 IST, 3 Dec 2023', issuedIst: '2023-12-03T13:30:00+05:30', file: '20231203_pr_2669.pdf', url: `${base}20231203_pr_2669.pdf` },
  b4dec: { id: 'b4dec', label: 'Press Release 4, 13:00 IST, 4 Dec 2023', issuedIst: '2023-12-04T13:00:00+05:30', file: '20231204_pr_2671.pdf', url: `${base}20231204_pr_2671.pdf` },
  b5dec: { id: 'b5dec', label: 'Press Release 5, 11:00 IST, 5 Dec 2023', issuedIst: '2023-12-05T11:00:00+05:30', file: '20231205_pr_2674.pdf', url: `${base}20231205_pr_2674.pdf` },
  b6dec: { id: 'b6dec', label: 'Press Release 6, 13:30 IST, 6 Dec 2023', issuedIst: '2023-12-06T13:30:00+05:30', file: '20231206_pr_2677.pdf', url: `${base}20231206_pr_2677.pdf` },
};

export interface ImdQuote {
  bulletin: string;
  /** What kind of statement it is, so a forecast is never read as an observation. */
  kind: 'Storm position, 08:30 IST' | 'Observed rain' | 'Rain warning' | 'Wind warning' | 'Forecast' | 'Damage expected' | 'Later bulletin';
  text: string;
}

export interface ImdStepNote {
  /** True when no bulletin in our set was issued before the step. */
  none?: boolean;
  quotes: ImdQuote[];
}

const A = 'b3dec';
const B = 'b4dec';
const C = 'b5dec';
const D = 'b6dec';

/** Keyed by scenario hour (T-0 = peak-rain hour, 3 Dec 2023 21:00 UTC = 02:30 IST on 4 Dec). */
export const IMD_STEP_NOTES: Record<number, ImdStepNote> = {
  // T-24h = 02:30 IST, 3 Dec: before the first bulletin in our set.
  [-24]: { none: true, quotes: [] },
  // T-6h = 20:30 IST, 3 Dec
  [-6]: {
    quotes: [
      {
        bulletin: A,
        kind: 'Storm position, 08:30 IST',
        text: 'lay centered at 0830 hours IST of today, the 03rd December, 2023 over the same region near Latitude 11.5°N and Longitude 82.4°E, about 290 km east-southeast of Puducherry, 290 km southeast of Chennai',
      },
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
        kind: 'Storm position, 08:30 IST',
        text: 'lay centered at 0830 hours IST of 4th December, 2023 over the same region near Latitude 13.3°N and Longitude 81.0°E, about 90 km east-northeast of Chennai',
      },
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
        bulletin: D,
        kind: 'Later bulletin',
        text: 'crossed south Andhra Pradesh coast between Nellore and Machilipatnam, close to south of Bapatla during 1230 to 1430 hours IST of yesterday, the 5th December 2023 as a Severe Cyclonic Storm with maximum sustained wind speed of 90-100 kmph',
      },
    ],
  },
};

/** "14:30 IST, 4 Dec" for a scenario timestamp in UTC (the scenario files give UTC without a zone mark). */
export function istLabel(utcIso: string | undefined): string | null {
  if (!utcIso) return null;
  const t = Date.parse(utcIso.endsWith('Z') ? utcIso : `${utcIso}Z`);
  if (Number.isNaN(t)) return null;
  const ist = new Date(t + 5.5 * 3600 * 1000);
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][ist.getUTCMonth()];
  return `${hh}:${mm} IST, ${ist.getUTCDate()} ${mon}`;
}
