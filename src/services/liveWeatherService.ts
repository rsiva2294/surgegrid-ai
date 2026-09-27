/**
 * liveWeatherService.ts
 *
 * Real-time hyperlocal weather integration powered by Google Maps Platform Weather API
 * (Powered by DeepMind WeatherNext 3 AI model).
 *
 * Endpoint: https://weather.googleapis.com/v1/currentConditions:lookup
 */

export interface LiveWeatherConditions {
  temperatureC: number;
  feelsLikeC: number;
  dewPointC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionCardinal: string;
  windDirectionDegrees: number;
  conditionText: string;
  conditionType: string;
  iconUri: string;
  cloudCoverPercent: number;
  precipitationProbability: number;
  thunderstormProbability: number;
  airPressureHpa: number;
  visibilityKm: number;
  currentTime: string;
  isDaytime: boolean;
  model: 'WeatherNext 3 (Google Maps Platform)';
  isSimulatedFallback?: boolean;
}

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
 * Fetch current weather conditions for given coordinates via Google Maps Weather API
 */
export async function fetchLiveWeatherConditions(
  lat: number = DEFAULT_CHENNAI_LAT,
  lng: number = DEFAULT_CHENNAI_LNG
): Promise<LiveWeatherConditions> {
  // Round coordinates to 2 decimal places (~1.1km) for intelligent cache pooling across city nodes
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('[liveWeatherService] VITE_GOOGLE_MAPS_API_KEY missing, using fallback telemetry');
    return getFallbackWeather();
  }

  try {
    const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}&unitsSystem=METRIC`;
    const response = await fetch(url);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[liveWeatherService] Google Maps Weather API error (${response.status}):`, errText);
      return getFallbackWeather();
    }

    const json = await response.json();

    const liveConditions: LiveWeatherConditions = {
      temperatureC: json.temperature?.degrees ?? 30.0,
      feelsLikeC: json.feelsLikeTemperature?.degrees ?? 36.0,
      dewPointC: json.dewPoint?.degrees ?? 25.0,
      humidityPercent: json.relativeHumidity ?? 75,
      windSpeedKmh: json.wind?.speed?.value ?? 6,
      windGustKmh: json.wind?.gust?.value ?? 8,
      windDirectionCardinal: json.wind?.direction?.cardinal || 'EAST',
      windDirectionDegrees: json.wind?.direction?.degrees ?? 90,
      conditionText: json.weatherCondition?.description?.text || 'Clear with periodic clouds',
      conditionType: json.weatherCondition?.type || 'MOSTLY_CLEAR',
      iconUri: json.weatherCondition?.iconBaseUri || 'https://maps.gstatic.com/weather/v1/mostly_clear',
      cloudCoverPercent: json.cloudCover ?? 25,
      precipitationProbability: json.precipitation?.probability?.percent ?? 0,
      thunderstormProbability: json.thunderstormProbability ?? 0,
      airPressureHpa: json.airPressure?.meanSeaLevelMillibars ?? 1009,
      visibilityKm: json.visibility?.distance ?? 16,
      currentTime: json.currentTime || new Date().toISOString(),
      isDaytime: json.isDaytime ?? false,
      model: 'WeatherNext 3 (Google Maps Platform)',
      isSimulatedFallback: false
    };

    weatherCache.set(cacheKey, {
      data: liveConditions,
      timestamp: Date.now()
    });

    return liveConditions;
  } catch (err) {
    console.error('[liveWeatherService] Fetch exception:', err);
    return getFallbackWeather();
  }
}

/**
 * Fallback telemetry for offline resilience
 */
function getFallbackWeather(): LiveWeatherConditions {
  return {
    temperatureC: 30.2,
    feelsLikeC: 37.5,
    dewPointC: 26.1,
    humidityPercent: 78,
    windSpeedKmh: 5,
    windGustKmh: 7,
    windDirectionCardinal: 'EAST_SOUTHEAST',
    windDirectionDegrees: 107,
    conditionText: 'Clear with periodic clouds',
    conditionType: 'MOSTLY_CLEAR',
    iconUri: 'https://maps.gstatic.com/weather/v1/mostly_clear',
    cloudCoverPercent: 26,
    precipitationProbability: 0,
    thunderstormProbability: 0,
    airPressureHpa: 1009.24,
    visibilityKm: 16,
    currentTime: new Date().toISOString(),
    isDaytime: false,
    model: 'WeatherNext 3 (Google Maps Platform)',
    isSimulatedFallback: true
  };
}
