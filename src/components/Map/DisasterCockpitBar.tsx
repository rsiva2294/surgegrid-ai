import React, { useRef, useState, useEffect } from 'react';
import { 
  Wind, 
  GripVertical, 
  RotateCcw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles,
  Waves,
  Droplets,
  Clock
} from 'lucide-react';
import type { LiveWeatherConditions } from '../../services/liveWeatherService';
import type { ScenarioTimestep } from '../../services/scenarioService';
import type { GeminiSopDirective } from '../../services/geminiSopService';

export type DisasterScenario = 
  | 'NORMAL' 
  | 'LIVE' 
  | 'MICHAUNG_CAT3' 
  | 'FLOODS_2015' 
  | 'CYCLONE_ALERT' 
  | 'SEVERE_CYCLONE' 
  | 'EXTREME_SURGE';

export type CrisisTriageFilter = 'all' | 'poor_stability' | 'waterlogging_risk' | 'outages';

export interface DisasterCockpitBarProps {
  disasterScenario: DisasterScenario;
  setDisasterScenario: (scenario: DisasterScenario) => void;
  crisisTriageFilter: CrisisTriageFilter;
  setCrisisTriageFilter: (filter: CrisisTriageFilter) => void;
  poorStabilityCount: number;
  waterloggingRiskCount: number;
  liveOutagesCount?: number;
  substationsCount?: number;
  isLight: boolean;
  liveWeather?: LiveWeatherConditions | null;
  // Simulation & Timeline Props
  simulationHour?: number;
  setSimulationHour?: (hour: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  currentTimestep?: ScenarioTimestep | null;
  activeDirective?: GeminiSopDirective | null;
  onOpenGeminiSop?: () => void;
  availableHours?: number[];
}

export const DisasterCockpitBar: React.FC<DisasterCockpitBarProps> = ({
  disasterScenario,
  setDisasterScenario,
  crisisTriageFilter,
  setCrisisTriageFilter,
  poorStabilityCount,
  waterloggingRiskCount,
  liveOutagesCount = 0,
  isLight,
  liveWeather,
  simulationHour = 0,
  setSimulationHour,
  isPlaying = false,
  onTogglePlay,
  currentTimestep,
  activeDirective,
  onOpenGeminiSop,
  availableHours = [-48, -24, -12, 0, 6, 12]
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return null;
    try {
      const saved = localStorage.getItem('sg_cockpit_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          const safeX = Math.max(12, Math.min(window.innerWidth - 320, parsed.x));
          const safeY = Math.max(8, Math.min(window.innerHeight - 80, parsed.y));
          return { x: safeX, y: safeY };
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (!desktop) return;
      setPosition((prev) => {
        if (!prev) return null;
        const safeX = Math.max(12, Math.min(window.innerWidth - 320, prev.x));
        const safeY = Math.max(8, Math.min(window.innerHeight - 80, prev.y));
        return { x: safeX, y: safeY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!isDesktop || !containerRef.current) return;
    e.preventDefault();
    setIsDragging(true);

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaY = moveEvent.clientY - startClientY;

      const containerWidth = containerRef.current?.offsetWidth || 400;
      const containerHeight = containerRef.current?.offsetHeight || 80;

      const maxX = Math.max(12, window.innerWidth - containerWidth - 12);
      const maxY = Math.max(8, window.innerHeight - containerHeight - 12);

      const clampedX = Math.max(12, Math.min(maxX, currentX + deltaX));
      const clampedY = Math.max(8, Math.min(maxY, currentY + deltaY));

      setPosition({ x: clampedX, y: clampedY });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      setPosition((cur) => {
        if (cur) {
          try {
            localStorage.setItem('sg_cockpit_position', JSON.stringify(cur));
          } catch {
            // ignore
          }
        }
        return cur;
      });
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResetPosition = () => {
    setPosition(null);
    try {
      localStorage.removeItem('sg_cockpit_position');
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      style={
        isDesktop && position
          ? {
              top: `${position.y}px`,
              left: `${position.x}px`,
              transform: 'none',
            }
          : undefined
      }
      className={`absolute z-20 pointer-events-none flex flex-col items-center gap-1.5 w-auto max-w-[calc(100vw-1rem)] md:max-w-none ${
        !isDesktop || !position ? 'top-2 md:top-4 left-1/2 -translate-x-1/2' : ''
      } ${isDragging ? 'transition-none select-none' : 'transition-transform duration-100'}`}
    >
      <div className={`pointer-events-auto rounded-2xl p-1 border flex items-center gap-1 transition-all max-w-full overflow-x-auto no-scrollbar ${
        isLight
          ? 'bg-white/98 border-slate-300/90 text-slate-900 shadow-[0_10px_35px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 backdrop-blur-md'
          : 'bg-slate-900/95 border-slate-700/80 text-white shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
      } ${isDragging ? (isLight ? 'ring-2 ring-indigo-500 shadow-2xl' : 'ring-2 ring-cyan-400 shadow-2xl shadow-cyan-500/30') : ''}`}>
        {/* Desktop Drag Handle */}
        <div
          onMouseDown={handleDragStart}
          onDoubleClick={handleResetPosition}
          className={`hidden md:flex items-center justify-center pl-1.5 pr-1 py-1 rounded-lg cursor-grab active:cursor-grabbing select-none transition-colors group ${
            isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Drag to reposition cockpit bar anywhere on the screen • Double-click to reset to center"
        >
          <GripVertical className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 border-r shrink-0 border-current/10">
          <Wind className={`w-3.5 h-3.5 ${
            disasterScenario === 'NORMAL' ? (isLight ? 'text-emerald-600' : 'text-emerald-400') :
            disasterScenario === 'CYCLONE_ALERT' ? (isLight ? 'text-yellow-600' : 'text-yellow-400') :
            disasterScenario === 'SEVERE_CYCLONE' ? (isLight ? 'text-amber-600' : 'text-amber-400') :
            (isLight ? 'text-rose-600' : 'text-rose-400')
          }`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Disaster Protocol
          </span>
        </div>

        <div className="flex items-center gap-1 whitespace-nowrap">
          {/* 1. LIVE Real-time Mode */}
          <button
            type="button"
            onClick={() => setDisasterScenario('NORMAL')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              disasterScenario === 'NORMAL' || disasterScenario === 'LIVE'
                ? (isLight ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-950 border border-emerald-500/70 text-emerald-200 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200 hover:text-white')
            }`}
            title="Real-time Chennai Grid Conditions via Google Maps Weather API"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                disasterScenario === 'NORMAL' || disasterScenario === 'LIVE'
                  ? (isLight ? 'bg-white' : 'bg-emerald-400')
                  : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                disasterScenario === 'NORMAL' || disasterScenario === 'LIVE'
                  ? (isLight ? 'bg-white' : 'bg-emerald-400')
                  : 'bg-emerald-500'
              }`}></span>
            </span>
            <span className="tracking-wide uppercase font-bold">Live</span>
            <span className={`min-w-[34px] inline-flex items-center justify-center text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
              disasterScenario === 'NORMAL' || disasterScenario === 'LIVE'
                ? (isLight ? 'bg-emerald-900 text-white' : 'bg-emerald-900/80 text-emerald-100 border border-emerald-600/50')
                : (isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-200')
            }`}>
              {liveWeather ? `${Math.round(liveWeather.temperatureC)}°C` : '--°C'}
            </span>
          </button>

          {/* 2. Cyclone Michaung (Cat-3) Scenario Simulation */}
          <button
            type="button"
            onClick={() => setDisasterScenario('MICHAUNG_CAT3')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              disasterScenario === 'MICHAUNG_CAT3' || disasterScenario === 'SEVERE_CYCLONE' || disasterScenario === 'CYCLONE_ALERT'
                ? (isLight ? 'bg-amber-600 text-white font-bold shadow-sm' : 'bg-amber-500 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300 hover:text-white')
            }`}
            title="Simulate Category-3 Cyclone Michaung (61 timesteps from T-48h to T+12h)"
          >
            <span>🌀</span>
            <span>Cyclone Michaung</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
              disasterScenario === 'MICHAUNG_CAT3'
                ? (isLight ? 'bg-amber-800 text-white' : 'bg-slate-950 text-amber-300 font-bold')
                : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
            }`}>
              Cat 3
            </span>
          </button>

          {/* 3. 2015 Chennai Megafloods Scenario Simulation */}
          <button
            type="button"
            onClick={() => setDisasterScenario('FLOODS_2015')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              disasterScenario === 'FLOODS_2015' || disasterScenario === 'EXTREME_SURGE'
                ? (isLight ? 'bg-cyan-600 text-white font-bold shadow-sm' : 'bg-cyan-500 text-slate-950 font-bold shadow-sm')
                : (isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300 hover:text-white')
            }`}
            title="Simulate 2015 Chennai Megafloods & Chembarambakkam Reservoir Spill Benchmark"
          >
            <span>🌊</span>
            <span>2015 Megaflood</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
              disasterScenario === 'FLOODS_2015'
                ? (isLight ? 'bg-cyan-800 text-white' : 'bg-slate-950 text-cyan-300 font-bold')
                : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
            }`}>
              NASA GPM
            </span>
          </button>

          {/* Reset position button when moved from center (Desktop) */}
          {position !== null && (
            <button
              type="button"
              onClick={handleResetPosition}
              className={`hidden md:flex items-center justify-center p-1 rounded-lg transition-colors ml-0.5 ${
                isLight
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Reset cockpit position to default (top center)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tertiary: Dynamic Gemini AI Directive Strip during Simulation */}
      {disasterScenario !== 'NORMAL' && disasterScenario !== 'LIVE' && (
        <div className={`pointer-events-auto px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs shadow-md border flex items-center justify-between gap-3 backdrop-blur-md max-w-2xl transition-all ${
          activeDirective?.urgency === 'CRITICAL'
            ? (isLight ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-500/10' : 'bg-rose-950/85 border-rose-700/80 text-rose-200 shadow-black/40')
            : activeDirective?.urgency === 'RESTORATION'
            ? (isLight ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-500/10' : 'bg-emerald-950/85 border-emerald-700/80 text-emerald-200 shadow-black/40')
            : (isLight ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-500/10' : 'bg-amber-950/85 border-amber-700/80 text-amber-200 shadow-black/40')
        }`}>
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-bold tracking-tight shrink-0">
              {activeDirective ? activeDirective.label : 'GEMINI SLDC'}:
            </span>
            <span className="truncate text-[11px] font-medium opacity-90">
              {activeDirective ? activeDirective.title : 'Statutory grid directive synchronized'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenGeminiSop}
            className="px-2.5 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shrink-0 flex items-center gap-1 shadow-sm transition-all"
            title="Open comprehensive Gemini SOP checklist & action items"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Directive</span>
          </button>
        </div>
      )}

      {/* Secondary Bar: If Simulation is Active, render TIMELINE OF EVENTS. If Normal, render TRIAGE Quick Filters */}
      {disasterScenario === 'MICHAUNG_CAT3' || disasterScenario === 'FLOODS_2015' ? (
        <div className={`pointer-events-auto rounded-xl p-1.5 border flex items-center gap-2 transition-all text-xs max-w-full overflow-x-auto no-scrollbar whitespace-nowrap ${
          isLight
            ? 'bg-white/98 border-slate-300/90 text-slate-800 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/10 backdrop-blur-md'
            : 'bg-slate-900/95 border-slate-700/80 text-white shadow-[0_8px_30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
        }`}>
          {/* Desktop Drag Handle */}
          <div
            onMouseDown={handleDragStart}
            onDoubleClick={handleResetPosition}
            className={`hidden md:flex items-center justify-center pl-1 pr-0.5 py-0.5 rounded cursor-grab active:cursor-grabbing select-none transition-colors group ${
              isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Drag to reposition cockpit bar"
          >
            <GripVertical className="w-3 h-3 group-hover:scale-110 transition-transform" />
          </div>

          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
            Timeline:
          </span>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play / Auto-advance Simulation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          {/* Step Controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                const currentIndex = availableHours.indexOf(simulationHour);
                if (currentIndex > 0) setSimulationHour?.(availableHours[currentIndex - 1]);
              }}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Previous hour"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                const currentIndex = availableHours.indexOf(simulationHour);
                if (currentIndex < availableHours.length - 1) setSimulationHour?.(availableHours[currentIndex + 1]);
              }}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Next hour"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Current Hour Indicator Badge */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
            isLight ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'bg-slate-800 text-cyan-300 border border-slate-700'
          }`}>
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{currentTimestep?.label || `T${simulationHour >= 0 ? `+${simulationHour}` : simulationHour}h`}</span>
          </div>

          {/* Milestone Quick Jumps */}
          {disasterScenario === 'MICHAUNG_CAT3' ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSimulationHour?.(-24)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  simulationHour === -24
                    ? (isLight ? 'bg-amber-600 text-white font-bold' : 'bg-amber-500 text-slate-950 font-bold')
                    : (isLight ? 'bg-amber-50 text-amber-900 border border-amber-300' : 'bg-amber-950/40 text-amber-300 border border-amber-600/40')
                }`}
              >
                T-24h Watch
              </button>
              <button
                type="button"
                onClick={() => setSimulationHour?.(0)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  simulationHour === 0
                    ? (isLight ? 'bg-rose-600 text-white font-bold' : 'bg-rose-500 text-slate-950 font-bold')
                    : (isLight ? 'bg-rose-50 text-rose-900 border border-rose-300' : 'bg-rose-950/40 text-rose-300 border border-rose-600/40')
                }`}
              >
                T-0h Landfall
              </button>
              <button
                type="button"
                onClick={() => setSimulationHour?.(12)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  simulationHour === 12
                    ? (isLight ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-500 text-slate-950 font-bold')
                    : (isLight ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-600/40')
                }`}
              >
                T+12h Restore
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSimulationHour?.(-48)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  simulationHour === -48
                    ? (isLight ? 'bg-blue-600 text-white font-bold' : 'bg-blue-500 text-slate-950 font-bold')
                    : (isLight ? 'bg-blue-50 text-blue-900 border border-blue-300' : 'bg-blue-950/40 text-blue-300 border border-blue-600/40')
                }`}
              >
                T-48h Inflow
              </button>
              <button
                type="button"
                onClick={() => setSimulationHour?.(0)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  simulationHour === 0
                    ? (isLight ? 'bg-rose-600 text-white font-bold' : 'bg-rose-500 text-slate-950 font-bold')
                    : (isLight ? 'bg-rose-50 text-rose-900 border border-rose-300' : 'bg-rose-950/40 text-rose-300 border border-rose-600/40')
                }`}
              >
                T-0h Breach
              </button>
              <button
                type="button"
                onClick={() => setSimulationHour?.(12)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  simulationHour === 12
                    ? (isLight ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-500 text-slate-950 font-bold')
                    : (isLight ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-600/40')
                }`}
              >
                T+12h Receding
              </button>
            </div>
          )}

          {/* Scrubber Range Slider */}
          <div className="flex items-center gap-1.5 px-1">
            <input
              type="range"
              min={availableHours[0] ?? -48}
              max={availableHours[availableHours.length - 1] ?? 12}
              value={simulationHour}
              onChange={(e) => setSimulationHour?.(Number(e.target.value))}
              className="w-20 sm:w-28 md:w-36 h-1.5 accent-indigo-500 rounded-lg cursor-pointer"
              title="Scrub timeline hour by hour"
            />
          </div>

          {/* Simulated Physics Snapshot */}
          {currentTimestep && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-current/20">
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-semibold ${
                isLight ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-sky-950/50 text-sky-300 border-sky-600/40'
              }`} title="Simulated surface wind speed">
                <Wind className="w-3 h-3 text-sky-400" />
                {currentTimestep.wind_speed_10m_kmh.toFixed(0)}k
              </span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-semibold ${
                isLight ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-blue-950/50 text-blue-300 border-blue-600/40'
              }`} title="Hourly precipitation (NASA GPM IMERG)">
                <Droplets className="w-3 h-3 text-blue-400" />
                {currentTimestep.total_precipitation_1hr_mm.toFixed(0)}mm
              </span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-semibold ${
                isLight ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-teal-950/50 text-teal-300 border-teal-600/40'
              }`} title="Simulated coastal storm surge">
                <Waves className="w-3 h-3 text-teal-400" />
                {currentTimestep.simulated_storm_surge_msl_m.toFixed(1)}m
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Standard Triage Filters Bar for LIVE mode */
        <div className={`pointer-events-auto rounded-xl p-1 border flex items-center gap-1.5 transition-all text-xs max-w-full overflow-x-auto no-scrollbar whitespace-nowrap ${
          isLight
            ? 'bg-white/98 border-slate-300/90 text-slate-800 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/10 backdrop-blur-md'
            : 'bg-slate-900/95 border-slate-700/80 text-white shadow-[0_8px_30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-xl'
        }`}>
          {/* Desktop Drag Handle on Triage row too */}
          <div
            onMouseDown={handleDragStart}
            onDoubleClick={handleResetPosition}
            className={`hidden md:flex items-center justify-center pl-1 pr-0.5 py-0.5 rounded cursor-grab active:cursor-grabbing select-none transition-colors group ${
              isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Drag to reposition cockpit bar anywhere • Double-click to reset"
          >
            <GripVertical className="w-3 h-3 group-hover:scale-110 transition-transform" />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${isLight ? 'text-slate-600 font-bold' : 'text-slate-400 font-bold'}`}>
            Triage:
          </span>

          {/* 1. Poor Stability (<75 Health Score) */}
          <button
            type="button"
            onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'poor_stability' ? 'all' : 'poor_stability')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              crisisTriageFilter === 'poor_stability'
                ? (isLight ? 'bg-amber-600 text-white font-bold shadow-xs' : 'bg-amber-500 text-slate-950 font-bold shadow-xs')
                : (isLight 
                    ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-300/70 font-semibold' 
                    : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 font-semibold shadow-2xs')
            }`}
            title="Filter to infrastructure with poor operational stability & resiliency health score < 75"
          >
            <span>⚠️ Poor Stability (&lt;75)</span>
            <span className={`min-w-[18px] inline-flex items-center justify-center font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
              crisisTriageFilter === 'poor_stability' 
                ? 'bg-black/25 text-white' 
                : (isLight ? 'bg-amber-200/80 text-amber-950' : 'bg-amber-500/20 text-amber-200 border border-amber-500/30')
            }`}>
              {poorStabilityCount}
            </span>
          </button>

          {/* 2. Waterlogging / Elevation Vulnerability */}
          <button
            type="button"
            onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'waterlogging_risk' ? 'all' : 'waterlogging_risk')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              crisisTriageFilter === 'waterlogging_risk'
                ? (isLight ? 'bg-cyan-600 text-white font-bold shadow-xs' : 'bg-cyan-500 text-slate-950 font-bold shadow-xs')
                : (isLight 
                    ? 'bg-cyan-50/70 hover:bg-cyan-100 text-cyan-900 border border-cyan-300/70 font-semibold' 
                    : 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/40 font-semibold shadow-2xs')
            }`}
            title="Filter to infrastructure vulnerable to waterlogging because elevation is not high enough"
          >
            <span>🌊 Waterlogging Risk</span>
            <span className={`min-w-[18px] inline-flex items-center justify-center font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
              crisisTriageFilter === 'waterlogging_risk' 
                ? 'bg-black/25 text-white' 
                : (isLight ? 'bg-cyan-200/80 text-cyan-950' : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30')
            }`}>
              {waterloggingRiskCount}
            </span>
          </button>

          {/* 3. Live Outages */}
          <button
            type="button"
            onClick={() => setCrisisTriageFilter(crisisTriageFilter === 'outages' ? 'all' : 'outages')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              crisisTriageFilter === 'outages'
                ? (isLight ? 'bg-orange-600 text-white font-bold shadow-xs' : 'bg-orange-500 text-slate-950 font-bold shadow-xs')
                : (isLight 
                    ? 'bg-orange-50/70 hover:bg-orange-100 text-orange-900 border border-orange-300/70 font-semibold' 
                    : 'bg-orange-950/40 hover:bg-orange-900/50 text-orange-300 border border-orange-500/40 font-semibold shadow-2xs')
            }`}
            title="Filter to grid nodes with active live outages or maintenance today"
          >
            <span className="flex items-center gap-1">⚡ Live Outages</span>
            <span className={`min-w-[18px] inline-flex items-center justify-center font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
              crisisTriageFilter === 'outages' 
                ? 'bg-black/25 text-white' 
                : liveOutagesCount > 0 
                ? (isLight ? 'bg-orange-500 text-white' : 'bg-orange-400 text-slate-950') 
                : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-orange-500/20 text-orange-200 border border-orange-500/30')
            }`}>
              {liveOutagesCount}
            </span>
          </button>

          {/* Clear Filter */}
          {crisisTriageFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setCrisisTriageFilter('all')}
              className={`ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                isLight
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Clear filter and show full grid (default)"
            >
              <span>✕ Clear</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
