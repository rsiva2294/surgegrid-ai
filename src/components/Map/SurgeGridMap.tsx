import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';
import type { 
  SubstationRiskNode, 
  WardVulnerabilityNode, 
  ShelterGridFusionNode, 
  WeatherNextTimestep 
} from '../../types/surgegrid';

interface SurgeGridMapProps {
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

export const SurgeGridMap: React.FC<SurgeGridMapProps> = ({
  currentTimestep,
  substations,
  wardsVulnerability,
  wardsGeoJson,
  shelters,
  drainsGeoJson,
  riversGeoJson,
  selectedSubstation,
  selectedWard,
  selectedShelter,
  onSelectSubstation,
  onSelectWard,
  onSelectShelter
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const baseTilesRef = useRef<{ light: L.TileLayer; sat: L.TileLayer } | null>(null);
  const wardsLayerRef = useRef<L.GeoJSON | null>(null);
  const riversLayerRef = useRef<L.GeoJSON | null>(null);
  const drainsLayerRef = useRef<L.GeoJSON | null>(null);
  const substationsLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const tieLineLayerRef = useRef<L.Polyline | null>(null);
  const surgeCircleRef = useRef<L.Circle | null>(null);
  const cycloneMarkerRef = useRef<L.Marker | null>(null);

  const [baseMapType, setBaseMapType] = useState<'light' | 'sat'>('light');
  const [showWards, setShowWards] = useState(true);
  const [showSubstations, setShowSubstations] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [showDrains, setShowDrains] = useState(false);
  const [showTieLines, setShowTieLines] = useState(true);
  const [showSurgeRadius, setShowSurgeRadius] = useState(true);
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const chennaiCenter: L.LatLngExpression = [13.0450, 80.2400];
    const map = L.map(mapContainerRef.current, {
      center: chennaiCenter,
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    const lightTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    const satTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    lightTiles.addTo(map);
    baseTilesRef.current = { light: lightTiles, sat: satTiles };

    substationsLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Base Map (Light vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const tiles = baseTilesRef.current;
    if (!map || !tiles) return;

    if (baseMapType === 'light') {
      if (map.hasLayer(tiles.sat)) map.removeLayer(tiles.sat);
      if (!map.hasLayer(tiles.light)) map.addLayer(tiles.light);
    } else {
      if (map.hasLayer(tiles.light)) map.removeLayer(tiles.light);
      if (!map.hasLayer(tiles.sat)) map.addLayer(tiles.sat);
    }
  }, [baseMapType]);

  // Render Rivers GeoJSON (Adyar, Cooum, Kosasthalaiyar, Buckingham Canal)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (riversLayerRef.current) {
      map.removeLayer(riversLayerRef.current);
      riversLayerRef.current = null;
    }

    if (riversGeoJson && showRivers) {
      const rivers = L.geoJSON(riversGeoJson, {
        style: () => ({
          color: '#38bdf8',
          weight: 4,
          opacity: 0.85,
          lineJoin: 'round'
        }),
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.name) {
            layer.bindTooltip(`<div class="text-xs font-semibold text-cyan-300">🌊 ${feature.properties.name}</div>`, {
              sticky: true,
              className: 'custom-map-tooltip'
            });
          }
        }
      }).addTo(map);
      riversLayerRef.current = rivers;
    }
  }, [riversGeoJson, showRivers]);

  // Render Drains GeoJSON
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (drainsLayerRef.current) {
      map.removeLayer(drainsLayerRef.current);
      drainsLayerRef.current = null;
    }

    if (drainsGeoJson && showDrains) {
      const drains = L.geoJSON(drainsGeoJson, {
        style: (feature) => {
          const isUphill = feature && feature.properties && feature.properties.is_uphill;
          return {
            color: isUphill ? '#f43f5e' : '#0d9488',
            weight: isUphill ? 2.5 : 1.5,
            opacity: isUphill ? 0.9 : 0.6,
            dashArray: isUphill ? '4, 4' : undefined
          };
        },
        onEachFeature: (feature, layer) => {
          const props = (feature && feature.properties) || {};
          layer.bindTooltip(
            `<div class="text-[11px] font-mono leading-tight p-1.5">
              <div class="font-bold ${props.is_uphill ? 'text-rose-400' : 'text-teal-400'}">
                ${props.is_uphill ? '⚠️ UPHILL DRAIN (Backflow Risk)' : '✅ Gravity Drain'}
              </div>
              <div class="text-slate-300 mt-0.5">Slope: ${props.slope || 0}% | Road Elev: ${props.road_elevation_m || 0}m</div>
            </div>`,
            { sticky: true, className: 'custom-map-tooltip' }
          );
        }
      }).addTo(map);
      drainsLayerRef.current = drains;
    }
  }, [drainsGeoJson, showDrains]);

  // Render Wards GeoJSON with Inundation Heat
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (wardsLayerRef.current) {
      map.removeLayer(wardsLayerRef.current);
      wardsLayerRef.current = null;
    }

    if (wardsGeoJson && showWards) {
      const wardMap = new Map(wardsVulnerability.map(w => [w.ward_number, w]));

      const wards = L.geoJSON(wardsGeoJson, {
        style: (feature) => {
          const wardNum = feature && feature.properties && (feature.properties.ward_no || feature.properties.ward_number || feature.properties.WARD_NO);
          const vuln = wardMap.get(Number(wardNum));
          
          let fillColor = '#06b6d4';
          let fillOpacity = 0.22;

          if (vuln) {
            if (vuln.flood_risk_category === 'SEVERE_INUNDATION_ZONE') {
              fillColor = '#ef4444';
              fillOpacity = 0.55;
            } else if (vuln.flood_risk_category === 'MODERATE_WATERLOGGING_ZONE') {
              fillColor = '#f59e0b';
              fillOpacity = 0.38;
            }
          }

          const isSelected = selectedWard && selectedWard.ward_number === Number(wardNum);

          return {
            fillColor,
            fillOpacity: isSelected ? 0.75 : fillOpacity,
            color: isSelected ? '#ffffff' : '#334155',
            weight: isSelected ? 2.5 : 1,
            dashArray: isSelected ? undefined : '2, 2'
          };
        },
        onEachFeature: (feature, layer) => {
          const wardNum = Number(feature && feature.properties && (feature.properties.ward_no || feature.properties.ward_number || feature.properties.WARD_NO));
          const vuln = wardMap.get(wardNum);

          layer.on({
            click: () => {
              if (vuln) onSelectWard(vuln);
            },
            mouseover: () => {
              if ('setStyle' in layer) {
                (layer as L.Path).setStyle({
                  weight: 2,
                  color: '#67e8f9',
                  fillOpacity: 0.65
                });
              }
            },
            mouseout: () => {
              if (wardsLayerRef.current) wardsLayerRef.current.resetStyle(layer);
            }
          });

          if (vuln) {
            const catColor = vuln.flood_risk_category === 'SEVERE_INUNDATION_ZONE' ? 'text-rose-400 font-bold' : vuln.flood_risk_category === 'MODERATE_WATERLOGGING_ZONE' ? 'text-amber-400 font-semibold' : 'text-cyan-400';
            layer.bindTooltip(
              `<div class="text-xs font-mono p-1.5 leading-tight">
                <div class="font-bold text-white">Ward ${vuln.ward_number} (Zone ${vuln.zone_number})</div>
                <div class="${catColor}">${vuln.flood_risk_category.replace(/_/g, ' ')}</div>
                <div class="text-slate-300 text-[10px] mt-1">Mean Elev: ${vuln.elevation_mean_m}m MSL | Runoff: ${vuln.simulated_surface_runoff_mm}mm</div>
              </div>`,
              { sticky: true, className: 'custom-map-tooltip' }
            );
          }
        }
      }).addTo(map);

      wardsLayerRef.current = wards;
    }
  }, [wardsGeoJson, wardsVulnerability, showWards, selectedWard, onSelectWard]);

  // Render Substations Markers
  useEffect(() => {
    const layerGroup = substationsLayerRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();

    if (!showSubstations) return;

    substations.forEach((sub) => {
      const [lon, lat] = sub.coordinates;
      const isCritical = sub.risk_category === 'CRITICAL_SURGE_RISK';
      const isHigh = sub.risk_category === 'HIGH_WATERLOGGING_RISK';
      const isSelected = selectedSubstation && selectedSubstation.name === sub.name;

      const markerColor = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981';

      const customIcon = L.divIcon({
        className: 'custom-substation-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            ${isCritical ? '<div class="absolute w-7 h-7 rounded-full bg-rose-500/40 animate-ping"></div>' : ''}
            <div class="w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'border-white scale-125 ring-4 ring-cyan-400/60' : 'border-slate-900'} shadow-lg transition-transform duration-200" style="background-color: ${markerColor}">
              <svg class="w-3.5 h-3.5 text-slate-950 font-bold" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      marker.on('click', () => {
        onSelectSubstation(sub);
      });

      const catColor = isCritical ? 'text-rose-400 font-bold' : isHigh ? 'text-amber-400' : 'text-emerald-400';
      marker.bindTooltip(
        `<div class="p-1.5 font-mono text-xs leading-tight">
          <div class="font-bold text-white flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" style="background-color: ${markerColor}"></span>
            ${sub.name} (${sub.circle})
          </div>
          <div class="text-[11px] mt-0.5 ${catColor}">${sub.risk_category.replace(/_/g, ' ')}</div>
          <div class="text-slate-300 text-[10px] mt-1">
            Ground Elev: ${sub.elevation_m}m MSL | Coast: ${sub.distance_to_coastline_km}km | Feeders: ${sub.connected_feeders_count}
          </div>
          <div class="text-cyan-400 text-[10px] mt-0.5">Click for GEE 10-Band Telemetry & SOP</div>
        </div>`,
        { sticky: true, className: 'custom-map-tooltip' }
      );

      layerGroup.addLayer(marker);
    });
  }, [substations, showSubstations, selectedSubstation, onSelectSubstation]);

  // Render Relief Shelters Markers & Backup Tie-Lines
  useEffect(() => {
    const layerGroup = sheltersLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;
    layerGroup.clearLayers();

    if (tieLineLayerRef.current) {
      map.removeLayer(tieLineLayerRef.current);
      tieLineLayerRef.current = null;
    }

    if (!showShelters) return;

    shelters.forEach((shelter) => {
      const [lon, lat] = shelter.coordinates;
      const isAtRisk = shelter.grid_power_resilience.shelter_grid_status === 'AT_RISK_GRID_ISOLATION';
      const isSelected = selectedShelter && selectedShelter.shelter_id === shelter.shelter_id;

      const markerColor = isAtRisk ? '#f59e0b' : '#06b6d4';

      const customIcon = L.divIcon({
        className: 'custom-shelter-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-5 h-5 rounded-md flex items-center justify-center border-2 ${isSelected ? 'border-white scale-125 ring-4 ring-amber-400/60' : 'border-slate-950'} shadow-lg transition-transform duration-200" style="background-color: ${markerColor}">
              <svg class="w-3 h-3 text-slate-950" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      marker.on('click', () => {
        onSelectShelter(shelter);
      });

      marker.bindTooltip(
        `<div class="p-1.5 font-mono text-xs leading-tight">
          <div class="font-bold text-white">🏛️ ${shelter.address}</div>
          <div class="text-cyan-300 text-[11px]">Ward ${shelter.ward} (${shelter.zone})</div>
          <div class="mt-1 text-[10px] ${isAtRisk ? 'text-amber-400 font-bold' : 'text-emerald-400'}">
            ${isAtRisk ? '⚠️ AT RISK: Requires 11kV Backup Switch' : '✅ Grid Resilient Node'}
          </div>
          <div class="text-slate-400 text-[10px] mt-0.5">Backup: ${shelter.grid_power_resilience.backup_safe_substation.name} (${shelter.grid_power_resilience.backup_safe_substation.distance_km}km)</div>
        </div>`,
        { sticky: true, className: 'custom-map-tooltip' }
      );

      layerGroup.addLayer(marker);
    });

    // Draw Emergency 11kV Tie-Line for selected shelter
    if (showTieLines && selectedShelter) {
      const [shelterLon, shelterLat] = selectedShelter.coordinates;
      const backupSubName = selectedShelter.grid_power_resilience.backup_safe_substation.name;
      const backupSub = substations.find(s => 
        s.name.toLowerCase().includes(backupSubName.toLowerCase()) || 
        backupSubName.toLowerCase().includes(s.name.toLowerCase())
      );

      if (backupSub) {
        const [subLon, subLat] = backupSub.coordinates;
        const line = L.polyline([[shelterLat, shelterLon], [subLat, subLon]], {
          color: '#38bdf8',
          weight: 3.5,
          dashArray: '8, 8',
          opacity: 0.95
        }).addTo(map);

        line.bindTooltip(
          `<div class="text-xs font-mono font-bold text-cyan-300 p-1">
            ⚡ 11kV Emergency Tie-Line: ${backupSub.name} ➔ Shelter
            <div class="text-[10px] text-slate-300 font-normal">Distance: ${selectedShelter.grid_power_resilience.backup_safe_substation.distance_km} km</div>
          </div>`, 
          { sticky: true, className: 'custom-map-tooltip' }
        );

        tieLineLayerRef.current = line;
      }
    }
  }, [shelters, showShelters, selectedShelter, showTieLines, substations, onSelectShelter]);

  // Dynamic Storm Surge Radius Indicator & Cyclone Eye Tracker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (surgeCircleRef.current) {
      map.removeLayer(surgeCircleRef.current);
      surgeCircleRef.current = null;
    }

    if (cycloneMarkerRef.current) {
      map.removeLayer(cycloneMarkerRef.current);
      cycloneMarkerRef.current = null;
    }

    if (showSurgeRadius && currentTimestep) {
      const surgeHeight = currentTimestep.simulated_storm_surge_msl_m;
      const windKmh = currentTimestep.wind_speed_10m_kmh;
      const radiusMeters = Math.max(3000, surgeHeight * 3200 + windKmh * 45);
      const coastalOrigin: L.LatLngExpression = [13.0475, 80.2824];

      const surgeColor = surgeHeight >= 2.0 ? '#ef4444' : surgeHeight >= 1.0 ? '#f59e0b' : '#06b6d4';

      const surgeCircle = L.circle(coastalOrigin, {
        radius: radiusMeters,
        color: surgeColor,
        weight: 1.5,
        fillColor: surgeColor,
        fillOpacity: surgeHeight >= 2.0 ? 0.28 : surgeHeight >= 1.0 ? 0.18 : 0.10,
        dashArray: '6, 6'
      }).addTo(map);

      surgeCircle.bindTooltip(
        `<div class="p-1 font-mono text-xs">
          <div class="font-bold text-white">🌊 Coastal Storm Surge Reach</div>
          <div class="${surgeHeight >= 2.0 ? 'text-rose-400 font-bold' : 'text-amber-300'}">Height: +${surgeHeight.toFixed(2)}m MSL</div>
          <div class="text-slate-400 text-[10px]">Active Wave Inundation Radius: ${(radiusMeters / 1000).toFixed(1)} km</div>
        </div>`,
        { sticky: true, className: 'custom-map-tooltip' }
      );

      surgeCircleRef.current = surgeCircle;

      // Cyclone Eye position simulation based on distance
      const distanceKm = currentTimestep.cyclone_distance_to_chennai_km;
      const bearingRad = (135 * Math.PI) / 180;
      const latOffset = (distanceKm / 111) * Math.cos(bearingRad);
      const lonOffset = (distanceKm / (111 * Math.cos(13 * Math.PI / 180))) * Math.sin(bearingRad);
      const cyclonePos: L.LatLngExpression = [13.0450 - Math.abs(latOffset), 80.2400 + Math.abs(lonOffset)];

      const cycloneIcon = L.divIcon({
        className: 'custom-cyclone-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="absolute w-12 h-12 rounded-full border-2 border-rose-500/50 animate-ping"></div>
            <div class="w-10 h-10 rounded-full bg-rose-600/80 backdrop-blur-md border border-white/80 shadow-2xl flex items-center justify-center text-white font-bold text-xs">
              🌀
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const eyeMarker = L.marker(cyclonePos, { icon: cycloneIcon }).addTo(map);
      eyeMarker.bindTooltip(
        `<div class="p-1.5 font-mono text-xs leading-tight">
          <div class="font-bold text-rose-400">CYCLONE EYE (WeatherNext 3)</div>
          <div class="text-white mt-0.5">Distance: ${distanceKm.toFixed(0)} km</div>
          <div class="text-amber-300 text-[10px]">Eye Pressure: ${currentTimestep.mean_sea_level_pressure_hpa} hPa</div>
          <div class="text-sky-300 text-[10px]">Sustained Wind: ${Math.round(currentTimestep.wind_speed_10m_kmh)} km/h</div>
        </div>`,
        { sticky: true, className: 'custom-map-tooltip' }
      );
      cycloneMarkerRef.current = eyeMarker;
    }
  }, [currentTimestep, showSurgeRadius]);

  // Fly to selected item
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedSubstation) {
      const [lon, lat] = selectedSubstation.coordinates;
      map.flyTo([lat, lon], 14, { duration: 1.2 });
    } else if (selectedShelter) {
      const [lon, lat] = selectedShelter.coordinates;
      map.flyTo([lat, lon], 14, { duration: 1.2 });
    }
  }, [selectedSubstation, selectedShelter]);

  // Fly-to corridor helpers
  const flyToCorridor = (lat: number, lon: number, zoom: number = 13) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], zoom, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* The Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls & Quick Hotspot Navigator (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto select-none">
        {/* Map Style & Zoom */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setBaseMapType(baseMapType === 'light' ? 'sat' : 'light')}
            className={`px-2.5 py-1 rounded-xl text-xs font-sans font-medium transition-all cursor-pointer ${
              baseMapType === 'light' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
            title="Toggle Light Base / Satellite Imagery"
          >
            {baseMapType === 'light' ? '🗺️ Light Gray' : '🛰️ Satellite'}
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-bold cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-bold cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
        </div>

        {/* Quick Fly-To Corridors Pill Bar */}
        <div className="flex flex-wrap gap-1 bg-white/95 backdrop-blur-md border border-slate-200/90 p-1.5 rounded-2xl shadow-sm max-w-sm">
          <button
            onClick={() => flyToCorridor(12.9350, 80.2300, 13)}
            className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-[11px] text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer font-medium"
          >
            📍 OMR Coastal Basin
          </button>
          <button
            onClick={() => flyToCorridor(13.0100, 80.2600, 14)}
            className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-[11px] text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 transition-all cursor-pointer font-medium"
          >
            🌊 Adyar Estuary
          </button>
          <button
            onClick={() => flyToCorridor(13.2000, 80.3200, 13)}
            className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-amber-50 text-[11px] text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-200 transition-all cursor-pointer font-medium"
          >
            ⚓ Ennore Port Grid
          </button>
          <button
            onClick={() => flyToCorridor(13.0450, 80.2400, 12)}
            className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-700 border border-slate-200 transition-all cursor-pointer font-medium"
          >
            🏙️ Full City
          </button>
        </div>
      </div>

      {/* Floating Layer Visibility Palette (Top Right) */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto select-none">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm p-3 flex flex-col gap-2 min-w-[210px]">
          <div 
            onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
            className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer pb-1 border-b border-slate-100"
          >
            <div className="flex items-center gap-1.5 text-blue-600">
              <Layers className="w-4 h-4" />
              <span>Multi-Hazard Layers</span>
            </div>
            <span className="text-[10px] text-slate-400">{isLayersMenuOpen ? '▲' : '▼'}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-slate-900/60 transition-colors">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                TNEB Substations (242)
              </span>
              <input
                type="checkbox"
                checked={showSubstations}
                onChange={(e) => setShowSubstations(e.target.checked)}
                className="rounded accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
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

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
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

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
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

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
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

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-1 bg-rose-400 rounded"></span>
                Uphill Backflow Drains
              </span>
              <input
                type="checkbox"
                checked={showDrains}
                onChange={(e) => setShowDrains(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
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

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
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
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto select-none">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm px-3.5 py-2 flex items-center gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Critical Surge (&le;3m MSL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>High Risk (3-6m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Safe Node (&gt;10m)</span>
          </div>
          <div className="flex items-center gap-1.5 hidden md:flex">
            <span className="w-2.5 h-2.5 rounded bg-sky-500"></span>
            <span>Resilient Shelter</span>
          </div>
        </div>
      </div>
    </div>
  );
};