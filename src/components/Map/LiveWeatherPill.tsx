import React from 'react';
import type { LiveWeatherConditions } from '../../services/liveWeatherService';
import type { TnebSubstation } from '../../types/tneb';
import {
  SunMedium,
  CloudSun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Cloud,
  Wind,
  Droplets,
  RefreshCw,
  Zap
} from 'lucide-react';

interface LiveWeatherPillProps {
  liveWeather: LiveWeatherConditions;
  selectedSubstation: TnebSubstation | null;
  isLoadingWeather: boolean;
  onRefresh: () => void;
  isLight: boolean;
}

// Convert cardinal word (e.g. "SOUTHEAST") to compact abbreviation ("SE")
function formatWindDirection(cardinal: string): string {
  if (!cardinal) return '';
  const trimmed = cardinal.trim().toUpperCase();
  const map: Record<string, string> = {
    NORTH: 'N',
    SOUTH: 'S',
    EAST: 'E',
    WEST: 'W',
    NORTHEAST: 'NE',
    NORTHWEST: 'NW',
    SOUTHEAST: 'SE',
    SOUTHWEST: 'SW',
    'NORTH-NORTHEAST': 'NNE',
    'EAST-NORTHEAST': 'ENE',
    'EAST-SOUTHEAST': 'ESE',
    'SOUTH-SOUTHEAST': 'SSE',
    'SOUTH-SOUTHWEST': 'SSW',
    'WEST-SOUTHWEST': 'WSW',
    'WEST-NORTHWEST': 'WNW',
    'NORTH-NORTHWEST': 'NNW'
  };
  return map[trimmed] || trimmed;
}

// Select matching modern weather icon based on current condition string
function getWeatherIcon(conditionText: string = '', isDaytime: boolean = true) {
  const text = conditionText.toLowerCase();

  if (text.includes('thunder') || text.includes('lightning') || text.includes('storm')) {
    return <CloudLightning className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  }
  if (text.includes('rain') || text.includes('drizzle') || text.includes('shower')) {
    return <CloudRain className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
  }
  if (text.includes('fog') || text.includes('mist') || text.includes('haze')) {
    return <CloudFog className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
  if (text.includes('partly') || text.includes('scattered') || text.includes('few') || text.includes('broken')) {
    return <CloudSun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />;
  }
  if (text.includes('cloud') || text.includes('overcast')) {
    return <Cloud className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
  if (text.includes('clear') || text.includes('sunny')) {
    return isDaytime ? (
      <SunMedium className="w-3.5 h-3.5 text-amber-500 shrink-0" />
    ) : (
      <CloudSun className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
    );
  }

  return <SunMedium className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
}

export const LiveWeatherPill: React.FC<LiveWeatherPillProps> = ({
  liveWeather,
  selectedSubstation,
  isLoadingWeather,
  onRefresh,
  isLight
}) => {
  const shortWindDir = formatWindDirection(liveWeather.windDirectionCardinal);
  const locationLabel = selectedSubstation ? selectedSubstation.name : 'Chennai Central';
  const locationTitle = selectedSubstation
    ? `Hyperlocal Switchyard Weather for ${selectedSubstation.name} (${selectedSubstation.lat.toFixed(4)}°N, ${selectedSubstation.lng.toFixed(4)}°E)`
    : 'City-wide Grid Weather (Chennai Central • 13.0827°N, 80.2707°E)';

  return (
    <div
      className={`group relative flex items-center gap-1.5 sm:gap-2.5 px-3 py-1.5 rounded-full border text-xs backdrop-blur-md transition-all duration-200 select-none ${
        isLight
          ? 'bg-slate-50/95 hover:bg-white border-slate-200/90 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-slate-900/[0.03]'
          : 'bg-slate-900/85 hover:bg-slate-900 border-slate-700/80 text-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ring-1 ring-white/[0.05]'
      }`}
    >
      {/* 1. Live Telemetry Node / Substation Pin */}
      <div
        className="flex items-center gap-1.5 shrink-0 max-w-[110px] xs:max-w-[150px] sm:max-w-[210px] cursor-default"
        title={locationTitle}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />

        {selectedSubstation ? (
          <span className="hidden xs:inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <Zap className="w-2.5 h-2.5" />
            <span>SS</span>
          </span>
        ) : (
          <span className="hidden xs:inline-flex px-1 py-0.2 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            GRID
          </span>
        )}

        <span className="font-semibold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 tracking-tight truncate">
          {locationLabel}
        </span>
      </div>

      {/* Hairline Divider */}
      <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700/80 shrink-0" />

      {/* 2. Dynamic Weather Metric Cluster */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Temperature & Dynamic Icon */}
        <div
          className="flex items-center gap-1.5 cursor-default"
          title={`Temperature ${liveWeather.temperatureC.toFixed(1)}°C (Feels like ${liveWeather.feelsLikeC.toFixed(1)}°C)`}
        >
          {getWeatherIcon(liveWeather.conditionText, liveWeather.isDaytime)}
          <span className="font-semibold font-mono text-xs text-slate-900 dark:text-slate-100 tracking-tight">
            {liveWeather.temperatureC.toFixed(1)}
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-0.5">°C</span>
          </span>
        </div>

        {/* Wind Speed & Cardinal Direction (Responsive) */}
        <div
          className="hidden sm:flex items-center gap-1 cursor-default"
          title={`Wind Speed: ${liveWeather.windSpeedKmh} km/h ${liveWeather.windDirectionCardinal} • Gusts: ${liveWeather.windGustKmh} km/h`}
        >
          <Wind className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
            {liveWeather.windSpeedKmh}
            <span className={`text-[10px] font-sans ml-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>km/h</span>
          </span>
          {shortWindDir && (
            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tracking-wider uppercase border border-slate-200/80 dark:border-slate-700/60 shrink-0">
              {shortWindDir}
            </span>
          )}
        </div>

        {/* Relative Humidity (Responsive) */}
        <div
          className="hidden md:flex items-center gap-1 cursor-default"
          title={`Relative Humidity: ${liveWeather.humidityPercent}% • Dew Point: ${liveWeather.dewPointC?.toFixed(1) ?? '--'}°C`}
        >
          <Droplets className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
            {liveWeather.humidityPercent}%
          </span>
        </div>

        {/* Weather Condition Badge */}
        {liveWeather.conditionText && (
          <span
            className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs shrink-0"
            title={`${liveWeather.conditionText} • Google WeatherNext 3 Model`}
          >
            {liveWeather.conditionText}
          </span>
        )}
      </div>

      {/* Hairline Divider */}
      <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700/80 shrink-0" />

      {/* 3. Refresh Action Button */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoadingWeather}
        className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 active:scale-90 transition-all shrink-0 focus:outline-hidden disabled:opacity-50"
        title="Google Maps Platform Weather API (DeepMind WeatherNext 3) • Click to refresh"
        aria-label="Refresh live weather"
      >
        <RefreshCw
          className={`w-3 h-3 text-slate-500 dark:text-slate-400 ${
            isLoadingWeather ? 'animate-spin text-sky-500' : ''
          }`}
        />
      </button>
    </div>
  );
};
