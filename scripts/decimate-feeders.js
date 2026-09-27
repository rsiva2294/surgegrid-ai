import fs from 'fs';
import path from 'path';

const FEEDERS_DIR = path.resolve('public/data/feeders');

function sqDist(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

function sqDistToSegment(p, p1, p2) {
  const x = p1[0], y = p1[1];
  const dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      return sqDist(p, p2);
    } else if (t > 0) {
      return sqDist(p, [x + dx * t, y + dy * t]);
    }
  }
  return sqDist(p, p1);
}

/**
 * Ramer-Douglas-Peucker line simplification
 */
function rdp(points, epsilonSq) {
  if (points.length <= 2) return points;
  let maxSqDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = sqDistToSegment(points[i], points[0], points[points.length - 1]);
    if (d > maxSqDist) {
      maxSqDist = d;
      index = i;
    }
  }
  if (maxSqDist > epsilonSq) {
    const left = rdp(points.slice(0, index + 1), epsilonSq);
    const right = rdp(points.slice(index), epsilonSq);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

function processFile(filePath) {
  const fileName = path.basename(filePath);
  const origSize = fs.statSync(filePath).size;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const cleaned = {};
  let totalOrigPts = 0;
  let totalNewPts = 0;

  for (const k of Object.keys(raw)) {
    const f = raw[k];
    if (!f.coords) {
      cleaned[k] = f;
      continue;
    }
    const isMulti = f.type === 'MultiLineString';
    const segs = isMulti ? f.coords : [f.coords];
    const newSegs = [];

    for (const seg of segs) {
      if (!Array.isArray(seg)) continue;
      totalOrigPts += seg.length;

      // 1. 5 decimal precision & deduplicate identical consecutive vertices
      const deduped = [];
      for (let i = 0; i < seg.length; i++) {
        if (!Array.isArray(seg[i]) || seg[i].length < 2) continue;
        const pt = [Number(seg[i][0].toFixed(5)), Number(seg[i][1].toFixed(5))];
        if (
          deduped.length === 0 ||
          deduped[deduped.length - 1][0] !== pt[0] ||
          deduped[deduped.length - 1][1] !== pt[1]
        ) {
          deduped.push(pt);
        }
      }

      // 2. RDP simplification with ~3m tolerance (0.00003 deg -> sq ~ 9e-10)
      const simplified = deduped.length >= 3 ? rdp(deduped, 9e-10) : deduped;

      // 3. Ensure valid GeoJSON line length (minimum 2 points)
      if (simplified.length >= 2) {
        newSegs.push(simplified);
        totalNewPts += simplified.length;
      } else if (simplified.length === 1) {
        newSegs.push([simplified[0], simplified[0]]);
        totalNewPts += 2;
      }
    }

    cleaned[k] = {
      ...f,
      coords: isMulti ? newSegs : (newSegs[0] || [])
    };
  }

  const outputStr = JSON.stringify(cleaned);
  fs.writeFileSync(filePath, outputStr, 'utf8');
  const newSize = Buffer.byteLength(outputStr, 'utf8');

  return {
    fileName,
    origSize,
    newSize,
    totalOrigPts,
    totalNewPts
  };
}

function run() {
  const files = fs.readdirSync(FEEDERS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Processing ${files.length} feeder circle files in ${FEEDERS_DIR}...\n`);

  let grandOrigSize = 0;
  let grandNewSize = 0;
  let grandOrigPts = 0;
  let grandNewPts = 0;

  for (const f of files) {
    const fullPath = path.join(FEEDERS_DIR, f);
    const res = processFile(fullPath);
    grandOrigSize += res.origSize;
    grandNewSize += res.newSize;
    grandOrigPts += res.totalOrigPts;
    grandNewPts += res.totalNewPts;

    const sizeSavedPct = ((1 - res.newSize / res.origSize) * 100).toFixed(1);
    const ptSavedPct = ((1 - res.totalNewPts / res.totalOrigPts) * 100).toFixed(1);

    console.log(
      `${res.fileName}: ${(res.origSize / 1024 / 1024).toFixed(2)} MB -> ${(res.newSize / 1024 / 1024).toFixed(2)} MB ` +
      `(-${sizeSavedPct}%) | Points: ${res.totalOrigPts} -> ${res.totalNewPts} (-${ptSavedPct}%)`
    );
  }

  const totalSavedSizeMb = ((grandOrigSize - grandNewSize) / 1024 / 1024).toFixed(2);
  const totalSavedPct = ((1 - grandNewSize / grandOrigSize) * 100).toFixed(1);
  const totalPtSavedPct = ((1 - grandNewPts / grandOrigPts) * 100).toFixed(1);

  console.log('\n================ SUMMARY ================');
  console.log(`Original Total: ${(grandOrigSize / 1024 / 1024).toFixed(2)} MB (${grandOrigPts.toLocaleString()} vertices)`);
  console.log(`Optimized Total: ${(grandNewSize / 1024 / 1024).toFixed(2)} MB (${grandNewPts.toLocaleString()} vertices)`);
  console.log(`Total Reduction: -${totalSavedSizeMb} MB (-${totalSavedPct}%)`);
  console.log(`Vertices Saved: -${(grandOrigPts - grandNewPts).toLocaleString()} (-${totalPtSavedPct}%)`);
}

run();
