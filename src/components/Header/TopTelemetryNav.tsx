import React from 'react';
import type { WeatherNextTimestep } from '../../types/surgegrid';
import { 
  Zap, 
  Wind, 
  Droplets, 
  Compass, 
  Activity, 
  BarChart3, 
  Layers, 
  Sparkles, 
  Info, 
  Waves
} from 'lucide-react';

interface TopTelemetryNavProps {
  currentForecast: WeatherNextTimestep;
  criticalSubstationsCount: number;
  onOpenInsuranceModal: () => void;
  onOpenDrainModal: () => void;
  onOpenAboutModal: () => void;
  onToggleCopilot: () => void;
  onResetView?: () => void;
  isCopilotOpen: boolean;
}

export const TopTelemetryNav: React.FC<TopTelemetryNavProps> = ({
  currentForecast,
  criticalSubstationsCount,
  onOpenInsuranceModal,
  onOpenDrainModal,
  onOpenAboutModal,
  onToggleCopilot,
  onResetView,
  isCopilotOpen
}) => {
  const getPhaseBadge = () => {
    switch (currentForecast.alert_phase) {
      case 'WATCH_PHASE':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          label: 'T-48h Cyclone Watch'
        };
      case 'WARNING_PHASE':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500 animate-ping',
          label: 'T-24h Warning Active'
        };
      case 'EVACUATION_ISOLATION_PHASE':
        return {
          bg: 'bg-orange-50 border-orange-200 text-orange-800',
          dot: 'bg-orange-500 animate-ping',
          label: 'T-6h Grid Isolation'
        };
      case 'LANDFALL_IMPACT':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          dot: 'bg-rose-500 animate-ping',
          label: 'T-0h Eye Landfall & Surge'
        };
      case 'RECOVERY_RESTORATION':
        return {
          bg: 'bg-sky-50 border-sky-200 text-sky-800',
          dot: 'bg-sky-500',
          label: 'T+12h Grid Restoration'
        };
      default:
        return {
          bg: 'bg-slate-100 border-slate-200 text-slate-700',
          dot: 'bg-slate-400',
          label: 'Monitoring'
        };
    }
  };

  const phase = getPhaseBadge();

  return (
    <header className="bg-white/95 border-b border-slate-200 text-slate-800 backdrop-blur-md px-4 py-2.5 z-20 sticky top-0 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 text-white">
          <Zap className="w-5 h-5 fill-white" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold tracking-tight text-lg text-slate-900 flex items-center gap-2">
              <span>SurgeGrid AI</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                WeatherNext 3 · GEE 10-Band
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <span>Chennai Coastal Grid Resilience</span>
            <span className="text-slate-300">•</span>
            <span>TNEB Super Index + GCC Drains</span>
          </p>
        </div>
      </div>

      {/* Live Atmospheric Telemetry Bar */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 px-3 shadow-xs">
        {/* Phase Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-bold tracking-wide ${phase.bg}`}>
          <span className={`w-2 h-2 rounded-full ${phase.dot}`} />
          <span>{phase.label}</span>
        </div>

        {/* Distance to Landfall */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Compass className="w-4 h-4 text-sky-600" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Distance</div>
            <div className="text-xs font-bold text-slate-800">
              {currentForecast.cyclone_distance_to_chennai_km.toFixed(0)} <span className="text-[10px] text-slate-500 font-normal">km</span>
            </div>
          </div>
        </div>

        {/* Storm Surge Height */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Waves className="w-4 h-4 text-cyan-600" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Surge MSL</div>
            <div className={`text-xs font-bold ${
              currentForecast.simulated_storm_surge_msl_m >= 2.0 
                ? 'text-rose-600 font-extrabold' 
                : currentForecast.simulated_storm_surge_msl_m >= 1.0 
                ? 'text-amber-600' 
                : 'text-slate-800'
            }`}>
              +{currentForecast.simulated_storm_surge_msl_m.toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">m</span>
            </div>
          </div>
        </div>

        {/* 10m Wind Speed */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Wind className="w-4 h-4 text-amber-600" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-semibold text-slate-400">10m Wind</div>
            <div className="text-xs font-bold text-slate-800">
              {Math.round(currentForecast.wind_speed_10m_kmh)} <span className="text-[10px] text-slate-500 font-normal">km/h</span>
            </div>
          </div>
        </div>

        {/* IMERG 1-hr Rainfall */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 hidden sm:flex">
          <Droplets className="w-4 h-4 text-blue-600" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Rainfall</div>
            <div className="text-xs font-bold text-slate-800">
              {currentForecast.total_precipitation_1hr_mm.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">mm/h</span>
            </div>
          </div>
        </div>

        {/* Eye Pressure */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 hidden lg:flex">
          <Activity className="w-4 h-4 text-emerald-600" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Eye MSLP</div>
            <div className="text-xs font-bold text-slate-800">
              {currentForecast.mean_sea_level_pressure_hpa} <span className="text-[10px] text-slate-500 font-normal">hPa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons & Copilot Toggle */}
      <div className="flex items-center gap-2">
        {onResetView && (
          <button
            onClick={onResetView}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Reset selections and recenter map"
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Recenter</span>
          </button>
        )}

        <button
          onClick={onOpenInsuranceModal}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          title="Parametric Disaster Insurance Payout Triggers"
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">Parametric Payout</span>
        </button>

        <button
          onClick={onOpenDrainModal}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          title="GCC Stormwater Drains & River Basin Hydrology"
        >
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden md:inline">Hydrology</span>
        </button>

        <button
          onClick={onOpenAboutModal}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          title="DeepMind WeatherNext 3 Architecture & Satellite Stack"
        >
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden lg:inline">Architecture</span>
        </button>

        <button
          onClick={onToggleCopilot}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
            isCopilotOpen 
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' 
              : 'bg-white hover:bg-blue-50 border border-blue-200 text-blue-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Gemini Copilot</span>
          {criticalSubstationsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white font-bold">
              {criticalSubstationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
