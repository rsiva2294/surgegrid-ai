import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Layers, 
  AlertTriangle, 
  Waves
} from 'lucide-react';

interface DrainHydrologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrainHydrologyModal: React.FC<DrainHydrologyModalProps> = ({
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
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  GCC Stormwater Drains & River Hydrology
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold border border-sky-200">
                  5,513 Network Segments
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Backflow Inundation Modeling & Coastal Sluice Gate Hydraulics
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

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Key Hydrological Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px] font-medium">TOTAL DRAIN NETWORK</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">1,840+ km</div>
              <div className="text-[11px] text-slate-500 mt-0.5">5,513 Vector Segments</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="text-rose-700 text-[11px] font-medium">UPHILL BACKFLOW RISK</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">978 Segments</div>
              <div className="text-[11px] text-rose-600 mt-0.5">17.7% Network Gradient Inversion</div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200">
              <div className="text-sky-700 text-[11px] font-medium">MAJOR RIVER BASINS</div>
              <div className="text-2xl font-bold text-sky-700 mt-1">4 Waterways</div>
              <div className="text-[11px] text-sky-600 mt-0.5">Adyar, Cooum, Kosasthalaiyar, Canal</div>
            </div>
          </div>

          {/* Hydrological Phenomenon Explanation */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>The Coastal Backflow Inversion Phenomenon</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              When a cyclone storm surge elevates sea levels by <strong>+1.5m to +3.0m MSL</strong> at the mouths of the Adyar and Buckingham Canal, the hydraulic head reverses. Instead of stormwater flowing out to the Bay of Bengal, seawater is forced backward up low-lying drains into Velachery, Pallikaranai, and Thoraipakkam.
            </p>
          </div>

          {/* Major River Basins */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-sky-600" />
              <span>Chennai River System Discharge Capacities</span>
            </div>

            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Adyar River (South Chennai)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Estuary at Foreshore Estate · Flows through Kotturpuram, Saidapet, Jafferkhanpet</div>
                </div>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                  Critical Backflow at +2.2m Surge
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Cooum River (Central Chennai)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Outfall at Marina Beach Napier Bridge · Drains Anna Nagar, Egmore, Chintadripet</div>
                </div>
                <span className="text-xs font-semibold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200">
                  Active Sandbar Dredging Required
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Kosasthalaiyar River & Ennore Creek (North Chennai)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Largest catchment (3,755 km²) · Industrial cluster and power plant outfall</div>
                </div>
                <span className="text-xs font-semibold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">
                  Peak Discharge: 100,000 cusecs
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Buckingham Canal (North-South Interceptor)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Parallel coastal canal · Connects Sholinganallur to Ennore</div>
                </div>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                  Tidal Surcharge Risk Zone
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Data Source: GCC Stormwater Engineering Division & GEE SRTM Elevation
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
