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
  Building2,
  AlertTriangle
} from 'lucide-react';
import type { TnebSubstation, TnebSection, FeederDetail } from '../../types/tneb';
import type { DisasterScenario } from './DisasterCockpitBar';
import type { ConnectedGridNode } from './TnebGridMap';
import { MunicipalDisasterCard } from './MunicipalDisasterCard';
import { FeederCardItem } from './FeederCardItem';
import { GridJargonCheatSheet } from './GridJargonCheatSheet';
import { SubstationHealthCard } from './SubstationHealthCard';
import { type LiveOutage, getOutagesForSubstation, getOutagesForSection } from '../../services/liveOutageService';

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
  isLight
}) => {
  const [inspectorTab, setInspectorTab] = useState<'specs' | 'circuits' | 'civic'>('specs');
  const [isLinksListExpanded, setIsLinksListExpanded] = useState(false);
  const [showJargonGuide, setShowJargonGuide] = useState(false);
  const [feederFilter, setFeederFilter] = useState('');
  const [feederCategoryFilter, setFeederCategoryFilter] = useState<'all' | 'lifelines'>('all');

  // Reset internal tab and filters on substation change
  useEffect(() => {
    setFeederCategoryFilter('all');
    setInspectorTab('specs');
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
      className={`absolute top-4 bottom-4 right-4 z-30 pointer-events-none flex flex-col items-end transition-all duration-200 w-[calc(100vw-2rem)] md:w-[460px]`}
    >
      <div
        className={`pointer-events-auto rounded-2xl p-4 flex flex-col h-full w-full border transition-colors ${
          isLight
            ? 'bg-white/98 border border-slate-300/90 text-slate-800 shadow-[-16px_0_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 backdrop-blur-md'
            : 'bg-slate-900/95 border-l-2 border-slate-700/90 text-slate-200 shadow-[-16px_0_45px_rgba(0,0,0,0.9)] ring-1 ring-white/10 backdrop-blur-xl'
        }`}
      >
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
              <span className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                #{selectedSubstation?.code || selectedSection?.code}
              </span>
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
                    selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                      ? isLight
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                      ? isLight
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                  title={`Ground Elevation: ${selectedSubstation.elevationM}m MSL • Distance to Coast: ${
                    selectedSubstation.distanceToCoastKm || 0
                  }km`}
                >
                  <span>⛰️ {selectedSubstation.elevationM}m MSL</span>
                  {selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK' && (
                    <span className="font-sans font-bold">• 🌊 Surge Risk</span>
                  )}
                  {selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK' && (
                    <span className="font-sans font-bold">• ⚠️ Flood Risk</span>
                  )}
                </span>
              )}
            </div>
            <h2 className={`text-base font-bold leading-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {selectedSubstation?.name || selectedSection?.name}
            </h2>
            {selectedSubstation && (
              <p className={`text-xs mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {selectedSubstation.tier === 'bulk'
                  ? 'Bulk Grid Injection Node • Steps down EHV power to regional substations'
                  : selectedSubstation.tier === 'subtransmission'
                  ? 'Sub-Transmission Hub • Feeds local 33kV & 11kV distribution yards'
                  : 'Primary 33/11kV Distribution Substation • Supplies street-level feeders'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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
            <div className={`grid grid-cols-3 gap-2 pb-2 shrink-0 border-b text-center text-xs ${isLight ? 'border-slate-300/70' : 'border-slate-700/80'}`}>
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
              <div
                className={`p-2 rounded-xl border ${
                  isLight ? 'bg-pink-50/80 border-pink-200/90 shadow-2xs' : 'bg-slate-950/70 border-slate-700/80 shadow-inner'
                }`}
              >
                <span
                  className={`text-xs flex items-center justify-center gap-1.5 font-medium ${
                    isLight ? 'text-pink-700' : 'text-slate-400'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Feeders
                </span>
                <span
                  className={`font-mono font-bold text-base block mt-0.5 ${
                    isLight ? 'text-pink-950' : 'text-pink-300'
                  }`}
                >
                  {selectedSubstation.feeders.length}
                </span>
              </div>
            </div>


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
                    onClick={() => setInspectorTab('specs')}
                    className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-xs ${
                      inspectorTab === 'specs'
                        ? isLight
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                          : 'bg-slate-800 text-white shadow-sm border border-slate-600/70'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Plant & Specs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('circuits')}
                    className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-xs ${
                      inspectorTab === 'circuits'
                        ? isLight
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                          : 'bg-slate-800 text-white shadow-sm border border-slate-600/70'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">Circuits & Grid ({selectedSubstation.feeders.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('civic')}
                    className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-xs ${
                      inspectorTab === 'civic'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Civic & Crisis</span>
                  </button>
                </div>

                {/* Tab 2: Circuits & Grid Content */}
                {inspectorTab === 'circuits' && (
                  <div className="flex flex-col flex-1 min-h-0 space-y-2">
                    {/* Upstream Grid Links & Circuit Isolation Card */}
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
                              <span className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
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
                  </div>
                )}

                {/* Tab 1: Plant & Technical Specs */}
                {inspectorTab === 'specs' && (
                  <div className="flex flex-col flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1">
                    {/* Live Outage / Maintenance Alert Banner */}
                    {activeSubstationOutages.length > 0 && (
                      <div className={`p-2.5 rounded-xl border text-xs shrink-0 flex items-start gap-2 ${
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
                              className={`font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors ${
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
                            <div key={idx} className="mt-1 text-[11px] leading-snug">
                              <span className={`font-semibold ${isLight ? 'text-red-900' : 'text-white'}`}>{o.workType || 'Scheduled Maintenance'}</span>
                              {o.fromTime && o.toTime && <span className={isLight ? 'text-red-700' : 'opacity-90'}> ({o.fromTime} - {o.toTime})</span>}
                              {o.location && <div className={`truncate mt-0.5 ${isLight ? 'text-red-600' : 'text-amber-200/80'}`}>📍 {o.location}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Consolidated Administrative & Switchyard Capacity Overview */}
                    {(() => {
                      const validIncomers = (selectedSubstation.incomingFeederNames || []).filter((n) => {
                        const clean = String(n).trim().toUpperCase();
                        return clean && !['NA', 'N/A', 'NIL', 'NONE', '-', 'NULL'].includes(clean);
                      });

                      return (
                        <div
                          className={`p-2.5 rounded-xl border text-xs shrink-0 ${
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
                                  <span className="font-bold text-xs truncate">
                                    {selectedSubstation.circle || 'Chennai EDC'}
                                  </span>
                                  <span
                                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    Region {selectedSubstation.regionCode || '01/09'}
                                  </span>
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

                    {/* Active Inundation Alert */}
                    {disasterScenario === 'EXTREME_SURGE' &&
                      selectedSubstation.elevationM !== undefined &&
                      selectedSubstation.elevationM <= 3.2 && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold leading-tight flex items-start gap-2 shadow-lg animate-pulse shrink-0 border border-rose-400/40">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-200" />
                          <div className="min-w-0 flex-1">
                            <span className="uppercase tracking-wider font-black text-xs block text-white">
                              CRITICAL: Switchyard Inundation Event
                            </span>
                            <p className="font-normal opacity-95 text-xs mt-1 leading-snug">
                              Yard elevation ({selectedSubstation.elevationM}m MSL) submerged by 3.2m surge.
                              Switchyard pre-emptively isolated & de-energized.
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Operational Health, 90-Day Incident Log & Disaster Risk Multiplier */}
                    <SubstationHealthCard
                      substation={selectedSubstation}
                      isLight={isLight}
                      disasterScenario={disasterScenario}
                      liveOutages={activeSubstationOutages}
                    />

                    {/* Terrain & Flood Risk Profile */}
                    {selectedSubstation.elevationM !== undefined && (
                      <div
                        className={`p-3 rounded-xl border space-y-2 shrink-0 ${
                          selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                            ? isLight
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                              : 'bg-rose-950/25 border-rose-800/60 text-rose-200'
                            : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                            ? isLight
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : 'bg-amber-950/25 border-amber-800/60 text-amber-200'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-800'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <span>🌊</span>
                            <span>Climate & Flood Risk</span>
                          </span>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                              selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                                ? isLight
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-500 text-slate-950 font-black'
                                : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                                ? isLight
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-amber-400 text-slate-950 font-black'
                                : isLight
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                              ? 'CRITICAL SURGE'
                              : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                              ? 'WATERLOGGING RISK'
                              : 'SAFE ELEVATION'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                          <div
                            className={`py-1.5 px-1 rounded-lg ${
                              isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'
                            }`}
                          >
                            <span
                              className={`text-xs uppercase font-medium block leading-tight ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              Elevation
                            </span>
                            <strong className="text-xs font-bold block mt-0.5">
                              {selectedSubstation.elevationM} m
                            </strong>
                          </div>
                          <div
                            className={`py-1.5 px-1 rounded-lg ${
                              isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'
                            }`}
                          >
                            <span
                              className={`text-xs uppercase font-medium block leading-tight ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              Coast Dist
                            </span>
                            <strong className="text-xs font-bold block mt-0.5">
                              {selectedSubstation.distanceToCoastKm || 0} km
                            </strong>
                          </div>
                          <div
                            className={`py-1.5 px-1 rounded-lg ${
                              isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'
                            }`}
                          >
                            <span
                              className={`text-xs uppercase font-medium block leading-tight ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              Risk Score
                            </span>
                            <strong className="text-xs font-bold block mt-0.5">
                              {selectedSubstation.compositeRiskScore || 0}/100
                            </strong>
                          </div>
                        </div>

                        <div
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                            isLight
                              ? 'bg-white/90 border-slate-200 text-slate-800'
                              : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                          }`}
                        >
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
                            <div>
                              <span className="opacity-75 block text-xs font-sans">2015 Flood Depth:</span>
                              <strong>{selectedSubstation.benchmarked2015FloodDepthM || 0.9}m</strong>
                            </div>
                            <div>
                              <span className="opacity-75 block text-xs font-sans">Plinth Height:</span>
                              <strong>{selectedSubstation.plinthElevationM || 1.5}m GL</strong>
                            </div>
                            <div>
                              <span className="opacity-75 block text-xs font-sans">TNSDMA Limit:</span>
                              <strong className="text-sky-600 dark:text-cyan-400">3.0m MSL Standard</strong>
                            </div>
                            <div>
                              <span className="opacity-75 block text-xs font-sans">Dewatering SOP:</span>
                              <span className="font-bold">
                                {selectedSubstation.yardDewateringRequired
                                  ? '⚠️ Mobile Diesel Pumps'
                                  : '✅ Gravity Drainage'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {selectedSubstation.anticipatorySop && (
                          <div
                            className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                              isLight
                                ? 'bg-white/90 text-slate-700 border border-black/5'
                                : 'bg-slate-900/80 text-slate-300 border border-white/10'
                            }`}
                          >
                            <strong className="font-semibold mr-1">Field SOP:</strong>
                            <span>{selectedSubstation.anticipatorySop}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Jurisdictional Section Office Details */}
                    {jurisdictionalSections.length > 0 && (
                      <div
                        className={`p-3 rounded-xl border space-y-2 shrink-0 ${
                          isLight
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center gap-1.5">
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
                        <p className={`text-xs ${isLight ? 'text-emerald-900 font-semibold' : 'text-emerald-200'}`}>
                          {jurisdictionalSections[0].name}
                        </p>
                        {jurisdictionalSections[0].section && (
                          <div className="space-y-1.5 pt-1 text-xs">
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

                    {/* Dispatch Guidance Note */}
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className={`font-semibold block text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        ⚡ Grid Dispatch Note:
                      </span>
                      <p className="text-xs leading-relaxed">
                        {selectedSubstation.tier === 'bulk'
                          ? 'Extra High Voltage (EHV) substation feeding sub-transmission loops. Monitored 24x7 by State Load Despatch Centre (SLDC).'
                          : selectedSubstation.tier === 'subtransmission'
                          ? 'Sub-transmission hub stepping down 110kV/33kV power for secondary distribution yards across Chennai city divisions.'
                          : 'Distribution substation stepping down to 11kV. Operates local feeder circuit breakers under jurisdictional Assistant Engineer (AE) control.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 3: Dedicated GCC Municipal & Satellite Disaster Stack */}
                {inspectorTab === 'civic' && (
                  <div className="flex flex-col flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1">
                    <MunicipalDisasterCard node={selectedSubstation} isLight={isLight} isDedicatedTab={true} />
                  </div>
                )}
              </div>
          </div>
        )}

        {/* Section Specific Details (Full Height View for AE Section Offices) */}
        {selectedSection && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-3 text-xs">
            {selectedSection.boundary && (
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
                      Official O&M Field & Fuse-Call Beat
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                    isLight ? 'bg-amber-200/70 text-amber-950' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  Territory Active
                </span>
              </div>
            )}

            {/* Section Active Outage Alert Banner */}
            {activeSectionOutages.length > 0 && (
              <div className={`p-2.5 rounded-xl border text-xs shrink-0 flex items-start gap-2 ${
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
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors ${
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
                    <div key={idx} className="mt-1 text-[11px] leading-snug">
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
                  {selectedSection.division || 'Chennai Central'}
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
                  {selectedSection.subdivision || 'O&M'}
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
