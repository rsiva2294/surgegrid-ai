import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import type { LiveWeatherReport } from '../services/liveDataService';
import {
  Zap,
  Home,
  Droplet,
  AlertTriangle,
  Play,
  Pause,
  Wind,
  CloudRain,
  Waves,
  Thermometer,
  Radio,
  CloudLightning,
  RotateCw,
} from 'lucide-react';
import type { Substation, LostWaterBody, FloodHotspot, ReliefShelter, WeatherStep } from '../types';

interface GoogleGridMapProps {
  substations: Substation[];
  lostLakes: LostWaterBody[];
  floodHotspots?: FloodHotspot[];
  shelters: ReliefShelter[];
  selectedSubstation?: Substation | null;
  onSelectSubstation: (sub: Substation | null) => void;
  weatherSteps: WeatherStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  lang?: 'en' | 'ta';
  viewMode?: 'LIVE' | 'SIMULATION';
  onToggleViewMode?: (mode: 'LIVE' | 'SIMULATION') => void;
  liveWeather?: LiveWeatherReport | null;
  onRefreshLiveWeather?: () => void;
  isWeatherRefreshing?: boolean;
}

// Clean Map Style: Declutters commercial, business, retail, entertainment, and place-of-worship POIs
// Prevents base map labels ("A1 Beef Stall", "Mount Road Bilal", "Spencer Plaza", etc.) from visual interference
// while preserving road networks, highway badges, rivers, coastlines, and neighborhood names.
const cleanMapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.attraction',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.place_of_worship',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.sports_complex',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

// Strict Chennai Metropolitan Area (CMA) Geographic Boundary
// North: Minjur / Ennore Port / Ponneri border (~13.38° N)
// South: Tambaram / Vandalur / Kelambakkam border (~12.75° N)
// West: Sriperumbudur / Outer Ring Road border (~79.95° E)
// East: Bay of Bengal Coastline (~80.38° E)
const CHENNAI_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 13.38,
  south: 12.75,
  west: 79.95,
  east: 80.38,
};

const CHENNAI_RESTRICTION: google.maps.MapRestriction = {
  latLngBounds: CHENNAI_BOUNDS,
  strictBounds: true,
};

// Controller component to dynamically set styles and enforce Chennai restriction on the active map instance
const MapStyleController: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setOptions({
      styles: cleanMapStyles,
      restriction: CHENNAI_RESTRICTION,
      minZoom: 10,
      maxZoom: 18,
    });
  }, [map]);

  return null;
};

// Helper to safely access window.google.maps without crashing before SDK finishes loading
const getGoogleMaps = () => {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return (window as any).google.maps;
  }
  return null;
};

// Generate high-resolution SVG data URI with representative Zap icon for Substations
const getSubstationMarkerIcon = (
  bgColor: string,
  strokeColor: string,
  isRing: boolean = false,
  ringColor: string = '#818cf8',
  size: number = 22
) => {
  const r = size / 2;
  const innerR = isRing ? r - 2.5 : r - 1.5;
  const ringSvg = isRing
    ? `<circle cx="${r}" cy="${r}" r="${r - 1}" fill="none" stroke="${ringColor}" stroke-width="2"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    ${ringSvg}
    <circle cx="${r}" cy="${r}" r="${innerR}" fill="${bgColor}" stroke="${strokeColor}" stroke-width="1.5"/>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ffffff" transform="translate(${r - 6}, ${r - 7}) scale(0.5)"/>
  </svg>`;

  const gMaps = getGoogleMaps();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: gMaps ? new gMaps.Size(size, size) : undefined,
    anchor: gMaps ? new gMaps.Point(r, r) : undefined,
  };
};

