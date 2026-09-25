import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Info, 
  Sparkles, 
  Cpu, 
  Globe, 
  Layers, 
  Zap 
} from 'lucide-react';

interface AboutModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModelModal: React.FC<AboutModelModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  DeepMind WeatherNext 3 Architecture
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
                  FGN Mesh Transformer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Functional Generative Network & Google Earth Engine 10-Band Fusion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            title="Close Window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Architecture Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-600" />
                FOUNDATION MODEL
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">WeatherNext 3</div>
              <div className="text-xs text-slate-500 mt-0.5">Google DeepMind (Aug 2026)</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-600" />
                SPATIAL RESOLUTION
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">0.05° (~5 km)</div>
              <div className="text-xs text-slate-500 mt-0.5">Station heads · 0.1° gridded</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                AI REASONING
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">Gemini 3.7 Flash</div>
              <div className="text-xs text-slate-500 mt-0.5">Action Plan Commander</div>
            </div>
          </div>

          {/* 10-Band Multi-Hazard GEE Satellite Stack */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Google Earth Engine 10-Band Multi-Hazard Sensor Stack</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">1. NASA SRTM 30m DEM</div>
                <div className="text-xs text-slate-600 mt-0.5">Precise ground elevation above sea level (MSL) and slope gradient for all 242 substations.</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">2. Google Dynamic World 10m</div>
                <div className="text-xs text-slate-600 mt-0.5">Near-real-time deep learning land use classification for active water probability (2024–2026).</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">3. Copernicus Sentinel-2 MNDWI</div>
                <div className="text-xs text-slate-600 mt-0.5">Modified Normalized Difference Water Index (10m) for surface wetness and marsh boundary tracking.</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">4. JRC Global Surface Water (1984–2021)</div>
                <div className="text-xs text-slate-600 mt-0.5">38-year historical water occurrence tracking persistent flood recurrence hotspots.</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">5. NASA GPM IMERG V07 Precipitation</div>
                <div className="text-xs text-slate-600 mt-0.5">Global Precipitation Measurement constellation providing calibrated 1-hour rainfall rates.</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">6. ECMWF ERA5-Land Reanalysis</div>
                <div className="text-xs text-slate-600 mt-0.5">10m wind gusts, barometric pressure, and volumetric soil moisture saturation percentage.</div>
              </div>
            </div>
          </div>

          {/* The Shift to Anticipatory Action */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>The Mission: Predictive Precision vs. Reactive Recovery</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              When Cyclone Michaung struck Chennai in 2023, substations remained energized until seawater surge reached busbars, causing catastrophic oil fires and 72-hour transformer burnouts. SurgeGrid AI leverages DeepMind WeatherNext 3 to forecast the exact hour storm surge will exceed substation elevation, ordering controlled de-energization 2 hours prior and transferring hospital and shelter loads to safe inland tie-lines.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Code for Communities 2 · Track 5: Extreme Weather & Climate Risk Modeling
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium transition-all cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
