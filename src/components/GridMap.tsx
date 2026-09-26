import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Substation, LostWaterBody, ReliefShelter } from '../types';
import { Layers, Zap, Home, Droplet, AlertTriangle } from 'lucide-react';

interface GridMapProps {
  substations: Substation[];
  lostLakes: LostWaterBody[];
  shelters: ReliefShelter[];
  selectedSubstation?: Substation | null;
  onSelectSubstation: (sub: Substation | null) => void;
  lang?: 'en' | 'ta';
}

export const GridMap: React.FC<GridMapProps> = ({
  substations,
  lostLakes,
  shelters,
  onSelectSubstation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer Visibility States
  const [showSubstations, setShowSubstations] = useState(true);
  const [showLostLakes, setShowLostLakes] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showRivers, setShowRivers] = useState(true);

  // Layer Groups
  const subLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const lakesLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const sheltersLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const riversLayerGroupRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [13.05, 80.22],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      zoomControl: false,
    });

    // Clean, light CartoDB Positron tiles for civic clarity
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    subLayerGroupRef.current.addTo(map);
    lakesLayerGroupRef.current.addTo(map);
    sheltersLayerGroupRef.current.addTo(map);
    riversLayerGroupRef.current.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Layer Toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showSubstations) map.addLayer(subLayerGroupRef.current);
    else map.removeLayer(subLayerGroupRef.current);

    if (showLostLakes) map.addLayer(lakesLayerGroupRef.current);
    else map.removeLayer(lakesLayerGroupRef.current);

    if (showShelters) map.addLayer(sheltersLayerGroupRef.current);
    else map.removeLayer(sheltersLayerGroupRef.current);

    if (showRivers) map.addLayer(riversLayerGroupRef.current);
    else map.removeLayer(riversLayerGroupRef.current);
  }, [showSubstations, showLostLakes, showShelters, showRivers]);

  // Render 15 Lost Water Bodies (Polygons / Circles)
  useEffect(() => {
    const group = lakesLayerGroupRef.current;
    group.clearLayers();

    lostLakes.forEach((lake) => {
      const [lng, lat] = lake.geometry.coordinates;
      const radius = lake.properties.approx_radius_m || 800;

      const circle = L.circle([lat, lng], {
        radius,
        color: '#6366f1', // Indigo outline
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#818cf8',
        fillOpacity: 0.18,
      });

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #4338ca; background: #e0e7ff; padding: 2px 6px; rounded: 4px;">
              ${lake.properties.status.replace('_', ' ')}
            </span>
            <span style="font-size: 11px; font-weight: 600; color: #64748b;">
              ${lake.properties.historical_area_ha} ha historical
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0;">${lake.properties.name}</h4>
          ${lake.properties.name_ta ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 6px 0;">${lake.properties.name_ta}</p>` : ''}
          <div style="font-size: 11px; color: #334155; line-height: 1.4; margin-top: 6px;">
            <strong>Replaced by:</strong> ${lake.properties.replaced_by}<br/>
            <strong>Remaining:</strong> ${lake.properties.current_area_ha} ha<br/>
            <p style="margin: 4px 0 0 0; color: #475569; font-size: 10px;">${lake.properties.notes.substring(0, 140)}...</p>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
      group.addLayer(circle);
    });
  }, [lostLakes]);

  // Render 242 TNEB Substations
  useEffect(() => {
    const group = subLayerGroupRef.current;
    group.clearLayers();

    substations.forEach((sub) => {
      const [lng, lat] = sub.coordinates;
      const isLakebed = sub.ancestral_lakebed_hazard;
      const isCritical = sub.risk_category === 'CRITICAL_SURGE_RISK';

      // Determine marker color
      let markerColor = '#0284c7'; // Sky-600
      let strokeColor = '#0369a1';
      let radius = 6;

      if (isLakebed) {
        markerColor = '#e11d48'; // Rose-600
        strokeColor = '#9f1239';
        radius = 7.5;
      } else if (isCritical) {
        markerColor = '#ea580c'; // Orange-600
        strokeColor = '#c2410c';
        radius = 7;
      }

      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor: markerColor,
        color: strokeColor,
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      });

      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; max-width: 280px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${isLakebed ? '#9f1239' : '#0369a1'}; background: ${isLakebed ? '#ffe4e6' : '#e0f2fe'}; padding: 2px 6px; border-radius: 4px;">
              ${sub.risk_category.replace('_', ' ')}
            </span>
            <span style="font-size: 11px; font-weight: 700; font-family: monospace; color: #0f172a;">
              Elev: ${sub.elevation_m}m MSL
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 2px 0 4px 0;">${sub.name}</h4>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">Circle: ${sub.circle} · Connected Feeders: ${sub.connected_feeders_count}</p>
          
          ${
            isLakebed
              ? `
            <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 11px; color: #9f1239;">
              <strong>⚠️ Ancestral Lakebed Hazard:</strong><br/>
              Sits on drained <em>${sub.lakebed_details?.name}</em> bed. Saturated clay traps floodwater in switchyard (1.45x failure risk).
            </div>
          `
              : ''
          }

          <div style="font-size: 11px; color: #334155; margin-top: 4px;">
            <strong>Anticipatory Action:</strong><br/>
            <span style="font-size: 10.5px; color: #475569;">${sub.anticipatory_sop}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => onSelectSubstation(sub));
      group.addLayer(marker);
    });
  }, [substations, onSelectSubstation]);

  // Render 162 GCC Relief Shelters
  useEffect(() => {
    const group = sheltersLayerGroupRef.current;
    group.clearLayers();

    shelters.forEach((sh) => {
      const [lng, lat] = sh.coordinates;
      const isCompromised = sh.shelter_viability_status === 'COMPROMISED_INUNDATION';

      const marker = L.circleMarker([lat, lng], {
        radius: isCompromised ? 6.5 : 5,
        fillColor: isCompromised ? '#dc2626' : '#16a34a', // Red if compromised, green if safe
        color: isCompromised ? '#991b1b' : '#15803d',
        weight: 1.5,
        fillOpacity: 0.85,
      });

      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; max-width: 270px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${isCompromised ? '#991b1b' : '#15803d'}; background: ${isCompromised ? '#fee2e2' : '#dcfce7'}; padding: 2px 6px; border-radius: 4px;">
              ${isCompromised ? 'COMPROMISED INUNDATION' : 'SAFE HAVEN'}
            </span>
            <span style="font-size: 11px; color: #64748b;">
              Ward ${sh.ward} (Zone ${sh.zone})
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 2px 0 4px 0;">${sh.name || sh.address}</h4>
          
          ${
            isCompromised
              ? `
            <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 6px 8px; margin: 6px 0; font-size: 11px; color: #991b1b;">
              <strong>⚠️ Access Hazard:</strong> ${sh.compromised_reason}<br/>
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #fca5a5; font-weight: 600; color: #7f1d1d;">
                ↳ Reroute Evacuees: ${sh.recommended_safe_shelter?.rerouting_advisory}
              </div>
            </div>
          `
              : `
            <p style="font-size: 11px; color: #166534; background: #f0fdf4; padding: 4px 8px; border-radius: 4px; margin: 4px 0;">
              ✓ High-ground shelter. Primary 11kV grid feeder prioritized.
            </p>
          `
          }
        </div>
      `;

      marker.bindPopup(popupHtml);
      group.addLayer(marker);
    });
  }, [shelters]);

  // Render Key Fluvial River Corridors (Adyar, Cooum, Kosasthalaiyar)
  useEffect(() => {
    const group = riversLayerGroupRef.current;
    group.clearLayers();

    // Simplified approximate centerlines for river surge corridors
    const adyarCoords: [number, number][] = [
      [12.98, 80.08],
      [13.00, 80.12],
      [13.01, 80.17],
      [13.02, 80.21], // Saidapet
      [13.015, 80.24], // Kotturpuram
      [13.01, 80.27], // Adyar Estuary
    ];

    const cooumCoords: [number, number][] = [
      [13.07, 80.05],
      [13.075, 80.11],
      [13.07, 80.16],
      [13.075, 80.22],
      [13.07, 80.28], // Napier Bridge
    ];

    const kosasthalaiyarCoords: [number, number][] = [
      [13.20, 80.02],
      [13.22, 80.12],
      [13.22, 80.22],
      [13.21, 80.31], // Ennore Creek
    ];

    // Adyar Fluvial Line (Red highlight for Chembarambakkam discharge surge)
    const adyarLine = L.polyline(adyarCoords, {
      color: '#ef4444',
      weight: 4.5,
      opacity: 0.8,
      dashArray: '8, 6',
    });
    adyarLine.bindPopup(`
      <div style="font-family: inherit;">
        <h4 style="font-size: 12px; font-weight: 700; color: #b91c1c; margin: 0 0 2px 0;">Adyar River Fluvial Corridor</h4>
        <p style="font-size: 11px; color: #475569; margin: 0;">Carrying 18,500 cusecs emergency release from Chembarambakkam towards Saidapet & Guindy.</p>
      </div>
    `);
    group.addLayer(adyarLine);

    // Cooum Line
    const cooumLine = L.polyline(cooumCoords, {
      color: '#0284c7',
      weight: 3.5,
      opacity: 0.75,
    });
    cooumLine.bindPopup(`
      <div style="font-family: inherit;">
        <h4 style="font-size: 12px; font-weight: 700; color: #0369a1; margin: 0 0 2px 0;">Cooum River Corridor</h4>
        <p style="font-size: 11px; color: #475569; margin: 0;">Drainage channel for central Chennai urban runoff.</p>
      </div>
    `);
    group.addLayer(cooumLine);

    // Kosasthalaiyar Line (Amber highlight for Poondi discharge surge)
    const kosasthalaiyarLine = L.polyline(kosasthalaiyarCoords, {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 6',
    });
    kosasthalaiyarLine.bindPopup(`
      <div style="font-family: inherit;">
        <h4 style="font-size: 12px; font-weight: 700; color: #b45309; margin: 0 0 2px 0;">Kosasthalaiyar River Corridor</h4>
        <p style="font-size: 11px; color: #475569; margin: 0;">Carrying 15,200 cusecs emergency release from Poondi towards Manali & Ennore.</p>
      </div>
    `);
    group.addLayer(kosasthalaiyarLine);
  }, []);

  return (
    <div className="relative w-full h-[420px] sm:h-[560px] rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-50">
      {/* Top Floating Layer Controls */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2 shadow-xs flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1 px-1 mr-1 hidden sm:flex">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Layers:</span>
        </span>

        {/* Substations Toggle */}
        <button
          onClick={() => setShowSubstations(!showSubstations)}
          className={`flex items-center gap-1 px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
            showSubstations ? 'bg-sky-50 text-sky-800 border border-sky-300' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Zap className="w-3 h-3 text-sky-600" />
          <span>Substations (242)</span>
        </button>

        {/* Lost Lakes Toggle */}
        <button
          onClick={() => setShowLostLakes(!showLostLakes)}
          className={`flex items-center gap-1 px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
            showLostLakes ? 'bg-indigo-50 text-indigo-800 border border-indigo-300' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Droplet className="w-3 h-3 text-indigo-600" />
          <span>Lost Lakes (15)</span>
        </button>

        {/* Shelters Toggle */}
        <button
          onClick={() => setShowShelters(!showShelters)}
          className={`flex items-center gap-1 px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
            showShelters ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Home className="w-3 h-3 text-emerald-600" />
          <span>Shelters (162)</span>
        </button>

        {/* Rivers Toggle */}
        <button
          onClick={() => setShowRivers(!showRivers)}
          className={`flex items-center gap-1 px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
            showRivers ? 'bg-rose-50 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Surge Corridors</span>
        </button>
      </div>

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2.5 shadow-xs text-[11px] text-slate-600 hidden sm:block">
        <div className="font-semibold text-slate-900 mb-1.5 text-xs">Map Legend</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 inline-block border border-rose-800"></span>
            <span>Substation on Lost Lakebed (1.45x Risk)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block border border-orange-700"></span>
            <span>Critical Oceanic Surge Substation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-600 inline-block border border-sky-800"></span>
            <span>Standard TNEB Substation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
            <span>Safe Haven Relief Shelter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
            <span>Inundated / Compromised Shelter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-indigo-600 border-dashed bg-indigo-200/50 inline-block"></span>
            <span>Historical Lost Lake Footprint</span>
          </div>
        </div>
      </div>
    </div>
  );
};
