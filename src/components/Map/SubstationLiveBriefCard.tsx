import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import type { LiveOutage } from '../../services/liveOutageService';
import type { LiveWeatherConditions } from '../../services/liveWeatherService';
import { fetchSubstationBrief, ruleBrief, type SubstationBrief } from '../../services/geminiLiveBriefService';
import { useOfficialFloodLoaded } from '../../services/officialFloodLayers';
import { useReliefCentres } from '../../services/reliefCentres';

interface SubstationLiveBriefCardProps {
  substation: TnebSubstation;
  isLight: boolean;
  disasterScenario: DisasterScenario;
  liveOutages?: LiveOutage[];
  liveWeather?: LiveWeatherConditions | null;
}

/**
 * Live-day summary of one substation, shown in the Respond tab when no scenario is playing.
 * Gemini only words a summary of facts we send (and show below); it never picks or quotes plan actions.
 */
export const SubstationLiveBriefCard: React.FC<SubstationLiveBriefCardProps> = ({
  substation,
  isLight,
  disasterScenario,
  liveOutages = [],
  liveWeather
}) => {
  const floodLoaded = useOfficialFloodLoaded();
  const relief = useReliefCentres();
  const ward = substation.gccWard !== undefined ? String(substation.gccWard) : null;
  const reliefCount = ward && relief ? (relief.wards[ward]?.centres.length ?? 0) : null;

  const [brief, setBrief] = useState<SubstationBrief | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isLive = disasterScenario === 'NORMAL' || disasterScenario === 'LIVE';

  useEffect(() => {
    if (!isLive) return;
    // Show the rule-based summary at once, then upgrade it with Gemini when the inputs settle.
    setBrief(ruleBrief(substation, liveOutages, liveWeather, reliefCount));
    setIsLoading(true);
    let alive = true;
    const timer = setTimeout(() => {
      fetchSubstationBrief(substation, liveOutages, liveWeather, reliefCount).then(res => {
        if (alive) {
          setBrief(res);
          setIsLoading(false);
        }
      });
    }, 600);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [substation.code, liveOutages, liveWeather, floodLoaded, reliefCount, isLive]);

  if (!isLive || !brief) return null;

  const muted = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div
      className={`rounded-xl border p-3 shadow-xs ${
        isLight
          ? 'bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border-indigo-200 text-slate-900'
          : 'bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border-indigo-500/40 text-slate-100'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-400" />
          </div>
          <span className="font-bold text-[13px] tracking-tight truncate">AI SUMMARY</span>
          <span className="text-xs px-1 py-0.5 rounded font-mono font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
            LIVE
          </span>
        </div>
        {isLoading && <RefreshCw className="w-2.5 h-2.5 text-indigo-400 animate-spin shrink-0" />}
      </div>

      <p className="text-[12.5px] leading-relaxed">{brief.summary}</p>

      <details className="mt-2">
        <summary className={`text-xs cursor-pointer ${muted}`}>Facts used for this summary</summary>
        <ul className={`mt-1 space-y-0.5 text-xs font-mono ${muted}`}>
          {brief.facts.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </details>

      <div className={`flex items-center justify-between mt-2.5 pt-2 border-t text-xs ${muted} ${isLight ? 'border-slate-200/70' : 'border-slate-800'}`}>
        <span className="truncate">{brief.modelTag}. The health score is our own rating.</span>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            fetchSubstationBrief(substation, liveOutages, liveWeather, reliefCount, { force: true }).then(res => {
              setBrief(res);
              setIsLoading(false);
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
