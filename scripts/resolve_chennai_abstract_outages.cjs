/**
 * scripts/resolve_chennai_abstract_outages.cjs
 * 
 * Evaluates the Sovereign Resolution & Mapping Gate on historical Chennai abstract outages:
 * Run 1: WITHOUT Gold Registry (Strict Algorithmic Grid Topology Matching)
 * Run 2: WITH Gold Registry (Tier 0 Historical Ground-Truth Signatures + Algorithmic Fallback)
 * 
 * Compares resolution accuracy, asset mapping rates, confidence scores, and disambiguation.
 */

const fs = require('fs');
const path = require('path');

const CHENNAI_OUTAGES_PATH = path.join(__dirname, '../data/chennai_abstract_outages.json');
const GRID_PATH = path.join(__dirname, '../public/data/chennai_tneb_grid.json');
const GOLD_REGISTRY_PATH = path.join(__dirname, '../public/data/chennai_outage_gold_registry.json');

const OUT_WITHOUT_GOLD_PATH = path.join(__dirname, '../data/chennai_abstract_outages_resolved_without_gold.json');
const OUT_WITH_GOLD_PATH = path.join(__dirname, '../data/chennai_abstract_outages_resolved_with_gold.json');
const OUT_COMPARISON_PATH = path.join(__dirname, '../data/chennai_outage_mapping_comparison.json');

// --- Helper Functions identical to src/services/liveOutageService.ts ---

const CHENNAI_LOCALITY_GAZETTEER = {
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

function clean(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\d/]+\s*kv\b/gi, ' ')
    .replace(/\bss\b/gi, ' ')
    .replace(/\bsubstation\b/gi, ' ')
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

function squash(str) {
  if (!str) return '';
  return clean(str).replace(/\s+/g, '');
}

function matchesLocality(candidate, target) {
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

  // Word token containment
  const cWords = cClean.split(' ').filter(w => w.length >= 3);
  const tWords = tClean.split(' ').filter(w => w.length >= 3);
  if (cWords.length === 0 || tWords.length === 0) return false;

  const tInC = tWords.every(tw => cWords.includes(tw));
  const cInT = cWords.every(cw => tWords.includes(cw));

  return tInC || cInT;
}

