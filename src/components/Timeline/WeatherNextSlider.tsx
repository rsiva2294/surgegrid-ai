import React, { useEffect, useState, useRef } from 'react';
import type { WeatherNextTimestep } from '../../types/surgegrid';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  Clock, 
  Waves,
  Zap
} from 'lucide-react';

interface WeatherNextSliderProps {
  timesteps: WeatherNextTimestep[];
  currentIndex: number;
  onSelectIndex: (updater: number | ((prev: number) => number)) => void;
  criticalSubstationsCount?: number;
}

export const WeatherNextSlider: React.FC<WeatherNextSliderProps> = ({
  timesteps,
  currentIndex,
  onSelectIndex,
  criticalSubstationsCount = 0
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(800);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onSelectIndex((prev: number) => {
          if (prev >= timesteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, timesteps.length, onSelectIndex]);

  const current = timesteps[currentIndex] || timesteps[0];

  const jumpToHour = (targetHour: number) => {
    const idx = timesteps.findIndex(t => t.timestep_hour === targetHour);
    if (idx !== -1) {
      onSelectIndex(idx);
    }
  };

  return (
    <div className="bg-white/95 border-t border-slate-200/90 backdrop-blur-md px-6 py-3 z-20 shadow-md flex flex-col gap-2.5 select-none text-slate-800">
      {/* Controls Bar & Milestone Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play 48-Hour Cyclone Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-all cursor-pointer"
            title="Step Back 1 Hour"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectIndex(Math.min(timesteps.length - 1, currentIndex + 1))}
            disabled={currentIndex === timesteps.length - 1}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-all cursor-pointer"
            title="Step Forward 1 Hour"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              onSelectIndex(0);
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
            title="Reset to T-48H Genesis"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Current Timestep Telemetry Tag */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Clock className="w-4 h-4 text-blue-600" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-slate-900 font-mono">
                {current?.label || 'T-48h'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({currentIndex + 1} of {timesteps.length} hrs)
              </span>
            </div>
            {criticalSubstationsCount > 0 && (
              <span className="text-[10px] font-bold text-rose-700 border border-rose-200 bg-rose-50 px-2 py-0.5 rounded-full ml-1">
                {criticalSubstationsCount} critical nodes
              </span>
            )}
          </div>

          {/* Speed Toggle */}
          <button
            onClick={() => setPlaybackSpeed(playbackSpeed === 800 ? 400 : playbackSpeed === 400 ? 200 : 800)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono font-medium text-slate-700 transition-colors cursor-pointer"
            title="Toggle Playback Speed"
          >
            {playbackSpeed === 800 ? '1x speed' : playbackSpeed === 400 ? '2x speed' : '4x speed'}
          </button>
        </div>

        {/* Quick Phase Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => jumpToHour(-48)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              current?.timestep_hour === -48 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200'
            }`}
          >
            T-48h Watch
          </button>

          <button
            onClick={() => jumpToHour(-24)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              current?.timestep_hour === -24 
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-200'
            }`}
          >
            T-24h Warning
          </button>

          <button
            onClick={() => jumpToHour(-6)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              current?.timestep_hour === -6 
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
                : 'bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>T-6h Grid Isolation</span>
          </button>

          <button
            onClick={() => jumpToHour(0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
              current?.timestep_hour === 0 
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                : 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>T-0h Eye Landfall</span>
          </button>

          <button
            onClick={() => jumpToHour(12)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              current?.timestep_hour === 12 
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                : 'bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border-slate-200'
            }`}
          >
            T+12h Restoration
          </button>
        </div>
      </div>

      {/* Range Input Slider with Soft Breeze Gradient */}
      <div className="relative w-full flex items-center py-1">
        <input
          type="range"
          min={0}
          max={Math.max(1, timesteps.length - 1)}
          value={currentIndex}
          onChange={(e) => onSelectIndex(parseInt(e.target.value, 10))}
          className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
        />
      </div>

      {/* Timeline Hour Legend */}
      <div className="flex justify-between text-xs text-slate-500 font-medium">
        <span>-48h (Bay Genesis)</span>
        <span className="hidden sm:inline">-36h</span>
        <span className="text-amber-700 font-semibold">-24h (Warning Active)</span>
        <span className="hidden sm:inline">-12h</span>
        <span className="text-orange-700 font-bold">-6h (Pre-Isolation)</span>
        <span className="text-rose-700 font-extrabold">0h (Eye Landfall & Peak Surge)</span>
        <span className="hidden sm:inline">+6h</span>
        <span className="text-sky-700 font-semibold">+12h (Grid Restoration)</span>
      </div>
    </div>
  );
};
