import { useState, useEffect, useCallback } from 'react';
import { loadChennaiGrid } from './services/tnebGridService';
import type { ChennaiGridData, TnebSubstation, TnebSection } from './types/tneb';
import { TnebGridMap } from './components/Map/TnebGridMap';
import { RefreshCw, Cpu, Sun, Moon } from 'lucide-react';
import {
  fetchLiveWeatherConditions,
  type LiveWeatherConditions,
  DEFAULT_CHENNAI_LAT,
  DEFAULT_CHENNAI_LNG
} from './services/liveWeatherService';

export default function App() {
  const [gridData, setGridData] = useState<ChennaiGridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherConditions | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('sg_theme') as 'light' | 'dark') || 'light';
  });

  const [selectedSubstation, setSelectedSubstation] = useState<TnebSubstation | null>(null);
  const [selectedSection, setSelectedSection] = useState<TnebSection | null>(null);

  useEffect(() => {
    loadChennaiGrid()
      .then((data) => {
        setGridData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Chennai TNEB grid data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch live weather from Google Maps Platform Weather API (DeepMind WeatherNext 3)
  // Dynamically uses selected substation coordinates if a switchyard is selected, or Chennai Central
  const handleRefreshWeather = useCallback(async (lat?: number, lng?: number) => {
    setIsLoadingWeather(true);
    const useLat = lat ?? selectedSubstation?.lat ?? DEFAULT_CHENNAI_LAT;
    const useLng = lng ?? selectedSubstation?.lng ?? DEFAULT_CHENNAI_LNG;
    try {
      const weather = await fetchLiveWeatherConditions(useLat, useLng);
      setLiveWeather(weather);
    } catch (err) {
      console.warn('Weather fetch error in App:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  }, [selectedSubstation?.lat, selectedSubstation?.lng]);

  useEffect(() => {
    handleRefreshWeather(selectedSubstation?.lat, selectedSubstation?.lng);
    const interval = setInterval(() => {
      handleRefreshWeather(selectedSubstation?.lat, selectedSubstation?.lng);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedSubstation?.lat, selectedSubstation?.lng, handleRefreshWeather]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sg_theme', next);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const isLight = theme === 'light';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Cockpit Header */}
      <header className={`h-14 px-5 flex items-center justify-between z-40 shrink-0 border-b transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-md'
      }`}>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md shadow-cyan-500/20 border overflow-hidden shrink-0 ${
            isLight ? 'border-slate-200' : 'border-cyan-500/30'
          }`}>
            <picture>
              <source srcSet="/logo-64.webp 1x, /logo-128.webp 2x" type="image/webp" />
              <img
                src="/logo-64.png"
                alt="SurgeGrid AI"
                width={36}
                height={36}
                loading="eager"
                decoding="async"
                className="w-full h-full object-contain p-0.5"
              />
            </picture>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-sm font-extrabold tracking-wide uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                SurgeGrid AI
              </h1>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border tracking-wide ${
                isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              }`}>
                V5.0
              </span>
            </div>
            <p className={`text-xs font-medium hidden sm:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Chennai's Real-Time Grid &amp; Flood Resiliency Console
            </p>
          </div>
        </div>

        {/* Telemetry Controls & Live Weather */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Live Weather Widget (Google Maps Platform Weather API - WeatherNext 3) */}
          {liveWeather && (
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-all ${
              isLight
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs ring-1 ring-emerald-500/10'
                : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200 shadow-2xs ring-1 ring-emerald-500/10'
            }`}>
              <div className="flex items-center gap-1.5 shrink-0 max-w-[100px] xs:max-w-[140px] sm:max-w-[240px]">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span
                  className="font-bold text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 truncate"
                  title={
                    selectedSubstation
                      ? `Hyperlocal Switchyard Weather for ${selectedSubstation.name} (${selectedSubstation.lat.toFixed(4)}°N, ${selectedSubstation.lng.toFixed(4)}°E)`
                      : 'City-wide Grid Weather (Chennai Central • 13.0827°N, 80.2707°E)'
                  }
                >
                  {selectedSubstation ? selectedSubstation.name : 'Chennai Central'}
                </span>
              </div>

              <span className={isLight ? 'text-emerald-300' : 'text-emerald-800'}>|</span>

              <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs">
                <span className="font-bold whitespace-nowrap" title={`Feels like ${liveWeather.feelsLikeC.toFixed(1)}°C`}>
                  🌡️ {liveWeather.temperatureC.toFixed(1)}°C
                </span>

                <span className="hidden sm:inline text-xs" title={`Wind: ${liveWeather.windDirectionCardinal}, Gusts: ${liveWeather.windGustKmh} km/h`}>
                  💨 {liveWeather.windSpeedKmh} km/h {liveWeather.windDirectionCardinal}
                </span>

                <span className="hidden md:inline text-xs" title="Relative Humidity">
                  💧 {liveWeather.humidityPercent}% RH
                </span>

                <span className={`hidden md:inline text-[11px] font-sans font-medium px-1.5 py-0.5 rounded ${
                  isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                }`}>
                  {liveWeather.conditionText}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleRefreshWeather()}
                className={`p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 ${
                  isLoadingWeather ? 'animate-spin' : ''
                }`}
                title="Google Maps Platform Weather API (DeepMind WeatherNext 3) • Click to refresh"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          )}

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl font-medium text-xs transition-all shadow-sm border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-slate-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
            aria-label={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            {isLight ? (
              <>
                <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold hidden sm:inline">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold hidden sm:inline">Light Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Map Viewport */}
      <main className="flex-1 relative w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        {loading ? (
          <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${
            isLight ? 'bg-slate-50' : 'bg-slate-950'
          }`}>
            <RefreshCw className={`w-8 h-8 animate-spin ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
            <p className={`text-sm font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Extracting Chennai TNEB Grid Topology...
            </p>
          </div>
        ) : error ? (
          <div className={`w-full h-full flex flex-col items-center justify-center p-6 text-center ${
            isLight ? 'bg-slate-50' : 'bg-slate-950'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-3">
              <Cpu className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-red-600 mb-1">Failed to Load Chennai Grid Data</h2>
            <p className="text-xs text-red-500 max-w-md mb-4">{error}</p>
          </div>
        ) : (
          <TnebGridMap
            theme={theme}
            substations={gridData?.substations || []}
            sections={gridData?.sections || []}
            selectedSubstation={selectedSubstation}
            selectedSection={selectedSection}
            onSelectSubstation={setSelectedSubstation}
            onSelectSection={setSelectedSection}
            liveWeather={liveWeather}
          />
        )}
      </main>
    </div>
  );
}
