import { get, set } from 'idb-keyval';
import type { TnebSubstation, TnebSection } from '../types/tneb';

export interface LiveOutage {
  id?: string;
  fingerprint?: string;
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
  resolvedSubstationCode?: string;
  resolvedSectionName?: string;
  resolvedSectionCode?: string;
  mappingStatus?: 'VERIFIED_ASSET' | 'LOCALIZED_AREA' | 'UNMAPPED_ADVISORY';
  upstreamLatitude?: number | null;
  upstreamLongitude?: number | null;
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

// Bounding box for Greater Chennai Metropolitan Grid
export const CHENNAI_BBOX = {
  minLat: 12.70,
  maxLat: 13.40,
  minLng: 79.90,
  maxLng: 80.40
};

export function isInsideChennaiBbox(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;
  return lat >= CHENNAI_BBOX.minLat && lat <= CHENNAI_BBOX.maxLat &&
         lng >= CHENNAI_BBOX.minLng && lng <= CHENNAI_BBOX.maxLng;
}

export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PRIMARY_API_URL = 'https://outage.nammamap.in/api/v2/outages';
const RELATIVE_API_URL = '/api/v2/outages';

/**
 * Fetch raw live notices in Chennai directly from the CDN-cached REST API with Stale-While-Revalidate.
 * Stores raw entities and upstream hints, preparing them for SurgeGrid's Sovereign Resolution Gate.
 */
export async function getLiveChennaiOutages(): Promise<LiveOutageResponse> {
  // 1. Try local cache first for instant offline/low-bandwidth resilience
  let cached: LiveOutageResponse | undefined;
  try {
    cached = await get<LiveOutageResponse>(IDB_LIVE_OUTAGES_KEY);
  } catch (err) {
    console.warn('[LiveOutageService] IndexedDB read failed:', err);
  }

  // 2. Fetch fresh raw telemetry directly from REST API (CDN edge-cached, zero Firestore quota)
  try {
    let rawItems: any[] = [];
    const endpoints = [
      // If dev, prefer Vite proxy to avoid localhost CORS nuances; in prod, direct apex CDN
      import.meta.env.DEV ? RELATIVE_API_URL : PRIMARY_API_URL,
      PRIMARY_API_URL,
      RELATIVE_API_URL
    ];
    const uniqueEndpoints = Array.from(new Set(endpoints));

    for (const url of uniqueEndpoints) {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data)) {
            rawItems = json.data;
            break;
          }
        }
      } catch (err) {
        console.warn(`[LiveOutageService] Failed to fetch from ${url}:`, err);
      }
    }

    if (rawItems.length > 0) {
      // Deduplicate raw notices by fingerprint before processing
      const seenFingerprints = new Set<string>();
      const dedupedRawItems = rawItems.filter(o => {
        const fp = o.outageFingerprint || o.fingerprint || o.id || `${o.substation}_${o.feeder}_${o.date}_${o.fromTime}`;
        if (seenFingerprints.has(fp)) return false;
        seenFingerprints.add(fp);
        return true;
      });

      // Gate 1: Geographic & Circle Guardrail for Greater Chennai
      const chennaiRaw = dedupedRawItems.filter(o => {
        const d = (o.district || '').toLowerCase();
        const c = (o.circle || '').toLowerCase();
        const t = (o.town || '').toLowerCase();
        const sub = (o.substation || '').toLowerCase();
        const sec = (o.section || '').toLowerCase();
        const areas = (o.raw_extraction?.affected_areas_english || []).join(' ').toLowerCase();

        // 1. Upstream coordinate check within Chennai metropolitan bbox
        if (isInsideChennaiBbox(o.latitude, o.longitude)) return true;

        // 2. District & Circle Administrative check
        if (d.includes('chennai') || c.includes('chennai')) return true;
        if (d.includes('kanchipuram') || c.includes('kanchipuram')) return true;
        if (d.includes('chengalpattu') || c.includes('chengalpattu')) return true;
        if (d.includes('tiruvallur') || c.includes('tiruvallur') || d.includes('thiruvallur')) return true;

        // 3. Known Chennai urban core and suburban localities
        const CHENNAI_KEYWORDS = [
          'anna nagar', 'adyar', 'mylapore', 't.nagar', 'tnagar', 'guindy', 'velachery',
          'tambaram', 'chromepet', 'porur', 'ambattur', 'avadi', 'madhavaram', 'royapuram',
          'perambur', 'kilpauk', 'egmore', 'triplicane', 'saidapet', 'thiruvanmiyur',
          'sholinganallur', 'pallavaram', 'medavakkam', 'alandur', 'ennore', 'ennoor',
          'tondiarpet', 'kolathur', 'kodambakkam', 'vadapalani', 'nungambakkam', 'teynampet'
        ];
        return CHENNAI_KEYWORDS.some(k => 
          t.includes(k) || sub.includes(k) || sec.includes(k) || areas.includes(k)
        );
      });

      // Prepare raw extraction and preserve upstream coordinates as hints
      const autonomousOutages: LiveOutage[] = chennaiRaw.map(raw => {
        const ext = raw.raw_extraction || {};
        return {
          ...raw,
          // Preserve upstream suggestion as reference hints
          upstreamLatitude: raw.latitude ?? null,
          upstreamLongitude: raw.longitude ?? null,
          // Strip raw lat/lng so SurgeGrid's sovereign gate is the authoritative mapper
          latitude: null,
          longitude: null,
          resolvedSubstationName: undefined,
          resolvedSubstationCode: undefined,
          resolvedSectionName: undefined,
          resolvedSectionCode: undefined,
          resolutionMethod: undefined,
          mappingStatus: undefined,
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

const CLOUD_GOLD_REGISTRY_URL = 'https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/registry/chennai_outage_gold_registry.json';

/**
 * Loads the Gold Standard Outage Registry (2,770+ verified historical mappings)
 * Fetches the live, self-enriching registry from Cloud Storage with local bundled fallback.
 */
export async function getGoldRegistry(): Promise<GoldRegistry | null> {
  if (cachedGoldRegistry) return cachedGoldRegistry;
  
  // 1. Try Cloud-hosted self-enriching registry
  try {
    const res = await fetch(CLOUD_GOLD_REGISTRY_URL);
    if (res.ok) {
      cachedGoldRegistry = await res.json();
      console.log(`[liveOutageService] Loaded Cloud Gold Registry v${cachedGoldRegistry?.version} (${cachedGoldRegistry?.counts?.uniqueSignatures} signatures)`);
      return cachedGoldRegistry;
    }
  } catch (cloudErr) {
    console.warn('[liveOutageService] Cloud registry fetch failed, falling back to local bundle:', cloudErr);
  }

  // 2. Fallback to local bundled registry
  try {
    const res = await fetch('/data/chennai_outage_gold_registry.json');
    if (res.ok) {
      cachedGoldRegistry = await res.json();
      return cachedGoldRegistry;
    }
  } catch (err) {
    console.warn('[liveOutageService] Failed to load local gold registry:', err);
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

const GENERIC_LOCALITY_TOKENS = new Set([
  'nagar', 'north', 'south', 'east', 'west', 'central', 'road', 'street',
  'lane', 'bazaar', 'colony', 'town', 'village', 'junction', 'high', 'main',
  'extn', 'extension', 'phase', 'stage', 'block', 'sector', 'old', 'new', 'area'
]);

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

  // Generic token trap: if one side is purely composed of generic words (e.g. "nagar", "north", "main road"),
  // do not match via subset containment to prevent single notices matching dozens of entities
  const isPurelyGeneric = (words: string[]) => words.every(w => GENERIC_LOCALITY_TOKENS.has(w));
  if (isPurelyGeneric(cWords) || isPurelyGeneric(tWords)) {
    return false;
  }

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
    // 0. Authoritative Resolution Guard:
    // If the outage has been enriched with an authoritative substation binding, strictly match it!
    if (outage.resolvedSubstationCode) {
      return String(outage.resolvedSubstationCode) === ssCode;
    }
    if (outage.resolvedSubstationName) {
      return squash(outage.resolvedSubstationName) === ssSquash;
    }
    // If outage was explicitly resolved to a section office only (localized area) or is an unmapped advisory,
    // do not bleed into unrelated substations!
    if (outage.resolvedSectionCode || outage.mappingStatus === 'LOCALIZED_AREA' || outage.mappingStatus === 'UNMAPPED_ADVISORY') {
      return false;
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
    // 0. Authoritative Resolution Guard:
    // If the outage has been enriched with an authoritative section binding, strictly match it!
    if (outage.resolvedSectionCode) {
      return String(outage.resolvedSectionCode) === secCode;
    }
    if (outage.resolvedSectionName) {
      return squash(outage.resolvedSectionName) === secSquash;
    }
    // If outage was explicitly resolved to a Substation only or is an unmapped advisory,
    // do not bleed into arbitrary sections!
    if (outage.resolvedSubstationCode || outage.mappingStatus === 'UNMAPPED_ADVISORY') {
      return false;
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
 * Sovereign Resolution & Mapping Gate
 * Enriches raw outages with physical coordinates and verified TNEB grid entity references.
 * Executes:
 * - Tier 0: Gold Standard Registry (1,100+ verified historical signatures)
 * - Tier 1: Canonical Locality Gazetteer
 * - Tier 2: Guarded Substation Token Resolution (against 286 authentic switchyards)
 * - Tier 3: Guarded Section Token Resolution (against authentic AE Section Offices)
 * - Tier 4: Guarded Feeder Token Resolution
 * - Tier 5: Upstream Coordinate Sanity Check (strict Chennai bbox + nearest substation snap <= 2.5km)
 * Assigns mappingStatus: VERIFIED_ASSET | LOCALIZED_AREA | UNMAPPED_ADVISORY
 */
export function enrichLiveOutagesWithGrid(
  outages: LiveOutage[],
  substations: TnebSubstation[],
  sections: TnebSection[],
  goldRegistry?: GoldRegistry | null
): LiveOutage[] {
  if (!outages || outages.length === 0) return [];

  const registry = goldRegistry || cachedGoldRegistry;

  return outages.map((outage, idx) => {
    const oSub = squash(outage.substation);
    const oFdr = squash(outage.feeder);
    const oTown = squash(outage.town);
    const oSec = squash(outage.section);

    let matchedSS: TnebSubstation | undefined;
    let matchedSec: TnebSection | undefined;
    let resolutionMethod = outage.resolutionMethod;
    let confidence = outage.confidence || 0;

    // 0. TIER 0: GOLD STANDARD SIGNATURE LOOKUP (100% verified historical ground truth)
    if (registry?.signatures) {
      const fullKey = `${oTown}|${oSec}|${oSub}|${oFdr}`;
      const townSecKey = `${oTown}|${oSec}`;
      const subFdrKey = `${oSub}|${oFdr}`;

      const goldHit = registry.signatures[fullKey] ||
                      (oTown && oSec ? registry.signatures[townSecKey] : undefined) ||
                      (oSub && oFdr ? registry.signatures[subFdrKey] : undefined);

      if (goldHit) {
        if (goldHit.ssCode) matchedSS = substations.find(s => String(s.code) === String(goldHit.ssCode));
        if (goldHit.secCode) matchedSec = sections.find(s => String(s.code) === String(goldHit.secCode));
        if (matchedSS || matchedSec) {
          resolutionMethod = 'gold_registry_verified';
          confidence = 1.0;
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
        if (!matchedSS && entry.ssCode) matchedSS = substations.find(s => String(s.code) === String(entry.ssCode));
        if (!matchedSec && entry.secCode) matchedSec = sections.find(s => String(s.code) === String(entry.secCode));
        if (matchedSS || matchedSec) {
          resolutionMethod = resolutionMethod || 'locality_gazetteer';
          confidence = Math.max(confidence, 0.9);
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
        // Disambiguate duplicate substation names and multi-voltage collocated substations
        const fullNoticeText = `${outage.substation || ''} ${outage.feeder || ''} ${outage.workType || ''} ${outage.town || ''} ${outage.location || ''}`.toLowerCase();

        // 1. Explicit voltage cues in notice (400kV, 230kV, 110kV, 33kV)
        let bestCandidate = candidates.find(s => {
          const v = (s.voltage || '').toLowerCase();
          if (v.includes('400') && fullNoticeText.includes('400')) return true;
          if (v.includes('230') && fullNoticeText.includes('230')) return true;
          if (v.includes('110') && fullNoticeText.includes('110')) return true;
          if (v.includes('33') && (fullNoticeText.includes('33kv') || fullNoticeText.includes('33 kv'))) return true;
          return false;
        });

        // 2. Feeder match: check if one candidate substation owns this specific feeder
        if (!bestCandidate && outage.feeder) {
          bestCandidate = candidates.find(s =>
            (s.feeders || []).some(f => matchesLocality(f.name, outage.feeder))
          );
        }

        // 3. Geographic / Circle disambiguation (e.g. Gandhi Nagar SS in South vs North)
        if (!bestCandidate) {
          const targetArea = (outage.town || outage.section || outage.circle || '').toLowerCase();
          if (targetArea.includes('adyar') || targetArea.includes('south')) {
            bestCandidate = candidates.find(s => (s.circle || '').toLowerCase().includes('south'));
          } else if (targetArea.includes('north')) {
            bestCandidate = candidates.find(s => (s.circle || '').toLowerCase().includes('north'));
          }
        }

        // 4. Default hierarchy for urban distribution maintenance:
        // Routine maintenance/feeder work affects distribution step-downs (33/11 or 110/33), not 400kV bulk transmission nodes
        if (!bestCandidate) {
          bestCandidate = candidates.find(s => s.tier === 'distribution') ||
                          candidates.find(s => s.tier === 'subtransmission') ||
                          candidates[0];
        }

        matchedSS = bestCandidate || candidates[0];
      }

      if (matchedSS) {
        resolutionMethod = resolutionMethod || 'guarded_substation_match';
        confidence = Math.max(confidence, 0.85);
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
          confidence = Math.max(confidence, 0.8);
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
          confidence = Math.max(confidence, 0.8);
        }
      }
    }

    // 5. TIER 5: UPSTREAM COORDINATE SANITY CHECK & SPATIAL SNAP GATE
    const upLat = outage.upstreamLatitude ?? outage.latitude;
    const upLng = outage.upstreamLongitude ?? outage.longitude;
    let validatedUpstreamCoords: { lat: number; lng: number } | null = null;

    if (upLat != null && upLng != null && isInsideChennaiBbox(upLat, upLng)) {
      validatedUpstreamCoords = { lat: upLat, lng: upLng };

      // If text matching failed to find a physical substation, test nearest substation proximity
      if (!matchedSS) {
        let nearestSS: TnebSubstation | undefined;
        let minDistanceM = Infinity;

        for (const ss of substations) {
          if (ss.lat != null && ss.lng != null) {
            const dist = getDistanceMeters(upLat, upLng, ss.lat, ss.lng);
            if (dist < minDistanceM) {
              minDistanceM = dist;
              nearestSS = ss;
            }
          }
        }

        // Snap to substation if within 2.5 km
        if (nearestSS && minDistanceM <= 2500) {
          matchedSS = nearestSS;
          resolutionMethod = resolutionMethod || 'upstream_spatial_nearest_snap';
          confidence = Math.max(confidence, 0.75);
        }
      }
    }

    // Derive physical coordinates: prioritize substation or section office
    const isLtFault = outage.workType?.toLowerCase().includes('lt') ||
                      outage.raw_extraction?.reason?.full_english?.toLowerCase().includes('lt');
    let lat: number | null = null;
    let lng: number | null = null;

    if (isLtFault && matchedSec?.lat != null && matchedSec?.lng != null) {
      lat = matchedSec.lat;
      lng = matchedSec.lng;
    } else if (matchedSS?.lat != null && matchedSS?.lng != null) {
      lat = matchedSS.lat;
      lng = matchedSS.lng;
    } else if (matchedSec?.lat != null && matchedSec?.lng != null) {
      lat = matchedSec.lat;
      lng = matchedSec.lng;
    } else if (validatedUpstreamCoords) {
      lat = validatedUpstreamCoords.lat;
      lng = validatedUpstreamCoords.lng;
      resolutionMethod = resolutionMethod || 'upstream_spatial_area_validated';
      confidence = Math.max(confidence, 0.6);
    }

    // Classification & Tagging
    let mappingStatus: 'VERIFIED_ASSET' | 'LOCALIZED_AREA' | 'UNMAPPED_ADVISORY';
    if (matchedSS) {
      mappingStatus = 'VERIFIED_ASSET';
    } else if (matchedSec || (lat != null && lng != null)) {
      mappingStatus = 'LOCALIZED_AREA';
    } else {
      mappingStatus = 'UNMAPPED_ADVISORY';
      resolutionMethod = resolutionMethod || 'unmapped_advisory_notice';
    }

    return {
      ...outage,
      latitude: lat,
      longitude: lng,
      substation: outage.substation || matchedSS?.name || '',
      section: outage.section || matchedSec?.name || '',
      sectionCode: outage.sectionCode || (matchedSec?.code ? String(matchedSec.code) : undefined),
      outageFingerprint: (outage.outageFingerprint || outage.fingerprint || outage.id) ? `${outage.outageFingerprint || outage.fingerprint || outage.id}-${idx}` : `outage-${idx}`,
      resolvedSubstationName: matchedSS?.name,
      resolvedSubstationCode: matchedSS?.code ? String(matchedSS.code) : undefined,
      resolvedSectionName: matchedSec?.name,
      resolvedSectionCode: matchedSec?.code ? String(matchedSec.code) : undefined,
      resolutionMethod: (matchedSS || matchedSec) ? (resolutionMethod || 'grid_consensus_mapped') : (resolutionMethod || 'unmapped_advisory_notice'),
      confidence,
      mappingStatus
    };
  });
}
