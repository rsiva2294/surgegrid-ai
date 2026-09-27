import { useState, useEffect, useCallback } from 'react';
import { loadChennaiGrid } from './services/tnebGridService';
import type { ChennaiGridData, TnebSubstation, TnebSection } from './types/tneb';
import { TnebGridMap } from './components/Map/TnebGridMap';
import { Zap, ShieldCheck, RefreshCw, Cpu, Sun, Moon } from 'lucide-react';
import { fetchLiveWeatherConditions, type LiveWeatherConditions } from './services/liveWeatherService';

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
  const handleRefreshWeather = useCallback(async () => {
    setIsLoadingWeather(true);
    try {
      const weather = await fetchLiveWeatherConditions();
      setLiveWeather(weather);
    } catch (err) {
      console.warn('Weather fetch error in App:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    handleRefreshWeather();
    const interval = setInterval(handleRefreshWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handleRefreshWeather]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sg_theme', next);
  };

  const isLight = theme === 'light';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Cockpit Header */}
      <header className={`h-14 px-5 flex items-center justify-between z-40 shrink-0 border-b transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-md'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-sm font-extrabold tracking-wide uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                SurgeGrid AI
              </h1>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold border tracking-wide ${
                isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              }`}>
                GROUND-TRUTH GRID V5
              </span>
            </div>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              GROUND-TRUTH GRID V5 • 271 SUBSTATIONS • 42K+ DTRs
            </p>
          </div>
        </div>

        {/* Telemetry Stats Bar & Controls */}
        <div className="flex items-center gap-3 text-xs">
          {/* Live Weather Widget (Google Maps Platform Weather API - WeatherNext 3) */}
          {liveWeather && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              isLight
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs ring-1 ring-emerald-500/10'
                : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200 shadow-2xs ring-1 ring-emerald-500/10'
            }`}>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Live Weather
                </span>
              </div>

              <span className={isLight ? 'text-emerald-300' : 'text-emerald-800'}>|</span>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="font-bold" title={`Feels like ${liveWeather.feelsLikeC.toFixed(1)}°C`}>
                  🌡️ {liveWeather.temperatureC.toFixed(1)}°C
                </span>

                <span className="hidden md:inline text-xs" title={`Wind: ${liveWeather.windDirectionCardinal}, Gusts: ${liveWeather.windGustKmh} km/h`}>
                  💨 {liveWeather.windSpeedKmh} km/h {liveWeather.windDirectionCardinal}
                </span>

                <span className="hidden lg:inline text-xs" title="Relative Humidity">
                  💧 {liveWeather.humidityPercent}% RH
                </span>

                <span className={`text-[11px] font-sans font-medium px-1.5 py-0.5 rounded ${
                  isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                }`}>
                  {liveWeather.conditionText}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefreshWeather}
                className={`p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 ${
                  isLoadingWeather ? 'animate-spin' : ''
                }`}
                title="Google Maps Platform Weather API (DeepMind WeatherNext 3) • Click to refresh"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          )}

          {gridData && (
            <div className={`hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full animate-pulse ${isLight ? 'bg-sky-600' : 'bg-cyan-400'}`}></span>
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Chennai Substations:</span>
                <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {gridData.counts.substations}
                </span>
              </div>
              <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>AE Section Offices:</span>
                <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
                  {gridData.counts.sections}
                </span>
              </div>
            </div>
          )}

          <div className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Map Status:</span>
            <span className="font-mono text-emerald-600 font-semibold">Active</span>
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-xs transition-all shadow-sm border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-slate-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            {isLight ? (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">Light Mode</span>
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
