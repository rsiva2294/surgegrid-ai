import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { GoogleGridMap } from './components/GoogleGridMap';
import { ActionPanel } from './components/ActionPanel';
import { Footer } from './components/Footer';
import type { Substation, LostWaterBody, ReliefShelter, ReservoirData, WeatherStep } from './types';
import {
  fetchLiveChennaiWeather,
  fetchLiveReservoirStorage,
  type LiveWeatherReport,
} from './services/liveDataService';
import { Loader2 } from 'lucide-react';

export function App() {
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [viewMode, setViewMode] = useState<'LIVE' | 'SIMULATION'>('LIVE');
  const [liveWeather, setLiveWeather] = useState<LiveWeatherReport | null>(null);
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState<boolean>(false);
  const [liveReservoirData, setLiveReservoirData] = useState<ReservoirData | null>(null);
  const [simulatedReservoirData, setSimulatedReservoirData] = useState<ReservoirData | null>(null);

  const [substations, setSubstations] = useState<Substation[]>([]);
  const [lostLakes, setLostLakes] = useState<LostWaterBody[]>([]);
  const [shelters, setShelters] = useState<ReliefShelter[]>([]);
  const [weatherSteps, setWeatherSteps] = useState<WeatherStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1); // Default to T-36h
  const [selectedSubstation, setSelectedSubstation] = useState<Substation | null>(null);
  const [activeTab, setActiveTab] = useState<string>('sop');
  const [loading, setLoading] = useState<boolean>(true);

  // Manual Live Weather Refresh
  const handleRefreshLiveWeather = useCallback(async () => {
    try {
      setIsWeatherRefreshing(true);
      const [freshWeather, freshReservoirs] = await Promise.all([
        fetchLiveChennaiWeather(lang),
        fetchLiveReservoirStorage(),
      ]);
      setLiveWeather(freshWeather);
      setLiveReservoirData(freshReservoirs);
    } catch (err) {
      console.warn('Weather refresh failed:', err);
    } finally {
      setTimeout(() => setIsWeatherRefreshing(false), 400);
    }
  }, [lang]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [
          subsRes,
          lakesRes,
          sheltersRes,
          simRes,
          weatherRes,
          initialLiveWeather,
          initialLiveReservoirs,
        ] = await Promise.all([
          fetch('/data/gee/gee_chennai_substations_risk.json').then((r) => r.json()),
          fetch('/data/neervazhvu/chennai_water_bodies_lost.json').then((r) => r.json()),
          fetch('/data/gcc/chennai_shelter_grid_drain_fusion.json').then((r) => r.json()),
          fetch('/data/simulation/chennai_reservoirs_status.json').then((r) => r.json()),
          fetch('/data/simulation/weathernext3_chennai_cyclone_48h.json').then((r) => r.json()),
          fetchLiveChennaiWeather(),
          fetchLiveReservoirStorage(),
        ]);

        const rawSubs: Substation[] = subsRes.substations || subsRes || [];
        // Strictly restrict substations to Chennai Metropolitan Area (CMA) / GCC bounds
        const chennaiOnlySubs = rawSubs.filter((s) => {
          if (!s.coordinates || !Array.isArray(s.coordinates)) return false;
          const [lng, lat] = s.coordinates;
          return lat >= 12.75 && lat <= 13.38 && lng >= 79.95 && lng <= 80.38;
        });

        setSubstations(chennaiOnlySubs);
        setLostLakes(lakesRes.features || []);
        setShelters(Array.isArray(sheltersRes) ? sheltersRes : sheltersRes.shelters || []);
        setSimulatedReservoirData(simRes);
        setLiveWeather(initialLiveWeather);
        setLiveReservoirData(initialLiveReservoirs);

        // Process weather steps to 5 major operational horizons
        if (weatherRes && weatherRes.timesteps) {
          const rawSteps = weatherRes.timesteps;
          const targets = [-48, -36, -24, -12, 0];
          const filtered: WeatherStep[] = targets.map((t) => {
            const found = rawSteps.find((s: any) => s.timestep_hour === t) || rawSteps[0];
            return {
              timestep_hour: found.label || `T${t}h`,
              hours_to_landfall: Math.abs(t),
              wind_speed_10m_kmh: Math.round(found.wind_speed_10m_kmh || 30),
              imerg_tp_1hr_mm: Math.round(found.imerg_tp_1hr_mm || 5),
              rainfall_24h_cumulative_mm:
                t === -48 ? 120 : t === -36 ? 245 : t === -24 ? 340 : t === -12 ? 415 : 485,
              mean_sea_level_pressure_hpa: found.mean_sea_level_pressure_hpa || 998,
              simulated_storm_surge_msl_m: found.simulated_storm_surge_msl_m || 1.2,
              alert_phase: found.alert_phase || 'WARNING_PHASE',
              phase_description:
                t === -48
                  ? 'Cyclone approaching Bay of Bengal. Watch advisory.'
                  : t === -36
                  ? 'Anticipatory staging. Chembarambakkam at 89.4% capacity.'
                  : t === -24
                  ? 'Mandatory 11kV load transfers for hospital feeders.'
                  : t === -12
                  ? 'Fluvial river surge peaks. De-energize riverside switchyards.'
                  : 'Landfall eye passage. Peak wind gusts and oceanic storm surge.',
            };
          });
          setWeatherSteps(filtered);
        }
      } catch (err) {
        console.error('Failed to load SurgeGrid AI datasets:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Auto-refresh live weather telemetry every 60 seconds
    const interval = setInterval(() => {
      fetchLiveChennaiWeather().then((data) => setLiveWeather(data)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentStep = weatherSteps[currentStepIndex] || { hours_to_landfall: 36 };

  // Current reservoir data depends on active mode
  const activeReservoirData = viewMode === 'LIVE' ? liveReservoirData : simulatedReservoirData;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
        <h2 className="text-base font-semibold text-slate-800">Initializing SurgeGrid AI Engine...</h2>
        <p className="text-xs text-slate-500 mt-1">
          Streaming live Open-Meteo weather, CMWSSB lake bulletin & 242 TNEB substations
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* 1. Slim Header with Segmented Mode Switcher */}
      <Header
        lang={lang}
        setLang={setLang}
        hoursToLandfall={currentStep.hours_to_landfall}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* 2. Main Mission Control Command Center */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* HERO: Full-Width Interactive Google Maps Command Deck (The Centerpiece of SurgeGrid AI) */}
        <section aria-label="Interactive Electrical Grid Map">
          <GoogleGridMap
            substations={substations}
            lostLakes={lostLakes}
            shelters={shelters}
            selectedSubstation={selectedSubstation}
            onSelectSubstation={setSelectedSubstation}
            weatherSteps={weatherSteps}
            currentStepIndex={currentStepIndex}
            onStepChange={setCurrentStepIndex}
            lang={lang}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
            liveWeather={liveWeather}
            onRefreshLiveWeather={handleRefreshLiveWeather}
            isWeatherRefreshing={isWeatherRefreshing}
          />
        </section>

        {/* 4 Compact Metric Cards (Directly Below Map) */}
        <section aria-label="Key Grid & Hydrology Metrics">
          <MetricCards
            substations={substations}
            shelters={shelters}
            reservoirData={activeReservoirData}
            onCardClick={(tab) => setActiveTab(tab)}
            lang={lang}
            viewMode={viewMode}
            liveWeather={liveWeather}
          />
        </section>

        {/* Action & Intelligence Deck (Anticipatory SOPs, Reservoirs, Shelters, Attribution) */}
        <section aria-label="Command Operations & Action Panel">
          <ActionPanel
            substations={substations}
            shelters={shelters}
            reservoirData={activeReservoirData}
            selectedSubstation={selectedSubstation}
            hoursToLandfall={currentStep.hours_to_landfall}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lang={lang}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
            liveWeather={liveWeather}
          />
        </section>
      </main>

      {/* 3. Civic Footer */}
      <Footer lang={lang} />
    </div>
  );
}

export default App;

