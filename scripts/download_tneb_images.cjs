/**
 * scripts/download_tneb_images.cjs
 * 
 * Downloads all unique official TNEB / TNPDCL outage bulletin images from Twitter CDN
 * into a local folder sorted chronologically by date.
 * 
 * Usage:
 *   node scripts/download_tneb_images.cjs [output_dir] [concurrency]
 * 
 * Defaults:
 *   output_dir:  data/tneb_notices_media
 *   concurrency: 10
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MANIFEST_PATH = path.join(__dirname, '..', 'scratch', 'tneb_image_manifest.json');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'data', 'tneb_notices_media');
const outputDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_DIR;
const CONCURRENCY = parseInt(process.argv[3] || '10', 10);

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`Error: Manifest not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
console.log(`\n======================================================`);
console.log(` TNEB Bulletin Media Downloader`);
console.log(` Total Unique Images: ${manifest.length}`);
console.log(` Destination Folder:  ${outputDir}`);
console.log(` Concurrency Pool:    ${CONCURRENCY} parallel streams`);
console.log(`======================================================\n`);

function normalizeDate(d) {
  if (!d) return 'unknown_date';
  const trimmed = d.trim();
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const [day, mon, yr] = trimmed.split('-');
    return `${yr}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getHighResUrl(rawUrl) {
  try {
    const urlObj = new URL(rawUrl);
    urlObj.searchParams.set('format', 'jpg');
    urlObj.searchParams.set('name', 'orig');
    return urlObj.toString();
  } catch {
    return rawUrl;
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      // Follow redirects if any (e.g. 301, 302)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });

      fileStream.on('error', err => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      fs.unlink(destPath, () => {});
      reject(new Error('Timeout'));
    });
  });
}

async function run() {
  const catalog = [];
  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Prepare tasks with deterministic filenames
  const tasks = manifest.map((item, idx) => {
    const isoDate = normalizeDate(item.date);
    const safeId = (item.tweet_id || item.id || `idx_${idx}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${isoDate}_${safeId}.jpg`;
    const fullPath = path.join(outputDir, filename);

    catalog.push({
      filename,
      date: item.date,
      isoDate,
      tweet_id: item.tweet_id,
      id: item.id,
      workType: item.workType,
      substation: item.substation,
      location: item.location,
      image_url: item.image_url
    });

    return {
      index: idx + 1,
      item,
      filename,
      fullPath,
      highResUrl: getHighResUrl(item.image_url)
    };
  });

  // Save metadata catalog alongside images
  const catalogPath = path.join(outputDir, 'metadata_catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

  let cursor = 0;
  async function worker(workerId) {
    while (cursor < tasks.length) {
      const currentIdx = cursor++;
      const task = tasks[currentIdx];

      // Check if already downloaded
      if (fs.existsSync(task.fullPath)) {
        const stats = fs.statSync(task.fullPath);
        if (stats.size > 2048) { // Valid non-empty image (> 2KB)
          skippedCount++;
          if (currentIdx % 50 === 0 || currentIdx === tasks.length - 1) {
            const pct = ((currentIdx + 1) / tasks.length * 100).toFixed(1);
            console.log(`[${currentIdx + 1}/${tasks.length}] (${pct}%) Skipped existing: ${task.filename}`);
          }
          continue;
        }
      }

      try {
        await downloadFile(task.highResUrl, task.fullPath);
        downloadedCount++;
        const stats = fs.statSync(task.fullPath);
        const kb = Math.round(stats.size / 1024);
        if (currentIdx % 20 === 0 || currentIdx === tasks.length - 1) {
          const pct = ((currentIdx + 1) / tasks.length * 100).toFixed(1);
          console.log(`[${currentIdx + 1}/${tasks.length}] (${pct}%) Downloaded: ${task.filename} (${kb} KB)`);
        }
      } catch (err) {
        // Fallback: try raw URL without ?name=orig
        try {
          await downloadFile(task.item.image_url, task.fullPath);
          downloadedCount++;
        } catch (e2) {
          failedCount++;
          console.warn(`[WARN] Failed to download ${task.item.image_url}: ${e2.message}`);
        }
      }
    }
  }

  const pool = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    pool.push(worker(i + 1));
  }

  await Promise.all(pool);

  console.log(`\n======================================================`);
  console.log(` Download Complete!`);
  console.log(` Newly Downloaded: ${downloadedCount}`);
  console.log(` Already Existed:  ${skippedCount}`);
  console.log(` Failed:           ${failedCount}`);
  console.log(` Total in Folder:  ${downloadedCount + skippedCount}`);
  console.log(` Catalog Metadata: ${catalogPath}`);
  console.log(` Destination:      ${outputDir}`);
  console.log(`======================================================\n`);
}

run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
