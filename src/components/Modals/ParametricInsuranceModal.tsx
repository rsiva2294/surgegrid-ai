import React from 'react';
import { createPortal } from 'react-dom';
import type { WeatherNextTimestep } from '../../types/surgegrid';
import { 
  X, 
  BarChart3, 
  ShieldCheck, 
  Wind, 
  Waves, 
  Droplets
} from 'lucide-react';

interface ParametricInsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimestep: WeatherNextTimestep | null;
}

export const ParametricInsuranceModal: React.FC<ParametricInsuranceModalProps> = ({
  isOpen,
  onClose,
  currentTimestep
}) => {
  if (!isOpen || !currentTimestep) return null;

  const windGustKmh = currentTimestep.wind_speed_10m_kmh;
  const surgeM = currentTimestep.simulated_storm_surge_msl_m;
  const rain1hm = currentTimestep.total_precipitation_1hr_mm;

  const windTriggered = windGustKmh >= 120;
  const surgeTriggered = surgeM >= 2.0;
  const rainTriggered = rain1hm >= 35.0;

  const triggersCount = (windTriggered ? 1 : 0) + (surgeTriggered ? 1 : 0) + (rainTriggered ? 1 : 0);
  const payoutPct = triggersCount === 3 ? 100 : triggersCount === 2 ? 70 : triggersCount === 1 ? 35 : 0;
  const payoutInrCrores = (485.5 * (payoutPct / 100)).toFixed(1);

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  Autonomous Parametric Disaster Insurance
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                  TNDRRA Protocol
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant Liquidity Payout Triggers for TNEB Grid Restoration & Civic Relief
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium">TOTAL ASSET EXPOSURE</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">₹485.5 Cr</div>
              <div className="text-[11px] text-slate-500 mt-0.5">242 Substations & 11kV Lines</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-amber-700 text-[11px] font-medium">LIQUIDITY PAYOUT PREDICTED</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{payoutPct}%</div>
              <div className="text-[11px] text-amber-600 mt-0.5">{triggersCount} of 3 parametric thresholds</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-emerald-700 text-[11px] font-medium">INSTANT DISBURSEMENT</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">₹{payoutInrCrores} Cr</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Pre-landfall emergency fund</div>
            </div>
          </div>

          {/* Trigger Thresholds */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Parametric Trigger Threshold Matrix ({currentTimestep.label})</span>
            </div>

            {/* Threshold 1: Wind Speed */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
              windTriggered ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-3">
                <Wind className={`w-5 h-5 ${windTriggered ? 'text-rose-600' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900">10m Peak Wind Gust &ge; 120 km/h</div>
                  <div className="text-xs text-slate-500">Current Forecast: {Math.round(windGustKmh)} km/h</div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                windTriggered ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {windTriggered ? 'TRIGGERED (1/3)' : 'PENDING'}
              </span>
            </div>

            {/* Threshold 2: Storm Surge */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
              surgeTriggered ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-3">
                <Waves className={`w-5 h-5 ${surgeTriggered ? 'text-rose-600' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900">Coastal Storm Surge &ge; 2.0 m MSL</div>
                  <div className="text-xs text-slate-500">Current Forecast: +{surgeM.toFixed(2)} m MSL</div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                surgeTriggered ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {surgeTriggered ? 'TRIGGERED (2/3)' : 'PENDING'}
              </span>
            </div>

            {/* Threshold 3: Hourly Rainfall */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
              rainTriggered ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-3">
                <Droplets className={`w-5 h-5 ${rainTriggered ? 'text-rose-600' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900">1-Hour IMERG Precipitation &ge; 35.0 mm/h</div>
                  <div className="text-xs text-slate-500">Current Forecast: {rain1hm.toFixed(1)} mm/h</div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                rainTriggered ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {rainTriggered ? 'TRIGGERED (3/3)' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Operational Significance Note */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-1.5">
            <div className="text-xs font-bold text-blue-900">
              Why Parametric over Traditional Loss Adjustment?
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              Traditional insurance takes 60–120 days of claim documentation while flood victims wait for electricity. With WeatherNext 3 parametric trigger contracts, payout verification occurs instantaneously and automatically when verified sensor thresholds are crossed, delivering capital to Tamil Nadu Disaster Risk Reduction Agency within hours of landfall.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Status: {triggersCount > 0 ? `🚨 ${triggersCount} Thresholds Met` : '✅ Atmospheric Conditions Normal'}
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
