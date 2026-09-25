/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { 
  SubstationRiskNode, 
  WardVulnerabilityNode, 
  ShelterGridFusionNode, 
  WeatherNextTimestep 
} from '../../types/surgegrid';
import { 
  Layers, 
  Key, 
  MapPin, 
  ExternalLink, 
  Info 
} from 'lucide-react';

interface GoogleSurgeGridMapProps {
  currentTimestep: WeatherNextTimestep | null;
  substations: SubstationRiskNode[];
  wardsVulnerability: WardVulnerabilityNode[];
  wardsGeoJson: any | null;
  shelters: ShelterGridFusionNode[];
  drainsGeoJson: any | null;
  riversGeoJson: any | null;
  selectedSubstation: SubstationRiskNode | null;
  selectedWard: WardVulnerabilityNode | null;
  selectedShelter: ShelterGridFusionNode | null;
  onSelectSubstation: (sub: SubstationRiskNode | null) => void;
  onSelectWard: (ward: WardVulnerabilityNode | null) => void;
  onSelectShelter: (shelter: ShelterGridFusionNode | null) => void;
}

export const GoogleSurgeGridMap: React.FC<GoogleSurgeGridMapProps> = ({
  currentTimestep,
  substations,
  wardsVulnerability,
  wardsGeoJson,
  shelters,
  riversGeoJson,
  selectedSubstation,
  selectedWard,
  selectedShelter,
  onSelectSubstation,
  onSelectWard,
  onSelectShelter
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const [apiKey, setApiKey] = useState<string>(() => {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('gmaps_api_key') || '';
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Layer toggles
  const [showSubstations, setShowSubstations] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showWards, setShowWards] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [showTieLines, setShowTieLines] = useState(true);
  const [showSurgeRadius, setShowSurgeRadius] = useState(true);
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  // References to active map overlays for cleanup
  const markersRef = useRef<google.maps.Marker[]>([]);
  const shelterMarkersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const tieLineRef = useRef<google.maps.Polyline | null>(null);
  const surgeCircleRef = useRef<google.maps.Circle | null>(null);
  const cycloneMarkerRef = useRef<google.maps.Marker | null>(null);

  // Light, breezy Google Maps custom styling
  const lightMapStyles: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#1e293b' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#64748b' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#ecfdf5' }] // soft mint
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#059669' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#e2e8f0' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#fed7aa' }] // soft peach highway
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#fdba74' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#bae6fd' }] // fresh breezy sky-blue water
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#0284c7' }]
    }
  ];

  // Initialize Google Maps using modern functional API
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;
    try {
      if (apiKey) {
        setOptions({
          key: apiKey,
          v: 'weekly'
        });
      } else {
        setOptions({
          v: 'weekly'
        });
      }
    } catch {
      // ignore if options already set
    }

    Promise.all([
      importLibrary('maps'),
      importLibrary('geometry')
    ])
      .then(([mapsLib]) => {
        if (!isMounted || !mapContainerRef.current) return;

        const { Map } = mapsLib;
        const chennai = { lat: 13.0450, lng: 80.2400 };
        const map = new Map(mapContainerRef.current, {
          center: chennai,
          zoom: 12,
          minZoom: 10,
          maxZoom: 18,
          mapTypeId: 'roadmap',
          styles: lightMapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.LEFT_BOTTOM
          },
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_LEFT
          },
          streetViewControl: false,
          fullscreenControl: false
        });

        mapRef.current = map;
        setMapLoaded(true);
        setLoadError(null);
      })
      .catch((err: any) => {
        console.warn('Google Maps JS API load error:', err);
        setLoadError(err?.message || 'Unable to load Google Maps. Please configure an API Key.');
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Render Substations on Google Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    if (!showSubstations) return;

    substations.forEach(sub => {
      const [lng, lat] = sub.coordinates;
      const isCritical = sub.risk_category === 'CRITICAL_SURGE_RISK';
      const isHigh = sub.risk_category === 'HIGH_WATERLOGGING_RISK';
      const isSelected = selectedSubstation && selectedSubstation.name === sub.name;

      const fillColor = isCritical ? '#e11d48' : isHigh ? '#d97706' : '#059669';

      // SVG Lightning Marker Symbol
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: `${sub.name} (${sub.circle})`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 10 : isCritical ? 8 : 6,
          fillColor: fillColor,
          fillOpacity: 1,
          strokeColor: isSelected ? '#0284c7' : '#ffffff',
          strokeWeight: isSelected ? 3.5 : 2
        },
        zIndex: isSelected ? 1000 : isCritical ? 500 : 100
      });

      marker.addListener('click', () => {
        onSelectSubstation(sub);
      });

      markersRef.current.push(marker);
    });
  }, [substations, showSubstations, selectedSubstation, mapLoaded, onSelectSubstation]);

  // Render Relief Shelters on Google Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    shelterMarkersRef.current.forEach(m => m.setMap(null));
    shelterMarkersRef.current = [];

    if (!showShelters) return;

    shelters.forEach(sh => {
      const [lng, lat] = sh.coordinates;
      const isAtRisk = sh.grid_power_resilience.shelter_grid_status === 'AT_RISK_GRID_ISOLATION';
      const isSelected = selectedShelter && selectedShelter.shelter_id === sh.shelter_id;

      const fillColor = isAtRisk ? '#f59e0b' : '#0284c7';

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: `Relief Shelter: ${sh.address} (Ward ${sh.ward})`,
        icon: {
          path: 'M 0 -7 L 7 0 L 0 7 L -7 0 Z', // Diamond shape for shelters
          scale: isSelected ? 1.5 : 1.1,
          fillColor: fillColor,
          fillOpacity: 0.95,
          strokeColor: isSelected ? '#1e293b' : '#ffffff',
          strokeWeight: isSelected ? 2.5 : 1.5
        },
        zIndex: isSelected ? 900 : 200
      });

      marker.addListener('click', () => {
        onSelectShelter(sh);
      });

      shelterMarkersRef.current.push(marker);
    });
  }, [shelters, showShelters, selectedShelter, mapLoaded, onSelectShelter]);

  // Render Wards GeoJSON on Google Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !wardsGeoJson || !showWards) return;

    const wardMap = new Map(wardsVulnerability.map(w => [w.ward_number, w]));

    // Clear existing data layers
    map.data.forEach((feature: any) => map.data.remove(feature));

    try {
      map.data.addGeoJson(wardsGeoJson);

      map.data.setStyle((feature: any) => {
        const wardNum = Number(feature.getProperty('ward_no') || feature.getProperty('ward_number') || feature.getProperty('WARD_NO'));
        const vuln = wardMap.get(wardNum);
        const isSelected = selectedWard && selectedWard.ward_number === wardNum;

        let fillColor = '#e0f2fe'; // soft blue
        let strokeColor = '#94a3b8';
        let fillOpacity = 0.25;

        if (vuln) {
          if (vuln.flood_risk_category === 'SEVERE_INUNDATION_ZONE') {
            fillColor = '#fecdd3'; // soft light rose
            strokeColor = '#f43f5e';
            fillOpacity = isSelected ? 0.65 : 0.45;
          } else if (vuln.flood_risk_category === 'MODERATE_WATERLOGGING_ZONE') {
            fillColor = '#fef3c7'; // soft amber
            strokeColor = '#f59e0b';
            fillOpacity = isSelected ? 0.60 : 0.35;
          }
        }

        return {
          fillColor,
          fillOpacity: isSelected ? 0.70 : fillOpacity,
          strokeColor: isSelected ? '#0f172a' : strokeColor,
          strokeWeight: isSelected ? 2.5 : 0.8
        };
      });

      const clickListener = map.data.addListener('click', (event: any) => {
        const wardNum = Number(event.feature.getProperty('ward_no') || event.feature.getProperty('ward_number') || event.feature.getProperty('WARD_NO'));
        const vuln = wardMap.get(wardNum);
        if (vuln) onSelectWard(vuln);
      });

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    } catch (e) {
      console.warn('Error styling GeoJSON on Google Map:', e);
    }
  }, [wardsGeoJson, wardsVulnerability, showWards, selectedWard, mapLoaded, onSelectWard]);

  // Render Rivers on Google Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    if (!riversGeoJson || !showRivers) return;

    try {
      if (riversGeoJson.features) {
        riversGeoJson.features.forEach((feature: any) => {
          if (feature.geometry.type === 'LineString') {
            const path = feature.geometry.coordinates.map((coord: [number, number]) => ({
              lat: coord[1],
              lng: coord[0]
            }));

            const polyline = new google.maps.Polyline({
              path,
              geodesic: true,
              strokeColor: '#0284c7', // vibrant river blue
              strokeOpacity: 0.85,
              strokeWeight: 3.5,
              map: map
            });

            polylinesRef.current.push(polyline);
          }
        });
      }
    } catch (err) {
      console.warn('Error rendering river polylines on Google Map:', err);
    }
  }, [riversGeoJson, showRivers, mapLoaded]);

  // Render 11kV Emergency Tie-Line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (tieLineRef.current) {
      tieLineRef.current.setMap(null);
      tieLineRef.current = null;
    }

    if (!showTieLines || !selectedShelter) return;

    const [shelterLng, shelterLat] = selectedShelter.coordinates;
    const backupName = selectedShelter.grid_power_resilience.backup_safe_substation.name;
    const backupSub = substations.find(s => 
      s.name.toLowerCase().includes(backupName.toLowerCase()) || 
      backupName.toLowerCase().includes(s.name.toLowerCase())
    );

    if (backupSub) {
      const [subLng, subLat] = backupSub.coordinates;
      const lineSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        scale: 3
      };

      const poly = new google.maps.Polyline({
        path: [
          { lat: shelterLat, lng: shelterLng },
          { lat: subLat, lng: subLng }
        ],
        strokeColor: '#0284c7',
        strokeOpacity: 0,
        icons: [{
          icon: lineSymbol,
          offset: '0',
          repeat: '12px'
        }],
        map: map
      });

      tieLineRef.current = poly;
    }
  }, [selectedShelter, showTieLines, substations, mapLoaded]);

  // Render Storm Surge Circle & Cyclone Eye
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (surgeCircleRef.current) {
      surgeCircleRef.current.setMap(null);
      surgeCircleRef.current = null;
    }

    if (cycloneMarkerRef.current) {
      cycloneMarkerRef.current.setMap(null);
      cycloneMarkerRef.current = null;
    }

    if (showSurgeRadius && currentTimestep) {
      const surgeHeight = currentTimestep.simulated_storm_surge_msl_m;
      const windKmh = currentTimestep.wind_speed_10m_kmh;
      const radiusMeters = Math.max(3000, surgeHeight * 3200 + windKmh * 45);
      const coastalOrigin = { lat: 13.0475, lng: 80.2824 };

      const surgeColor = surgeHeight >= 2.0 ? '#e11d48' : surgeHeight >= 1.0 ? '#d97706' : '#0284c7';

      const circle = new google.maps.Circle({
        strokeColor: surgeColor,
        strokeOpacity: 0.6,
        strokeWeight: 1.5,
        fillColor: surgeColor,
        fillOpacity: 0.12,
        map: map,
        center: coastalOrigin,
        radius: radiusMeters
      });

      surgeCircleRef.current = circle;

      // Cyclone Eye offshore marker
      const distanceKm = currentTimestep.cyclone_distance_to_chennai_km;
      const bearingRad = (135 * Math.PI) / 180;
      const latOffset = (distanceKm / 111) * Math.cos(bearingRad);
      const lonOffset = (distanceKm / (111 * Math.cos(13 * Math.PI / 180))) * Math.sin(bearingRad);
      const eyePos = { lat: 13.0450 - Math.abs(latOffset), lng: 80.2400 + Math.abs(lonOffset) };

      const eyeMarker = new google.maps.Marker({
        position: eyePos,
        map: map,
        title: `Cyclone Center: ${distanceKm.toFixed(0)}km from Chennai`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#e11d48',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        zIndex: 2000
      });

      cycloneMarkerRef.current = eyeMarker;
    }
  }, [currentTimestep, showSurgeRadius, mapLoaded]);

  // Fly-to smooth pan
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (selectedSubstation) {
      const [lng, lat] = selectedSubstation.coordinates;
      map.panTo({ lat, lng });
      map.setZoom(14);
    } else if (selectedShelter) {
      const [lng, lat] = selectedShelter.coordinates;
      map.panTo({ lat, lng });
      map.setZoom(14);
    }
  }, [selectedSubstation, selectedShelter, mapLoaded]);

  const saveCustomKey = () => {
    if (keyInput.trim()) {
      localStorage.setItem('gmaps_api_key', keyInput.trim());
      setApiKey(keyInput.trim());
      setIsKeyModalOpen(false);
    }
  };

  const flyTo = (lat: number, lng: number, zoom = 13) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(zoom);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 z-0">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="google-map-container w-full h-full" />

      {/* Floating Controls: Corridor Presets & Map Key (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 select-none pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Configure Google Maps Platform Key"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>{apiKey ? 'Google Maps: Connected' : 'Google Maps Key'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <button
            onClick={() => flyTo(13.0450, 80.2400, 12)}
            className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>Chennai Recenter</span>
          </button>
        </div>

        {/* Quick Location Fly-to Pills */}
        <div className="flex flex-wrap gap-1 bg-white/95 backdrop-blur-md border border-slate-200/90 p-1.5 rounded-2xl shadow-sm max-w-sm">
          <button
            onClick={() => flyTo(12.9350, 80.2300, 13)}
            className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-[11px] text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer font-medium"
          >
            📍 OMR Coastal Basin
          </button>
          <button
            onClick={() => flyTo(13.0100, 80.2600, 14)}
            className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-[11px] text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 transition-all cursor-pointer font-medium"
          >
            🌊 Adyar Estuary
          </button>
          <button
            onClick={() => flyTo(13.2000, 80.3200, 13)}
            className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-amber-50 text-[11px] text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-200 transition-all cursor-pointer font-medium"
          >
            ⚓ Ennore Port Grid
          </button>
        </div>

        {loadError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 shadow-sm max-w-sm text-xs font-sans space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Google Maps Notice</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-snug">
              Google Maps JS API needs an API Key or Free Maps Demo Key to connect live roadmap tiles.
            </p>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Configure API Key / Free Demo Key →
            </button>
          </div>
        )}
      </div>

      {/* Layer Visibility Palette (Top Right) */}
      <div className="absolute top-4 right-4 z-10 select-none pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm p-3 flex flex-col gap-2 min-w-[220px]">
          <div 
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer pb-1 border-b border-slate-100"
          >
            <div className="flex items-center gap-1.5 text-blue-600">
              <Layers className="w-4 h-4" />
              <span>Map Layers</span>
            </div>
            <span className="text-[10px] text-slate-400">{isLayersOpen ? '▲' : '▼'}</span>
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-slate-700">
            <label className="flex items-center justify-between py-0.5 hover:text-slate-900 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                TNEB Substations (242)
              </span>
              <input
                type="checkbox"
                checked={showSubstations}
                onChange={(e) => setShowSubstations(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-0.5 hover:text-slate-900 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-md bg-amber-500"></span>
                Relief Shelters (162)
              </span>
              <input
                type="checkbox"
                checked={showShelters}
                onChange={(e) => setShowShelters(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-0.5 hover:text-slate-900 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-200 border border-rose-400"></span>
                Ward Flood Risk (200)
              </span>
              <input
                type="checkbox"
                checked={showWards}
                onChange={(e) => setShowWards(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-0.5 hover:text-slate-900 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-1 bg-sky-500 rounded"></span>
                Rivers & Waterways
              </span>
              <input
                type="checkbox"
                checked={showRivers}
                onChange={(e) => setShowRivers(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-0.5 hover:text-slate-900 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-1 border-b-2 border-dashed border-sky-500"></span>
                11kV Emergency Tie-Lines
              </span>
              <input
                type="checkbox"
                checked={showTieLines}
                onChange={(e) => setShowTieLines(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-0.5 hover:text-slate-900 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border border-rose-400 bg-rose-100"></span>
                Storm Surge Envelope
              </span>
              <input
                type="checkbox"
                checked={showSurgeRadius}
                onChange={(e) => setShowSurgeRadius(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 select-none pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm px-3.5 py-2 flex items-center gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Critical Surge (&le;3m MSL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>High Waterlogging (3-6m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Safe Substation (&gt;10m)</span>
          </div>
          <div className="flex items-center gap-1.5 hidden md:flex">
            <span className="w-2.5 h-2.5 rounded bg-sky-500"></span>
            <span>Relief Shelter</span>
          </div>
        </div>
      </div>

      {/* Google Maps API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
                <Key className="w-5 h-5" />
                <span>Google Maps Platform API Key</span>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Enter your Google Maps Platform API Key or Free Maps Demo Key to connect the live Google Maps JavaScript API with high-resolution vector and satellite layers.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">API Key</label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-[11px] text-blue-800 space-y-1 font-sans">
              <div className="font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Free Prototyping Demo Key
              </div>
              <p>
                You can generate a free Maps Demo Key without credit card setup from Google Maps Platform.
              </p>
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentskills_v1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-semibold underline hover:text-blue-700"
              >
                Get Free Demo Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomKey}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                Save & Load Google Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
