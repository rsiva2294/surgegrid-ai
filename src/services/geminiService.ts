import type { GeminiActionPlan, SubstationRiskNode, ShelterGridFusionNode, WeatherNextTimestep } from '../types/surgegrid';

export class GeminiDisasterService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async generateAnticipatoryActionPlan(
    currentForecast: WeatherNextTimestep,
    criticalSubstations: SubstationRiskNode[],
    vulnerableShelters: ShelterGridFusionNode[]
  ): Promise<GeminiActionPlan> {
    const prompt = `
You are the AI Disaster Action & Grid Protection Commander for Chennai Metropolitan Area during a Bay of Bengal Tropical Cyclone Landfall.
Scenario Data:
- Lead Time to Landfall: ` + currentForecast.label + ` (Storm Distance: ` + currentForecast.cyclone_distance_to_chennai_km + ` km)
- Simulated Storm Surge: ` + currentForecast.simulated_storm_surge_msl_m + ` m MSL
- Peak Wind Gusts: ` + currentForecast.wind_speed_10m_kmh + ` km/h
- 1-Hour Precipitation Rate: ` + currentForecast.total_precipitation_1hr_mm + ` mm/hr
- Barometric Eye Pressure: ` + currentForecast.mean_sea_level_pressure_hpa + ` hPa
- Critical Low-Lying Substations (< 3m MSL at risk of transformer explosion): ` + criticalSubstations.map(s => `${s.name} (Elev: ${s.elevation_m}m, Dist to Coast: ${s.distance_to_coastline_km}km, Feeders: ${s.connected_feeders_count})`).join('; ') + `
- Vulnerable Emergency Relief Shelters requiring 11kV backup load transfer: ` + vulnerableShelters.slice(0, 8).map(sh => `Ward ${sh.ward} (${sh.address}) -> Primary: ${sh.grid_power_resilience.primary_substation.name}, Backup: ${sh.grid_power_resilience.backup_safe_substation.name} (${sh.grid_power_resilience.backup_safe_substation.distance_km}km)`).join('; ') + `

Generate a structured JSON response with:
1. scenario_summary (concise executive overview)
2. total_megawatts_at_risk (number, e.g. 420)
3. substations_to_deenergize (array of { substation, circle, elevation_msl, deenergize_lead_time, reason, backup_switch_order })
4. shelters_emergency_reroutes (array of { shelter_name, ward, primary_feeder, backup_tie_line_substation, distance_km, officer_contact })
5. civic_early_warning_dispatches (array of { ward, zone, language ('English' or 'Tamil'), broadcast_text, evacuation_corridor })
6. parametric_insurance_trigger (object with cyclone_intensity_category, estimated_asset_exposure_inr_crores, liquidity_payout_trigger_pct, recommended_immediate_disaster_advance_inr)
`;

    if (this.apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });

        if (response.text) {
          return JSON.parse(response.text) as GeminiActionPlan;
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to deterministic local model:', err);
      }
    }

    // Deterministic High-Fidelity Simulation Fallback
    return this.generateDeterministicPlan(currentForecast, criticalSubstations, vulnerableShelters);
  }

  private generateDeterministicPlan(
    currentForecast: WeatherNextTimestep,
    criticalSubstations: SubstationRiskNode[],
    vulnerableShelters: ShelterGridFusionNode[]
  ): GeminiActionPlan {
    const isLandfallImminent = currentForecast.timestep_hour >= -6;
    
    return {
      scenario_summary: `Severe Cyclonic Storm (Michaung-Class) advancing towards Chennai coast (${currentForecast.cyclone_distance_to_chennai_km}km out). Simulated surge of ${currentForecast.simulated_storm_surge_msl_m}m MSL threatens ${criticalSubstations.length} coastal and basin substations. Immediate pre-landfall 11kV load shedding and tie-line transfers initiated.`,
      timestamp: new Date().toISOString(),
      total_megawatts_at_risk: criticalSubstations.length * 45 + 120,
      substations_to_deenergize: criticalSubstations.slice(0, 6).map((s, idx) => ({
        substation: s.name,
        circle: s.circle,
        elevation_msl: `${s.elevation_m}m MSL`,
        deenergize_lead_time: idx < 2 ? 'T-2 Hours (CRITICAL)' : 'T-4 Hours (STANDBY)',
        reason: `Substation ground level (${s.elevation_m}m) is below simulated storm surge (${currentForecast.simulated_storm_surge_msl_m}m). Risk of busbar short-circuit and oil fire.`,
        backup_switch_order: `Transfer downstream 11kV hospital and municipal water pump loads to inland high-ground grid.`
      })),
      shelters_emergency_reroutes: vulnerableShelters.slice(0, 6).map(sh => ({
        shelter_name: sh.address,
        ward: sh.ward,
        primary_feeder: sh.grid_power_resilience.primary_substation.name,
        backup_tie_line_substation: sh.grid_power_resilience.backup_safe_substation.name,
        distance_km: sh.grid_power_resilience.backup_safe_substation.distance_km,
        officer_contact: `${sh.officer_in_charge} (${sh.emergency_contact})`
      })),
      civic_early_warning_dispatches: [
        {
          ward: 196,
          zone: 'Zone 15 (Sholinganallur)',
          language: 'English',
          broadcast_text: `EMERGENCY ALERT: Cyclone surge forecast to submerge OMR link roads. Thoraipakkam grid undergoing safety isolation. Evacuate immediately to designated relief shelter at Sholinganallur High School. Use G.N. Chetty elevated ramp.`,
          evacuation_corridor: 'OMR Elevated Corridor / Velachery Main Road'
        },
        {
          ward: 196,
          zone: 'Zone 15 (Sholinganallur)',
          language: 'Tamil',
          broadcast_text: `அவசர எச்சரிக்கை: புயல் அலைகளால் தாழ்வான பகுதிகள் மற்றும் ஓ.எம்.ஆர் சாலைகளில் நீர் தேங்கும் அபாயம் உள்ளது. மின் பாதுகாப்பு கருதி தோரைப்பாக்கம் துணை மின்நிலையம் தற்காலிகமாக நிறுத்தப்படுகிறது. பொதுமக்கள் உடனடியாக சோழிங்கநல்லூர் நிவாரண முகாமிற்கு செல்லவும்.`,
          evacuation_corridor: 'சோழிங்கநல்லூர் - மேடவாக்கம் பிரதான சாலை'
        },
        {
          ward: 7,
          zone: 'Zone 1 (Thiruvottiyur)',
          language: 'Tamil',
          broadcast_text: `எண்ணூர் மற்றும் திருவொற்றியூர் கடலோர பகுதி மக்களுக்கு எச்சரிக்கை: கடல் அலை 3.5 மீட்டர் வரை எழக்கூடும். தாழ்வான பகுதியில் உள்ளவர்கள் உடனே நகராட்சி நிவாரண மையங்களுக்கு செல்லுமாறு கேட்டுக்கொள்ளப்படுகிறார்கள்.`,
          evacuation_corridor: 'திருவொற்றியூர் ஹை ரோடு'
        },
        {
          ward: 173,
          zone: 'Zone 13 (Adyar)',
          language: 'English',
          broadcast_text: `Adyar River bank warning: R.A. Puram low-lying lanes face backflow inundation. Backup power activated via 230kV GIS Substation. Move vehicles to elevated flyover ramps.`,
          evacuation_corridor: 'Kamarajar Salai / DGS Dinakaran Salai'
        }
      ],
      parametric_insurance_trigger: {
        cyclone_intensity_category: 'Category 3 Severe Cyclonic Storm (IMD / WMO)',
        estimated_asset_exposure_inr_crores: 485.5,
        liquidity_payout_trigger_pct: isLandfallImminent ? 85.0 : 40.0,
        recommended_immediate_disaster_advance_inr: isLandfallImminent ? '₹150,00,00,000 (150 Crores TNDRRA Liquidity Release)' : '₹50,00,00,000 (50 Crores Pre-positioning Fund)'
      }
    };
  }
}

export const geminiDisasterService = new GeminiDisasterService();
