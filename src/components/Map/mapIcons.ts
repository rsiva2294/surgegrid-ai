/**
 * mapIcons.ts
 * 
 * Specialized Google Maps Marker Symbols, Geometry Themes, and Lifeline Badges
 * Optimized for TNEB Grid visualization in light/dark mode with Zero-POI backgrounds.
 */

import type { TnebSubstation, FeederDetail } from '../../types/tneb';

export function getNodeColor(tier: string, type: 'substation' | 'section', isLight: boolean): string {
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

export function getFeederThemeColors(category?: string, isLight?: boolean) {
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

export type FeederNodeType = 'RMU' | 'LIFELINE_DTR' | 'STANDARD_DTR';

export function classifyDtrPoint(
  dtr: { name?: string; kva?: number | string; cons?: number; htFeeders?: number | null },
  feederCategory?: string
): { type: FeederNodeType; isRmu: boolean; isLifeline: boolean; label: string } {
  const nameUpper = (dtr.name || '').toUpperCase();
  // True RMU = dual HT incomer (loop-in/loop-out switching capability).
  // "RMU" in TNEB GIS names is just a naming convention, not actual switchgear.
  const isRmu = (dtr.htFeeders != null && dtr.htFeeders >= 2);
  const isLifeline = !isRmu && (
    Boolean(feederCategory && feederCategory !== 'industrial_ht') ||
    nameUpper.includes('HOSPITAL') ||
    nameUpper.includes('METRO') ||
    nameUpper.includes('WATER') ||
    nameUpper.includes('CMWSSB') ||
    nameUpper.includes('PUMPING')
  );

  if (isRmu) {
    return { type: 'RMU', isRmu: true, isLifeline: false, label: 'Ring Main Unit (RMU)' };
  }
  if (isLifeline) {
    return { type: 'LIFELINE_DTR', isRmu: false, isLifeline: true, label: 'Lifeline Transformer' };
  }
  return { type: 'STANDARD_DTR', isRmu: false, isLifeline: false, label: 'Distribution Transformer' };
}

export function getRmuMarkerIcon(isLight: boolean): google.maps.Symbol {
  return {
    // Distinct prominent diamond shape for switching & sectionalizing RMU nodes
    path: 'M 0,-6 L 6,0 L 0,6 L -6,0 Z',
    fillColor: isLight ? '#0284C7' : '#00E5FF',
    fillOpacity: 1,
    strokeColor: isLight ? '#FFFFFF' : '#0F172A',
    strokeWeight: 2.5,
    scale: 2.6
  };
}

export function getDtrMarkerIcon(isLight: boolean, category?: string, isRmu: boolean = false): google.maps.Symbol {
  if (isRmu) {
    return getRmuMarkerIcon(isLight);
  }

  let fillColor = isLight ? '#D97706' : '#F59E0B';
  if (category === 'hospital') {
    fillColor = isLight ? '#E11D48' : '#F43F5E';
  } else if (category === 'water') {
    fillColor = isLight ? '#0284C7' : '#06B6D4';
  } else if (category === 'transit') {
    fillColor = isLight ? '#7C3AED' : '#8B5CF6';
  }

  const isLifeline = Boolean(category && category !== 'industrial_ht');

  return {
    path: isLifeline ? google.maps.SymbolPath.CIRCLE : 'M -3,-3 L 3,-3 L 3,3 L -3,3 Z',
    fillColor,
    fillOpacity: 1,
    strokeColor: isLight ? '#0F172A' : '#FFFFFF',
    strokeWeight: isLifeline ? 2.0 : 1.2,
    scale: isLifeline ? 4.5 : 1.6
  };
}

export function cleanLifelineLabel(label?: string, fallback: string = ''): string {
  if (!label) return fallback;
  return label
    .replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\s]+/u, '')
    .replace(/\bDedicated HT Commercial\/Industrial\b/i, 'Commercial & Industrial')
    .replace(/\s*\(Dedicated HT\)/i, '')
    .trim();
}

export function getFeederLifelineBadge(feeder: FeederDetail, isLight: boolean) {
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

// `highlight` is true while a triage filter is on: every marker still shown is one the user is looking for.
// `exposed` marks a substation that is flood-flagged and in heavy rain at the current simulation step.
export function getSubstationMarkerIcon(
  ss: TnebSubstation,
  isSelected: boolean,
  isLight: boolean,
  highlight = false,
  exposed = false
): google.maps.Symbol {
  let color = isLight ? '#0284C7' : '#06B6D4';
  let scale = 6;
  const boost = (highlight || exposed) && !isSelected ? 3 : 0;

  if (ss.tier === 'bulk') {
    color = isLight ? '#BE185D' : '#EC4899';
    scale = (isSelected ? 15 : 10) + boost;
  } else if (ss.tier === 'subtransmission') {
    color = isLight ? '#D97706' : '#F59E0B';
    scale = (isSelected ? 13 : 8) + boost;
  } else {
    scale = (isSelected ? 11 : 6) + boost;
  }

  const strokeColor = isSelected
    ? (isLight ? '#0F172A' : '#FFFFFF')
    : exposed
    ? '#DC2626'
    : (isLight ? '#FFFFFF' : '#083344');

  const strokeWeight = isSelected ? (isLight ? 4 : 3.5) : exposed ? 3.5 : 2.5;

  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1.0,
    strokeColor,
    strokeWeight
  };
}

export function getSectionMarkerIcon(isSelected: boolean, isLight: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isSelected ? 10 : 5,
    fillColor: isLight ? '#059669' : '#10B981',
    fillOpacity: 0.95,
    strokeColor: isSelected
      ? (isLight ? '#0F172A' : '#FFFFFF')
      : '#FFFFFF',
    strokeWeight: isSelected ? (isLight ? 4 : 3.5) : 2.5
  };
}
