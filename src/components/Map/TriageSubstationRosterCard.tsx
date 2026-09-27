import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  Waves, 
  Zap, 
  X, 
  ChevronRight, 
  Navigation, 
  Layers, 
  ShieldAlert, 
  Search
} from 'lucide-react';
import type { TnebSubstation } from '../../types/tneb';
import type { CrisisTriageFilter } from './DisasterCockpitBar';
import type { LiveOutage } from '../../services/liveOutageService';
import { 
  getEnrichedHealthProfile, 
  isSubstationAtRisk, 
  isSubstationWaterloggingRisk 
} from '../../services/gridHealthService';
import { getOutagesForSubstation } from '../../services/liveOutageService';

interface TriageSubstationRosterCardProps {
  crisisTriageFilter: CrisisTriageFilter;
  setCrisisTriageFilter: (filter: CrisisTriageFilter) => void;
  substations: TnebSubstation[];
  selectedSubstation: TnebSubstation | null;
  onSelectSubstation: (substation: TnebSubstation | null) => void;
  onFlyToSubstation?: (substation: TnebSubstation) => void;
  liveOutages?: LiveOutage[];
  substationsWithOutages?: Set<string>;
  isLight: boolean;
  onShowLayers?: () => void;
}

export const TriageSubstationRosterCard: React.FC<TriageSubstationRosterCardProps> = ({
  crisisTriageFilter,
  setCrisisTriageFilter,
  substations,
  selectedSubstation,
  onSelectSubstation,
  onFlyToSubstation,
  liveOutages = [],
  substationsWithOutages = new Set(),
  isLight,
  onShowLayers
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // 1. Filter and sort substations matching active triage criteria
  const matchingSubstations = useMemo(() => {
    if (crisisTriageFilter === 'all') return [];

    const matched = substations.filter(s => {
      if (crisisTriageFilter === 'poor_stability') {
        return isSubstationAtRisk(s, liveOutages);
      }
      if (crisisTriageFilter === 'waterlogging_risk') {
        return isSubstationWaterloggingRisk(s);
      }
      if (crisisTriageFilter === 'outages') {
        return substationsWithOutages.has(s.code);
      }
      return false;
    });

    // Smart triage sorting:
    return matched.sort((a, b) => {
      if (crisisTriageFilter === 'poor_stability') {
        // Worst health score first (e.g. 47 before 71)
        const scoreA = getEnrichedHealthProfile(a, liveOutages).healthScore;
        const scoreB = getEnrichedHealthProfile(b, liveOutages).healthScore;
        return scoreA - scoreB;
      }
      if (crisisTriageFilter === 'waterlogging_risk') {
        // Lowest elevation first (most vulnerable to flood)
        const elevA = a.elevationM !== undefined ? a.elevationM : 99;
        const elevB = b.elevationM !== undefined ? b.elevationM : 99;
        return elevA - elevB;
      }
      // Outages: highest active outage count first
      const outA = getOutagesForSubstation(a, liveOutages).length;
      const outB = getOutagesForSubstation(b, liveOutages).length;
      return outB - outA;
    });
  }, [substations, crisisTriageFilter, liveOutages, substationsWithOutages]);

  // 2. Local search query filtering (optional text filter within triage list)
  const displayedSubstations = useMemo(() => {
    if (!filterQuery.trim()) return matchingSubstations;
    const q = filterQuery.toLowerCase();
    return matchingSubstations.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.cleanName && s.cleanName.toLowerCase().includes(q)) ||
      (s.circle && s.circle.toLowerCase().includes(q)) ||
      (s.gccZoneName && s.gccZoneName.toLowerCase().includes(q))
    );
  }, [matchingSubstations, filterQuery]);

  // Metadata per active triage mode
  const triageMeta = useMemo(() => {
    switch (crisisTriageFilter) {
      case 'poor_stability':
        return {
          title: 'Poor Stability Infra',
          badgeLabel: '<75 Health Score',
          icon: AlertTriangle,
          themeBg: isLight ? 'bg-amber-500' : 'bg-amber-500',
          themeText: isLight ? 'text-amber-700' : 'text-amber-400',
          badgeBg: isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          description: 'Substations with chronic forced trips or neglected scheduled maintenance.'
        };
      case 'waterlogging_risk':
        return {
          title: 'Waterlogging Risk Infra',
          badgeLabel: '≤3.2m MSL / Surge',
          icon: Waves,
          themeBg: isLight ? 'bg-cyan-600' : 'bg-cyan-500',
          themeText: isLight ? 'text-cyan-700' : 'text-cyan-400',
          badgeBg: isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          description: 'Low-elevation switchyards vulnerable to storm surge backflow and yard inundation.'
        };
      case 'outages':
        return {
          title: 'Active Grid Outages',
          badgeLabel: 'Live Feeder Trips',
          icon: Zap,
          themeBg: isLight ? 'bg-orange-500' : 'bg-orange-500',
          themeText: isLight ? 'text-orange-700' : 'text-orange-400',
          badgeBg: isLight ? 'bg-orange-100 text-orange-900 border-orange-300' : 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          description: 'Substations currently affected by active line trips and power interruption calls.'
        };
      default:
        return {
          title: 'Triage Roster',
          badgeLabel: 'Active Filter',
          icon: ShieldAlert,
          themeBg: 'bg-slate-500',
          themeText: 'text-slate-400',
          badgeBg: 'bg-slate-800 text-slate-300',
          description: 'Filtered infrastructure list.'
        };
    }
  }, [crisisTriageFilter, isLight]);

  const HeaderIcon = triageMeta.icon;

  const handleSubstationClick = (ss: TnebSubstation) => {
    onSelectSubstation(ss);
    if (onFlyToSubstation) {
      onFlyToSubstation(ss);
    }
  };

  return (
    <div
      className={`pointer-events-auto rounded-xl p-3 shadow-2xl text-xs space-y-2.5 transition-all w-full max-h-[440px] flex flex-col ${
        isLight 
          ? 'bg-white/95 border border-slate-200/90 text-slate-800 backdrop-blur-md shadow-slate-300/40' 
          : 'bg-slate-900/95 border border-slate-700/80 text-slate-200 backdrop-blur-md shadow-black/70'
      }`}
    >
      {/* 1. Header with Active Filter and Dismiss / Show Layers action */}
      <div className={`pb-2 border-b flex items-center justify-between shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${triageMeta.badgeBg} shrink-0`}>
            <HeaderIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs truncate">
                {triageMeta.title}
              </span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${triageMeta.badgeBg}`}>
                {matchingSubstations.length} SS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {triageMeta.badgeLabel}
            </p>
          </div>
        </div>

        {/* Action Buttons: Layers Toggle or Dismiss Triage */}
        <div className="flex items-center gap-1 shrink-0">
          {onShowLayers && (
            <button
              type="button"
              onClick={onShowLayers}
              className={`p-1 rounded-md transition-colors title="Show Map Layers" ${
                isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
              }`}
              title="Toggle standard TNEB Grid Layers"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setCrisisTriageFilter('all')}
            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 transition-all ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Clear triage filter and show all 286 substations"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Optional Quick Search within the Triage List (when list has > 5 items) */}
      {matchingSubstations.length > 5 && (
        <div className="relative shrink-0">
          <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={`Filter ${matchingSubstations.length} substations...`}
            className={`w-full pl-6 pr-2 py-1 rounded-lg text-xs outline-none transition-all ${
              isLight
                ? 'bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800'
                : 'bg-slate-950/60 border border-slate-800 focus:border-cyan-500 text-slate-200'
            }`}
          />
        </div>
      )}

      {/* 3. Scrollable List of Filtered Substations */}
      <div className="overflow-y-auto space-y-1.5 pr-0.5 flex-1 max-h-[300px] scrollbar-thin">
        {displayedSubstations.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1">
            <p className="font-semibold text-xs">No substations match search</p>
            <p className="text-[10px]">Try clearing your search query</p>
          </div>
        ) : (
          displayedSubstations.map((ss) => {
            const isSelected = selectedSubstation?.code === ss.code;
            const profile = getEnrichedHealthProfile(ss, liveOutages);
            const stationOutages = getOutagesForSubstation(ss, liveOutages);

            return (
              <button
                key={ss.code}
                type="button"
                onClick={() => handleSubstationClick(ss)}
                className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 group ${
                  isSelected
                    ? isLight
                      ? 'bg-sky-50 border-sky-400 shadow-xs'
                      : 'bg-cyan-950/40 border-cyan-500 shadow-xs'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Name and Voltage */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs truncate group-hover:text-cyan-400 transition-colors">
                      {ss.name}
                    </span>
                  </div>

                  {/* Contextual Badges based on active Triage Mode */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    {crisisTriageFilter === 'poor_stability' && (
                      <>
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                          profile.healthGrade === 'D'
                            ? (isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30')
                            : (isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30')
                        }`}>
                          Grade {profile.healthGrade} • {profile.healthScore}/100
                        </span>

                        <span className="text-slate-400">
                          {profile.unscheduledTripsCount} Trips • {profile.periodicMaintenanceCount} PMs
                        </span>

                        {profile.periodicMaintenanceCount === 0 && (
                          <span className={`px-1 rounded font-semibold ${isLight ? 'bg-rose-50 text-rose-700' : 'bg-rose-950/60 text-rose-400'}`}>
                            Neglected
                          </span>
                        )}
                      </>
                    )}

                    {crisisTriageFilter === 'waterlogging_risk' && (
                      <>
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                          (ss.elevationM !== undefined && ss.elevationM <= 2.0)
                            ? (isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30')
                            : (isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30')
                        }`}>
                          {ss.elevationM !== undefined ? `${ss.elevationM}m MSL` : 'Low Elevation'}
                        </span>

                        {ss.benchmarked2015FloodDepthM && (
                          <span className="text-slate-400">
                            2015: {ss.benchmarked2015FloodDepthM}m Flood
                          </span>
                        )}

                        {ss.gccZoneName && (
                          <span className="text-slate-400">
                            Zone {ss.gccZone || ''} ({ss.gccZoneName})
                          </span>
                        )}
                      </>
                    )}

                    {crisisTriageFilter === 'outages' && (
                      <>
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                          isLight ? 'bg-orange-100 text-orange-800' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}>
                          ⚡ {stationOutages.length} Active Outage{stationOutages.length > 1 ? 's' : ''}
                        </span>

                        {stationOutages[0]?.workType && (
                          <span className="text-slate-400 truncate max-w-[150px]">
                            {stationOutages[0].workType}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right Arrow / Zoom Indicator */}
                <div className="shrink-0 flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
                  <Navigation className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 4. Footer Summary bar */}
      <div className={`pt-2 border-t flex items-center justify-between text-[10px] text-slate-400 shrink-0 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <span>Click any node to zoom & inspect</span>
        <button
          type="button"
          onClick={() => setCrisisTriageFilter('all')}
          className="hover:underline font-medium text-slate-400 hover:text-slate-200"
        >
          View all 286 SS
        </button>
      </div>
    </div>
  );
};