function resolveOutage(outage, substations, sections, goldRegistry = null) {
  const oTown = outage.area || '';
  const oSub = outage.parsed_entities?.detected_substation || '';
  const oFdr = outage.parsed_entities?.detected_feeder || '';
  const oSec = outage.parsed_entities?.detected_section || '';

  let matchedSS = null;
  let matchedSec = null;
  let resolutionMethod = null;
  let confidence = 0;

  // --- TIER 0: GOLD STANDARD REGISTRY (Only if goldRegistry is provided) ---
  if (goldRegistry?.signatures) {
    const sTown = squash(oTown);
    const sSec = squash(oSec);
    const sSub = squash(oSub);
    const sFdr = squash(oFdr);

    const fullKey = `${sTown}|${sSec}|${sSub}|${sFdr}`;
    const townSecKey = `${sTown}|${sSec}`;
    const subFdrKey = `${sSub}|${sFdr}`;
    const townSubKey = `${sTown}|${sSub}`;
    const townKey = sTown;

    const goldHit = goldRegistry.signatures[fullKey] ||
                    (sTown && sSec ? goldRegistry.signatures[townSecKey] : undefined) ||
                    (sSub && sFdr ? goldRegistry.signatures[subFdrKey] : undefined) ||
                    (sTown && sSub ? goldRegistry.signatures[townSubKey] : undefined) ||
                    (sTown ? goldRegistry.signatures[townKey] : undefined);

    if (goldHit) {
      if (goldHit.ssCode) matchedSS = substations.find(s => String(s.code) === String(goldHit.ssCode));
      if (goldHit.secCode) matchedSec = sections.find(s => String(s.code) === String(goldHit.secCode));
      if (matchedSS || matchedSec) {
        resolutionMethod = 'gold_registry_verified';
        confidence = 1.0;
      }
    }
  }

  // --- TIER 1: CANONICAL LOCALITY GAZETTEER ---
  if (!matchedSS || !matchedSec) {
    const fullLocText = squash(`${oTown} ${oSec} ${oSub}`);
    const locMap = goldRegistry?.localities || CHENNAI_LOCALITY_GAZETTEER;
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

  // --- TIER 2: GUARDED SUBSTATION MATCH ---
  if (!matchedSS && (oSub || oTown)) {
    const targets = [oSub, oTown].filter(t => t && t.length >= 3);
    for (const target of targets) {
      const candidates = substations.filter(s =>
        matchesLocality(s.name, target) ||
        (s.cleanName && matchesLocality(s.cleanName, target))
      );

      if (candidates.length === 1) {
        matchedSS = candidates[0];
      } else if (candidates.length > 1) {
        // Disambiguate duplicate substation names using district/circle
        const circleTarget = (outage.district_or_zone || '').toLowerCase();
        if (circleTarget.includes('north')) {
          matchedSS = candidates.find(s => (s.circle || '').toLowerCase().includes('north')) || candidates[0];
        } else if (circleTarget.includes('south')) {
          matchedSS = candidates.find(s => (s.circle || '').toLowerCase().includes('south')) || candidates[0];
        } else if (circleTarget.includes('west')) {
          matchedSS = candidates.find(s => (s.circle || '').toLowerCase().includes('west')) || candidates[0];
        } else if (circleTarget.includes('central')) {
          matchedSS = candidates.find(s => (s.circle || '').toLowerCase().includes('central')) || candidates[0];
        } else {
          matchedSS = candidates[0];
        }
      }

      if (matchedSS) {
        resolutionMethod = resolutionMethod || 'guarded_substation_match';
        confidence = Math.max(confidence, 0.85);
        break;
      }
    }
  }

  // --- TIER 3: GUARDED SECTION MATCH ---
  if (!matchedSec) {
    const secTargets = [oSec, oTown].filter(t => t && t.length >= 3);
    for (const secTarget of secTargets) {
      matchedSec = sections.find(s =>
        matchesLocality(s.name, secTarget) ||
        (s.cleanName && matchesLocality(s.cleanName, secTarget))
      );
      if (matchedSec) {
        resolutionMethod = resolutionMethod || 'guarded_section_match';
        confidence = Math.max(confidence, 0.8);
        break;
      }
    }
  }

  // --- TIER 4: GUARDED FEEDER MATCH ---
  if (!matchedSS && oFdr && oFdr.length >= 5) {
    const fdrClean = clean(oFdr);
    const isGeneric = ['local', 'bypass', 'bye pass', 'housing board', 'main road', 'bazaar'].some(g => fdrClean === g);
    if (!isGeneric) {
      matchedSS = substations.find(s => {
        return (s.feeders || []).some(f => matchesLocality(f.name, oFdr));
      });
      if (matchedSS) {
        resolutionMethod = resolutionMethod || 'guarded_feeder_match';
        confidence = Math.max(confidence, 0.8);
      }
    }
  }

  // Classification & Physical Coordinates
  let mappingStatus;
  let lat = null;
  let lng = null;

  if (matchedSS) {
    mappingStatus = 'VERIFIED_ASSET';
    lat = matchedSS.lat || null;
    lng = matchedSS.lng || null;
  } else if (matchedSec) {
    mappingStatus = 'LOCALIZED_AREA';
    lat = matchedSec.lat || null;
    lng = matchedSec.lng || null;
  } else {
    mappingStatus = 'UNMAPPED_ADVISORY';
    resolutionMethod = 'unmapped_advisory_notice';
    confidence = 0.0;
  }

  return {
    ...outage,
    latitude: lat,
    longitude: lng,
    mappingStatus,
    resolutionMethod,
    confidence,
    resolvedSubstation: matchedSS ? {
      name: matchedSS.name,
      code: matchedSS.code,
      circle: matchedSS.circle,
      voltage: matchedSS.voltage,
      lat: matchedSS.lat,
      lng: matchedSS.lng
    } : null,
    resolvedSection: matchedSec ? {
      name: matchedSec.name,
      code: matchedSec.code,
      circle: matchedSec.circle,
      lat: matchedSec.lat,
      lng: matchedSec.lng
    } : null
  };
}

function run() {
  console.log('=' .repeat(70));
  console.log('EVALUATING CHENNAI OUTAGE RESOLUTION: WITH vs. WITHOUT GOLD REGISTRY');
  console.log('=' .repeat(70));

  const outagesData = JSON.parse(fs.readFileSync(CHENNAI_OUTAGES_PATH, 'utf-8'));
  const outages = outagesData.outages || [];

  const gridData = JSON.parse(fs.readFileSync(GRID_PATH, 'utf-8'));
  const substations = gridData.substations || [];
  const sections = gridData.sections || [];

  const goldRegistry = JSON.parse(fs.readFileSync(GOLD_REGISTRY_PATH, 'utf-8'));

  console.log(`Total Outages Evaluated: ${outages.length}`);
  console.log(`Grid Reference Assets: ${substations.length} Substations, ${sections.length} Sections`);
  console.log(`Gold Registry Signatures: ${Object.keys(goldRegistry.signatures || {}).length}\n`);

  // --- Run A: WITHOUT Gold Registry ---
  console.log('Executing Run A (WITHOUT Gold Registry)...');
  const resolvedWithoutGold = outages.map(o => resolveOutage(o, substations, sections, null));

  // --- Run B: WITH Gold Registry ---
  console.log('Executing Run B (WITH Gold Registry)...');
  const resolvedWithGold = outages.map(o => resolveOutage(o, substations, sections, goldRegistry));

  // --- Metrics Computation ---
  function computeStats(records) {
    const total = records.length;
    let verifiedAsset = 0;
    let localizedArea = 0;
    let unmapped = 0;
    const methods = {};
    let sumConfidence = 0;

    for (const r of records) {
      if (r.mappingStatus === 'VERIFIED_ASSET') verifiedAsset++;
      else if (r.mappingStatus === 'LOCALIZED_AREA') localizedArea++;
      else unmapped++;

      methods[r.resolutionMethod] = (methods[r.resolutionMethod] || 0) + 1;
      sumConfidence += (r.confidence || 0);
    }

    return {
      total,
      verifiedAsset,
      verifiedAssetPct: ((verifiedAsset / total) * 100).toFixed(1) + '%',
      localizedArea,
      localizedAreaPct: ((localizedArea / total) * 100).toFixed(1) + '%',
      unmapped,
      unmappedPct: ((unmapped / total) * 100).toFixed(1) + '%',
      totalMapped: verifiedAsset + localizedArea,
      totalMappedPct: (((verifiedAsset + localizedArea) / total) * 100).toFixed(1) + '%',
      avgConfidence: (sumConfidence / total).toFixed(3),
      methods
    };
  }

  const statsWithoutGold = computeStats(resolvedWithoutGold);
  const statsWithGold = computeStats(resolvedWithGold);

  // Identify Rescued & Enhanced Outages
  const rescuedOutages = [];
  for (let i = 0; i < outages.length; i++) {
    const wo = resolvedWithoutGold[i];
    const w = resolvedWithGold[i];

    const upgradedFromUnmapped = wo.mappingStatus === 'UNMAPPED_ADVISORY' && w.mappingStatus !== 'UNMAPPED_ADVISORY';
    const upgradedToAsset = wo.mappingStatus === 'LOCALIZED_AREA' && w.mappingStatus === 'VERIFIED_ASSET';
    const confidenceBoost = w.confidence - wo.confidence;

    if (upgradedFromUnmapped || upgradedToAsset || (w.resolutionMethod === 'gold_registry_verified' && wo.resolutionMethod !== 'gold_registry_verified')) {
      rescuedOutages.push({
        outage_id: w.outage_id,
        area: w.area,
        cause: w.cause,
        without_gold: {
          status: wo.mappingStatus,
          method: wo.resolutionMethod,
          confidence: wo.confidence,
          substation: wo.resolvedSubstation?.name || null,
          section: wo.resolvedSection?.name || null
        },
        with_gold: {
          status: w.mappingStatus,
          method: w.resolutionMethod,
          confidence: w.confidence,
          substation: w.resolvedSubstation?.name || null,
          section: w.resolvedSection?.name || null
        }
      });
    }
  }

  // --- Display Comparison Table ---
  console.log('\n' + '=' .repeat(70));
  console.log('MAPPING BENCHMARK COMPARISON RESULTS:');
  console.log('=' .repeat(70));
  console.table({
    'Metric': [
      'Total Chennai Outages',
      'Physical Substation Mapped (VERIFIED_ASSET)',
      'Locality / Section Mapped (LOCALIZED_AREA)',
      'Total Successfully Resolved',
      'Unmapped Advisory Notices (UNMAPPED_ADVISORY)',
      'Average Confidence Score'
    ],
    'WITHOUT Gold Registry': [
      statsWithoutGold.total,
      `${statsWithoutGold.verifiedAsset} (${statsWithoutGold.verifiedAssetPct})`,
      `${statsWithoutGold.localizedArea} (${statsWithoutGold.localizedAreaPct})`,
      `${statsWithoutGold.totalMapped} (${statsWithoutGold.totalMappedPct})`,
      `${statsWithoutGold.unmapped} (${statsWithoutGold.unmappedPct})`,
      statsWithoutGold.avgConfidence
    ],
    'WITH Gold Registry': [
      statsWithGold.total,
      `${statsWithGold.verifiedAsset} (${statsWithGold.verifiedAssetPct})`,
      `${statsWithGold.localizedArea} (${statsWithGold.localizedAreaPct})`,
      `${statsWithGold.totalMapped} (${statsWithGold.totalMappedPct})`,
      `${statsWithGold.unmapped} (${statsWithGold.unmappedPct})`,
      statsWithGold.avgConfidence
    ]
  });

  console.log('\nRESOLUTION METHODS BREAKDOWN (Without Gold Registry):');
  console.log(statsWithoutGold.methods);

  console.log('\nRESOLUTION METHODS BREAKDOWN (With Gold Registry):');
  console.log(statsWithGold.methods);

  console.log(`\nTotal Outages Impacted / Rescued by Gold Registry: ${rescuedOutages.length}`);
  if (rescuedOutages.length > 0) {
    console.log('Sample Rescued Outages:');
    rescuedOutages.slice(0, 5).forEach((ro, idx) => {
      console.log(`  [${idx + 1}] Area: "${ro.area}"`);
      console.log(`      Without Gold: ${ro.without_gold.status} (${ro.without_gold.method}) -> SS: ${ro.without_gold.substation}`);
      console.log(`      With Gold:    ${ro.with_gold.status} (${ro.with_gold.method}) -> SS: ${ro.with_gold.substation}`);
    });
  }

  // --- Save Outputs ---
  fs.writeFileSync(OUT_WITHOUT_GOLD_PATH, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      evaluation: 'WITHOUT_GOLD_REGISTRY',
      stats: statsWithoutGold
    },
    outages: resolvedWithoutGold
  }, null, 2));

  fs.writeFileSync(OUT_WITH_GOLD_PATH, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      evaluation: 'WITH_GOLD_REGISTRY',
      stats: statsWithGold
    },
    outages: resolvedWithGold
  }, null, 2));

  fs.writeFileSync(OUT_COMPARISON_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalEvaluated: outages.length,
    withoutGoldRegistry: statsWithoutGold,
    withGoldRegistry: statsWithGold,
    rescuedCount: rescuedOutages.length,
    rescuedSamples: rescuedOutages.slice(0, 25)
  }, null, 2));

  console.log('\n' + '=' .repeat(70));
  console.log('Saved Resolved Files:');
  console.log(`1. ${OUT_WITHOUT_GOLD_PATH}`);
  console.log(`2. ${OUT_WITH_GOLD_PATH}`);
  console.log(`3. ${OUT_COMPARISON_PATH}`);
  console.log('=' .repeat(70));
}

run();
