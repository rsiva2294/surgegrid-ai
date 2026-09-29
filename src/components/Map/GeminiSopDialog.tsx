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
  ChevronDown,
  ChevronUp
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
  const [lang, setLang] = useState<'EN' | 'TA'>('EN');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !directive) return null;

  const toggleItem = (id: string) => {
    setCompletedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getUrgencyBadge = (urgency: GeminiSopDirective['urgency']) => {
    switch (urgency) {
      case 'CRITICAL':
        return {
          bg: isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/80 text-rose-300 border-rose-600/70',
          dot: 'bg-rose-500',
          label: 'CRITICAL STATUTORY DIRECTIVE',
        };
      case 'RESTORATION':
        return {
          bg: isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70',
          dot: 'bg-emerald-500',
          label: 'PHASE-1 RESTORATION MANDATE',
        };
      case 'WATCH':
      default:
        return {
          bg: isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-600/70',
          dot: 'bg-amber-500',
          label: 'PRE-EMPTIVE WATCH DIRECTIVE',
        };
    }
  };

  const badge = getUrgencyBadge(directive.urgency);

  return (
    <div
      className={`fixed z-30 transition-all duration-300 shadow-2xl rounded-2xl border ${
        isMinimized
          ? 'bottom-20 right-4 w-72 p-3'
          : 'bottom-6 left-4 md:left-6 w-[calc(100vw-2rem)] md:w-[460px] max-h-[72vh] flex flex-col'
      } ${
        isLight
          ? 'bg-white/95 border-slate-300/90 text-slate-900 backdrop-blur-xl shadow-slate-900/20'
          : 'bg-slate-900/95 border-slate-700/80 text-slate-100 backdrop-blur-2xl shadow-black/80'
      }`}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
        isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-950/40'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight">Gemini Grid Copilot</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full border flex items-center gap-1 font-semibold ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                {directive.label}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {directive.geminiModelTag} · {directive.statutoryReference}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Language Toggle */}
          {!isMinimized && (
            <button
              type="button"
              onClick={() => setLang(l => l === 'EN' ? 'TA' : 'EN')}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                lang === 'TA'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : (isLight ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700')
              }`}
              title="Toggle English / தமிழ் Language"
            >
              {lang === 'EN' ? 'தமிழ்' : 'English'}
            </button>
          )}

          {/* Minimize / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsMinimized(prev => !prev)}
            className={`p-1 rounded-lg transition-colors ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Close / Dismiss */}
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Dismiss directive window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isMinimized ? (
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="font-semibold truncate">{directive.title}</span>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="text-[10px] text-indigo-400 font-bold ml-2 underline shrink-0"
          >
            View SOP
          </button>
        </div>
      ) : (
        <>
          {/* Live Physics Snapshot Bar */}
          <div className={`px-4 py-2 border-b grid grid-cols-3 gap-2 text-center text-xs shrink-0 ${
            isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-center gap-1.5 font-mono">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>{directive.weatherSnapshot.windKmh.toFixed(1)} km/h</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 font-mono">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>{directive.weatherSnapshot.rainMm.toFixed(1)} mm/h</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 font-mono">
              <Waves className="w-3.5 h-3.5 text-teal-400" />
              <span>{directive.weatherSnapshot.surgeM.toFixed(1)}m Surge</span>
            </div>
          </div>

          {/* Body Content - Scrollable */}
          <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
            {/* Directive Title & Summary */}
            <div>
              <h3 className="font-bold text-sm tracking-tight mb-1 text-indigo-400">
                {directive.title}
              </h3>
              <p className={`leading-relaxed text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {lang === 'EN' ? directive.summaryEn : directive.summaryTa}
              </p>
            </div>

            {/* Impact Metric Chips */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1 ${
                isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
              }`}>
                <AlertTriangle className="w-3 h-3" />
                {directive.impactMetrics.atRiskSubstations} Substation Risk
              </span>
              <span className={`px-2 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1 ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
              }`}>
                <Radio className="w-3 h-3" />
                {directive.impactMetrics.trippedFeeders} Feeders Tripped
              </span>
              <span className={`px-2 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1 ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
              }`}>
                <ShieldCheck className="w-3 h-3" />
                {directive.impactMetrics.protectedLifelines} Hospital Lifelines
              </span>
            </div>

            {/* Action Items Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Statutory Action Checklist ({directive.actionItems.length} tasks)</span>
                <span className="text-[10px] text-indigo-400">
                  {Object.values(completedItems).filter(Boolean).length}/{directive.actionItems.length} Done
                </span>
              </div>

              {directive.actionItems.map((item: SopActionItem) => {
                const isDone = !!completedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isDone
                        ? (isLight ? 'bg-emerald-50/80 border-emerald-300 opacity-70' : 'bg-emerald-950/30 border-emerald-700/50 opacity-70')
                        : (isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600')
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="pt-0.5">
                        <CheckCircle2 className={`w-4 h-4 transition-colors ${
                          isDone ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs ${isDone ? 'line-through text-slate-400' : ''}`}>
                            {item.title}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                            item.priority === 'P0_CRITICAL' 
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : item.priority === 'P1_LIFELINE'
                              ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {item.priority.replace('_', ' ')}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          {item.description}
                        </p>

                        {/* Target Substations Clickable Chips */}
                        {item.targetFeedersOrSubstations && item.targetFeedersOrSubstations.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.targetFeedersOrSubstations.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSubstation?.(name);
                                }}
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                  isLight
                                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                                    : 'bg-slate-900 hover:bg-slate-700 border-slate-700 text-slate-200'
                                }`}
                                title={`Inspect ${name} on map`}
                              >
                                🎯 {name}
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

          {/* Footer Controls */}
          <div className={`p-3 border-t flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={onTogglePlay}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isPlaying ? 'rotate-90' : ''}`} />
              <span>{isPlaying ? 'Pause Simulation' : 'Resume Simulation'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                isLight ? 'border-slate-300 hover:bg-slate-100 text-slate-700' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
            >
              Minimize to Cockpit
            </button>
          </div>
        </>
      )}
    </div>
  );
};
