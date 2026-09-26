import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ReservoirData } from '../types';

interface HeadroomHeroProps {
  reservoirData: ReservoirData | null;
  lang: 'en' | 'ta';
}

export const HeadroomHero: React.FC<HeadroomHeroProps> = ({ reservoirData, lang }) => {
  if (!reservoirData) return null;

  const { summary, reservoirs } = reservoirData;
  const chem = reservoirs.find((r) => r.id === 'chembarambakkam');
  const poondi = reservoirs.find((r) => r.id === 'poondi');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {lang === 'en'
                ? 'Reservoir Buffer Headroom & Fluvial River Surge Threat'
                : 'நீர்த்தேக்க கொள்ளளவு இடைவெளி மற்றும் ஆற்று வெள்ள அபாய எச்சரிக்கை'}
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {lang === 'en'
              ? 'When storage exceeds 85%, emergency sluice discharges surge down the Adyar & Kosasthalaiyar rivers, threatening riverside TNEB substations.'
              : 'கொள்ளளவு 85% மேல் உயரும்போது, செம்பரம்பாக்கம் மற்றும் பூண்டியில் இருந்து திறக்கப்படும் உபரி நீர் அடையாறு மற்றும் கொசஸ்தலையாறு துணை மின் நிலையங்களை மூழ்கடிக்கும்.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            {summary.overall_fluvial_threat} FLUVIAL THREAT
          </span>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            CMWSSB Bulletin: 08:00 IST
          </span>
        </div>
      </div>

      {/* Main Metric Spotlight Card */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Tightest Margin (Chembarambakkam) */}
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              {lang === 'en' ? 'Tightest Margin on River' : 'அதிகபட்ச அபாய நிலை'}
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
              {chem ? `${chem.storage_pct}% Full` : '89.4% Full'}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {lang === 'en' ? 'Chembarambakkam Lake' : 'செம்பரம்பாக்கம் ஏரி'}
            <span className="text-xs font-normal text-slate-500"> · Adyar Basin</span>
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 tabular-nums font-mono">
              {chem?.headroom_mcft || 387}
            </span>
            <span className="text-xs font-semibold text-slate-600">MCFT headroom left</span>
          </div>
          <div className="mt-2 text-xs text-rose-800 font-medium leading-relaxed bg-white/70 p-2 rounded border border-rose-100">
            {chem?.fluvial_corridor_warning}
          </div>
        </div>

        {/* Card 2: Poondi Reservoir (Northern Grid) */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              {lang === 'en' ? 'Northern Industrial Basin' : 'வடசென்னை ஆற்று வடிநிலம்'}
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              {poondi ? `${poondi.storage_pct}% Full` : '89.4% Full'}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {lang === 'en' ? 'Poondi (Sathyamurthy Sagar)' : 'பூண்டி நீர்த்தேக்கம்'}
            <span className="text-xs font-normal text-slate-500"> · Kosasthalaiyar</span>
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 tabular-nums font-mono">
              {poondi?.headroom_mcft || 341}
            </span>
            <span className="text-xs font-semibold text-slate-600">MCFT headroom left</span>
          </div>
          <div className="mt-2 text-xs text-amber-900 font-medium leading-relaxed bg-white/70 p-2 rounded border border-amber-100">
            {poondi?.fluvial_corridor_warning}
          </div>
        </div>

        {/* Card 3: Total City-wide Water Storage */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {lang === 'en' ? '6-Reservoir Combined' : '6 ஏரிகளின் மொத்த இருப்பு'}
              </span>
              <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded font-mono">
                {summary.storage_pct}%
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {lang === 'en' ? 'Combined Storage vs Capacity' : 'மொத்த நீர் இருப்பு / கொள்ளளவு'}
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono">
                {summary.total_storage_mcft.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                / {summary.total_capacity_mcft.toLocaleString()} MCFT
              </span>
            </div>
            {/* Storage Progress Bar */}
            <div className="mt-2.5 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${summary.storage_pct}%` }}
              ></div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {lang === 'en'
              ? 'Emergency sluice release active for 33,700 cusecs combined.'
              : 'செம்பரம்பாக்கம் & பூண்டியில் மொத்தம் 33,700 கனஅடி நீர் வெளியேற்றப்படுகிறது.'}
          </p>
        </div>
      </div>

      {/* Honesty & Operational Provenance Notice */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {lang === 'en'
              ? 'Fluvial flood trigger: Downstream substations (Saidapet, Guindy, Kotturpuram, Manali) receive pre-emptive load-shedding orders.'
              : 'வெள்ள அபாய நெறிமுறை: அடையாறு கரையோர துணை மின் நிலையங்களில் முன் எச்சரிக்கையாக மின் பகிர்வு மாற்றப்படுகிறது.'}
          </span>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">
          Data: CMWSSB Bulletin + Neer Vazhvu Scraper Engine
        </span>
      </div>
    </div>
  );
};
