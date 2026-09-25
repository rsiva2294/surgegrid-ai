import React from 'react';
import type { 
  SubstationRiskNode, 
  WardVulnerabilityNode, 
  ShelterGridFusionNode 
} from '../../types/surgegrid';
import { 
  X, 
  Zap, 
  Mountain, 
  Droplets, 
  Wind, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Waves,
  Phone,
  FileText,
  Compass,
  CheckCircle2
} from 'lucide-react';

interface NodeInspectorDrawerProps {
  substation: SubstationRiskNode | null;
  ward: WardVulnerabilityNode | null;
  shelter: ShelterGridFusionNode | null;
  onClose: () => void;
}

export const NodeInspectorDrawer: React.FC<NodeInspectorDrawerProps> = ({
  substation,
  ward,
  shelter,
  onClose
}) => {
  if (!substation && !ward && !shelter) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[440px] bg-white/95 border-l border-slate-200 text-slate-800 backdrop-blur-xl z-30 shadow-2xl flex flex-col select-none transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/80 bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          {substation && (
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
          )}
          {ward && (
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
          )}
          {shelter && (
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
              {substation ? 'TNEB Substation Node' : ward ? 'GCC Ward Vulnerability' : 'GCC Relief Center Lifeline'}
            </div>
            <h2 className="text-sm font-bold text-slate-900 truncate max-w-[280px]">
              {substation ? substation.name : ward ? `Ward ${ward.ward_number} (Zone ${ward.zone_number})` : shelter?.address}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-all cursor-pointer shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {/* SUBSTATION VIEW */}
        {substation && (
          <>
            {/* Risk Classification Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-xs ${
              substation.risk_category === 'CRITICAL_SURGE_RISK'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : substation.risk_category === 'HIGH_WATERLOGGING_RISK'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold tracking-wide">{substation.risk_category.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white font-bold border border-slate-200 text-slate-800 shadow-2xs">
                Score: {substation.composite_risk_score.toFixed(1)}/100
              </span>
            </div>

            {/* Geographic & Topographic Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5 text-blue-600" />
                  ELEVATION (SRTM)
                </div>
                <div className={`text-base font-bold mt-0.5 ${substation.elevation_m <= 3.0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {substation.elevation_m} m <span className="text-xs font-normal text-slate-500">MSL</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-600" />
                  COAST DISTANCE
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {substation.distance_to_coastline_km} km
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  URBAN IMPERVIOUS
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {substation.urban_impervious_built_pct}%
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-indigo-600" />
                  PEAK RUNOFF
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {substation.simulated_surface_runoff_mm} mm
                </div>
              </div>
            </div>

            {/* Anticipatory Standard Operating Procedure (SOP) */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>PRE-LANDFALL ANTICIPATORY ACTION SOP</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {substation.anticipatory_sop}
              </p>
            </div>

            {/* Connected Grid Feeders & Outage History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                <span>CONNECTED 11kV FEEDERS ({substation.connected_feeders_count})</span>
                <span className="text-[11px] text-slate-500 font-normal">Q3 Outages: {substation.historical_q3_2026_outages}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {substation.feeders && substation.feeders.length > 0 ? (
                  substation.feeders.map((feeder, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-blue-700 shadow-2xs">
                      ⚡ {feeder}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs">No distribution feeders registered</span>
                )}
              </div>
            </div>

            {/* GEE Satellite Telemetry Stack */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-xs">
              <div className="text-[11px] text-slate-700 font-bold uppercase tracking-wider">
                Google Earth Engine Satellite Telemetry
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-600">Dynamic World Water Prob:</span>
                  <span className="text-blue-700 font-bold font-mono">{substation.dynamic_world_water_prob_2024_2026_pct}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-600">Sentinel-2 MNDWI Wetness:</span>
                  <span className="text-indigo-700 font-bold font-mono">{substation.sentinel2_mndwi_2024_2026 ?? -0.25}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-600">JRC Water Occurrence (1984-2021):</span>
                  <span className="text-slate-800 font-semibold font-mono">{substation.jrc_historical_water_occurrence_1984_2021_pct}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Soil Moisture Saturation:</span>
                  <span className="text-amber-700 font-bold font-mono">{substation.soil_moisture_saturation_pct}%</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* WARD VIEW */}
        {ward && (
          <>
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-xs ${
              ward.flood_risk_category === 'SEVERE_INUNDATION_ZONE'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : ward.flood_risk_category === 'MODERATE_WATERLOGGING_ZONE'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold tracking-wide">{ward.flood_risk_category.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold">MEAN ELEVATION</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {ward.elevation_mean_m} m MSL
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold">MIN ELEVATION</div>
                <div className="text-base font-bold text-rose-600 mt-0.5">
                  {ward.elevation_min_m} m MSL
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold">IMPERVIOUS BUILT</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {ward.urban_impervious_built_pct}%
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-[11px] text-slate-500 font-semibold">BENCHMARK RUNOFF</div>
                <div className="text-base font-bold text-blue-700 mt-0.5">
                  {ward.simulated_surface_runoff_mm} mm
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-xs">
              <div className="text-xs text-slate-700 font-bold uppercase tracking-wider">
                Ward Civil Defense Summary
              </div>
              <p className="text-xs text-slate-700 font-sans leading-relaxed">
                Ward {ward.ward_number} under Zone {ward.zone_number} exhibits {ward.urban_impervious_built_pct}% urban concrete cover. During Category 3 cyclonic benchmarks ({ward.cyclone_benchmark_rainfall_accum_mm}mm total rainfall), runoff generation exceeds {ward.simulated_surface_runoff_mm}mm.
              </p>
            </div>
          </>
        )}

        {/* SHELTER VIEW */}
        {shelter && (
          <>
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-xs ${
              shelter.grid_power_resilience.shelter_grid_status === 'AT_RISK_GRID_ISOLATION'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                {shelter.grid_power_resilience.shelter_grid_status === 'AT_RISK_GRID_ISOLATION' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span className="font-bold tracking-wide">
                  {shelter.grid_power_resilience.shelter_grid_status === 'AT_RISK_GRID_ISOLATION'
                    ? 'AT RISK: REQUIRES BACKUP SWITCH'
                    : 'GRID RESILIENT LIFELINE'}
                </span>
              </div>
            </div>

            {/* Officer Contact Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-xs">
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                NODAL DISASTER OFFICER
              </div>
              <div className="text-sm font-bold text-slate-900">{shelter.officer_in_charge}</div>
              <div className="text-blue-700 font-mono text-xs">{shelter.emergency_contact}</div>
            </div>

            {/* Grid Power Resilience Routing */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2 shadow-xs">
              <div className="text-xs text-blue-900 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-600" />
                11kV Grid Power Routing Protocol
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-500 text-[10px] font-semibold">PRIMARY SUPPLY SUBSTATION</div>
                  <div className="text-slate-900 font-bold">{shelter.grid_power_resilience.primary_substation.name}</div>
                  <div className="text-rose-600 text-[11px] font-medium">
                    Risk: {shelter.grid_power_resilience.primary_substation.risk_category} ({shelter.grid_power_resilience.primary_substation.elevation_m}m MSL)
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-blue-200">
                  <div className="text-blue-700 text-[10px] font-semibold">BACKUP SAFE TIE-LINE SUBSTATION</div>
                  <div className="text-slate-900 font-bold">{shelter.grid_power_resilience.backup_safe_substation.name}</div>
                  <div className="text-slate-600 text-[11px]">
                    Distance: {shelter.grid_power_resilience.backup_safe_substation.distance_km} km | Elevation: {shelter.grid_power_resilience.backup_safe_substation.elevation_m}m MSL
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-700 font-sans leading-relaxed pt-1">
                {shelter.grid_power_resilience.anticipatory_power_protocol}
              </p>
            </div>

            {/* Stormwater Drainage Status */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-xs">
              <div className="text-xs text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-sky-600" />
                Stormwater Drainage & Evacuation Route
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">BACKFLOW RISK</div>
                  <div className={`font-bold text-sm mt-0.5 ${shelter.stormwater_drainage.uphill_backflow_risk_pct > 20 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {shelter.stormwater_drainage.uphill_backflow_risk_pct}%
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">MIN ROAD ELEV</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {shelter.stormwater_drainage.min_road_elevation_m} m MSL
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                {shelter.evacuation_route_status.evacuation_advisory}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
