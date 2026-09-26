import React, { useEffect, useRef, useState, useMemo } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { TnebSubstation, TnebSection, FeederDetail } from '../../types/tneb';
import { Zap, Shield, Phone, Mail, MapPin, Layers, Search, X, Users, Cable, Activity, GitFork, ArrowRight, ChevronDown, ChevronUp, Star, Columns2, Minimize2, Info } from 'lucide-react';

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
        name: 'Dedicated Commercial / Industrial HT',
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
  return label.replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\s]+/u, '').trim();
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
        icon: '🚰',
        label: cleanLifelineLabel(feeder.lifelineLabel, 'Water / Sewage'),
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
        icon: '🏛️',
        label: cleanLifelineLabel(feeder.lifelineLabel, 'Gov / Defense'),
        prioText: 'P2 ESSENTIAL',
        badgeBg: isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        prioBg: isLight ? 'bg-amber-600 text-white font-bold' : 'bg-amber-400 text-slate-950 font-black'
      };
    case 'industrial_ht':
      return {
        icon: '🏭',
        label: cleanLifelineLabel(feeder.lifelineLabel, 'Commercial / HT'),
        prioText: 'P3 COMMERCIAL',
        badgeBg: isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800/80 text-slate-300 border-slate-700',
        prioBg: isLight ? 'bg-slate-600 text-white font-bold' : 'bg-slate-600 text-white font-bold'
      };
    default:
      return null;
  }
}

