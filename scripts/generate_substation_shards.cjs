const fs = require('fs');
const path = require('path');

const circles = ['0400', '0401', '0402', '0404', '0406', '0408', '0410', '0411'];

// Load all feeder geometries
const allFeedersBySs = {};
const allDtrsBySs = {};
const feederToSs = {};

for (const c of circles) {
  const fPath = path.join('public', 'data', 'feeders', `${c}.json`);
  if (fs.existsSync(fPath)) {
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    for (const [code, f] of Object.entries(data)) {
      const ss = f.ss_code || 'unknown';
      feederToSs[code] = ss;
      if (!allFeedersBySs[ss]) allFeedersBySs[ss] = {};
      allFeedersBySs[ss][code] = f;
    }
  }

  const dPath = path.join('public', 'data', 'dtr', `${c}.json`);
  if (fs.existsSync(dPath)) {
    const data = JSON.parse(fs.readFileSync(dPath, 'utf8'));
    for (const [feederCode, dtrs] of Object.entries(data)) {
      const ss = feederToSs[feederCode] || 'unknown';
      if (!allDtrsBySs[ss]) allDtrsBySs[ss] = {};
      allDtrsBySs[ss][feederCode] = dtrs;
    }
  }
}

const outDir = path.join('public', 'data', 'substation_feeders');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let totalShards = 0;
let totalBytes = 0;

const allSsCodes = new Set([...Object.keys(allFeedersBySs), ...Object.keys(allDtrsBySs)]);

for (const ss of allSsCodes) {
  if (ss === 'unknown' && Object.keys(allFeedersBySs[ss] || {}).length === 0) continue;
  
  const payload = {
    substationCode: ss,
    feeders: allFeedersBySs[ss] || {},
    dtrs: allDtrsBySs[ss] || {}
  };

  const minified = JSON.stringify(payload);
  const filePath = path.join(outDir, `${ss}.json`);
  fs.writeFileSync(filePath, minified, 'utf8');
  totalShards++;
  totalBytes += minified.length;
}

console.log(`Generated ${totalShards} substation feeder shards in ${outDir}`);
console.log(`Total payload size across all shards: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Average shard size: ${(totalBytes / totalShards / 1024).toFixed(1)} KB per substation`);
