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
  confidence?: number;
  resolutionMethod?: string;
  resolvedSubstationName?: string;
  resolvedSectionName?: string;
  raw_extraction?: {
    reason?: {
      full_english?: string;
      full_tamil?: string;
      short_english?: string;
      short_tamil?: string;
    };
    affected_areas_english?: string[];
    notice_category?: string;
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
 * Normalizes text for lenient fuzzy keyword matching and Chennai Tamil-English transliterations
 */
export function clean(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\d/]+\s*kv\b/gi, ' ')
    .replace(/\bss\b/gi, ' ')
    .replace(/\bfeeder\b/gi, ' ')
    .replace(/\bg\.?t\.?\b/gi, 'george town')
    .replace(/\bmudd?li\b/gi, 'mudaly')
    .replace(/\bmudali\b/gi, 'mudaly')
    .replace(/\bstatdium\b/gi, 'stadium')
    .replace(/\bchindhatripet\b/gi, 'chintadripet')
    .replace(/\bchinthadripet\b/gi, 'chintadripet')
    .replace(/\bkodambakam\b/gi, 'kodambakkam')
    .replace(/\bthiruvallikeni\b/gi, 'triplicane')
    .replace(/\bthiruninravur\b/gi, 'tiruninravur')
    .replace(/\bpulianthope\b/gi, 'pulianthope')
    .replace(/\bneelangarai\b/gi, 'neelankarai')
    .replace(/ae\/?o&m\/?/gi, ' ')
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
    // If the outage has already been resolved to this specific substation
    if (outage.resolvedSubstationName && clean(outage.resolvedSubstationName) === ssName) {
      return true;
    }

    const oSub = clean(outage.substation);
    const oFdr = clean(outage.feeder);
    const oTown = clean(outage.town);
    const oSec = clean(outage.section);

    // 1. If outage explicitly specifies a substation
    if (oSub && oSub.length >= 3) {
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

    // 2. Outage without specific substation: match by feeder
    if (oFdr && oFdr.length >= 4) {
      // Check if feeder name references this substation
      if (ssName.length >= 4 && (oFdr.includes(ssName) || ssName.includes(oFdr))) return true;
      if (ssClean && ssClean.length >= 4 && (oFdr.includes(ssClean) || ssClean.includes(oFdr))) return true;

      // Check if any feeder under this substation matches
      if (feederNames.some(f => f.length >= 4 && (f.includes(oFdr) || oFdr.includes(f)))) {
        return true;
      }
    }

    // 3. Match by town or section matching a dedicated feeder or substation locality
    const area = oSec || oTown;
    if (area && area.length >= 4) {
      // Direct feeder match (e.g. Neelankarai feeder in Perungudi SS)
      if (feederNames.some(f => f.length >= 4 && (f === area || f.includes(area)))) {
        return true;
      }
      // Substation locality match
      if (ssName.includes(area) || area.includes(ssName) || (ssClean && ssClean.includes(area))) {
        return true;
      }
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
  const secName = clean(section.name);
  const secClean = clean(section.cleanName);

  return allOutages.filter(outage => {
    // If resolved to this section directly
    if (outage.resolvedSectionName && clean(outage.resolvedSectionName) === secName) {
      return true;
    }

    // Direct sectionCode match
    if (outage.sectionCode && secCode && outage.sectionCode === secCode) {
      return true;
    }

    // Section name match
    if (outage.section) {
      const oSec = clean(outage.section);
      if (oSec && (secName.includes(oSec) || oSec.includes(secName) || (secClean && (secClean.includes(oSec) || oSec.includes(secClean))))) {
        return true;
      }
    }

    // Town / Area match
    if (outage.town) {
      const oTown = clean(outage.town);
      if (oTown.length >= 4 && (secName.includes(oTown) || oTown.includes(secName) || (secClean && (secClean.includes(oTown) || oTown.includes(secClean))))) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Enriches raw outages with physical coordinates and verified TNEB grid entity references
 */
export function enrichLiveOutagesWithGrid(
  outages: LiveOutage[],
  substations: TnebSubstation[],
  sections: TnebSection[]
): LiveOutage[] {
  if (!outages || outages.length === 0) return [];

  return outages.map(outage => {
    const oSub = clean(outage.substation);
    const oFdr = clean(outage.feeder);
    const oTown = clean(outage.town);
    const oSec = clean(outage.section);

    let matchedSS: TnebSubstation | undefined;
    let matchedSec: TnebSection | undefined;

    // 1. Direct Substation match
    if (oSub && oSub.length >= 3) {
      matchedSS = substations.find(s => {
        const ssName = clean(s.name);
        const ssClean = clean(s.cleanName);
        return ssName.includes(oSub) || oSub.includes(ssName) || (ssClean && (ssClean.includes(oSub) || oSub.includes(ssClean)));
      });
    }

    // 2. Feeder matches SS name or feeder in SS
    if (!matchedSS && oFdr && oFdr.length >= 4) {
      matchedSS = substations.find(s => {
        const ssName = clean(s.name);
        const ssClean = clean(s.cleanName);
        if (ssName.length >= 4 && (oFdr.includes(ssName) || ssName.includes(oFdr))) return true;
        if (ssClean && ssClean.length >= 4 && (oFdr.includes(ssClean) || ssClean.includes(oFdr))) return true;
        return (s.feeders || []).some(f => {
          const fName = clean(f.name);
          return fName.length >= 4 && (fName.includes(oFdr) || oFdr.includes(fName));
        });
      });
    }

    // 3. Section match
    const secTarget = oSec || oTown;
    if (secTarget && secTarget.length >= 4) {
      matchedSec = sections.find(s => {
        const sName = clean(s.name);
        const sClean = clean(s.cleanName);
        return sName.includes(secTarget) || secTarget.includes(sName) || (sClean && (sClean.includes(secTarget) || secTarget.includes(sClean)));
      });
    }

    // 4. Area / Town matches Feeder in SS (e.g. Neelankarai feeder in Perungudi SS)
    if (!matchedSS && secTarget && secTarget.length >= 4) {
      matchedSS = substations.find(s => {
        return (s.feeders || []).some(f => {
          const fName = clean(f.name);
          return fName.length >= 4 && (fName === secTarget || fName.includes(secTarget));
        });
      });
    }

    // Derive coordinates: prioritize section office coords for LT distribution faults, or substation coords
    const isLtFault = outage.workType?.toLowerCase().includes('lt') || outage.raw_extraction?.reason?.full_english?.toLowerCase().includes('lt');
    let lat = outage.latitude;
    let lng = outage.longitude;

    if (lat == null || lng == null) {
      if (isLtFault && matchedSec?.lat != null && matchedSec?.lng != null) {
        lat = matchedSec.lat;
        lng = matchedSec.lng;
      } else if (matchedSS?.lat != null && matchedSS?.lng != null) {
        lat = matchedSS.lat;
        lng = matchedSS.lng;
      } else if (matchedSec?.lat != null && matchedSec?.lng != null) {
        lat = matchedSec.lat;
        lng = matchedSec.lng;
      }
    }

    return {
      ...outage,
      latitude: lat ?? null,
      longitude: lng ?? null,
      substation: outage.substation || matchedSS?.name || '',
      section: outage.section || matchedSec?.name || '',
      sectionCode: outage.sectionCode || (matchedSec?.code ? String(matchedSec.code) : undefined),
      resolvedSubstationName: matchedSS?.name,
      resolvedSectionName: matchedSec?.name,
      resolutionMethod: (matchedSS || matchedSec) ? 'grid_consensus_mapped' : outage.resolutionMethod
    };
  });
}
