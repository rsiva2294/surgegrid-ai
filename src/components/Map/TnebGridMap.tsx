import React, { useEffect, useRef, useState, useMemo } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { TnebSubstation, TnebSection, FeederDetail } from '../../types/tneb';
import { getFeederGeometry, getFeederTransformers } from '../../services/feederGeometryService';
import { Zap, Shield, Phone, Mail, MapPin, Layers, Search, X, Users, Cable, Activity, GitFork, ArrowRight, ChevronDown, ChevronUp, Star, Columns2, Minimize2, Info, Building2, Wind, AlertTriangle } from 'lucide-react';

export type DisasterScenario = 'NORMAL' | 'CYCLONE_ALERT' | 'SEVERE_CYCLONE' | 'EXTREME_SURGE';

export interface FeederDisasterStatus {
  state: 'LIVE' | 'PRE_EMPTIVE_SAFETY_ISOLATION' | 'STORM_FAULT_TRIPPED' | 'AWAITING_PATROL_CLEARANCE' | 'STAGE_RESTORED';
  isTripped: boolean;
  reason: string;
  badgeText: string;
  badgeBg: string;
  badgeTextCol: string;
  badgeBorder: string;
  icon: string;
}

export function getFeederDisasterStatus(
  f: FeederDetail,
  ss: TnebSubstation | null,
  scenario: DisasterScenario,
  isLight: boolean
): FeederDisasterStatus {
  if (scenario === 'NORMAL') {
    return {
      state: 'LIVE',
      isTripped: false,
      reason: 'Normal Operating Conditions • Grid Synchronized',
      badgeText: 'ONLINE',
      badgeBg: isLight ? 'bg-emerald-50' : 'bg-emerald-950/40',
      badgeTextCol: isLight ? 'text-emerald-800' : 'text-emerald-300',
      badgeBorder: isLight ? 'border-emerald-200' : 'border-emerald-500/30',
      icon: '🟢'
    };
  }

  // Extreme Surge (3.2m MSL): Substation yard flooded if ground elevation <= 3.2m (TNSDMA 2023 3.0m threshold)
  const isYardFlooded = scenario === 'EXTREME_SURGE' && (ss?.elevationM !== undefined && ss.elevationM <= 3.2);
  if (isYardFlooded) {
    return {
      state: 'PRE_EMPTIVE_SAFETY_ISOLATION',
      isTripped: true,
      reason: 'Substation Yard Inundated (> 3.0m TNSDMA Threshold) • Statutory De-energization to Prevent Lethal Water Conduction • Mobile Dewatering Mandated',
      badgeText: 'YARD FLOOD TRIP',
      badgeBg: isLight ? 'bg-rose-100' : 'bg-rose-950/70',
      badgeTextCol: isLight ? 'text-rose-900 font-bold' : 'text-rose-200 font-bold',
      badgeBorder: isLight ? 'border-rose-400' : 'border-rose-500/50',
      icon: '🌊'
    };
  }

  const cfg = (f.config || '').toUpperCase();
  const isOverhead = cfg.includes('OH') || cfg.includes('OVERHEAD') || cfg.includes('MIXED');

  // Severe cyclone (> 80 km/h) mandates statutory pre-emptive shutdown of overhead & mixed radial lines
  if ((scenario === 'SEVERE_CYCLONE' || scenario === 'EXTREME_SURGE') && isOverhead) {
    return {
      state: 'PRE_EMPTIVE_SAFETY_ISOLATION',
      isTripped: true,
      reason: 'TNSDMA Statutory Mandate (§5.6): Wind > 80 km/h • Pre-Emptive De-energization to Prevent Public Electrocution from Fallen Lines',
      badgeText: 'PRE-EMPTIVE TRIP (WIND)',
      badgeBg: isLight ? 'bg-amber-100' : 'bg-amber-950/70',
      badgeTextCol: isLight ? 'text-amber-900 font-bold' : 'text-amber-200 font-bold',
      badgeBorder: isLight ? 'border-amber-400' : 'border-amber-500/50',
      icon: '⚠️'
    };
  }

  if (scenario === 'CYCLONE_ALERT' && isOverhead) {
    return {
      state: 'AWAITING_PATROL_CLEARANCE',
      isTripped: false,
      reason: 'Cyclone Alert (Wind 65 km/h): Lineman Foot Patrol Alert • Tree-Trimming Standby at GCC Control Room',
      badgeText: 'CYCLONE WATCH',
      badgeBg: isLight ? 'bg-yellow-50' : 'bg-yellow-950/40',
      badgeTextCol: isLight ? 'text-yellow-800' : 'text-yellow-300',
      badgeBorder: isLight ? 'border-yellow-300' : 'border-yellow-500/30',
      icon: '🟡'
    };
  }

  // Pure underground cables withstand surface cyclonic winds
  return {
    state: 'LIVE',
    isTripped: false,
    reason: 'Underground Cable Feeder • Subsurface Ingress Resilient • Energized per TANGEDCO Post-Vardah Hardening Standard',
    badgeText: 'LIVE (UG CABLE)',
    badgeBg: isLight ? 'bg-cyan-50' : 'bg-cyan-950/40',
    badgeTextCol: isLight ? 'text-cyan-800 font-semibold' : 'text-cyan-300 font-semibold',
    badgeBorder: isLight ? 'border-cyan-300' : 'border-cyan-500/30',
    icon: '⚡'
  };
}

interface TnebGridMapProps {
  theme: 'light' | 'dark';
  substations: TnebSubstation[];
  sections: TnebSection[];
  selectedSubstation: TnebSubstation | null;
  selectedSection: TnebSection | null;
  onSelectSubstation: (ss: TnebSubstation | null) => void;
  onSelectSection: (sec: TnebSection | null) => void;
}

export interface ConnectedGridNode {
  id: string;
  name: string;
  type: 'substation' | 'section';
  substation?: TnebSubstation;
  section?: TnebSection;
  relation: 'outgoing_feeder' | 'incoming_feeder' | 'colocated_stepdown' | 'campus_section';
  label: string;
  voltage?: string;
  distanceKm: number;
  lat: number;
  lng: number;
  color: string;
  confidenceTier?: 'L1_VERIFIED' | 'L2_PROBABLE' | 'L3_UNVERIFIED';
  verificationMethod?: string;
}

function getNodeColor(tier: string, type: 'substation' | 'section', isLight: boolean): string {
  if (type === 'section') {
    return isLight ? '#059669' : '#10B981';
  }
  if (tier === 'bulk') {
    return isLight ? '#be185d' : '#ec4899';
  }
  if (tier === 'subtransmission') {
    return isLight ? '#d97706' : '#f59e0b';
  }
  return isLight ? '#0284c7' : '#06b6d4';
}

function getFeederThemeColors(category?: string, isLight?: boolean) {
  switch (category) {
    case 'hospital':
      return {
        glow: isLight ? '#E11D48' : '#F43F5E',
        core: isLight ? '#BE123C' : '#FB7185',
        name: 'Hospital Lifeline (P1 Non-Cut)',
        icon: '🏥'
      };
    case 'water':
      return {
        glow: isLight ? '#0284C7' : '#06B6D4',
        core: isLight ? '#0369A1' : '#38BDF8',
        name: 'Water & Sewage Lifeline (P1 Non-Cut)',
        icon: '🚰'
      };
    case 'transit':
      return {
        glow: isLight ? '#7C3AED' : '#8B5CF6',
        core: isLight ? '#6D28D9' : '#A78BFA',
        name: 'Mass Transit Lifeline (P2 Essential)',
        icon: '🚆'
      };
    case 'governance':
      return {
        glow: isLight ? '#D97706' : '#F59E0B',
        core: isLight ? '#B45309' : '#FBBF24',
        name: 'Gov / Defense HQ (P2 Essential)',
        icon: '🏛️'
      };
    case 'industrial_ht':
      return {
        glow: isLight ? '#475569' : '#64748B',
        core: isLight ? '#334155' : '#94A3B8',
        name: 'Commercial & Industrial Bulk',
        icon: '🏭'
      };
    default:
      return {
        glow: isLight ? '#0284C7' : '#06B6D4',
        core: isLight ? '#0369A1' : '#22D3EE',
        name: '11kV Distribution Feeder',
        icon: '⚡'
      };
  }
}

function getDtrMarkerIcon(isLight: boolean, category?: string): google.maps.Symbol {
  let fillColor = isLight ? '#D97706' : '#F59E0B';
  if (category === 'hospital') {
    fillColor = isLight ? '#E11D48' : '#F43F5E';
  } else if (category === 'water') {
    fillColor = isLight ? '#0284C7' : '#06B6D4';
  } else if (category === 'transit') {
    fillColor = isLight ? '#7C3AED' : '#8B5CF6';
  }

  return {
    path: 'M -3,-3 L 3,-3 L 3,3 L -3,3 Z',
    fillColor,
    fillOpacity: 1,
    strokeColor: isLight ? '#0F172A' : '#FFFFFF',
    strokeWeight: 1.5,
    scale: 1.8
  };
}

function cleanLifelineLabel(label?: string, fallback: string = ''): string {
  if (!label) return fallback;
  return label
    .replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\s]+/u, '')
    .replace(/\bDedicated HT Commercial\/Industrial\b/i, 'Commercial & Industrial')
    .replace(/\s*\(Dedicated HT\)/i, '')
    .trim();
}

function getFeederLifelineBadge(feeder: FeederDetail, isLight: boolean) {
  if (!feeder.lifelineCategory) return null;

  switch (feeder.lifelineCategory) {
    case 'hospital':
      return {
        icon: '🏥',
        label: cleanLifelineLabel(feeder.lifelineLabel, 'Hospital Lifeline'),
        prioText: 'P1 NON-CUT',
        badgeBg: isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        prioBg: isLight ? 'bg-rose-600 text-white font-bold' : 'bg-rose-500 text-slate-950 font-black'
      };
    case 'water':
      return {
        icon: feeder.isCmwssbSps ? '💧' : '🚰',
        label: feeder.isCmwssbSps ? 'CMWSSB Sewage Pumping' : cleanLifelineLabel(feeder.lifelineLabel, 'Water / Sewage'),
        prioText: 'P1 NON-CUT',
        badgeBg: isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        prioBg: isLight ? 'bg-sky-600 text-white font-bold' : 'bg-cyan-400 text-slate-950 font-black'
      };
    case 'transit':
      return {
        icon: '🚇',
        label: cleanLifelineLabel(feeder.lifelineLabel, 'Metro / Rail'),
        prioText: 'P2 ESSENTIAL',
        badgeBg: isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        prioBg: isLight ? 'bg-purple-600 text-white font-bold' : 'bg-purple-400 text-slate-950 font-black'
      };
    case 'governance':
      return {
        icon: feeder.isGccShelterFeed ? '🏕️' : '🏛️',
        label: feeder.isGccShelterFeed ? 'GCC Relief Shelter Feed' : cleanLifelineLabel(feeder.lifelineLabel, 'Gov / Defense'),
        prioText: feeder.isGccShelterFeed ? 'P1 CRITICAL' : 'P2 ESSENTIAL',
        badgeBg: isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        prioBg: isLight ? 'bg-amber-600 text-white font-bold' : 'bg-amber-400 text-slate-950 font-black'
      };
    case 'industrial_ht':
      return {
        icon: '🏭',
        label: cleanLifelineLabel(feeder.lifelineLabel, 'Commercial & Industrial'),
        prioText: 'P3 COMMERCIAL',
        badgeBg: isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800/80 text-slate-300 border-slate-700',
        prioBg: isLight ? 'bg-slate-600 text-white font-bold' : 'bg-slate-600 text-white font-bold'
      };
    default:
      return null;
  }
}

