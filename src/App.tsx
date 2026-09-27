import { useState, useEffect } from 'react';
import { loadChennaiGrid } from './services/tnebGridService';
import type { ChennaiGridData, TnebSubstation, TnebSection } from './types/tneb';
import { TnebGridMap } from './components/Map/TnebGridMap';
import { Zap, ShieldCheck, RefreshCw, Cpu, Sun, Moon } from 'lucide-react';

export default function App() {
  const [gridData, setGridData] = useState<ChennaiGridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border tracking-wide ${
                isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              }`}>
                GROUND-TRUTH GRID V5
              </span>
            </div>
            <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              GROUND-TRUTH GRID V5 • 271 SUBSTATIONS • 42K+ DTRs
            </p>
          </div>
        </div>

        {/* Telemetry Stats Bar & Controls */}
        <div className="flex items-center gap-4 text-xs">
          {gridData && (
            <div className={`hidden sm:flex items-center gap-4 px-3.5 py-1.5 rounded-xl border ${
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

          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] ${
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
          />
        )}
      </main>
    </div>
  );
}
