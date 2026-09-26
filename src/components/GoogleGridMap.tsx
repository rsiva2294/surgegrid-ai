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
// Extended offshore eastward into Bay of Bengal (~80.85° E) to reveal approaching Cyclone Vortex & Storm Surge
const CHENNAI_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 13.45,
  south: 12.70,
  west: 79.90,
  east: 80.85,
};

const CHENNAI_RESTRICTION: google.maps.MapRestriction = {
  latLngBounds: CHENNAI_BOUNDS,
  strictBounds: true,
};

// High-contrast Tempest Command Center Map Style for Cyclone Simulation Deluge
// Dramatic emergency dark navy/slate ops theme: dark storm oceans, muted roads, glowing hazard status
const cycloneMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] }, // Dark Slate 900
  { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f1f5f9' }, { weight: 1.5 }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#082f49' }], // Tempest ocean deep navy
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
];

// Controller component to dynamically set styles and enforce Chennai restriction on the active map instance
const MapStyleController: React.FC<{ isLive: boolean; hoursToLandfall: number }> = ({
  isLive,
  hoursToLandfall,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setOptions({
      styles: isLive ? cleanMapStyles : cycloneMapStyles,
      restriction: CHENNAI_RESTRICTION,
      minZoom: 9,
      maxZoom: 18,
    });
  }, [map, isLive, hoursToLandfall]);

  return null;
};

