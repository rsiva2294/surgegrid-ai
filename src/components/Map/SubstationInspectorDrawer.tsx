import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  Shield,
  Phone,
  Mail,
  MapPin,
  X,
  Users,
  Activity,
  GitFork,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Building2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { TnebSubstation, TnebSection, FeederDetail } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import type { ConnectedGridNode } from './TnebGridMap';
import { MunicipalDisasterCard } from './MunicipalDisasterCard';
import { FeederCardItem } from './FeederCardItem';
import { GridJargonCheatSheet } from './GridJargonCheatSheet';
import { SubstationHealthCard } from './SubstationHealthCard';
import { SubstationCopilotCard } from './SubstationCopilotCard';
import { SubstationLiveBriefCard } from './SubstationLiveBriefCard';
import type { LiveWeatherConditions } from '../../services/liveWeatherService';
import { type LiveOutage, getOutagesForSubstation, getOutagesForSection } from '../../services/liveOutageService';
import type { ScenarioTimestep } from '../../services/scenarioService';
import { FloodExposureCard } from './FloodExposureCard';
import { SiteBriefingCard } from './SiteBriefingCard';
import { FloodPlanNotes } from './FloodPlanNotes';
import { useSectionBoundary } from '../../services/sectionBoundaries';
import { ReliefCentresCard } from './ReliefCentresCard';
import { useOfficialFlood } from '../../services/officialFloodLayers';
import { getEnrichedHealthProfile } from '../../services/gridHealthService';

interface SubstationInspectorDrawerProps {
  selectedSubstation: TnebSubstation | null;
  selectedSection: TnebSection | null;
  onSelectSubstation: (ss: TnebSubstation | null) => void;
  onSelectSection: (sec: TnebSection | null) => void;
  electricalNodes: ConnectedGridNode[];
  jurisdictionalSections: ConnectedGridNode[];
  showConnections: boolean;
  setShowConnections: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFeeder: FeederDetail | null;
  setSelectedFeeder: React.Dispatch<React.SetStateAction<FeederDetail | null>>;
  disasterScenario: DisasterScenario;
  liveOutages?: LiveOutage[];
  isLight: boolean;
  currentTimestep?: ScenarioTimestep | null;
  liveWeather?: LiveWeatherConditions | null;
}

