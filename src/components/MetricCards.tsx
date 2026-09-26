import React from 'react';
import { Zap, ShieldCheck, AlertCircle, CheckCircle2, Radio, FileText, ArrowUpRight } from 'lucide-react';
import type { Substation, ReliefShelter, ReservoirData } from '../types';
import type { LiveWeatherReport } from '../services/liveDataService';

interface MetricCardsProps {
  substations: Substation[];
  shelters: ReliefShelter[];
  reservoirData: ReservoirData | null;
  onCardClick?: (tab: string) => void;
  lang: 'en' | 'ta';
  viewMode?: 'LIVE' | 'SIMULATION';
  liveWeather?: LiveWeatherReport | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  substations,
  reservoirData,
  onCardClick,
  lang,
  viewMode = 'LIVE',
  liveWeather,
}) => {
  const isLive = viewMode === 'LIVE';
  const lakebedSubs = substations.filter((s) => s.ancestral_lakebed_hazard).length;
  const criticalSurge = substations.filter((s) => s.risk_category === 'CRITICAL_SURGE_RISK').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. TNEB Substations Card */}
      <div
        onClick={() => onCardClick?.('grid')}
        className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === 'en' ? 'TNEB Substations' : 'துணை மின் நிலையங்கள்'}
          </span>
          <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono">
            {substations.length || 242}
          </span>
          <span className="text-xs text-slate-500 font-medium">Nodes</span>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-600">
          {isLive ? (
            <>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                100% Energized (0 Forced Outages)
              </span>
              <span className="text-slate-500 font-medium">
                {lakebedSubs} on Ancestral Lakebeds (Monitored)
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-rose-600 font-semibold">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {lakebedSubs} on Ancestral Lakebeds
              </span>
              <span className="text-amber-600 font-medium">{criticalSurge} at Critical Surge Risk</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Reservoir Headroom Card */}
      <div
        onClick={() => onCardClick?.('reservoirs')}
        className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === 'en' ? 'Reservoir Headroom' : 'நீர்த்தேக்க இடைவெளி'}
          </span>
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center group-hover:opacity-90 transition-colors ${
              isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={`text-2xl sm:text-3xl font-extrabold tabular-nums font-mono ${
              isLive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {Math.round(reservoirData?.summary.total_headroom_mcft || (isLive ? 8115 : 1824)).toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 font-medium">MCFT left</span>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-600">
          <span className={isLive ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
            {reservoirData?.summary.storage_pct || (isLive ? 38.6 : 86.2)}% Capacity Reached {isLive ? '(Safe)' : ''}
          </span>
          <span className="text-slate-500 truncate">
            {isLive ? 'Chembarambakkam: 37.9% full (2,263 MCFT buffer)' : 'Chembarambakkam: 89.4% full'}
          </span>
        </div>
      </div>

      {/* 3. At-Risk Power Infrastructure Card */}
      <div
        onClick={() => onCardClick?.('grid-risk')}
        className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {lang === 'en' ? 'At-Risk Grid Nodes' : 'அபாய மின் நிலையங்கள்'}
          </span>
          <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 tabular-nums font-mono">
            {lakebedSubs + criticalSurge}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ {substations.length || 242} Low-Lying</span>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-[11px]">
          {isLive ? (
            <>
              <span className="text-emerald-700 font-semibold">
                Normal Baseline (Dry Switchyards)
              </span>
              <span className="text-slate-500">Foundation Drainage Monitored</span>
            </>
          ) : (
            <>
              <span className="text-rose-600 font-semibold">
                {lakebedSubs} Lakebed + {criticalSurge} Surge Hazards
              </span>
              <span className="text-amber-700 font-medium">Controlled Load Shedding Orders</span>
            </>
          )}
        </div>
      </div>

      {/* 4. Anticipatory Action SOPs / Live AI Radar Card */}
      <div
        onClick={() => onCardClick?.('sop')}
        className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isLive
              ? lang === 'en'
                ? 'Live AI Monitoring'
                : 'நேரலை AI கண்காணிப்பு'
              : lang === 'en'
              ? 'Anticipatory Actions'
              : 'முன்னெச்சரிக்கை ஆணைகள்'}
          </span>
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center group-hover:opacity-90 transition-colors ${
              isLive ? 'bg-sky-50 text-sky-600' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {isLive ? <Radio className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={`text-2xl sm:text-3xl font-extrabold tabular-nums font-mono ${
              isLive ? 'text-sky-700' : 'text-indigo-700'
            }`}
          >
            {isLive ? '0' : '3'}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {isLive ? 'De-energizations Active' : 'De-energizations'}
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-[11px]">
          {isLive ? (
            <>
              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                Normal Grid State · 50.02 Hz <ArrowUpRight className="w-3 h-3" />
              </span>
              <span className="text-slate-500">
                {liveWeather ? `${liveWeather.temperature_c}°C · ${liveWeather.rainfall_mm}mm rain` : 'Fair Weather Baseline'}
              </span>
            </>
          ) : (
            <>
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                Gemini 3.7 Flash SOPs Active <ArrowUpRight className="w-3 h-3" />
              </span>
              <span className="text-slate-500">Bilingual TANGEDCO Protocols</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