function computeFeederCorridor(
  substation: TnebSubstation,
  feeder: FeederDetail,
  substations: TnebSubstation[],
  sections: TnebSection[]
): { path: { lat: number; lng: number }[]; dtrs: { id: string; name: string; lat: number; lng: number; consumers: number }[] } {
  const originLat = substation.lat;
  const originLng = substation.lng;
  const feederUpper = feeder.name.toUpperCase();

  let targetLat: number | null = null;
  let targetLng: number | null = null;

  // 1. Look for known name match in sections or substations
  const matchedSubstation = substations.find(s => s.code !== substation.code && feederUpper.includes(s.cleanName.toUpperCase()));
  if (matchedSubstation) {
    targetLat = matchedSubstation.lat;
    targetLng = matchedSubstation.lng;
  } else {
    const matchedSection = sections.find(s => feederUpper.includes(s.cleanName.toUpperCase()));
    if (matchedSection) {
      targetLat = matchedSection.lat;
      targetLng = matchedSection.lng;
    }
  }

  // 2. If no direct match, generate deterministic angle radiating from substation
  if (targetLat === null || targetLng === null) {
    let hash = 0;
    for (let i = 0; i < feeder.name.length; i++) {
      hash = (hash << 5) - hash + feeder.name.charCodeAt(i);
      hash |= 0;
    }
    const angleRad = ((Math.abs(hash) % 360) * Math.PI) / 180;
    const effectiveKm = Math.min(Math.max(feeder.lengthKm || 2.5, 1.5), 4.2);
    const dLat = (effectiveKm * Math.cos(angleRad)) / 111;
    const dLng = (effectiveKm * Math.sin(angleRad)) / 108;
    targetLat = originLat + dLat;
    targetLng = originLng + dLng;
  }

  // Generate organic 4-segment street corridor
  const waypoints: { lat: number; lng: number }[] = [{ lat: originLat, lng: originLng }];
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const perpOffset = Math.sin(t * Math.PI) * 0.0012 * ((feeder.name.length % 2 === 0) ? 1 : -1);
    const lat = originLat + (targetLat - originLat) * t + perpOffset * 0.5;
    const lng = originLng + (targetLng - originLng) * t + perpOffset;
    waypoints.push({ lat, lng });
  }

  // Place DTRs along the path
  const dtrCount = Math.min(Math.max(feeder.transformers || 8, 3), 35);
  const avgConsumers = Math.round((feeder.consumers || (dtrCount * 120)) / dtrCount);
  const dtrs: { id: string; name: string; lat: number; lng: number; consumers: number }[] = [];

  for (let i = 1; i <= dtrCount; i++) {
    const fraction = 0.15 + (i / (dtrCount + 1)) * 0.8;
    const segmentIndex = Math.min(Math.floor(fraction * (waypoints.length - 1)), waypoints.length - 2);
    const segT = (fraction * (waypoints.length - 1)) - segmentIndex;
    const p1 = waypoints[segmentIndex];
    const p2 = waypoints[segmentIndex + 1];

    const jitterLat = Math.sin(i * 3.7) * 0.00015;
    const jitterLng = Math.cos(i * 3.7) * 0.00015;

    dtrs.push({
      id: `${feeder.code}_dtr_${i}`,
      name: `DTR #${i < 10 ? '0' + i : i}`,
      lat: p1.lat + (p2.lat - p1.lat) * segT + jitterLat,
      lng: p1.lng + (p2.lng - p1.lng) * segT + jitterLng,
      consumers: Math.round(avgConsumers * (0.8 + (Math.abs(Math.sin(i * 1.5)) * 0.4)))
    });
  }

  return { path: waypoints, dtrs };
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
  const feederLineRef = useRef<google.maps.Polyline | null>(null);
  const feederGlowLineRef = useRef<google.maps.Polyline | null>(null);
  const dtrMarkersRef = useRef<google.maps.Marker[]>([]);
  const dtrInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

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
  const [inspectorTab, setInspectorTab] = useState<'feeders' | 'connections' | 'info'>('feeders');

  // Reset showConnections, selectedFeeder, feederCategoryFilter, and inspectorTab when selected substation changes
  useEffect(() => {
    setShowConnections(false);
    setSelectedFeeder(null);
    setFeederCategoryFilter('all');
    setInspectorTab('feeders');
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
          minZoom: 9.8,
          maxZoom: 18,
          gestureHandling: 'greedy',
          mapTypeId: isSatellite ? 'hybrid' : 'roadmap',
          styles: activeMapStyle,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          backgroundColor: theme === 'light' ? '#f8fafc' : '#0b0f19'
        });

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

    if (selectedSubstation) {
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
    } else if (selectedSection) {
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
    if (selectedSubstation) {
      mapRef.current.panTo({ lat: selectedSubstation.lat, lng: selectedSubstation.lng });
      mapRef.current.setZoom(14.2);
    } else if (selectedSection && !selectedSection.boundary) {
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

      const polyline = new google.maps.Polyline({
        path,
        strokeOpacity: 0,
        zIndex: 40,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.95,
              scale: 2.5,
              strokeColor: node.color
            },
            offset: '0',
            repeat: '13px'
          },
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              strokeColor: node.color,
              fillColor: node.color,
              fillOpacity: 0.95,
              scale: 2.2
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

  // Render on-demand Feeder Corridor and DTR markers when a feeder is selected
  useEffect(() => {
    // Clear previous feeder line and DTR markers
    if (feederLineRef.current) {
      feederLineRef.current.setMap(null);
      feederLineRef.current = null;
    }
    if (feederGlowLineRef.current) {
      feederGlowLineRef.current.setMap(null);
      feederGlowLineRef.current = null;
    }
    dtrMarkersRef.current.forEach(m => m.setMap(null));
    dtrMarkersRef.current = [];
    if (dtrInfoWindowRef.current) {
      dtrInfoWindowRef.current.close();
    }

    if (!mapRef.current || !mapLoaded || !selectedSubstation || !selectedFeeder) {
      return;
    }

    const map = mapRef.current;
    const isLight = theme === 'light';
    const corridor = computeFeederCorridor(selectedSubstation, selectedFeeder, substations, sections);
    const themeColors = getFeederThemeColors(selectedFeeder.lifelineCategory, isLight);
    const isNonCut = selectedFeeder.priorityLevel === 'P1_NON_CUT';

    // 1. Glow outer polyline
    feederGlowLineRef.current = new google.maps.Polyline({
      path: corridor.path,
      strokeColor: themeColors.glow,
      strokeOpacity: isLight ? 0.38 : 0.48,
      strokeWeight: isNonCut ? 10 : 8,
      zIndex: 48,
      map
    });

    // 2. Core sharp feeder line with directional flow arrows
    feederLineRef.current = new google.maps.Polyline({
      path: corridor.path,
      strokeColor: themeColors.core,
      strokeOpacity: 0.95,
      strokeWeight: isNonCut ? 4 : 3.5,
      zIndex: 50,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2.2,
            strokeColor: themeColors.core,
            fillColor: themeColors.core,
            fillOpacity: 1
          },
          offset: '50%',
          repeat: '90px'
        }
      ],
      map
    });

    // 3. Render DTR markers along the corridor
    if (!dtrInfoWindowRef.current) {
      dtrInfoWindowRef.current = new google.maps.InfoWindow();
    }

    const dtrIcon = getDtrMarkerIcon(isLight, selectedFeeder.lifelineCategory);
    const lifelineBadge = getFeederLifelineBadge(selectedFeeder, isLight);

    corridor.dtrs.forEach(dtr => {
      const marker = new google.maps.Marker({
        position: { lat: dtr.lat, lng: dtr.lng },
        icon: dtrIcon,
        zIndex: 55,
        title: `${dtr.name} (${selectedFeeder.name} Feeder)`,
        map
      });

      marker.addListener('click', () => {
        dtrInfoWindowRef.current?.setContent(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; color: #0f172a; max-width: 230px; line-height: 1.35;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
              <span style="font-weight: 800; font-size: 13px; color: ${isNonCut ? '#e11d48' : '#b45309'};">⚡ ${dtr.name}</span>
              <span style="font-size: 10px; font-family: monospace; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 700;">DTR / DTS</span>
            </div>
            ${lifelineBadge ? `
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 5px; font-size: 10px; font-weight: 700; padding: 3px 6px; border-radius: 4px; background: ${selectedFeeder.lifelineCategory === 'hospital' ? '#ffe4e6; color: #9f1239' : selectedFeeder.lifelineCategory === 'water' ? '#e0f2fe; color: #0369a1' : selectedFeeder.lifelineCategory === 'transit' ? '#f3e8ff; color: #6b21a8' : '#fef3c7; color: #92400e'};">
                <span>${lifelineBadge.icon}</span>
                <span>${lifelineBadge.label}</span>
                <span style="margin-left: auto; font-family: monospace; font-size: 9px; opacity: 0.9;">${lifelineBadge.prioText}</span>
              </div>
            ` : ''}
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              <strong>Step-Down:</strong> 11,000V → 240V / 415V
            </div>
            <div style="font-size: 11px; font-weight: 600; color: #0369a1; margin-bottom: 2px;">
              👥 Feeds ~${dtr.consumers.toLocaleString()} Consumers
            </div>
            <div style="font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
              Feeder: <strong>${selectedFeeder.name}</strong> (${selectedFeeder.voltage})
              ${selectedFeeder.isDedicated ? '<br><span style="color: #64748b; font-style: italic;">• Dedicated Service Line (HT)</span>' : ''}
            </div>
          </div>
        `);
        dtrInfoWindowRef.current?.open(map, marker);
      });

      dtrMarkersRef.current.push(marker);
    });

    // 4. Auto-fit camera bounds around the active feeder corridor
    const bounds = new google.maps.LatLngBounds();
    corridor.path.forEach(pt => bounds.extend(pt));
    corridor.dtrs.forEach(d => bounds.extend({ lat: d.lat, lng: d.lng }));
    map.fitBounds(bounds, { top: 90, right: 460, bottom: 90, left: 90 });

    return () => {
      if (feederLineRef.current) feederLineRef.current.setMap(null);
      if (feederGlowLineRef.current) feederGlowLineRef.current.setMap(null);
      dtrMarkersRef.current.forEach(m => m.setMap(null));
      dtrMarkersRef.current = [];
      if (dtrInfoWindowRef.current) dtrInfoWindowRef.current.close();
    };
  }, [selectedFeeder, selectedSubstation, mapLoaded, theme, substations, sections]);

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

  // Filtered feeders for selected substation
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
    return list;
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
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {ss.totalConsumers ? `${ss.totalConsumers.toLocaleString()} consumers` : ss.circle}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
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
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
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
              className="flex items-center gap-1.5 text-left font-bold uppercase tracking-wider text-[11px] hover:opacity-80 transition-opacity"
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
              className={`px-2 py-0.5 rounded font-medium text-[10px] transition-colors ${
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
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
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
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
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
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
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
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {sections.length}
                  </span>
                </button>
              </div>

              <div className={`pt-2 border-t text-[10px] flex items-center justify-between ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
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
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider ${
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
                  {selectedSubstation?.elevationM !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold flex items-center gap-1 ${
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
                  <p className={`text-[11px] mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
                  <div className={`p-1.5 rounded-lg border ${isLight ? 'bg-sky-50/70 border-sky-100' : 'bg-slate-950/50 border-slate-800/80'}`}>
                    <span className={`text-[10px] flex items-center justify-center gap-1 font-semibold ${isLight ? 'text-sky-700' : 'text-slate-400'}`}>
                      <Users className="w-3 h-3" />
                      Consumers
                    </span>
                    <span className={`font-mono font-bold text-xs ${isLight ? 'text-sky-950' : 'text-cyan-300'}`}>
                      {selectedSubstation.totalConsumers > 0 ? selectedSubstation.totalConsumers.toLocaleString() : selectedSubstation.tier === 'bulk' ? 'Bulk Feed' : '0'}
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${isLight ? 'bg-amber-50/70 border-amber-100' : 'bg-slate-950/50 border-slate-800/80'}`}>
                    <span className={`text-[10px] flex items-center justify-center gap-1 font-semibold ${isLight ? 'text-amber-700' : 'text-slate-400'}`}>
                      <Activity className="w-3 h-3" />
                      DTRs (DTs)
                    </span>
                    <span className={`font-mono font-bold text-xs ${isLight ? 'text-amber-950' : 'text-amber-300'}`}>
                      {selectedSubstation.totalTransformers.toLocaleString()}
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${isLight ? 'bg-pink-50/70 border-pink-100' : 'bg-slate-950/50 border-slate-800/80'}`}>
                    <span className={`text-[10px] flex items-center justify-center gap-1 font-semibold ${isLight ? 'text-pink-700' : 'text-slate-400'}`}>
                      <Zap className="w-3 h-3" />
                      Feeders
                    </span>
                    <span className={`font-mono font-bold text-xs ${isLight ? 'text-pink-950' : 'text-pink-300'}`}>
                      {selectedSubstation.feeders.length}
                    </span>
                  </div>
                </div>

                {/* Substation Content: Dual Column Split View OR Single Column Tabbed View */}
                {isInspectorExpanded ? (
                  /* SPLIT COCKPIT VIEW (Side-by-Side: Connections & Specs on Left, Feeders on Right) */
                  <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 pt-2.5">
                    {/* Left Panel: Connections & Substation Field Metadata */}
                    <div className="flex flex-col h-full min-h-0 pr-3 border-r border-current/10 space-y-3 overflow-hidden">
                      {/* Substation Circle & Coordinates */}
                      <div className="grid grid-cols-2 gap-2 text-xs shrink-0">
                        <div className={`p-2 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                        }`}>
                          <span className={`text-[9px] uppercase tracking-wider font-semibold block mb-0.5 ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}>Circle</span>
                          <span className={`font-semibold text-xs truncate block ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                            {selectedSubstation.circle || 'Chennai EDC'}
                          </span>
                        </div>
                        <div className={`p-2 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                        }`}>
                          <span className={`text-[9px] uppercase tracking-wider font-semibold block mb-0.5 ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}>Region Code</span>
                          <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                            {selectedSubstation.regionCode || '01/09'}
                          </span>
                        </div>
                      </div>

                      {/* Substation Terrain & Flood Risk Profile */}
                      {selectedSubstation.elevationM !== undefined && (
                        <div className={`p-2.5 rounded-xl border text-xs space-y-1.5 shrink-0 ${
                          selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                            ? (isLight ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-rose-950/25 border-rose-800/60 text-rose-200')
                            : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                            ? (isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/25 border-amber-800/60 text-amber-200')
                            : (isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800/80 text-slate-200')
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] flex items-center gap-1.5">
                              <span>🌊</span>
                              <span>Terrain & Flood Risk</span>
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                                ? (isLight ? 'bg-rose-600 text-white' : 'bg-rose-500 text-slate-950 font-black')
                                : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                                ? (isLight ? 'bg-amber-600 text-white' : 'bg-amber-400 text-slate-950 font-black')
                                : (isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300')
                            }`}>
                              {selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                                ? 'CRITICAL SURGE'
                                : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                                ? 'HIGH WATERLOG'
                                : 'SAFE ELEVATION'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                            <div className={`p-1 rounded ${isLight ? 'bg-white/80' : 'bg-black/30'}`}>
                              <span className="text-[8px] opacity-75 block">Elevation</span>
                              <strong className="text-[11px]">{selectedSubstation.elevationM}m</strong>
                            </div>
                            <div className={`p-1 rounded ${isLight ? 'bg-white/80' : 'bg-black/30'}`}>
                              <span className="text-[8px] opacity-75 block">To Coast</span>
                              <strong className="text-[11px]">{selectedSubstation.distanceToCoastKm || 0}km</strong>
                            </div>
                            <div className={`p-1 rounded ${isLight ? 'bg-white/80' : 'bg-black/30'}`}>
                              <span className="text-[8px] opacity-75 block">Risk Score</span>
                              <strong className="text-[11px]">{selectedSubstation.compositeRiskScore || 0}/100</strong>
                            </div>
                          </div>
                          {selectedSubstation.anticipatorySop && (
                            <div className={`p-1.5 rounded text-[9.5px] leading-tight ${
                              isLight ? 'bg-white/90 text-slate-700' : 'bg-slate-900/80 text-slate-300'
                            }`}>
                              <span className="font-bold">⚡ SOP: </span>
                              {selectedSubstation.anticipatorySop}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Jurisdictional AE Section Office */}
                      {jurisdictionalSections.length > 0 && (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 shrink-0 ${
                          isLight ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              <Shield className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs truncate block">
                                {jurisdictionalSections[0].name}
                              </span>
                              <span className={`text-[10px] block truncate ${isLight ? 'text-emerald-700' : 'text-emerald-400/80'}`}>
                                AE Depot • {jurisdictionalSections[0].distanceKm} km
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
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0 flex items-center gap-1 transition-all ${
                                isLight
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              Locate
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
                              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
                                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {node.label} • {node.voltage || '33kV'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[10px] shrink-0">
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
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          isLight ? 'text-amber-800 bg-amber-100' : 'text-amber-300 bg-amber-500/20'
                        }`}>
                          {filteredFeeders.length} of {selectedSubstation.feeders.length}
                        </span>
                      </div>

                      {/* Quick Category Filter Tabs */}
                      {lifelineFeedersCount > 0 && (
                        <div className={`flex items-center gap-1 p-1 rounded-xl border text-[11px] shrink-0 ${
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
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
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
                            <span className="text-[11px] truncate">
                              Plotted on map: <strong className="font-semibold">{selectedFeeder.name}</strong> ({selectedFeeder.transformers || 8} DTRs)
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedFeeder(null)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors shrink-0 ${
                              isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            Clear Map
                          </button>
                        </div>
                      )}

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
                                      <span className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded shrink-0 ${
                                        isNonCut ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                                      }`}>
                                        ON MAP
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {f.outageCount && f.outageCount > 0 ? (
                                      <span
                                        className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold flex items-center gap-0.5 ${
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
                                    <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                                      f.voltage.includes('33')
                                        ? (isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300')
                                        : (isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300')
                                    }`}>
                                      {f.voltage}
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {f.config}
                                    </span>
                                  </div>
                                </div>

                                {badge && (
                                  <div className="flex items-center gap-1.5 my-1 flex-wrap">
                                    <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] border flex items-center gap-1 ${badge.badgeBg}`}>
                                      <span>{badge.icon}</span>
                                      <span>{badge.label}</span>
                                    </span>
                                    <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${badge.prioBg}`}>
                                      {badge.prioText}
                                    </span>
                                    {f.isDedicated && (
                                      <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                        • Dedicated HT
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className={`flex items-center justify-between text-[11px] font-mono ${
                                  isLight ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    {f.consumers > 0 ? (
                                      <span className={`font-semibold ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
                                        👥 {f.consumers.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] opacity-75">{f.type}</span>
                                    )}
                                    {f.transformers > 0 && (
                                      <span className={isFeederActive ? (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') : ''}>
                                        • ⚡ {f.transformers} DTRs
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {f.lengthKm > 0 && (
                                      <span className="text-[10px] opacity-70">{f.lengthKm} km</span>
                                    )}
                                    <span className={`text-[10px] underline ${
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
                    {/* Navigation Tabs */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl border shrink-0 text-xs ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('feeders')}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          inspectorTab === 'feeders'
                            ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm')
                            : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                        }`}
                      >
                        <Cable className="w-3.5 h-3.5" />
                        <span>Feeders ({selectedSubstation.feeders.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('connections')}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          inspectorTab === 'connections'
                            ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm')
                            : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                        }`}
                      >
                        <GitFork className="w-3.5 h-3.5" />
                        <span>Grid Links ({electricalNodes.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('info')}
                        className={`py-1.5 px-2.5 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
                          inspectorTab === 'info'
                            ? (isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm')
                            : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                        }`}
                        title="Substation Info & Field AE Depot"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Info</span>
                      </button>
                    </div>

                    {/* Tab 1: Feeders Content (Takes Full Height) */}
                    {inspectorTab === 'feeders' && (
                      <div className="flex flex-col flex-1 min-h-0 space-y-2">
                        <div className="flex items-center justify-between shrink-0">
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            <Cable className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                            {selectedSubstation.tier === 'bulk' ? 'Outgoing Bulk Trunks & Lines' : 'Outgoing Distribution Feeders'}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isLight ? 'text-amber-800 bg-amber-100' : 'text-amber-300 bg-amber-500/20'
                          }`}>
                            {filteredFeeders.length} of {selectedSubstation.feeders.length}
                          </span>
                        </div>

                        {/* Quick Category Filter Tabs */}
                        {lifelineFeedersCount > 0 && (
                          <div className={`flex items-center gap-1 p-1 rounded-xl border text-[11px] shrink-0 ${
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
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
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
                              <span className="text-[11px] truncate">
                                Plotted on map: <strong className="font-semibold">{selectedFeeder.name}</strong> ({selectedFeeder.transformers || 8} DTRs)
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedFeeder(null)}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors shrink-0 ${
                                isLight
                                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              Clear Map
                            </button>
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
                                        <span className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded shrink-0 ${
                                          isNonCut ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                                        }`}>
                                          ON MAP
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {f.outageCount && f.outageCount > 0 ? (
                                        <span
                                          className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold flex items-center gap-0.5 ${
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
                                      <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                                        f.voltage.includes('33')
                                          ? (isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-300')
                                          : (isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300')
                                      }`}>
                                        {f.voltage}
                                      </span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                                        isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                                      }`}>
                                        {f.config}
                                      </span>
                                    </div>
                                  </div>

                                  {badge && (
                                    <div className="flex items-center gap-1.5 my-1 flex-wrap">
                                      <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] border flex items-center gap-1 ${badge.badgeBg}`}>
                                        <span>{badge.icon}</span>
                                        <span>{badge.label}</span>
                                      </span>
                                      <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${badge.prioBg}`}>
                                        {badge.prioText}
                                      </span>
                                      {f.isDedicated && (
                                        <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                          • Dedicated HT
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className={`flex items-center justify-between text-[11px] font-mono ${
                                    isLight ? 'text-slate-600' : 'text-slate-400'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      {f.consumers > 0 ? (
                                        <span className={`font-semibold ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
                                          👥 {f.consumers.toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] opacity-75">{f.type}</span>
                                      )}
                                      {f.transformers > 0 && (
                                        <span className={isFeederActive ? (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') : ''}>
                                          • ⚡ {f.transformers} DTRs
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {f.lengthKm > 0 && (
                                        <span className="text-[10px] opacity-70">{f.lengthKm} km</span>
                                      )}
                                      <span className={`text-[10px] underline ${
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

                    {/* Tab 2: Connections Content (Takes Full Height) */}
                    {inspectorTab === 'connections' && (
                      <div className="flex flex-col flex-1 min-h-0 space-y-3">
                        {/* 2-Step Flow: Show Connections Switch & Circuit Isolation */}
                        <div className={`p-3 rounded-xl border shrink-0 transition-all ${
                          showConnections
                            ? (isLight ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20' : 'bg-cyan-950/40 border-cyan-500/50 ring-2 ring-cyan-500/20')
                            : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80')
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${
                                showConnections
                                  ? (isLight ? 'bg-sky-600 text-white shadow-sm' : 'bg-cyan-500 text-slate-950 shadow-sm')
                                  : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')
                              }`}>
                                <GitFork className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    Isolate Electrical Circuit
                                  </span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                    electricalNodes.length > 0
                                      ? (isLight ? 'bg-sky-100 text-sky-800' : 'bg-cyan-500/20 text-cyan-300')
                                      : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')
                                  }`}>
                                    {electricalNodes.length} {electricalNodes.length === 1 ? 'electrical link' : 'electrical links'}
                                  </span>
                                </div>
                                <p className={`text-[10px] leading-tight mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {showConnections
                                    ? 'Circuit isolated • Unrelated markers hidden • Power flow animated'
                                    : 'Isolate circuit & hide unrelated markers on map'}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={showConnections}
                              onClick={() => setShowConnections(!showConnections)}
                              disabled={electricalNodes.length === 0}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                electricalNodes.length === 0
                                  ? 'opacity-40 cursor-not-allowed bg-slate-300'
                                  : showConnections
                                  ? (isLight ? 'bg-sky-600' : 'bg-cyan-500')
                                  : (isLight ? 'bg-slate-300' : 'bg-slate-700')
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  showConnections ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Connected Nodes Directory */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                          <div className="flex items-center justify-between px-1 mb-1">
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              Linked Substations & Trunks ({electricalNodes.length})
                            </span>
                            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                              Click node to navigate
                            </span>
                          </div>

                          {electricalNodes.length > 0 ? (
                            electricalNodes.map(node => (
                              <button
                                key={node.id}
                                onClick={() => {
                                  if (node.substation) {
                                    onSelectSubstation(node.substation);
                                    onSelectSection(null);
                                  }
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                                  isLight
                                    ? 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 hover:border-sky-300 text-slate-800 shadow-sm'
                                    : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 hover:border-cyan-500/40 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/20"
                                    style={{ backgroundColor: node.color }}
                                  />
                                  <div className="truncate">
                                    <span className="font-semibold block truncate leading-tight">{node.name}</span>
                                    <span className={`text-[10px] flex items-center gap-1.5 mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                      <span>{node.label}</span>
                                      {node.voltage && <span className="font-mono font-bold">• {node.voltage}</span>}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                                  <span className={`px-1.5 py-0.5 rounded font-bold ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                                    {node.distanceKm} km
                                  </span>
                                  <ArrowRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className={`p-4 text-center rounded-xl border text-xs ${
                              isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                            }`}>
                              No direct electrical interconnections recorded for this node.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Substation Info & Field AE Depot */}
                    {inspectorTab === 'info' && (
                      <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                        {/* Circle & Region Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs shrink-0">
                          <div className={`p-2.5 rounded-xl border ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                          }`}>
                            <span className={`text-[9px] uppercase tracking-wider font-semibold block mb-0.5 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}>Circle</span>
                            <span className={`font-semibold text-xs truncate block ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                              {selectedSubstation.circle || 'Chennai EDC'}
                            </span>
                          </div>
                          <div className={`p-2.5 rounded-xl border ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                          }`}>
                            <span className={`text-[9px] uppercase tracking-wider font-semibold block mb-0.5 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}>Region Code</span>
                            <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                              {selectedSubstation.regionCode || '01/09'}
                            </span>
                          </div>
                          <div className={`p-2.5 rounded-xl border col-span-2 flex items-center justify-between ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                          }`}>
                            <div>
                              <span className={`text-[9px] uppercase tracking-wider font-semibold block mb-0.5 ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}>GPS Coordinates</span>
                              <span className={`font-mono font-medium text-xs ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
                                {selectedSubstation.lat.toFixed(5)}° N, {selectedSubstation.lng.toFixed(5)}° E
                              </span>
                            </div>
                            <MapPin className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                          </div>
                        </div>

                        {/* Substation Terrain & Flood Risk Profile */}
                        {selectedSubstation.elevationM !== undefined && (
                          <div className={`p-3 rounded-xl border space-y-2 shrink-0 ${
                            selectedSubstation.riskCategory === 'CRITICAL_SURGE_RISK'
                              ? (isLight ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-rose-950/25 border-rose-800/60 text-rose-200')
                              : selectedSubstation.riskCategory === 'HIGH_WATERLOGGING_RISK'
                              ? (isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/25 border-amber-800/60 text-amber-200')
                              : (isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800/80 text-slate-200')
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs flex items-center gap-1.5">
                                <span>🌊</span>
                                <span>Terrain & Climate Flood Risk</span>
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
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

                            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[11px]">
                              <div className={`p-2 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                                <span className="text-[9px] opacity-75 block mb-0.5">Elevation (MSL)</span>
                                <strong className="text-xs font-bold">{selectedSubstation.elevationM} m</strong>
                              </div>
                              <div className={`p-2 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                                <span className="text-[9px] opacity-75 block mb-0.5">Distance to Sea</span>
                                <strong className="text-xs font-bold">{selectedSubstation.distanceToCoastKm || 0} km</strong>
                              </div>
                              <div className={`p-2 rounded-lg ${isLight ? 'bg-white/80 border border-black/5' : 'bg-black/30 border border-white/5'}`}>
                                <span className="text-[9px] opacity-75 block mb-0.5">Composite Risk</span>
                                <strong className="text-xs font-bold">{selectedSubstation.compositeRiskScore || 0}/100</strong>
                              </div>
                            </div>

                            {selectedSubstation.anticipatorySop && (
                              <div className={`p-2 rounded-lg text-[10px] leading-relaxed mt-1 ${
                                isLight ? 'bg-white/90 text-slate-700 border border-black/5' : 'bg-slate-900/80 text-slate-300 border border-white/10'
                              }`}>
                                <strong className="font-semibold block mb-0.5">⚡ Anticipatory Field SOP:</strong>
                                {selectedSubstation.anticipatorySop}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Jurisdictional Assistant Engineer (AE) Section Office */}
                        {jurisdictionalSections.length > 0 && (
                          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 shrink-0 ${
                            isLight ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                          }`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-2 rounded-lg shrink-0 ${
                                isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                <Shield className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs truncate">
                                    {jurisdictionalSections[0].name}
                                  </span>
                                  <span className={`text-[9px] font-mono px-1 rounded ${
                                    isLight ? 'bg-emerald-200/70 text-emerald-900' : 'bg-emerald-900/50 text-emerald-300'
                                  }`}>
                                    AE Depot
                                  </span>
                                </div>
                                <span className={`text-[10px] block truncate ${isLight ? 'text-emerald-700' : 'text-emerald-400/80'}`}>
                                  Field Maintenance & Fuse Call • {jurisdictionalSections[0].distanceKm} km
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
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0 flex items-center gap-1 transition-all ${
                                  isLight
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                }`}
                                title="Locate Section Office on Map"
                              >
                                Locate
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Operational Dispatch Guide */}
                        <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        }`}>
                          <span className={`font-semibold block text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            ⚡ Grid Dispatch Note:
                          </span>
                          <p className="text-[11px] leading-relaxed">
                            {selectedSubstation.tier === 'bulk'
                              ? 'Extra High Voltage (EHV) substation feeding sub-transmission loops. Monitored 24x7 by State Load Despatch Centre (SLDC).'
                              : selectedSubstation.tier === 'subtransmission'
                              ? 'Sub-transmission hub stepping down 110kV/33kV power for secondary distribution yards across Chennai city divisions.'
                              : 'Distribution substation stepping down to 11kV. Operates local feeder circuit breakers under jurisdictional Assistant Engineer (AE) control.'}
                          </p>
                        </div>
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
                        <span className={`text-[10px] block ${isLight ? 'text-amber-800/80' : 'text-amber-400/80'}`}>
                          Official O&M Field & Fuse-Call Beat
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
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
                    <span className={`text-[10px] uppercase tracking-wider font-semibold block mb-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>Division</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {selectedSection.division || 'Chennai Central'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                  }`}>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold block mb-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>Subdivision</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {selectedSection.subdivision || 'O&M'}
                    </span>
                  </div>
                </div>

                <div className={`space-y-2.5 p-3 rounded-xl border ${
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
                      <span className="text-[11px] leading-relaxed">{selectedSection.address}</span>
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