export const SubstationInspectorDrawer: React.FC<SubstationInspectorDrawerProps> = ({
  selectedSubstation,
  selectedSection,
  onSelectSubstation,
  onSelectSection,
  electricalNodes,
  jurisdictionalSections,
  showConnections,
  setShowConnections,
  selectedFeeder,
  setSelectedFeeder,
  disasterScenario,
  liveOutages = [],
  isLight,
  currentTimestep,
  liveWeather
}) => {
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'feeders' | 'respond'>('overview');
  const isReplay = disasterScenario !== 'NORMAL' && disasterScenario !== 'LIVE';
  const sectionBoundary = useSectionBoundary(selectedSection?.code);
  const { flood: officialFlood } = useOfficialFlood(selectedSubstation?.code);
  const [isLinksListExpanded, setIsLinksListExpanded] = useState(false);
  const [showJargonGuide, setShowJargonGuide] = useState(false);
  const [feederFilter, setFeederFilter] = useState('');
  const [feederCategoryFilter, setFeederCategoryFilter] = useState<'all' | 'lifelines'>('all');

  // Resizable drawer width state & persistence (default 460px, min 380px, max 840px / 65vw)
  const DEFAULT_DRAWER_WIDTH = 460;
  const MIN_DRAWER_WIDTH = 380;

  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_DRAWER_WIDTH;
    try {
      const saved = localStorage.getItem('sg_inspector_drawer_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_DRAWER_WIDTH && parsed <= 1200) {
          return Math.min(parsed, Math.round(window.innerWidth * 0.7));
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_DRAWER_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleWindowResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = drawerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Drawer is anchored to the right, so moving left increases drawer width
      const deltaX = startX - moveEvent.clientX;
      const maxAllowed = Math.min(840, Math.round(window.innerWidth * 0.65));
      const nextWidth = Math.max(MIN_DRAWER_WIDTH, Math.min(maxAllowed, startWidth + deltaX));
      setDrawerWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDrawerWidth((current) => {
        try {
          localStorage.setItem('sg_inspector_drawer_width', String(current));
        } catch {
          // ignore
        }
        return current;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetWidth = () => {
    setDrawerWidth(DEFAULT_DRAWER_WIDTH);
    try {
      localStorage.setItem('sg_inspector_drawer_width', String(DEFAULT_DRAWER_WIDTH));
    } catch {
      // ignore
    }
  };

  const toggleWidthPreset = () => {
    const targetWidth =
      drawerWidth > 550
        ? DEFAULT_DRAWER_WIDTH
        : Math.min(680, Math.round(window.innerWidth * 0.6));
    setDrawerWidth(targetWidth);
    try {
      localStorage.setItem('sg_inspector_drawer_width', String(targetWidth));
    } catch {
      // ignore
    }
  };

  // Reset internal tab and filters on substation change
  useEffect(() => {
    setFeederCategoryFilter('all');
    setInspectorTab('overview');
    setIsLinksListExpanded(false);
    setShowJargonGuide(false);
    setFeederFilter('');
  }, [selectedSubstation]);

  const activeSubstationOutages = useMemo(() => {
    return selectedSubstation ? getOutagesForSubstation(selectedSubstation, liveOutages) : [];
  }, [selectedSubstation, liveOutages]);

  const activeSectionOutages = useMemo(() => {
    return selectedSection ? getOutagesForSection(selectedSection, liveOutages) : [];
  }, [selectedSection, liveOutages]);

  const getFeederPriorityRank = (f: FeederDetail): number => {
    if (f.priorityLevel === 'P1_CRITICAL' || f.priorityLevel === 'P1_NON_CUT' || f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water') return 1;
    if (f.priorityLevel === 'P2_ESSENTIAL' || f.lifelineCategory === 'transit' || f.lifelineCategory === 'governance') return 2;
    const is33kVTrunk = f.voltage?.includes('33') && !f.type?.toLowerCase().includes('dedicated') && f.lifelineCategory !== 'industrial_ht' && f.priorityLevel !== 'P3_COMMERCIAL';
    if (is33kVTrunk) return 3;
    if (f.priorityLevel === 'P3_COMMERCIAL' || f.lifelineCategory === 'industrial_ht' || f.type?.toLowerCase().includes('dedicated')) return 4;
    return 5;
  };

  const getFeederVoltageNum = (voltageStr?: string): number => {
    if (!voltageStr) return 0;
    const match = voltageStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const lifelineFeedersCount = useMemo(() => {
    if (!selectedSubstation || !selectedSubstation.feeders) return 0;
    return selectedSubstation.feeders.filter(f => Boolean(f.lifelineCategory)).length;
  }, [selectedSubstation]);

  const filteredFeeders = useMemo(() => {
    if (!selectedSubstation || !selectedSubstation.feeders) return [];
    let list = selectedSubstation.feeders;
    if (feederCategoryFilter === 'lifelines') {
      list = list.filter(f => Boolean(f.lifelineCategory));
    }
    if (feederFilter.trim()) {
      const q = feederFilter.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.code.includes(q) ||
        f.voltage.toLowerCase().includes(q) ||
        (f.lifelineLabel && f.lifelineLabel.toLowerCase().includes(q))
      );
    }
    return list.slice().sort((a, b) => {
      const pA = getFeederPriorityRank(a);
      const pB = getFeederPriorityRank(b);
      if (pA !== pB) return pA - pB;
      const vA = getFeederVoltageNum(a.voltage);
      const vB = getFeederVoltageNum(b.voltage);
      if (vA !== vB) return vB - vA;
      const cA = a.consumers || 0;
      const cB = b.consumers || 0;
      if (cA !== cB) return cB - cA;
      const tA = a.transformers || 0;
      const tB = b.transformers || 0;
      if (tA !== tB) return tB - tA;
      return a.name.localeCompare(b.name);
    });
  }, [selectedSubstation, feederFilter, feederCategoryFilter]);

  if (!selectedSubstation && !selectedSection) return null;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 md:inset-auto md:top-4 md:bottom-4 md:right-4 z-30 pointer-events-none flex flex-col items-end ${
        isResizing ? 'transition-none select-none' : 'transition-[width] duration-200'
      } w-full max-h-[75vh] md:max-h-none`}
      style={{
        width: isDesktop ? `${drawerWidth}px` : undefined,
        maxWidth: isDesktop ? 'min(840px, calc(100vw - 32px))' : '100%',
      }}
    >
      <div
        className={`relative pointer-events-auto rounded-t-2xl md:rounded-2xl p-3.5 sm:p-4 flex flex-col h-full w-full border transition-colors ${
          isLight
            ? 'bg-white/98 border border-slate-300/90 text-slate-800 shadow-[0_-10px_35px_rgba(15,23,42,0.18)] md:shadow-[-16px_0_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 backdrop-blur-md'
            : 'bg-slate-900/95 border-t-2 md:border-t-0 md:border-l-2 border-slate-700/90 text-slate-200 shadow-[0_-12px_40px_rgba(0,0,0,0.9)] md:shadow-[-16px_0_45px_rgba(0,0,0,0.9)] ring-1 ring-white/10 backdrop-blur-xl'
        }`}
      >
        {/* Desktop Left-edge Drag-to-Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResetWidth}
          className="hidden md:flex absolute -left-2.5 top-0 bottom-0 w-5 cursor-col-resize z-40 items-center justify-center group select-none"
          title="Drag to resize drawer width • Double-click to reset (460px)"
        >
          {/* Visual Grip Bar */}
          <div
            className={`w-1.5 h-14 rounded-full transition-all duration-150 ${
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
          {isResizing && (
            <div
              className={`absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[12.5px] font-mono font-bold pointer-events-none whitespace-nowrap shadow-xl border ${
                isLight
                  ? 'bg-slate-900 text-white border-slate-700'
                  : 'bg-slate-950 text-cyan-300 border-cyan-500/50'
              }`}
            >
              {drawerWidth}px
            </div>
          )}
        </div>

        {/* Mobile Sheet Drag Indicator */}
        <div className="w-12 h-1 bg-slate-400/40 dark:bg-slate-500/40 rounded-full mx-auto -mt-1 mb-2.5 md:hidden shrink-0" />

        {/* Pinned Header */}
        <div className={`flex items-start justify-between gap-3 pb-3 border-b shrink-0 ${isLight ? 'border-slate-300/70' : 'border-slate-700/80'}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold uppercase tracking-wider ${
                  selectedSubstation?.tier === 'bulk'
                    ? isLight
                      ? 'bg-pink-100 text-pink-700 border border-pink-300'
                      : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                    : selectedSubstation?.tier === 'subtransmission'
                    ? isLight
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : selectedSubstation?.tier === 'distribution'
                    ? isLight
                      ? 'bg-sky-100 text-sky-700 border border-sky-300'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : isLight
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {selectedSubstation
                  ? selectedSubstation.tier === 'bulk'
                    ? `EHV BULK TRANSMISSION (${selectedSubstation.voltage} kV)`
                    : selectedSubstation.tier === 'subtransmission'
                    ? `SUB-TRANSMISSION HUB (${selectedSubstation.voltage} kV)`
                    : `DISTRIBUTION YARD (${selectedSubstation.voltage} kV)`
                  : 'TNEB AE SECTION OFFICE'}
              </span>
              {!selectedSubstation && (
                <span className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  #{selectedSection?.code}
                </span>
              )}
              {((selectedSubstation?.gccZone && selectedSubstation?.gccWard) ||
                (selectedSection?.gccZone && selectedSection?.gccWard)) && (
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                    isLight
                      ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      : 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30'
                  }`}
                  title={`Greater Chennai Corporation: Zone ${
                    selectedSubstation?.gccZone || selectedSection?.gccZone
                  } (${selectedSubstation?.gccZoneName || selectedSection?.gccZoneName}) • Ward ${
                    selectedSubstation?.gccWard || selectedSection?.gccWard
                  }`}
                >
                  <span>🏛️</span>
                  <span>
                    Z{selectedSubstation?.gccZone || selectedSection?.gccZone}:W
                    {selectedSubstation?.gccWard || selectedSection?.gccWard}
                  </span>
                </span>
              )}
              {selectedSubstation?.elevationM !== undefined && (
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                  title={`Ground elevation: ${selectedSubstation.elevationM} m MSL (SRTM terrain data). Distance to coast: ${
                    selectedSubstation.distanceToCoastKm || 0
                  } km`}
                >
                  <span>⛰️ {selectedSubstation.elevationM}m MSL</span>
                </span>
              )}
            </div>
            <h2 className={`text-base font-bold leading-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {selectedSubstation?.name || selectedSection?.name}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Width Toggle (Desktop Only) */}
            <button
              onClick={toggleWidthPreset}
              className={`hidden md:flex p-1.5 rounded-lg transition-colors items-center justify-center ${
                isLight
                  ? 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                  : 'text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80'
              }`}
              title={
                drawerWidth > 550
                  ? 'Switch to compact view (460px)'
                  : 'Expand drawer view (680px)'
              }
            >
              {drawerWidth > 550 ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                onSelectSubstation(null);
                onSelectSection(null);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight
                  ? 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                  : 'text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Substation Specific Telemetry & Views */}
        {selectedSubstation && (
          <div className="flex flex-col flex-1 min-h-0 pt-2">
            {/* Compact Horizontal Quick-Stats Ribbon */}
            <div className={`grid grid-cols-2 gap-2 pb-2 shrink-0 border-b text-center text-xs ${isLight ? 'border-slate-300/70' : 'border-slate-700/80'}`}>
              <div
                className={`p-2 rounded-xl border ${
                  isLight ? 'bg-sky-50/80 border-sky-200/90 shadow-2xs' : 'bg-slate-950/70 border-slate-700/80 shadow-inner'
                }`}
              >
                <span
                  className={`text-xs flex items-center justify-center gap-1.5 font-medium ${
                    isLight ? 'text-sky-700' : 'text-slate-400'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Consumers
                </span>
                <span
                  className={`font-mono font-bold text-base block mt-0.5 ${
                    isLight ? 'text-sky-950' : 'text-cyan-300'
                  }`}
                >
                  {selectedSubstation.totalConsumers > 0
                    ? selectedSubstation.totalConsumers.toLocaleString()
                    : selectedSubstation.tier === 'bulk'
                    ? 'Bulk Feed'
                    : '0'}
                </span>
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  isLight ? 'bg-amber-50/80 border-amber-200/90 shadow-2xs' : 'bg-slate-950/70 border-slate-700/80 shadow-inner'
                }`}
              >
                <span
                  className={`text-xs flex items-center justify-center gap-1.5 font-medium ${
                    isLight ? 'text-amber-700' : 'text-slate-400'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  DTRs (DTs)
                </span>
                <span
                  className={`font-mono font-bold text-base block mt-0.5 ${
                    isLight ? 'text-amber-950' : 'text-amber-300'
                  }`}
                >
                  {selectedSubstation.totalTransformers.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status line: what a user needs first, visible on every tab */}
            {(() => {
              const profile = getEnrichedHealthProfile(selectedSubstation, activeSubstationOutages);
              const chip = 'px-2 py-0.5 rounded-md text-xs font-semibold border';
              const grade = {
                A: isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                B: isLight ? 'bg-sky-100 text-sky-900 border-sky-300' : 'bg-sky-500/20 text-cyan-300 border-sky-500/40',
                C: isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                D: isLight ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }[profile.healthGrade];
              // During a replay, today's health score and outage notices do not describe December 2023, so they step aside.
              if (isReplay && !officialFlood?.nrsc2015) return null;
              return (
                <div className="flex items-center gap-1.5 flex-wrap pt-2 shrink-0 text-xs">
                  {!isReplay && <span className={`${chip} ${grade}`} title="SurgeGrid health score, our own model from 90-day outage history">
                    Health {profile.healthGrade} · {profile.healthScore}/100
                  </span>}
                  {isReplay ? null : activeSubstationOutages.length > 0 ? (
                    <span className={`${chip} ${isLight ? 'bg-red-100 text-red-800 border-red-300' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                      {activeSubstationOutages.length} live outage notice{activeSubstationOutages.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className={`${chip} ${isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      No live outage notice
                    </span>
                  )}
                  {officialFlood?.nrsc2015 && (
                    <span className={`${chip} ${isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'}`}>
                      Inside the 2015 flood extent
                    </span>
                  )}
                </div>
              );
            })()}


            {/* Substation Content */}
              <div className="flex flex-col flex-1 min-h-0 pt-2 space-y-2">
                {/* Navigation Tabs */}
                <div
                  className={`flex items-center gap-1 p-1 rounded-xl border shrink-0 text-xs ${
                    isLight ? 'bg-slate-100 border-slate-300/80' : 'bg-slate-950/90 border-slate-700/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setInspectorTab('overview')}
                    className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-[13px] ${
                      inspectorTab === 'overview'
                        ? isLight
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                          : 'bg-slate-800 text-white shadow-sm border border-slate-600/70'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Overview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('feeders')}
                    className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-[13px] ${
                      inspectorTab === 'feeders'
                        ? isLight
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                          : 'bg-slate-800 text-white shadow-sm border border-slate-600/70'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">Feeders ({selectedSubstation.feeders.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('respond')}
                    className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-[13px] ${
                      inspectorTab === 'respond'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Respond</span>
                  </button>
                </div>

                {/* Tab 2: Circuits & Grid Content */}
                {inspectorTab === 'feeders' && (
                  <div className="flex flex-col flex-1 min-h-0 space-y-2">
                    {/* Feeders Heading, Filter & Jargon Explainer Button */}
                    <div className="flex flex-col gap-1.5 shrink-0 pt-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Zap className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                          <span className="font-bold text-xs uppercase tracking-wider">
                            Distribution Circuits ({selectedSubstation.feeders.length})
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setFeederCategoryFilter('all')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
                              feederCategoryFilter === 'all'
                                ? isLight
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-white text-slate-950 font-black shadow-xs'
                                : isLight
                                ? 'text-slate-600 hover:text-slate-900'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            All ({selectedSubstation.feeders.length})
                          </button>

                          {lifelineFeedersCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setFeederCategoryFilter('lifelines')}
                              className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                                feederCategoryFilter === 'lifelines'
                                  ? isLight
                                    ? 'bg-rose-600 text-white shadow-xs font-black'
                                    : 'bg-rose-500 text-slate-950 font-black shadow-xs'
                                  : isLight
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              <span>🚨 Lifelines</span>
                              <span className="font-mono">({lifelineFeedersCount})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Search Filter & Jargon Guide Toggle */}
                      <div className="flex items-center gap-1.5">
                        {selectedSubstation.feeders.length > 4 && (
                          <input
                            type="text"
                            placeholder={
                              feederCategoryFilter === 'lifelines'
                                ? 'Filter lifeline feeders...'
                                : 'Filter feeder by name...'
                            }
                            value={feederFilter}
                            onChange={(e) => setFeederFilter(e.target.value)}
                            className={`flex-1 px-2.5 py-1 text-xs rounded-lg border outline-none ${
                              isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                                : 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder-slate-500'
                            }`}
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => setShowJargonGuide(!showJargonGuide)}
                          className={`font-semibold text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded-lg border shrink-0 ${
                            isLight
                              ? 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100'
                              : 'bg-slate-900 border-slate-700 text-cyan-300 hover:bg-slate-800'
                          }`}
                        >
                          <Info className="w-3 h-3" />
                          <span>{showJargonGuide ? 'Hide Guide' : 'Jargon'}</span>
                        </button>
                      </div>

                      {/* Collapsible Grid Jargon Explainer Cheat Sheet */}
                      {showJargonGuide && (
                        <GridJargonCheatSheet onClose={() => setShowJargonGuide(false)} isLight={isLight} />
                      )}
                    </div>

                    {/* Feeders Scroll List */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                      {filteredFeeders.length > 0 ? (
                        filteredFeeders.map((f, idx) => (
                          <FeederCardItem
                            key={f.code || idx}
                            feeder={f}
                            isFeederActive={selectedFeeder?.code === f.code}
                            selectedSubstation={selectedSubstation}
                            disasterScenario={disasterScenario}
                            isLight={isLight}
                            onSelectFeeder={(feeder) =>
                              setSelectedFeeder(selectedFeeder?.code === feeder.code ? null : feeder)
                            }
                          />
                        ))
                      ) : (
                        <div
                          className={`p-3 text-center rounded-xl border text-xs ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                              : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                          }`}
                        >
                          {feederFilter
                            ? 'No feeders match your search filter.'
                            : feederCategoryFilter === 'lifelines'
                            ? 'No critical lifeline feeders identified on this substation.'
                            : 'Primary extra-high-voltage bulk grid node.'}
                        </div>
                      )}
                    </div>
                    {/* Circuit isolation (map tool), kept below the feeder list */}
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                        showConnections
                          ? isLight
                            ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20'
                            : 'bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20'
                          : isLight
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              showConnections
                                ? isLight
                                  ? 'bg-sky-600 text-white shadow-sm'
                                  : 'bg-cyan-500 text-slate-950 shadow-sm'
                                : isLight
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <GitFork className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[12.5px] font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                Isolate Electrical Circuit
                              </span>
                              <span
                                className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold shrink-0 ${
                                  electricalNodes.length > 0
                                    ? isLight
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-cyan-500/20 text-cyan-300'
                                    : isLight
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {electricalNodes.length}{' '}
                                {electricalNodes.length === 1 ? 'electrical link' : 'electrical links'}
                              </span>
                            </div>
                            <p
                              className={`text-xs leading-tight truncate mt-0.5 ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              {showConnections
                                ? 'Circuit isolated • Unrelated markers hidden • Power flow animated'
                                : 'Isolate circuit & hide unrelated markers on map'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {electricalNodes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsLinksListExpanded(!isLinksListExpanded)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                isLinksListExpanded
                                  ? isLight
                                    ? 'bg-sky-100 border-sky-300 text-sky-800'
                                    : 'bg-cyan-950 border-cyan-700 text-cyan-200'
                                  : isLight
                                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span>{isLinksListExpanded ? 'Hide' : 'Inspect'}</span>
                              {isLinksListExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={showConnections}
                            onClick={() => setShowConnections(!showConnections)}
                            disabled={electricalNodes.length === 0}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              electricalNodes.length === 0
                                ? 'opacity-40 cursor-not-allowed bg-slate-300'
                                : showConnections
                                ? isLight
                                  ? 'bg-sky-600'
                                  : 'bg-cyan-500'
                                : isLight
                                ? 'bg-slate-300'
                                : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                showConnections ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Connected Grid Nodes Drawer */}
                      {isLinksListExpanded && electricalNodes.length > 0 && (
                        <div
                          className={`mt-2 pt-2 border-t space-y-1.5 max-h-48 overflow-y-auto ${
                            isLight ? 'border-slate-200' : 'border-slate-800'
                          }`}
                        >
                          <span
                            className={`text-xs uppercase font-mono font-bold block mb-1 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            Linked Substations & Trunks ({electricalNodes.length})
                          </span>
                          {electricalNodes.map((node) => (
                            <button
                              key={node.id}
                              onClick={() => {
                                if (node.substation) {
                                  onSelectSubstation(node.substation);
                                  onSelectSection(null);
                                }
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs border transition-colors flex items-center justify-between group ${
                                isLight
                                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0 ring-2 ring-current/20"
                                  style={{ backgroundColor: node.color }}
                                />
                                <span className="font-semibold truncate group-hover:text-cyan-400 transition-colors">
                                  {node.name}
                                </span>
                                <span className={`text-xs shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  • {node.voltage || 'EHV'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                                <span>{node.distanceKm} km</span>
                                <ArrowRight
                                  className={`w-3 h-3 group-hover:translate-x-0.5 transition-transform ${
                                    isLight ? 'text-slate-400' : 'text-slate-500'
                                  }`}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* Tab 1: Plant & Technical Specs */}
                {inspectorTab === 'overview' && (
                  <div className="flex flex-col flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1">
                    {/* During a replay: what is true for this site at the step on screen */}
                    {isReplay && currentTimestep && (
                      <SiteBriefingCard substation={selectedSubstation} isLight={isLight} currentTimestep={currentTimestep} />
                    )}
                    {/* During a replay: the official plan actions for this site at this step */}
                    {isReplay && (
                      <SubstationCopilotCard
                        substation={selectedSubstation}
                        isLight={isLight}
                        disasterScenario={disasterScenario}
                        liveOutages={activeSubstationOutages}
                        currentTimestep={currentTimestep}
                      />
                    )}
                    {/* Live Outage / Maintenance Alert Banner */}
                    {!isReplay && activeSubstationOutages.length > 0 && (
                      <div className={`p-2.5 rounded-xl border text-[12.5px] shrink-0 flex items-start gap-2 ${
                        isLight
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        <Zap className={`w-4 h-4 shrink-0 mt-0.5 animate-pulse ${isLight ? 'text-red-500' : 'text-amber-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`font-bold ${isLight ? 'text-red-700' : 'text-amber-200'}`}>
                              ⚡ {activeSubstationOutages.length} Live Outage{activeSubstationOutages.length > 1 ? 's' : ''} Today
                            </span>
                            <a
                              href="https://outage.nammamap.in"
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-mono text-xs px-1.5 py-0.5 rounded transition-colors ${
                                isLight
                                  ? 'bg-red-100 hover:bg-red-200 text-red-600'
                                  : 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300'
                              }`}
                              title="Verified via outage.nammamap.in"
                            >
                              outage.nammamap.in ↗
                            </a>
                          </div>
                          {activeSubstationOutages.slice(0, 2).map((o, idx) => (
                            <div key={idx} className="mt-1 text-[12.5px] leading-snug">
                              <span className={`font-semibold ${isLight ? 'text-red-900' : 'text-white'}`}>{o.workType || 'Scheduled Maintenance'}</span>
                              {o.fromTime && o.toTime && <span className={isLight ? 'text-red-700' : 'opacity-90'}> ({o.fromTime} - {o.toTime})</span>}
                              {o.location && <div className={`truncate mt-0.5 ${isLight ? 'text-red-600' : 'text-amber-200/80'}`}>📍 {o.location}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Circle, region and switchyard capacity: identity first, right after any live outage banner */}
                    {(() => {
                      const validIncomers = (selectedSubstation.incomingFeederNames || []).filter((n) => {
                        const clean = String(n).trim().toUpperCase();
                        return clean && !['NA', 'N/A', 'NIL', 'NONE', '-', 'NULL'].includes(clean);
                      });

                      return (
                        <div
                          className={`p-2.5 rounded-xl border text-[12.5px] shrink-0 ${
                            isLight
                              ? 'bg-slate-50/90 border-slate-200/90 text-slate-900 shadow-xs'
                              : 'bg-slate-950/60 border-slate-800 text-slate-100 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-500/15 text-cyan-300'
                                }`}
                              >
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-[13px] truncate">
                                    {selectedSubstation.circle || 'Circle not listed'}
                                  </span>
                                  {selectedSubstation.regionCode && (
                                  <span
                                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    Region {selectedSubstation.regionCode}
                                  </span>
                                  )}
                                  {Boolean(selectedSubstation.totalCapacityMva) && (
                                    <span
                                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                        isLight
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      }`}
                                    >
                                      {selectedSubstation.totalCapacityMva} MVA
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-xs block truncate mt-0.5 ${
                                    isLight ? 'text-slate-500' : 'text-slate-400'
                                  }`}
                                >
                                  TNEB Distribution Circle • Switchyard GPS
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={`https://www.google.com/maps?q=${selectedSubstation.lat},${selectedSubstation.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all shadow-xs group ${
                                  isLight
                                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                                    : 'bg-sky-500/20 hover:bg-sky-500/30 text-cyan-300 border border-sky-500/30'
                                }`}
                                title={`Open coordinates (${selectedSubstation.lat.toFixed(
                                  5
                                )}, ${selectedSubstation.lng.toFixed(5)}) in Google Maps`}
                              >
                                <MapPin className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                <span>Maps ↗</span>
                              </a>
                            </div>
                          </div>

                          {(Boolean(selectedSubstation.powerTransformersCount) || Boolean(validIncomers.length)) && (
                            <div
                              className={`mt-2 pt-1.5 border-t flex items-center justify-between gap-2 text-xs font-mono ${
                                isLight ? 'border-slate-200/80 text-slate-700' : 'border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="font-semibold">
                                  {selectedSubstation.powerTransformersCount || 1} Transformers
                                </span>
                                <span className="opacity-40">•</span>
                                <span>
                                  {selectedSubstation.incomingFeedersCount || validIncomers.length || 1} Incomers
                                </span>
                              </div>
                              {validIncomers.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-mono truncate max-w-[140px] cursor-help ${
                                      isLight
                                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                        : 'bg-slate-900 text-amber-200 border border-amber-800/40'
                                    }`}
                                    title={`Connected Incomer Feeders: ${validIncomers.join(', ')}`}
                                  >
                                    ← {validIncomers[0]}
                                    {validIncomers.length > 1 ? ` (+${validIncomers.length - 1} more)` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Operational Health, 90-Day Incident Log & Disaster Risk Multiplier */}
                    {!isReplay && (
                      <SubstationHealthCard
                        substation={selectedSubstation}
                        isLight={isLight}
                        liveOutages={activeSubstationOutages}
                      />
                    )}

                    {/* Flood exposure: facts and official map checks */}
                    {selectedSubstation.elevationM !== undefined && (
                      <FloodExposureCard substation={selectedSubstation} isLight={isLight} />
                    )}
                  </div>
                )}

                {/* Tab 3: Respond (AI card, relief centres, contacts, plan notes) */}
                {inspectorTab === 'respond' && (
                  <div className="flex flex-col flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1">
                    <SubstationLiveBriefCard
                      substation={selectedSubstation}
                      isLight={isLight}
                      disasterScenario={disasterScenario}
                      liveOutages={activeSubstationOutages}
                      liveWeather={liveWeather}
                    />
                    <ReliefCentresCard substation={selectedSubstation} isLight={isLight} />
                    {/* Section office contact (grouped with the ward contacts below) */}
                    {jurisdictionalSections.length > 0 && (
                      <div
                        className={`p-3 rounded-xl border space-y-2 shrink-0 ${
                          isLight
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[13px] flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Jurisdictional Section Office</span>
                          </span>
                          <span
                            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                              isLight ? 'bg-emerald-200/70 text-emerald-950' : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {jurisdictionalSections[0].distanceKm} km away
                          </span>
                        </div>
                        <p className={`text-[12.5px] ${isLight ? 'text-emerald-900 font-semibold' : 'text-emerald-200'}`}>
                          {jurisdictionalSections[0].name}
                        </p>
                        {jurisdictionalSections[0].section && (
                          <div className="space-y-1.5 pt-1 text-[12.5px]">
                            {jurisdictionalSections[0].section.mobile && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <a
                                  href={`tel:${jurisdictionalSections[0].section.mobile}`}
                                  className="font-mono font-medium hover:underline"
                                >
                                  {jurisdictionalSections[0].section.mobile}
                                </a>
                              </div>
                            )}
                            {jurisdictionalSections[0].section.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <span className="font-mono truncate">
                                  {jurisdictionalSections[0].section.email}
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSection(jurisdictionalSections[0].section!);
                                onSelectSubstation(null);
                              }}
                              className={`w-full mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                                isLight
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              <span>View Section Boundary & Area</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <MunicipalDisasterCard
                      node={selectedSubstation}
                      isLight={isLight}
                      isDedicatedTab={true}
                      planNotesExtra={<FloodPlanNotes substation={selectedSubstation} isLight={isLight} />}
                    />
                  </div>
                )}
              </div>
          </div>
        )}

        {/* Section Specific Details (Full Height View for AE Section Offices) */}
        {selectedSection && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-3 text-xs">
            {sectionBoundary && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                  isLight
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-amber-950/25 border-amber-800/60 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Jurisdictional Boundary</span>
                    <span className={`text-xs block ${isLight ? 'text-amber-800/80' : 'text-amber-400/80'}`}>
                      Area shown on the map
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section Active Outage Alert Banner */}
            {activeSectionOutages.length > 0 && (
              <div className={`p-2.5 rounded-xl border text-[12.5px] shrink-0 flex items-start gap-2 ${
                isLight
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <Zap className={`w-4 h-4 shrink-0 mt-0.5 animate-pulse ${isLight ? 'text-red-500' : 'text-amber-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-bold ${isLight ? 'text-red-700' : 'text-amber-200'}`}>
                      ⚡ {activeSectionOutages.length} Live Outage{activeSectionOutages.length > 1 ? 's' : ''} in Beat
                    </span>
                    <a
                      href="https://outage.nammamap.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-mono text-xs px-1.5 py-0.5 rounded transition-colors ${
                        isLight
                          ? 'bg-red-100 hover:bg-red-200 text-red-600'
                          : 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300'
                      }`}
                      title="Verified via outage.nammamap.in"
                    >
                      outage.nammamap.in ↗
                    </a>
                  </div>
                  {activeSectionOutages.slice(0, 2).map((o, idx) => (
                    <div key={idx} className="mt-1 text-[12.5px] leading-snug">
                      <span className={`font-semibold ${isLight ? 'text-red-900' : 'text-white'}`}>{o.workType || 'Scheduled Maintenance'}</span>
                      {o.fromTime && o.toTime && <span className={isLight ? 'text-red-700' : 'opacity-90'}> ({o.fromTime} - {o.toTime})</span>}
                      {o.location && <div className={`truncate mt-0.5 ${isLight ? 'text-red-600' : 'text-amber-200/80'}`}>📍 {o.location}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <span
                  className={`text-xs uppercase tracking-wider font-semibold block mb-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Division
                </span>
                <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {selectedSection.division || 'Not listed'}
                </span>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <span
                  className={`text-xs uppercase tracking-wider font-semibold block mb-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Subdivision
                </span>
                <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {selectedSection.subdivision || 'Not listed'}
                </span>
              </div>
            </div>

            {/* GCC Municipal & Satellite Vulnerability Stack */}
            <MunicipalDisasterCard node={selectedSection} isLight={isLight} />

            <div
              className={`space-y-2.5 p-3 rounded-xl border text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              {selectedSection.mobile && (
                <div className={`flex items-center gap-2.5 ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <Phone className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <a
                    href={`tel:${selectedSection.mobile}`}
                    className={`font-mono font-medium ${isLight ? 'hover:text-emerald-600' : 'hover:text-emerald-300'}`}
                  >
                    {selectedSection.mobile}
                  </a>
                </div>
              )}
              {selectedSection.email && (
                <div className={`flex items-center gap-2.5 ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <Mail className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                  <span className="font-mono truncate">{selectedSection.email}</span>
                </div>
              )}
              {selectedSection.address && (
                <div
                  className={`flex items-start gap-2.5 pt-1 border-t ${
                    isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">{selectedSection.address}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
