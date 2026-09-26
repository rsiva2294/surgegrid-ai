import React, { useState, useEffect } from 'react';
import { Play, Pause, Wind, CloudRain, Waves, Clock } from 'lucide-react';
import type { WeatherStep } from '../types';

interface TimelineSliderProps {
  weatherSteps: WeatherStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  lang: 'en' | 'ta';
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  weatherSteps,
  currentStepIndex,
  onStepChange,
  lang,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        onStepChange((currentStepIndex + 1) % weatherSteps.length);
      }, 2200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, weatherSteps.length, onStepChange]);

  const current = weatherSteps[currentStepIndex] || weatherSteps[0];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Play/Pause + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-xs transition-colors shrink-0"
            title={isPlaying ? 'Pause Simulation' : 'Play Timeline Simulation'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span className="font-bold text-slate-900 text-sm sm:text-base">
                {lang === 'en' ? 'WeatherNext 3 Cyclonic Horizon' : 'புயல் நகர்வு காலக்கோடு (Google WeatherNext 3)'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {current?.phase_description || 'Pre-landfall cyclonic wind & storm surge trajectory'}
            </p>
          </div>
        </div>

        {/* Live Weather Metrics for the Current Timestep */}
        <div className="flex items-center gap-3 sm:gap-6 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-xs overflow-x-auto">
          {/* Wind Gust */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Wind className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Wind Gust</span>
              <span className="font-bold font-mono text-slate-800">{current?.wind_speed_10m_kmh || 95} km/h</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* 24h Rain */}
          <div className="flex items-center gap-1.5 shrink-0">
            <CloudRain className="w-4 h-4 text-sky-600" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">24h Rain</span>
              <span className="font-bold font-mono text-sky-700">{current?.rainfall_24h_cumulative_mm || 320} mm</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Storm Surge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Waves className="w-4 h-4 text-indigo-600" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Ocean Surge</span>
              <span className="font-bold font-mono text-indigo-700">+{current?.simulated_storm_surge_msl_m || 1.8}m MSL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Step Buttons / Slider */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {weatherSteps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            return (
              <button
                key={step.timestep_hour}
                onClick={() => {
                  setIsPlaying(false);
                  onStepChange(idx);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-200 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs sm:text-sm font-mono">{step.timestep_hour}</span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-full">
                  {step.alert_phase.replace('_ALERT', '').replace('_PHASE', '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
