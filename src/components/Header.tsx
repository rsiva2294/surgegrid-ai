import React from 'react';
import { Zap, Globe, Activity, Radio, CloudLightning } from 'lucide-react';

interface HeaderProps {
  lang: 'en' | 'ta';
  setLang: (lang: 'en' | 'ta') => void;
  hoursToLandfall: number;
  viewMode: 'LIVE' | 'SIMULATION';
  onToggleViewMode: (mode: 'LIVE' | 'SIMULATION') => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  setLang,
  hoursToLandfall,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">SurgeGrid AI</span>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  Track 5: Extreme Weather
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {lang === 'en'
                  ? 'Anticipatory Electrical Grid Resilience & Fluvial Surge Defense'
                  : 'முன்னெச்சரிக்கை மின் கட்டமைப்பு மற்றும் வெள்ள தடுப்பு மேலாண்மை'}
              </p>
            </div>
          </div>

          {/* Center Mode Switcher: Live Telemetry vs Cyclone Simulation */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => onToggleViewMode('LIVE')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'LIVE'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {viewMode === 'LIVE' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${viewMode === 'LIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              </span>
              <span className="hidden xs:inline">{lang === 'en' ? 'Live Telemetry' : 'நேரலை நிலை'}</span>
              <span className="xs:hidden">Live</span>
            </button>

            <button
              onClick={() => onToggleViewMode('SIMULATION')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'SIMULATION'
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CloudLightning className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{lang === 'en' ? 'Cyclone Sim' : 'புயல் உருவகப்படுத்தல்'}</span>
              <span className="xs:hidden">Sim</span>
            </button>
          </div>

          {/* Right Status & Language */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Dynamic Status Badge */}
            {viewMode === 'LIVE' ? (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>{lang === 'en' ? 'Real-Time CMWSSB' : 'நேரலை நிலவரம்'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span>
                  {lang === 'en' ? `T-${hoursToLandfall}h Landfall` : `T-${hoursToLandfall} மணி`}
                </span>
              </div>
            )}

            {/* City Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Chennai (CMA)</span>
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer transition-colors"
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

