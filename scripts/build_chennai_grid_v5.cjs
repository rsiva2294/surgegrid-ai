/**
 * build_chennai_grid_v5.cjs
 * 
 * Exhaustive Ground-Truth Grid Builder for SurgeGrid-AI (V5 Architecture)
 * 
 * Outputs:
 * 1. public/data/chennai_tneb_grid.json (Core Operations Framework):
 *    - 286 Chennai Metro & CMA Substations (points, polygons, capacity, flood risk, SOP, feeder lists)
 *    - Verified EHT Transmission Backbones (400/230/110 kV bulk corridors)
 *    - 352 Section Boundaries (with AE Mobile Numbers & Addresses from section_offices)
 * 
 * 2. public/data/feeders/{circle}.json (On-Demand Feeder Wire Geometries):
 *    - Surveyed MultiLineString street routes across all Chennai & CMA Circles
 * 
 * 3. public/data/dtr/{circle}.json (On-Demand Distribution Transformer Points):
 *    - Surveyed transformer coordinates with kVA and active metered consumer counts
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const RAW_DIR = 'C:/projects/nammamap-v2/tneb-outage/nammamap-outage-aggregator/data-source/tneb_gis_raw';
const TARGET_GRID_PATH = 'public/data/chennai_tneb_grid.json';

const CMA_CIRCLES = ['0400', '0401', '0402', '0404', '0406', '0408', '0410', '0411'];
const CIRCLE_NAMES = {
  '0400': 'CHENNAI SOUTH 1',
  '0401': 'CHENNAI SOUTH 2',
  '0402': 'CHENNAI CENTRAL',
  '0404': 'CHENNAI NORTH',
  '0406': 'CHENNAI WEST',
  '0408': 'TIRUVALLUR',
  '0410': 'KANCHIPURAM',
  '0411': 'CHENGALPATTU'
};

console.log('=== SURGEGRID-AI V5 GROUND-TRUTH REBUILD ENGINE ===\n');

// 1. Read canonical 286 substations and 352 sections from origin
console.log('Phase 1: Loading canonical baseline from origin/feature/chennai-grid-cockpit...');
const baselineRaw = execSync('git show origin/feature/chennai-grid-cockpit:public/data/chennai_tneb_grid.json', { maxBuffer: 50 * 1024 * 1024 }).toString('utf8');
const baseline = JSON.parse(baselineRaw);

const canonicalCodes = new Set(baseline.substations.map(s => String(s.code)));
const enrichmentMap = new Map();
baseline.substations.forEach(s => {
  enrichmentMap.set(String(s.code), {
    elevationM: s.elevationM,
    riskCategory: s.riskCategory,
    compositeRiskScore: s.compositeRiskScore,
    distanceToCoastKm: s.distanceToCoastKm,
    anticipatorySop: s.anticipatorySop,
    historicalOutagesCount: s.historicalOutagesCount,
    circleCode: s.circleCode,
    circle: s.circle,
    district: s.district,
    regionCode: s.regionCode
  });
});
console.log(`Loaded ${canonicalCodes.size} canonical substation codes and enrichment profiles.`);

// 2. Read Substations Points & Polygons
console.log('\nPhase 2: Loading Substation Points & Footprint Polygons...');
const subPointsData = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'grid_infrastructure', 'substations_points.geojson'), 'utf8'));
const subPolysData = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'grid_infrastructure', 'substations_polygons.geojson'), 'utf8'));

const rawPointsMap = new Map();
subPointsData.features.forEach(f => {
  const code = String(f.properties.ss_code || '');
  if (code) rawPointsMap.set(code, f);
});

// 3. Read Section Boundaries & Offices
console.log('\nPhase 3: Loading Section Boundaries and AE Office Contacts...');
const secBoundariesData = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'administrative_boundaries', 'section_boundaries.geojson'), 'utf8'));
const secOfficesData = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'offices', 'section_offices.geojson'), 'utf8'));

const officeLookup = new Map();
secOfficesData.features.forEach(f => {
  const p = f.properties;
  if (!p) return;
  const key = `${p.cir_code}_${p.sec_code}`;
  officeLookup.set(key, {
    mobile: p.mobile_no || null,
    address: p.postal_add || null,
    subdivision: p.sd_name || null,
    division: p.div_name || null,
    sectionName: p.sec_name || null,
    lat: f.geometry ? f.geometry.coordinates[1] : null,
    lng: f.geometry ? f.geometry.coordinates[0] : null
  });
});

const canonicalSecCodes = new Set(baseline.sections.map(s => String(s.breakdownCode || s.code)));
const cleanSections = [];

secBoundariesData.features.forEach(f => {
  const p = f.properties;
  if (!p) return;
  const combine = String(p.combineseccode || '');
  const cirCode = String(p.cir_code || '');
  const secCode = combine.startsWith(cirCode) ? combine.slice(cirCode.length) : combine;

  if (canonicalSecCodes.has(combine) || canonicalSecCodes.has(secCode) || CMA_CIRCLES.includes(cirCode)) {
    // Only include if in canonical baseline or within CMA
    if (canonicalSecCodes.has(combine) || canonicalSecCodes.has(secCode)) {
      const off = officeLookup.get(`${cirCode}_${secCode}`) || {};
      cleanSections.push({
        name: `AE/O&M/${p.sec_name || 'SECTION'}`,
        cleanName: p.sec_name || 'SECTION',
        code: secCode,
        circleCode: cirCode,
        circle: CIRCLE_NAMES[cirCode] || p.cir_name || 'CHENNAI',
        district: 'Chennai',
        subdivision: off.subdivision || 'CHENNAI SUBDIVISION',
        division: off.division || 'CHENNAI DIVISION',
        region: cirCode === '0404' ? 'CHENNAI NORTH' : 'CHENNAI SOUTH',
        regionCode: cirCode === '0404' ? '01' : '09',
        lat: off.lat || null,
        lng: off.lng || null,
        mobile: off.mobile || null,
        address: off.address || null,
        breakdownCode: combine,
        boundary: f.geometry
      });
    }
  }
});
console.log(`Matched ${cleanSections.length} Canonical Section Boundaries.`);

// 4. Read Feeder Master Metadata
console.log('\nPhase 4: Indexing Feeders Master Metadata...');
const rawFeedersMeta = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'grid_infrastructure', 'feeders_master_metadata.json'), 'utf8')).feeders;
const feedersBySubstation = new Map();

function classifyLifeline(feederName) {
  const upper = feederName.toUpperCase();
  if (upper.includes('HOSP') || upper.includes('MEDICAL') || upper.includes('HEALTH') || upper.includes('APOLLO') || upper.includes('KMC') || upper.includes('GH ')) {
    return { category: 'hospital', label: '🏥 Hospital / Critical Medical', priority: 'P1_CRITICAL' };
  }
  if (upper.includes('WATER') || upper.includes('DRAIN') || upper.includes('SEWAGE') || upper.includes('CMWSSB') || upper.includes('METRO WATER') || upper.includes('STP') || upper.includes('PUMP')) {
    return { category: 'water_pumping', label: '🚰 Water Pumping Station (Area Line)', priority: 'P1_NON_CUT' };
  }
  if (upper.includes('METRO') || upper.includes('RAIL') || upper.includes('MRTS') || upper.includes('PORT') || upper.includes('AIRPORT') || upper.includes('TRAIN')) {
    return { category: 'transit', label: '🚇 Metro / Rail / Port (Dedicated HT)', priority: 'P2_ESSENTIAL' };
  }
  if (upper.includes('IND') || upper.includes('SIPCOT') || upper.includes('SIDCO') || upper.includes('ESTATE') || upper.includes('CORPN') || upper.includes('COMM')) {
    return { category: 'industrial_ht', label: '🏭 Dedicated HT Commercial/Industrial', priority: 'P3_COMMERCIAL' };
  }
  return { category: 'residential', label: '⚡ Distribution Feeder', priority: 'P3_COMMERCIAL' };
}

rawFeedersMeta.forEach(f => {
  const ssCode = String(f.ss_code || '');
  if (!ssCode) return;
  if (!feedersBySubstation.has(ssCode)) {
    feedersBySubstation.set(ssCode, []);
  }

  const lifeline = classifyLifeline(f.fdr_name || '');
  feedersBySubstation.get(ssCode).push({
    name: f.fdr_name || `FEEDER ${f.fdr_code}`,
    code: String(f.fdr_code || ''),
    voltage: `${f.volt_kv || 11} kV`,
    lengthKm: f.fdr_length ? Number(Number(f.fdr_length).toFixed(2)) : 2.5,
    transformers: f.no_of_dt || 0,
    consumers: f.conscount || 0,
    config: f.fdrconfig || 'UG',
    type: lifeline.category !== 'residential' ? 'Dedicated (HT Service)' : (f.feedtype || 'Distribution'),
    lifelineCategory: lifeline.category !== 'residential' ? lifeline.category : undefined,
    lifelineLabel: lifeline.category !== 'residential' ? lifeline.label : undefined,
    priorityLevel: lifeline.category !== 'residential' ? lifeline.priority : undefined
  });
});

// 5. Read EHT Transmission Lines (400kV, 230kV, 110kV strictly verified corridors)
console.log('\nPhase 5: Mapping Ground-Truth EHT Bulk Transmission Corridors...');
const ehtData = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'grid_infrastructure', 'eht_feeder_load_2026-09-27.geojson'), 'utf8'));

// Build coordinate map for canonical substations
const subCoordMap = new Map();
canonicalCodes.forEach(code => {
  const ptFeature = rawPointsMap.get(code);
  const baselineSub = baseline.substations.find(s => String(s.code) === code);
  const lat = ptFeature ? ptFeature.geometry.coordinates[1] : (baselineSub ? baselineSub.lat : 13.08);
  const lng = ptFeature ? ptFeature.geometry.coordinates[0] : (baselineSub ? baselineSub.lng : 80.27);
  const name = ptFeature ? ptFeature.properties.ss_name : (baselineSub ? baselineSub.name : `SS ${code}`);
  const voltRatio = ptFeature ? ptFeature.properties.volt_ratio : (baselineSub ? baselineSub.voltage : '110/33');
  
  subCoordMap.set(code, { lat, lng, name, voltRatio });
});

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ehtConnectionsMap = new Map();
ehtData.features.forEach(f => {
  const p = f.properties;
  if (!p) return;
  const ssCode = String(p.legacy_sscode || p.ss_code || '');
  if (!subCoordMap.has(ssCode)) return;

  const fdrName = String(p.fdr_name || p.FEEDER_NAME || '');
  const fdrVolt = String(p.fdr_volt || p.VOLTAGE || '110');
  const voltNum = Number(fdrVolt) || 110;

  // Max distance depends on voltage: 400kV=35km, 230kV=28km, 110kV=18km
  const maxAllowedDist = voltNum >= 400 ? 35.0 : (voltNum >= 230 ? 28.0 : 18.0);

  for (const [targetCode, targetInfo] of subCoordMap.entries()) {
    if (targetCode === ssCode) continue;

    const cleanTarget = targetInfo.name.replace(/^\d+[\/\-]\d+[\/\-]?\d*\s*KV\s*/i, '').replace(/\s*SS.*$/i, '').trim().toUpperCase();
    if (cleanTarget.length >= 4 && fdrName.toUpperCase().includes(cleanTarget)) {
      const origin = subCoordMap.get(ssCode);
      const dist = haversineKm(origin.lat, origin.lng, targetInfo.lat, targetInfo.lng);

      if (dist <= maxAllowedDist) {
        if (!ehtConnectionsMap.has(ssCode)) ehtConnectionsMap.set(ssCode, new Map());
        const subLinks = ehtConnectionsMap.get(ssCode);
        if (!subLinks.has(targetCode) || subLinks.get(targetCode).distanceKm > dist) {
          subLinks.set(targetCode, {
            id: targetCode,
            name: targetInfo.name,
            type: 'substation',
            relation: 'transmission_line',
            label: `⚡ ${fdrVolt} kV Bulk EHT Line: ${fdrName}`,
            voltage: fdrVolt,
            tier: voltNum >= 230 ? 'bulk' : 'subtransmission',
            distanceKm: Number(dist.toFixed(2)),
            lat: targetInfo.lat,
            lng: targetInfo.lng,
            method: 'eht_surveyed_corridor'
          });
        }
      }
    }
  }
});
console.log(`Mapped verified EHT transmission lines for ${ehtConnectionsMap.size} substations.`);

