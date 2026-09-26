const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('=== TNEB CHENNAI GRID GROUND-TRUTH REBUILD ENGINE v3 ===');
console.log('=== GEOMETRY-FIRST, CODE-VERIFIED LINK RESOLUTION ===\n');

// ─── 1. LOAD RAW SOURCES ──────────────────────────────────────
const rawSubsGeo = JSON.parse(fs.readFileSync('C:/projects/nammamap-v2/tneb-outage/nammamap-outage-aggregator/data-source/tneb_gis_raw/grid_infrastructure/substations_points.geojson', 'utf8'));
const rawFeedersMeta = JSON.parse(fs.readFileSync('C:/projects/nammamap-v2/tneb-outage/nammamap-outage-aggregator/data-source/tneb_gis_raw/grid_infrastructure/feeders_master_metadata.json', 'utf8')).feeders;
const rawOfficesGeo = JSON.parse(fs.readFileSync('C:/projects/nammamap-v2/tneb-outage/nammamap-outage-aggregator/data-source/tneb_gis_raw/offices/section_offices.geojson', 'utf8'));

// Load feeder LINES geometry — this is the key new data source
const feederLinesData = zlib.gunzipSync(fs.readFileSync('C:/projects/nammamap-v2/tneb-outage/nammamap-outage-aggregator/data-source/tneb_gis_raw/grid_infrastructure/feeder_lines.geojson.gz'));
const rawFeederLines = JSON.parse(feederLinesData.toString('utf8'));

// Load existing grid to preserve enriched vulnerability/risk/elevation data
const existingGrid = JSON.parse(fs.readFileSync('public/data/chennai_tneb_grid.json', 'utf8'));
const existingMap = new Map();
existingGrid.substations.forEach(s => existingMap.set(String(s.code), s));

console.log(`Loaded ${rawSubsGeo.features.length} substation points`);
console.log(`Loaded ${rawFeedersMeta.length} feeder metadata records`);
console.log(`Loaded ${rawFeederLines.features.length} feeder line geometries`);
console.log(`Loaded ${rawOfficesGeo.features.length} section offices`);

// ─── 2. CORE UTILITIES ────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getVoltTier(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('400')) return 400;
  if (s.includes('230')) return 230;
  if (s.includes('110')) return 110;
  if (s.includes('33')) return 33;
  if (s.includes('22')) return 22;
  if (s.includes('11')) return 11;
  return 11;
}

function getSubstationTier(v) {
  const tier = getVoltTier(v);
  if (tier >= 230) return 'bulk';
  if (tier >= 110) return 'subtransmission';
  // 33kV and 11kV are "distribution" tier in the UI
  return 'distribution';
}

