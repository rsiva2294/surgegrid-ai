# 01 — Architecture & System Design: SurgeGrid AI

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
  [ LAYER 3: LIVE DATA SERVICES ]
  +-----------------------------------------------------------------------------------------------------+
  | A. Google Maps Platform — Weather API (Next-3 Tile Layer)                                           |
  |    - Real-time temperature, wind, gusts, precipitation, humidity, condition codes                    |
  |    - Endpoint: weathernext3.googleapis.com (via liveDataService.ts)                                 |
  |                                                                                                     |
  | B. CMWSSB Daily Reservoir Bulletin (Scraped via Neer Vaazhvu pipeline)                              |
  |    - 7 major reservoir levels: Poondi, Cholavaram, Red Hills, Chembarambakkam,                      |
  |      Puzhal, Veeranam, Kannankottai Thervoy Kandigai                                                |
  |    - Live: capacity, storage %, inflow/outflow cusecs, sluice threat level                           |
  +-----------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
  [ LAYER 4: INFRASTRUCTURE & LIFELINE FUSION ENGINE ]
  +-----------------------------------------------------------------------------------------------------+
  | - 186 Chennai Metro Area TNEB Substations (33kV to 400kV) with risk scoring                         |
  | - 5,513 GCC Stormwater Drains (Gravity Flow vs Uphill Backflow Chokepoints)                         |
  | - 162 GCC Relief Shelters (Automated 11kV Backup Tie-Line Routing Engine)                           |
  | - 15 Ancestral Lost Water Bodies (buried lakebeds causing soil saturation)                           |
  | - 4 Major Waterways: Adyar, Cooum, Kosasthalaiyar, Buckingham Canal (native Google Maps rendering)  |
  +-----------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
  [ LAYER 5: MULTIMODAL AI & ANTICIPATORY DISPATCH ]
  +-----------------------------------------------------------------------------------------------------+
  | Google Gemini 3.7 Flash (@google/genai)                                                             |
  | 1. Controlled Pre-Landfall De-energization Timetable (T-6h, T-2h, T-0h)                              |
  | 2. Hyperlocal Multilingual Early Warning Dispatches (Tamil + English for GCC Nodal Officers)        |
  | 3. Parametric Disaster Insurance Loss Liquidity Report (Instant Fund Triggers)                      |
  +-----------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
  [ LAYER 6: GOOGLE MAPS COMMAND COCKPIT (VITE + REACT + TYPESCRIPT) ]
  +-----------------------------------------------------------------------------------------------------+
  | - Google Maps Platform (via @vis.gl/react-google-maps, POI-decluttered, Chennai-restricted)         |
  | - Dual Mode: LIVE (real-time fair weather) ↔ SIMULATION (cyclone scenario T-48h → T-0h)             |
  | - Dynamic SVG Marker Icons: risk-colored substations, shelters (safe/compromised), ancestral lakes  |
  | - Layer Toggles: Substations (186), Ancestral Lakes (15), Relief Shelters (162)                     |
  | - Bilingual UI (English/Tamil) with mode-aware contextual panels                                    |
  +-----------------------------------------------------------------------------------------------------+
```

---

## 3. Dual Operating Modes

### LIVE Mode (Default)
- Fetches real-time weather from Google Maps Platform Weather API
- Fetches live CMWSSB reservoir storage bulletin
- Map markers reflect **current conditions** — all green/calm when weather is fair
- Shelter Access Audit shows "✅ All 162 shelters accessible"
- Reservoir panel shows live storage percentages and headroom

### SIMULATION Mode
- Plays a pre-computed 48-hour cyclone scenario (WeatherNext 3 data)
- Timeline scrubber from T-48h → T-0h (landfall)
- Map markers dynamically escalate to red/critical as the storm progresses
- Shelter Access Audit reveals 18 compromised shelters with safe rerouting
- Reservoir panel shows simulated emergency sluice discharge thresholds

---

## 4. Frontend Component Architecture

```
App.tsx                         ← Data orchestration, state management, API calls
├── Header.tsx                  ← Mode switcher (LIVE ↔ SIMULATION), language toggle (EN/TA)
├── GoogleGridMap.tsx            ← Main Google Maps canvas (Chennai-restricted, POI-decluttered)
│   ├── MapStyleController      ← Enforces cleanMapStyles + Chennai geographic restriction
│   ├── MapOverlays             ← Draws ancestral lake circles (imperative Google Maps API)
│   ├── Marker (Substations)    ← 186 SVG icons, color-coded by risk category
│   ├── Marker (Shelters)       ← 162 SVG icons, green (safe) or red (compromised)
│   └── InfoWindow              ← Click-to-inspect detail panels for each marker
├── MetricCards.tsx              ← 4 summary cards (critical subs, shelters, lakes, weather)
├── ActionPanel.tsx              ← Tabbed detail panel
│   ├── Tab 1: Anticipatory SOPs (Gemini-generated)
│   ├── Tab 2: Reservoir Storage (live CMWSSB or simulated)
│   ├── Tab 3: Shelter Access Audit (mode-aware: all-clear vs compromised list)
│   └── Tab 4: Data Sources & Attribution
└── Footer.tsx                  ← Attribution and licensing
```

---

## 5. Geographic Restriction

The map viewport is strictly constrained to the **Chennai Metropolitan Area (CMA)**:

| Boundary | Value | Landmark |
|---|---|---|
| North | 13.38° N | Minjur / Ennore Port |
| South | 12.75° N | Tambaram / Vandalur |
| West | 79.95° E | Sriperumbudur / ORR |
| East | 80.38° E | Bay of Bengal Coastline |

- `strictBounds: true` — users cannot pan or zoom outside Chennai
- `minZoom: 10` — prevents zooming out beyond city limits
- Substation data is pre-filtered to CMA bounds (186 of 242 total nodes)

---

## 6. Mathematical Risk Formulations

### A. Substation Composite Flood & Grid Risk Score (0 to 100)
Calculated from 4 distinct physical risk drivers:
1. **Direct Oceanic Surge Factor**: Function of elevation E (meters MSL) and Euclidean distance to coast D (km). Exponentially increases when E <= 4m and D <= 3.5km.
2. **Pluvial Runoff Factor**: Derived from Dynamic World 10m concrete impervious percentage and drainage slope (< 0.5 degrees).
3. **Historical Grid Vulnerability Factor**: Weighted by Q3 2026 breakdown occurrences from resolved TNEB notices.
4. **Wind Line Snap Factor**: Function of cyclonic wind gusts exceeding 80 km/h in saturated soil conditions.

### B. Relief Shelter Backup Tie-Line Routing Formulation
For any relief shelter served by a vulnerable primary substation (elevation <= 3m MSL), the engine calculates the nearest **Safe Substation (elevation >= 8m MSL)** via spherical haversine distance and outputs the 11kV tie-line load transfer procedure.

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Vite 6 + React 19 + TypeScript 5.6 |
| Maps | Google Maps Platform via `@vis.gl/react-google-maps` |
| Weather API | Google Maps Platform Weather (Next-3) |
| AI/LLM | Google Gemini 3.7 Flash (`@google/genai`) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React (SVG) |
| Reservoir Data | CMWSSB Daily Bulletin (scraped via Neer Vaazhvu) |
| Deployment | Static SPA (Vite build) |
