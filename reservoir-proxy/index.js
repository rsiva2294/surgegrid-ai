/**
 * surgegridReservoirs: small relay between the SurgeGrid AI browser app and the CMWSSB Lake Level page.
 *
 * CMWSSB (Chennai Metropolitan Water Supply and Sewerage Board) publishes the daily storage of the six Chennai
 * supply reservoirs as an HTML table at https://cmwssb.tn.gov.in/lake-level. The page has no API and no CORS headers,
 * so the browser cannot read it. This function reads the table and returns it as JSON, unchanged: no estimates.
 *
 * Protections (the function must be publicly callable, so it defends itself):
 * - only GET from allowed website origins
 * - one upstream fetch per 30 minutes per instance (cached), so visitors never hit CMWSSB directly
 * - per-IP rate limit and a low max-instances setting on the deployment
 */

const functions = require('@google-cloud/functions-framework');

const SOURCE_URL = 'https://cmwssb.tn.gov.in/lake-level';
const CACHE_MS = 30 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 15000;
const RATE_LIMIT = { windowMs: 5 * 60 * 1000, max: 60 };

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://surgegrid.web.app',
  'https://surgegrid.firebaseapp.com',
];
const ALLOWED_ORIGINS = new Set(
  DEFAULT_ORIGINS.concat((process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean))
);

const hits = new Map();
let cache = null; // { at, data }

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some(t => now - t < RATE_LIMIT.windowMs)) hits.delete(k);
  }
  return recent.length > RATE_LIMIT.max;
}

const text = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const num = s => {
  const v = parseFloat(String(s).replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
};

/** Reads the reservoir table. Returns null unless the page has the expected columns and at least one reservoir. */
function parse(html) {
  const dateMatch = html.match(/Lake Storage As On\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const start = html.indexOf('lack-view');
  if (!dateMatch || start < 0) return null;
  const table = html.slice(start, html.indexOf('</table>', start));
  const rows = (table.match(/<tr[\s\S]*?<\/tr>/gi) || []).map(tr => (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(text));
  const header = rows[0] || [];
  if (header.length !== 10 || !/full capacity/i.test(header[2]) || !/storage \(mcft\)/i.test(header[4])) return null;

  const read = c => ({
    fullTankFt: num(c[1]),
    capacityMcft: num(c[2]),
    levelFt: num(c[3]),
    storageMcft: num(c[4]),
    storagePct: num(c[5]),
    inflowCusecs: num(c[6]),
    outflowCusecs: num(c[7]),
    rainfallMm: num(c[8]),
    lastYearStorageMcft: num(c[9]),
  });
  const reservoirs = [];
  let total = null;
  for (const c of rows.slice(1)) {
    if (c.length !== 10) continue;
    if (/^total$/i.test(c[0])) total = read(c);
    else reservoirs.push({ name: c[0], ...read(c) });
  }
  if (reservoirs.length === 0 || !total || total.storagePct === null) return null;
  return {
    asOn: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`,
    source: 'CMWSSB Lake Level',
    sourceUrl: SOURCE_URL,
    reservoirs,
    total,
  };
}

async function load() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'SurgeGridAI/1.0 (+https://surgegrid.web.app)' }, signal: ctl.signal });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = parse(await res.text());
    if (!data) throw new Error('unexpected page layout');
    cache = { at: Date.now(), data };
    return data;
  } catch (err) {
    // Serve the last good copy for up to a day rather than nothing; the page always shows its "as on" date.
    if (cache && Date.now() - cache.at < 24 * 60 * 60 * 1000) return cache.data;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

functions.http('surgegridReservoirs', async (req, res) => {
  const origin = req.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin);
  if (allowed) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Max-Age', '3600');
  }
  if (req.method === 'OPTIONS') {
    res.status(allowed ? 204 : 403).send('');
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }
  // Same-origin GETs through Hosting send no Origin header; only block a foreign one.
  if (origin && !allowed) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  const ip = (req.get('x-forwarded-for') || req.ip || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests, try again shortly' });
    return;
  }
  try {
    const data = await load();
    res.set('Cache-Control', 'public, max-age=600');
    res.status(200).json(data);
  } catch (err) {
    console.warn('Reservoir relay error', err && err.message);
    res.status(502).json({ error: 'Reservoir data unavailable' });
  }
});