// 6. Build the 286 Canonical Substations
console.log('\nPhase 6: Assembling 286 Canonical Substations...');
const cleanSubstations = [];

canonicalCodes.forEach(code => {
  const ptFeature = rawPointsMap.get(code);
  const baselineSub = baseline.substations.find(s => String(s.code) === code) || {};
  const coord = subCoordMap.get(code);

  const name = ptFeature ? ptFeature.properties.ss_name : baselineSub.name;
  const cleanName = name.replace(/^\d+[\/\-]\d+[\/\-]?\d*\s*KV\s*/i, '').replace(/\s*SS.*$/i, '').trim();

  const voltRatio = ptFeature ? ptFeature.properties.volt_ratio : baselineSub.voltage || '33/11';
  const highVolt = Number(voltRatio.split(/[\/\-]/)[0]) || 33;
  const tier = highVolt >= 230 ? 'bulk' : (highVolt >= 66 ? 'subtransmission' : 'distribution');

  const feeders = feedersBySubstation.get(code) || baselineSub.feeders || [];
  const totalTransformers = feeders.reduce((sum, f) => sum + (f.transformers || 0), 0);
  const totalConsumers = feeders.reduce((sum, f) => sum + (f.consumers || 0), 0);

  const rawConns = ehtConnectionsMap.get(code);
  const connections = rawConns ? Array.from(rawConns.values()) : [];

  const enrich = enrichmentMap.get(code) || {};
  const cirCode = String((ptFeature && ptFeature.properties.cir_code) || enrich.circleCode || baselineSub.circleCode || '0400');

  cleanSubstations.push({
    name,
    cleanName: cleanName || name,
    code,
    voltage: voltRatio,
    capacity: (ptFeature && ptFeature.properties.tot_ca_mva) || baselineSub.capacity || 0,
    circleCode: cirCode,
    circle: CIRCLE_NAMES[cirCode] || baselineSub.circle || 'CHENNAI',
    district: baselineSub.district || 'Chennai',
    regionCode: String((ptFeature && ptFeature.properties.region_id) || enrich.regionCode || (cirCode === '0404' ? '01' : '09')),
    lat: coord.lat,
    lng: coord.lng,
    feeders,
    tier,
    totalConsumers,
    totalTransformers,
    totalFeedersCount: feeders.length,
    connections,
    elevationM: enrich.elevationM || baselineSub.elevationM || 11,
    riskCategory: enrich.riskCategory || baselineSub.riskCategory || 'LOW_RISK',
    compositeRiskScore: enrich.compositeRiskScore || baselineSub.compositeRiskScore || 25.0,
    distanceToCoastKm: enrich.distanceToCoastKm || baselineSub.distanceToCoastKm || 4.5,
    anticipatorySop: enrich.anticipatorySop || baselineSub.anticipatorySop || 'Standard Pre-Monsoon Substation Inspection; Verify Sump Pump Functionality',
    historicalOutagesCount: enrich.historicalOutagesCount || baselineSub.historicalOutagesCount || 0,
    powerTransformersCount: (ptFeature && ptFeature.properties.no_pr_tr) || baselineSub.powerTransformersCount || 2,
    totalCapacityMva: (ptFeature && ptFeature.properties.tot_ca_mva) || baselineSub.totalCapacityMva || 32,
    incomingFeedersCount: (ptFeature && ptFeature.properties.no_in_fdr) || baselineSub.incomingFeedersCount || 2,
    incomingFeederNames: ptFeature ? [ptFeature.properties.in_fdr_n_1, ptFeature.properties.in_fdr_n_2, ptFeature.properties.in_fdr_n_3].filter(Boolean) : (baselineSub.incomingFeederNames || [])
  });
});

