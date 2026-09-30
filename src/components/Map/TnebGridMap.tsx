import React, { useEffect, useRef, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { TnebSubstation, TnebSection, FeederDetail } from '../../types/tneb';
import { getFeederGeometry, getFeederTransformers } from '../../services/feederGeometryService';
import { Shield } from 'lucide-react';
import { DisasterCockpitBar, type DisasterScenario, type CrisisTriageFilter } from './DisasterCockpitBar';
import { MapSearchBox } from './MapSearchBox';
import { MapLayerControls } from './MapLayerControls';
import { getLiveChennaiOutages, getGoldRegistry, getOutagesForSubstation, enrichLiveOutagesWithGrid, type LiveOutage, type GoldRegistry } from '../../services/liveOutageService';
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
  getSectionMarkerIcon,
  getReplayHaloIcon
} from './mapIcons';
import {
  type FeederDisasterStatus,
  getFeederDisasterStatus
} from './disasterUtils';
import { isSubstationAtRisk, isSubstationWaterloggingRisk } from '../../services/gridHealthService';
import { useOfficialFloodLoaded } from '../../services/officialFloodLayers';
import { useReliefCentres } from '../../services/reliefCentres';
import { useSewerageStations } from '../../services/sewerageStations';
import { useSectionBoundary } from '../../services/sectionBoundaries';
import {
  fetchScenarioData,
  isSimulationScenario,
  SCENARIO_MILESTONES,
  STEP_DWELL_MS,
  GLIDE_PLAY_MS,
  GLIDE_CLICK_MS,
  type ScenarioData,
  type ScenarioId
} from '../../services/scenarioService';
import { getDirectiveForTimestep, fetchLiveGeminiDirective, resolvePhase, type GeminiSopDirective, type StepSites } from '../../services/geminiSopService';
import type { TimelineStep } from './DisasterCockpitBar';
import {
  fetchScenarioGrid,
  cityWindFromDeg,
  type ScenarioGrid
} from '../../services/scenarioGrid';
import { rainFill, type HazardYears } from './rainScale';
import { TRACK_GRADE_NAMES, distanceToChennaiKm, istLabel } from '../../data/imdBulletins';
import { GRADE_COLOR, stormAt, useBestTrack } from '../../services/bestTrack';
import { computeExposure } from '../../services/simulationExposure';
import { useGccPlan, wardFacts, DEPTH_TEXT } from '../../services/gccPlan';
import { fetchGaugePoints, gaugeWindowFor, type GaugePoints } from '../../services/gaugePoints';

// Official flood maps (fixed layers), fetched when first switched on.
const floodMapCache = new Map<string, Promise<object | null>>();
function loadFloodMap(file: string): Promise<object | null> {
  let p = floodMapCache.get(file);
  if (!p) {
    p = fetch(`/data/flood_maps/${file}`)
      .then(r => (r.ok ? (r.json() as Promise<object>) : null))
      .catch(() => null);
    floodMapCache.set(file, p);
  }
  return p;
}
const HAZARD_COLOURS: Record<string, string> = { LOW: '#facc15', MODERATE: '#f97316', HIGH: '#dc2626' };

// Heavy panels load on demand so the map can appear first. They are pre-loaded when the browser is idle.
const LazyDrawer = lazy(() => import('./SubstationInspectorDrawer').then(m => ({ default: m.SubstationInspectorDrawer })));
const LazySopDialog = lazy(() => import('./GeminiSopDialog').then(m => ({ default: m.GeminiSopDialog })));
const LazyRoster = lazy(() => import('./TriageSubstationRosterCard').then(m => ({ default: m.TriageSubstationRosterCard })));
const LazySimulationMapPanel = lazy(() => import('./SimulationMapPanel').then(m => ({ default: m.SimulationMapPanel })));
const LazyExposedSubstationsCard = lazy(() => import('./ExposedSubstationsCard').then(m => ({ default: m.ExposedSubstationsCard })));

