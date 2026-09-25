import React, { useState, useEffect } from 'react';
import type { 
  WeatherNextTimestep, 
  SubstationRiskNode, 
  ShelterGridFusionNode, 
  GeminiActionPlan 
} from '../../types/surgegrid';
import { geminiDisasterService } from '../../services/geminiService';
import { 
  Sparkles, 
  ShieldAlert, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Flame,
  FileDown,
  Zap
} from 'lucide-react';

interface GeminiCopilotPanelProps {
  currentTimestep: WeatherNextTimestep | null;
  substations: SubstationRiskNode[];
  shelters: ShelterGridFusionNode[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFlyToNode: (nodeName: string) => void;
}

export const GeminiCopilotPanel: React.FC<GeminiCopilotPanelProps> = ({
  currentTimestep,
  substations,
  shelters,
  isCollapsed,
  onToggleCollapse,
  onFlyToNode
}) => {
  const [actionPlan, setActionPlan] = useState<GeminiActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'substations' | 'shelters' | 'alerts'>('plan');

  const criticalSubs = substations.filter(s => s.risk_category === 'CRITICAL_SURGE_RISK');
  const vulnerableShelters = shelters.filter(sh => sh.grid_power_resilience.shelter_grid_status === 'AT_RISK_GRID_ISOLATION');

  const generatePlan = async () => {
    if (!currentTimestep) return;
    setLoading(true);
    try {
      const plan = await geminiDisasterService.generateAnticipatoryActionPlan(
        currentTimestep,
        criticalSubs,
        vulnerableShelters
      );
      setActionPlan(plan);
    } catch (err) {
      console.error('Failed to generate action plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTimestep) {
      generatePlan();
    }
  }, [currentTimestep?.timestep_hour]);

  const copyToClipboard = () => {
    if (!actionPlan) return;
    const text = `SURGEGRID AI DISASTER ORDER (${currentTimestep?.label})\n` +
      `Summary: ${actionPlan.scenario_summary}\n` +
      `MW at Risk: ${actionPlan.total_megawatts_at_risk} MW\n` +
      `De-energization Orders:\n` +
      actionPlan.substations_to_deenergize.map(s => `- ${s.substation} (${s.elevation_msl}): ${s.deenergize_lead_time}`).join('\n') +
      `\nShelter 11kV Transfers:\n` +
      actionPlan.shelters_emergency_reroutes.map(sh => `- Ward ${sh.ward} -> Backup: ${sh.backup_tie_line_substation} (${sh.distance_km}km)`).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportJson = () => {
    if (!actionPlan) return;
    const blob = new Blob([JSON.stringify(actionPlan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SurgeGrid_Disaster_Order_${currentTimestep?.label || 'T0'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-white/95 border-l border-slate-200 flex flex-col items-center py-4 select-none justify-between z-20 shadow-md">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer border border-slate-200"
          title="Expand Gemini Copilot Panel"
        >
          <ChevronLeft className="w-5 h-5 text-amber-500" />
        </button>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="rotate-90 text-[11px] font-sans font-bold tracking-widest text-slate-600 uppercase whitespace-nowrap flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 -rotate-90" />
            <span>Gemini Copilot</span>
          </div>

          {criticalSubs.length > 0 && (
            <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {criticalSubs.length}
            </span>
          )}
        </div>

        <button
          onClick={generatePlan}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 transition-all cursor-pointer border border-slate-200"
          title="Regenerate Plan"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 md:w-96 h-full bg-white/95 border-l border-slate-200 flex flex-col select-none z-20 shadow-xl backdrop-blur-md">
      {/* Panel Top Header */}
      <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Gemini 3.7 Flash Copilot
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                Action Commander
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              Anticipatory SOP · {currentTimestep?.label || 'T-48h'} Landfall
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={generatePlan}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-600 disabled:opacity-50 border border-slate-200 transition-all cursor-pointer"
            title="Refresh AI Analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer"
            title="Collapse Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 p-1.5 bg-slate-100/70 border-b border-slate-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('plan')}
          className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
            activeTab === 'plan' ? 'bg-white text-blue-600 font-bold shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Plan
        </button>
        <button
          onClick={() => setActiveTab('substations')}
          className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
            activeTab === 'substations' ? 'bg-white text-rose-600 font-bold shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Grid ({actionPlan?.substations_to_deenergize.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('shelters')}
          className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
            activeTab === 'shelters' ? 'bg-white text-amber-700 font-bold shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Tie-Lines
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
            activeTab === 'alerts' ? 'bg-white text-indigo-600 font-bold shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Dispatches
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-sans text-xs">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <div className="text-xs font-semibold text-slate-700">Reasoning with Gemini 3.7 Flash...</div>
            <div className="text-[11px] text-slate-400">Cross-analyzing GEE 10-band DEM & WeatherNext 3 Surge</div>
          </div>
        ) : actionPlan ? (
          <>
            {/* TAB: PLAN OVERVIEW */}
            {activeTab === 'plan' && (
              <div className="space-y-3">
                {/* Executive Summary Box */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>EXECUTIVE SITUATION REPORT</span>
                  </div>
                  <p className="text-xs text-slate-700 font-sans leading-relaxed">
                    {actionPlan.scenario_summary}
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-xs">
                    <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      LOAD AT RISK
                    </div>
                    <div className="text-lg font-bold text-rose-900 mt-0.5">
                      {actionPlan.total_megawatts_at_risk} MW
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs">
                    <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      PRE-ISOLATION NODES
                    </div>
                    <div className="text-lg font-bold text-amber-900 mt-0.5">
                      {actionPlan.substations_to_deenergize.length} Substations
                    </div>
                  </div>
                </div>

                {/* Parametric Insurance Advance Card */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 shadow-xs">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                    Parametric Disaster Advance (TNDRRA)
                  </div>
                  <div className="text-sm font-bold text-emerald-700">
                    {actionPlan.parametric_insurance_trigger.recommended_immediate_disaster_advance_inr}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    Trigger Payout: {actionPlan.parametric_insurance_trigger.liquidity_payout_trigger_pct}% of ₹{actionPlan.parametric_insurance_trigger.estimated_asset_exposure_inr_crores} Cr Exposure
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SUBSTATIONS TO DE-ENERGIZE */}
            {activeTab === 'substations' && (
              <div className="space-y-2.5">
                <div className="text-xs text-slate-700 font-bold flex items-center justify-between pb-1 border-b border-slate-100">
                  <span>PRE-LANDFALL LOAD SHEDDING ORDERS</span>
                  <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    {actionPlan.substations_to_deenergize.length} Targeted
                  </span>
                </div>

                {actionPlan.substations_to_deenergize.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 hover:shadow-sm transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="truncate max-w-[200px] text-xs">{item.substation}</span>
                      </div>
                      <button
                        onClick={() => onFlyToNode(item.substation)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Fly to <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                        {item.deenergize_lead_time}
                      </span>
                      <span className="text-slate-600 font-semibold">{item.elevation_msl}</span>
                      <span className="text-slate-400">• {item.circle}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {item.reason}
                    </p>

                    <div className="text-[11px] text-blue-800 bg-blue-50/70 p-2 rounded-xl border border-blue-100 font-mono">
                      ⚡ {item.backup_switch_order}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: SHELTER 11kV TRANSFERS */}
            {activeTab === 'shelters' && (
              <div className="space-y-2.5">
                <div className="text-xs text-slate-700 font-bold flex items-center justify-between pb-1 border-b border-slate-100">
                  <span>11kV EMERGENCY TIE-LINE TRANSFERS</span>
                  <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {actionPlan.shelters_emergency_reroutes.length} Centers
                  </span>
                </div>

                {actionPlan.shelters_emergency_reroutes.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm space-y-2">
                    <div className="font-bold text-slate-900 text-xs">
                      🏛️ {item.shelter_name} (Ward {item.ward})
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Primary (Vulnerable): <span className="text-rose-600 font-semibold">{item.primary_feeder}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 font-medium">
                      ➔ Switch to: <span className="font-bold">{item.backup_tie_line_substation}</span> ({item.distance_km} km tie-line)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Contact: {item.officer_contact}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: CIVIC WARNING DISPATCHES */}
            {activeTab === 'alerts' && (
              <div className="space-y-2.5">
                <div className="text-xs text-slate-700 font-bold flex items-center justify-between pb-1 border-b border-slate-100">
                  <span>COMMUNITY EARLY WARNING BROADCASTS</span>
                  <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    EN / தமிழ்
                  </span>
                </div>

                {actionPlan.civic_early_warning_dispatches.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900">
                        Ward {item.ward} · {item.zone}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                        {item.language}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.broadcast_text}
                    </p>
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 font-medium">
                      🏃 Evac Corridor: {item.evacuation_corridor}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center text-slate-400">
            No action plan loaded. Click refresh to query Gemini 3.7 Flash.
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5">
        <button
          onClick={copyToClipboard}
          disabled={!actionPlan}
          className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Order' : 'Copy Order'}</span>
        </button>

        <button
          onClick={exportJson}
          disabled={!actionPlan}
          className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
          title="Download Machine-Readable JSON"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Export JSON</span>
        </button>
      </div>
    </div>
  );
};
