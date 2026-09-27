import { get, set } from 'idb-keyval';
import type { TnebSubstation, TnebSection } from '../types/tneb';

export interface LiveOutage {
  id?: string;
  outageFingerprint?: string;
  date: string;
  town?: string;
  substation?: string;
  feeder?: string;
  section?: string;
  sectionCode?: string;
  location?: string;
  workType?: string;
  fromTime?: string;
  toTime?: string;
  district?: string;
  circle?: string;
  circleCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  source?: string;
  raw_extraction?: {
    reason?: {
      full_english?: string;
      full_tamil?: string;
    };
    affected_areas_english?: string[];
  };
}

export interface LiveOutageResponse {
  success: boolean;
  count: number;
  data: LiveOutage[];
  cached?: boolean;
  lastFetched?: string;
}

const IDB_LIVE_OUTAGES_KEY = 'sg_live_chennai_outages_v1';

// Live endpoint with same-origin routing (proxied in dev via Vite, routed in prod via Firebase Hosting function rewrite)
const API_URL = '/api/v2/outages?district=Chennai';

/**
 * Fetch live outages in Chennai from outage.nammamap.in with Stale-While-Revalidate via IndexedDB
 */
export async function getLiveChennaiOutages(): Promise<LiveOutageResponse> {
  // 1. Try local cache first for instant offline/low-bandwidth resilience
  let cached: LiveOutageResponse | undefined;
  try {
    cached = await get<LiveOutageResponse>(IDB_LIVE_OUTAGES_KEY);
  } catch (err) {
    console.warn('[LiveOutageService] IndexedDB read failed:', err);
  }

  // 2. Fetch fresh telemetry in the background or immediately
  try {
    const res = await fetch(API_URL, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const json = await res.json();
      const payload: LiveOutageResponse = {
        success: true,
        count: json.count || (json.data ? json.data.length : 0),
        data: json.data || [],
        cached: false,
        lastFetched: new Date().toISOString()
      };

      // Persist in background
      set(IDB_LIVE_OUTAGES_KEY, payload).catch(err => {
        console.warn('[LiveOutageService] Failed to cache live outages in IDB:', err);
      });

      return payload;
    }
  } catch (err) {
    console.warn('[LiveOutageService] Network fetch failed, falling back to local IDB cache:', err);
  }

  // Fallback to cache if network failed
  if (cached && cached.data) {
    return {
      ...cached,
      cached: true
    };
  }

  return {
    success: false,
    count: 0,
    data: []
  };
}

/**
 * Normalizes text for lenient fuzzy keyword matching
 */
/**
 * Normalizes text for lenient fuzzy keyword matching and Chennai Tamil-English transliterations
 */
function clean(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/chindhatripet/g, 'chintadripet')
    .replace(/chinthadripet/g, 'chintadripet')
    .replace(/kodambakam/g, 'kodambakkam')
    .replace(/thiruvallikeni/g, 'triplicane')
    .replace(/thiruninravur/g, 'tiruninravur')
    .replace(/pulianthope/g, 'pulianthope')
    .replace(/[\d/]+kv/gi, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Correlates live outages with a specific substation
 */
export function getOutagesForSubstation(
  substation: TnebSubstation,
  allOutages: LiveOutage[]
): LiveOutage[] {
  if (!substation || !allOutages || allOutages.length === 0) return [];

  const ssName = clean(substation.name);
  const ssClean = clean(substation.cleanName);
  const ssCode = clean(substation.code);
  const feederNames = (substation.feeders || []).map(f => clean(f.name));

  return allOutages.filter(outage => {
    const oSub = clean(outage.substation);
    const oFdr = clean(outage.feeder);
    const oTown = clean(outage.town);

    // 1. If outage explicitly specifies a substation
    if (oSub) {
      if (
        ssName.includes(oSub) ||
        oSub.includes(ssName) ||
        (ssClean && (ssClean.includes(oSub) || oSub.includes(ssClean))) ||
        (ssCode && oSub === ssCode)
      ) {
        return true;
      }
      // Outage specified a different substation; prevent false-positive cross matching
      return false;
    }

    // 2. Outage without specific substation: match by feeder (min 4 chars)
    if (oFdr && oFdr.length >= 4 && feederNames.some(f => f.includes(oFdr) || oFdr.includes(f))) {
      return true;
    }

    // 3. Match by town or location matching substation locality (min 4 chars)
    if (oTown && oTown.length >= 4 && (ssName.includes(oTown) || oTown.includes(ssName) || (ssClean && ssClean.includes(oTown)))) {
      return true;
    }

    return false;
  });
}

/**
 * Correlates live outages with a specific Assistant Engineer (AE) Section Office
 */
export function getOutagesForSection(
  section: TnebSection,
  allOutages: LiveOutage[]
): LiveOutage[] {
  if (!section || !allOutages || allOutages.length === 0) return [];

  const secCode = section.code ? String(section.code) : '';
  const secName = clean(section.name.replace(/ae\/?o&m\/?/i, ''));
  const secClean = clean(section.cleanName);

  return allOutages.filter(outage => {
    // Direct sectionCode match
    if (outage.sectionCode && secCode && outage.sectionCode === secCode) {
      return true;
    }

    // Section name match
    if (outage.section) {
      const oSec = clean(outage.section.replace(/ae\/?o&m\/?/i, ''));
      if (oSec && (secName.includes(oSec) || oSec.includes(secName))) {
        return true;
      }
    }

    // Town / Area match
    if (outage.town) {
      const oTown = clean(outage.town);
      if (oTown.length >= 4 && (secName.includes(oTown) || oTown.includes(secName) || (secClean && secClean.includes(oTown)))) {
        return true;
      }
    }

    return false;
  });
}