const SubstationInspectorDrawer = (props: React.ComponentProps<typeof LazyDrawer>) => (
  <Suspense fallback={null}>
    <LazyDrawer {...props} />
  </Suspense>
);
const GeminiSopDialog = (props: React.ComponentProps<typeof LazySopDialog>) => (
  <Suspense fallback={null}>
    <LazySopDialog {...props} />
  </Suspense>
);
const TriageSubstationRosterCard = (props: React.ComponentProps<typeof LazyRoster>) => (
  <Suspense fallback={null}>
    <LazyRoster {...props} />
  </Suspense>
);
const SimulationMapPanel = (props: React.ComponentProps<typeof LazySimulationMapPanel>) => (
  <Suspense fallback={null}>
    <LazySimulationMapPanel {...props} />
  </Suspense>
);
const ExposedSubstationsCard = (props: React.ComponentProps<typeof LazyExposedSubstationsCard>) => (
  <Suspense fallback={null}>
    <LazyExposedSubstationsCard {...props} />
  </Suspense>
);

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
  /** Told when the viewer switches between live mode and a hindcast, so the header can hide today's weather during a replay. */
  onScenarioChange?: (scenario: DisasterScenario) => void;
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  liveWeather,
  onScenarioChange
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
  const [showReliefCentres, setShowReliefCentres] = useState(false);
  const sectionBoundary = useSectionBoundary(selectedSection?.code);
  const reliefData = useReliefCentres();
  const reliefMarkersRef = useRef<google.maps.Marker[]>([]);
  const reliefInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [showSewerageStations, setShowSewerageStations] = useState(false);
  const sewerageData = useSewerageStations();
  const sewerageMarkersRef = useRef<google.maps.Marker[]>([]);
  const sewerageInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
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
      if (q && isSimulationScenario(q)) return q;
    }
    return 'NORMAL';
  });
  useEffect(() => {
    onScenarioChange?.(disasterScenario);
  }, [disasterScenario, onScenarioChange]);
  const [crisisTriageFilter, setCrisisTriageFilter] = useState<CrisisTriageFilter>('all');
  const [showLayersDuringTriage, setShowLayersDuringTriage] = useState(false);
  const [liveOutages, setLiveOutages] = useState<LiveOutage[]>([]);

  // Disaster Simulation & Timeline State
  const [simulationHour, setSimulationHour] = useState<number>(-24);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [scenarioGrid, setScenarioGrid] = useState<ScenarioGrid | null>(null);
  const [isGeminiSopOpen, setIsGeminiSopOpen] = useState<boolean>(false);
  // The owner's replay flow: at each step the map moves, then the AI Directive opens and playback waits for "Next step".
  const [directiveEachStep, setDirectiveEachStep] = useState(true);
  // Storm layers (only while a hindcast scenario is selected)
  // The 2015 flood extent is the map's water layer during a replay (fixed, not Michaung; see the storm panel).
  const [showFlood2015, setShowFlood2015] = useState(true);
  const [showHazard, setShowHazard] = useState(false);
  const [hazardYears, setHazardYears] = useState<HazardYears>(100);
  const [gaugePoints, setGaugePoints] = useState<GaugePoints | null>(null);
  const [showGauges, setShowGauges] = useState(true);
  const gaugeMarkersRef = useRef<google.maps.Marker[]>([]);
  const flood2015LayerRef = useRef<google.maps.Data | null>(null);
  const hazardLayerRef = useRef<google.maps.Data | null>(null);

  // Pre-load the drawer, directive dialog and roster in the background once the browser is idle.
  useEffect(() => {
    const preload = () => {
      import('./SubstationInspectorDrawer');
      import('./GeminiSopDialog');
      import('./TriageSubstationRosterCard');
    };
    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void, o: { timeout: number }) => void }).requestIdleCallback(preload, { timeout: 4000 });
    } else {
      setTimeout(preload, 2500);
    }
  }, []);

  // Scenario Loader
  useEffect(() => {
    if (isSimulationScenario(disasterScenario)) {
      const id = disasterScenario;
      fetchScenarioData(id).then(data => {
        setScenarioData(data);
        setSimulationHour(SCENARIO_MILESTONES[id][0].hour);
      });
      setIsLayersExpanded(false);
      setScenarioGrid(null);
      fetchScenarioGrid(id).then(setScenarioGrid);
      fetchGaugePoints().then(setGaugePoints);
    } else {
      setScenarioData(null);
      setScenarioGrid(null);
      setIsPlaying(false);
      setIsGeminiSopOpen(false);
    }
  }, [disasterScenario]);

  // Scenario Playback: stay on each of the five steps for STEP_DWELL_MS, then move on; stop after the last one.
  useEffect(() => {
    if (!isPlaying || !isSimulationScenario(disasterScenario)) return;
    const stepHours = SCENARIO_MILESTONES[disasterScenario].map(m => m.hour);

    const timer = setTimeout(() => {
      const idx = stepHours.indexOf(simulationHour);
      if (idx >= 0 && idx < stepHours.length - 1) {
        setSimulationHour(stepHours[idx + 1]);
      } else {
        setIsPlaying(false);
      }
    }, STEP_DWELL_MS + GLIDE_PLAY_MS);

    return () => clearTimeout(timer);
  }, [isPlaying, simulationHour, disasterScenario]);

  // Play from the first step when the last step was reached (or the hour is not one of the steps). With the directive shown at
  // each step, Play on a step opens that step's directive; "Next step" in the directive moves on.
  const togglePlay = () => {
    if (!isPlaying && isSimulationScenario(disasterScenario)) {
      const stepHours = SCENARIO_MILESTONES[disasterScenario].map(m => m.hour);
      const idx = stepHours.indexOf(simulationHour);
      if (idx === -1 || idx === stepHours.length - 1) setSimulationHour(stepHours[0]);
      else if (directiveEachStep) {
        setIsGeminiSopOpen(true);
        return;
      }
    }
    setIsPlaying(p => !p);
  };

  // "Next step" in the directive: close it and play the move to the next step (the directive opens again when the map settles).
  const nextStep = useMemo(() => {
    if (!isSimulationScenario(disasterScenario)) return null;
    const steps = SCENARIO_MILESTONES[disasterScenario];
    const idx = steps.findIndex(m => m.hour === simulationHour);
    return idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null;
  }, [disasterScenario, simulationHour]);
  const goToNextStep = () => {
    setIsGeminiSopOpen(false);
    if (!nextStep) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    setSimulationHour(nextStep.hour);
  };

  const currentTimestep = useMemo(() => {
    if (!scenarioData || disasterScenario === 'NORMAL' || disasterScenario === 'LIVE') return null;
    return scenarioData.timesteps.find(t => t.timestep_hour === simulationHour) || scenarioData.timesteps[0] || null;
  }, [scenarioData, simulationHour, disasterScenario]);

  const floodLayersLoaded = useOfficialFloodLoaded();

  // Substations to check at this step, by the same rule as the site briefing card (see simulationExposure.ts).
  const gccPlan = useGccPlan();
  const exposure = useMemo(
    () =>
      scenarioGrid && isSimulationScenario(disasterScenario) && substations.length > 0
        ? computeExposure(substations, scenarioGrid, currentTimestep, gaugePoints, gccPlan)
        : null,
    [scenarioGrid, disasterScenario, substations, currentTimestep, gaugePoints, gccPlan, floodLayersLoaded]
  );
  const [liveGeminiDirective, setLiveGeminiDirective] = useState<GeminiSopDirective | null>(null);

  // The directive's targets and counts are this step's sites to check (the same result as the map halos and the list).
  const stepSites = useMemo<StepSites | null>(
    () =>
      exposure
        ? {
            sites: exposure.exposed.map(e => ({ substation: e.substation, tier: e.tier, mm24: e.mm24 })),
            withFloodFact: exposure.floodFlaggedCount
          }
        : null,
    [exposure]
  );

  const baseDirective = useMemo(() => {
    if (!currentTimestep || !isSimulationScenario(disasterScenario)) return null;
    return getDirectiveForTimestep(disasterScenario as ScenarioId, currentTimestep, substations, stepSites);
  }, [currentTimestep, disasterScenario, substations, stepSites]);

  useEffect(() => {
    if (!currentTimestep || !isSimulationScenario(disasterScenario)) {
      setLiveGeminiDirective(null);
      return;
    }

    // No Gemini call before the grid has loaded, and wait briefly after the step changes so clicking through
    // the steps quickly does not fire a request per click. Playback asks for each step as it arrives.
    if (substations.length === 0 || !stepSites) return;

    let isSubscribed = true;
    const timer = setTimeout(() => {
      fetchLiveGeminiDirective(disasterScenario as ScenarioId, currentTimestep, substations, stepSites)
        .then((res) => {
          if (isSubscribed && res) {
            setLiveGeminiDirective(res);
          }
        })
        .catch((err) => {
          console.warn('Live Gemini SOP fetch ignored:', err);
        });
    }, 700);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [currentTimestep, disasterScenario, substations, stepSites]);

  // Use the Gemini-worded directive only if it belongs to the hour on screen.
  const matchingLiveDirective =
    liveGeminiDirective &&
    currentTimestep &&
    liveGeminiDirective.scenarioId === disasterScenario &&
    liveGeminiDirective.hour === currentTimestep.timestep_hour
      ? liveGeminiDirective
      : null;
  const activeDirective = matchingLiveDirective || baseDirective;

  // The five timeline steps, each with the phase our own rule gives that hour (not a hard-coded colour).
  const timelineSteps = useMemo<TimelineStep[]>(() => {
    if (!scenarioData || !isSimulationScenario(disasterScenario)) return [];
    return SCENARIO_MILESTONES[disasterScenario].flatMap(m => {
      const ts = scenarioData.timesteps.find(t => t.timestep_hour === m.hour);
      return ts ? [{ ...m, phase: resolvePhase(ts) }] : [];
    });
  }, [scenarioData, disasterScenario]);

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
    let rawOutages: LiveOutage[] = [];

    const applyEnrichment = (gold: GoldRegistry | null) => {
      if (!isMounted || rawOutages.length === 0) return;
      const enriched = enrichLiveOutagesWithGrid(rawOutages, substations, sections, gold);
      setLiveOutages(enriched);
    };

    Promise.all([
      getLiveChennaiOutages(),
      getGoldRegistry((upgradedGold) => {
        applyEnrichment(upgradedGold);
      })
    ]).then(([res, gold]) => {
      if (isMounted && res.data) {
        rawOutages = res.data;
        applyEnrichment(gold);
      }
    });
    return () => { isMounted = false; };
  }, [substations, sections]);

  const poorStabilityCount = useMemo(() => {
    return substations.filter(s => isSubstationAtRisk(s, liveOutages)).length;
  }, [substations, liveOutages]);

  const waterloggingRiskCount = useMemo(() => {
    return substations.filter(s => isSubstationWaterloggingRisk(s)).length;
  }, [substations, floodLayersLoaded]);

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
        icon: getSubstationMarkerIcon(ss, isSelected, isLight, crisisTriageFilter !== 'all'),
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
  }, [showBulk, showSubTrans, showDistribution, isolatedNodeIds, crisisTriageFilter, substationsWithOutages, mapLoaded, substations, liveOutages, floodLayersLoaded]);

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
      // On wide screens the left search/outage panel is ~470px, so keep markers clear of it.
      const wide = mapRef.current.getDiv().clientWidth > 1100;
      mapRef.current.fitBounds(b, { top: 90, right: 460, bottom: 90, left: wide ? 520 : 90 });
    }
  }, [crisisTriageFilter, mapLoaded, substations, liveOutages, substationsWithOutages, floodLayersLoaded]);

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
        prevMarker.setIcon(getSubstationMarkerIcon(prevSS, false, isLight, crisisTriageFilter !== 'all'));
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

  // 7. In-Place Theme / Triage-Filter Icon Update without marker recreation
  useEffect(() => {
    if (!mapLoaded) return;
    const isLight = theme === 'light';
    const highlight = crisisTriageFilter !== 'all';
    substations.forEach(ss => {
      const marker = markersRef.current[ss.code];
      if (marker) {
        const isSelected = selectedSubstation?.code === ss.code;
        marker.setIcon(getSubstationMarkerIcon(ss, isSelected, isLight, highlight));
      }
    });
    sections.forEach(sec => {
      const marker = sectionMarkersRef.current[sec.code];
      if (marker) {
        const isSelected = selectedSection?.code === sec.code;
        marker.setIcon(getSectionMarkerIcon(isSelected, isLight));
      }
    });
  }, [theme, mapLoaded, crisisTriageFilter]);

  // During a replay, sites to check get a halo behind their dot (red = check first, orange = check next); the dots keep their
  // voltage colours. Only for dots that are on the map (layer switches and filters still apply).
  const haloMarkersRef = useRef<google.maps.Marker[]>([]);
  useEffect(() => {
    haloMarkersRef.current.forEach(m => m.setMap(null));
    haloMarkersRef.current = [];
    const map = mapRef.current;
    if (!map || !mapLoaded || !exposure || !isSimulationScenario(disasterScenario)) return;
    const isLight = theme === 'light';
    exposure.exposed.forEach(e => {
      const dot = markersRef.current[e.substation.code];
      if (!dot || dot.getMap() !== map) return;
      haloMarkersRef.current.push(
        new google.maps.Marker({
          map,
          position: dot.getPosition() as google.maps.LatLng,
          icon: getReplayHaloIcon(e.tier, isLight),
          clickable: false,
          zIndex: e.tier === 'first' ? 6 : 5,
          optimized: true
        })
      );
    });
    return () => {
      haloMarkersRef.current.forEach(m => m.setMap(null));
      haloMarkersRef.current = [];
    };
  }, [exposure, mapLoaded, disasterScenario, theme, showBulk, showSubTrans, showDistribution, isolatedNodeIds, crisisTriageFilter, substationsWithOutages]);

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
    } else if (selectedSection && !sectionBoundary && typeof selectedSection.lat === 'number' && typeof selectedSection.lng === 'number' && !isNaN(selectedSection.lat) && !isNaN(selectedSection.lng)) {
      mapRef.current.panTo({ lat: selectedSection.lat, lng: selectedSection.lng });
      mapRef.current.setZoom(14.5);
    }
  }, [selectedSubstation, selectedSection, showConnections]);

  // Relief centres, one marker per ward. The GCC list has no coordinates, so each marker sits inside its ward, not at a real site.
  useEffect(() => {
    reliefMarkersRef.current.forEach(m => m.setMap(null));
    reliefMarkersRef.current = [];
    if (reliefInfoWindowRef.current) {
      reliefInfoWindowRef.current.close();
    }
    if (!mapRef.current || !mapLoaded || !showReliefCentres || !reliefData) return;

    Object.entries(reliefData.wards).forEach(([ward, w]) => {
      if (w.lat === null || w.lng === null) return;
      const marker = new google.maps.Marker({
        position: { lat: w.lat, lng: w.lng },
        map: mapRef.current,
        title: `Ward ${ward} (Zone ${w.zone}): ${w.centres.length} relief centre${w.centres.length > 1 ? 's' : ''} on the GCC list (click for details)`,
        zIndex: 6,
        icon: {
          path: 'M 0,-7 L 7,0 0,7 -7,0 z',
          fillColor: '#7c3aed',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 1
        },
        cursor: 'pointer',
        optimized: false
      });

      marker.addListener('click', () => {
        if (!mapRef.current) return;
        mapRef.current.panTo({ lat: w.lat!, lng: w.lng! });

        if (!reliefInfoWindowRef.current) {
          reliefInfoWindowRef.current = new google.maps.InfoWindow();
        }

        const headerEl = document.createElement('div');
        headerEl.style.cssText =
          'display:flex;align-items:center;justify-content:space-between;gap:8px;padding-right:24px;font-family:system-ui,-apple-system,sans-serif;';

        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-weight:700;font-size:13px;color:#6b21a8;display:flex;align-items:center;gap:4px;';
        titleSpan.textContent = `🏛️ Ward ${ward} Relief Centres`;

        const badgeWrap = document.createElement('div');
        badgeWrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;';

        const zoneBadge = document.createElement('span');
        zoneBadge.style.cssText =
          'font-size:10px;font-weight:700;background:#f3e8ff;color:#7e22ce;padding:1px 6px;border-radius:4px;border:1px solid #e9d5ff;';
        zoneBadge.textContent = `Zone ${w.zone}`;

        const countBadge = document.createElement('span');
        countBadge.style.cssText =
          'font-size:10px;font-weight:700;background:#ede9fe;color:#5b21b6;padding:1px 6px;border-radius:4px;';
        countBadge.textContent = `${w.centres.length} listed`;

        badgeWrap.appendChild(zoneBadge);
        badgeWrap.appendChild(countBadge);
        headerEl.appendChild(titleSpan);
        headerEl.appendChild(badgeWrap);

        if (typeof reliefInfoWindowRef.current?.setHeaderContent === 'function') {
          reliefInfoWindowRef.current.setHeaderContent(headerEl);
        }

        const facts = wardFacts(gccPlan, ward);
        const planRelief = facts?.relief ?? [];
        const yn = (v: boolean | null) => (v === null ? 'not stated' : v ? 'Yes' : 'No');

        const centresHtml = w.centres
          .map((c) => {
            const cleanPhone = c.contact ? c.contact.replace(/[^0-9+]/g, '') : '';
            return `
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:6px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
                  <div style="font-weight:700;font-size:12px;color:#0f172a;line-height:1.35;word-break:break-word;">
                    ${escapeHtml(c.address || 'Address not listed')}
                  </div>
                  ${
                    cleanPhone
                      ? `
                    <a href="tel:${escapeHtml(cleanPhone)}" 
                       style="display:inline-flex;align-items:center;gap:3px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:2px 6px;border-radius:4px;font-size:11px;font-family:monospace;font-weight:700;text-decoration:none;flex-shrink:0;"
                       title="Call In-Charge Officer">
                      📞 ${escapeHtml(c.contact)}
                    </a>
                  `
                      : ''
                  }
                </div>
                <div style="font-size:11.5px;color:#475569;">
                  👤 <strong>Officer:</strong> ${escapeHtml(c.officer || 'Not listed')}
                </div>
              </div>
            `;
          })
          .join('');

        let planHtml = '';
        if (planRelief.length > 0) {
          const items = planRelief
            .map(
              (p, i) => `
              <div style="margin-bottom:5px;padding-bottom:5px;${i < planRelief.length - 1 ? 'border-bottom:1px dashed #e2e8f0;' : ''}">
                <div style="font-weight:600;font-size:11.5px;color:#1e293b;margin-bottom:3px;">
                  ${escapeHtml(p.name)}
                </div>
                <div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:10px;margin-bottom:2px;">
                  <span>👥 Capacity: <strong>${p.capacity !== null ? `${p.capacity} people` : 'not given'}</strong></span>
                  <span>🍲 Cooking: <strong>${yn(p.cooking)}</strong></span>
                </div>
                <div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:10px;margin-bottom:2px;">
                  <span>🚰 Water: <strong>${yn(p.water)}</strong></span>
                  <span>🚻 Toilets: <strong>${yn(p.toilets)}</strong></span>
                </div>
                ${
                  p.streets
                    ? `<div style="font-size:10px;color:#64748b;margin-top:2px;font-style:italic;">Served streets: ${escapeHtml(p.streets)}</div>`
                    : ''
                }
              </div>
            `
            )
            .join('');

          planHtml = `
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:6px;">
              <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#0369a1;margin-bottom:5px;">
                Shelter Capacity & Facilities (GCC Plan 2024)
              </div>
              ${items}
            </div>
          `;
        }

        let floodNoteHtml = '';
        if (facts) {
          const inundationItems = [];
          if (facts.in2023 && facts.in2023.length > 0) {
            inundationItems.push(
              `🌊 <strong>2023 Michaung Inundated Streets (${facts.in2023.length}):</strong> ${escapeHtml(
                facts.in2023.slice(0, 3).join(', ')
              )}${facts.in2023.length > 3 ? ` +${facts.in2023.length - 3} more` : ''}`
            );
          }
          if (facts.reg2015) {
            inundationItems.push(
              `⚠️ <strong>2015 Flood Depth Register:</strong> ${DEPTH_TEXT[facts.reg2015.deepest]} (${facts.reg2015.n} streets)`
            );
          }
          if (inundationItems.length > 0) {
            floodNoteHtml = `
              <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:11px;color:#92400e;line-height:1.4;">
                ${inundationItems.join('<br>')}
              </div>
            `;
          }
        }

        reliefInfoWindowRef.current?.setContent(`
          <div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:320px;line-height:1.35;max-height:380px;overflow-y:auto;padding-right:2px;">
            ${floodNoteHtml}
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b21a8;">
                Designated Relief Centres
              </div>
              <a href="https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}"
                 target="_blank"
                 rel="noopener noreferrer"
                 style="display:inline-flex;align-items:center;gap:3px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;text-decoration:none;"
                 title="View Ward Location on Google Maps">
                📍 View Place ↗
              </a>
            </div>
            ${centresHtml}
            ${planHtml}
            <div style="font-size:9.5px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:4px;margin-top:4px;line-height:1.3;">
              Official GCC directory assigns centres by ward without discrete coordinates. Marker is placed inside the official ward boundary.
            </div>
          </div>
        `);

        reliefInfoWindowRef.current?.open(mapRef.current, marker);
      });

      reliefMarkersRef.current.push(marker);
    });

    return () => {
      reliefMarkersRef.current.forEach(m => m.setMap(null));
      reliefMarkersRef.current = [];
      if (reliefInfoWindowRef.current) {
        reliefInfoWindowRef.current.close();
      }
    };
  }, [showReliefCentres, reliefData, mapLoaded, gccPlan]);

  // CMWSSB sewerage pumping stations (TNGIS), one marker per station at the centre of its polygon.
  useEffect(() => {
    sewerageMarkersRef.current.forEach(m => m.setMap(null));
    sewerageMarkersRef.current = [];
    sewerageInfoWindowRef.current?.close();
    if (!mapRef.current || !mapLoaded || !showSewerageStations || !sewerageData) return;

    sewerageData.stations.forEach(st => {
      const marker = new google.maps.Marker({
        position: { lat: st.lat, lng: st.lng },
        map: mapRef.current,
        title: `${st.name} (sewerage pumping station)`,
        zIndex: 5,
        icon: {
          path: 'M -5,-5 L 5,-5 5,5 -5,5 z',
          fillColor: '#0d9488',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 1
        },
        cursor: 'pointer',
        optimized: false
      });
      marker.addListener('click', () => {
        if (!sewerageInfoWindowRef.current) sewerageInfoWindowRef.current = new google.maps.InfoWindow();
        const root = document.createElement('div');
        root.style.cssText = 'font-family:system-ui,sans-serif;font-size:12.5px;line-height:1.4;max-width:240px;color:#0f172a;';
        const title = document.createElement('div');
        title.style.cssText = 'font-weight:700;font-size:13px;';
        title.textContent = st.name;
        const road = document.createElement('div');
        road.style.cssText = 'color:#475569;';
        road.textContent = st.road;
        const note = document.createElement('div');
        note.style.cssText = 'margin-top:6px;color:#475569;font-size:12px;';
        note.textContent = 'CMWSSB sewerage pumping station (sewage, not storm water). Source: TNGIS.';
        root.append(title, road, note);
        sewerageInfoWindowRef.current.setContent(root);
        sewerageInfoWindowRef.current.open(mapRef.current, marker);
      });
      sewerageMarkersRef.current.push(marker);
    });

    return () => {
      sewerageMarkersRef.current.forEach(m => m.setMap(null));
      sewerageMarkersRef.current = [];
      sewerageInfoWindowRef.current?.close();
    };
  }, [showSewerageStations, sewerageData, mapLoaded]);

  // IMD's observed track: the whole path dotted underneath, the part travelled solid, a marker at the storm centre, and the landfall point.
  const bestTrack = useBestTrack();
  const [showTrack, setShowTrack] = useState(true);
  const [clockHour, setClockHour] = useState<number | null>(null);
  // Glide between steps: follows the device's reduced-motion setting until the viewer ticks the switch.
  const reducedMotion = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [animate, setAnimate] = useState(!reducedMotion);

  // Open the directive once the map has settled on a new step (after the glide), and pause playback until "Next step". Not on
  // the first load of the scenario: it starts with Play or a click on a step.
  const settledHourRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  useEffect(() => {
    if (!isSimulationScenario(disasterScenario)) {
      settledHourRef.current = null;
      return;
    }
    if (settledHourRef.current === null) {
      settledHourRef.current = simulationHour;
      return;
    }
    if (!directiveEachStep || settledHourRef.current === simulationHour) return;
    const glide = animate ? (isPlayingRef.current ? GLIDE_PLAY_MS : GLIDE_CLICK_MS) : 0;
    const timer = setTimeout(() => {
      settledHourRef.current = simulationHour;
      setIsPlaying(false);
      setIsGeminiSopOpen(true);
    }, glide + 300);
    return () => clearTimeout(timer);
  }, [simulationHour, disasterScenario, directiveEachStep, animate]);
  const trackAheadRef = useRef<google.maps.Polyline | null>(null);
  const trackDoneRef = useRef<google.maps.Polyline | null>(null);
  const stormMarkerRef = useRef<google.maps.Marker | null>(null);
  const landfallMarkerRef = useRef<google.maps.Marker | null>(null);
  const stormLookRef = useRef('');
  const displayedHourRef = useRef<number>(-24);

  // The scenario hour 0 as a time (the hourly files hold UTC without a zone mark).
  const hourZeroMs = useMemo(() => {
    const t = scenarioData?.timesteps.find(x => x.timestep_hour === 0)?.utc;
    if (!t) return null;
    const ms = Date.parse(t.endsWith('Z') ? t : `${t}Z`);
    return Number.isNaN(ms) ? null : ms;
  }, [scenarioData]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !bestTrack || !isSimulationScenario(disasterScenario)) return;
    const map = mapRef.current;
    const full = bestTrack.points.map(p => ({ lat: p.lat, lng: p.lng }));
    trackAheadRef.current = new google.maps.Polyline({
      map,
      path: full,
      clickable: false,
      zIndex: 3,
      strokeOpacity: 0,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, strokeColor: '#475569', scale: 2.5 }, offset: '0', repeat: '9px' }]
    });
    trackDoneRef.current = new google.maps.Polyline({ map, path: [], clickable: false, zIndex: 4, strokeColor: '#dc2626', strokeOpacity: 0.9, strokeWeight: 3 });
    stormMarkerRef.current = new google.maps.Marker({ map, position: full[0], clickable: false, zIndex: 1500, visible: false });
    landfallMarkerRef.current = new google.maps.Marker({
      map,
      position: { lat: bestTrack.landfall.lat, lng: bestTrack.landfall.lng },
      zIndex: 1400,
      title: `IMD: ${bestTrack.landfall.text}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: '#ffffff',
        fillOpacity: 1,
        strokeColor: '#7f1d1d',
        strokeWeight: 2.5,
        labelOrigin: new google.maps.Point(0, -2.6)
      },
      label: { text: 'Landfall', fontSize: '11px', fontWeight: '700', color: '#7f1d1d' }
    });
    stormLookRef.current = '';
    return () => {
      [trackAheadRef, trackDoneRef, stormMarkerRef, landfallMarkerRef].forEach(r => {
        r.current?.setMap(null);
        r.current = null;
      });
    };
  }, [bestTrack, mapLoaded, disasterScenario]);

  // Paint the storm for one moment. `hour` is a scenario hour; between steps it is a fraction.
  const paintStorm = useCallback(
    (hour: number) => {
      const ahead = trackAheadRef.current;
      const done = trackDoneRef.current;
      const marker = stormMarkerRef.current;
      const landfall = landfallMarkerRef.current;
      if (!ahead || !done || !marker || !landfall || !bestTrack || hourZeroMs === null) return;
      ahead.setVisible(showTrack);
      landfall.setVisible(showTrack);
      const ms = hourZeroMs + hour * 3600 * 1000;
      const pts = bestTrack.points;
      const s = showTrack ? stormAt(pts, ms) : null;
      if (!showTrack || (!s && ms < pts[0].ms)) {
        done.setVisible(false);
        marker.setVisible(false);
        return;
      }
      done.setVisible(true);
      if (!s) {
        done.setPath(pts.map(p => ({ lat: p.lat, lng: p.lng }))); // past IMD's last fix: the whole path travelled, no marker
        marker.setVisible(false);
        return;
      }
      done.setPath(s.path);
      marker.setPosition({ lat: s.lat, lng: s.lng });
      const look = `${s.last.grade}-${s.last.windKt}`;
      if (stormLookRef.current !== look) {
        stormLookRef.current = look;
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: GRADE_COLOR[s.last.grade],
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
          labelOrigin: new google.maps.Point(0, -2.6)
        });
        marker.setLabel({ text: `${s.last.grade} ${s.last.windKt} kt`, fontSize: '11px', fontWeight: '700', color: '#7f1d1d' });
      }
      marker.setVisible(true);
    },
    [showTrack, bestTrack, hourZeroMs]
  );

  // Show the current step. When the step changes, play the real hours in between (the hourly satellite values, and the storm along
  // IMD's track) over GLIDE_PLAY_MS while playing or GLIDE_CLICK_MS after a click; with reduced motion, jump.
  useEffect(() => {
    if (!mapLoaded || !scenarioGrid || !isSimulationScenario(disasterScenario)) {
      displayedHourRef.current = simulationHour;
      return;
    }
    const from = displayedHourRef.current;
    const to = simulationHour;
    if (from === to || !animate) {
      displayedHourRef.current = to;
      paintStorm(to);
      setClockHour(null);
      return;
    }
    const dur = isPlaying ? GLIDE_PLAY_MS : GLIDE_CLICK_MS;
    const t0 = performance.now();
    let raf = 0;
    let shown = NaN;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const h = p >= 1 ? to : from + (to - from) * e;
      displayedHourRef.current = h;
      paintStorm(h);
      const r = Math.round(h);
      if (r !== shown) {
        shown = r;
        setClockHour(p >= 1 ? null : r);
      }
      if (p < 1) raf = requestAnimationFrame(tick);
      else setClockHour(null);
    };
    setClockHour(Math.round(from)); // start the clock where the map is, not at the new step
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [simulationHour, paintStorm, mapLoaded, disasterScenario, scenarioGrid, isPlaying, animate]);

  const clockLabel = useMemo(() => {
    if (hourZeroMs === null || !isSimulationScenario(disasterScenario)) return null;
    return istLabel(new Date(hourZeroMs + (clockHour ?? simulationHour) * 3600 * 1000).toISOString());
  }, [hourZeroMs, clockHour, simulationHour, disasterScenario]);

  const stormNowText = useMemo(() => {
    if (!bestTrack || hourZeroMs === null) return null;
    const s = stormAt(bestTrack.points, hourZeroMs + (clockHour ?? simulationHour) * 3600 * 1000);
    if (!s) return null;
    const km = Math.round(distanceToChennaiKm(s.lat, s.lng) / 5) * 5;
    return `${TRACK_GRADE_NAMES[s.last.grade]}, ${s.last.windKt} kt, about ${km} km from Chennai (our distance). Last IMD fix ${istLabel(s.last.utc)}.`;
  }, [bestTrack, hourZeroMs, clockHour, simulationHour]);

  // The map is normally held to Chennai. While a hindcast plays it may zoom out over the Bay of Bengal so the whole storm can be seen.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const wide = isSimulationScenario(disasterScenario) && Boolean(bestTrack);
    map.setOptions(
      wide
        ? { minZoom: 6, restriction: { latLngBounds: { north: 22.0, south: 4.0, west: 70.0, east: 92.0 }, strictBounds: false } }
        : { minZoom: 10.5, restriction: { latLngBounds: CHENNAI_METRO_BOUNDS, strictBounds: true } }
    );
  }, [mapLoaded, disasterScenario, bestTrack]);

  const fitStorm = useCallback(() => {
    const map = mapRef.current;
    if (!map || !bestTrack) return;
    const b = new google.maps.LatLngBounds();
    bestTrack.points.forEach(p => b.extend({ lat: p.lat, lng: p.lng }));
    b.extend({ lat: 13.0827, lng: 80.2707 });
    map.fitBounds(b, { top: 90, bottom: 90, left: 380, right: 90 });
  }, [bestTrack]);

  // IMD rain gauges: the readings of the latest 24-hour window that had ended at this step, as squares coloured on the rain scale.
  const gaugeWindow = useMemo(
    () => (gaugePoints ? gaugeWindowFor(gaugePoints, currentTimestep?.utc) : null),
    [gaugePoints, currentTimestep?.utc]
  );
  useEffect(() => {
    gaugeMarkersRef.current.forEach(m => m.setMap(null));
    gaugeMarkersRef.current = [];
    if (!mapRef.current || !mapLoaded || !gaugePoints || !gaugeWindow || !showGauges || !isSimulationScenario(disasterScenario)) return;
    const isLight = theme === 'light';
    gaugePoints.stations.forEach(s => {
      const mm = s.mm[gaugeWindow.id];
      if (mm === null || mm === undefined) return;
      const sat = s.sat[gaugeWindow.id];
      gaugeMarkersRef.current.push(
        new google.maps.Marker({
          position: { lat: s.lat, lng: s.lng },
          map: mapRef.current,
          zIndex: 8,
          title: `${s.name} (${s.district}): IMD gauge ${mm} mm in the ${gaugeWindow.label}.${sat !== null && sat !== undefined ? ` Satellite cell: ${sat} mm.` : ' Outside our satellite cells.'}`,
          icon: {
            path: 'M -1,-1 L 1,-1 L 1,1 L -1,1 z',
            scale: 6.5,
            fillColor: rainFill(mm).color,
            fillOpacity: 1,
            strokeColor: isLight ? '#0f172a' : '#f8fafc',
            strokeWeight: 1.5
          },
          optimized: true
        })
      );
    });
    return () => {
      gaugeMarkersRef.current.forEach(m => m.setMap(null));
      gaugeMarkersRef.current = [];
    };
  }, [gaugePoints, gaugeWindow, showGauges, mapLoaded, disasterScenario, theme]);

  // Storm layer 2 and 3: the official flood maps, drawn as fixed backdrops (not what is flooded at this hour).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !showFlood2015 || !isSimulationScenario(disasterScenario)) return;
    let cancelled = false;
    loadFloodMap('nrsc2015.json').then(gj => {
      if (cancelled || !gj) return;
      const layer = new google.maps.Data({ map });
      layer.addGeoJson(gj);
      layer.setStyle({ fillColor: '#0891b2', fillOpacity: 0.18, strokeWeight: 0, clickable: false, zIndex: 2 });
      flood2015LayerRef.current = layer;
    });
    return () => {
      cancelled = true;
      flood2015LayerRef.current?.setMap(null);
      flood2015LayerRef.current = null;
    };
  }, [showFlood2015, mapLoaded, disasterScenario]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !showHazard || !isSimulationScenario(disasterScenario)) return;
    let cancelled = false;
    loadFloodMap(`hazard_${hazardYears}yr.json`).then(gj => {
      if (cancelled || !gj) return;
      const layer = new google.maps.Data({ map });
      layer.addGeoJson(gj);
      layer.setStyle(feature => ({
        fillColor: HAZARD_COLOURS[String(feature.getProperty('class'))] || '#94a3b8',
        fillOpacity: 0.4,
        strokeWeight: 0,
        clickable: false,
        zIndex: 3
      }));
      hazardLayerRef.current = layer;
    });
    return () => {
      cancelled = true;
      hazardLayerRef.current?.setMap(null);
      hazardLayerRef.current = null;
    };
  }, [showHazard, hazardYears, mapLoaded, disasterScenario]);

  // 9. On-Demand Jurisdictional Boundary Polygon for Selected Section Office
  useEffect(() => {
    // Clear previous polygons
    sectionBoundaryPolygonsRef.current.forEach(p => p.setMap(null));
    sectionBoundaryPolygonsRef.current = [];

    if (!mapRef.current || !mapLoaded || !selectedSection || !sectionBoundary) {
      return;
    }

    const map = mapRef.current;
    const isLight = theme === 'light';
    const boundary = sectionBoundary;
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
  }, [selectedSection, sectionBoundary, mapLoaded, theme]);

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
        onTogglePlay={togglePlay}
        currentTimestep={currentTimestep}
        activeDirective={activeDirective}
        onOpenGeminiSop={() => setIsGeminiSopOpen(prev => !prev)}
        steps={timelineSteps}
      />

      {/* Floating AI Directive dialog (official-quote SOP) */}
      <GeminiSopDialog
        directive={activeDirective}
        isOpen={isGeminiSopOpen}
        onClose={() => setIsGeminiSopOpen(false)}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        stepFlow={
          isSimulationScenario(disasterScenario)
            ? { nextLabel: nextStep?.label ?? null, onNext: goToNextStep, eachStep: directiveEachStep, setEachStep: setDirectiveEachStep }
            : undefined
        }
        isLight={isLight}
        onSelectSubstation={(name) => {
          const query = name.toUpperCase().trim();
          const match = substations.find(s => 
            s.name.toUpperCase().includes(query) || 
            query.includes(s.name.toUpperCase()) ||
            (s.cleanName && (
              s.cleanName.toUpperCase().includes(query) ||
              query.includes(s.cleanName.toUpperCase())
            )) ||
            s.code === query
          );
          if (match) onSelectSubstation(match);
        }}
      />

      {/* Top Left Floating Search & Quick Filters */}
      <div
        className={`absolute left-2 md:left-4 z-20 flex flex-col gap-2 w-[calc(100vw-1rem)] md:top-4 md:bottom-auto md:max-h-[calc(100%-2rem)] ${
          // On phones during a replay the cockpit (directive, timeline, IMD card) fills the top, so these panels sit at the bottom.
          isSimulationScenario(disasterScenario) ? 'bottom-2 max-h-[45%]' : 'top-[5.25rem] max-h-[calc(100%-6.25rem)]'
        } ${
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
              showReliefCentres={showReliefCentres}
              setShowReliefCentres={setShowReliefCentres}
              reliefWardCount={reliefData ? Object.values(reliefData.wards).filter(w => w.lat !== null).length : 0}
              showSewerageStations={showSewerageStations}
              setShowSewerageStations={setShowSewerageStations}
              sewerageStationCount={sewerageData ? sewerageData.stations.length : 0}
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
            {exposure && isSimulationScenario(disasterScenario) && (
              <ExposedSubstationsCard
                exposure={exposure}
                stepLabel={currentTimestep?.label || `T${simulationHour >= 0 ? '+' : ''}${simulationHour}h`}
                isLight={isLight}
                selectedSubstation={selectedSubstation}
                onSelect={(s) => {
                  onSelectSubstation(s);
                  onSelectSection(null);
                }}
              />
            )}
          </>
        )}

          {isSimulationScenario(disasterScenario) && scenarioGrid && (
          <SimulationMapPanel
            isLight={isLight}
            stepLabel={currentTimestep?.label || `T${simulationHour >= 0 ? '+' : ''}${simulationHour}h`}
            showFlood2015={showFlood2015}
            setShowFlood2015={setShowFlood2015}
            showHazard={showHazard}
            setShowHazard={setShowHazard}
            hazardYears={hazardYears}
            setHazardYears={setHazardYears}
          showGauges={showGauges}
          setShowGauges={setShowGauges}
          gaugeInfo={
            gaugePoints
              ? {
                  label: gaugeWindow ? gaugeWindow.label : null,
                  listed: gaugeWindow ? gaugePoints.stations.filter(s => s.mm[gaugeWindow.id] != null).length : 0
                }
              : null
          }
            windSpeedKmh={currentTimestep ? Math.abs(currentTimestep.wind_speed_10m_kmh) : null}
            windFromDeg={cityWindFromDeg(scenarioGrid, simulationHour)?.fromDeg ?? null}
            track={bestTrack ? { show: showTrack, setShow: setShowTrack, onFit: fitStorm, now: stormNowText } : null}
            clockLabel={clockLabel}
            animate={{ on: animate, set: setAnimate, reducedMotion }}
          />
        )}
      </div>

      {/* Full-Height Substation / Section Inspector Drawer */}
      <SubstationInspectorDrawer
        substations={substations}
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
        currentTimestep={currentTimestep}
        liveWeather={liveWeather}
      />
    </div>
  );
};
