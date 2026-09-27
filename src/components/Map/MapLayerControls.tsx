import React from 'react';
import { Layers, ChevronUp, ChevronDown } from 'lucide-react';
import type { TnebSubstation, TnebSection } from '../../types/tneb';

interface MapLayerControlsProps {
  isLayersExpanded: boolean;
  setIsLayersExpanded: (expanded: boolean) => void;
  isSatellite: boolean;
  setIsSatellite: (satellite: boolean) => void;
  showBulk: boolean;
  setShowBulk: (show: boolean) => void;
  showSubTrans: boolean;
  setShowSubTrans: (show: boolean) => void;
  showDistribution: boolean;
  setShowDistribution: (show: boolean) => void;
  showSections: boolean;
  setShowSections: (show: boolean) => void;
  substations: TnebSubstation[];
  sections: TnebSection[];
  isLight: boolean;
}

export const MapLayerControls: React.FC<MapLayerControlsProps> = ({
  isLayersExpanded,
  setIsLayersExpanded,
  isSatellite,
  setIsSatellite,
  showBulk,
  setShowBulk,
  showSubTrans,
  setShowSubTrans,
  showDistribution,
  setShowDistribution,
  showSections,
  setShowSections,
  substations,
  sections,
  isLight
}) => {
  return (
    <div
      className={`pointer-events-auto rounded-xl p-3 text-xs space-y-2.5 transition-colors ${
        isLight
          ? 'bg-white/98 border border-slate-300/90 text-slate-800 shadow-[0_10px_35px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 backdrop-blur-md'
          : 'bg-slate-900/95 border border-slate-700/80 text-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
      }`}
    >
      <div
        className={`flex items-center justify-between ${isLayersExpanded ? 'border-b pb-2' : ''} ${
          isLight ? 'border-slate-300/70' : 'border-slate-700/80'
        }`}
      >
        <button
          onClick={() => setIsLayersExpanded(!isLayersExpanded)}
          className="flex items-center gap-1.5 text-left font-bold uppercase tracking-wider text-xs hover:opacity-80 transition-opacity"
        >
          <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>TNEB Grid Layers</span>
          {isLayersExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
        <button
          onClick={() => setIsSatellite(!isSatellite)}
          className={`px-2 py-0.5 rounded font-medium text-xs transition-colors ${
            isSatellite
              ? isLight
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-cyan-500 text-slate-950 font-bold'
              : isLight
              ? 'bg-slate-100 text-slate-700 border border-slate-300/70 hover:text-slate-900'
              : 'bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:text-white hover:border-slate-600'
          }`}
        >
          {isSatellite ? 'Satellite' : 'Vector Map'}
        </button>
      </div>

      {isLayersExpanded && (
        <>
          {/* Voltage Tiers */}
          <div className="space-y-1.5">
            <button
              onClick={() => setShowBulk(!showBulk)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                showBulk
                  ? isLight
                    ? 'bg-pink-50/90 border-pink-300 text-pink-900 shadow-sm'
                    : 'bg-pink-950/50 border-pink-500/60 text-pink-200 shadow-sm'
                  : isLight
                  ? 'bg-slate-100/90 border-slate-300 text-slate-700 line-through'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300 line-through'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isLight ? 'bg-pink-600 ring-2 ring-pink-300' : 'bg-pink-500 ring-2 ring-pink-400/40'
                  }`}
                />
                <span className="font-medium">Bulk EHV (230-400kV)</span>
              </div>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                  isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300'
                }`}
              >
                {substations.filter((s) => s.tier === 'bulk').length}
              </span>
            </button>

            <button
              onClick={() => setShowSubTrans(!showSubTrans)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                showSubTrans
                  ? isLight
                    ? 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-sm'
                    : 'bg-amber-950/50 border-amber-500/60 text-amber-200 shadow-sm'
                  : isLight
                  ? 'bg-slate-100/90 border-slate-300 text-slate-700 line-through'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300 line-through'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isLight ? 'bg-amber-600 ring-2 ring-amber-300' : 'bg-amber-500 ring-2 ring-amber-400/40'
                  }`}
                />
                <span className="font-medium">Sub-Trans (110kV)</span>
              </div>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                  isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {substations.filter((s) => s.tier === 'subtransmission').length}
              </span>
            </button>

            <button
              onClick={() => setShowDistribution(!showDistribution)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                showDistribution
                  ? isLight
                    ? 'bg-sky-50/90 border-sky-300 text-sky-900 shadow-sm'
                    : 'bg-cyan-950/50 border-cyan-500/60 text-cyan-200 shadow-sm'
                  : isLight
                  ? 'bg-slate-100/90 border-slate-300 text-slate-700 line-through'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300 line-through'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isLight ? 'bg-sky-600 ring-2 ring-sky-300' : 'bg-cyan-400 ring-2 ring-cyan-400/40'
                  }`}
                />
                <span className="font-medium">Distribution (33/11kV)</span>
              </div>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                  isLight ? 'bg-sky-100 text-sky-700' : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                {substations.filter((s) => s.tier === 'distribution').length}
              </span>
            </button>

            <button
              onClick={() => setShowSections(!showSections)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                showSections
                  ? isLight
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-sm'
                    : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200 shadow-sm'
                  : isLight
                  ? 'bg-slate-100/90 border-slate-300 text-slate-700 line-through'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300 line-through'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isLight ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-emerald-500 ring-2 ring-emerald-400/40'
                  }`}
                />
                <span className="font-medium">AE Section Offices</span>
              </div>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                  isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {sections.length}
              </span>
            </button>
          </div>

          <div
            className={`pt-2 border-t text-xs flex items-center justify-between ${
              isLight ? 'border-slate-300/70 text-slate-600' : 'border-slate-700/80 text-slate-400'
            }`}
          >
            <span>
              Scope: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>Chennai Only</strong>
            </span>
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              NO POI
            </span>
          </div>
        </>
      )}
    </div>
  );
};
