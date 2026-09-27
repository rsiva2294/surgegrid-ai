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
    substation_english?: string;
    section_english?: string;
    feeder_english?: string;
    substation_tamil?: string;
    section_tamil?: string;
    feeder_tamil?: string;
    reason?: {
      full_english?: string;
      full_tamil?: string;
      short_english?: string;
      short_tamil?: string;
    };
    affected_areas_english?: string[];
    affected_areas_tamil?: string[];
    notice_category?: string;
    start_time?: string | null;
    end_time?: string | null;
    date?: string;
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
// Direct Cloud Storage CDN endpoints for raw notices (zero proxy, zero rate limits, sub-100ms)
const GCS_TWITTER_NOTICES_URL = 'https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/outages/twitter_notices_resolved.json';
const GCS_STATEWIDE_NOTICES_URL = 'https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/outages/statewide.json';
const API_URL = '/api/v2/outages';

/**
 * Fetch raw live notices in Chennai directly from GCS / Firestore feeds with Stale-While-Revalidate.
 * Strips any upstream resolution to guarantee 100% sovereign SurgeGrid grid topology mapping.
 */
export async function getLiveChennaiOutages(): Promise<LiveOutageResponse> {
  // 1. Try local cache first for instant offline/low-bandwidth resilience
  let cached: LiveOutageResponse | undefined;
  try {
    cached = await get<LiveOutageResponse>(IDB_LIVE_OUTAGES_KEY);
  } catch (err) {
    console.warn('[LiveOutageService] IndexedDB read failed:', err);
  }

  // 2. Fetch fresh raw telemetry directly from GCS
  try {
    let rawItems: LiveOutage[] = [];
    try {
      const [twRes, swRes] = await Promise.all([
        fetch(GCS_TWITTER_NOTICES_URL).then(r => (r.ok ? r.json() : [])),
        fetch(GCS_STATEWIDE_NOTICES_URL).then(r => (r.ok ? r.json() : []))
      ]);
      const twList = Array.isArray(twRes) ? twRes : [];
      const swList = Array.isArray(swRes) ? swRes : [];
      rawItems = [...twList, ...swList];
    } catch (gcsErr) {
      console.warn('[LiveOutageService] Direct GCS fetch failed, attempting API fallback:', gcsErr);
      const res = await fetch(API_URL, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        rawItems = json.data || [];
      }
    }

    if (rawItems.length > 0) {
      // Filter for Chennai metropolitan area
      const chennaiRaw = rawItems.filter(o => {
        const d = (o.district || '').toLowerCase();
        const c = (o.circle || '').toLowerCase();
        const t = (o.town || '').toLowerCase();
        const sub = (o.substation || '').toLowerCase();
        return d === 'chennai' || c.includes('chennai') || t.includes('chennai') || sub.includes('anna nagar') || sub.includes('chennai');
      });

      // Strip upstream resolution so SurgeGrid autonomously resolves physical assets from ground truth
      const autonomousOutages: LiveOutage[] = chennaiRaw.map(raw => {
        const ext = raw.raw_extraction || {};
        return {
          ...raw,
          // Strip upstream resolution and approximate coordinates
          latitude: null,
          longitude: null,
          resolvedSubstationName: undefined,
          resolvedSectionName: undefined,
          resolutionMethod: undefined,
          // Feed pristine raw extraction strings
          substation: ext.substation_english || raw.substation || '',
          section: ext.section_english || raw.section || raw.town || '',
          feeder: ext.feeder_english || raw.feeder || '',
          town: raw.town || ext.section_english || ''
        };
      });

      const payload: LiveOutageResponse = {
        success: true,
        count: autonomousOutages.length,
        data: autonomousOutages,
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
    console.warn('[LiveOutageService] Telemetry fetch failed, falling back to local IDB cache:', err);
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

export interface GoldRegistryEntry {
  ssName: string | null;
  ssCode: string | null;
  ssLat: number | null;
  ssLng: number | null;
  secName: string | null;
  secCode: string | null;
  secLat: number | null;
  secLng: number | null;
  verifiedAt: string;
}

export interface GoldRegistry {
  version: string;
  updatedAt: string;
  counts: {
    verifiedInstances: number;
    uniqueSignatures: number;
    gazetteerLocalities: number;
  };
  localities: Record<string, { secCode?: string; ssCode?: string; notes?: string }>;
  signatures: Record<string, GoldRegistryEntry>;
}

let cachedGoldRegistry: GoldRegistry | null = null;

/**
 * Loads the Gold Standard Outage Registry (1,100+ verified historical mappings)
 */
export async function getGoldRegistry(): Promise<GoldRegistry | null> {
  if (cachedGoldRegistry) return cachedGoldRegistry;
  try {
    const res = await fetch('/data/chennai_outage_gold_registry.json');
    if (res.ok) {
      cachedGoldRegistry = await res.json();
      return cachedGoldRegistry;
    }
  } catch (err) {
    console.warn('[liveOutageService] Failed to load gold registry:', err);
  }
  return null;
}

/**
 * Precomputed Locality to Grid Asset Gazetteer derived from 1,170+ historical Chennai outages
 */
export const CHENNAI_LOCALITY_GAZETTEER: Record<string, { secCode?: string; ssCode?: string }> = {
  vepery: { secCode: '141', ssCode: '2235' },
  periamet: { secCode: '141', ssCode: '2235' },
  periamedu: { secCode: '141', ssCode: '2235' },
  sowcarpet: { ssCode: '2217', secCode: '108' },
  kondithope: { ssCode: '2217', secCode: '108' },
  nazarethpet: { secCode: '304' },
  pudupet: { secCode: '138' },
  chintadripet: { secCode: '140' },
  triplicane: { secCode: '144', ssCode: '2228' },
  neelankarai: { secCode: '294', ssCode: '9417' }
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
 * Guarded token-level and boundary-aware matcher that prevents substring traps
 * (e.g. stops "madambakkam" from matching "adambakkam" or "paraniputhur" from matching "arani")
 */
export function matchesLocality(candidate?: string | null, target?: string | null): boolean {
  if (!candidate || !target) return false;
  const cClean = clean(candidate);
  const tClean = clean(target);
  if (!cClean || !tClean) return false;
  if (cClean === tClean) return true;

  const cSquash = cClean.replace(/\s+/g, '');
  const tSquash = tClean.replace(/\s+/g, '');
  if (cSquash === tSquash) return true;

  // Directional guard: East vs West, North vs South
  if ((cClean.includes('west') && tClean.includes('east')) || (cClean.includes('east') && tClean.includes('west'))) return false;
  if ((cClean.includes('north') && tClean.includes('south')) || (cClean.includes('south') && tClean.includes('north'))) return false;

  // Number / Phase guard: 1 vs 2 vs 3
  const numC = (cClean.match(/\b\d+\b/) || [])[0];
  const numT = (tClean.match(/\b\d+\b/) || [])[0];
  if (numC && numT && numC !== numT) return false;

  // Word token containment: every significant word of smaller must exist as complete standalone word in larger
  const cWords = cClean.split(' ').filter(w => w.length >= 3);
  const tWords = tClean.split(' ').filter(w => w.length >= 3);
  if (cWords.length === 0 || tWords.length === 0) return false;

  const tInC = tWords.every(tw => cWords.includes(tw));
  const cInT = cWords.every(cw => tWords.includes(cw));

  return tInC || cInT;
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
  const ssCode = substation.code ? String(substation.code) : '';
  const ssName = substation.name;
  const ssCleanName = substation.cleanName;

  return allOutages.filter(outage => {
    // If the outage has already been resolved to this specific substation
    if (outage.resolvedSubstationName && squash(outage.resolvedSubstationName) === ssSquash) {
      return true;
    }

    const oSub = outage.substation;
    const oFdr = outage.feeder;
    const oTown = outage.town;
    const oSec = outage.section;

    // Check locality gazetteer
    const fullLocText = squash(`${oTown} ${oSec} ${oSub}`);
    const locKey = Object.keys(CHENNAI_LOCALITY_GAZETTEER).find(k => fullLocText.includes(k));
    if (locKey && CHENNAI_LOCALITY_GAZETTEER[locKey].ssCode === ssCode) {
      return true;
    }

    // 1. Substation match with guarded token boundaries
    if (oSub && oSub.length >= 3) {
      if (matchesLocality(ssName, oSub) || (ssCleanName && matchesLocality(ssCleanName, oSub)) || (ssCode && squash(oSub) === ssCode)) {
        return true;
      }
      return false;
    }

    // 2. Feeder match with guarded token boundaries
    if (oFdr && oFdr.length >= 4) {
      if (matchesLocality(ssName, oFdr) || (ssCleanName && matchesLocality(ssCleanName, oFdr))) return true;

      if ((substation.feeders || []).some(f => matchesLocality(f.name, oFdr))) {
        return true;
      }
    }

    // 3. Match by town or section matching a dedicated feeder
    const area = oSec || oTown;
    if (area && area.length >= 4) {
      if ((substation.feeders || []).some(f => matchesLocality(f.name, area))) {
        return true;
      }
      if (matchesLocality(ssName, area) || (ssCleanName && matchesLocality(ssCleanName, area))) {
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
  const secName = section.name;
  const secCleanName = section.cleanName;

  return allOutages.filter(outage => {
    // If resolved to this section directly
    if (outage.resolvedSectionName && squash(outage.resolvedSectionName) === secSquash) {
      return true;
    }

    // Direct sectionCode match
    if (outage.sectionCode && secCode && outage.sectionCode === secCode) {
      return true;
    }

    const oSec = outage.section;
    const oTown = outage.town;
    const fullLocText = squash(`${oTown} ${oSec}`);

    // Check locality gazetteer
    const locKey = Object.keys(CHENNAI_LOCALITY_GAZETTEER).find(k => fullLocText.includes(k));
    if (locKey && CHENNAI_LOCALITY_GAZETTEER[locKey].secCode === secCode) {
      return true;
    }

    // Section name match with guarded token boundaries
    if (oSec && oSec.length >= 3) {
      if (matchesLocality(secName, oSec) || (secCleanName && matchesLocality(secCleanName, oSec))) {
        return true;
      }
    }

    // Town / Area match with guarded token boundaries
    if (oTown && oTown.length >= 3) {
      if (matchesLocality(secName, oTown) || (secCleanName && matchesLocality(secCleanName, oTown))) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Enriches raw outages with physical coordinates and verified TNEB grid entity references.
 * Executes:
 * - Tier 0: Gold Standard Registry (1,100+ verified historical signatures)
 * - Tier 1: Canonical Locality Gazetteer
 * - Tier 2: Guarded Substation & Section Token Resolution (stopping substring collisions)
 */
export function enrichLiveOutagesWithGrid(
  outages: LiveOutage[],
  substations: TnebSubstation[],
  sections: TnebSection[],
  goldRegistry?: GoldRegistry | null
): LiveOutage[] {
  if (!outages || outages.length === 0) return [];

  const registry = goldRegistry || cachedGoldRegistry;

  return outages.map(outage => {
    const oSub = squash(outage.substation);
    const oFdr = squash(outage.feeder);
    const oTown = squash(outage.town);
    const oSec = squash(outage.section);

    let matchedSS: TnebSubstation | undefined;
    let matchedSec: TnebSection | undefined;
    let resolutionMethod = outage.resolutionMethod;

    // 0. TIER 0: GOLD STANDARD SIGNATURE LOOKUP (100% verified historical ground truth)
    if (registry?.signatures) {
      const fullKey = `${oTown}|${oSec}|${oSub}|${oFdr}`;
      const townSecKey = `${oTown}|${oSec}`;
      const subFdrKey = `${oSub}|${oFdr}`;

      const goldHit = registry.signatures[fullKey] ||
                      (oTown && oSec ? registry.signatures[townSecKey] : undefined) ||
                      (oSub && oFdr ? registry.signatures[subFdrKey] : undefined);

      if (goldHit) {
        if (goldHit.ssCode) matchedSS = substations.find(s => s.code === goldHit.ssCode);
        if (goldHit.secCode) matchedSec = sections.find(s => s.code === goldHit.secCode);
        if (matchedSS || matchedSec) {
          resolutionMethod = 'gold_registry_verified';
        }
      }
    }

    // 1. TIER 1: CANONICAL LOCALITY GAZETTEER
    if (!matchedSS || !matchedSec) {
      const fullLocText = squash(`${oTown} ${oSec} ${oSub}`);
      const locMap = registry?.localities || CHENNAI_LOCALITY_GAZETTEER;
      const locKey = Object.keys(locMap).find(k => fullLocText.includes(k));
      if (locKey) {
        const entry = locMap[locKey];
        if (!matchedSS && entry.ssCode) matchedSS = substations.find(s => s.code === entry.ssCode);
        if (!matchedSec && entry.secCode) matchedSec = sections.find(s => s.code === entry.secCode);
        if (matchedSS || matchedSec) {
          resolutionMethod = resolutionMethod || 'locality_gazetteer';
        }
      }
    }

    // 2. TIER 2: GUARDED SUBSTATION MATCH
    if (!matchedSS && outage.substation && outage.substation.length >= 3) {
      const candidates = substations.filter(s =>
        matchesLocality(s.name, outage.substation) ||
        (s.cleanName && matchesLocality(s.cleanName, outage.substation))
      );

      if (candidates.length === 1) {
        matchedSS = candidates[0];
      } else if (candidates.length > 1) {
        // Disambiguate duplicate substation names (e.g. Gandhi Nagar SS in Adyar vs North Chennai)
        const targetArea = (outage.town || outage.section || '').toLowerCase();
        if (targetArea.includes('adyar')) {
          matchedSS = candidates.find(s => (s.circle || '').toLowerCase().includes('south')) || candidates[0];
        } else {
          matchedSS = candidates[0];
        }
      }

      if (matchedSS) {
        resolutionMethod = resolutionMethod || 'guarded_substation_match';
      }
    }

    // 3. TIER 3: GUARDED SECTION MATCH
    if (!matchedSec) {
      const secTarget = outage.section || outage.town;
      if (secTarget && secTarget.length >= 3) {
        matchedSec = sections.find(s =>
          matchesLocality(s.name, secTarget) ||
          (s.cleanName && matchesLocality(s.cleanName, secTarget))
        );
        if (matchedSec) {
          resolutionMethod = resolutionMethod || 'guarded_section_match';
        }
      }
    }

    // 4. TIER 4: GUARDED SPECIFIC FEEDER MATCH
    if (!matchedSS && outage.feeder && outage.feeder.length >= 5) {
      const fdrClean = clean(outage.feeder);
      const isGeneric = ['local', 'bypass', 'bye pass', 'housing board', 'main road', 'bazaar'].some(g => fdrClean === g);
      if (!isGeneric) {
        matchedSS = substations.find(s => {
          return (s.feeders || []).some(f => matchesLocality(f.name, outage.feeder));
        });
        if (matchedSS) {
          resolutionMethod = resolutionMethod || 'guarded_feeder_match';
        }
      }
    }

    // Derive physical coordinates: prioritize section office for LT faults, or substation
    const isLtFault = outage.workType?.toLowerCase().includes('lt') ||
                      outage.raw_extraction?.reason?.full_english?.toLowerCase().includes('lt');
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
      resolutionMethod: (matchedSS || matchedSec) ? (resolutionMethod || 'grid_consensus_mapped') : outage.resolutionMethod
    };
  });
}