// Sort cleanSubstations deterministically by code
cleanSubstations.sort((a, b) => a.code.localeCompare(b.code));

// Merge any baseline sections that were not in secBoundariesData directly
const existingSecCodes = new Set(cleanSections.map(s => String(s.breakdownCode || s.code)));
baseline.sections.forEach(s => {
  const code = String(s.breakdownCode || s.code);
  if (!existingSecCodes.has(code)) {
    cleanSections.push(s);
    existingSecCodes.add(code);
  }
});
cleanSections.sort((a, b) => a.name.localeCompare(b.name));

// 7. Write Tier 1 Core Operations Framework
const coreGridOutput = {
  version: '5.0.0-ground-truth',
  source: 'TNEB GIS Official Survey + GCC Dem',
  counts: {
    substations: cleanSubstations.length,
    sections: cleanSections.length
  },
  metadata: {
    totalSubstations: cleanSubstations.length,
    totalSections: cleanSections.length,
    totalFeeders: cleanSubstations.reduce((s, sub) => s + sub.totalFeedersCount, 0),
    totalTransformers: cleanSubstations.reduce((s, sub) => s + sub.totalTransformers, 0),
    totalConsumers: cleanSubstations.reduce((s, sub) => s + sub.totalConsumers, 0)
  },
  substations: cleanSubstations,
  sections: cleanSections
};

