/**
 * liveWeatherService.ts
 *
 * Real-time hyperlocal weather integration powered by Google Maps Platform Weather API
 * (Powered by DeepMind WeatherNext 3 AI model).
 *
 * Endpoint: https://weather.googleapis.com/v1/currentConditions:lookup
 */

/**
 * Real readings from the Weather API only. A field the API did not return is null. We never fill in a value,
 * and when the API cannot be reached the fetch returns null (weather unavailable).
 */
export interface LiveWeatherConditions {
  temperatureC: number | null;
  feelsLikeC: number | null;
  dewPointC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDirectionCardinal: string | null;
  conditionText: string | null;
  cloudCoverPercent: number | null;
  precipitationProbability: number | null;
  thunderstormProbability: number | null;
  airPressureHpa: number | null;
  visibilityKm: number | null;
  currentTime: string | null;
  isDaytime: boolean | null;
  model: 'WeatherNext 3 (Google Maps Platform)';
  /** Coordinates the reading was requested for, rounded to 2 decimals (same key as the cache). */
  locationKey: string;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

// Default Chennai Central coordinates (Ripon Building / Central Switchyard)
export const DEFAULT_CHENNAI_LAT = 13.0827;
export const DEFAULT_CHENNAI_LNG = 80.2707;

// In-memory cache with 10-minute TTL to respect quotas while keeping real-time responsiveness
interface CacheEntry {
  data: LiveWeatherConditions;
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, CacheEntry>();

/**
 * Fetch current weather conditions for given coordinates via Google Maps Weather API.
 * Returns null when the weather is unavailable (no key, network error, quota).
 */
export async function fetchLiveWeatherConditions(
  lat: number = DEFAULT_CHENNAI_LAT,
  lng: number = DEFAULT_CHENNAI_LNG
): Promise<LiveWeatherConditions | null> {
  // Round coordinates to 2 decimal places (~1.1km) for cache pooling across city nodes
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[liveWeatherService] VITE_GOOGLE_MAPS_API_KEY missing, weather unavailable');
    return null;
  }

  try {
    const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}&unitsSystem=METRIC`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[liveWeatherService] Google Maps Weather API error (${response.status})`);
      return null;
    }
    const json = await response.json();

    const liveConditions: LiveWeatherConditions = {
      temperatureC: num(json.temperature?.degrees),
      feelsLikeC: num(json.feelsLikeTemperature?.degrees),
      dewPointC: num(json.dewPoint?.degrees),
      humidityPercent: num(json.relativeHumidity),
      windSpeedKmh: num(json.wind?.speed?.value),
      windGustKmh: num(json.wind?.gust?.value),
      windDirectionCardinal: str(json.wind?.direction?.cardinal),
      conditionText: str(json.weatherCondition?.description?.text),
      cloudCoverPercent: num(json.cloudCover),
      precipitationProbability: num(json.precipitation?.probability?.percent),
      thunderstormProbability: num(json.thunderstormProbability),
      airPressureHpa: num(json.airPressure?.meanSeaLevelMillibars),
      visibilityKm: num(json.visibility?.distance),
      currentTime: str(json.currentTime),
      isDaytime: typeof json.isDaytime === 'boolean' ? json.isDaytime : null,
      model: 'WeatherNext 3 (Google Maps Platform)',
      locationKey: cacheKey
    };

    weatherCache.set(cacheKey, { data: liveConditions, timestamp: Date.now() });
    return liveConditions;
  } catch (err) {
    console.error('[liveWeatherService] Fetch exception:', err);
    return null;
  }
}
