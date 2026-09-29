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
  Search,
  Maximize2,
  Minimize2
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
import { useOfficialFloodLoaded } from '../../services/officialFloodLayers';

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
  panelWidth?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  onResetWidth?: () => void;
  onTogglePreset?: () => void;
  isResizing?: boolean;
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
  onShowLayers,
  panelWidth,
  onResizeStart,
  onResetWidth,
  onTogglePreset,
  isResizing
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const floodLayersLoaded = useOfficialFloodLoaded();

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
  }, [substations, crisisTriageFilter, liveOutages, substationsWithOutages, floodLayersLoaded]);

  const verifiedOutagesCount = useMemo(() => {
    return liveOutages.filter(o => o.mappingStatus === 'VERIFIED_ASSET').length;
  }, [liveOutages]);

  const unmappedAdvisoryCount = useMemo(() => {
    return liveOutages.filter(o => o.mappingStatus === 'UNMAPPED_ADVISORY').length;
  }, [liveOutages]);

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
          badgeLabel: '<75 SurgeGrid health score',
          icon: AlertTriangle,
          themeBg: isLight ? 'bg-amber-500' : 'bg-amber-500',
          themeText: isLight ? 'text-amber-700' : 'text-amber-400',
          badgeBg: isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          description: 'Substations with chronic forced trips or neglected scheduled maintenance.'
        };
      case 'waterlogging_risk':
        return {
          title: 'Waterlogging Risk Infra',
          badgeLabel: '≤ 2.0 m MSL or on an official flood map',
          icon: Waves,
          themeBg: isLight ? 'bg-cyan-600' : 'bg-cyan-500',
          themeText: isLight ? 'text-cyan-700' : 'text-cyan-400',
          badgeBg: isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          description: 'Yards at or below Chennai\'s average elevation of 2.0 m (GCC City DMP 2023), plus those in SurgeGrid\'s own flood-risk categories (our model, not from the plans).'
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
      className={`relative pointer-events-auto rounded-xl p-3 text-xs space-y-2.5 transition-all w-full max-h-[440px] flex flex-col ${
        isLight 
          ? 'bg-white/98 border border-slate-300/90 text-slate-800 shadow-[0_12px_40px_-4px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/10 backdrop-blur-md' 
          : 'bg-slate-900/95 border border-slate-700/80 text-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
      }`}
    >
      {/* Desktop Right-edge Drag-to-Resize Handle */}
      {onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          onDoubleClick={onResetWidth}
          className="hidden md:flex absolute -right-2.5 top-0 bottom-0 w-5 cursor-col-resize z-40 items-center justify-center group select-none"
          title="Drag to resize card width • Double-click to reset (360px)"
        >
          {/* Visual Grip Bar */}
          <div
            className={`w-1.5 h-12 rounded-full transition-all duration-150 ${
              isResizing
                ? isLight
                  ? 'bg-indigo-600 scale-y-125 shadow-md'
                  : 'bg-cyan-400 scale-y-125 shadow-lg shadow-cyan-500/50'
                : isLight
                ? 'bg-slate-300 group-hover:bg-indigo-500 group-hover:scale-y-110'
                : 'bg-slate-700 group-hover:bg-cyan-400 group-hover:scale-y-110'
            }`}
          />

          {/* Width tooltip while actively dragging */}
          {isResizing && panelWidth && (
            <div
              className={`absolute left-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[11px] font-mono font-bold pointer-events-none whitespace-nowrap shadow-xl border ${
                isLight
                  ? 'bg-slate-900 text-white border-slate-700'
                  : 'bg-slate-950 text-cyan-300 border-cyan-500/50'
              }`}
            >
              {panelWidth}px
            </div>
          )}
        </div>
      )}

      {/* 1. Header with Active Filter and Dismiss / Show Layers action */}
      <div className={`pb-2 border-b flex items-center justify-between shrink-0 ${isLight ? 'border-slate-300/70' : 'border-slate-700/80'}`}>
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
                {crisisTriageFilter === 'outages'
                  ? `${matchingSubstations.length} SS · ${verifiedOutagesCount} Mapped${unmappedAdvisoryCount > 0 ? ` (+${unmappedAdvisoryCount} Adv)` : ''}`
                  : `${matchingSubstations.length} SS`}
              </span>
            </div>
            <p className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {triageMeta.badgeLabel}
            </p>
          </div>
        </div>

        {/* Action Buttons: Layers Toggle or Dismiss Triage */}
        <div className="flex items-center gap-1 shrink-0">
          {onTogglePreset && (
            <button
              type="button"
              onClick={onTogglePreset}
              className={`hidden md:flex p-1 rounded-md transition-colors items-center justify-center ${
                isLight
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={
                panelWidth && panelWidth > 400
                  ? 'Restore standard width (360px)'
                  : 'Expand card width (480px)'
              }
            >
              {panelWidth && panelWidth > 400 ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {onShowLayers && (
            <button
              type="button"
              onClick={onShowLayers}
              className={`p-1 rounded-md transition-colors ${
                isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
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
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80' 
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
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
                ? 'bg-slate-100 border border-slate-300/80 focus:border-sky-500 focus:bg-white text-slate-800'
                : 'bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 text-slate-200'
            }`}
          />
        </div>
      )}

      {/* 2.5 Unmapped Advisory Banner if present */}
      {crisisTriageFilter === 'outages' && unmappedAdvisoryCount > 0 && (
        <div className={`p-2 rounded-lg text-[11px] flex items-center justify-between border shrink-0 ${
          isLight 
            ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
            : 'bg-amber-950/40 border-amber-800/40 text-amber-300'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0">⚠️</span>
            <span className="truncate">
              {unmappedAdvisoryCount} advisory notice{unmappedAdvisoryCount > 1 ? 's' : ''} active
            </span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 ${
            isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-900/60 text-amber-200'
          }`}>
            Quarantined
          </span>
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
                      ? 'bg-sky-50 border-sky-400 shadow-xs ring-1 ring-sky-300/50'
                      : 'bg-cyan-950/60 border-cyan-400 shadow-xs ring-1 ring-cyan-400/30 text-white'
                    : isLight
                    ? 'bg-slate-50/90 hover:bg-sky-50/90 border-slate-200 hover:border-sky-300 shadow-2xs'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 hover:border-slate-600 text-slate-200'
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
      <div className={`pt-2 border-t flex items-center justify-between text-[10px] shrink-0 ${
        isLight ? 'border-slate-300/70 text-slate-500' : 'border-slate-700/80 text-slate-400'
      }`}>
        <span>Click any node to zoom & inspect</span>
        <button
          type="button"
          onClick={() => setCrisisTriageFilter('all')}
          className={`hover:underline font-medium ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
        >
          View all 286 SS
        </button>
      </div>
    </div>
  );
};