// Helper to safely access window.google.maps without crashing before SDK finishes loading
const getGoogleMaps = () => {
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).google?.maps?.Size === 'function' &&
    typeof (window as any).google?.maps?.Point === 'function'
  ) {
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
  const scaledSize = typeof gMaps?.Size === 'function' ? new gMaps.Size(size, size) : undefined;
  const anchor = typeof gMaps?.Point === 'function' ? new gMaps.Point(r, r) : undefined;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize,
    anchor,
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
  const scaledSize = typeof gMaps?.Size === 'function' ? new gMaps.Size(size, size) : undefined;
  const anchor = typeof gMaps?.Point === 'function' ? new gMaps.Point(r, r) : undefined;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize,
    anchor,
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
  const scaledSize = typeof gMaps?.Size === 'function' ? new gMaps.Size(size, size) : undefined;
  const anchor = typeof gMaps?.Point === 'function' ? new gMaps.Point(r, r) : undefined;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize,
    anchor,
  };
};
// Generate high-resolution animated SVG icon for the Cyclone Vortex Eye
const getCycloneEyeMarkerIcon = (_windKmh: number = 100, size: number = 38) => {
  const r = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <radialGradient id="cycloneGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#991b1b" stop-opacity="0.95"/>
        <stop offset="60%" stop-color="#dc2626" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#ea580c" stop-opacity="0.5"/>
      </radialGradient>
    </defs>
    <circle cx="${r}" cy="${r}" r="${r - 2}" fill="url(#cycloneGrad)" stroke="#fecaca" stroke-width="2"/>
    <path d="M ${r} 4 A ${r - 4} ${r - 4} 0 0 1 ${size - 4} ${r} A ${r / 2} ${r / 2} 0 0 1 ${r} ${r} Z" fill="#ffffff" opacity="0.85"/>
    <path d="M ${r} ${size - 4} A ${r - 4} ${r - 4} 0 0 1 4 ${r} A ${r / 2} ${r / 2} 0 0 1 ${r} ${r} Z" fill="#ffffff" opacity="0.85"/>
    <circle cx="${r}" cy="${r}" r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.5"/>
  </svg>`;

  const gMaps = getGoogleMaps();
  const scaledSize = typeof gMaps?.Size === 'function' ? new gMaps.Size(size, size) : undefined;
  const anchor = typeof gMaps?.Point === 'function' ? new gMaps.Point(r, r) : undefined;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize,
    anchor,
  };
};

// Physical Bay of Bengal storm track toward Chennai landfall
export const getCycloneEyePosition = (hoursToLandfall: number) => {
  if (hoursToLandfall >= 48) return { lat: 12.00, lng: 80.78 };
  if (hoursToLandfall >= 36) return { lat: 12.35, lng: 80.65 };
  if (hoursToLandfall >= 24) return { lat: 12.70, lng: 80.50 };
  if (hoursToLandfall >= 12) return { lat: 12.95, lng: 80.40 };
  return { lat: 13.08, lng: 80.29 }; // Landfall near Chennai Port / Marina
};

// Calculate dynamic operational state of substation based on simulation horizon
export const getSubstationSimulationState = (
  sub: Substation,
  isLive: boolean,
  hoursToLandfall: number
) => {
  if (isLive) {
    return {
      status: 'ENERGIZED',
      bgColor: '#0284c7', // Sky-600
      strokeColor: '#ffffff',
      isRing: !!sub.ancestral_lakebed_hazard,
      ringColor: '#818cf8',
      size: sub.ancestral_lakebed_hazard ? 22 : 18,
      statusLabel: 'Energized (Normal Baseline)',
      description: 'Grid operating at normal dry-weather baseline.',
    };
  }

  const isLakebed = !!sub.ancestral_lakebed_hazard;
  const isCritical = sub.risk_category === 'CRITICAL_SURGE_RISK';
  const isHighRisk = sub.risk_category === 'HIGH_WATERLOGGING_RISK';
  const isLowElev = sub.elevation_m <= 4.0;

  // T-48h: Watch advisory (120mm rain)
  if (hoursToLandfall >= 48) {
    if (isLakebed) {
      return {
        status: 'WATCH',
        bgColor: '#0284c7',
        strokeColor: '#ffffff',
        isRing: true,
        ringColor: '#f59e0b',
        size: 22,
        statusLabel: 'Advisory Watch: Saturated Basin',
        description: 'Precautionary monitoring. Soil moisture rising in former lake basin.',
      };
    }
    return {
      status: 'ENERGIZED',
      bgColor: '#0284c7',
      strokeColor: '#ffffff',
      isRing: false,
      ringColor: '',
      size: 18,
      statusLabel: 'Energized (Live Grid)',
      description: 'Cyclone center 600km offshore in Bay of Bengal.',
    };
  }

  // T-36h: Anticipatory staging (245mm rain, Chembarambakkam at 89%)
  if (hoursToLandfall >= 36) {
    if (isLakebed) {
      return {
        status: 'WARNING',
        bgColor: '#f59e0b', // Amber-500
        strokeColor: '#ffffff',
        isRing: true,
        ringColor: '#d97706',
        size: 24,
        statusLabel: 'Alert: Clay Switchyard Saturation',
        description: 'Clay soil saturated. Preemptive 11kV load transfers initiated.',
      };
    }
    if (isCritical) {
      return {
        status: 'WATCH',
        bgColor: '#0284c7',
        strokeColor: '#ffffff',
        isRing: true,
        ringColor: '#ea580c',
        size: 20,
        statusLabel: 'Coastal Surge Watch',
        description: 'High tide surge warning active.',
      };
    }
    return {
      status: 'ENERGIZED',
      bgColor: '#0284c7',
      strokeColor: '#ffffff',
      isRing: false,
      ringColor: '',
      size: 18,
      statusLabel: 'Energized',
      description: 'Grid supply active.',
    };
  }

  // T-24h: Mandatory load transfer phase (340mm rain)
  if (hoursToLandfall >= 24) {
    if (isLakebed) {
      return {
        status: 'DE_ENERGIZED',
        bgColor: '#e11d48', // Rose-600
        strokeColor: '#ffffff',
        isRing: true,
        ringColor: '#f43f5e',
        size: 26,
        statusLabel: 'Mandatory De-energization: Waterlogged Lakebed',
        description: 'Switchyard flooded > 18 inches. Breakers tripped to prevent catastrophic explosion.',
      };
    }
    if (isCritical || isLowElev) {
      return {
        status: 'WARNING',
        bgColor: '#ea580c', // Orange-600
        strokeColor: '#ffffff',
        isRing: true,
        ringColor: '#f97316',
        size: 22,
        statusLabel: 'Low Elevation Surge Hazard',
        description: 'Coastal and micro-drain backflow entering switchyard. Auxiliary pumps deployed.',
      };
    }
    return {
      status: 'ENERGIZED',
      bgColor: '#0284c7',
      strokeColor: '#ffffff',
      isRing: false,
      ringColor: '',
      size: 18,
      statusLabel: 'Energized',
      description: 'Normal feeder supply.',
    };
  }

  // T-12h: Fluvial river surge peaks (415mm rain, 30,000 cusecs sluice discharge)
  if (hoursToLandfall >= 12) {
    if (isLakebed || isCritical) {
      return {
        status: 'DE_ENERGIZED',
        bgColor: '#dc2626', // Red-600
        strokeColor: '#ffffff',
        isRing: true,
        ringColor: '#ef4444',
        size: 26,
        statusLabel: 'Emergency Shutdown: Fluvial & Oceanic Inundation',
        description: 'Submerged under Adyar river / coastal storm surge. Breakers locked out.',
      };
    }
    if (isHighRisk || isLowElev) {
      return {
        status: 'WARNING',
        bgColor: '#ea580c',
        strokeColor: '#ffffff',
        isRing: false,
        ringColor: '',
        size: 22,
        statusLabel: 'High Inundation Risk',
        description: 'Adjacent drainage overflowing into transformer yard.',
      };
    }
    return {
      status: 'ENERGIZED',
      bgColor: '#0284c7',
      strokeColor: '#ffffff',
      isRing: false,
      ringColor: '',
      size: 18,
      statusLabel: 'Energized',
      description: 'Feeder load transferred to high-ground backbone.',
    };
  }

  // Landfall (T-0h): Eyewall passage (485mm rain, 134 km/h wind, +4.05m oceanic surge)
  if (isLakebed || isCritical || isHighRisk || isLowElev) {
    return {
      status: 'DE_ENERGIZED',
      bgColor: '#991b1b', // Dark Red 800
      strokeColor: '#ffffff',
      isRing: true,
      ringColor: '#f87171',
      size: 28,
      statusLabel: 'CATASTROPHIC INUNDATION / SHUTDOWN',
      description: '134 km/h hurricane eyewall & +4.05m storm surge breach. Complete feeder isolation.',
    };
  }

  return {
    status: 'ENERGIZED',
    bgColor: '#0284c7',
    strokeColor: '#ffffff',
    isRing: false,
    ringColor: '',
    size: 18,
    statusLabel: 'Hardened Inland Backbone (Energized)',
    description: 'Elevated bedrock substation maintaining islanded power.',
  };
};

// Calculate dynamic operational state of relief shelters
export const getShelterSimulationState = (
  sh: ReliefShelter,
  isLive: boolean,
  hoursToLandfall: number
) => {
  if (isLive) {
    return {
      isCompromised: false,
      statusLabel: 'Safe Haven Relief Shelter · Open & Dry',
      statusClass: 'bg-emerald-100 text-emerald-800',
    };
  }

  const baseCompromised = sh.shelter_viability_status === 'COMPROMISED_INUNDATION';
  const elev = sh.road_elevation_m || sh.elevation_m || 5;

  let isCompromised = false;
  if (hoursToLandfall <= 0) {
    isCompromised = baseCompromised || elev < 4.0;
  } else if (hoursToLandfall <= 12) {
    isCompromised = baseCompromised || elev < 3.2;
  } else if (hoursToLandfall <= 24) {
    isCompromised = baseCompromised;
  } else if (hoursToLandfall <= 36) {
    isCompromised = baseCompromised && elev < 2.5;
  } else {
    isCompromised = false;
  }

  return {
    isCompromised,
    statusLabel: isCompromised ? 'COMPROMISED INUNDATION' : 'SAFE HAVEN',
    statusClass: isCompromised ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
  };
};

// Vector Overlays Component: Lost Lakes, Dynamic Cyclone Wind Fields, River Fluvial Surges, and Coastal Inundation
const MapOverlays: React.FC<{
  lostLakes: LostWaterBody[];
  showLostLakes: boolean;
  onSelectLake: (lake: LostWaterBody) => void;
  viewMode: 'LIVE' | 'SIMULATION';
  hoursToLandfall: number;
}> = ({ lostLakes, showLostLakes, onSelectLake, viewMode, hoursToLandfall }) => {
  const map = useMap();
  const isLive = viewMode === 'LIVE';

  useEffect(() => {
    if (!map || typeof (window as any).google?.maps?.Circle !== 'function') return;

    const circles: google.maps.Circle[] = [];
    const polylines: google.maps.Polyline[] = [];

    // 1. Draw 15 Lost Water Bodies (ancestral lakebeds)
    if (showLostLakes) {
      lostLakes.forEach((lake) => {
        const [lng, lat] = lake.geometry.coordinates;
        const radius = lake.properties.approx_radius_m || 800;

        const circle = new google.maps.Circle({
          strokeColor: isLive ? '#6366f1' : '#818cf8',
          strokeOpacity: isLive ? 0.45 : 0.85,
          strokeWeight: 1.5,
          fillColor: '#818cf8',
          fillOpacity: isLive ? 0.12 : 0.3,
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

    // 2. In SIMULATION mode: Draw Dynamic Cyclone Wind Fields, Fluvial Overflow & Oceanic Surge
    if (!isLive) {
      const { lat: eyeLat, lng: eyeLng } = getCycloneEyePosition(hoursToLandfall);

      // Outer Tropical Gale Wind Field (60–90 km/h)
      const outerGaleCircle = new google.maps.Circle({
        strokeColor: '#f97316',
        strokeOpacity: 0.65,
        strokeWeight: 1.5,
        fillColor: '#ea580c',
        fillOpacity: 0.08,
        map,
        center: { lat: eyeLat, lng: eyeLng },
        radius:
          hoursToLandfall >= 48
            ? 32000
            : hoursToLandfall >= 36
            ? 44000
            : hoursToLandfall >= 24
            ? 58000
            : 72000,
        clickable: false,
      });
      circles.push(outerGaleCircle);

      // Inner Destructive Eyewall Ring (115–134 km/h hurricane core)
      const innerEyewallCircle = new google.maps.Circle({
        strokeColor: '#ef4444',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#991b1b',
        fillOpacity: 0.22,
        map,
        center: { lat: eyeLat, lng: eyeLng },
        radius:
          hoursToLandfall >= 48
            ? 12000
            : hoursToLandfall >= 36
            ? 18000
            : hoursToLandfall >= 24
            ? 26000
            : 36000,
        clickable: false,
      });
      circles.push(innerEyewallCircle);

      // 3. Adyar River Sluice Discharge Fluvial Overflow Corridor
      if (hoursToLandfall <= 36) {
        const adyarCoords = [
          { lat: 13.008, lng: 80.005 }, // Chembarambakkam sluice gates
          { lat: 13.01, lng: 80.06 }, // Poonamallee bypass
          { lat: 13.012, lng: 80.11 }, // Kundrathur
          { lat: 13.015, lng: 80.155 }, // Ramapuram
          { lat: 13.018, lng: 80.195 }, // Saidapet Bridge
          { lat: 13.015, lng: 80.225 }, // Kotturpuram
          { lat: 13.01, lng: 80.258 }, // Adyar Estuary
        ];

        const adyarLine = new google.maps.Polyline({
          path: adyarCoords,
          geodesic: true,
          strokeColor: hoursToLandfall <= 12 ? '#dc2626' : '#ea580c',
          strokeOpacity: hoursToLandfall <= 12 ? 0.85 : 0.65,
          strokeWeight:
            hoursToLandfall <= 0 ? 18 : hoursToLandfall <= 12 ? 14 : hoursToLandfall <= 24 ? 10 : 6,
          map,
        });
        polylines.push(adyarLine);
      }

      // 4. Cooum River Flash Flood Overflow Corridor
      if (hoursToLandfall <= 24) {
        const cooumCoords = [
          { lat: 13.075, lng: 80.11 }, // Thiruverkadu
          { lat: 13.073, lng: 80.17 }, // Maduravoyal
          { lat: 13.072, lng: 80.21 }, // Koyambedu
          { lat: 13.076, lng: 80.245 }, // Chetpet / Egmore
          { lat: 13.069, lng: 80.285 }, // Napier Bridge / Marina
        ];

        const cooumLine = new google.maps.Polyline({
          path: cooumCoords,
          geodesic: true,
          strokeColor: hoursToLandfall <= 12 ? '#dc2626' : '#f97316',
          strokeOpacity: hoursToLandfall <= 12 ? 0.8 : 0.55,
          strokeWeight: hoursToLandfall <= 0 ? 14 : hoursToLandfall <= 12 ? 10 : 6,
          map,
        });
        polylines.push(cooumLine);
      }

      // 5. Coastal Storm Surge Inundation Ribbon along Bay of Bengal
      const coastalSurgeCoords = [
        { lat: 13.36, lng: 80.34 }, // Minjur / Ennore Outer Port
        { lat: 13.25, lng: 80.33 }, // Ennore Creek
        { lat: 13.16, lng: 80.31 }, // Kasimedu Harbour
        { lat: 13.08, lng: 80.29 }, // Chennai Port
        { lat: 13.04, lng: 80.28 }, // Marina Beach
        { lat: 12.99, lng: 80.27 }, // Besant Nagar
        { lat: 12.92, lng: 80.26 }, // Thiruvanmiyur
        { lat: 12.83, lng: 80.25 }, // ECR / Kovalam
      ];

      const coastalSurgeLine = new google.maps.Polyline({
        path: coastalSurgeCoords,
        geodesic: true,
        strokeColor: hoursToLandfall <= 12 ? '#0284c7' : '#38bdf8',
        strokeOpacity: hoursToLandfall <= 12 ? 0.75 : 0.45,
        strokeWeight:
          hoursToLandfall <= 0
            ? 26
            : hoursToLandfall <= 12
            ? 18
            : hoursToLandfall <= 24
            ? 12
            : hoursToLandfall <= 36
            ? 8
            : 4,
        map,
      });
      polylines.push(coastalSurgeLine);
    }

    return () => {
      circles.forEach((c) => c.setMap(null));
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, lostLakes, showLostLakes, onSelectLake, isLive, hoursToLandfall]);

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
  const hoursToLandfall = !isLive ? (currentStep?.hours_to_landfall ?? 0) : 999;
  const cycloneEyePos = getCycloneEyePosition(hoursToLandfall);

  // Active InfoWindow Targets
  const [activeSub, setActiveSub] = useState<Substation | null>(null);
  const [activeShelter, setActiveShelter] = useState<ReliefShelter | null>(null);
  const [activeLake, setActiveLake] = useState<LostWaterBody | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<FloodHotspot | null>(null);
  const [showCycloneInfoWindow, setShowCycloneInfoWindow] = useState<boolean>(false);

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
            styles={isLive ? cleanMapStyles : cycloneMapStyles}
            defaultCenter={{ lat: 13.05, lng: 80.18 }}
            defaultZoom={11}
            minZoom={10}
            maxZoom={18}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
            internalUsageAttributionIds={['gmp_git_agentskills_v1']}
          >
            {/* Dynamic Base Map POI Decluttering & Dark Storm Controller */}
            <MapStyleController isLive={isLive} hoursToLandfall={hoursToLandfall} />

            {/* Vector Overlays for Lost Lakes, Cyclone Eye, and Surge Corridors */}
            <MapOverlays
              lostLakes={lostLakes}
              showLostLakes={showLostLakes}
              onSelectLake={(lake) => {
                setActiveLake(lake);
                setActiveSub(null);
                setActiveShelter(null);
                setActiveHotspot(null);
                setShowCycloneInfoWindow(false);
              }}
              viewMode={viewMode}
              hoursToLandfall={hoursToLandfall}
            />

            {/* 1. Markers for 242 TNEB Substations with Dynamic Operational State */}
            {showSubstations &&
              substations.map((sub) => {
                const [lng, lat] = sub.coordinates;
                const simState = getSubstationSimulationState(sub, isLive, hoursToLandfall);
                const icon = getSubstationMarkerIcon(
                  simState.bgColor,
                  simState.strokeColor,
                  simState.isRing,
                  simState.ringColor,
                  simState.size
                );

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
                      setShowCycloneInfoWindow(false);
                      onSelectSubstation(sub);
                    }}
                    title={`${sub.name} (${simState.statusLabel})`}
                  />
                );
              })}

            {/* 2. Markers for 162 GCC Relief Shelters with Dynamic Inundation Viability */}
            {showShelters &&
              shelters.map((sh, idx) => {
                const [lng, lat] = sh.coordinates;
                const shelterState = getShelterSimulationState(sh, isLive, hoursToLandfall);
                const icon = getShelterMarkerIcon(
                  shelterState.isCompromised ? '#dc2626' : '#16a34a',
                  '#ffffff',
                  shelterState.isCompromised,
                  shelterState.isCompromised ? 24 : 18
                );

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
                      setShowCycloneInfoWindow(false);
                    }}
                    title={`${sh.name || sh.address} (${shelterState.statusLabel})`}
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
                      setShowCycloneInfoWindow(false);
                    }}
                    title={`GCC Flood Hotspot: ${hs.properties.name}${
                      hs.properties.coinciding_lost_lake
                        ? ` (inside ancestral ${hs.properties.coinciding_lost_lake})`
                        : ''
                    }`}
                  />
                );
              })}

            {/* 4. Dynamic Cyclone Eye Vortex (Bay of Bengal Approaching Track) */}
            {!isLive && (
              <Marker
                position={cycloneEyePos}
                icon={getCycloneEyeMarkerIcon(
                  currentStep?.wind_speed_10m_kmh || 120,
                  hoursToLandfall <= 0 ? 46 : 38
                )}
                zIndex={9999}
                onClick={() => {
                  setShowCycloneInfoWindow(true);
                  setActiveSub(null);
                  setActiveShelter(null);
                  setActiveLake(null);
                  setActiveHotspot(null);
                }}
                title={`Cyclone Eye Vortex · ${currentStep?.wind_speed_10m_kmh || 120} km/h · ${
                  hoursToLandfall === 0 ? 'LANDFALL (T-0h)' : `T-${hoursToLandfall}h`
                }`}
              />
            )}

            {/* Cyclone Eye InfoWindow */}
            {showCycloneInfoWindow && !isLive && (
              <InfoWindow
                position={cycloneEyePos}
                onCloseClick={() => setShowCycloneInfoWindow(false)}
              >
                <div className="p-1 max-w-[280px] text-slate-900">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                      {currentStep?.alert_phase || 'VERY SEVERE CYCLONIC STORM'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-rose-700">
                      {hoursToLandfall === 0 ? 'LANDFALL' : `T-${hoursToLandfall}h`}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Cyclone Eye Center</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-tight">
                    {currentStep?.phase_description || 'Intense convective eyewall approaching northern Tamil Nadu coast.'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] bg-slate-100 p-2 rounded">
                    <div>
                      <span className="text-slate-500 block">Sustained Winds</span>
                      <span className="font-mono font-bold text-rose-700">{currentStep?.wind_speed_10m_kmh || 134} km/h</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Central Pressure</span>
                      <span className="font-mono font-bold text-slate-800">{currentStep?.mean_sea_level_pressure_hpa || 972} hPa</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">24h Cumulative Rain</span>
                      <span className="font-mono font-bold text-sky-700">{currentStep?.rainfall_24h_cumulative_mm || 485} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Peak Storm Surge</span>
                      <span className="font-mono font-bold text-indigo-700">+{currentStep?.simulated_storm_surge_msl_m || 4.05}m MSL</span>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Substation InfoWindow */}
            {activeSub && (() => {
              const subSim = getSubstationSimulationState(activeSub, isLive, hoursToLandfall);
              return (
                <InfoWindow
                  position={{ lat: activeSub.coordinates[1], lng: activeSub.coordinates[0] }}
                  onCloseClick={() => setActiveSub(null)}
                >
                  <div className="p-1 max-w-[280px] text-slate-800">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isLive
                            ? 'bg-emerald-100 text-emerald-800'
                            : subSim.status === 'DE_ENERGIZED'
                            ? 'bg-rose-600 text-white font-bold'
                            : subSim.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-900 font-bold'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {isLive ? 'ENERGIZED (NORMAL BASELINE)' : subSim.statusLabel}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        Elev: {activeSub.elevation_m}m MSL
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 leading-tight">{activeSub.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Circle: {activeSub.circle} · Feeders: {activeSub.connected_feeders_count}
                    </p>

                    {!isLive && (
                      <div className={`mt-2 p-1.5 rounded text-[10.5px] leading-tight ${
                        subSim.status === 'DE_ENERGIZED'
                          ? 'bg-rose-50 border border-rose-200 text-rose-900'
                          : subSim.status === 'WARNING'
                          ? 'bg-amber-50 border border-amber-200 text-amber-900'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}>
                        <strong>Simulation State (T-{hoursToLandfall}h):</strong><br />
                        {subSim.description}
                      </div>
                    )}

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
                        <span className={`font-bold ${subSim.status === 'DE_ENERGIZED' ? 'text-rose-700' : 'text-sky-700'}`}>
                          {subSim.status} (T-{hoursToLandfall}h)
                        </span>
                      )}
                    </div>
                  </div>
                </InfoWindow>
              );
            })()}

            {/* Shelter InfoWindow */}
            {activeShelter && (() => {
              const shelterSim = getShelterSimulationState(activeShelter, isLive, hoursToLandfall);
              return (
                <InfoWindow
                  position={{ lat: activeShelter.coordinates[1], lng: activeShelter.coordinates[0] }}
                  onCloseClick={() => setActiveShelter(null)}
                >
                  <div className="p-1 max-w-[270px] text-slate-800">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          shelterSim.isCompromised
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {shelterSim.statusLabel}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Ward {activeShelter.ward} (Zone {activeShelter.zone})
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 leading-tight">
                      {activeShelter.name || activeShelter.address}
                    </h4>

                    {shelterSim.isCompromised ? (
                      <div className="mt-2 p-1.5 rounded bg-rose-50 border border-rose-200 text-[10.5px] text-rose-900 leading-tight">
                        <strong>⚠️ Cyclone Inundation Hazard:</strong> {activeShelter.compromised_reason || 'Inundation depth exceeds 0.6m in approach access roads.'}<br />
                        {activeShelter.recommended_safe_shelter && (
                          <div className="mt-1 pt-1 border-t border-rose-200 font-semibold text-rose-950">
                            ↳ Reroute Evacuees: {activeShelter.recommended_safe_shelter.rerouting_advisory}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 p-1 rounded bg-emerald-50 text-emerald-800 text-[10.5px]">
                        ✓ Accessible civic relief shelter. Access roads dry and passable. 11kV grid supply energized.
                      </p>
                    )}
                  </div>
                </InfoWindow>
              );
            })()}

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

        {/* Dynamic Atmospheric Storm Overlay in SIMULATION Mode */}
        {!isLive && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {/* Dark Stormy Atmospheric Vignette */}
            <div className="absolute inset-0 bg-radial-[at_top_right] from-sky-950/20 via-transparent to-slate-950/40" />

            {/* Animated Wind and Rain Deluge Overlay */}
            <div
              className="absolute inset-0 opacity-30 mix-blend-screen"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  rgba(255, 255, 255, 0.18) 0px,
                  rgba(255, 255, 255, 0.18) 1.5px,
                  transparent 1.5px,
                  transparent 14px
                )`,
                animation: 'rainFall 0.45s linear infinite',
              }}
            />

            {/* Floating Cyclone Tactical HUD Badge */}
            <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md border border-rose-500/50 text-white p-2.5 sm:p-3 rounded-xl shadow-2xl pointer-events-auto flex flex-col gap-1.5 min-w-[210px] text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                  </span>
                  <span className="font-bold tracking-wide text-rose-300 text-[10px] uppercase">
                    {currentStep?.alert_phase || 'CYCLONIC DELUGE'}
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px] text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800/60">
                  {hoursToLandfall === 0 ? 'LANDFALL' : `T-${hoursToLandfall}h`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 py-1 border-y border-slate-800 text-center font-mono">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Wind</div>
                  <div className="font-bold text-rose-400 text-[11px]">
                    {currentStep?.wind_speed_10m_kmh || 120} <span className="text-[9px]">km/h</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Rain 24h</div>
                  <div className="font-bold text-sky-400 text-[11px]">
                    {currentStep?.rainfall_24h_cumulative_mm || 485} <span className="text-[9px]">mm</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Surge MSL</div>
                  <div className="font-bold text-indigo-400 text-[11px]">
                    +{currentStep?.simulated_storm_surge_msl_m || 4.05} <span className="text-[9px]">m</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-300 leading-tight">
                {hoursToLandfall === 0
                  ? '⚠️ Eyewall crossing Chennai coast. Peak oceanic surge breach.'
                  : `Approaching coast. Expected landfall in ${hoursToLandfall} hours.`}
              </div>
            </div>
          </div>
        )}

        {/* Compact Bottom Legend with Representative Icon Badges */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-3 shadow-xs text-[11px] text-slate-700 hidden sm:block max-w-[280px]">
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
                  <div className="w-4 h-4 rounded-full bg-rose-700 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <span className="text-[10px]">🌀</span>
                  </div>
                  <span className="font-semibold text-rose-800">Approaching Cyclone Eye Vortex</span>
                </div>
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
                  <span>Critical Surge Risk Substation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-sky-600 border border-white flex items-center justify-center shadow-2xs shrink-0">
                    <Zap className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                  <span>Standard TNEB Substation (Energized)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-600 border border-white flex items-center justify-center shadow-2xs shrink-0 animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                  </div>
                  <span>Compromised Relief Shelter (Inundated)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-1.5 rounded-full bg-rose-600 shrink-0"></div>
                  <span>Adyar & Cooum River Fluvial Overflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-2 rounded-full bg-sky-500 shrink-0"></div>
                  <span>Coastal Storm Surge Ribbon (+4.05m)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
