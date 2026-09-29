/**
 * geminiClient.ts
 *
 * Shared browser client for Gemini. It calls our own proxy (gemini-proxy/), never Google directly,
 * so no API key exists in the app. The proxy runs on Google Cloud and calls Gemini 2.5 Flash on the
 * Gemini Enterprise Agent Platform (formerly Vertex AI) with its own service account.
 *
 * Every caller must treat a null result as "Gemini not available" and use its rule-based fallback.
 */

const PROXY_URL: string = (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined) || '/api/gemini';
const REQUEST_TIMEOUT_MS = 30000;
const FAILURES_BEFORE_PAUSE = 3;
const PAUSE_MS = 60000;

let consecutiveFailures = 0;
let pausedUntil = 0;

export interface GeminiJsonRequest {
  systemInstruction: string;
  prompt: string;
  /** Gemini responseSchema (OpenAPI subset with upper-case type names). */
  responseSchema: Record<string, unknown>;
  temperature?: number;
}

function recordFailure(reason: string): null {
  consecutiveFailures += 1;
  console.warn('Gemini proxy call failed:', reason);
  if (consecutiveFailures >= FAILURES_BEFORE_PAUSE) {
    pausedUntil = Date.now() + PAUSE_MS;
    consecutiveFailures = 0;
  }
  return null;
}

/** Sends a prompt and returns the parsed JSON reply, or null if Gemini is unavailable or the reply is unusable. */
export async function generateJson(req: GeminiJsonRequest): Promise<unknown | null> {
  if (Date.now() < pausedUntil) return null;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: req.responseSchema,
          temperature: req.temperature ?? 0.2,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: ctl.signal,
    });
    if (!res.ok) return recordFailure(`HTTP ${res.status}`);

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== 'string' || rawText === '') return recordFailure('empty reply');

    const parsed = JSON.parse(rawText);
    consecutiveFailures = 0;
    return parsed;
  } catch (err) {
    return recordFailure(err instanceof Error ? err.name : 'unknown error');
  } finally {
    clearTimeout(timer);
  }
}