// Generate high-resolution SVG data URI with representative Home/Alert icon for Relief Shelters
const getShelterMarkerIcon = (
  bgColor: string,
  strokeColor: string,
  isCompromised: boolean = false,
  size: number = 22
) => {
  const r = size / 2;
  const innerR = r - 1.5;

  const iconPath = isCompromised
    ? `<path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(${r - 6}, ${r - 6}) scale(0.5)"/>`
    : `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#ffffff" stroke="#ffffff" stroke-width="1" transform="translate(${r - 6}, ${r - 6}) scale(0.5)"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${r}" cy="${r}" r="${innerR}" fill="${bgColor}" stroke="${strokeColor}" stroke-width="1.5"/>
    ${iconPath}
  </svg>`;

  const gMaps = getGoogleMaps();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: gMaps ? new gMaps.Size(size, size) : undefined,
    anchor: gMaps ? new gMaps.Point(r, r) : undefined,
  };
};

// Generate high-resolution SVG data URI with warning icon for GCC Chronic Flood Hotspots
const getHotspotMarkerIcon = (size: number = 18) => {
  const r = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${r}" cy="${r}" r="${r - 1}" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M12 9v4m0 4h.01" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" transform="translate(${r - 6}, ${r - 6}) scale(0.5)"/>
  </svg>`;

  const gMaps = getGoogleMaps();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: gMaps ? new gMaps.Size(size, size) : undefined,
    anchor: gMaps ? new gMaps.Point(r, r) : undefined,
  };
};



// Vector Overlays Component (Circles for 15 Lost Water Bodies)
// Rivers are rendered natively by Google Maps — no duplicate overlay needed.
const MapOverlays: React.FC<{
  lostLakes: LostWaterBody[];
  showLostLakes: boolean;
  onSelectLake: (lake: LostWaterBody) => void;
  viewMode: 'LIVE' | 'SIMULATION';
}> = ({ lostLakes, showLostLakes, onSelectLake, viewMode }) => {
  const map = useMap();
  const isLive = viewMode === 'LIVE';

  useEffect(() => {
    if (!map) return;

    const circles: google.maps.Circle[] = [];

    // Draw 15 Lost Water Bodies (ancestral lakebeds — unique civic data Google doesn't have)
    if (showLostLakes) {
      lostLakes.forEach((lake) => {
        const [lng, lat] = lake.geometry.coordinates;
        const radius = lake.properties.approx_radius_m || 800;

        const circle = new google.maps.Circle({
          strokeColor: '#6366f1',
          strokeOpacity: isLive ? 0.45 : 0.85,
          strokeWeight: 1.5,
          fillColor: '#818cf8',
          fillOpacity: isLive ? 0.12 : 0.25,
          map,
          center: { lat, lng },
          radius,
          clickable: true,
        });

        circle.addListener('click', () => {
          onSelectLake(lake);
        });

        circles.push(circle);
      });
    }

    return () => {
      circles.forEach((c) => c.setMap(null));
    };
  }, [map, lostLakes, showLostLakes, onSelectLake, isLive]);

  return null;
};

export const GoogleGridMap: React.FC<GoogleGridMapProps> = ({
  substations,
  lostLakes,
  floodHotspots = [],
  shelters,
  onSelectSubstation,
  weatherSteps,
  currentStepIndex,
  onStepChange,
  lang,
  viewMode = 'LIVE',
  onToggleViewMode,
  liveWeather,
  onRefreshLiveWeather,
  isWeatherRefreshing = false,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isLive = viewMode === 'LIVE';

  // Layer Toggles
  const [showSubstations, setShowSubstations] = useState(true);
  const [showLostLakes, setShowLostLakes] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showShelters, setShowShelters] = useState(true);

  // Play/Pause State for Simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying && weatherSteps.length > 0) {
      timer = setInterval(() => {
        onStepChange((currentStepIndex + 1) % weatherSteps.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, weatherSteps.length, onStepChange]);

  const currentStep = weatherSteps[currentStepIndex] || weatherSteps[0];

  // Active InfoWindow Target
  const [activeSub, setActiveSub] = useState<Substation | null>(null);
  const [activeShelter, setActiveShelter] = useState<ReliefShelter | null>(null);
  const [activeLake, setActiveLake] = useState<LostWaterBody | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<FloodHotspot | null>(null);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* 1. Integrated Map Command Header (Layer Toggles + Mode Controls) */}
      <div className="border-b border-slate-200 bg-white p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Map Title & Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 mr-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'
              }`}
            ></span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {lang === 'en' ? 'Chennai Grid & Hazard Deck' : 'சென்னை மின் கட்டமைப்பு & பேரிடர் வரைபடம்'}
            </h2>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          {/* Layer Toggle Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setShowSubstations(!showSubstations)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors ${
                showSubstations
                  ? 'bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border border-transparent'
              }`}
            >
              <Zap className="w-3 h-3 text-sky-600" />
              <span>Substations ({substations.length || 242})</span>
            </button>

            <button
              onClick={() => setShowLostLakes(!showLostLakes)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors ${
                showLostLakes
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border border-transparent'
              }`}
            >
              <Droplet className="w-3 h-3 text-indigo-600" />
              <span>Ancestral Lakes (15)</span>
            </button>

            <button
              onClick={() => setShowHotspots(!showHotspots)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors ${
                showHotspots
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border border-transparent'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Flood Hotspots ({floodHotspots.length || 53})</span>
            </button>

            <button
              onClick={() => setShowShelters(!showShelters)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors ${
                showShelters
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border border-transparent'
              }`}
            >
              <Home className="w-3 h-3 text-emerald-600" />
              <span>Shelters ({shelters.length || 162})</span>
            </button>

          </div>
        </div>

        {/* Right: Dynamic Bar based on Mode (Live Weather Telemetry vs Cyclone Simulation Scrubber) */}
        {viewMode === 'LIVE' ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-emerald-50/60 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 shrink-0">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="hidden sm:inline">GOOGLE MAPS WEATHER:</span>
            </div>

            {/* Live Weather Metrics */}
            <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] text-slate-700">
              <span className="flex items-center gap-1 font-mono font-bold text-slate-900" title="Current Temperature">
                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                {liveWeather ? `${liveWeather.temperature_c}°C` : '34.3°C'}
              </span>
              <span className="flex items-center gap-1 font-mono font-medium text-slate-600" title="Wind & Gusts">
                <Wind className="w-3.5 h-3.5 text-slate-500" />
                {liveWeather ? `${liveWeather.wind_speed_kmh} km/h` : '3 km/h'}
                <span className="hidden md:inline text-[10px] text-slate-400">
                  (G: {liveWeather ? liveWeather.wind_gusts_kmh : 8})
                </span>
              </span>
              <span className="flex items-center gap-1 font-mono font-medium text-sky-700" title="Precipitation">
                <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                {liveWeather ? `${liveWeather.rainfall_mm} mm` : '0 mm'}
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                {liveWeather?.icon_uri && (
                  <img src={liveWeather.icon_uri} alt="" className="w-3.5 h-3.5 object-contain" />
                )}
                <span>
                  {lang === 'en'
                    ? liveWeather?.condition || 'Mostly cloudy'
                    : liveWeather?.condition_ta || 'பெரும்பாலும் மேகமூட்டம்'}
                </span>
              </span>
            </div>

            {/* Quick Refresh Button */}
            {onRefreshLiveWeather && (
              <button
                onClick={onRefreshLiveWeather}
                disabled={isWeatherRefreshing}
                className="p-1 rounded hover:bg-emerald-100 text-emerald-700 cursor-pointer transition-colors"
                title="Refresh Live Weather"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isWeatherRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            <div className="h-4 w-px bg-emerald-200 hidden sm:block"></div>

            {/* Switch to Cyclone Simulation CTA */}
            {onToggleViewMode && (
              <button
                onClick={() => onToggleViewMode('SIMULATION')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-2xs cursor-pointer transition-colors"
                title="Simulate Cyclone Landfall Deluge"
              >
                <CloudLightning className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Simulate Cyclone' : 'புயல் உருவகப்படுத்து'}</span>
              </button>
            )}
          </div>
        ) : (
          /* Cyclone Simulation Timeline Scrubber */
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-xs transition-colors shrink-0"
              title={isPlaying ? 'Pause Simulation' : 'Play Timeline'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Step Pills */}
            <div className="flex items-center gap-1">
              {weatherSteps.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <button
                    key={step.timestep_hour}
                    onClick={() => {
                      setIsPlaying(false);
                      onStepChange(idx);
                    }}
                    className={`px-2 py-0.5 rounded-md font-mono text-xs font-semibold cursor-pointer transition-all ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    {step.timestep_hour}
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

            {/* Quick Weather Chips */}
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1 font-mono font-bold text-slate-900">
                <Wind className="w-3.5 h-3.5 text-slate-500" />
                {currentStep?.wind_speed_10m_kmh || 95} km/h
              </span>
              <span className="flex items-center gap-1 font-mono font-bold text-sky-700">
                <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                {currentStep?.rainfall_24h_cumulative_mm || 245} mm
              </span>
              <span className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                <Waves className="w-3.5 h-3.5 text-indigo-600" />
                +{currentStep?.simulated_storm_surge_msl_m || 1.8}m
              </span>
            </div>

            {/* Return to Live Button */}
            {onToggleViewMode && (
              <button
                onClick={() => onToggleViewMode('LIVE')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs cursor-pointer transition-colors"
                title="Return to Live Baseline"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Return to Live' : 'நேரலை திரும்பு'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Full-Width Interactive Google Maps Canvas */}
      <div className="relative w-full h-[520px] sm:h-[620px] bg-slate-100">
        <APIProvider apiKey={apiKey} language="en" region="IN">
          <Map
            styles={cleanMapStyles}
            defaultCenter={{ lat: 13.05, lng: 80.18 }}
            defaultZoom={11}
            minZoom={10}
            maxZoom={18}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
            internalUsageAttributionIds={['gmp_git_agentskills_v1']}
          >
            {/* Dynamic Base Map POI Decluttering Controller */}
            <MapStyleController />

            {/* Vector Overlays for Lost Lakes & Surge Corridors */}
            <MapOverlays
              lostLakes={lostLakes}
              showLostLakes={showLostLakes}
              onSelectLake={(lake) => {
                setActiveLake(lake);
                setActiveSub(null);
                setActiveShelter(null);
                setActiveHotspot(null);
              }}
              viewMode={viewMode}
            />

            {/* 1. Markers for 242 TNEB Substations with Representative Icons */}
            {showSubstations &&
              substations.map((sub) => {
                const [lng, lat] = sub.coordinates;
                const isLakebed = sub.ancestral_lakebed_hazard;
                const isCritical = sub.risk_category === 'CRITICAL_SURGE_RISK';

                let bgColor = '#0284c7'; // Sky-600
                let strokeColor = '#ffffff';
                let isRing = false;
                let ringColor = '#818cf8';
                let size = 20;

                if (isLive) {
                  // In LIVE mode: Live weather condition has 0mm rain. Grid is 100% energized and dry!
                  // Substations on ancestral lakebeds have a subtle calm indigo ring to indicate monitored geological basin, but NO RED.
                  if (isLakebed) {
                    bgColor = '#0284c7';
                    strokeColor = '#ffffff';
                    isRing = true;
                    ringColor = '#818cf8';
                    size = 22;
                  } else {
                    bgColor = '#0284c7';
                    strokeColor = '#ffffff';
                    size = 18;
                  }
                } else {
                  // In SIMULATION mode: Cyclonic deluge (400mm rain) causes lakebed switchyards to trap floodwater
                  if (isLakebed) {
                    bgColor = '#e11d48'; // Rose-600
                    strokeColor = '#ffffff';
                    isRing = true;
                    ringColor = '#f43f5e';
                    size = 24;
                  } else if (isCritical) {
                    bgColor = '#ea580c'; // Orange-600
                    strokeColor = '#ffffff';
                    size = 20;
                  }
                }

                const icon = getSubstationMarkerIcon(bgColor, strokeColor, isRing, ringColor, size);

                return (
                  <Marker
                    key={sub.name}
                    position={{ lat, lng }}
                    icon={icon}
                    onClick={() => {
                      setActiveSub(sub);
                      setActiveShelter(null);
                      setActiveLake(null);
                      setActiveHotspot(null);
                      onSelectSubstation(sub);
                    }}
                    title={
                      isLive
                        ? `${sub.name} (Energized Substation · ${sub.connected_feeders_count} Feeders · Normal Baseline)`
                        : isLakebed
                        ? `${sub.name} (Threatened Lakebed Substation · De-energize Alert)`
                        : `${sub.name} (Substation · ${sub.connected_feeders_count} Feeders)`
                    }
                  />
                );
              })}

            {/* 2. Markers for 162 GCC Relief Shelters with Representative Icons */}
            {showShelters &&
              shelters.map((sh, idx) => {
                const [lng, lat] = sh.coordinates;
                // In LIVE mode (0mm rain), all shelters are accessible and dry (zero compromised).
                // In SIMULATION mode, low-lying flood zone shelters turn compromised red.
                const isCompromised = !isLive && sh.shelter_viability_status === 'COMPROMISED_INUNDATION';
                const bgColor = isCompromised ? '#dc2626' : '#16a34a';
                const strokeColor = '#ffffff';
                const size = isCompromised ? 24 : 18;

                const icon = getShelterMarkerIcon(bgColor, strokeColor, isCompromised, size);

                return (
                  <Marker
                    key={`${sh.shelter_id || 'sh'}-${idx}`}
                    position={{ lat, lng }}
                    icon={icon}
                    onClick={() => {
                      setActiveShelter(sh);
                      setActiveSub(null);
                      setActiveLake(null);
                      setActiveHotspot(null);
                    }}
                    title={
                      isLive
                        ? `${sh.name || sh.address} (Safe Haven Relief Shelter · Open & Dry)`
                        : isCompromised
                        ? `${sh.name || sh.address} (Compromised Relief Shelter - Inundated)`
                        : `${sh.name || sh.address} (Safe Haven Relief Shelter)`
                    }
                  />
                );
              })}

            {/* 3. Markers for 53 GCC Chronic Flood Hotspots */}
            {showHotspots &&
              floodHotspots.map((hs, idx) => {
                const [lng, lat] = hs.geometry.coordinates;
                return (
                  <Marker
                    key={`hs-${hs.properties.id || idx}`}
                    position={{ lat, lng }}
                    icon={getHotspotMarkerIcon(18)}
                    onClick={() => {
                      setActiveHotspot(hs);
                      setActiveSub(null);
                      setActiveShelter(null);
                      setActiveLake(null);
                    }}
                    title={`GCC Flood Hotspot: ${hs.properties.name}${
                      hs.properties.coinciding_lost_lake
                        ? ` (inside ancestral ${hs.properties.coinciding_lost_lake})`
                        : ''
                    }`}
                  />
                );
              })}

            {/* Substation InfoWindow */}
            {activeSub && (
              <InfoWindow
                position={{ lat: activeSub.coordinates[1], lng: activeSub.coordinates[0] }}
                onCloseClick={() => setActiveSub(null)}
              >
                <div className="p-1 max-w-[270px] text-slate-800">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        isLive
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeSub.ancestral_lakebed_hazard
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {isLive
                        ? 'ENERGIZED (NORMAL BASELINE)'
                        : activeSub.risk_category.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-700">
                      Elev: {activeSub.elevation_m}m MSL
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">{activeSub.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Circle: {activeSub.circle} · Feeders: {activeSub.connected_feeders_count}
                  </p>

                  {activeSub.ancestral_lakebed_hazard && (
                    isLive ? (
                      <div className="mt-2 p-1.5 rounded bg-slate-50 border border-slate-200 text-[10.5px] text-slate-700 leading-tight">
                        <strong className="text-indigo-800">ℹ️ Geological Footprint:</strong><br />
                        Built within former <em>{activeSub.lakebed_details?.name}</em> basin. Live weather: 0 mm rain, dry switchyard. 100% operational baseline.
                      </div>
                    ) : (
                      <div className="mt-2 p-1.5 rounded bg-rose-50 border border-rose-200 text-[10.5px] text-rose-900 leading-tight">
                        <strong>⚠️ Ancestral Lakebed Hazard:</strong><br />
                        Sits on drained <em>{activeSub.lakebed_details?.name}</em>. Saturated clay traps floodwater in switchyard (1.45x failure risk). Proactive de-energization scheduled.
                      </div>
                    )
                  )}

                  <div className="mt-2 text-[10.5px] text-slate-700">
                    <strong>{isLive ? 'Emergency SOP Contingency:' : 'Anticipatory SOP:'}</strong><br />
                    <span className="text-slate-600">{activeSub.anticipatory_sop}</span>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-500 font-medium">Grid State:</span>
                    {isLive ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Energized (Live)
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold">
                        Simulation T-{currentStep?.hours_to_landfall || 36}h
                      </span>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Shelter InfoWindow */}
            {activeShelter && (
              <InfoWindow
                position={{ lat: activeShelter.coordinates[1], lng: activeShelter.coordinates[0] }}
                onCloseClick={() => setActiveShelter(null)}
              >
                <div className="p-1 max-w-[270px] text-slate-800">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        !isLive && activeShelter.shelter_viability_status === 'COMPROMISED_INUNDATION'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {!isLive && activeShelter.shelter_viability_status === 'COMPROMISED_INUNDATION'
                        ? 'COMPROMISED INUNDATION'
                        : 'SAFE & OPEN'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ward {activeShelter.ward} (Zone {activeShelter.zone})
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">
                    {activeShelter.name || activeShelter.address}
                  </h4>

                  {!isLive && activeShelter.shelter_viability_status === 'COMPROMISED_INUNDATION' ? (
                    <div className="mt-2 p-1.5 rounded bg-rose-50 border border-rose-200 text-[10.5px] text-rose-900 leading-tight">
                      <strong>⚠️ Cyclone Inundation Hazard:</strong> {activeShelter.compromised_reason}<br />
                      <div className="mt-1 pt-1 border-t border-rose-200 font-semibold text-rose-950">
                        ↳ Reroute Evacuees: {activeShelter.recommended_safe_shelter?.rerouting_advisory}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 p-1 rounded bg-emerald-50 text-emerald-800 text-[10.5px]">
                      ✓ Accessible civic relief shelter. Access roads dry and passable. 11kV grid supply energized.
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* Lost Lake InfoWindow */}
            {activeLake && (
              <InfoWindow
                position={{
                  lat: activeLake.geometry.coordinates[1],
                  lng: activeLake.geometry.coordinates[0],
                }}
                onCloseClick={() => setActiveLake(null)}
              >
                <div className="p-1 max-w-[270px] text-slate-800">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {activeLake.properties.status.replace('_', ' ')}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 mt-1">{activeLake.properties.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    Historical: {activeLake.properties.historical_area_ha} ha · Remaining: {activeLake.properties.current_area_ha} ha
                  </p>
                  <p className="text-[10.5px] text-slate-600 mt-1">
                    Replaced by: {activeLake.properties.replaced_by}
                  </p>

                  {activeLake.properties.coinciding_hotspots && activeLake.properties.coinciding_hotspots.length > 0 && (
                    <div className="mt-2 p-1.5 rounded bg-amber-50 border border-amber-200 text-[10.5px] text-amber-950 leading-tight">
                      <strong>🚨 {activeLake.properties.coinciding_hotspots.length} GCC Chronic Flood Hotspots inside basin:</strong>
                      <p className="text-[10px] text-amber-900 mt-1 line-clamp-3">
                        {activeLake.properties.coinciding_hotspots.slice(0, 4).join(', ')}
                        {activeLake.properties.coinciding_hotspots.length > 4 && ` +${activeLake.properties.coinciding_hotspots.length - 4} more`}
                      </p>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* GCC Flood Hotspot InfoWindow */}
            {activeHotspot && (
              <InfoWindow
                position={{
                  lat: activeHotspot.geometry.coordinates[1],
                  lng: activeHotspot.geometry.coordinates[0],
                }}
                onCloseClick={() => setActiveHotspot(null)}
              >
                <div className="p-1 max-w-[280px] text-slate-800">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      GCC Chronic Flood Hotspot
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">#{activeHotspot.properties.slno}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">
                    {activeHotspot.properties.name}
                  </h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    Source: {activeHotspot.properties.source}
                  </p>

                  {activeHotspot.properties.coinciding_lost_lake ? (
                    <div className="mt-2 p-1.5 rounded bg-indigo-50 border border-indigo-200 text-[10.5px] text-indigo-950 leading-tight">
                      <strong>💧 Hydrological Root Cause:</strong><br />
                      Sits {activeHotspot.properties.dist_to_lost_lake_m !== undefined && activeHotspot.properties.dist_to_lost_lake_m <= 800 ? 'directly inside' : `${activeHotspot.properties.dist_to_lost_lake_m}m from`} the historical <strong>{activeHotspot.properties.coinciding_lost_lake}</strong> basin. Rainwater naturally ponds in this encroached depression.
                    </div>
                  ) : (
                    <div className="mt-2 p-1.5 rounded bg-slate-50 border border-slate-200 text-[10.5px] text-slate-700 leading-tight">
                      <strong>⚠️ Inundation Node:</strong> Low-gradient micro-catchment subject to surface runoff stagnation during peak monsoon.
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Compact Bottom Legend with Representative Icon Badges */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-3 shadow-xs text-[11px] text-slate-700 hidden sm:block">
          <div className="font-bold text-slate-900 mb-2 text-[11px] uppercase tracking-wider">
            {isLive ? 'Map Legend (Live Fair Weather)' : 'Map Legend (Cyclone Simulation Deluge)'}
          </div>
          <div className="flex flex-col gap-1.5">
            {isLive ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-sky-600 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <Zap className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Energized Substation (242/242 Online)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-sky-600 border border-indigo-400 ring-1 ring-indigo-200 flex items-center justify-center shadow-2xs shrink-0">
                    <Zap className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Ancestral Lakebed Basin (Normal Baseline)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <Home className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Accessible Relief Shelter (162/162 Open)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                  </div>
                  <span>GCC Chronic Flood Hotspot (53 Ground-Truth Points)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center shadow-2xs shrink-0">
                    <Droplet className="w-2.5 h-2.5 text-indigo-600 fill-indigo-600" />
                  </div>
                  <span>Historical Lost Lake Footprint</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-rose-600 border border-white flex items-center justify-center shadow-2xs shrink-0 animate-pulse">
                    <Zap className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Substation on Lakebed (De-energize Order)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <Zap className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Critical Oceanic Surge Substation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-sky-600 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <Zap className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Standard TNEB Substation (Energized)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <Home className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Safe Haven Relief Shelter</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-600 border border-white flex items-center justify-center shadow-2xs shrink-0 animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                  </div>
                  <span>Compromised Relief Shelter (Inundated)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                  </div>
                  <span>GCC Chronic Flood Hotspot (Inundation Point)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