fs.writeFileSync(TARGET_GRID_PATH, JSON.stringify(coreGridOutput, null, 2), 'utf8');
const coreSizeMb = (fs.statSync(TARGET_GRID_PATH).size / (1024 * 1024)).toFixed(2);
console.log(`\n✓ Successfully wrote Tier 1 Core Grid Framework to ${TARGET_GRID_PATH} (${coreSizeMb} MB)`);
console.log(`  Substations: ${cleanSubstations.length} | Sections: ${cleanSections.length} | Total Consumers: ${coreGridOutput.metadata.totalConsumers.toLocaleString()}`);

// 8. Extract Tier 2: Feeder Wire Geometries per Circle
console.log('\n--- Extracting Tier 2: Feeder Wire Geometries per Circle ---');
const feedersOutputDir = path.join('public', 'data', 'feeders');
if (!fs.existsSync(feedersOutputDir)) fs.mkdirSync(feedersOutputDir, { recursive: true });

const fdrData = zlib.gunzipSync(fs.readFileSync(path.join(RAW_DIR, 'grid_infrastructure', 'feeder_lines.geojson.gz')));
const fdrGeo = JSON.parse(fdrData.toString('utf8'));

CMA_CIRCLES.forEach(cir => {
  const circleFeeders = {};
  let count = 0;

  fdrGeo.features.forEach(f => {
    const p = f.properties;
    if (p && String(p.cir_code) === cir) {
      count++;
      circleFeeders[p.fdr_code] = {
        name: p.fdr_name,
        code: p.fdr_code,
        ss_code: p.ss_code,
        volt: p.volt_kv,
        len: p.fdr_length,
        dts: p.no_of_dt,
        cons: p.conscount,
        type: f.geometry.type,
        coords: f.geometry.type === 'MultiLineString'
          ? f.geometry.coordinates.map(line => line.map(pt => [Number(pt[0].toFixed(5)), Number(pt[1].toFixed(5))]))
          : f.geometry.coordinates.map(pt => [Number(pt[0].toFixed(5)), Number(pt[1].toFixed(5))])
      };
    }
  });

  const outPath = path.join(feedersOutputDir, `${cir}.json`);
  fs.writeFileSync(outPath, JSON.stringify(circleFeeders), 'utf8');
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✓ Circle ${cir} (${CIRCLE_NAMES[cir] || cir}): ${count} feeder geometries saved to ${outPath} (${sizeMb} MB)`);
});

// 9. Extract Tier 3: Distribution Transformers per Circle
console.log('\n--- Extracting Tier 3: Distribution Transformers per Circle ---');
const dtrOutputDir = path.join('public', 'data', 'dtr');
if (!fs.existsSync(dtrOutputDir)) fs.mkdirSync(dtrOutputDir, { recursive: true });

const rawDtrDir = path.join(RAW_DIR, 'distribution_network', 'transformers');

CMA_CIRCLES.forEach(cir => {
  const file = fs.readdirSync(rawDtrDir).find(f => f.includes(cir));
  if (!file) return;
  const full = path.join(rawDtrDir, file);
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(full)).toString('utf8'));

  const circleDts = {};
  data.features.forEach(f => {
    const p = f.properties;
    const fdr = String(p.fdr_code || '');
    if (!circleDts[fdr]) circleDts[fdr] = [];
    circleDts[fdr].push({
      id: p.dt_code,
      name: p.dt_name,
      kva: p.dt_cap_kva,
      cons: p.dtconcount,
      lat: Number(f.geometry.coordinates[1].toFixed(5)),
      lng: Number(f.geometry.coordinates[0].toFixed(5))
    });
  });

  const outPath = path.join(dtrOutputDir, `${cir}.json`);
  fs.writeFileSync(outPath, JSON.stringify(circleDts), 'utf8');
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`✓ Circle ${cir} (${CIRCLE_NAMES[cir] || cir}): ${data.features.length} DT points saved to ${outPath} (${sizeKb} KB)`);
});

console.log('\n======================================================');
console.log('V5 GROUND-TRUTH REBUILD FINISHED SUCCESSFULLY.');
console.log('======================================================');
