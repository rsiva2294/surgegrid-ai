import { useState, useEffect } from 'react';
import { DataLoader } from './services/dataLoader';
import type { 
  WeatherNextPayload, 
  WeatherNextTimestep, 
  SubstationRiskNode, 
  WardVulnerabilityNode, 
  ShelterGridFusionNode 
} from './types/surgegrid';

import { TopTelemetryNav } from './components/Header/TopTelemetryNav';
import { GoogleSurgeGridMap } from './components/Map/GoogleSurgeGridMap';
import { SurgeGridMap } from './components/Map/SurgeGridMap';
import { WeatherNextSlider } from './components/Timeline/WeatherNextSlider';
import { GeminiCopilotPanel } from './components/Copilot/GeminiCopilotPanel';
import { NodeInspectorDrawer } from './components/Inspector/NodeInspectorDrawer';
import { ParametricInsuranceModal } from './components/Modals/ParametricInsuranceModal';
import { DrainHydrologyModal } from './components/Modals/DrainHydrologyModal';
import { AboutModelModal } from './components/Modals/AboutModelModal';
import { Zap, Waves, RefreshCw, Map } from 'lucide-react';

export function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Core Datasets
  const [forecastPayload, setForecastPayload] = useState<WeatherNextPayload | null>(null);
  const [substations, setSubstations] = useState<SubstationRiskNode[]>([]);
  const [wardsVulnerability, setWardsVulnerability] = useState<WardVulnerabilityNode[]>([]);
  const [wardsGeoJson, setWardsGeoJson] = useState<any>(null);
  const [shelters, setShelters] = useState<ShelterGridFusionNode[]>([]);
  const [drainsGeoJson, setDrainsGeoJson] = useState<any>(null);
  const [riversGeoJson, setRiversGeoJson] = useState<any>(null);

  // Active Simulation State
  // Default to index 24 (T-24h Warning)
  const [timestepIndex, setTimestepIndex] = useState<number>(24);

  // Selections
  const [selectedSubstation, setSelectedSubstation] = useState<SubstationRiskNode | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardVulnerabilityNode | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<ShelterGridFusionNode | null>(null);

  // UI Panels & Modals
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
  const [isDrainModalOpen, setIsDrainModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');

  // Load all master datasets on boot
  useEffect(() => {
    async function initPlatform() {
      try {
        setLoading(true);
        const [
          forecast,
          substationsData,
          wardsVulnData,
          wardsGj,
          sheltersData,
          drainsGj,
          riversGj
        ] = await Promise.all([
          DataLoader.getWeatherNextForecast(),
          DataLoader.getSubstationsRisk(),
          DataLoader.getWardsVulnerability(),
          DataLoader.getWardsGeoJson(),
          DataLoader.getShelterFusion(),
          DataLoader.getDrainsGeoJson().catch(() => null),
          DataLoader.getRiversGeoJson().catch(() => null)
        ]);

        setForecastPayload(forecast);
        setSubstations(substationsData.substations);
        setWardsVulnerability(wardsVulnData.wards);
        setWardsGeoJson(wardsGj);
        setShelters(sheltersData.shelters);
        setDrainsGeoJson(drainsGj);
        setRiversGeoJson(riversGj);

        // Find initial timestep around T-24h
        if (forecast && forecast.timesteps.length > 0) {
          const t24Index = forecast.timesteps.findIndex(t => t.timestep_hour === -24);
          if (t24Index !== -1) setTimestepIndex(t24Index);
        }
      } catch (err: any) {
        console.error('Fatal initialization error:', err);
        setLoadError(err.message || 'Failed to initialize SurgeGrid platform');
      } finally {
        setLoading(false);
      }
    }

    initPlatform();
  }, []);

  const currentTimestep: WeatherNextTimestep | null = 
    forecastPayload?.timesteps[timestepIndex] || forecastPayload?.timesteps[0] || null;

  const criticalSubsCount = substations.filter(s => s.risk_category === 'CRITICAL_SURGE_RISK').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 text-slate-800 select-none">
        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-rose-500 animate-spin blur-lg opacity-30"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg">
            <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 bg-clip-text text-transparent">
            SurgeGrid AI
          </h1>
          <p className="text-xs font-sans text-slate-500 tracking-wider">
            SYNTHESIZING DEEPMIND WEATHERNEXT 3 & GEE 10-BAND GRID DATA...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-sans mt-4">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Parsing 242 TNEB Substations · 200 Wards · 162 Shelters</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 text-slate-800 p-6">
        <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center border border-rose-100">
            <Waves className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-rose-800">Data Pipeline Error</h2>
          <p className="text-xs text-slate-600 font-mono">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden select-none">
      {/* 1. Top Atmospheric & Cyclone Telemetry Navigation Bar */}
      {currentTimestep && (
        <TopTelemetryNav 
          currentForecast={currentTimestep}
          criticalSubstationsCount={criticalSubsCount}
          onOpenInsuranceModal={() => setIsInsuranceModalOpen(true)}
          onOpenDrainModal={() => setIsDrainModalOpen(true)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
          onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
          onResetView={() => {
            setSelectedSubstation(null);
            setSelectedWard(null);
            setSelectedShelter(null);
          }}
          isCopilotOpen={isCopilotOpen}
        />
      )}

      {/* 2. Main Geospatial Command Grid (Interactive Google Maps / Light Map + Copilot Panel) */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Map Canvas Wrapper */}
        <div className="flex-1 h-full relative">
          {mapEngine === 'google' ? (
            <GoogleSurgeGridMap 
              currentTimestep={currentTimestep}
              substations={substations}
              wardsVulnerability={wardsVulnerability}
              wardsGeoJson={wardsGeoJson}
              shelters={shelters}
              drainsGeoJson={drainsGeoJson}
              riversGeoJson={riversGeoJson}
              selectedSubstation={selectedSubstation}
              selectedWard={selectedWard}
              selectedShelter={selectedShelter}
              onSelectSubstation={(sub) => {
                setSelectedWard(null);
                setSelectedShelter(null);
                setSelectedSubstation(sub);
              }}
              onSelectWard={(ward) => {
                setSelectedSubstation(null);
                setSelectedShelter(null);
                setSelectedWard(ward);
              }}
              onSelectShelter={(sh) => {
                setSelectedSubstation(null);
                setSelectedWard(null);
                setSelectedShelter(sh);
              }}
            />
          ) : (
            <SurgeGridMap 
              currentTimestep={currentTimestep}
              substations={substations}
              wardsVulnerability={wardsVulnerability}
              wardsGeoJson={wardsGeoJson}
              shelters={shelters}
              drainsGeoJson={drainsGeoJson}
              riversGeoJson={riversGeoJson}
              selectedSubstation={selectedSubstation}
              selectedWard={selectedWard}
              selectedShelter={selectedShelter}
              onSelectSubstation={(sub) => {
                setSelectedWard(null);
                setSelectedShelter(null);
                setSelectedSubstation(sub);
              }}
              onSelectWard={(ward) => {
                setSelectedSubstation(null);
                setSelectedShelter(null);
                setSelectedWard(ward);
              }}
              onSelectShelter={(sh) => {
                setSelectedSubstation(null);
                setSelectedWard(null);
                setSelectedShelter(sh);
              }}
            />
          )}

          {/* Map Engine Quick Toggle (Bottom Right of map) */}
          <div className="absolute bottom-4 right-4 z-10 select-none">
            <button
              onClick={() => setMapEngine(mapEngine === 'google' ? 'leaflet' : 'google')}
              className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:text-blue-600 shadow-sm backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Toggle between Google Maps Platform and Light Vector Map"
            >
              <Map className="w-3.5 h-3.5 text-blue-600" />
              <span>{mapEngine === 'google' ? 'Google Maps (Active)' : 'Light Vector Map'}</span>
            </button>
          </div>

          {/* Slide-out Deep Node Inspector Drawer */}
          <NodeInspectorDrawer 
            substation={selectedSubstation}
            ward={selectedWard}
            shelter={selectedShelter}
            onClose={() => {
              setSelectedSubstation(null);
              setSelectedWard(null);
              setSelectedShelter(null);
            }}
          />
        </div>

        {/* Gemini 3.7 Flash Authorized Action Copilot Panel */}
        <GeminiCopilotPanel 
          currentTimestep={currentTimestep}
          substations={substations}
          shelters={shelters}
          isCollapsed={!isCopilotOpen}
          onToggleCollapse={() => setIsCopilotOpen(!isCopilotOpen)}
          onFlyToNode={(name) => {
            const sub = substations.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
            if (sub) {
              setSelectedShelter(null);
              setSelectedWard(null);
              setSelectedSubstation(sub);
            }
          }}
        />
      </div>

      {/* 3. Bottom 48h WeatherNext 3 Hourly Timeline Scrubber */}
      <WeatherNextSlider 
        timesteps={forecastPayload?.timesteps || []}
        currentIndex={timestepIndex}
        onSelectIndex={(newIndex) => {
          if (typeof newIndex === 'function') {
            setTimestepIndex(newIndex);
          } else {
            setTimestepIndex(newIndex);
          }
        }}
        criticalSubstationsCount={criticalSubsCount}
      />

      {/* 4. Dedicated Intelligence Modals */}
      <ParametricInsuranceModal 
        isOpen={isInsuranceModalOpen}
        onClose={() => setIsInsuranceModalOpen(false)}
        currentTimestep={currentTimestep}
      />

      <DrainHydrologyModal 
        isOpen={isDrainModalOpen}
        onClose={() => setIsDrainModalOpen(false)}
      />

      <AboutModelModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}

export default App;