function MunicipalDisasterCard({
  node,
  isLight,
  isDedicatedTab = false
}: {
  node: TnebSubstation | TnebSection;
  isLight: boolean;
  isDedicatedTab?: boolean;
}) {
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
            Statutory municipal jurisdiction under the <em>GCC City Disaster Management Perspective Plan 2023 (CDMP)</em>. Governs inter-agency de-energization, fallen tree clearance, and flood shelter feeds.
          </p>
        </div>

        {/* GEE Satellite Hydrology & Inundation Matrix */}
        {node.geeRunoffMm !== undefined && (
          <div className={`p-3 rounded-xl border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-200'
          }`}>
            <div>
              <span className="font-bold text-xs flex items-center gap-1.5">
                <span>🛰️</span>
                <span>Google Earth Engine (GEE) Satellite Stack</span>
              </span>
              <div className="mt-1 flex items-center">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                  node.geeFloodCategory === 'CRITICAL_SURGE_RISK' || node.geeFloodCategory === 'SEVERE_INUNDATION_ZONE'
                    ? (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40')
                    : (isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                }`}>
                  {node.geeFloodCategory?.replace(/_/g, ' ') || 'SATELLITE VERIFIED'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className={`p-2 rounded-lg ${isLight ? 'bg-white border border-slate-200' : 'bg-black/30 border border-white/5'}`}>
                <span className={`text-xs uppercase font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Simulated Runoff</span>
                <strong className="text-xs font-bold block mt-0.5">🌧️ {node.geeRunoffMm} mm</strong>
              </div>
              <div className={`p-2 rounded-lg ${isLight ? 'bg-white border border-slate-200' : 'bg-black/30 border border-white/5'}`}>
                <span className={`text-xs uppercase font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Impervious Built</span>
                <strong className="text-xs font-bold block mt-0.5">🧱 {node.geeImperviousPct}%</strong>
              </div>
              <div className={`p-2 rounded-lg ${isLight ? 'bg-white border border-slate-200' : 'bg-black/30 border border-white/5'}`}>
                <span className={`text-xs uppercase font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Relief Shelters</span>
                <strong className="text-xs font-bold block mt-0.5">🏕️ {node.wardReliefSheltersCount || 0} Camps</strong>
              </div>
            </div>
          </div>
        )}

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

        {/* Multi-Agency Standing Operating Protocol Guidance */}
        <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/40 border-slate-800 text-slate-400'
        }`}>
          <span className={`font-semibold block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            ⚡ Inter-Agency Field Protocol (ESF 14 & 15):
          </span>
          <p className="text-xs leading-relaxed">
            Prior to re-energizing residential LT feeders in Ward {node.gccWard}, TANGEDCO section line gangs must obtain physical foot-patrol clearance certificate (PTW) confirming GCC conservancy has cleared fallen trees and CMWSSB sewage pumping stations have established operational suction head.
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
        {node.wardReliefSheltersCount !== undefined && node.wardReliefSheltersCount > 0 && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold ${
            isLight ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
          }`}>
            🏕️ {node.wardReliefSheltersCount} Relief Shelters
          </span>
        )}
      </div>

      {/* GEE Satellite Runoff & Impervious Metrics */}
      {node.geeRunoffMm !== undefined && (
        <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
          <div className={`p-1.5 rounded-lg ${isLight ? 'bg-white/80 border border-indigo-100' : 'bg-black/30 border border-white/5'}`}>
            <span className="opacity-75 block text-xs font-sans">GEE Runoff:</span>
            <strong>🌧️ {node.geeRunoffMm} mm</strong>
          </div>
          <div className={`p-1.5 rounded-lg ${isLight ? 'bg-white/80 border border-indigo-100' : 'bg-black/30 border border-white/5'}`}>
            <span className="opacity-75 block text-xs font-sans">Impervious Built:</span>
            <strong>🧱 {node.geeImperviousPct}%</strong>
          </div>
        </div>
      )}

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
}


function getSubstationMarkerIcon(ss: TnebSubstation, isSelected: boolean, isLight: boolean): google.maps.Symbol {
  let color = isLight ? '#0284C7' : '#06B6D4';
  let scale = 5;

  if (ss.tier === 'bulk') {
    color = isLight ? '#BE185D' : '#EC4899';
    scale = isSelected ? 13 : 8;
  } else if (ss.tier === 'subtransmission') {
    color = isLight ? '#D97706' : '#F59E0B';
    scale = isSelected ? 11 : 6.5;
  } else {
    scale = isSelected ? 9 : 4.5;
  }

  // Selected state:
  // - Light mode: deep midnight-slate (#0F172A) 4px border for maximum contrast against light map
  // - Dark mode: radiant pure white (#FFFFFF) 3.5px border
  // Unselected state:
  // - Light mode: clean white (#FFFFFF) 1.5px border
  // - Dark mode: dark cyan-slate (#083344) 1.5px border
  const strokeColor = isSelected
    ? (isLight ? '#0F172A' : '#FFFFFF')
    : (isLight ? '#FFFFFF' : '#083344');

  const strokeWeight = isSelected ? (isLight ? 4 : 3.5) : 1.5;

  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1.0,
    strokeColor,
    strokeWeight
  };
}

function getSectionMarkerIcon(isSelected: boolean, isLight: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isSelected ? 8 : 3.5,
    fillColor: isLight ? '#059669' : '#10B981',
    fillOpacity: 0.95,
    strokeColor: isSelected
      ? (isLight ? '#0F172A' : '#FFFFFF')
      : '#FFFFFF',
    strokeWeight: isSelected ? (isLight ? 4 : 3.5) : 1.5
  };
}

const NO_POI_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d131f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d131f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#74849e" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#e2e8f0" }]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#192233" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#131b2a" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#25334c" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#172033" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#071324" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#071324" }]
  }
];

const NO_POI_LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#1e293b" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0f172a" }, { weight: 600 }]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e2e8f0" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#f1f5f9" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#334155" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#cce3f5" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0284c7" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }]
  }
];

let isGoogleMapsLoaderConfigured = false;

/**
 * Strict Chennai Metropolitan Area (CMA) District & Peri-Urban EHT Corridor Bounds
 * North: Minjur / Alamathy 400kV (13.40 N)
 * South: Kelambakkam / Siruseri / Chengalpattu border (12.75 N)
 * West: Sriperumbudur 400kV corridor (79.85 E)
 * East: Bay of Bengal coastline (80.38 E)
 * Clamps viewport to prevent out-of-district tile requests and unnecessary network bandwidth.
 */
export const CHENNAI_METRO_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 13.4000,
  south: 12.7500,
  west: 79.8500,
  east: 80.3800
};

export const TnebGridMap: React.FC<TnebGridMapProps> = ({
  theme,
  substations,
  sections,
  selectedSubstation,
  selectedSection,
  onSelectSubstation,
  onSelectSection
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const sectionMarkersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const connectionLinesRef = useRef<google.maps.Polyline[]>([]);
  const prevSelectedSubstationCodeRef = useRef<string | null>(null);
  const prevSelectedSectionCodeRef = useRef<string | null>(null);
  const selectionHaloRef = useRef<google.maps.Marker | null>(null);
  const sectionBoundaryPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const feederLinesRef = useRef<google.maps.Polyline[]>([]);
  const feederGlowLinesRef = useRef<google.maps.Polyline[]>([]);
  const dtrMarkersRef = useRef<google.maps.Marker[]>([]);
  const dtrInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const feederDataLayerRef = useRef<google.maps.Data | null>(null);
  const zoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Layer Toggles
  const [showBulk, setShowBulk] = useState(true);
  const [showSubTrans, setShowSubTrans] = useState(true);
  const [showDistribution, setShowDistribution] = useState(true);
  const [showSections, setShowSections] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feederFilter, setFeederFilter] = useState('');
  const [feederCategoryFilter, setFeederCategoryFilter] = useState<'all' | 'lifelines'>('all');
  const [showConnections, setShowConnections] = useState(false);
  const [selectedFeeder, setSelectedFeeder] = useState<FeederDetail | null>(null);
  const [isLayersExpanded, setIsLayersExpanded] = useState(true);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'specs' | 'circuits' | 'civic'>('specs');
  const [isLinksListExpanded, setIsLinksListExpanded] = useState(false);
  const [showJargonGuide, setShowJargonGuide] = useState(false);
  const [disasterScenario, setDisasterScenario] = useState<DisasterScenario>('NORMAL');

  // Reset showConnections, selectedFeeder, feederCategoryFilter, and inspectorTab when selected substation changes
  useEffect(() => {
    setShowConnections(false);
    setSelectedFeeder(null);
    setFeederCategoryFilter('all');
    setInspectorTab('specs');
    setIsLinksListExpanded(false);
    setShowJargonGuide(false);
  }, [selectedSubstation]);

  // Fast O(1) Entity Maps
  const substationsByCode = useMemo(() => {
    const map = new Map<string, TnebSubstation>();
    substations.forEach(s => map.set(s.code, s));
    return map;
  }, [substations]);

  const sectionsByCode = useMemo(() => {
    const map = new Map<string, TnebSection>();
    sections.forEach(s => map.set(s.code, s));
    return map;
  }, [sections]);

  // Instant O(1) Precomputed Grid Connections
  const connectedNodes: ConnectedGridNode[] = useMemo(() => {
    if (!selectedSubstation || !selectedSubstation.connections) return [];
    const isLight = theme === 'light';
    return selectedSubstation.connections.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      relation: c.relation,
      label: c.label,
      voltage: c.voltage,
      distanceKm: c.distanceKm,
      lat: c.lat,
      lng: c.lng,
      confidenceTier: c.confidenceTier || 'L1_VERIFIED',
      verificationMethod: c.verificationMethod,
      color: getNodeColor(c.tier || 'distribution', c.type, isLight),
      substation: c.type === 'substation' ? substationsByCode.get(c.id) : undefined,
      section: c.type === 'section' ? sectionsByCode.get(c.id.replace('sec_', '')) : undefined
    }));
  }, [selectedSubstation, theme, substationsByCode, sectionsByCode]);

  // Strictly Electrical Grid Interconnections (Substation <-> Substation Trunks & Step-Downs)
  const electricalNodes = useMemo(() => {
    return connectedNodes.filter(n => n.type === 'substation');
  }, [connectedNodes]);

  // Jurisdictional Assistant Engineer (AE) Section Offices (Field Maintenance & Fuse Call)
  const jurisdictionalSections = useMemo(() => {
    return connectedNodes.filter(n => n.type === 'section');
  }, [connectedNodes]);

  // Set of node codes for isolated electrical network mode
  const isolatedNodeIds = useMemo(() => {
    if (!showConnections || !selectedSubstation) return null;
    const set = new Set<string>();
    set.add(selectedSubstation.code);
    electricalNodes.forEach(node => {
      if (node.substation) set.add(node.substation.code);
    });
    return set;
  }, [showConnections, selectedSubstation, electricalNodes]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const activeMapStyle = useMemo(() => {
    if (isSatellite) return [];
    return theme === 'light' ? NO_POI_LIGHT_STYLE : NO_POI_DARK_STYLE;
  }, [isSatellite, theme]);

  // Initialize Google Maps
  useEffect(() => {
    if (!apiKey) {
      setLoadError('Google Maps API Key is missing in .env (VITE_GOOGLE_MAPS_API_KEY)');
      return;
    }

    if (!isGoogleMapsLoaderConfigured) {
      setOptions({
        key: apiKey,
        v: 'weekly'
      });
      isGoogleMapsLoaderConfigured = true;
    }

    importLibrary('maps')
      .then(() => {
        if (!mapContainerRef.current) return;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 13.0500, lng: 80.2300 },
          zoom: 11.5,
          minZoom: 10.5,
          maxZoom: 18.0,
          restriction: {
            latLngBounds: CHENNAI_METRO_BOUNDS,
            strictBounds: true
          },
          // Google Maps Platform Skill usage tracking & attribution
          internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
          gestureHandling: 'greedy',
          mapTypeId: isSatellite ? 'hybrid' : 'roadmap',
          styles: activeMapStyle,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          backgroundColor: theme === 'light' ? '#f8fafc' : '#0b0f19'
        } as google.maps.MapOptions);

        mapRef.current = map;
        setMapLoaded(true);
      })
      .catch((err: unknown) => {
        console.error('Failed to load Google Maps:', err);
        const msg = err instanceof Error ? err.message : 'Error loading Google Maps API';
        setLoadError(msg);
      });

    return () => {
      Object.values(markersRef.current).forEach(m => m.setMap(null));
      markersRef.current = {};
      Object.values(sectionMarkersRef.current).forEach(m => m.setMap(null));
      sectionMarkersRef.current = {};
      connectionLinesRef.current.forEach(l => l.setMap(null));
      connectionLinesRef.current = [];
      selectionHaloRef.current?.setMap(null);
      selectionHaloRef.current = null;
      sectionBoundaryPolygonsRef.current.forEach(p => p.setMap(null));
      sectionBoundaryPolygonsRef.current = [];
    };
  }, [apiKey]);

  // Handle Map Type & Theme Style Updates
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    mapRef.current.setMapTypeId(isSatellite ? 'hybrid' : 'roadmap');
    mapRef.current.setOptions({
      styles: activeMapStyle,
      backgroundColor: theme === 'light' ? '#f8fafc' : '#0b0f19'
    });
  }, [activeMapStyle, isSatellite, theme, mapLoaded]);

  // 1. One-time Substation Marker Instantiation (never recreated on selection or layer toggles)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || substations.length === 0) return;
    const map = mapRef.current;

    Object.values(markersRef.current).forEach(m => m.setMap(null));
    markersRef.current = {};

    const isLight = theme === 'light';

    substations.forEach(ss => {
      if (typeof ss.lat !== 'number' || typeof ss.lng !== 'number' || isNaN(ss.lat) || isNaN(ss.lng)) return;
      const isSelected = selectedSubstation?.code === ss.code;
      const marker = new google.maps.Marker({
        position: { lat: ss.lat, lng: ss.lng },
        map,
        title: `${ss.name} (${ss.voltage} kV) • ${ss.totalConsumers ? ss.totalConsumers.toLocaleString() + ' consumers' : ss.tier === 'bulk' ? 'Bulk EHV Node' : 'Substation'}`,
        zIndex: isSelected ? 100 : ss.tier === 'bulk' ? 30 : ss.tier === 'subtransmission' ? 20 : 10,
        icon: getSubstationMarkerIcon(ss, isSelected, isLight),
        optimized: true
      });

      marker.addListener('click', () => {
        onSelectSubstation(ss);
        onSelectSection(null);
        setFeederFilter('');
      });

      markersRef.current[ss.code] = marker;
    });

    prevSelectedSubstationCodeRef.current = selectedSubstation?.code || null;
  }, [mapLoaded, substations]);

  // 2. One-time Section Marker Instantiation
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || sections.length === 0) return;

    Object.values(sectionMarkersRef.current).forEach(m => m.setMap(null));
    sectionMarkersRef.current = {};

    const isLight = theme === 'light';

    sections.forEach(sec => {
      if (typeof sec.lat !== 'number' || typeof sec.lng !== 'number' || isNaN(sec.lat) || isNaN(sec.lng)) return;
      const isSelected = selectedSection?.code === sec.code;
      const marker = new google.maps.Marker({
        position: { lat: sec.lat, lng: sec.lng },
        map: null, // do NOT attach to map until layer is active or section selected
        title: sec.name,
        zIndex: isSelected ? 90 : 5,
        icon: getSectionMarkerIcon(isSelected, isLight),
        optimized: true
      });

      marker.addListener('click', () => {
        onSelectSection(sec);
        onSelectSubstation(null);
      });

      sectionMarkersRef.current[sec.code] = marker;
    });

    prevSelectedSectionCodeRef.current = selectedSection?.code || null;
  }, [mapLoaded, sections]);

  // 3. Substation Viewport & Layer Optimization (detach hidden markers from render tree)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    substations.forEach(ss => {
      const marker = markersRef.current[ss.code];
      if (!marker) return;

      const isVisible = isolatedNodeIds
        ? isolatedNodeIds.has(ss.code)
        : ((ss.tier === 'bulk' && showBulk) ||
           (ss.tier === 'subtransmission' && showSubTrans) ||
           (ss.tier === 'distribution' && showDistribution));

      if (isVisible) {
        if (marker.getMap() !== map) marker.setMap(map);
      } else {
        if (marker.getMap() !== null) marker.setMap(null);
      }
    });
  }, [showBulk, showSubTrans, showDistribution, isolatedNodeIds, mapLoaded, substations]);

  // 4. Section Viewport & Layer Optimization (only active when layer toggled or selected)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    sections.forEach(sec => {
      const marker = sectionMarkersRef.current[sec.code];
      if (!marker) return;

      const shouldShow = isolatedNodeIds
        ? isolatedNodeIds.has(sec.code)
        : (showSections || selectedSection?.code === sec.code);

      if (shouldShow) {
        if (marker.getMap() !== map) marker.setMap(map);
      } else {
        if (marker.getMap() !== null) marker.setMap(null);
      }
    });
  }, [showSections, selectedSection, isolatedNodeIds, mapLoaded, sections]);

  // 5. Instant 2-Marker Selection Highlighting for Substations (only touches previous & current marker in 0.05ms)
  useEffect(() => {
    if (!mapLoaded) return;
    const isLight = theme === 'light';

    // Un-highlight previous substation
    if (prevSelectedSubstationCodeRef.current && prevSelectedSubstationCodeRef.current !== selectedSubstation?.code) {
      const prevMarker = markersRef.current[prevSelectedSubstationCodeRef.current];
      const prevSS = substationsByCode.get(prevSelectedSubstationCodeRef.current);
      if (prevMarker && prevSS) {
        prevMarker.setIcon(getSubstationMarkerIcon(prevSS, false, isLight));
        prevMarker.setZIndex(prevSS.tier === 'bulk' ? 30 : prevSS.tier === 'subtransmission' ? 20 : 10);
      }
    }

    // Highlight newly selected substation
    if (selectedSubstation) {
      const currMarker = markersRef.current[selectedSubstation.code];
      if (currMarker) {
        currMarker.setIcon(getSubstationMarkerIcon(selectedSubstation, true, isLight));
        currMarker.setZIndex(100);
      }
    }

    prevSelectedSubstationCodeRef.current = selectedSubstation?.code || null;
  }, [selectedSubstation, theme, mapLoaded, substationsByCode]);

  // 6. Instant 2-Marker Selection Highlighting for Sections
  useEffect(() => {
    if (!mapLoaded) return;
    const isLight = theme === 'light';

    if (prevSelectedSectionCodeRef.current && prevSelectedSectionCodeRef.current !== selectedSection?.code) {
      const prevMarker = sectionMarkersRef.current[prevSelectedSectionCodeRef.current];
      if (prevMarker) {
        prevMarker.setIcon(getSectionMarkerIcon(false, isLight));
        prevMarker.setZIndex(5);
      }
    }

    if (selectedSection) {
      const currMarker = sectionMarkersRef.current[selectedSection.code];
      if (currMarker) {
        currMarker.setIcon(getSectionMarkerIcon(true, isLight));
        currMarker.setZIndex(90);
      }
    }

    prevSelectedSectionCodeRef.current = selectedSection?.code || null;
  }, [selectedSection, theme, mapLoaded]);

  // 7. In-Place Theme Icon Update without marker recreation
  useEffect(() => {
    if (!mapLoaded) return;
    const isLight = theme === 'light';
    substations.forEach(ss => {
      const marker = markersRef.current[ss.code];
      if (marker) {
        const isSelected = selectedSubstation?.code === ss.code;
        marker.setIcon(getSubstationMarkerIcon(ss, isSelected, isLight));
      }
    });
    sections.forEach(sec => {
      const marker = sectionMarkersRef.current[sec.code];
      if (marker) {
        const isSelected = selectedSection?.code === sec.code;
        marker.setIcon(getSectionMarkerIcon(isSelected, isLight));
      }
    });
  }, [theme, mapLoaded]);

  // 8. Dedicated Selection Beacon Halo Ring (Visual Highlighting in Light & Dark modes)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    if (!selectionHaloRef.current) {
      selectionHaloRef.current = new google.maps.Marker({
        map: mapRef.current,
        visible: false,
        zIndex: 60,
        clickable: false
      });
    }

    const isLight = theme === 'light';
    const halo = selectionHaloRef.current;

    if (selectedSubstation && typeof selectedSubstation.lat === 'number' && typeof selectedSubstation.lng === 'number' && !isNaN(selectedSubstation.lat) && !isNaN(selectedSubstation.lng)) {
      const color = getNodeColor(selectedSubstation.tier, 'substation', isLight);
      halo.setPosition({ lat: selectedSubstation.lat, lng: selectedSubstation.lng });
      halo.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: selectedSubstation.tier === 'bulk' ? 26 : selectedSubstation.tier === 'subtransmission' ? 22 : 18,
        fillColor: color,
        fillOpacity: isLight ? 0.22 : 0.28,
        strokeColor: isLight ? '#0F172A' : color,
        strokeOpacity: isLight ? 0.6 : 0.85,
        strokeWeight: isLight ? 2 : 1.5
      });
      halo.setVisible(true);
    } else if (selectedSection && typeof selectedSection.lat === 'number' && typeof selectedSection.lng === 'number' && !isNaN(selectedSection.lat) && !isNaN(selectedSection.lng)) {
      const color = isLight ? '#059669' : '#10B981';
      halo.setPosition({ lat: selectedSection.lat, lng: selectedSection.lng });
      halo.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18,
        fillColor: color,
        fillOpacity: isLight ? 0.22 : 0.28,
        strokeColor: isLight ? '#0F172A' : color,
        strokeOpacity: isLight ? 0.6 : 0.85,
        strokeWeight: isLight ? 2 : 1.5
      });
      halo.setVisible(true);
    } else {
      halo.setVisible(false);
    }
  }, [selectedSubstation, selectedSection, theme, mapLoaded]);

  // Pan when selection changes (when not in isolated network fitBounds mode)
  useEffect(() => {
    if (!mapRef.current) return;
    if (showConnections) return;
    if (selectedSubstation && typeof selectedSubstation.lat === 'number' && typeof selectedSubstation.lng === 'number' && !isNaN(selectedSubstation.lat) && !isNaN(selectedSubstation.lng)) {
      mapRef.current.panTo({ lat: selectedSubstation.lat, lng: selectedSubstation.lng });
      mapRef.current.setZoom(14.2);
    } else if (selectedSection && !selectedSection.boundary && typeof selectedSection.lat === 'number' && typeof selectedSection.lng === 'number' && !isNaN(selectedSection.lat) && !isNaN(selectedSection.lng)) {
      mapRef.current.panTo({ lat: selectedSection.lat, lng: selectedSection.lng });
      mapRef.current.setZoom(14.5);
    }
  }, [selectedSubstation, selectedSection, showConnections]);

  // 9. On-Demand Jurisdictional Boundary Polygon for Selected Section Office
  useEffect(() => {
    // Clear previous polygons
    sectionBoundaryPolygonsRef.current.forEach(p => p.setMap(null));
    sectionBoundaryPolygonsRef.current = [];

    if (!mapRef.current || !mapLoaded || !selectedSection || !selectedSection.boundary) {
      return;
    }

    const map = mapRef.current;
    const isLight = theme === 'light';
    const boundary = selectedSection.boundary;
    const bounds = new google.maps.LatLngBounds();

    const createPolygonForRings = (rings: number[][][]) => {
      const paths = rings.map(ring =>
        ring.map(pt => {
          const latLng = { lat: pt[1], lng: pt[0] };
          bounds.extend(latLng);
          return latLng;
        })
      );

      const polygon = new google.maps.Polygon({
        paths,
        strokeColor: isLight ? '#D97706' : '#F59E0B',
        strokeOpacity: isLight ? 0.9 : 0.95,
        strokeWeight: 2.5,
        fillColor: isLight ? '#F59E0B' : '#D97706',
        fillOpacity: isLight ? 0.16 : 0.22,
        zIndex: 15,
        clickable: false,
        map
      });

      sectionBoundaryPolygonsRef.current.push(polygon);
    };

    if (boundary.type === 'Polygon') {
      createPolygonForRings(boundary.coordinates as number[][][]);
    } else if (boundary.type === 'MultiPolygon') {
      (boundary.coordinates as number[][][][]).forEach(poly => {
        createPolygonForRings(poly);
      });
    }

    // Auto-frame bounds around the jurisdictional territory
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 80, right: 460, bottom: 80, left: 80 });
    }

    return () => {
      sectionBoundaryPolygonsRef.current.forEach(p => p.setMap(null));
      sectionBoundaryPolygonsRef.current = [];
    };
  }, [selectedSection, mapLoaded, theme]);

  // Render on-demand dotted connection lines for selected substation (strictly electrical substation links)
  useEffect(() => {
    // Clear previous polylines
    connectionLinesRef.current.forEach(line => line.setMap(null));
    connectionLinesRef.current = [];

    if (!mapRef.current || !mapLoaded || !selectedSubstation || !showConnections || electricalNodes.length === 0) {
      return;
    }

    const map = mapRef.current;

    electricalNodes.forEach(node => {
      const isIncoming = node.relation === 'incoming_feeder';
      const path = isIncoming
        ? [
            { lat: node.lat, lng: node.lng },
            { lat: selectedSubstation.lat, lng: selectedSubstation.lng }
          ]
        : [
            { lat: selectedSubstation.lat, lng: selectedSubstation.lng },
            { lat: node.lat, lng: node.lng }
          ];

      const isL2 = node.confidenceTier === 'L2_PROBABLE';
      const lineColor = isL2 ? '#f59e0b' : node.color;

      const polyline = new google.maps.Polyline({
        path,
        strokeOpacity: 0,
        zIndex: isL2 ? 35 : 45,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: isL2 ? 0.75 : 0.95,
              scale: isL2 ? 2.0 : 2.6,
              strokeColor: lineColor
            },
            offset: '0',
            repeat: isL2 ? '18px' : '12px'
          },
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              strokeColor: lineColor,
              fillColor: lineColor,
              fillOpacity: isL2 ? 0.8 : 0.95,
              scale: isL2 ? 1.8 : 2.2
            },
            offset: isIncoming ? '45%' : '60%'
          }
        ],
        map
      });

      connectionLinesRef.current.push(polyline);
    });

    // Auto-frame bounds around the isolated electrical network
    if (electricalNodes.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: selectedSubstation.lat, lng: selectedSubstation.lng });
      electricalNodes.forEach(node => bounds.extend({ lat: node.lat, lng: node.lng }));
      map.fitBounds(bounds, { top: 80, right: 460, bottom: 80, left: 80 });
    }

    return () => {
      connectionLinesRef.current.forEach(line => line.setMap(null));
      connectionLinesRef.current = [];
    };
  }, [selectedSubstation, electricalNodes, mapLoaded, showConnections]);

  // Render on-demand Ground-Truth Feeder Wire Geometry via unified Data layer and DTR markers with zoom-gated LOD
  useEffect(() => {
    // Clear previous feeder Data layer, polylines, and DTR markers
    if (feederDataLayerRef.current) {
      feederDataLayerRef.current.setMap(null);
      feederDataLayerRef.current = null;
    }
    if (zoomListenerRef.current) {
      zoomListenerRef.current.remove();
      zoomListenerRef.current = null;
    }
    feederLinesRef.current.forEach(l => l.setMap(null));
    feederLinesRef.current = [];
    feederGlowLinesRef.current.forEach(l => l.setMap(null));
    feederGlowLinesRef.current = [];
    dtrMarkersRef.current.forEach(m => m.setMap(null));
    dtrMarkersRef.current = [];
    if (dtrInfoWindowRef.current) {
      dtrInfoWindowRef.current.close();
    }

    if (!mapRef.current || !mapLoaded || !selectedSubstation || !selectedFeeder) {
      return;
    }

    let isMounted = true;
    const map = mapRef.current;
    const isLight = theme === 'light';
    const themeColors = getFeederThemeColors(selectedFeeder.lifelineCategory, isLight);
    const isNonCut = selectedFeeder.priorityLevel === 'P1_NON_CUT';
    const bounds = new google.maps.LatLngBounds();

    // 1. Fetch real surveyed MultiLineString street routes on-demand
    getFeederGeometry(selectedSubstation.circleCode, selectedFeeder.code).then(geo => {
      if (!isMounted || !mapRef.current) return;

      if (geo && geo.coords) {
        // Hardware-accelerated unified Data Layer (single WebGL batch draw call)
        const dataLayer = new google.maps.Data();
        dataLayer.addGeoJson({
          type: 'Feature',
          geometry: {
            type: geo.type,
            coordinates: geo.coords
          },
          properties: {
            isNonCut,
            name: selectedFeeder.name
          }
        });

        dataLayer.setStyle({
          strokeColor: themeColors.core,
          strokeOpacity: 1.0,
          strokeWeight: isNonCut ? 4.0 : 3.2,
          zIndex: 50
        });

        dataLayer.setMap(map);
        feederDataLayerRef.current = dataLayer;

        const rawSegments = geo.type === 'MultiLineString'
          ? (geo.coords as [number, number][][])
          : [(geo.coords as [number, number][])];

        let closestTakeoffPt: { lat: number; lng: number } | null = null;
        let minTakeoffDist = Infinity;

        rawSegments.forEach(seg => {
          if (!seg || seg.length < 2) return;
          seg.forEach(pt => {
            const latLng = { lat: pt[1], lng: pt[0] };
            bounds.extend(latLng);
            const dLat = pt[1] - selectedSubstation.lat;
            const dLng = pt[0] - selectedSubstation.lng;
            const distM = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
            if (distM < minTakeoffDist) {
              minTakeoffDist = distM;
              closestTakeoffPt = latLng;
            }
          });
        });

        // Substation switchyard takeoff tie line (if feeder begins outside the fence within 500m)
        if (closestTakeoffPt && minTakeoffDist > 15 && minTakeoffDist < 500) {
          const takeoffPath = [
            { lat: selectedSubstation.lat, lng: selectedSubstation.lng },
            closestTakeoffPt
          ];
          const takeoffLine = new google.maps.Polyline({
            path: takeoffPath,
            strokeColor: themeColors.core,
            strokeOpacity: 0.85,
            strokeWeight: 2.5,
            zIndex: 49,
            icons: [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 0.9,
                  scale: 2,
                  strokeColor: themeColors.core
                },
                offset: '0',
                repeat: '8px'
              },
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 2.2,
                  strokeColor: themeColors.core,
                  fillColor: themeColors.core,
                  fillOpacity: 1
                },
                offset: '60%'
              }
            ],
            map
          });
          feederLinesRef.current.push(takeoffLine);
        }
      }

      // 2. Fetch real surveyed Distribution Transformers (DTs) on-demand
      getFeederTransformers(selectedSubstation.circleCode, selectedFeeder.code).then(dtrs => {
        if (!isMounted || !mapRef.current) return;

        if (!dtrInfoWindowRef.current) {
          dtrInfoWindowRef.current = new google.maps.InfoWindow();
        }

        const dtrIcon = getDtrMarkerIcon(isLight, selectedFeeder.lifelineCategory);
        const lifelineBadge = getFeederLifelineBadge(selectedFeeder, isLight);

        if (dtrs && dtrs.length > 0) {
          dtrs.forEach(dtr => {
            if (typeof dtr.lat !== 'number' || typeof dtr.lng !== 'number' || isNaN(dtr.lat) || isNaN(dtr.lng)) return;
            bounds.extend({ lat: dtr.lat, lng: dtr.lng });
            const marker = new google.maps.Marker({
              position: { lat: dtr.lat, lng: dtr.lng },
              icon: dtrIcon,
              zIndex: 55,
              title: `${dtr.name} (${selectedFeeder.name} Feeder)`,
              map: null // Detached by default; dynamically attached at street zoom (LOD)
            });

            marker.addListener('click', () => {
              dtrInfoWindowRef.current?.setContent(`
                <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; color: #0f172a; max-width: 240px; line-height: 1.35;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                    <span style="font-weight: 800; font-size: 13px; color: ${isNonCut ? '#e11d48' : '#b45309'};">⚡ ${dtr.name}</span>
                    <span style="font-size: 10px; font-family: monospace; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${dtr.kva ? dtr.kva + ' kVA' : 'DTR'}</span>
                  </div>
                  ${lifelineBadge ? `
                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 5px; font-size: 10px; font-weight: 700; padding: 3px 6px; border-radius: 4px; background: ${selectedFeeder.lifelineCategory === 'hospital' ? '#ffe4e6; color: #9f1239' : selectedFeeder.lifelineCategory === 'water' ? '#e0f2fe; color: #0369a1' : selectedFeeder.lifelineCategory === 'transit' ? '#f3e8ff; color: #6b21a8' : '#fef3c7; color: #92400e'};">
                      <span>${lifelineBadge.icon}</span>
                      <span>${lifelineBadge.label}</span>
                      <span style="margin-left: auto; font-family: monospace; font-size: 9px; opacity: 0.9;">${lifelineBadge.prioText}</span>
                    </div>
                  ` : ''}
                  <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                    <strong>Asset Code:</strong> ${dtr.id}<br>
                    <strong>Step-Down:</strong> 11,000V → 240V / 415V
                  </div>
                  <div style="font-size: 11px; font-weight: 600; color: #0369a1; margin-bottom: 2px;">
                    👥 Feeds ~${(dtr.cons || 0).toLocaleString()} Metered Consumers
                  </div>
                  <div style="font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
                    Feeder: <strong>${selectedFeeder.name}</strong> (${selectedFeeder.voltage})
                    ${selectedFeeder.isDedicated ? '<br><span style="color: #64748b; font-style: italic;">• Dedicated Service Line</span>' : ''}
                  </div>
                </div>
              `);
              dtrInfoWindowRef.current?.open(map, marker);
            });

            dtrMarkersRef.current.push(marker);
          });

          // Zoom-Gated Level of Detail (LOD): Attach DTR pins only at street scale (zoom >= 13.8)
          const syncDtrLod = () => {
            if (!mapRef.current) return;
            const currentZoom = mapRef.current.getZoom() || 11.5;
            const isStreetLevel = currentZoom >= 13.8;
            dtrMarkersRef.current.forEach(m => {
              if (isStreetLevel) {
                if (m.getMap() !== mapRef.current) m.setMap(mapRef.current);
              } else {
                if (m.getMap() !== null) m.setMap(null);
              }
            });
          };

          syncDtrLod();
          if (zoomListenerRef.current) zoomListenerRef.current.remove();
          zoomListenerRef.current = map.addListener('zoom_changed', syncDtrLod);
        }

        // Fit map camera around real feeder extent
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 90, right: 460, bottom: 90, left: 90 });
        }
      });
    });

    return () => {
      isMounted = false;
      if (feederDataLayerRef.current) {
        feederDataLayerRef.current.setMap(null);
        feederDataLayerRef.current = null;
      }
      if (zoomListenerRef.current) {
        zoomListenerRef.current.remove();
        zoomListenerRef.current = null;
      }
      feederLinesRef.current.forEach(l => l.setMap(null));
      feederLinesRef.current = [];
      feederGlowLinesRef.current.forEach(l => l.setMap(null));
      feederGlowLinesRef.current = [];
      dtrMarkersRef.current.forEach(m => m.setMap(null));
      dtrMarkersRef.current = [];
      if (dtrInfoWindowRef.current) dtrInfoWindowRef.current.close();
    };
  }, [selectedFeeder, selectedSubstation, mapLoaded, theme]);

  // Filtered search list
  const searchResults = useMemo<{ substations: TnebSubstation[]; sections: TnebSection[] }>(() => {
    if (!searchQuery.trim()) return { substations: [], sections: [] };
    const q = searchQuery.toLowerCase();
    const matchedSS = substations
      .filter(s => s.name.toLowerCase().includes(q) || s.code.includes(q) || s.circle.toLowerCase().includes(q))
      .slice(0, 5);
    const matchedSec = sections
      .filter(s => s.name.toLowerCase().includes(q) || s.division.toLowerCase().includes(q))
      .slice(0, 5);
    return { substations: matchedSS, sections: matchedSec };
  }, [searchQuery, substations, sections]);

  // Total count of lifeline feeders on the selected substation
  const lifelineFeedersCount = useMemo(() => {
    if (!selectedSubstation || !selectedSubstation.feeders) return 0;
    return selectedSubstation.feeders.filter(f => Boolean(f.lifelineCategory)).length;
  }, [selectedSubstation]);

  // Helper for Feeder Sorting: Criticality, Sub-Transmission & Voltage Priority
  const getFeederPriorityRank = (f: FeederDetail): number => {
    // Tier 1: P1 Critical Lifelines (Water / Sewage Pumping, Hospitals)
    if (f.priorityLevel === 'P1_CRITICAL' || f.priorityLevel === 'P1_NON_CUT' || f.lifelineCategory === 'hospital' || f.lifelineCategory === 'water') return 1;
    // Tier 2: P2 Essential Services (Metro, Rail, Govt / Defense HQ)
    if (f.priorityLevel === 'P2_ESSENTIAL' || f.lifelineCategory === 'transit' || f.lifelineCategory === 'governance') return 2;
    // Tier 3: 33 kV Sub-transmission Trunks (inter-substation step-down lines / interconnects)
    const is33kVTrunk = f.voltage?.includes('33') && !f.type?.toLowerCase().includes('dedicated') && f.lifelineCategory !== 'industrial_ht' && f.priorityLevel !== 'P3_COMMERCIAL';
    if (is33kVTrunk) return 3;
    // Tier 4: P3 Commercial / Dedicated Industrial HT Services
    if (f.priorityLevel === 'P3_COMMERCIAL' || f.lifelineCategory === 'industrial_ht' || f.type?.toLowerCase().includes('dedicated')) return 4;
    // Tier 5: Standard Low-Voltage Distribution Feeders
    return 5;
  };

  const getFeederVoltageNum = (voltageStr?: string): number => {
    if (!voltageStr) return 0;
    const match = voltageStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Filtered feeders for selected substation (Sorted by Option 1: Criticality & Voltage Priority)
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
      // 1. Priority rank (P1 non-cut lifelines -> P2 essential -> P3 commercial/dedicated -> P4 residential)
      const pA = getFeederPriorityRank(a);
      const pB = getFeederPriorityRank(b);
      if (pA !== pB) return pA - pB;

      // 2. Voltage tier (descending: 33 kV step-down subtransmission before 11 kV)
      const vA = getFeederVoltageNum(a.voltage);
      const vB = getFeederVoltageNum(b.voltage);
      if (vA !== vB) return vB - vA;

      // 3. Consumer population served (descending)
      const cA = a.consumers || 0;
      const cB = b.consumers || 0;
      if (cA !== cB) return cB - cA;

      // 4. Distribution transformers count (descending)
      const tA = a.transformers || 0;
      const tB = b.transformers || 0;
      if (tA !== tB) return tB - tA;

      // 5. Deterministic tie-breaker
      return a.name.localeCompare(b.name);
    });
  }, [selectedSubstation, feederFilter, feederCategoryFilter]);

  const isLight = theme === 'light';

  return (
    <div className={`relative w-full h-full min-h-[600px] flex overflow-hidden font-sans ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1" />

      {loadError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
          <div className="bg-red-950/90 border border-red-500/40 text-red-200 p-6 rounded-2xl max-w-md shadow-2xl text-center">
            <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Google Maps Connection Error</h3>
            <p className="text-sm text-red-300 mb-4">{loadError}</p>
            <p className="text-xs text-slate-400">
              Ensure <code className="bg-slate-900 px-2 py-0.5 rounded text-cyan-300">VITE_GOOGLE_MAPS_API_KEY</code> is configured in your project root <code className="bg-slate-900 px-2 py-0.5 rounded text-cyan-300">.env</code>.
            </p>
          </div>
        </div>
      )}

      {/* Top Center Floating Disaster Operations & Cyclone Protocol Cockpit */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5 w-auto max-w-[calc(100vw-2rem)]">
        <div className={`pointer-events-auto rounded-2xl p-1 shadow-2xl border flex items-center gap-1 transition-all ${
          isLight
            ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-300/40 backdrop-blur-md'
            : 'bg-slate-900/90 border-slate-700/80 text-white shadow-black/60 backdrop-blur-md'
        }`}>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 border-r shrink-0 border-current/10">
            <Wind className={`w-3.5 h-3.5 ${
              disasterScenario === 'NORMAL' ? (isLight ? 'text-emerald-600' : 'text-emerald-400') :
              disasterScenario === 'CYCLONE_ALERT' ? (isLight ? 'text-yellow-600' : 'text-yellow-400') :
              disasterScenario === 'SEVERE_CYCLONE' ? (isLight ? 'text-amber-600' : 'text-amber-400') :
              (isLight ? 'text-rose-600' : 'text-rose-400')
            }`} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Disaster Protocol
            </span>
          </div>

          <div className="flex items-center gap-1 whitespace-nowrap">
            <button
              onClick={() => setDisasterScenario('NORMAL')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                disasterScenario === 'NORMAL'
                  ? (isLight ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-500 text-slate-950 font-bold shadow-sm')
                  : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
              }`}
            >
              <span>🌤️</span>
              <span>Normal</span>
            </button>

            <button
              onClick={() => setDisasterScenario('CYCLONE_ALERT')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                disasterScenario === 'CYCLONE_ALERT'
                  ? (isLight ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm' : 'bg-yellow-400 text-slate-950 font-bold shadow-sm')
                  : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
              }`}
              title="Cyclone Watch Alert (Wind 65 km/h, Surge 0.8m) • Standby Mode"
            >
              <span>🟡</span>
              <span>Alert</span>
            </button>

            <button
              onClick={() => setDisasterScenario('SEVERE_CYCLONE')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                disasterScenario === 'SEVERE_CYCLONE'
                  ? (isLight ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-500 text-slate-950 font-bold shadow-sm')
                  : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
              }`}
              title="Cyclone Michaung / Vardah Landfall (Wind 90 km/h) • Statutory Pre-Emptive Trip of Overhead Lines"
            >
              <span>🌀</span>
              <span>Severe</span>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${
                disasterScenario === 'SEVERE_CYCLONE'
                  ? (isLight ? 'bg-amber-700 text-white' : 'bg-slate-950 text-amber-300 font-bold')
                  : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
              }`}>
                &gt;80k
              </span>
            </button>

            <button
              onClick={() => setDisasterScenario('EXTREME_SURGE')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                disasterScenario === 'EXTREME_SURGE'
                  ? (isLight ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-500 text-slate-950 font-bold shadow-sm')
                  : (isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-400')
              }`}
              title="Catastrophic Coastal Surge (3.2m Surge) • Exceeds TNSDMA 3.0m Regulatory Threshold"
            >
              <span>🌊</span>
              <span>Surge</span>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${
                disasterScenario === 'EXTREME_SURGE'
                  ? (isLight ? 'bg-rose-700 text-white' : 'bg-slate-950 text-rose-300 font-bold')
                  : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
              }`}>
                3.2m
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Statutory Protocol Readout Strip */}
        {disasterScenario !== 'NORMAL' && (
          <div className={`pointer-events-auto px-3.5 py-1 rounded-full text-xs shadow-md border flex items-center justify-center gap-2 backdrop-blur-md text-center max-w-xl transition-all ${
            disasterScenario === 'CYCLONE_ALERT'
              ? (isLight ? 'bg-yellow-50/95 border-yellow-300 text-yellow-900 shadow-yellow-500/10' : 'bg-yellow-950/85 border-yellow-700/80 text-yellow-200 shadow-black/40') :
            disasterScenario === 'SEVERE_CYCLONE'
              ? (isLight ? 'bg-amber-50/95 border-amber-300 text-amber-900 shadow-amber-500/10' : 'bg-amber-950/85 border-amber-700/80 text-amber-200 shadow-black/40') :
              (isLight ? 'bg-rose-50/95 border-rose-300 text-rose-900 shadow-rose-500/10' : 'bg-rose-950/85 border-rose-700/80 text-rose-200 shadow-black/40')
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold tracking-tight text-center">
              {disasterScenario === 'CYCLONE_ALERT' && 'Cyclone Watch Advisory (Wind 65 km/h) • Lineman Foot Patrols Alerted'}
              {disasterScenario === 'SEVERE_CYCLONE' && 'TNSDMA §5.6 Mandate: Overhead Radial Lines Tripped (>80 km/h) • UG Ring Feeders Preserved'}
              {disasterScenario === 'EXTREME_SURGE' && 'TNSDMA 3.0m Surge Mandate: Substation Inundation & Mobile Dewatering Active'}
            </span>
          </div>
        )}
      </div>

      {/* Top Left Floating Search & Quick Filters */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <div className={`pointer-events-auto rounded-xl p-2.5 shadow-xl transition-colors ${
          isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-slate-800'
        }`}>
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-white'
          }`}>
            <Search className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search Substation or AE Section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-transparent text-sm outline-none ${
                isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-500'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-white'}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Search Dropdown */}
          {searchQuery && (searchResults.substations.length > 0 || searchResults.sections.length > 0) && (
            <div className={`mt-2 pt-2 border-t max-h-60 overflow-y-auto space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              {searchResults.substations.map(ss => (
                <button
                  key={ss.code}
                  onClick={() => {
                    onSelectSubstation(ss);
                    onSelectSection(null);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold block truncate">{ss.name}</span>
                    <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {ss.totalConsumers ? `${ss.totalConsumers.toLocaleString()} consumers` : ss.circle}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded font-mono text-xs font-bold shrink-0 ${
                    ss.tier === 'bulk' ? (isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300') :
                    ss.tier === 'subtransmission' ? (isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300') :
                    (isLight ? 'bg-sky-100 text-sky-700' : 'bg-cyan-500/20 text-cyan-300')
                  }`}>
                    {ss.voltage} kV
                  </span>
                </button>
              ))}
              {searchResults.sections.map(sec => (
                <button
                  key={sec.code}
                  onClick={() => {
                    onSelectSection(sec);
                    onSelectSubstation(null);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <span className={`font-semibold truncate ${isLight ? 'text-emerald-700' : 'text-emerald-200'}`}>{sec.name}</span>
                  <span className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                    isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    AE
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floating Layer Controls (Positioned on Left below Search) */}
        <div className={`pointer-events-auto rounded-xl p-3 shadow-xl text-xs space-y-2.5 transition-colors ${
          isLight ? 'bg-white border border-slate-200 text-slate-800' : 'bg-slate-900 border border-slate-800 text-slate-200'
        }`}>
          <div className={`flex items-center justify-between ${isLayersExpanded ? 'border-b pb-2' : ''} ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
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
                  ? (isLight ? 'bg-sky-600 text-white font-bold' : 'bg-cyan-500 text-slate-950 font-bold')
                  : (isLight ? 'bg-slate-100 text-slate-600 hover:text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white')
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
                      ? (isLight ? 'bg-pink-50 border-pink-200 text-pink-900 shadow-sm' : 'bg-pink-950/40 border-pink-500/40 text-pink-200 shadow-sm')
                      : (isLight ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' : 'bg-slate-950/30 border-slate-800 text-slate-500 line-through')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-pink-600 ring-2 ring-pink-300' : 'bg-pink-500 ring-2 ring-pink-400/40'}`}></span>
                    <span className="font-medium">Bulk EHV (230-400kV)</span>
                  </div>
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                    isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300'
                  }`}>
                    {substations.filter(s => s.tier === 'bulk').length}
                  </span>
                </button>

                <button
                  onClick={() => setShowSubTrans(!showSubTrans)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                    showSubTrans
                      ? (isLight ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm' : 'bg-amber-950/40 border-amber-500/40 text-amber-200 shadow-sm')
                      : (isLight ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' : 'bg-slate-950/30 border-slate-800 text-slate-500 line-through')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-amber-600 ring-2 ring-amber-300' : 'bg-amber-500 ring-2 ring-amber-400/40'}`}></span>
                    <span className="font-medium">Sub-Trans (110kV)</span>
                  </div>
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                    isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {substations.filter(s => s.tier === 'subtransmission').length}
                  </span>
                </button>

                <button
                  onClick={() => setShowDistribution(!showDistribution)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                    showDistribution
                      ? (isLight ? 'bg-sky-50 border-sky-200 text-sky-900 shadow-sm' : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 shadow-sm')
                      : (isLight ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' : 'bg-slate-950/30 border-slate-800 text-slate-500 line-through')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-sky-600 ring-2 ring-sky-300' : 'bg-cyan-400 ring-2 ring-cyan-400/40'}`}></span>
                    <span className="font-medium">Distribution (33/11kV)</span>
                  </div>
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                    isLight ? 'bg-sky-100 text-sky-700' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {substations.filter(s => s.tier === 'distribution').length}
                  </span>
                </button>

                <button
                  onClick={() => setShowSections(!showSections)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                    showSections
                      ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 shadow-sm')
                      : (isLight ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' : 'bg-slate-950/30 border-slate-800 text-slate-500 line-through')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-emerald-500 ring-2 ring-emerald-400/40'}`}></span>
                    <span className="font-medium">AE Section Offices</span>
                  </div>
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                    isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {sections.length}
                  </span>
                </button>
              </div>

              <div className={`pt-2 border-t text-xs flex items-center justify-between ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
                <span>Scope: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>Chennai Only</strong></span>
                <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                  isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  NO POI
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-Height Substation / Section Inspector Drawer */}
      {(selectedSubstation || selectedSection) && (
        <div className={`absolute top-4 bottom-4 right-4 z-30 pointer-events-none flex flex-col items-end transition-all duration-200 ${
          isInspectorExpanded && selectedSubstation
            ? 'w-[calc(100vw-2rem)] md:w-[860px]'
            : 'w-[calc(100vw-2rem)] md:w-[460px]'
        }`}>
          <div className={`pointer-events-auto rounded-2xl p-4 shadow-2xl flex flex-col h-full w-full border transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700/80 text-slate-200'
          }`}>
            {/* Pinned Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b shrink-0 border-current/10">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold uppercase tracking-wider ${
                    selectedSubstation?.tier === 'bulk' ? (isLight ? 'bg-pink-100 text-pink-700 border border-pink-300' : 'bg-pink-500/20 text-pink-300 border border-pink-500/40') :
                    selectedSubstation?.tier === 'subtransmission' ? (isLight ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40') :
                    selectedSubstation?.tier === 'distribution' ? (isLight ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40') :
                    (isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                  }`}>
                    {selectedSubstation ? (
                      selectedSubstation.tier === 'bulk' ? `EHV BULK TRANSMISSION (${selectedSubstation.voltage} kV)` :
                      selectedSubstation.tier === 'subtransmission' ? `SUB-TRANSMISSION HUB (${selectedSubstation.voltage} kV)` :
                      `DISTRIBUTION YARD (${selectedSubstation.voltage} kV)`
                    ) : 'TNEB AE SECTION OFFICE'}
                  </span>
                  <span className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    #{selectedSubstation?.code || selectedSection?.code}
                  </span>
                  {((selectedSubstation?.gccZone && selectedSubstation?.gccWard) || (selectedSection?.gccZone && selectedSection?.gccWard)) && (
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                        isLight ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30'
                      }`}
                      title={`Greater Chennai Corporation: Zone ${selectedSubstation?.gccZone || selectedSection?.gccZone} (${selectedSubstation?.gccZoneName || selectedSection?.gccZoneName}) • Ward ${selectedSubstation?.gccWard || selectedSection?.gccWard}`}
                    >
                      <span>🏛️</span>
                      <span>Z{selectedSubstation?.gccZone || selectedSection?.gccZone}:W{selectedSubstation?.gccWard || selectedSection?.gccWard}</span>
                    </span>
                  )}
                  {selectedSubstation?.elevationM !== undefined && (
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                        selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                          ? (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40')
                          : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                          ? (isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40')
                          : (isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-800 text-slate-300 border border-slate-700')
                      }`}
                      title={`Ground Elevation: ${selectedSubstation.elevationM}m MSL • Distance to Coast: ${selectedSubstation.distanceToCoastKm || 0}km`}
                    >
                      <span>⛰️ {selectedSubstation.elevationM}m MSL</span>
                      {selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK' && <span className="font-sans font-bold">• 🌊 Surge Risk</span>}
                      {selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK' && <span className="font-sans font-bold">• ⚠️ Flood Risk</span>}
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
                {selectedSubstation && (
                  <button
                    onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
                    className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      isInspectorExpanded
                        ? (isLight ? 'bg-sky-100 text-sky-800' : 'bg-cyan-500/20 text-cyan-300')
                        : (isLight ? 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700')
                    }`}
                    title={isInspectorExpanded ? "Switch to Single Column Tabbed View" : "Split View: Show Connections & Feeders Side-by-Side"}
                  >
                    {isInspectorExpanded ? <Minimize2 className="w-4 h-4" /> : <Columns2 className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => {
                    onSelectSubstation(null);
                    onSelectSection(null);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLight ? 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700'
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
                <div className="grid grid-cols-3 gap-2 pb-2 shrink-0 border-b border-current/10 text-center text-xs">
                  <div className={`p-2 rounded-xl border ${isLight ? 'bg-sky-50/70 border-sky-100' : 'bg-slate-950/50 border-slate-800/80'}`}>
                    <span className={`text-xs flex items-center justify-center gap-1.5 font-medium ${isLight ? 'text-sky-700' : 'text-slate-400'}`}>
                      <Users className="w-3.5 h-3.5" />
                      Consumers
                    </span>
                    <span className={`font-mono font-bold text-base block mt-0.5 ${isLight ? 'text-sky-950' : 'text-cyan-300'}`}>
                      {selectedSubstation.totalConsumers > 0 ? selectedSubstation.totalConsumers.toLocaleString() : selectedSubstation.tier === 'bulk' ? 'Bulk Feed' : '0'}
                    </span>
                  </div>
                  <div className={`p-2 rounded-xl border ${isLight ? 'bg-amber-50/70 border-amber-100' : 'bg-slate-950/50 border-slate-800/80'}`}>
                    <span className={`text-xs flex items-center justify-center gap-1.5 font-medium ${isLight ? 'text-amber-700' : 'text-slate-400'}`}>
                      <Activity className="w-3.5 h-3.5" />
                      DTRs (DTs)
                    </span>
                    <span className={`font-mono font-bold text-base block mt-0.5 ${isLight ? 'text-amber-950' : 'text-amber-300'}`}>
                      {selectedSubstation.totalTransformers.toLocaleString()}
                    </span>
                  </div>
                  <div className={`p-2 rounded-xl border ${isLight ? 'bg-pink-50/70 border-pink-100' : 'bg-slate-950/50 border-slate-800/80'}`}>
                    <span className={`text-xs flex items-center justify-center gap-1.5 font-medium ${isLight ? 'text-pink-700' : 'text-slate-400'}`}>
                      <Zap className="w-3.5 h-3.5" />
                      Feeders
                    </span>
                    <span className={`font-mono font-bold text-base block mt-0.5 ${isLight ? 'text-pink-950' : 'text-pink-300'}`}>
                      {selectedSubstation.feeders.length}
                    </span>
                  </div>
                </div>

                {/* Substation Content: Dual Column Split View OR Single Column Tabbed View */}
                {isInspectorExpanded ? (
                  /* SPLIT COCKPIT VIEW (Side-by-Side: Connections & Specs on Left, Feeders on Right) */
                  <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 pt-2.5">
                    {/* Left Panel: Connections & Substation Field Metadata */}
                    <div className="flex flex-col h-full min-h-0 pr-3 border-r border-current/10 space-y-2.5 overflow-y-auto">
                      {/* Active Storm Surge / Inundation Alert - CRITICAL INFO PROMOTED TO TOP */}
                      {disasterScenario === 'EXTREME_SURGE' && selectedSubstation.elevationM !== undefined && selectedSubstation.elevationM <= 3.2 && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold leading-tight flex items-start gap-2 shadow-lg animate-pulse shrink-0 border border-rose-400/40">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-200" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="uppercase tracking-wider font-black text-xs text-white">CRITICAL: Switchyard Inundation Event</span>
                              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-black/25 text-amber-200 font-bold uppercase">3.2m Surge Active</span>
                            </div>
                            <p className="font-normal opacity-95 text-xs mt-1 leading-snug">
                              Yard elevation ({selectedSubstation.elevationM}m MSL) submerged by 3.2m surge. Switchyard pre-emptively isolated & de-energized. Deploy mobile diesel pumps per TANGEDCO SOP.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Consolidated Administrative & Switchyard Capacity Overview */}
                      {(() => {
                        const validIncomers = (selectedSubstation.incomingFeederNames || []).filter(n => {
                          const clean = String(n).trim().toUpperCase();
                          return clean && !['NA', 'N/A', 'NIL', 'NONE', '-', 'NULL'].includes(clean);
                        });

                        return (
                          <div className={`p-2.5 rounded-xl border text-xs shrink-0 ${
                            isLight ? 'bg-slate-50/90 border-slate-200/90 text-slate-900 shadow-xs' : 'bg-slate-950/60 border-slate-800 text-slate-100 shadow-xs'
                          }`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-500/15 text-cyan-300'
                                }`}>
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs truncate">
                                      {selectedSubstation.circle || 'Chennai EDC'}
                                    </span>
                                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      Region {selectedSubstation.regionCode || '01/09'}
                                    </span>
                                    {Boolean(selectedSubstation.totalCapacityMva) && (
                                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                        isLight ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      }`}>
                                        {selectedSubstation.totalCapacityMva} MVA
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-xs block truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                    TNEB Distribution Circle • Switchyard GPS
                                  </span>
                                </div>
                              </div>

                              <a
                                href={`https://www.google.com/maps?q=${selectedSubstation.lat},${selectedSubstation.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all shadow-xs group ${
                                  isLight
                                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                                    : 'bg-sky-500/20 hover:bg-sky-500/30 text-cyan-300 border border-sky-500/30'
                                }`}
                                title={`Open coordinates (${selectedSubstation.lat.toFixed(5)}, ${selectedSubstation.lng.toFixed(5)}) in Google Maps`}
                              >
                                <MapPin className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                <span>Maps ↗</span>
                              </a>
                            </div>

                            {(Boolean(selectedSubstation.powerTransformersCount) || Boolean(validIncomers.length)) && (
                              <div className={`mt-2 pt-1.5 border-t flex items-center justify-between gap-2 text-xs font-mono ${
                                isLight ? 'border-slate-200/80 text-slate-700' : 'border-slate-800 text-slate-300'
                              }`}>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span className="font-semibold">{selectedSubstation.powerTransformersCount || 1} Transformers</span>
                                  <span className="opacity-40">•</span>
                                  <span>{selectedSubstation.incomingFeedersCount || validIncomers.length || 1} Incomers</span>
                                </div>
                                {validIncomers.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap justify-end">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-xs font-mono truncate max-w-[140px] cursor-help ${
                                        isLight ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-900 text-amber-200 border border-amber-800/40'
                                      }`}
                                      title={`Connected Incomer Feeders: ${validIncomers.join(', ')}`}
                                    >
                                      ← {validIncomers[0]}{validIncomers.length > 1 ? ` (+${validIncomers.length - 1} more)` : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* GCC Municipal & Satellite Vulnerability Stack */}
                      <MunicipalDisasterCard node={selectedSubstation} isLight={isLight} />

                      {/* Substation Terrain & Flood Risk Profile */}
                      {selectedSubstation.elevationM !== undefined && (
                        <div className={`p-2.5 rounded-xl border space-y-2 shrink-0 ${
                          selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                            ? (isLight ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-rose-950/25 border-rose-800/60 text-rose-200')
                            : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                            ? (isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/25 border-amber-800/60 text-amber-200')
                            : (isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800/80 text-slate-200')
                        }`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              <span>🌊</span>
                              <span>Climate & Flood Risk</span>
                            </span>
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                              selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                                ? (isLight ? 'bg-rose-600 text-white' : 'bg-rose-500 text-slate-950 font-black')
                                : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                                ? (isLight ? 'bg-amber-600 text-white' : 'bg-amber-400 text-slate-950 font-black')
                                : (isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300')
                            }`}>
                              {selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                                ? 'CRITICAL SURGE'
                                : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                                ? 'WATERLOGGING RISK'
                                : 'SAFE ELEVATION'}
                            </span>
                          </div>

                          {/* Compact 3-metric bar */}
                          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                            <div className={`py-1.5 px-1 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                              <span className={`text-xs uppercase font-medium block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Elevation</span>
                              <strong className="text-xs font-bold block mt-0.5">{selectedSubstation.elevationM} m</strong>
                            </div>
                            <div className={`py-1.5 px-1 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                              <span className={`text-xs uppercase font-medium block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Coast Dist</span>
                              <strong className="text-xs font-bold block mt-0.5">{selectedSubstation.distanceToCoastKm || 0} km</strong>
                            </div>
                            <div className={`py-1.5 px-1 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                              <span className={`text-xs uppercase font-medium block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Risk Score</span>
                              <strong className="text-xs font-bold block mt-0.5">{selectedSubstation.compositeRiskScore || 0}/100</strong>
                            </div>
                          </div>

                          {/* 2015 Flood Historical Benchmark & TNSDMA Surge Standards */}
                          <div className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                            isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                          }`}>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
                              <div>
                                <span className="opacity-75 block text-xs font-sans">2015 Flood Benchmark:</span>
                                <strong className={selectedSubstation.benchmarked2015FloodDepthM && selectedSubstation.benchmarked2015FloodDepthM >= 1.5 ? (isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-bold') : ''}>
                                  {selectedSubstation.benchmarked2015FloodDepthM || 0.9}m {selectedSubstation.benchmarked2015FloodDepthM && selectedSubstation.benchmarked2015FloodDepthM >= 1.5 ? '(6ft Submerged)' : ''}
                                </strong>
                              </div>
                              <div>
                                <span className="opacity-75 block text-xs font-sans">Switchgear Plinth:</span>
                                <strong>{selectedSubstation.plinthElevationM || 1.5}m GL Clearance</strong>
                              </div>
                              <div>
                                <span className="opacity-75 block text-xs font-sans">TNSDMA Limit:</span>
                                <strong className="text-sky-600 dark:text-cyan-400">3.0m MSL Standard</strong>
                              </div>
                              <div>
                                <span className="opacity-75 block text-xs font-sans">Dewatering SOP:</span>
                                <span className={`px-2 py-0.5 rounded-md font-bold text-xs inline-block ${
                                  selectedSubstation.yardDewateringRequired
                                    ? (isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300')
                                    : (isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300')
                                }`}>
                                  {selectedSubstation.yardDewateringRequired ? '⚠️ Mobile Diesel Pumps' : '✅ Gravity Drainage'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {selectedSubstation.anticipatorySop && (
                            <div className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                              isLight ? 'bg-white/90 text-slate-700 border border-black/5' : 'bg-slate-900/80 text-slate-300 border border-white/10'
                            }`}>
                              <strong className="font-semibold mr-1">Field SOP:</strong>
                              <span>{selectedSubstation.anticipatorySop}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Jurisdictional AE Section Office */}
                      {jurisdictionalSections.length > 0 && (
                        <div className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 shrink-0 ${
                          isLight ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-xs truncate block">
                                {jurisdictionalSections[0].name}
                              </span>
                              <span className={`text-xs block truncate mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400/80'}`}>
                                AE Depot • {jurisdictionalSections[0].section?.mobile ? `📞 ${jurisdictionalSections[0].section.mobile} • ` : ''}{jurisdictionalSections[0].distanceKm} km
                              </span>
                            </div>
                          </div>
                          {jurisdictionalSections[0].section && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSection(jurisdictionalSections[0].section!);
                                onSelectSubstation(null);
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
                                isLight
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              <span>Locate</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Connections Header & Switch */}
                      <div className={`p-3 rounded-xl border shrink-0 transition-all ${
                        showConnections
                          ? (isLight ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20' : 'bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20')
                          : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80')
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              showConnections
                                ? (isLight ? 'bg-sky-600 text-white shadow-sm' : 'bg-cyan-500 text-slate-950 shadow-sm')
                                : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')
                            }`}>
                              <GitFork className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className={`text-xs font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                Isolate Electrical Circuit
                              </span>
                              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {electricalNodes.length} interconnected grid stations
                              </span>
                            </div>
                          </div>
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
                                ? (isLight ? 'bg-sky-600' : 'bg-cyan-500')
                                : (isLight ? 'bg-slate-300' : 'bg-slate-700')
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

                      {/* Operational Disclaimer Banner */}
                      <div className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-1.5 shrink-0 ${
                        isLight ? 'bg-slate-100/90 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}>
                        <span className="flex items-center gap-1 font-medium truncate">
                          <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                          Mapped Physical Topology
                        </span>
                        <span className="font-mono text-xs opacity-75 shrink-0">SCADA State Pending</span>
                      </div>

                      {/* Connected Substations Scroll List */}
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                        {electricalNodes.map(node => (
                          <button
                            key={node.id}
                            onClick={() => {
                              if (node.substation) {
                                onSelectSubstation(node.substation);
                                onSelectSection(null);
                              }
                            }}
                            className={`w-full text-left p-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                              isLight
                                ? 'bg-white hover:bg-slate-100/90 border-slate-200 hover:border-sky-300 text-slate-800 shadow-sm'
                                : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 hover:border-cyan-500/40 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/20"
                                style={{ backgroundColor: node.color }}
                              />
                              <div className="truncate">
                                <span className="font-semibold block truncate leading-tight">{node.name}</span>
                                <span className={`text-xs block truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {node.label} • {node.voltage || '33kV'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                              {node.confidenceTier === 'L1_VERIFIED' ? (
                                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  L1 Verified
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  L2 Inferred
                                </span>
                              )}
                              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{node.distanceKm} km</span>
                              <ArrowRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right Panel: Outgoing Feeders & Distribution Network */}
                    <div className="flex flex-col h-full min-h-0 pl-1 space-y-2 overflow-hidden">
                      <div className="flex items-center justify-between shrink-0">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          <Cable className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                          {selectedSubstation.tier === 'bulk' ? 'Outgoing Bulk Trunks & Lines' : 'Outgoing Distribution Feeders'}
                        </span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isLight ? 'text-amber-800 bg-amber-100' : 'text-amber-300 bg-amber-500/20'
                        }`}>
                          {filteredFeeders.length} of {selectedSubstation.feeders.length}
                        </span>
                      </div>

                      {/* Quick Category Filter Tabs */}
                      {lifelineFeedersCount > 0 && (
                        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs shrink-0 ${
                          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setFeederCategoryFilter('all')}
                            className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center ${
                              feederCategoryFilter === 'all'
                                ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm')
                                : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                            }`}
                          >
                            All ({selectedSubstation.feeders.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeederCategoryFilter('lifelines')}
                            className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                              feederCategoryFilter === 'lifelines'
                                ? (isLight ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-500 text-slate-950 shadow-sm')
                                : (isLight ? 'text-rose-700 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-950/40')
                            }`}
                          >
                            <Star className="w-3 h-3 fill-current" />
                            <span>Critical Lifelines</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                              feederCategoryFilter === 'lifelines'
                                ? (isLight ? 'bg-rose-700 text-white' : 'bg-slate-950 text-rose-300')
                                : (isLight ? 'bg-rose-200 text-rose-900' : 'bg-rose-500/30 text-rose-300')
                            }`}>
                              {lifelineFeedersCount}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Feeder Search Filter */}
                      {selectedSubstation.feeders.length > 4 && (
                        <input
                          type="text"
                          placeholder={feederCategoryFilter === 'lifelines' ? "Filter lifeline feeders..." : "Filter feeder by name..."}
                          value={feederFilter}
                          onChange={(e) => setFeederFilter(e.target.value)}
                          className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-none shrink-0 ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                              : 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder-slate-500'
                          }`}
                        />
                      )}

                      {/* Active Feeder Status Bar */}
                      {selectedFeeder && (
                        <div className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 shrink-0 ${
                          isLight
                            ? 'bg-sky-50 border-sky-200 text-sky-950'
                            : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                        }`}>
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-2 h-2 rounded-full animate-ping shrink-0"
                              style={{ backgroundColor: getFeederThemeColors(selectedFeeder.lifelineCategory, isLight).core }}
                            />
                            <span className="text-xs truncate">
                              Plotted on map: <strong className="font-semibold">{selectedFeeder.name}</strong> ({selectedFeeder.transformers || 8} DTRs)
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedFeeder(null)}
                            className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors shrink-0 ${
                              isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            Clear Map
                          </button>
                        </div>
                      )}

                      {/* Sort Order & Feeder Count Subheader */}
                      <div className={`flex items-center justify-between text-xs px-1 py-0.5 shrink-0 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        <span className="flex items-center gap-1 font-medium">
                          <Activity className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span>Sorted: Priority & Voltage Tier</span>
                        </span>
                        <span className="font-mono text-xs">
                          {filteredFeeders.length} {filteredFeeders.length === 1 ? 'line' : 'lines'}
                        </span>
                      </div>

                      {/* Feeders Scroll List (Full Remaining Height) */}
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                        {filteredFeeders.length > 0 ? (
                          filteredFeeders.map((f, idx) => {
                            const isFeederActive = selectedFeeder?.code === f.code;
                            const badge = getFeederLifelineBadge(f, isLight);
                            const isNonCut = f.priorityLevel === 'P1_NON_CUT' || f.priorityLevel === 'P1_CRITICAL';

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedFeeder(isFeederActive ? null : f)}
                                className={`w-full text-left p-2.5 rounded-xl text-xs border transition-all ${
                                  isFeederActive
                                    ? (isNonCut
                                        ? (isLight
                                            ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-sm'
                                            : 'bg-rose-950/70 border-rose-400 ring-2 ring-rose-500/40 shadow-sm')
                                        : (isLight
                                            ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300 shadow-sm'
                                            : 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-500/40 shadow-sm'))
                                    : (isLight
                                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                                        : 'bg-slate-950/50 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700')
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className={`font-semibold text-xs truncate ${
                                      isFeederActive
                                        ? (isNonCut
                                            ? (isLight ? 'text-rose-950 font-bold' : 'text-rose-200 font-bold')
                                            : (isLight ? 'text-sky-950 font-bold' : 'text-cyan-200 font-bold'))
                                        : (isLight ? 'text-slate-900' : 'text-slate-100')
                                    }`}>
                                      {f.name}
                                    </span>
                                    {isFeederActive && (
                                      <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                                        isNonCut ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                                      }`}>
                                        ON MAP
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {f.outageCount && f.outageCount > 0 ? (
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold flex items-center gap-0.5 ${
                                          f.outageCount >= 4
                                            ? (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40')
                                            : f.outageCount >= 2
                                            ? (isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40')
                                            : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
                                        }`}
                                        title={f.outageDates ? `Recorded trips: ${f.outageDates.join(', ')}` : undefined}
                                      >
                                        <span>⚡ {f.outageCount} {f.outageCount === 1 ? 'Trip' : 'Trips'}</span>
                                      </span>
                                    ) : null}
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold cursor-help ${
                                        f.voltage.includes('33')
                                          ? (isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300')
                                          : (isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300')
                                      }`}
                                      title={`Operating Distribution Voltage: ${f.voltage}`}
                                    >
                                        {f.voltage}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold cursor-help ${
                                          isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                        }`}
                                        title={f.config === 'UG' ? 'Underground Armored Cabling (protected from cyclone winds & tree falls)' : 'Overhead Distribution Conductors'}
                                      >
                                        {f.config}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Row 1: Primary Lifeline / Service Classification */}
                                  {badge && (
                                    <div className="flex items-center gap-1.5 my-0.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-bold text-xs border flex items-center gap-1 ${badge.badgeBg}`}
                                        title={`${badge.label}: High-priority statutory lifeline during disaster and storm events`}
                                      >
                                        <span>{badge.icon}</span>
                                        <span>{badge.label}</span>
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold cursor-help ${badge.prioBg}`}
                                        title={
                                          f.priorityLevel === 'P1_NON_CUT'
                                            ? 'Statutory Non-Cut: Lifeline feeder strictly protected from rolling power cuts and load shedding.'
                                            : f.priorityLevel === 'P1_CRITICAL'
                                            ? 'P1 Critical: Essential disaster management facility with emergency power priority.'
                                            : 'Standard priority distribution feeder.'
                                        }
                                      >
                                        {badge.prioText}
                                      </span>
                                      {f.isDedicated && (
                                        <span
                                          className={`text-xs font-mono cursor-help ${isLight ? 'text-slate-500' : 'text-slate-400'}`}
                                          title="Dedicated Service: Exclusive point-to-point line supplying a single bulk consumer or facility."
                                        >
                                          • Dedicated Line
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {!badge && f.voltage?.includes('33') && !f.type?.toLowerCase().includes('dedicated') && (
                                    <div className="flex items-center gap-1.5 my-0.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-bold text-xs border flex items-center gap-1 ${
                                          isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        }`}
                                        title="33 kV Sub-Transmission Trunk: Inter-substation bulk link supplying local distribution yards."
                                      >
                                        <span>⚡</span>
                                        <span>33 kV Trunk</span>
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold cursor-help ${
                                          isLight ? 'bg-amber-600 text-white font-bold' : 'bg-amber-500 text-slate-950 font-black'
                                        }`}
                                        title="Inter-Substation Link: Connects multiple TNEB substations in a loop network."
                                      >
                                        INTER-SS
                                      </span>
                                    </div>
                                  )}

                                  {/* Row 2: Streamlined Disaster & Engineering Metadata Strip */}
                                  {(f.esf15SlaHours !== undefined || (f.rmuCount !== undefined && f.rmuCount > 0) || f.restorationStage) && (
                                    <div className="flex items-center gap-1.5 my-0.5 flex-wrap text-xs font-mono">
                                      {f.esf15SlaHours !== undefined && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-help transition-colors border ${
                                            f.esf15SlaHours <= 6
                                              ? (isLight ? 'bg-rose-100/90 text-rose-900 font-bold border-rose-200' : 'bg-rose-500/20 text-rose-300 font-bold border-rose-500/30')
                                              : f.esf15SlaHours <= 12
                                              ? (isLight ? 'bg-purple-100/90 text-purple-900 font-bold border-purple-200' : 'bg-purple-500/20 text-purple-300 font-bold border-purple-500/30')
                                              : (isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700')
                                          }`}
                                          title={`ESF 15 (Emergency Support Function 15 - Energy & Utilities): Under TNSDMA statutory disaster rules, power must be restored within a maximum target of ${f.esf15SlaHours} hours.`}
                                        >
                                          <span>⏱️</span>
                                          <span>{f.esf15SlaHours}h SLA</span>
                                        </span>
                                      )}

                                      {f.rmuCount !== undefined && f.rmuCount > 0 && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-help border ${
                                            isLight ? 'bg-sky-100/90 text-sky-900 border-sky-200' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                          }`}
                                          title={`Ring Main Unit (RMU): Equipped with ${f.rmuCount} automated sectionalizing switches. Allows quick re-routing of power through loop circuits without trench digging.`}
                                        >
                                          <span>🔄</span>
                                          <span>{f.rmuCount} RMU</span>
                                        </span>
                                      )}

                                      {f.restorationStage && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-help border ${
                                            f.restorationStage === 3
                                              ? (isLight ? 'bg-amber-100/90 text-amber-900 font-bold border-amber-200' : 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/30')
                                              : (isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700')
                                          }`}
                                          title={`TANGEDCO Sequential Restoration: Priority Stage ${f.restorationStage} (restored ahead of general commercial & domestic feeders).`}
                                        >
                                          <span>📋</span>
                                          <span>Stage {f.restorationStage}</span>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Disaster Scenario Live/Tripped Callout Box */}
                                  {disasterScenario !== 'NORMAL' && (() => {
                                    const dStatus = getFeederDisasterStatus(f, selectedSubstation, disasterScenario, isLight);
                                    return (
                                      <div className={`mt-1 p-2 rounded-xl text-xs leading-relaxed border flex items-start gap-1.5 ${dStatus.badgeBg} ${dStatus.badgeTextCol} ${dStatus.badgeBorder}`}>
                                        <span className="text-xs shrink-0 mt-0.5">{dStatus.icon}</span>
                                        <div className="min-w-0 flex-1">
                                          <div className="font-bold flex items-center justify-between gap-1">
                                            <span>{dStatus.badgeText}</span>
                                            {dStatus.isTripped && (
                                              <span className="text-xs uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                                                ISOLATED
                                              </span>
                                            )}
                                          </div>
                                          <p className="opacity-90 mt-0.5 font-sans leading-tight">{dStatus.reason}</p>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Row 3: Consumers, DTRs, Length & Map Action */}
                                  <div className={`flex items-center justify-between text-xs font-mono mt-1 ${
                                    isLight ? 'text-slate-600' : 'text-slate-400'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      {f.consumers > 0 ? (
                                        <span
                                          className={`font-semibold cursor-help ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}
                                          title={`${f.consumers.toLocaleString()} metered consumers connected to this feeder`}
                                        >
                                          👥 {f.consumers.toLocaleString()}
                                        </span>
                                      ) : f.isDedicated || f.type?.toLowerCase().includes('dedicated') ? (
                                        <span
                                          className={`font-semibold cursor-help ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
                                          title="Dedicated point-to-point service supplying a single bulk consumer (factory, tech park, or campus)"
                                        >
                                          👥 1 Bulk Consumer
                                        </span>
                                      ) : (
                                        <span className="text-xs opacity-75">{f.type}</span>
                                      )}
                                      {f.transformers > 0 && (
                                        <span
                                          className={`cursor-help ${isFeederActive ? (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') : ''}`}
                                          title={`${f.transformers} Distribution Transformers (DTRs) stepping down voltage along this feeder route`}
                                        >
                                          • ⚡ {f.transformers} DTRs
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {f.lengthKm > 0 && (
                                        <span
                                          className="text-xs opacity-70 cursor-help"
                                          title={`Total feeder line length: ${f.lengthKm} km`}
                                        >
                                          {f.lengthKm} km
                                        </span>
                                      )}
                                      <span className={`text-xs underline font-semibold ${
                                        isFeederActive
                                          ? (isNonCut
                                              ? (isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-bold')
                                              : (isLight ? 'text-sky-700 font-bold' : 'text-cyan-400 font-bold'))
                                          : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
                                      }`}>
                                        {isFeederActive ? 'Dismiss' : 'View on Map'}
                                      </span>
                                    </div>
                                  </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className={`p-3 text-center rounded-xl border text-xs ${
                            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                          }`}>
                            {feederFilter
                              ? 'No feeders match your search filter.'
                              : feederCategoryFilter === 'lifelines'
                              ? 'No critical lifeline feeders identified on this substation.'
                              : 'Primary extra-high-voltage bulk grid node.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SINGLE-COLUMN TABBED VIEW (Full Height Dedicated to Selected Tab) */
                  <div className="flex flex-col flex-1 min-h-0 pt-2 space-y-2">
                    {/* Navigation Tabs (3-Way Balanced Spacing: Plant & Specs, Circuits & Grid, Civic & Crisis) */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl border shrink-0 text-xs ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('specs')}
                        className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-xs ${
                          inspectorTab === 'specs'
                            ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm')
                            : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                        }`}
                        title="Substation Specs, Transformers, Elevation, Flood Benchmark & Field SOP"
                      >
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Plant & Specs</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('circuits')}
                        className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-xs ${
                          inspectorTab === 'circuits'
                            ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm')
                            : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                        }`}
                        title="Distribution Feeders, Upstream Transmission Links & Grid Circuit Isolation"
                      >
                        <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span className="truncate">Circuits & Grid ({selectedSubstation.feeders.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('civic')}
                        className={`flex-1 py-1.5 px-1 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 text-xs ${
                          inspectorTab === 'civic'
                            ? (isLight ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm')
                            : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                        }`}
                        title="GCC Zone & Ward Disaster Management Committee & GEE Satellite Telemetry"
                      >
                        <Shield className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Civic & Crisis</span>
                      </button>
                    </div>

                    {/* Tab 2: Circuits & Grid Content (Takes Full Height) */}
                    {inspectorTab === 'circuits' && (
                      <div className="flex flex-col flex-1 min-h-0 space-y-2">
                        {/* Upstream Grid Links & Circuit Isolation Card */}
                        <div className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                          showConnections
                            ? (isLight ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20' : 'bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20')
                            : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80')
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                showConnections
                                  ? (isLight ? 'bg-sky-600 text-white shadow-sm' : 'bg-cyan-500 text-slate-950 shadow-sm')
                                  : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')
                              }`}>
                                <GitFork className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Isolate Electrical Circuit
                                  </span>
                                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold shrink-0 ${
                                    electricalNodes.length > 0
                                      ? (isLight ? 'bg-sky-100 text-sky-800' : 'bg-cyan-500/20 text-cyan-300')
                                      : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')
                                  }`}>
                                    {electricalNodes.length} {electricalNodes.length === 1 ? 'electrical link' : 'electrical links'}
                                  </span>
                                </div>
                                <p className={`text-xs leading-tight truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
                                      ? (isLight ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-cyan-950 border-cyan-700 text-cyan-200')
                                      : (isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800')
                                  }`}
                                  title="Expand/collapse connected transmission lines & campus trunks"
                                >
                                  <span>{isLinksListExpanded ? 'Hide Links' : 'View Links'}</span>
                                  {isLinksListExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}

                              <button
                                type="button"
                                role="switch"
                                aria-checked={showConnections}
                                onClick={() => setShowConnections(!showConnections)}
                                disabled={electricalNodes.length === 0}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  electricalNodes.length === 0
                                    ? 'opacity-40 cursor-not-allowed bg-slate-300'
                                    : showConnections
                                    ? (isLight ? 'bg-sky-600' : 'bg-cyan-500')
                                    : (isLight ? 'bg-slate-300' : 'bg-slate-700')
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    showConnections ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Expandable Connected Grid Nodes Drawer */}
                          {isLinksListExpanded && electricalNodes.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                              <div className="flex items-center justify-between text-xs font-semibold px-0.5 mb-1">
                                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                                  Linked Substations & Trunks ({electricalNodes.length})
                                </span>
                                <span className="text-xs font-mono opacity-60">Click node to navigate</span>
                              </div>
                              {electricalNodes.map(node => (
                                <button
                                  key={node.id}
                                  onClick={() => {
                                    if (node.substation) {
                                      onSelectSubstation(node.substation);
                                      onSelectSection(null);
                                    }
                                  }}
                                  className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                    isLight
                                      ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-sky-300 text-slate-800 shadow-xs'
                                      : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-cyan-500/40 text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate min-w-0">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
                                      style={{ backgroundColor: node.color }}
                                    />
                                    <div className="truncate">
                                      <span className="font-semibold block truncate text-xs leading-tight">{node.name}</span>
                                      <span className={`text-xs flex items-center gap-1 mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                        <span>{node.label}</span>
                                        {node.voltage && <span className="font-mono font-bold">• {node.voltage}</span>}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                                    {node.confidenceTier === 'L1_VERIFIED' ? (
                                      <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                                        L1 Verified
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                                        L2 Inferred
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                                      {node.distanceKm} km
                                    </span>
                                    <ArrowRight className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Feeder Listing Header */}
                        <div className="flex items-center justify-between shrink-0">
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            <Cable className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                            {selectedSubstation.tier === 'bulk' ? 'Outgoing Bulk Trunks & Lines' : 'Outgoing Distribution Feeders'}
                          </span>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                            isLight ? 'text-amber-800 bg-amber-100' : 'text-amber-300 bg-amber-500/20'
                          }`}>
                            {filteredFeeders.length} of {selectedSubstation.feeders.length}
                          </span>
                        </div>

                        {/* Quick Category Filter Tabs */}
                        {lifelineFeedersCount > 0 && (
                          <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs shrink-0 ${
                            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                          }`}>
                            <button
                              type="button"
                              onClick={() => setFeederCategoryFilter('all')}
                              className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center ${
                                feederCategoryFilter === 'all'
                                  ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm')
                                  : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                              }`}
                            >
                              All ({selectedSubstation.feeders.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeederCategoryFilter('lifelines')}
                              className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                                feederCategoryFilter === 'lifelines'
                                  ? (isLight ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-500 text-slate-950 shadow-sm')
                                  : (isLight ? 'text-rose-700 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-950/40')
                              }`}
                            >
                              <Star className="w-3 h-3 fill-current" />
                              <span>Critical Lifelines</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                                feederCategoryFilter === 'lifelines'
                                  ? (isLight ? 'bg-rose-700 text-white' : 'bg-slate-950 text-rose-300')
                                  : (isLight ? 'bg-rose-200 text-rose-900' : 'bg-rose-500/30 text-rose-300')
                              }`}>
                                {lifelineFeedersCount}
                              </span>
                            </button>
                          </div>
                        )}

                        {/* Feeder Search Filter */}
                        {selectedSubstation.feeders.length > 4 && (
                          <input
                            type="text"
                            placeholder={feederCategoryFilter === 'lifelines' ? "Filter lifeline feeders..." : "Filter feeder by name..."}
                            value={feederFilter}
                            onChange={(e) => setFeederFilter(e.target.value)}
                            className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-none shrink-0 ${
                              isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                                : 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder-slate-500'
                            }`}
                          />
                        )}

                        {/* Active Feeder Status Bar */}
                        {selectedFeeder && (
                          <div className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 shrink-0 ${
                            isLight
                              ? 'bg-sky-50 border-sky-200 text-sky-950'
                              : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                          }`}>
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-2 h-2 rounded-full animate-ping shrink-0"
                                style={{ backgroundColor: getFeederThemeColors(selectedFeeder.lifelineCategory, isLight).core }}
                              />
                              <span className="text-xs truncate">
                                Plotted on map: <strong className="font-semibold">{selectedFeeder.name}</strong> ({selectedFeeder.transformers || 8} DTRs)
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedFeeder(null)}
                              className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors shrink-0 ${
                                isLight
                                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              Clear Map
                            </button>
                          </div>
                        )}

                        {/* Sort Order & Jargon Guide Toggle */}
                        <div className={`flex items-center justify-between text-xs px-1 py-0.5 shrink-0 ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          <span className="flex items-center gap-1 font-medium">
                            <Activity className="w-3 h-3 text-cyan-500 shrink-0" />
                            <span>Sorted: Priority & Voltage</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowJargonGuide(!showJargonGuide)}
                            className={`font-semibold flex items-center gap-1 transition-colors underline ${
                              isLight ? 'text-sky-700 hover:text-sky-900' : 'text-cyan-400 hover:text-cyan-200'
                            }`}
                            title="Click to view plain-English definitions of TNEB disaster codes and acronyms"
                          >
                            <Info className="w-3 h-3" />
                            <span>{showJargonGuide ? 'Hide Jargon Guide ▲' : 'Explain Jargon (P1, ESF, RMU) ▼'}</span>
                          </button>
                        </div>

                        {/* Collapsible Grid Jargon Explainer Cheat Sheet */}
                        {showJargonGuide && (
                          <div className={`p-2.5 rounded-xl border text-xs leading-relaxed space-y-2 shrink-0 ${
                            isLight ? 'bg-sky-50/90 border-sky-200 text-slate-800' : 'bg-slate-900/90 border-slate-700 text-slate-200'
                          }`}>
                            <div className="font-bold text-xs flex items-center justify-between border-b pb-1 border-slate-200/60 dark:border-slate-800">
                              <span className="flex items-center gap-1.5">
                                <span>⚡</span>
                                <span>TNEB & Disaster Terminology Cheat Sheet</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowJargonGuide(false)}
                                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                <strong className="text-rose-700 dark:text-rose-400 font-bold block">P1 NON-CUT (Statutory Lifeline):</strong>
                                <span className="opacity-90">Essential service (water pumping, hospital). Exempt from rolling load-shedding during power crises.</span>
                              </div>
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                <strong className="text-purple-700 dark:text-purple-400 font-bold block">ESF 15: 6h SLA (Disaster Mandate):</strong>
                                <span className="opacity-90">Emergency Support Function 15 (Energy): Under TNSDMA rules, power must be restored within 6 hours.</span>
                              </div>
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                <strong className="text-sky-700 dark:text-cyan-400 font-bold block">RMU (Ring Main Unit):</strong>
                                <span className="opacity-90">Automated underground switches that allow rapid power re-routing through backup loop circuits without digging.</span>
                              </div>
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                <strong className="text-amber-700 dark:text-amber-400 font-bold block">Stage 3 Restoration:</strong>
                                <span className="opacity-90">TANGEDCO storm protocol: Restored right after grid substations, ahead of commercial and domestic lines.</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Feeders Scroll List (Full Available Vertical Space!) */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                          {filteredFeeders.length > 0 ? (
                            filteredFeeders.map((f, idx) => {
                              const isFeederActive = selectedFeeder?.code === f.code;
                              const badge = getFeederLifelineBadge(f, isLight);
                              const isNonCut = f.priorityLevel === 'P1_NON_CUT' || f.priorityLevel === 'P1_CRITICAL';

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedFeeder(isFeederActive ? null : f)}
                                  className={`w-full text-left p-2 rounded-xl text-xs border transition-all ${
                                    isFeederActive
                                      ? (isNonCut
                                          ? (isLight
                                              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-sm'
                                              : 'bg-rose-950/70 border-rose-400 ring-2 ring-rose-500/40 shadow-sm')
                                          : (isLight
                                              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300 shadow-sm'
                                              : 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-500/40 shadow-sm'))
                                      : (isLight
                                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                                          : 'bg-slate-950/50 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700')
                                  }`}
                                >
                                  {/* Feeder Name & Technical Badges */}
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span
                                        className={`font-semibold text-xs truncate ${
                                          isFeederActive
                                            ? (isNonCut
                                                ? (isLight ? 'text-rose-950 font-bold' : 'text-rose-200 font-bold')
                                                : (isLight ? 'text-sky-950 font-bold' : 'text-cyan-200 font-bold'))
                                            : (isLight ? 'text-slate-900' : 'text-slate-100')
                                        }`}
                                        title={f.name}
                                      >
                                        {f.name}
                                      </span>
                                      {isFeederActive && (
                                        <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                                          isNonCut ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                                        }`}>
                                          ON MAP
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {f.outageCount && f.outageCount > 0 ? (
                                        <span
                                          className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold flex items-center gap-0.5 ${
                                            f.outageCount >= 4
                                              ? (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40')
                                              : f.outageCount >= 2
                                              ? (isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40')
                                              : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
                                          }`}
                                          title={f.outageDates ? `Recorded trips: ${f.outageDates.join(', ')}` : undefined}
                                        >
                                          <span>⚡ {f.outageCount} {f.outageCount === 1 ? 'Trip' : 'Trips'}</span>
                                        </span>
                                      ) : null}
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold cursor-help ${
                                          f.voltage.includes('33')
                                            ? (isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300')
                                            : (isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300')
                                        }`}
                                        title={`Operating Distribution Voltage: ${f.voltage}`}
                                      >
                                        {f.voltage}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold cursor-help ${
                                          isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                        }`}
                                        title={f.config === 'UG' ? 'Underground Armored Cabling (protected from cyclone winds & tree falls)' : 'Overhead Distribution Conductors'}
                                      >
                                        {f.config}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Row 1: Primary Lifeline / Service Classification */}
                                  {badge && (
                                    <div className="flex items-center gap-1.5 my-0.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-bold text-xs border flex items-center gap-1 ${badge.badgeBg}`}
                                        title={`${badge.label}: High-priority statutory lifeline during disaster and storm events`}
                                      >
                                        <span>{badge.icon}</span>
                                        <span>{badge.label}</span>
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold cursor-help ${badge.prioBg}`}
                                        title={
                                          f.priorityLevel === 'P1_NON_CUT'
                                            ? 'Statutory Non-Cut: Lifeline feeder strictly protected from rolling power cuts and load shedding.'
                                            : f.priorityLevel === 'P1_CRITICAL'
                                            ? 'P1 Critical: Essential disaster management facility with emergency power priority.'
                                            : 'Standard priority distribution feeder.'
                                        }
                                      >
                                        {badge.prioText}
                                      </span>
                                      {f.isDedicated && (
                                        <span
                                          className={`text-xs font-mono cursor-help ${isLight ? 'text-slate-500' : 'text-slate-400'}`}
                                          title="Dedicated Service: Exclusive point-to-point line supplying a single bulk consumer or facility."
                                        >
                                          • Dedicated Line
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {!badge && f.voltage?.includes('33') && !f.type?.toLowerCase().includes('dedicated') && (
                                    <div className="flex items-center gap-1.5 my-0.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-bold text-xs border flex items-center gap-1 ${
                                          isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        }`}
                                        title="33 kV Sub-Transmission Trunk: Inter-substation bulk link supplying local distribution yards."
                                      >
                                        <span>⚡</span>
                                        <span>33 kV Trunk</span>
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold cursor-help ${
                                          isLight ? 'bg-amber-600 text-white font-bold' : 'bg-amber-500 text-slate-950 font-black'
                                        }`}
                                        title="Inter-Substation Link: Connects multiple TNEB substations in a loop network."
                                      >
                                        INTER-SS
                                      </span>
                                    </div>
                                  )}

                                  {/* Row 2: Streamlined Disaster & Engineering Metadata Strip */}
                                  {(f.esf15SlaHours !== undefined || (f.rmuCount !== undefined && f.rmuCount > 0) || f.restorationStage) && (
                                    <div className="flex items-center gap-1.5 my-0.5 flex-wrap text-xs font-mono">
                                      {f.esf15SlaHours !== undefined && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-help transition-colors border ${
                                            f.esf15SlaHours <= 6
                                              ? (isLight ? 'bg-rose-100/90 text-rose-900 font-bold border-rose-200' : 'bg-rose-500/20 text-rose-300 font-bold border-rose-500/30')
                                              : f.esf15SlaHours <= 12
                                              ? (isLight ? 'bg-purple-100/90 text-purple-900 font-bold border-purple-200' : 'bg-purple-500/20 text-purple-300 font-bold border-purple-500/30')
                                              : (isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700')
                                          }`}
                                          title={`ESF 15 (Emergency Support Function 15 - Energy & Utilities): Under TNSDMA statutory disaster rules, power must be restored within a maximum target of ${f.esf15SlaHours} hours.`}
                                        >
                                          <span>⏱️</span>
                                          <span>{f.esf15SlaHours}h SLA</span>
                                        </span>
                                      )}

                                      {f.rmuCount !== undefined && f.rmuCount > 0 && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-help border ${
                                            isLight ? 'bg-sky-100/90 text-sky-900 border-sky-200' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                          }`}
                                          title={`Ring Main Unit (RMU): Equipped with ${f.rmuCount} automated sectionalizing switches. Allows quick re-routing of power through loop circuits without trench digging.`}
                                        >
                                          <span>🔄</span>
                                          <span>{f.rmuCount} RMU</span>
                                        </span>
                                      )}

                                      {f.restorationStage && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-help border ${
                                            f.restorationStage === 3
                                              ? (isLight ? 'bg-amber-100/90 text-amber-900 font-bold border-amber-200' : 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/30')
                                              : (isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700')
                                          }`}
                                          title={`TANGEDCO Sequential Restoration: Priority Stage ${f.restorationStage} (restored ahead of general commercial & domestic feeders).`}
                                        >
                                          <span>📋</span>
                                          <span>Stage {f.restorationStage}</span>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Disaster Scenario Live/Tripped Callout Box */}
                                  {disasterScenario !== 'NORMAL' && (() => {
                                    const dStatus = getFeederDisasterStatus(f, selectedSubstation, disasterScenario, isLight);
                                    return (
                                      <div className={`mt-1.5 p-2 rounded-xl text-xs leading-relaxed border flex items-start gap-2 ${dStatus.badgeBg} ${dStatus.badgeTextCol} ${dStatus.badgeBorder}`}>
                                        <span className="shrink-0 mt-0.5">{dStatus.icon}</span>
                                        <div className="min-w-0 flex-1">
                                          <div className="font-bold flex items-center justify-between gap-1">
                                            <span>{dStatus.badgeText}</span>
                                            {dStatus.isTripped && (
                                              <span className="text-xs uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                                                ISOLATED
                                              </span>
                                            )}
                                          </div>
                                          <p className="opacity-90 mt-1 font-sans leading-relaxed">{dStatus.reason}</p>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Row 3: Consumers, DTRs, Length & Map Action */}
                                  <div className={`flex items-center justify-between text-xs font-mono mt-1.5 ${
                                    isLight ? 'text-slate-600' : 'text-slate-400'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      {f.consumers > 0 ? (
                                        <span
                                          className={`font-semibold cursor-help ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}
                                          title={`${f.consumers.toLocaleString()} metered consumers connected to this feeder`}
                                        >
                                          👥 {f.consumers.toLocaleString()}
                                        </span>
                                      ) : f.isDedicated || f.type?.toLowerCase().includes('dedicated') ? (
                                        <span
                                          className={`font-semibold cursor-help ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
                                          title="Dedicated point-to-point service supplying a single bulk consumer (factory, tech park, or campus)"
                                        >
                                          👥 1 Bulk Consumer
                                        </span>
                                      ) : (
                                        <span className="opacity-75">{f.type}</span>
                                      )}
                                      {f.transformers > 0 && (
                                        <span
                                          className={`cursor-help ${isFeederActive ? (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') : ''}`}
                                          title={`${f.transformers} Distribution Transformers (DTRs) stepping down voltage along this feeder route`}
                                        >
                                          • ⚡ {f.transformers} DTRs
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {f.lengthKm > 0 && (
                                        <span
                                          className="opacity-70 cursor-help"
                                          title={`Total feeder line length: ${f.lengthKm} km`}
                                        >
                                          {f.lengthKm} km
                                        </span>
                                      )}
                                      <span className={`underline font-semibold ${
                                        isFeederActive
                                          ? (isNonCut
                                              ? (isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-bold')
                                              : (isLight ? 'text-sky-700 font-bold' : 'text-cyan-400 font-bold'))
                                          : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
                                      }`}>
                                        {isFeederActive ? 'Dismiss' : 'View on Map'}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className={`p-3 text-center rounded-xl border text-xs ${
                              isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                            }`}>
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

                    {/* Tab 1: Plant & Specs Content (Full Height Dedicated to Selected Tab) */}
                    {inspectorTab === 'specs' && (
                      <div className="flex flex-col flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1">
                        {/* Active Storm Surge / Inundation Alert - CRITICAL INFO PROMOTED TO TOP */}
                        {disasterScenario === 'EXTREME_SURGE' && selectedSubstation.elevationM !== undefined && selectedSubstation.elevationM <= 3.2 && (
                          <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold leading-tight flex items-start gap-2 shadow-lg animate-pulse shrink-0 border border-rose-400/40">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-200" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="uppercase tracking-wider font-bold text-xs text-white">CRITICAL: Switchyard Inundation Event</span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-black/25 text-amber-200 font-bold uppercase">3.2m Surge Active</span>
                              </div>
                              <p className="font-normal opacity-95 text-xs mt-0.5 leading-snug">
                                Yard elevation ({selectedSubstation.elevationM}m MSL) submerged by 3.2m surge. Switchyard pre-emptively isolated & de-energized. Deploy mobile diesel pumps per TANGEDCO SOP.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Consolidated Administrative & Switchyard Capacity Overview */}
                        {(() => {
                          const validIncomers = (selectedSubstation.incomingFeederNames || []).filter(n => {
                            const clean = String(n).trim().toUpperCase();
                            return clean && !['NA', 'N/A', 'NIL', 'NONE', '-', 'NULL'].includes(clean);
                          });

                          return (
                            <div className={`p-2.5 rounded-xl border text-xs shrink-0 ${
                              isLight ? 'bg-slate-50/90 border-slate-200/90 text-slate-900 shadow-xs' : 'bg-slate-950/60 border-slate-800 text-slate-100 shadow-xs'
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-500/15 text-cyan-300'
                                  }`}>
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs truncate">
                                        {selectedSubstation.circle || 'Chennai EDC'}
                                      </span>
                                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                        isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                      }`}>
                                        Region {selectedSubstation.regionCode || '01/09'}
                                      </span>
                                      {Boolean(selectedSubstation.totalCapacityMva) && (
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                          isLight ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                          {selectedSubstation.totalCapacityMva} MVA
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-xs block truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                      TNEB Distribution Circle • Switchyard GPS
                                    </span>
                                  </div>
                                </div>

                                <a
                                  href={`https://www.google.com/maps?q=${selectedSubstation.lat},${selectedSubstation.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all shadow-xs group ${
                                    isLight
                                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                                      : 'bg-sky-500/20 hover:bg-sky-500/30 text-cyan-300 border border-sky-500/30'
                                  }`}
                                  title={`Open coordinates (${selectedSubstation.lat.toFixed(5)}, ${selectedSubstation.lng.toFixed(5)}) in Google Maps`}
                                >
                                  <MapPin className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                  <span>Maps ↗</span>
                                </a>
                              </div>

                              {(Boolean(selectedSubstation.powerTransformersCount) || Boolean(validIncomers.length)) && (
                                <div className={`mt-2 pt-1.5 border-t flex items-center justify-between gap-2 text-xs font-mono ${
                                  isLight ? 'border-slate-200/80 text-slate-700' : 'border-slate-800 text-slate-300'
                                }`}>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span className="font-semibold">{selectedSubstation.powerTransformersCount || 1} Transformers</span>
                                    <span className="opacity-40">•</span>
                                    <span>{selectedSubstation.incomingFeedersCount || validIncomers.length || 1} Incomers</span>
                                  </div>
                                  {validIncomers.length > 0 && (
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-xs font-mono truncate max-w-[200px] cursor-help ${
                                        isLight ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-900 text-amber-200 border border-amber-800/40'
                                      }`}
                                      title={`Connected Incomer Feeders: ${validIncomers.join(', ')}`}
                                    >
                                      ← {validIncomers[0]}{validIncomers.length > 1 ? ` (+${validIncomers.length - 1} more)` : ''}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Substation Terrain & Flood Risk Profile */}
                        {selectedSubstation.elevationM !== undefined && (
                          <div className={`p-2.5 rounded-xl border space-y-2 shrink-0 ${
                            selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                              ? (isLight ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-rose-950/25 border-rose-800/60 text-rose-200')
                              : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                              ? (isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/25 border-amber-800/60 text-amber-200')
                              : (isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800/80 text-slate-200')
                          }`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-xs flex items-center gap-1.5">
                                <span>🌊</span>
                                <span>Climate & Flood Risk</span>
                              </span>
                              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                                selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                                  ? (isLight ? 'bg-rose-600 text-white' : 'bg-rose-500 text-slate-950 font-black')
                                  : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                                  ? (isLight ? 'bg-amber-600 text-white' : 'bg-amber-400 text-slate-950 font-black')
                                  : (isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300')
                              }`}>
                                {selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                                  ? 'CRITICAL SURGE'
                                  : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                                  ? 'WATERLOGGING RISK'
                                  : 'SAFE ELEVATION'}
                              </span>
                            </div>

                            {/* Compact 3-metric bar */}
                            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                              <div className={`py-1.5 px-1 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                                <span className={`text-xs uppercase font-medium block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Elevation</span>
                                <strong className="text-sm font-bold block mt-0.5">{selectedSubstation.elevationM} m</strong>
                              </div>
                              <div className={`py-1.5 px-1 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                                <span className={`text-xs uppercase font-medium block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Coast Dist</span>
                                <strong className="text-sm font-bold block mt-0.5">{selectedSubstation.distanceToCoastKm || 0} km</strong>
                              </div>
                              <div className={`py-1.5 px-1 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                                <span className={`text-xs uppercase font-medium block leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Risk Score</span>
                                <strong className="text-sm font-bold block mt-0.5">{selectedSubstation.compositeRiskScore || 0}/100</strong>
                              </div>
                            </div>

                            {/* 2015 Flood Historical Benchmark & TNSDMA Surge Standards */}
                            <div className={`p-2 rounded-lg border text-xs space-y-1.5 ${
                              isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                            }`}>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
                                <div>
                                  <span className="opacity-75 block text-xs font-sans">2015 Flood Benchmark:</span>
                                  <strong className={selectedSubstation.benchmarked2015FloodDepthM && selectedSubstation.benchmarked2015FloodDepthM >= 1.5 ? (isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-bold') : ''}>
                                    {selectedSubstation.benchmarked2015FloodDepthM || 0.9}m {selectedSubstation.benchmarked2015FloodDepthM && selectedSubstation.benchmarked2015FloodDepthM >= 1.5 ? '(6ft Submerged)' : ''}
                                  </strong>
                                </div>
                                <div>
                                  <span className="opacity-75 block text-xs font-sans">Switchgear Plinth:</span>
                                  <strong>{selectedSubstation.plinthElevationM || 1.5}m GL Clearance</strong>
                                </div>
                                <div>
                                  <span className="opacity-75 block text-xs font-sans">TNSDMA Limit:</span>
                                  <strong className="text-sky-600 dark:text-cyan-400">3.0m MSL Standard</strong>
                                </div>
                                <div>
                                  <span className="opacity-75 block text-xs font-sans">Dewatering SOP:</span>
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-xs inline-block ${
                                    selectedSubstation.yardDewateringRequired
                                      ? (isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300')
                                      : (isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300')
                                  }`}>
                                    {selectedSubstation.yardDewateringRequired ? '⚠️ Mobile Diesel Pumps' : '✅ Gravity Drainage'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {selectedSubstation.anticipatorySop && (
                              <div className={`px-2.5 py-1.5 rounded-lg text-xs leading-normal ${
                                isLight ? 'bg-white/90 text-slate-700 border border-black/5' : 'bg-slate-900/80 text-slate-300 border border-white/10'
                              }`}>
                                <strong className="font-semibold mr-1">Field SOP:</strong>
                                <span>{selectedSubstation.anticipatorySop}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Jurisdictional AE Section Office */}
                        {jurisdictionalSections.length > 0 && (
                          <div className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 shrink-0 ${
                            isLight ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-bold text-xs truncate block">
                                  {jurisdictionalSections[0].name}
                                </span>
                                <span className={`text-xs block truncate ${isLight ? 'text-emerald-700' : 'text-emerald-400/80'}`}>
                                  AE Depot • {jurisdictionalSections[0].section?.mobile ? `📞 ${jurisdictionalSections[0].section.mobile} • ` : ''}{jurisdictionalSections[0].distanceKm} km
                                </span>
                              </div>
                            </div>
                            {jurisdictionalSections[0].section && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectSection(jurisdictionalSections[0].section!);
                                  onSelectSubstation(null);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
                                  isLight
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                <span>Locate</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Operational Dispatch Guide */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        }`}>
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
                )}
              </div>
            )}

            {/* Section Specific Details (Full Height View for AE Section Offices) */}
            {selectedSection && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-3 text-xs">
                {selectedSection.boundary && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    isLight ? 'bg-amber-50/80 border-amber-200 text-amber-950' : 'bg-amber-950/25 border-amber-800/60 text-amber-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold text-xs block leading-tight">
                          Jurisdictional Boundary
                        </span>
                        <span className={`text-xs block ${isLight ? 'text-amber-800/80' : 'text-amber-400/80'}`}>
                          Official O&M Field & Fuse-Call Beat
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                      isLight ? 'bg-amber-200/70 text-amber-950' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      Territory Active
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                  }`}>
                    <span className={`text-xs uppercase tracking-wider font-semibold block mb-1 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>Division</span>
                    <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {selectedSection.division || 'Chennai Central'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                  }`}>
                    <span className={`text-xs uppercase tracking-wider font-semibold block mb-1 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>Subdivision</span>
                    <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {selectedSection.subdivision || 'O&M'}
                    </span>
                  </div>
                </div>

                {/* GCC Municipal & Satellite Vulnerability Stack */}
                <MunicipalDisasterCard node={selectedSection} isLight={isLight} />

                <div className={`space-y-2.5 p-3 rounded-xl border text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                  {selectedSection.mobile && (
                    <div className={`flex items-center gap-2.5 ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                      <Phone className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <a href={`tel:${selectedSection.mobile}`} className={`font-mono font-medium ${isLight ? 'hover:text-emerald-600' : 'hover:text-emerald-300'}`}>
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
                    <div className={`flex items-start gap-2.5 pt-1 border-t ${
                      isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                    }`}>
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{selectedSection.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
