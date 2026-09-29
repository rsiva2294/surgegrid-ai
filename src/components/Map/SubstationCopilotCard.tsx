import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import type { LiveOutage } from '../../services/liveOutageService';
import type { ScenarioTimestep } from '../../services/scenarioService';
import { useOfficialFloodLoaded } from '../../services/officialFloodLayers';
import {
  fetchSubstationTacticalAdvisory,
  generateDeterministicTacticalAdvisory,
  type SubstationCopilotAdvisory
} from '../../services/geminiSubstationCopilotService';

interface SubstationCopilotCardProps {
  substation: TnebSubstation;
  isLight: boolean;
  disasterScenario: DisasterScenario;
  liveOutages?: LiveOutage[];
  currentTimestep?: ScenarioTimestep | null;
}

/** Quoted plan actions for one substation at the scenario hour on screen. Shown only while a scenario is playing. */
export const SubstationCopilotCard: React.FC<SubstationCopilotCardProps> = ({
  substation,
  isLight,
  disasterScenario,
  liveOutages = [],
  currentTimestep
}) => {
  const floodLoaded = useOfficialFloodLoaded();
  const [copilotAdvisory, setCopilotAdvisory] = useState<SubstationCopilotAdvisory | null>(null);
  const [isLoadingCopilot, setIsLoadingCopilot] = useState(false);

  useEffect(() => {
    if (disasterScenario === 'NORMAL' || disasterScenario === 'LIVE') {
      setCopilotAdvisory(null);
      return;
    }
    // Show the rule-based advisory immediately, then upgrade it with Gemini once the hour stops changing.
    setCopilotAdvisory(generateDeterministicTacticalAdvisory(substation, disasterScenario, currentTimestep, liveOutages));
    setIsLoadingCopilot(true);
    let isSubscribed = true;
    const timer = setTimeout(() => {
      fetchSubstationTacticalAdvisory(substation, disasterScenario, currentTimestep, liveOutages)
        .then((advisory) => {
          if (isSubscribed) {
            setCopilotAdvisory(advisory);
            setIsLoadingCopilot(false);
          }
        })
        .catch((err) => {
          console.warn('Failed to load substation copilot:', err);
          if (isSubscribed) setIsLoadingCopilot(false);
        });
    }, 600);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [substation.code, disasterScenario, currentTimestep?.timestep_hour, liveOutages, floodLoaded]);

  if (disasterScenario === 'NORMAL' || disasterScenario === 'LIVE' || !copilotAdvisory) return null;

  return (
        <div
          className={`rounded-xl border p-3 transition-all shadow-xs ${
            isLight
              ? 'bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border-indigo-200 text-slate-900'
              : 'bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border-indigo-500/40 text-slate-100'
          }`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-400" />
              </div>
              <span className="font-bold text-xs tracking-tight text-indigo-950 dark:text-indigo-200 truncate">
                SUBSTATION COPILOT
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                OFFICIAL QUOTES
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isLoadingCopilot && (
                <RefreshCw className="w-2.5 h-2.5 text-indigo-400 animate-spin" />
              )}
              {copilotAdvisory.cached && (
                <span className="text-[9px] px-1 py-0.2 rounded font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  Cached
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {currentTimestep ? `T${currentTimestep.timestep_hour >= 0 ? '+' : ''}${currentTimestep.timestep_hour}h` : 'LIVE'}
              </span>
            </div>
          </div>

          {/* Flags from our grid data */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {copilotAdvisory.flags.length === 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600">
                No flags in our data
              </span>
            )}
            {copilotAdvisory.flags.map(flag => (
              <span
                key={flag.id}
                title={flag.detail}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border cursor-help ${
                  flag.id === 'LOW_LYING' || flag.id === 'FLOOD_MAP'
                    ? (isLight ? 'bg-cyan-100 text-cyan-950 border-cyan-300' : 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40')
                    : flag.id === 'OVERHEAD'
                    ? (isLight ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-500/20 text-amber-200 border-amber-500/40')
                    : (isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40')
                }`}
              >
                {flag.label}
              </span>
            ))}
          </div>

          {/* Note tying the actions to this substation's data */}
          {copilotAdvisory.note && (
            <p className="text-[11px] leading-relaxed mb-2.5 text-slate-700 dark:text-slate-300 bg-indigo-500/5 dark:bg-indigo-950/20 p-2 rounded border border-indigo-500/10">
              {copilotAdvisory.note}
            </p>
          )}

          {/* Official actions */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Official actions (quoted)</span>
              <span>({copilotAdvisory.actions.length})</span>
            </div>
            {copilotAdvisory.actions.map((act, idx) => (
              <div
                key={act.id || idx}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs"
              >
                <div className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-snug">{act.title}</div>
                <blockquote className="mt-1 text-[11px] italic leading-relaxed text-slate-700 dark:text-slate-300 border-l-2 border-indigo-300 dark:border-indigo-500/60 pl-2">
                  &ldquo;{act.quote}&rdquo;
                  <span className="block not-italic text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{act.citation}</span>
                </blockquote>
                {act.feeders && act.feeders.length > 0 && (
                  <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="font-bold uppercase tracking-wider">Feeders: </span>
                    <span className="font-mono">{act.feeders.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="truncate">{copilotAdvisory.modelTag}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoadingCopilot(true);
                fetchSubstationTacticalAdvisory(substation, disasterScenario, currentTimestep, liveOutages, { force: true }).then((res) => {
                  setCopilotAdvisory(res);
                  setIsLoadingCopilot(false);
                });
              }}
              className="hover:underline flex items-center gap-1 shrink-0 text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Re-evaluate
            </button>
          </div>
        </div>
  );
};
