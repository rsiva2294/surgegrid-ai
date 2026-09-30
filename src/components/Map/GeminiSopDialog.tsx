import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ShieldCheck, 
  Radio, 
  Waves, 
  Wind, 
  Droplets,
  Minimize2,
  Maximize2
} from 'lucide-react';
import type { GeminiSopDirective, SopActionItem } from '../../services/geminiSopService';

interface GeminiSopDialogProps {
  directive: GeminiSopDirective | null;
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isLight: boolean;
  onSelectSubstation?: (name: string) => void;
}

export const GeminiSopDialog: React.FC<GeminiSopDialogProps> = ({
  directive,
  isOpen,
  onClose,
  isPlaying,
  onTogglePlay,
  isLight,
  onSelectSubstation
}) => {
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !directive) return null;

  const toggleItem = (id: string) => {
    setCompletedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryBadge = (category: SopActionItem['category']) => {
    const labels: Record<SopActionItem['category'], string> = {
      DE_ENERGIZE: 'SUPPLY OFF',
      LIFELINE_PROTECT: 'LIFELINE',
      DEWATERING: 'DEWATERING',
      SAFETY_LOCKOUT: 'SAFETY',
      RESTORATION: 'RESTORATION',
      FIELD: 'FIELD',
    };
    return {
      container: isLight
        ? 'bg-indigo-100 text-indigo-950 border-indigo-300 font-bold'
        : 'bg-indigo-950/60 text-indigo-200 border-indigo-600/60 font-bold',
      label: labels[category],
    };
  };

  const getUrgencyTheme = (urgency: GeminiSopDirective['urgency']) => {
    switch (urgency) {
      case 'CRITICAL':
        return {
          badgeBg: isLight ? 'bg-rose-100 text-rose-950 border-rose-300 font-bold' : 'bg-rose-950/80 text-rose-200 border-rose-600/70',
          badgeDot: 'bg-rose-600 animate-ping',
          accentBorder: isLight ? 'border-rose-400' : 'border-rose-500/50',
          glow: 'shadow-rose-500/20',
        };
      case 'RESTORATION':
        return {
          badgeBg: isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold' : 'bg-emerald-950/80 text-emerald-200 border-emerald-600/70',
          badgeDot: 'bg-emerald-600',
          accentBorder: isLight ? 'border-emerald-400' : 'border-emerald-500/50',
          glow: 'shadow-emerald-500/20',
        };
      case 'WATCH':
      default:
        return {
          badgeBg: isLight ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold' : 'bg-amber-950/80 text-amber-200 border-amber-600/70',
          badgeDot: 'bg-amber-600',
          accentBorder: isLight ? 'border-amber-400' : 'border-amber-500/50',
          glow: 'shadow-amber-500/20',
        };
    }
  };

  const urgencyTheme = getUrgencyTheme(directive.urgency);
  const doneCount = Object.values(completedItems).filter(Boolean).length;
  const totalCount = directive.actionItems.length;

  // Render Sleek Minimized Floating Pill docked cleanly in bottom-right
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className={`fixed z-40 bottom-6 right-6 pointer-events-auto cursor-pointer select-none group transition-transform hover:scale-[1.02] active:scale-[0.98] duration-150 rounded-full pl-3.5 pr-2.5 py-2 border shadow-2xl backdrop-blur-xl flex items-center gap-3 ${
          isLight
            ? 'bg-white/95 border-slate-300 hover:border-indigo-400 text-slate-800 shadow-slate-900/15 ring-1 ring-slate-900/5'
            : 'bg-slate-900/95 border-slate-700/80 hover:border-indigo-500/60 text-slate-100 shadow-black/80 ring-1 ring-white/10'
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold tracking-tight">Gemini Copilot</span>
          <span className="text-slate-400">•</span>
          <span className="font-semibold text-indigo-400">{directive.label}</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            {doneCount}/{totalCount} Done
          </span>
        </div>
        <div className="p-1 rounded-full text-slate-400 group-hover:text-white transition-colors">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  // Full Mission-Control Centered Briefing Modal
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm pointer-events-auto animate-backdrop-in">
      <div
        className={`relative w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ring-1 ring-white/10 animate-modal-in ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-900/25'
            : 'bg-slate-900/95 border-slate-700/80 text-slate-100 backdrop-blur-2xl shadow-black/90'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header Bar */}
        <div className={`px-5 py-3 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  Gemini Grid Commander
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 whitespace-nowrap ${urgencyTheme.badgeBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${urgencyTheme.badgeDot}`}></span>
                  {directive.label}
                </span>
              </div>
              <div className="text-[11px] font-sans flex items-center gap-1.5 truncate mt-0.5">
                <span className={`font-semibold shrink-0 ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>{directive.geminiModelTag}</span>
                <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>•</span>
                <span className={`font-mono text-[10px] font-medium truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{directive.sources.join(' · ')}</span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1 shrink-0 ml-3">
            {/* Minimize */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Minimize to floating pill"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Dismiss directive window"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Weather & Telemetry Ribbon */}
        <div className={`px-5 py-2.5 border-b grid grid-cols-3 gap-3 text-xs shrink-0 ${
          isLight ? 'bg-slate-100/90 border-slate-200 text-slate-900' : 'bg-slate-950/50 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
              isLight ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
            }`}>
              <Wind className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Wind (area mean)</div>
              <div className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{Math.abs(directive.weatherSnapshot.windKmh).toFixed(1)} km/h</div>
              <div className={`text-[10px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title="IMD cyclone class (MoP Power-Sector DMP 2021, Table-4)">
                {directive.weatherSnapshot.imdClass ? `IMD: ${directive.weatherSnapshot.imdClass}` : 'Below IMD Severe class (88 km/h)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
              isLight ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
            }`}>
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Rain (area mean)</div>
              <div className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{directive.weatherSnapshot.rainMm.toFixed(1)} mm/h</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
              isLight ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-teal-500/15 border-teal-500/30 text-teal-400'
            }`}>
              <Waves className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Surface Pressure</div>
              <div className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{directive.weatherSnapshot.pressureHpa === null ? 'n/a' : `${directive.weatherSnapshot.pressureHpa.toFixed(0)} hPa`}</div>
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Directive Title & Summary Statement */}
          <div className={`p-4 rounded-xl border ${
            isLight
              ? 'bg-indigo-50/80 border-indigo-200 text-slate-900 shadow-xs'
              : 'bg-indigo-950/30 border-indigo-800/40 text-slate-100'
          }`}>
            <h2 className={`font-extrabold text-sm tracking-tight mb-1.5 ${
              isLight ? 'text-indigo-950' : 'text-indigo-300'
            }`}>
              {directive.title}
            </h2>
            <p className={`leading-relaxed text-xs ${
              isLight ? 'text-slate-800 font-medium' : 'text-slate-200'
            }`}>
              {directive.summaryEn}
            </p>
          </div>

          {/* Impact Overview Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-rose-950/30 border-rose-800/40 text-rose-200'
            }`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              <div>
                <div className={`font-mono font-bold text-sm leading-tight ${isLight ? 'text-rose-950' : 'text-rose-100'}`}>
                  {directive.exposure.flood}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-rose-800' : 'text-rose-400'}`}>
                  At/Below 2.0 m MSL
                </div>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
              isLight ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-amber-950/30 border-amber-800/40 text-amber-200'
            }`}>
              <Radio className={`w-4 h-4 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <div>
                <div className={`font-mono font-bold text-sm leading-tight ${isLight ? 'text-amber-950' : 'text-amber-100'}`}>
                  {directive.exposure.overhead}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  Overhead Substations
                </div>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
            }`}>
              <ShieldCheck className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <div>
                <div className={`font-mono font-bold text-sm leading-tight ${isLight ? 'text-emerald-950' : 'text-emerald-100'}`}>
                  {directive.exposure.lifeline}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                  Hospital/Water Feeders
                </div>
              </div>
            </div>
          </div>

          {/* Actionable SOP Checklist Section */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}>
                Official Actions ({totalCount}), quoted from the plans
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                doneCount === totalCount
                  ? (isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60')
                  : (isLight ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-indigo-950/60 text-indigo-300 border-indigo-600/60')
              }`}>
                {doneCount}/{totalCount} Completed
              </span>
            </div>

            <div className="space-y-2">
              {directive.actionItems.map((item: SopActionItem) => {
                const isDone = !!completedItems[item.id];
                const catBadge = getCategoryBadge(item.category);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      isDone
                        ? (isLight ? 'bg-emerald-50/50 border-emerald-300 opacity-60' : 'bg-emerald-950/20 border-emerald-800/40 opacity-60')
                        : (isLight 
                            ? 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 hover:border-indigo-300 shadow-xs' 
                            : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-indigo-500/50 shadow-xs')
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Custom Checkbox */}
                      <div className="pt-0.5">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isDone 
                            ? 'bg-emerald-500 border-emerald-400 text-white' 
                            : (isLight ? 'border-slate-400 bg-white group-hover:border-indigo-500' : 'border-slate-600 bg-slate-900 group-hover:border-indigo-400')
                        }`}>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-bold text-xs tracking-tight ${isDone ? 'line-through text-slate-400' : (isLight ? 'text-slate-950 font-extrabold' : 'text-slate-100')}`}>
                            {item.title}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shrink-0 ${catBadge.container}`}>
                            {catBadge.label}
                          </span>
                        </div>

                        <blockquote className={`text-[11px] leading-relaxed italic border-l-2 pl-2.5 ${
                          isLight ? 'text-slate-800 border-indigo-300' : 'text-slate-200 border-indigo-500/60'
                        }`}>
                          &ldquo;{item.quote}&rdquo;
                          <span className={`block not-italic text-[10px] font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            {item.citation}
                          </span>
                        </blockquote>
                        {item.note && (
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                            {item.note}
                          </p>
                        )}

                        {/* Interactive Clickable Target Substation Tags */}
                        {item.targetFeedersOrSubstations && item.targetFeedersOrSubstations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Targets:</span>
                            {item.targetFeedersOrSubstations.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSubstation?.(name);
                                }}
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
                                  isLight
                                    ? 'bg-white hover:bg-indigo-50 border-slate-300 hover:border-indigo-500 text-slate-900 hover:text-indigo-900 shadow-xs'
                                    : 'bg-slate-900/90 hover:bg-indigo-950 border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-indigo-200 shadow-xs'
                                }`}
                                title={`Focus on ${name} in grid map`}
                              >
                                <span>🎯</span>
                                <span>{name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions Bar */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isPlaying ? 'rotate-90' : ''}`} />
            <span>{isPlaying ? 'Pause Simulation' : 'Resume Simulation'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                isLight 
                  ? 'border-slate-300 hover:bg-slate-200 text-slate-800' 
                  : 'border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white'
              }`}
            >
              Minimize to Dock
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                isLight 
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-900' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
