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
 * Precomputed Locality to Grid Asset Gazetteer derived from 1,170+ historical Chennai outages
 */
export const CHENNAI_LOCALITY_GAZETTEER: Record<string, { secCode?: string; ssCode?: string }> = {
  vepery: { secCode: '141', ssCode: '2235' },
  periamet: { secCode: '141', ssCode: '2235' },
  periamedu: { secCode: '141', ssCode: '2235' },
  sowcarpet: { ssCode: '2217' },
  kondithope: { ssCode: '2217', secCode: '108' },
  nazarethpet: { secCode: '304' }
};

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
    .replace(/\bpuliyanthopp?u\b/gi, 'pulianthope')
    .replace(/\btaramani\b/gi, 'tharamani')
    .replace(/\bgovernment\b/gi, 'govt')
    .replace(/\bthiru\s*v\s*ka\s*nagar\b/gi, 'tvk nagar')
    .replace(/\bneelangarai\b/gi, 'neelankarai')
    .replace(/\bmuthaialpet\b/gi, 'muthialpet')
    .replace(/\bputhupet\b/gi, 'pudupet')
    .replace(/\bpoombhukar\b/gi, 'poompuhar')
    .replace(/[-_\s]+iii\b/gi, ' 3')
    .replace(/[-_\s]+ii\b/gi, ' 2')
    .replace(/[-_\s]+i\b/gi, ' 1')
    .replace(/ae\/?o&m\/?/gi, ' ')
    .replace(/aee\/?o&m\/?/gi, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Squashes strings for whitespace-insensitive and punctuation-insensitive matching
 */
export function squash(str?: string | null): string {
  if (!str) return '';
  return clean(str).replace(/\s+/g, '');
}

/**
 * Correlates live outages with a specific substation
 */
export function getOutagesForSubstation(
  substation: TnebSubstation,
  allOutages: LiveOutage[]
): LiveOutage[] {
  if (!substation || !allOutages || allOutages.length === 0) return [];

  const ssSquash = squash(substation.name);
  const ssCleanSquash = squash(substation.cleanName);
  const ssCode = substation.code ? String(substation.code) : '';
  const feederSquashes = (substation.feeders || []).map(f => squash(f.name));

  return allOutages.filter(outage => {
    // If the outage has already been resolved to this specific substation
    if (outage.resolvedSubstationName && squash(outage.resolvedSubstationName) === ssSquash) {
      return true;
    }

    const oSub = squash(outage.substation);
    const oFdr = squash(outage.feeder);
    const oTown = squash(outage.town);
    const oSec = squash(outage.section);

    // Check locality gazetteer
    const locKey = Object.keys(CHENNAI_LOCALITY_GAZETTEER).find(k => oTown.includes(k) || oSec.includes(k) || oSub.includes(k));
    if (locKey && CHENNAI_LOCALITY_GAZETTEER[locKey].ssCode === ssCode) {
      return true;
    }

    // 1. If outage explicitly specifies a substation
    if (oSub && oSub.length >= 3) {
      if (
        ssSquash.includes(oSub) ||
        oSub.includes(ssSquash) ||
        (ssCleanSquash && (ssCleanSquash.includes(oSub) || oSub.includes(ssCleanSquash))) ||
        (ssCode && oSub === ssCode)
      ) {
        return true;
      }
      return false;
    }

    // 2. Outage without specific substation: match by feeder
    if (oFdr && oFdr.length >= 4) {
      if (ssSquash.length >= 4 && (oFdr.includes(ssSquash) || ssSquash.includes(oFdr))) return true;
      if (ssCleanSquash && ssCleanSquash.length >= 4 && (oFdr.includes(ssCleanSquash) || ssCleanSquash.includes(oFdr))) return true;

      if (feederSquashes.some(f => f.length >= 4 && (f.includes(oFdr) || oFdr.includes(f)))) {
        return true;
      }
    }

    // 3. Match by town or section matching a dedicated feeder or substation locality
    const area = oSec || oTown;
    if (area && area.length >= 4) {
      if (feederSquashes.some(f => f.length >= 4 && (f === area || f.includes(area)))) {
        return true;
      }
      if (ssSquash.includes(area) || area.includes(ssSquash) || (ssCleanSquash && ssCleanSquash.includes(area))) {
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
  const secSquash = squash(section.name);
  const secCleanSquash = squash(section.cleanName);

  return allOutages.filter(outage => {
    // If resolved to this section directly
    if (outage.resolvedSectionName && squash(outage.resolvedSectionName) === secSquash) {
      return true;
    }

    // Direct sectionCode match
    if (outage.sectionCode && secCode && outage.sectionCode === secCode) {
      return true;
    }

    const oSec = squash(outage.section);
    const oTown = squash(outage.town);

    // Check locality gazetteer
    const locKey = Object.keys(CHENNAI_LOCALITY_GAZETTEER).find(k => oTown.includes(k) || oSec.includes(k));
    if (locKey && CHENNAI_LOCALITY_GAZETTEER[locKey].secCode === secCode) {
      return true;
    }

    // Section name match (whitespace and hyphen insensitive)
    if (oSec && oSec.length >= 4) {
      if (secSquash.includes(oSec) || oSec.includes(secSquash) || (secCleanSquash && (secCleanSquash.includes(oSec) || oSec.includes(secCleanSquash)))) {
        return true;
      }
    }

    // Town / Area match
    if (oTown && oTown.length >= 4) {
      if (secSquash.includes(oTown) || oTown.includes(secSquash) || (secCleanSquash && (secCleanSquash.includes(oTown) || oTown.includes(secCleanSquash)))) {
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
    const oSub = squash(outage.substation);
    const oFdr = squash(outage.feeder);
    const oTown = squash(outage.town);
    const oSec = squash(outage.section);

    let matchedSS: TnebSubstation | undefined;
    let matchedSec: TnebSection | undefined;

    // Check precomputed gazetteer
    const locKey = Object.keys(CHENNAI_LOCALITY_GAZETTEER).find(k => oTown.includes(k) || oSec.includes(k) || oSub.includes(k));
    if (locKey) {
      const entry = CHENNAI_LOCALITY_GAZETTEER[locKey];
      if (entry.ssCode) matchedSS = substations.find(s => s.code === entry.ssCode);
      if (entry.secCode) matchedSec = sections.find(s => s.code === entry.secCode);
    }

    // 1. Direct Substation match
    if (!matchedSS && oSub && oSub.length >= 3) {
      matchedSS = substations.find(s => {
        const sName = squash(s.name);
        const sClean = squash(s.cleanName);
        return sName.includes(oSub) || oSub.includes(sName) || (sClean && (sClean.includes(oSub) || oSub.includes(sClean)));
      });
    }

    // 2. Feeder matches SS name or feeder in SS
    if (!matchedSS && oFdr && oFdr.length >= 4) {
      matchedSS = substations.find(s => {
        const sName = squash(s.name);
        const sClean = squash(s.cleanName);
        if (sName.length >= 4 && (oFdr.includes(sName) || sName.includes(oFdr))) return true;
        if (sClean && sClean.length >= 4 && (oFdr.includes(sClean) || sClean.includes(oFdr))) return true;
        return (s.feeders || []).some(f => {
          const fName = squash(f.name);
          return fName.length >= 4 && (fName.includes(oFdr) || oFdr.includes(fName));
        });
      });
    }

    // 3. Section match (whitespace and hyphen insensitive)
    if (!matchedSec) {
      const secTarget = oSec || oTown;
      if (secTarget && secTarget.length >= 4) {
        matchedSec = sections.find(s => {
          const sName = squash(s.name);
          const sClean = squash(s.cleanName);
          return sName.includes(secTarget) || secTarget.includes(sName) || (sClean && (sClean.includes(secTarget) || secTarget.includes(sClean)));
        });
      }
    }

    // 4. Area / Town matches Feeder in SS (e.g. Neelankarai feeder in Perungudi SS)
    if (!matchedSS) {
      const area = oSec || oTown;
      if (area && area.length >= 4) {
        matchedSS = substations.find(s => {
          return (s.feeders || []).some(f => {
            const fName = squash(f.name);
            return fName.length >= 4 && (fName === area || fName.includes(area));
          });
        });
      }
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
