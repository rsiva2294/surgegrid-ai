import { useState, useEffect, useCallback } from 'react';
import { loadChennaiGrid } from './services/tnebGridService';
import type { ChennaiGridData, TnebSubstation, TnebSection } from './types/tneb';
import { TnebGridMap } from './components/Map/TnebGridMap';
import { LiveWeatherPill } from './components/Map/LiveWeatherPill';
import { RefreshCw, Cpu, Sun, Moon } from 'lucide-react';
import {
  fetchLiveWeatherConditions,
  type LiveWeatherConditions,
  DEFAULT_CHENNAI_LAT,
  DEFAULT_CHENNAI_LNG
} from './services/liveWeatherService';

const EMPTY_SUBSTATIONS: TnebSubstation[] = [];
const EMPTY_SECTIONS: TnebSection[] = [];

export default function App() {
  const [gridData, setGridData] = useState<ChennaiGridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherConditions | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

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
      // null means the Weather API was unavailable: show that, never a made-up reading
      const weather = await fetchLiveWeatherConditions(useLat, useLng);
      setLiveWeather(weather);
    } catch (err) {
      console.warn('Weather fetch error in App:', err);
      setLiveWeather(null);
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
          <LiveWeatherPill
            liveWeather={liveWeather}
            selectedSubstation={selectedSubstation}
            isLoadingWeather={isLoadingWeather}
            onRefresh={() => handleRefreshWeather()}
            isLight={isLight}
          />

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
        {error ? (
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
          <>
            {/* The map mounts at once and starts loading Google Maps while the grid data downloads; markers appear when it arrives. */}
            <TnebGridMap
              theme={theme}
              substations={gridData?.substations ?? EMPTY_SUBSTATIONS}
              sections={gridData?.sections ?? EMPTY_SECTIONS}
              selectedSubstation={selectedSubstation}
              selectedSection={selectedSection}
              onSelectSubstation={setSelectedSubstation}
              onSelectSection={setSelectedSection}
              liveWeather={liveWeather}
            />
            {loading && (
              <div
                role="status"
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-md ${
                  isLight ? 'bg-white/95 border-slate-300 text-slate-700' : 'bg-slate-900/95 border-slate-700 text-slate-200'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 animate-spin ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                <span>Loading Chennai grid data...</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
