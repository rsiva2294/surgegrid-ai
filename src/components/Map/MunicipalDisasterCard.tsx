import React from 'react';
import { Building2, Phone } from 'lucide-react';
import type { TnebSubstation, TnebSection } from '../../types/tneb';
import { CopyIncidentSmsButton } from './CopyIncidentSmsButton';
import { getQuote } from '../../data/officialSources';

interface MunicipalDisasterCardProps {
  node: TnebSubstation | TnebSection;
  isLight: boolean;
  isDedicatedTab?: boolean;
}

export const MunicipalDisasterCard: React.FC<MunicipalDisasterCardProps> = ({
  node,
  isLight,
  isDedicatedTab = false
}) => {
  if (!node.gccZone) {
    return (
      <div className={`p-3 rounded-xl border text-xs shrink-0 space-y-2 ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/40 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🌐</span>
            <div>
              <span className="font-bold text-xs block">Peri-Urban CMA Grid Hub</span>
              <span className="opacity-75 text-xs">Outside GCC Municipal Wards • CMA Regional Outer Ring</span>
            </div>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold ${
            isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
          }`}>
            CMA EHT Corridor
          </span>
        </div>
        <p className="text-xs leading-relaxed opacity-85">
          This node serves as an Extra High Voltage (EHT) bulk transmission injection corridor (Kanchipuram / Tiruvallur / Chengalpattu circles), feeding power directly into the Chennai metropolitan core.
        </p>
      </div>
    );
  }

  if (isDedicatedTab) {
    return (
      <div className="space-y-2.5">
        {/* Official Ward Disaster Committee Emergency Hotlines */}
        <div className={`p-3 rounded-xl border space-y-2.5 ${
          isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-slate-900 border-slate-800 text-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs pb-1 border-b border-current/10">
            <span className="font-bold flex items-center gap-1.5">
              <span>📞</span>
              <span>Ward Disaster Committee (Official CUGs)</span>
            </span>
            <span className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              Click to Call
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {node.wardCouncillorMobile && (
              <a
                href={`tel:${node.wardCouncillorMobile}`}
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all group ${
                  isLight ? 'bg-indigo-50/50 hover:bg-indigo-100/70 border-indigo-200 text-indigo-950' : 'bg-indigo-950/20 hover:bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
                }`}
              >
                <span className="text-xs font-medium opacity-75">Ward Councillor (CUG)</span>
                <div className="flex items-center gap-1.5 font-mono font-bold mt-1">
                  <Phone className="w-3 h-3 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span>{node.wardCouncillorMobile}</span>
                </div>
              </a>
            )}

            {node.wardCmwssbMobile && (
              <a
                href={`tel:${node.wardCmwssbMobile}`}
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all group ${
                  isLight ? 'bg-cyan-50/50 hover:bg-cyan-100/70 border-cyan-200 text-cyan-950' : 'bg-cyan-950/20 hover:bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                }`}
              >
                <span className="text-xs font-medium opacity-75">CMWSSB Water/Drainage AE</span>
                <div className="flex items-center gap-1.5 font-mono font-bold mt-1">
                  <Phone className="w-3 h-3 text-cyan-600 group-hover:scale-110 transition-transform" />
                  <span>{node.wardCmwssbMobile}</span>
                </div>
              </a>
            )}

            {node.wardGccAeMobile && (
              <a
                href={`tel:${node.wardGccAeMobile}`}
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all group ${
                  isLight ? 'bg-purple-50/50 hover:bg-purple-100/70 border-purple-200 text-purple-950' : 'bg-purple-950/20 hover:bg-purple-950/40 border-purple-800/60 text-purple-200'
                }`}
              >
                <span className="text-xs font-medium opacity-75">GCC Civil/Electrical AE</span>
                <div className="flex items-center gap-1.5 font-mono font-bold mt-1">
                  <Phone className="w-3 h-3 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span>{node.wardGccAeMobile}</span>
                </div>
              </a>
            )}

            <a
              href="tel:1913"
              className={`p-2 rounded-xl border flex flex-col justify-between transition-all group ${
                isLight ? 'bg-rose-50/50 hover:bg-rose-100/70 border-rose-200 text-rose-950' : 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-800/60 text-rose-200'
              }`}
            >
              <span className="text-xs font-medium opacity-75">GCC Ripon Control Room</span>
              <div className="flex items-center gap-1.5 font-mono font-bold mt-1">
                <Phone className="w-3 h-3 text-rose-600 group-hover:scale-110 transition-transform" />
                <span>1913 (24x7 Helpline)</span>
              </div>
            </a>
          </div>
        </div>

        {/* 2G SMS / Wireless Incident Dispatch Generator */}
        <CopyIncidentSmsButton node={node} isLight={isLight} />

        {/* GCC Municipal Command Card */}
        <div className={`p-3 rounded-xl border text-xs shadow-xs space-y-2 ${
          isLight ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950' : 'bg-indigo-950/30 border-indigo-800/70 text-indigo-200'
        }`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isLight ? 'bg-indigo-200/80 text-indigo-800' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm block leading-tight">
                  GCC Zone {node.gccZone} ({node.gccZoneName})
                </span>
                <span className={`text-xs block mt-0.5 font-mono ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                  Greater Chennai Corporation • Ward {node.gccWard}
                </span>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
              isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-slate-950 font-black'
            }`}>
              Z{node.gccZone}:W{node.gccWard}
            </span>
          </div>

          <p className="text-xs leading-relaxed opacity-90 pt-1 border-t border-current/10">
            Zone and ward come from GCC data. The GCC City Disaster Management Perspective Plan 2023 gives TANGEDCO this role: “{getQuote('gcc-tangedco-role')?.quote}” ({getQuote('gcc-tangedco-role')?.citation}).
          </p>
        </div>

        {/* Multi-Agency Standing Operating Protocol Guidance */}
        <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/40 border-slate-800 text-slate-400'
        }`}>
          <span className={`font-semibold block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            ⚡ Before re-energizing (TANGEDCO DMP 2017):
          </span>
          <p className="text-xs leading-relaxed">
            “{getQuote('tangedco-no-recharge-before-patrol')?.quote}” ({getQuote('tangedco-no-recharge-before-patrol')?.citation}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-xl border text-xs shrink-0 space-y-2 ${
      isLight ? 'bg-indigo-50/70 border-indigo-100 text-indigo-950 shadow-xs' : 'bg-indigo-950/30 border-indigo-800/60 text-indigo-200 shadow-xs'
    }`}>
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <span>🏛️</span>
          <span>GCC Zone {node.gccZone} ({node.gccZoneName})</span>
          <span className={`px-1.5 py-0.5 rounded-md font-mono text-xs font-bold ${
            isLight ? 'bg-indigo-200/80 text-indigo-900' : 'bg-indigo-500/20 text-indigo-300'
          }`}>
            Ward {node.gccWard}
          </span>
        </div>
      </div>

      {/* Direct Ward Emergency Hotlines */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-current/10 text-xs">
        {node.wardCouncillorMobile && (
          <a
            href={`tel:${node.wardCouncillorMobile}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-semibold transition-all ${
              isLight ? 'bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200' : 'bg-slate-900 hover:bg-slate-800 text-indigo-200 border border-indigo-700/60'
            }`}
            title="Call Ward Councillor (CUG)"
          >
            <Phone className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Councillor: {node.wardCouncillorMobile}</span>
          </a>
        )}
        {node.wardCmwssbMobile && (
          <a
            href={`tel:${node.wardCmwssbMobile}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-semibold transition-all ${
              isLight ? 'bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-200' : 'bg-slate-900 hover:bg-slate-800 text-cyan-200 border border-cyan-700/60'
            }`}
            title="Call CMWSSB Area Engineer"
          >
            <Phone className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>CMWSSB: {node.wardCmwssbMobile}</span>
          </a>
        )}
        {node.wardGccAeMobile && (
          <a
            href={`tel:${node.wardGccAeMobile}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-semibold transition-all ${
              isLight ? 'bg-white hover:bg-purple-100 text-purple-900 border border-purple-200' : 'bg-slate-900 hover:bg-slate-800 text-purple-200 border border-purple-700/60'
            }`}
            title="Call GCC Ward AE / Ripon Control"
          >
            <Phone className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>GCC AE: {node.wardGccAeMobile}</span>
          </a>
        )}
        <a
          href="tel:1913"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-semibold transition-all ${
            isLight ? 'bg-white hover:bg-rose-100 text-rose-900 border border-rose-200' : 'bg-slate-900 hover:bg-slate-800 text-rose-200 border border-rose-700/60'
          }`}
          title="GCC 24x7 Emergency Helpline (Ripon Building)"
        >
          <Phone className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span>Ripon: 1913</span>
        </a>
      </div>
    </div>
  );
};
