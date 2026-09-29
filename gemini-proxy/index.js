/**
 * surgegridGemini: small proxy between the SurgeGrid AI browser app and Gemini.
 *
 * The browser sends a Gemini generateContent body to this function. The function checks it,
 * forces the model, and forwards it to Google Cloud's Gemini Enterprise Agent Platform
 * (formerly Vertex AI) using its own service account. No API key exists anywhere.
 *
 * Protections (the function must be publicly callable, so it defends itself):
 * - only POST from allowed website origins
 * - request size cap, model fixed, only whitelisted generation settings pass through
 * - per-IP rate limit and a low max-instances setting on the deployment
 */

const functions = require('@google-cloud/functions-framework');
const { GoogleAuth } = require('google-auth-library');

const PROJECT = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'namma-map-407ca';
const LOCATION = process.env.GEMINI_LOCATION || 'asia-south1';
const MODEL = 'gemini-2.5-flash';
const MAX_BODY_BYTES = 30 * 1024;
const MAX_OUTPUT_TOKENS = 4096;
const UPSTREAM_TIMEOUT_MS = 40000;
const RATE_LIMIT = { windowMs: 5 * 60 * 1000, max: 120 };

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://surgegrid.web.app',
  'https://surgegrid.firebaseapp.com',
];
const ALLOWED_ORIGINS = new Set(
  DEFAULT_ORIGINS.concat((process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean))
);

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const hits = new Map(); // ip -> array of timestamps (best effort, per instance)

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

/** Keep only the parts of the request we allow. Returns null if the body is not acceptable. */
function sanitize(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.contents) || body.contents.length === 0) return null;
  const out = { contents: body.contents };
  if (body.systemInstruction && typeof body.systemInstruction === 'object') out.systemInstruction = body.systemInstruction;

  const g = body.generationConfig && typeof body.generationConfig === 'object' ? body.generationConfig : {};
  const gc = {};
  if (g.responseMimeType === 'application/json') gc.responseMimeType = 'application/json';
  if (g.responseSchema && typeof g.responseSchema === 'object') gc.responseSchema = g.responseSchema;
  if (typeof g.temperature === 'number' && g.temperature >= 0 && g.temperature <= 1) gc.temperature = g.temperature;
  gc.maxOutputTokens = Math.min(typeof g.maxOutputTokens === 'number' ? g.maxOutputTokens : MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS);
  if (g.thinkingConfig && typeof g.thinkingConfig.thinkingBudget === 'number') {
    gc.thinkingConfig = { thinkingBudget: Math.max(0, Math.min(g.thinkingConfig.thinkingBudget, 1024)) };
  }
  out.generationConfig = gc;
  return out;
}

functions.http('surgegridGemini', async (req, res) => {
  const origin = req.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin);

  if (allowed) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
  }

  if (req.method === 'OPTIONS') {
    res.status(allowed ? 204 : 403).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  if (!allowed) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  const ip = (req.get('x-forwarded-for') || req.ip || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests, try again shortly' });
    return;
  }

  const size = Number(req.get('content-length') || 0);
  if (size > MAX_BODY_BYTES || (req.rawBody && req.rawBody.length > MAX_BODY_BYTES)) {
    res.status(413).json({ error: 'Request too large' });
    return;
  }

  const payload = sanitize(req.body);
  if (!payload) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS);
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    clearTimeout(timer);

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data) {
      console.warn('Upstream Gemini error', upstream.status);
      res.status(502).json({ error: 'Gemini request failed' });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.warn('Proxy error', err && err.name);
    res.status(502).json({ error: 'Gemini request failed' });
  }
});
