import React, { useEffect, useRef, useState, useMemo } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { TnebSubstation, TnebSection, FeederDetail } from '../../types/tneb';
import { getFeederGeometry, getFeederTransformers } from '../../services/feederGeometryService';
import { Shield } from 'lucide-react';
import { DisasterCockpitBar, type DisasterScenario, type CrisisTriageFilter } from './DisasterCockpitBar';
import { MapSearchBox } from './MapSearchBox';
import { MapLayerControls } from './MapLayerControls';
import { TriageSubstationRosterCard } from './TriageSubstationRosterCard';
import { SubstationInspectorDrawer } from './SubstationInspectorDrawer';
import { getLiveChennaiOutages, getGoldRegistry, getOutagesForSubstation, enrichLiveOutagesWithGrid, type LiveOutage } from '../../services/liveOutageService';
import type { LiveWeatherConditions } from '../../services/liveWeatherService';
import {
  NO_POI_DARK_STYLE,
  NO_POI_LIGHT_STYLE,
  HOSPITALS_ONLY_DARK_STYLE,
  HOSPITALS_ONLY_LIGHT_STYLE,
  CHENNAI_METRO_BOUNDS
} from './mapStyles';
import {
  getNodeColor,
  getFeederThemeColors,
  getDtrMarkerIcon,
  getRmuMarkerIcon,
  classifyDtrPoint,
  getFeederLifelineBadge,
  getSubstationMarkerIcon,
  getSectionMarkerIcon
} from './mapIcons';
import {
  type FeederDisasterStatus,
  getFeederDisasterStatus
} from './disasterUtils';
import { isSubstationAtRisk, isSubstationWaterloggingRisk } from '../../services/gridHealthService';
import { fetchScenarioData, type ScenarioData, type ScenarioId } from '../../services/scenarioService';
import { getDirectiveForTimestep } from '../../services/geminiSopService';
import { GeminiSopDialog } from './GeminiSopDialog';

export type { DisasterScenario, FeederDisasterStatus };
export { getFeederDisasterStatus, CHENNAI_METRO_BOUNDS };