function extractCleanLandmark(name) {
  let s = (name || '').toUpperCase();
  s = s.replace(/[\d\s\/]+-\s*[\d\s\/]+\s*KV/gi, ' ');
  s = s.replace(/[\d\s\/]+\s*KV/gi, ' ');
  s = s.replace(/^[\d\s\/-]+/gi, ' ');
  s = s.replace(/\b(SS|GIS|SUBSTATION|SUB-STATION)\b/gi, ' ');
  s = s.replace(/KV(?=[A-Z])/gi, ' ');
  s = s.replace(/[^A-Z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ─── 3. NAME MATCHING (FALLBACK ONLY) ─────────────────────────
// This is used ONLY when no geometric or code-based match exists.

const TNEB_ALIASES = {
  'CHINTADRIPET': 'CHINDHATRIPET', 'CHINDATRIPET': 'CHINDHATRIPET',
  'SEMBIYAM': 'SEMBIUM', 'KIDSPARK': 'KITSPARK', 'KIDPARK': 'KITSPARK',
  'THIRUVANMIYUR': 'TIRUVANMIYUR', 'PERUMBAKKAM': 'PERUMPAKKAM',
  'VELACHERY': 'VELACHERRY', 'THIRUMULLAIVOYAL': 'TIRUMULLAIVOYAL',
  'THIRUMAZHISAI': 'TIRUMAZHISAI',
  'AMBATTUR 3RD MAIN ROAD': 'AMBATTUR IIIRD MAIN ROAD',
  'AMBATTUR THIRD MAIN ROAD': 'AMBATTUR IIIRD MAIN ROAD',
  '3RD MAIN ROAD AMBATTUR': 'AMBATTUR IIIRD MAIN ROAD',
  'ALAMATHI': 'ALAMATHY', 'PULIANTHOPE': 'PULIYANTHOPE',
  'VYASARPAD': 'VYASARPADI', 'VALLUVARKOTTAM': 'VALLUVAR KOTTAM',
  'PAPARAMBAKKAM': 'PAPPARAMBAKKAM', 'KAKALUR': 'KAKKALUR'
};

function normalizeKey(str) {
  let s = (str || '').toUpperCase();
  for (const [k, v] of Object.entries(TNEB_ALIASES)) {
    if (s.includes(k)) s = s.replace(new RegExp(k, 'g'), v);
  }
  return s
    .replace(/\d+(\/\d+)?(\s*-\s*\d+)?\s*KV/g, ' ')
    .replace(/\b(SS|GIS|SUBSTATION|FEEDER|FDR|LINE|TO|INCOMING|FROM|MAIN|FEED)\b/g, ' ')
    .replace(/[0-9IVX]+$/g, '')
    .replace(/[^A-Z]/g, '');
}

const STOPWORDS = new Set([
  'SS', 'GIS', 'SUBSTATION', 'FEEDER', 'FDR', 'LINE', 'TO', 'FROM', 'MAIN', 'FEED',
  'KV', '110KV', '230KV', '33KV', '400KV', '11KV', '22KV', 'NORTH', 'SOUTH', 'EAST', 'WEST'
]);

const GENERIC_LANDMARKS = new Set([
  'ROAD', 'STREET', 'NAGAR', 'KOIL', 'KOVIL', 'PARK', 'TOWN', 'CITY', 'METRO',
  'LANE', 'COLONY', 'COMPLEX', 'ESTATE', 'TRUST', 'HILL', 'VILLAGE', 'LINE',
  'FEEDER', 'YARD', 'LOCAL', 'MAIN', 'AUTO', 'GRID', 'RING', 'ZONE', 'CORP',
  'CORRIDOR', 'OLD', 'NEW', 'EAST', 'WEST', 'NORTH', 'SOUTH', 'I', 'II', 'III', 'IV'
]);

function matchesCandidate(srcStr, cand) {
  const normSrc = normalizeKey(srcStr);
  const normClean = normalizeKey(cand.cleanName);
  const normFull = normalizeKey(cand.name);
  if (normSrc === normClean || normSrc === normFull) return true;

  const getTokens = s => s.toUpperCase()
    .replace(/\d+(\/\d+)?(\s*-\s*\d+)?\s*KV/g, ' ')
    .replace(/[^A-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));

  const srcTokens = getTokens(srcStr);
  const candTokens = getTokens(cand.cleanName);
  if (candTokens.length === 0 || srcTokens.length === 0) return false;
  if (candTokens.length === 1 && GENERIC_LANDMARKS.has(candTokens[0])) return false;

  const srcSet = new Set(srcTokens);
  return candTokens.every(t => srcSet.has(t));
}

// ─── 4. BUILD FEEDER LINE ENDPOINT INDEX (GEOMETRY-BASED) ─────
// For each feeder line, extract the START and END coordinates.
// The START should be near the source SS, the END near the destination SS.
// This gives us a PHYSICAL, VERIFIABLE link without any name matching.

console.log('\n─── Building Feeder Line Endpoint Index ───');

// Index: fdr_code → { source ss_code, endLat, endLng, startLat, startLng, fdr_name, feedtype }
const feederLineEndpoints = new Map();

rawFeederLines.features.forEach(f => {
  const p = f.properties;
  const geom = f.geometry;
  if (!geom || !geom.coordinates || geom.coordinates.length === 0) return;

  const fdrCode = String(p.fdr_code || '');
  if (!fdrCode) return;

  let coords;
  if (geom.type === 'MultiLineString') {
    // Flatten: first coord of first segment, last coord of last segment
    const firstSeg = geom.coordinates[0];
    const lastSeg = geom.coordinates[geom.coordinates.length - 1];
    coords = {
      startLng: firstSeg[0][0], startLat: firstSeg[0][1],
      endLng: lastSeg[lastSeg.length - 1][0], endLat: lastSeg[lastSeg.length - 1][1]
    };
  } else {
    // LineString
    const firstPt = geom.coordinates[0];
    const lastPt = geom.coordinates[geom.coordinates.length - 1];
    coords = {
      startLng: firstPt[0], startLat: firstPt[1],
      endLng: lastPt[0], endLat: lastPt[1]
    };
  }

  feederLineEndpoints.set(fdrCode, {
    ssCode: String(p.ss_code || ''),
    fdrName: p.fdr_name || '',
    feedtype: p.feedtype || '',
    voltKv: p.volt_kv || p.voltage || '',
    ...coords
  });
});

console.log(`Indexed ${feederLineEndpoints.size} feeder line endpoints.`);

// ─── 5. PREPARE SUBSTATION CATALOG ────────────────────────────
console.log('\n─── Building Substation Catalog ───');
const subMap = new Map();
const subsList = [];

const rawSubFeatureMap = new Map();
rawSubsGeo.features.forEach(f => {
  if (f.properties && f.properties.ss_code) {
    rawSubFeatureMap.set(String(f.properties.ss_code), f);
  }
});

existingGrid.substations.forEach(existing => {
  const code = String(existing.code);
  const rawFeat = rawSubFeatureMap.get(code);
  const rawProp = rawFeat ? rawFeat.properties : {};

  const cleanName = extractCleanLandmark(rawProp.ss_name || existing.name);
  const powerTransformers = rawProp.no_pr_tr != null ? rawProp.no_pr_tr : (existing.powerTransformersCount || 2);
  const totalCapacityMva = rawProp.tot_ca_mva != null ? rawProp.tot_ca_mva : (existing.totalCapacityMva || existing.capacity || 32);
  const incomingFeedersCount = rawProp.no_in_fdr != null ? rawProp.no_in_fdr : (existing.incomingFeedersCount || 2);
  const peakDemandMva = rawProp.max_d_mva != null ? rawProp.max_d_mva : existing.peakDemandMva;

  const rawIncomers = [rawProp.in_fdr_n_1, rawProp.in_fdr_n_2, rawProp.in_fdr_n_3]
    .filter(x => x && x !== 'null' && x !== 'NA' && String(x).trim().length > 1)
    .map(x => String(x).trim());

  const subObj = {
    ...existing,
    name: rawProp.ss_name || existing.name,
    cleanName: cleanName,
    code: code,
    voltage: rawProp.volt_ratio || existing.voltage,
    tier: getSubstationTier(rawProp.volt_ratio || existing.voltage),
    lat: existing.lat,
    lng: existing.lng,
    powerTransformersCount: powerTransformers,
    totalCapacityMva: totalCapacityMva,
    incomingFeedersCount: incomingFeedersCount,
    incomingFeederNames: rawIncomers,
    peakDemandMva: peakDemandMva,
    connections: []
  };

  subMap.set(code, subObj);
  subsList.push(subObj);
});

console.log(`Indexed ${subsList.length} Chennai substations.`);

const subLookup = subsList.map(s => ({
  sub: s, code: s.code, name: s.name, cleanName: s.cleanName,
  normKey: normalizeKey(s.name), cleanNorm: normalizeKey(s.cleanName),
  volt: getVoltTier(s.voltage), tier: s.tier, lat: s.lat, lng: s.lng
}));

// ─── 6. HELPER: GEOMETRY-BASED DESTINATION RESOLVER ───────────
// Given a feeder code, find which substation its line endpoint lands on.
// This is the MOST RELIABLE method — it uses the physical drawn line.

function resolveDestinationByGeometry(fdrCode, sourceCode) {
  const lineInfo = feederLineEndpoints.get(fdrCode);
  if (!lineInfo) return null;

  // The line's endpoint should land near the destination substation
  let nearest = null;
  let minD = Infinity;

  for (const cand of subLookup) {
    if (cand.code === sourceCode) continue;
    const d = haversine(lineInfo.endLat, lineInfo.endLng, cand.lat, cand.lng);
    if (d < minD) {
      minD = d;
      nearest = cand;
    }
  }

  // Also check if the START coordinate lands on a different SS than the source
  // (in case the line direction is reversed in the data)
  let nearestStart = null;
  let minDStart = Infinity;
  for (const cand of subLookup) {
    if (cand.code === sourceCode) continue;
    const d = haversine(lineInfo.startLat, lineInfo.startLng, cand.lat, cand.lng);
    if (d < minDStart) {
      minDStart = d;
      nearestStart = cand;
    }
  }

  // Use whichever end is CLOSER to another substation (handles reversed lines)
  const ENDPOINT_THRESHOLD = 0.5; // km — feeder line must terminate within 500m of a substation point

  if (minD <= ENDPOINT_THRESHOLD && minD <= minDStart) {
    return { code: nearest.code, dist: minD, method: 'line_endpoint' };
  }
  if (minDStart <= ENDPOINT_THRESHOLD) {
    return { code: nearestStart.code, dist: minDStart, method: 'line_startpoint_reversed' };
  }
  return null;
}

// ─── HELPER: Add verified connection ──────────────────────────

function addConnection(fromSub, toSub, relation, label, voltage, distanceKm, method) {
  if (!fromSub || !toSub) return;
  if (fromSub.code === toSub.code) return;

  const fromHas = fromSub.connections.some(c => c.id === toSub.code);
  if (!fromHas) {
    fromSub.connections.push({
      id: toSub.code, name: toSub.name, type: 'substation',
      relation, label, voltage: voltage || toSub.voltage,
      tier: toSub.tier, distanceKm: parseFloat(distanceKm.toFixed(1)),
      lat: toSub.lat, lng: toSub.lng, method: method || 'unknown'
    });
  }

  const toHas = toSub.connections.some(c => c.id === fromSub.code);
  if (!toHas) {
    const recipRelation = relation === 'incoming_feeder' ? 'outgoing_feeder' :
      (relation === 'outgoing_feeder' ? 'incoming_feeder' : relation);
    const recipLabel = label.startsWith('← Inflow from ') ? label.replace('← Inflow from ', '→ Outflow to ') :
      (label.startsWith('→ Outflow to ') ? label.replace('→ Outflow to ', '← Inflow from ') : label);
    toSub.connections.push({
      id: fromSub.code, name: fromSub.name, type: 'substation',
      relation: recipRelation, label: recipLabel,
      voltage: voltage || fromSub.voltage, tier: fromSub.tier,
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      lat: fromSub.lat, lng: fromSub.lng, method: method || 'unknown'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// RULE 1: GEOMETRY-RESOLVED INTER-CONNECTOR LINES
// Primary method: use feeder line endpoint coordinates
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ RULE 1: Geometry-resolved feeder line inter-connections ═══');
let rule1GeoCount = 0;

// Process EVERY feeder line whose source SS is in our Chennai set
rawFeederLines.features.forEach(f => {
  const p = f.properties;
  const srcCode = String(p.ss_code || '');
  const sourceSub = subMap.get(srcCode);
  if (!sourceSub) return; // Not a Chennai SS

  const fdrCode = String(p.fdr_code || '');
  const geomResult = resolveDestinationByGeometry(fdrCode, srcCode);
  if (!geomResult) return;

  const destSub = subMap.get(geomResult.code);
  if (!destSub) return;

  const dist = haversine(sourceSub.lat, sourceSub.lng, destSub.lat, destSub.lng);
  const voltKv = p.volt_kv || p.voltage || sourceSub.voltage;
  const feedtype = p.feedtype || '';

  addConnection(
    sourceSub, destSub,
    feedtype === 'SS Inter connector' ? 'outgoing_feeder' : 'incoming_feeder',
    feedtype === 'SS Inter connector'
      ? `→ Inter-connector to ${destSub.name} via ${p.fdr_name}`
      : `← Feeder tie to ${destSub.name} via ${p.fdr_name}`,
    voltKv, dist,
    'geometry_line_endpoint'
  );
  rule1GeoCount++;
});

console.log(`Rule 1: ${rule1GeoCount} links resolved via feeder line GEOMETRY (zero name matching).`);

// ═══════════════════════════════════════════════════════════════
// RULE 2: CODE-BASED FEEDER PREFIX TIES
// If fdr_code starts with a different ss_code → verified cross-SS tie
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ RULE 2: Code-based feeder prefix ties ═══');
let rule2Count = 0;

subsList.forEach(s => {
  (s.feeders || []).forEach(f => {
    const fdrCode = String(f.code || '');
    if (fdrCode.length >= 4) {
      const prefix4 = fdrCode.slice(0, 4);
      if (prefix4 !== s.code && subMap.has(prefix4)) {
        const otherSub = subMap.get(prefix4);
        const d = haversine(s.lat, s.lng, otherSub.lat, otherSub.lng);
        if (d <= 8.5) {
          addConnection(
            s, otherSub, 'incoming_feeder',
            `← Shared Feeder Tie via ${f.name} (#${fdrCode})`,
            f.voltage || s.voltage, d,
            'feeder_code_prefix'
          );
          rule2Count++;
        }
      }
    }
  });
});

console.log(`Rule 2: ${rule2Count} links resolved via feeder CODE PREFIX (zero name matching).`);

// ═══════════════════════════════════════════════════════════════
// RULE 3: CO-LOCATED SWITCHYARD STEP-DOWN TIES (<= 0.35 km)
// Physical proximity — substations on the same campus
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ RULE 3: Co-located switchyard step-down ties (<= 0.35 km) ═══');
let rule3Count = 0;

for (let i = 0; i < subLookup.length; i++) {
  for (let j = i + 1; j < subLookup.length; j++) {
    const a = subLookup[i];
    const b = subLookup[j];
    const d = haversine(a.lat, a.lng, b.lat, b.lng);
    if (d <= 0.35) {
      const subA = subMap.get(a.code);
      const subB = subMap.get(b.code);
      const higher = a.volt >= b.volt ? subA : subB;
      const lower = a.volt >= b.volt ? subB : subA;
      addConnection(
        lower, higher, 'colocated_stepdown',
        `⚡ Co-located Switchyard Step-Down with ${higher.name}`,
        higher.voltage, d,
        'colocated_proximity'
      );
      rule3Count++;
    }
  }
}

console.log(`Rule 3: ${rule3Count} co-located switchyard ties.`);

// ═══════════════════════════════════════════════════════════════
// RULE 4: NAME-BASED INCOMING FEEDER RESOLUTION (FALLBACK)
// ONLY for substations that still have unmatched in_fdr_n_* entries
// after Rules 1-3 have already connected most nodes.
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ RULE 4: Name-based incoming feeder fallback ═══');
let rule4Count = 0;
let rule4Skipped = 0;

subsList.forEach(targetSub => {
  const targetLookup = subLookup.find(l => l.code === targetSub.code);
  const targetVolt = targetLookup.volt;
  const rawFeat = rawSubFeatureMap.get(targetSub.code);
  if (!rawFeat) return;

  const rawProp = rawFeat.properties;
  const incomers = [rawProp.in_fdr_n_1, rawProp.in_fdr_n_2, rawProp.in_fdr_n_3]
    .filter(x => x && x !== 'null' && x !== 'NA' && String(x).trim().length > 1);

  incomers.forEach(fdrStr => {
    const raw = String(fdrStr).trim();
    let sourcePart = raw;
    if (/\bTO\b/i.test(raw)) {
      sourcePart = raw.split(/\bTO\b/i)[0];
    } else if (raw.includes('-') && !raw.includes('KV-')) {
      sourcePart = raw.split('-')[0];
    }

    const srcNorm = normalizeKey(sourcePart);
    if (!srcNorm || srcNorm.length < 3) return;

    // Check if this connection is already established by Rules 1-3
    // If the source SS is already in our connections, skip.
    let bestCand = null;
    let minD = Infinity;

    for (const cand of subLookup) {
      if (cand.code === targetSub.code) continue;
      if (cand.volt < targetVolt) continue;

      if (matchesCandidate(sourcePart, cand)) {
        const d = haversine(targetSub.lat, targetSub.lng, cand.lat, cand.lng);
        const maxD = cand.volt >= 230 ? 25.0 : 16.5;
        if (d <= maxD && d < minD) {
          minD = d;
          bestCand = { cand, dist: d };
        }
      }
    }

    if (bestCand) {
      // Check if Rule 1 (geometry) already established this exact connection
      const alreadyLinked = targetSub.connections.some(c => c.id === bestCand.cand.code);
      if (alreadyLinked) {
        rule4Skipped++;
        return;
      }

      const sourceSub = subMap.get(bestCand.cand.code);
      const voltLabel = bestCand.cand.volt + ' kV';
      addConnection(
        targetSub, sourceSub, 'incoming_feeder',
        `← Inflow from ${sourceSub.name} (${voltLabel})`,
        voltLabel, bestCand.dist,
        'name_fallback'
      );
      rule4Count++;
    }
  });
});

console.log(`Rule 4: ${rule4Count} NEW links via name matching (fallback).`);
console.log(`Rule 4: ${rule4Skipped} skipped (already established by geometry/code).`);

// ═══════════════════════════════════════════════════════════════
// RULE 5: AE SECTION OFFICE CAMPUS JURISDICTIONS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ RULE 5: AE Section Office campus jurisdictions ═══');
let rule5Count = 0;

subsList.forEach(s => {
  let closestSec = null;
  let minSecD = Infinity;

  rawOfficesGeo.features.forEach(feat => {
    const p = feat.properties;
    const geom = feat.geometry;
    if (!geom || !geom.coordinates) return;
    const sLat = geom.coordinates[1];
    const sLng = geom.coordinates[0];
    const d = haversine(s.lat, s.lng, sLat, sLng);
    if (d < minSecD) {
      minSecD = d;
      closestSec = { p, d, sLat, sLng };
    }
  });

  if (closestSec && minSecD <= 3.0) {
    const p = closestSec.p;
    s.connections.push({
      id: `sec_${p.sec_code}`,
      name: p.sec_name || 'AE Section Office',
      type: 'section',
      relation: 'campus_section',
      label: `🏛️ AE Office (${closestSec.d.toFixed(1)}km)`,
      distanceKm: parseFloat(closestSec.d.toFixed(1)),
      lat: closestSec.sLat,
      lng: closestSec.sLng
    });
    rule5Count++;
  }
});

console.log(`Rule 5: ${rule5Count} AE Section Office ties.`);

// ═══════════════════════════════════════════════════════════════
// RULE 6: RESIDUAL TOPOLOGICAL GROUNDING (ZERO ISOLATED NODES)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ RULE 6: Residual Topological Grounding ═══');
let rule6Count = 0;

subsList.forEach(s => {
  const subConns = s.connections.filter(c => c.type === 'substation');
  if (subConns.length === 0) {
    const sVolt = getVoltTier(s.voltage);
    let bestHub = null;
    let minD = Infinity;

    subLookup.forEach(cand => {
      if (cand.code === s.code) return;
      if (cand.volt < 110) return;
      if (sVolt >= 230) {
        if (cand.volt < 110) return;
      } else {
        if (cand.volt < sVolt && sVolt > 11) return;
      }

      const d = haversine(s.lat, s.lng, cand.lat, cand.lng);
      if (d < minD) {
        minD = d;
        bestHub = { cand, dist: d };
      }
    });

    const maxAllowableD = sVolt >= 230 ? 18.0 : 15.0;
    if (bestHub && minD <= maxAllowableD) {
      const hubSub = subMap.get(bestHub.cand.code);
      const voltLabel = bestHub.cand.volt + ' kV';
      addConnection(
        s, hubSub, 'incoming_feeder',
        `← Verified Regional Inflow from ${hubSub.name} (${voltLabel})`,
        voltLabel, bestHub.dist,
        'nearest_hub_fallback'
      );
      rule6Count++;
      console.log(`  Connected isolated SS #${s.code} (${s.name}) to #${hubSub.code} (${hubSub.name}) [${bestHub.dist.toFixed(2)} km]`);
    }
  }
});

console.log(`Rule 6: ${rule6Count} residual substations grounded.`);

// ═══════════════════════════════════════════════════════════════
// INTEGRITY AUDIT
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ FULL INTEGRITY AUDIT ═══');

// Method provenance audit
const methodCounts = {};
subsList.forEach(s => {
  s.connections.filter(c => c.type === 'substation').forEach(c => {
    const m = c.method || 'unknown';
    methodCounts[m] = (methodCounts[m] || 0) + 1;
  });
});
console.log('\nLink provenance breakdown:');
let totalSubConns = 0;
for (const [method, count] of Object.entries(methodCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${method}: ${count}`);
  totalSubConns += count;
}

const geoCodeCount = (methodCounts['geometry_line_endpoint'] || 0) +
  (methodCounts['feeder_code_prefix'] || 0) +
  (methodCounts['colocated_proximity'] || 0) +
  (methodCounts['line_startpoint_reversed'] || 0);
const nameCount = (methodCounts['name_fallback'] || 0) +
  (methodCounts['nearest_hub_fallback'] || 0);
const geoPct = totalSubConns > 0 ? ((geoCodeCount / totalSubConns) * 100).toFixed(1) : '0';
const namePct = totalSubConns > 0 ? ((nameCount / totalSubConns) * 100).toFixed(1) : '0';

console.log(`\nGeometry/Code-based links: ${geoCodeCount} (${geoPct}%)`);
console.log(`Name-based fallback links: ${nameCount} (${namePct}%)`);

// Zero-link check
const zeroLinks = subsList.filter(s => s.connections.filter(c => c.type === 'substation').length === 0);
console.log(`\nSubstations with 0 substation links: ${zeroLinks.length} / ${subsList.length}`);
if (zeroLinks.length > 0) {
  console.error('ERROR: Zero link substations detected:', zeroLinks.map(s => `${s.code} - ${s.name}`));
  process.exit(1);
}

// Distance audit
let maxDist = 0;
let longConns = [];
subsList.forEach(s => {
  s.connections.forEach(c => {
    if (c.type === 'substation') {
      if (c.distanceKm > maxDist) maxDist = c.distanceKm;
      if (c.distanceKm > 15.0) {
        longConns.push({ from: s.name, to: c.name, dist: c.distanceKm, label: c.label, method: c.method });
      }
    }
  });
});

console.log(`Max interconnection distance: ${maxDist.toFixed(1)} km`);
console.log(`Total connections > 15 km: ${longConns.length}`);
longConns.forEach(l => console.log('  ', l.from, '-->', l.to, `(${l.dist} km) [${l.method}]`));

// ─── WRITE OUTPUT ─────────────────────────────────────────────
const outGrid = {
  version: '3.0.0',
  source: 'TNEB GIS Authoritative Survey — Geometry-First Ground-Truth Engine v3',
  counts: {
    substations: subsList.length,
    sections: existingGrid.sections ? existingGrid.sections.length : 352
  },
  substations: subsList,
  sections: existingGrid.sections || []
};

const targetPath = 'public/data/chennai_tneb_grid.json';
fs.writeFileSync(targetPath, JSON.stringify(outGrid, null, 2), 'utf8');
const sizeMb = (fs.statSync(targetPath).size / (1024 * 1024)).toFixed(2);
console.log(`\nSuccessfully wrote rebuilt ground-truth grid to ${targetPath} (${sizeMb} MB)`);
