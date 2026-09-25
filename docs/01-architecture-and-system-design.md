# 01 - Architecture & System Design: SurgeGrid AI

## 1. Executive Summary

**SurgeGrid AI** is a predictive climate risk, electrical grid vulnerability, and anticipatory action platform designed for **Track 5 (Extreme Weather & Climate Risk Modeling)** of the *Code for Communities 2* Hackathon.

### The Problem
During severe cyclonic storms in the Bay of Bengal (e.g. *Cyclone Michaung, Vardah, Mandous*), coastal cities like Chennai experience widespread infrastructure failure. Disasters are managed reactively:
* Electrical substations flood and transformers explode, causing citywide blackouts lasting 4–7 days.
* Emergency relief shelters lose power when primary feeders trip.
* Post-disaster liquidity and parametric insurance payouts are delayed by weeks due to manual damage surveys.

### The Solution
SurgeGrid AI shifts disaster operations from post-landfall recovery to **pre-landfall anticipatory protection** by integrating:
1. **Google DeepMind WeatherNext 3 (August 2026)** for hourly cyclone trajectory forecasting.
2. **Google Earth Engine (GEE 2024–2026)** for 10-band multi-hazard terrain, built-up concrete surface, and historical water recurrence modeling.
3. **TNEB Super Index V2 Topology** mapping all 242 Chennai Substations and 11kV distribution feeders.
4. **GCC Municipal Hydrology** mapping 5,513 stormwater drains and 162 emergency relief shelters.
5. **Google Gemini 3.7 Flash** for multimodal automated early-warning dispatches, grid isolation SOPs, and parametric insurance liquidity calculations.

---

## 2. System Architecture Diagram

```
+---------------------------------------------------------------------------------------------------------+
|                                        SURGEGRID AI SYSTEM TOPOLOGY                                     |
+---------------------------------------------------------------------------------------------------------+

  [ LAYER 1: METEOROLOGICAL & CLIMATE FORCING ]
  +-----------------------------------------------------------------------------------------------------+
  | Google DeepMind WeatherNext 3 (FGN Mesh Transformer, 0.05°-0.1°, Hourly Timesteps)                  |
  | - wind_speed_10m (m/s)  - total_precipitation_1hr (m)  - mean_sea_level_pressure (Pa)  - cloud_cover |
  +-----------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
  [ LAYER 2: PLANETARY TERRAIN & HYDROLOGY (GEE 2024–2026) ]
  +-----------------------------------------------------------------------------------------------------+
  | Google Earth Engine (Project: namma-map-407ca)                                                      |
  | - NASA SRTM 30m DEM + Slope (USGS/SRTMGL1_003)                                                      |
  | - Dynamic World 10m Built-Up & Water (GOOGLE/DYNAMICWORLD/V1)                                       |
  | - Copernicus Sentinel-2 MNDWI Wetness (COPERNICUS/S2_SR_HARMONIZED)                                 |
  | - JRC Global Surface Water 38-Year Baseline (JRC/GSW1_4/GlobalSurfaceWater)                         |
  | - NASA GPM IMERG V07 Precipitation + ECMWF ERA5-Land Wind & Runoff                                  |
  +-----------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
  [ LAYER 3: INFRASTRUCTURE & LIFELINE FUSION ENGINE ]
  +-----------------------------------------------------------------------------------------------------+
  | - 242 TNEB Substations (33kV to 400kV) with 1,252 Historical Outage Vulnerability Profiles          |
  | - 5,513 GCC Stormwater Drains (Gravity Flow vs Uphill Backflow Chokepoints)                         |
  | - 162 GCC Relief Shelters (Automated 11kV Backup Tie-Line Routing Engine)                           |
  | - 4 Major Waterways (Adyar, Cooum, Kosasthalaiyar, Buckingham Canal)                                |
  +-----------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
  [ LAYER 4: MULTIMODAL AI & ANTICIPATORY DISPATCH ]
  +-----------------------------------------------------------------------------------------------------+
  | Google Gemini 3.7 Flash (@google/genai)                                                             |
  | 1. Controlled Pre-Landfall De-energization Timetable (T-6h, T-2h, T-0h)                              |
  | 2. Hyperlocal Multilingual Early Warning Dispatches (Tamil + English for GCC Nodal Officers)        |
  | 3. Parametric Disaster Insurance Loss Liquidity Report (Instant Fund Triggers)                      |
  +-----------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
  [ LAYER 5: GOOGLE MAPS COMMAND COCKPIT (VITE + REACT + TYPESCRIPT) ]
  +-----------------------------------------------------------------------------------------------------+
  | - Google Maps Platform (Vector 3D & Satellite Hybrid View)                                          |
  | - WeatherNext 3 Hourly Horizon Slider (T-48h -> Landfall T-0h)                                      |
  | - Dynamic Inundation Overlays (1.0m - 5.0m Surge & Runoff Contours)                                 |
  | - Interactive Substation Risk Blinkers & Animated Shelter Tie-Line Cables                           |
  +-----------------------------------------------------------------------------------------------------+
```

---

## 3. Mathematical Risk Formulations

### A. Substation Composite Flood & Grid Risk Score (0 to 100)
Calculated from 4 distinct physical risk drivers:
1. **Direct Oceanic Surge Factor**: Function of elevation E (meters MSL) and Euclidean distance to coast D (km). Exponentially increases when E <= 4m and D <= 3.5km.
2. **Pluvial Runoff Factor**: Derived from Dynamic World 10m concrete impervious percentage and drainage slope (< 0.5 degrees).
3. **Historical Grid Vulnerability Factor**: Weighted by Q3 2026 breakdown occurrences from resolved TNEB notices.
4. **Wind Line Snap Factor**: Function of cyclonic wind gusts exceeding 80 km/h in saturated soil conditions.

### B. Relief Shelter Backup Tie-Line Routing Formulation
For any relief shelter served by a vulnerable primary substation (elevation <= 3m MSL), the engine calculates the nearest **Safe Substation (elevation >= 8m MSL)** via spherical haversine distance and outputs the 11kV tie-line load transfer procedure.