interface TnebGridMapProps {
  theme: 'light' | 'dark';
  substations: TnebSubstation[];
  sections: TnebSection[];
  selectedSubstation: TnebSubstation | null;
  selectedSection: TnebSection | null;
  onSelectSubstation: (ss: TnebSubstation | null) => void;
  onSelectSection: (sec: TnebSection | null) => void;
  liveWeather?: LiveWeatherConditions | null;
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

let isGoogleMapsLoaderConfigured = false;

export const TnebGridMap: React.FC<TnebGridMapProps> = ({
  theme,
  substations,
  sections,
  selectedSubstation,
  selectedSection,
  onSelectSubstation,
  onSelectSection,
  liveWeather
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
  const [showConnections, setShowConnections] = useState(false);
  const [selectedFeeder, setSelectedFeeder] = useState<FeederDetail | null>(null);
  const [isLayersExpanded, setIsLayersExpanded] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const [disasterScenario, setDisasterScenario] = useState<DisasterScenario>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('scenario');
      if (q === 'MICHAUNG_CAT3' || q === 'FLOODS_2015') return q;
    }
    return 'NORMAL';
  });
  const [crisisTriageFilter, setCrisisTriageFilter] = useState<CrisisTriageFilter>('all');
  const [showLayersDuringTriage, setShowLayersDuringTriage] = useState(false);
  const [liveOutages, setLiveOutages] = useState<LiveOutage[]>([]);

  // Disaster Simulation & Timeline State
  const [simulationHour, setSimulationHour] = useState<number>(-24);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [isGeminiSopOpen, setIsGeminiSopOpen] = useState<boolean>(false);
  const seenMilestonesRef = useRef<Set<number>>(new Set());

  // Scenario Loader
  useEffect(() => {
    if (disasterScenario === 'MICHAUNG_CAT3') {
      fetchScenarioData('MICHAUNG_CAT3').then(data => {
        setScenarioData(data);
        setSimulationHour(-24);
        seenMilestonesRef.current.clear();
      });
    } else if (disasterScenario === 'FLOODS_2015') {
      fetchScenarioData('FLOODS_2015').then(data => {
        setScenarioData(data);
        setSimulationHour(-48);
        seenMilestonesRef.current.clear();
      });
    } else {
      setScenarioData(null);
      setIsPlaying(false);
      setIsGeminiSopOpen(false);
    }
  }, [disasterScenario]);

  // Scenario Playback Loop (Auto-advances through timesteps when playing)
  useEffect(() => {
    if (!isPlaying || !scenarioData || scenarioData.timesteps.length === 0) return;

    const interval = setInterval(() => {
      setSimulationHour(current => {
        const hours = scenarioData.timesteps.map(t => t.timestep_hour);
        const currentIndex = hours.indexOf(current);
        if (currentIndex === -1 || currentIndex >= hours.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return hours[currentIndex + 1];
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [isPlaying, scenarioData]);

  // Autonomous Gemini Directive Pop-up at crucial milestone hours
  useEffect(() => {
    if (disasterScenario !== 'MICHAUNG_CAT3' && disasterScenario !== 'FLOODS_2015') return;
    
    const milestoneHours = disasterScenario === 'MICHAUNG_CAT3' ? [-24, 0, 12] : [-48, 0, 12];
    if (milestoneHours.includes(simulationHour) && !seenMilestonesRef.current.has(simulationHour)) {
      seenMilestonesRef.current.add(simulationHour);
      setIsGeminiSopOpen(true);
      setIsPlaying(false); // Proactively pause so the user can inspect the directive checklist
    }
  }, [simulationHour, disasterScenario]);

  const currentTimestep = useMemo(() => {
    if (!scenarioData || disasterScenario === 'NORMAL' || disasterScenario === 'LIVE') return null;
    return scenarioData.timesteps.find(t => t.timestep_hour === simulationHour) || scenarioData.timesteps[0] || null;
  }, [scenarioData, simulationHour, disasterScenario]);

  const activeDirective = useMemo(() => {
    if (!currentTimestep || (disasterScenario !== 'MICHAUNG_CAT3' && disasterScenario !== 'FLOODS_2015')) return null;
    return getDirectiveForTimestep(disasterScenario as ScenarioId, currentTimestep);
  }, [currentTimestep, disasterScenario]);

  const availableHours = useMemo(() => {
    if (!scenarioData) return [-48, -24, -12, 0, 6, 12];
    return scenarioData.timesteps.map(t => t.timestep_hour);
  }, [scenarioData]);

  // Left control panel (Search + Layers + Triage) width state & persistence (default 360px, min 280px, max 580px / 45vw)
  const DEFAULT_LEFT_PANEL_WIDTH = 360;
  const MIN_LEFT_PANEL_WIDTH = 280;
  const MAX_LEFT_PANEL_WIDTH = 580;

  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_LEFT_PANEL_WIDTH;
    try {
      const saved = localStorage.getItem('sg_left_panel_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_LEFT_PANEL_WIDTH && parsed <= MAX_LEFT_PANEL_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_LEFT_PANEL_WIDTH;
  });

  const [isResizingLeftPanel, setIsResizingLeftPanel] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLeftPanelResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeftPanel(true);
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Anchored to the left side, so moving right increases width
      const deltaX = moveEvent.clientX - startX;
      const maxAllowed = Math.min(MAX_LEFT_PANEL_WIDTH, Math.round(window.innerWidth * 0.45));
      const nextWidth = Math.max(MIN_LEFT_PANEL_WIDTH, Math.min(maxAllowed, startWidth + deltaX));
      setLeftPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingLeftPanel(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setLeftPanelWidth((current) => {
        try {
          localStorage.setItem('sg_left_panel_width', String(current));
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

  const handleResetLeftPanelWidth = () => {
    setLeftPanelWidth(DEFAULT_LEFT_PANEL_WIDTH);
    try {
      localStorage.setItem('sg_left_panel_width', String(DEFAULT_LEFT_PANEL_WIDTH));
    } catch {
      // ignore
    }
  };

  const toggleLeftPanelPreset = () => {
    const targetWidth = leftPanelWidth > 400 ? DEFAULT_LEFT_PANEL_WIDTH : 480;
    setLeftPanelWidth(targetWidth);
    try {
      localStorage.setItem('sg_left_panel_width', String(targetWidth));
    } catch {
      // ignore
    }
  };

  // Reset showLayersDuringTriage when triage filter changes
  useEffect(() => {
    setShowLayersDuringTriage(false);
  }, [crisisTriageFilter]);

  // Fetch real-time live outages from outage.nammamap.in on load and enrich with grid topology and Gold Standard Registry
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getLiveChennaiOutages(),
      getGoldRegistry()
    ]).then(([res, gold]) => {
      if (isMounted && res.data) {
        const enriched = enrichLiveOutagesWithGrid(res.data, substations, sections, gold);
        setLiveOutages(enriched);
      }
    });
    return () => { isMounted = false; };
  }, [substations, sections]);

  const poorStabilityCount = useMemo(() => {
    return substations.filter(s => isSubstationAtRisk(s, liveOutages)).length;
  }, [substations, liveOutages]);

  const waterloggingRiskCount = useMemo(() => {
    return substations.filter(s => isSubstationWaterloggingRisk(s)).length;
  }, [substations]);

  const substationsWithOutages = useMemo(() => {
    if (liveOutages.length === 0) return new Set<string>();
    const set = new Set<string>();
    substations.forEach(s => {
      if (getOutagesForSubstation(s, liveOutages).length > 0) {
        set.add(s.code);
      }
    });
    return set;
  }, [substations, liveOutages]);

  // Reset showConnections and selectedFeeder when selected substation changes
  useEffect(() => {
    setShowConnections(false);
    setSelectedFeeder(null);
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
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '';

  const isHospitalLifelineActive = Boolean(
    selectedFeeder && selectedFeeder.lifelineCategory === 'hospital'
  );

  const activeMapStyle = useMemo(() => {
    if (isSatellite) return [];
    if (isHospitalLifelineActive) {
      return theme === 'light' ? HOSPITALS_ONLY_LIGHT_STYLE : HOSPITALS_ONLY_DARK_STYLE;
    }
    return theme === 'light' ? NO_POI_LIGHT_STYLE : NO_POI_DARK_STYLE;
  }, [isSatellite, theme, isHospitalLifelineActive]);

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
          ...(mapId ? { mapId } : { styles: activeMapStyle }),
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

      const matchesTriage = crisisTriageFilter === 'all'
        ? true
        : crisisTriageFilter === 'poor_stability'
        ? isSubstationAtRisk(ss, liveOutages)
        : crisisTriageFilter === 'waterlogging_risk'
        ? isSubstationWaterloggingRisk(ss)
        : substationsWithOutages.has(ss.code);

      const isVisible = crisisTriageFilter !== 'all'
        ? matchesTriage
        : (isolatedNodeIds
          ? isolatedNodeIds.has(ss.code)
          : ((ss.tier === 'bulk' && showBulk) ||
             (ss.tier === 'subtransmission' && showSubTrans) ||
             (ss.tier === 'distribution' && showDistribution)));

      if (isVisible) {
        if (marker.getMap() !== map) marker.setMap(map);
      } else {
        if (marker.getMap() !== null) marker.setMap(null);
      }
    });
  }, [showBulk, showSubTrans, showDistribution, isolatedNodeIds, crisisTriageFilter, substationsWithOutages, mapLoaded, substations, liveOutages]);

  // Auto-fit camera when triage filter is selected
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || crisisTriageFilter === 'all') return;
    const b = new google.maps.LatLngBounds();
    substations.forEach(s => {
      const match = crisisTriageFilter === 'poor_stability'
        ? isSubstationAtRisk(s, liveOutages)
        : crisisTriageFilter === 'waterlogging_risk'
        ? isSubstationWaterloggingRisk(s)
        : substationsWithOutages.has(s.code);
      if (match && typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)) {
        b.extend({ lat: s.lat, lng: s.lng });
      }
    });
    if (!b.isEmpty()) {
      mapRef.current.fitBounds(b, { top: 90, right: 460, bottom: 90, left: 90 });
    }
  }, [crisisTriageFilter, mapLoaded, substations, liveOutages, substationsWithOutages]);

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

    // 1. Fetch real surveyed MultiLineString street routes on-demand (Fast Substation Shard)
    getFeederGeometry(selectedSubstation.circleCode, selectedFeeder.code, selectedSubstation.code).then(geo => {
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

      // 2. Fetch real surveyed Distribution Transformers (DTs) on-demand (Fast Substation Shard)
      getFeederTransformers(selectedSubstation.circleCode, selectedFeeder.code, selectedSubstation.code).then(dtrs => {
        if (!isMounted || !mapRef.current) return;

        if (!dtrInfoWindowRef.current) {
          dtrInfoWindowRef.current = new google.maps.InfoWindow();
        }

        const lifelineBadge = getFeederLifelineBadge(selectedFeeder, isLight);

        interface ClassifiedMarker {
          marker: google.maps.Marker;
          minZoom: number;
        }
        const classifiedMarkers: ClassifiedMarker[] = [];

        if (dtrs && dtrs.length > 0) {
          // Build RMU index from physical data: DTRs with dual HT incomer (htFeeders >= 2)
          // are genuine loop-switchable Ring Main Units. "RMU" in GIS names is just a naming convention.
          const rmuIndices = new Set<number>();
          dtrs.forEach((d, idx) => {
            if (d.htFeeders != null && d.htFeeders >= 2) {
              rmuIndices.add(idx);
            }
          });

          dtrs.forEach((dtr, dtrIdx) => {
            if (typeof dtr.lat !== 'number' || typeof dtr.lng !== 'number' || isNaN(dtr.lat) || isNaN(dtr.lng)) return;
            bounds.extend({ lat: dtr.lat, lng: dtr.lng });

            const classification = classifyDtrPoint(dtr, selectedFeeder.lifelineCategory);
            const isRmu = rmuIndices.has(dtrIdx) || classification.isRmu;
            const isLifeline = !isRmu && classification.isLifeline;

            const icon = isRmu
              ? getRmuMarkerIcon(isLight)
              : getDtrMarkerIcon(isLight, selectedFeeder.lifelineCategory, false);

            const zIndex = isRmu ? 70 : isLifeline ? 60 : 55;
            // RMUs visible earlier at Zoom >= 11.5; Lifeline DTRs at >= 13.0; standard DTRs at >= 13.8
            const minZoom = isRmu ? 11.5 : isLifeline ? 13.0 : 13.8;

            const marker = new google.maps.Marker({
              position: { lat: dtr.lat, lng: dtr.lng },
              icon,
              zIndex,
              title: `${isRmu ? '🔄 [RMU Sectionalizer]' : isLifeline ? '🏥 [Lifeline]' : '⚡'} ${dtr.name} (${selectedFeeder.name} Feeder)`,
              map: null
            });

            marker.addListener('click', () => {
              const headerEl = document.createElement('div');
              headerEl.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:6px;padding-right:24px;max-width:280px;font-family:system-ui,-apple-system,sans-serif;';
              
              const titleSpan = document.createElement('span');
              titleSpan.style.cssText = `font-weight:700;font-size:12px;color:${isRmu ? (isLight ? '#0284c7' : '#00e5ff') : isNonCut ? '#e11d48' : '#b45309'};word-break:break-word;line-height:1.3;`;
              titleSpan.textContent = isRmu ? `🔄 ${dtr.name}` : `⚡ ${dtr.name}`;
              
              const badgeSpan = document.createElement('span');
              badgeSpan.style.cssText = `font-size:10px;font-family:monospace;padding:1px 5px;border-radius:4px;font-weight:700;flex-shrink:0;${
                isRmu
                  ? 'background:#e0f2fe;color:#0369a1;'
                  : 'background:#fef3c7;color:#92400e;'
              }`;
              badgeSpan.textContent = isRmu ? 'RMU SWITCH' : (dtr.kva ? `${dtr.kva} kVA` : 'DTR');
              
              headerEl.appendChild(titleSpan);
              headerEl.appendChild(badgeSpan);

              if (typeof dtrInfoWindowRef.current?.setHeaderContent === 'function') {
                dtrInfoWindowRef.current.setHeaderContent(headerEl);
              }

              dtrInfoWindowRef.current?.setContent(`
                <div style="font-family: system-ui, -apple-system, sans-serif; padding: 0; color: #0f172a; max-width: 250px; line-height: 1.35;">
                  ${isRmu ? `
                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 10px; font-weight: 700; padding: 3px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
                      <span>🔄</span>
                      <span>Ring Main Unit (RMU)</span>
                      <span style="margin-left: auto; font-family: monospace; font-size: 9px; opacity: 0.9;">SECTIONALIZER</span>
                    </div>
                    <div style="font-size: 10.5px; color: #0369a1; background: #f0f9ff; border: 1px solid #e0f2fe; padding: 4px 6px; border-radius: 6px; margin-bottom: 6px;">
                      ⚡ <strong>Loop Switching Node:</strong> Enables rapid fault isolation and back-feeding from adjacent feeders without trenching.
                    </div>
                  ` : lifelineBadge ? `
                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 5px; font-size: 10px; font-weight: 700; padding: 3px 6px; border-radius: 4px; background: ${selectedFeeder.lifelineCategory === 'hospital' ? '#ffe4e6; color: #9f1239' : selectedFeeder.lifelineCategory === 'water' ? '#e0f2fe; color: #0369a1' : selectedFeeder.lifelineCategory === 'transit' ? '#f3e8ff; color: #6b21a8' : '#fef3c7; color: #92400e'};">
                      <span>${lifelineBadge.icon}</span>
                      <span>${lifelineBadge.label}</span>
                      <span style="margin-left: auto; font-family: monospace; font-size: 9px; opacity: 0.9;">${lifelineBadge.prioText}</span>
                    </div>
                  ` : ''}
                  ${dtr.poles === 0 ? `
                    <div style="font-size: 10px; font-weight: 700; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: 2.5px 6px; border-radius: 4px; margin-bottom: 4px;">
                      ⚠️ Ground Plinth Mount • Inundation / Dewatering Risk
                    </div>
                  ` : (dtr.poles !== undefined && dtr.poles !== null && dtr.poles >= 1) ? `
                    <div style="font-size: 10px; font-weight: 600; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">
                      🛡️ Elevated Pole Structure (${dtr.poles}-Pole) • Storm Water Resilient
                    </div>
                  ` : ''}

                  ${(dtr.htFeeders || 0) >= 2 ? `
                    <div style="font-size: 10px; font-weight: 600; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">
                      🔄 Dual HT Incomer (${dtr.htFeeders} Feeders) • Loop Switchable
                    </div>
                  ` : ''}

                  <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                    <strong>Asset Code:</strong> ${dtr.id}<br>
                    <strong>Rating:</strong> ${dtr.kva ? `${dtr.kva} kVA` : 'Standard 11kV'} (11kV → 415V/240V)
                    ${dtr.make ? `<br><strong>Make:</strong> ${dtr.make}` : ''}
                    ${dtr.ltFeeders ? `<br><strong>Outgoing:</strong> ${dtr.ltFeeders} LT Circuits` : ''}
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
            classifiedMarkers.push({ marker, minZoom });
          });

          // Tiered Zoom-Gated Level of Detail (LOD)
          const syncDtrLod = () => {
            if (!mapRef.current) return;
            const currentZoom = mapRef.current.getZoom() || 11.5;
            classifiedMarkers.forEach(({ marker, minZoom }) => {
              if (currentZoom >= minZoom) {
                if (marker.getMap() !== mapRef.current) marker.setMap(mapRef.current);
              } else {
                if (marker.getMap() !== null) marker.setMap(null);
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

  // Pre-indexed search tokens for O(1) / fast early-break lookups
  const searchIndex = useMemo(() => {
    const ssIndex = substations.map(s => ({
      item: s,
      text: `${s.name} ${s.code} ${s.circle}`.toLowerCase(),
    }));
    const secIndex = sections.map(s => ({
      item: s,
      text: `${s.name} ${s.division}`.toLowerCase(),
    }));
    return { ssIndex, secIndex };
  }, [substations, sections]);

  // Fast search with pre-indexed tokens and early-exit iteration
  const searchResults = useMemo<{ substations: TnebSubstation[]; sections: TnebSection[] }>(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return { substations: [], sections: [] };

    const matchedSS: TnebSubstation[] = [];
    for (let i = 0; i < searchIndex.ssIndex.length; i++) {
      if (searchIndex.ssIndex[i].text.includes(trimmed)) {
        matchedSS.push(searchIndex.ssIndex[i].item);
        if (matchedSS.length >= 5) break;
      }
    }

    const matchedSec: TnebSection[] = [];
    for (let i = 0; i < searchIndex.secIndex.length; i++) {
      if (searchIndex.secIndex[i].text.includes(trimmed)) {
        matchedSec.push(searchIndex.secIndex[i].item);
        if (matchedSec.length >= 5) break;
      }
    }

    return { substations: matchedSS, sections: matchedSec };
  }, [searchQuery, searchIndex]);

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
      <DisasterCockpitBar
        disasterScenario={disasterScenario}
        setDisasterScenario={setDisasterScenario}
        crisisTriageFilter={crisisTriageFilter}
        setCrisisTriageFilter={setCrisisTriageFilter}
        substationsCount={substations.length}
        poorStabilityCount={poorStabilityCount}
        waterloggingRiskCount={waterloggingRiskCount}
        liveOutagesCount={liveOutages.length}
        isLight={isLight}
        liveWeather={liveWeather}
        simulationHour={simulationHour}
        setSimulationHour={setSimulationHour}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(p => !p)}
        currentTimestep={currentTimestep}
        activeDirective={activeDirective}
        onOpenGeminiSop={() => setIsGeminiSopOpen(prev => !prev)}
        availableHours={availableHours}
      />

      {/* Autonomous Floating Gemini AI Statutory Directive Dialog */}
      <GeminiSopDialog
        directive={activeDirective}
        isOpen={isGeminiSopOpen}
        onClose={() => setIsGeminiSopOpen(false)}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(p => !p)}
        isLight={isLight}
        onSelectSubstation={(name) => {
          const match = substations.find(s => 
            s.name.toUpperCase().includes(name.toUpperCase()) || 
            name.toUpperCase().includes(s.name.toUpperCase())
          );
          if (match) onSelectSubstation(match);
        }}
      />

      {/* Top Left Floating Search & Quick Filters */}
      <div
        className={`absolute top-[5.25rem] md:top-4 left-2 md:left-4 z-20 flex flex-col gap-2 w-[calc(100vw-1rem)] ${
          isResizingLeftPanel ? 'transition-none select-none' : 'transition-[width] duration-200'
        } pointer-events-none`}
        style={{
          width: isDesktop ? `${leftPanelWidth}px` : undefined,
          maxWidth: isDesktop ? 'min(580px, calc(100vw - 32px))' : 'calc(100vw - 1rem)'
        }}
      >
        <MapSearchBox
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSelectSubstation={onSelectSubstation}
          onSelectSection={onSelectSection}
          isLight={isLight}
          onResizeStart={handleLeftPanelResizeStart}
          onResetWidth={handleResetLeftPanelWidth}
          isResizing={isResizingLeftPanel}
        />

        {crisisTriageFilter !== 'all' && !showLayersDuringTriage ? (
          <TriageSubstationRosterCard
            crisisTriageFilter={crisisTriageFilter}
            setCrisisTriageFilter={setCrisisTriageFilter}
            substations={substations}
            selectedSubstation={selectedSubstation}
            onSelectSubstation={onSelectSubstation}
            onFlyToSubstation={(s) => {
              if (mapRef.current) {
                mapRef.current.panTo({ lat: s.lat, lng: s.lng });
                mapRef.current.setZoom(14.5);
              }
            }}
            liveOutages={liveOutages}
            substationsWithOutages={substationsWithOutages}
            isLight={isLight}
            onShowLayers={() => setShowLayersDuringTriage(true)}
            panelWidth={leftPanelWidth}
            onResizeStart={handleLeftPanelResizeStart}
            onResetWidth={handleResetLeftPanelWidth}
            onTogglePreset={toggleLeftPanelPreset}
            isResizing={isResizingLeftPanel}
          />
        ) : (
          <>
            {crisisTriageFilter !== 'all' && showLayersDuringTriage && (
              <button
                type="button"
                onClick={() => setShowLayersDuringTriage(false)}
                className={`pointer-events-auto px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
                  isLight 
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-400' 
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300'
                }`}
              >
                <span>← Return to Triage List ({
                  crisisTriageFilter === 'poor_stability' ? poorStabilityCount :
                  crisisTriageFilter === 'waterlogging_risk' ? waterloggingRiskCount :
                  substationsWithOutages.size
                } SS)</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/20">View List</span>
              </button>
            )}

            <MapLayerControls
              isLayersExpanded={isLayersExpanded}
              setIsLayersExpanded={setIsLayersExpanded}
              isSatellite={isSatellite}
              setIsSatellite={setIsSatellite}
              showBulk={showBulk}
              setShowBulk={setShowBulk}
              showSubTrans={showSubTrans}
              setShowSubTrans={setShowSubTrans}
              showDistribution={showDistribution}
              setShowDistribution={setShowDistribution}
              showSections={showSections}
              setShowSections={setShowSections}
              isHospitalLifelineActive={isHospitalLifelineActive}
              substations={substations}
              sections={sections}
              isLight={isLight}
              panelWidth={leftPanelWidth}
              onResizeStart={handleLeftPanelResizeStart}
              onResetWidth={handleResetLeftPanelWidth}
              onTogglePreset={toggleLeftPanelPreset}
              isResizing={isResizingLeftPanel}
            />
          </>
        )}
      </div>

      {/* Full-Height Substation / Section Inspector Drawer */}
      <SubstationInspectorDrawer
        selectedSubstation={selectedSubstation}
        selectedSection={selectedSection}
        onSelectSubstation={onSelectSubstation}
        onSelectSection={onSelectSection}
        electricalNodes={electricalNodes}
        jurisdictionalSections={jurisdictionalSections}
        showConnections={showConnections}
        setShowConnections={setShowConnections}
        selectedFeeder={selectedFeeder}
        setSelectedFeeder={setSelectedFeeder}
        disasterScenario={disasterScenario}
        liveOutages={liveOutages}
        isLight={isLight}
      />
    </div>
  );
};
