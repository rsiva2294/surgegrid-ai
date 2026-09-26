# Changelog: SurgeGrid AI

All notable changes, architectural decisions, and data extractions for the SurgeGrid AI project are documented in this file.

---

## [2.0.0] - 2026-09-26

### Major: Google Maps Platform Migration & Live Data Integration

#### Changed
- **Migrated from Leaflet to Google Maps Platform** (`@vis.gl/react-google-maps`) for the primary map canvas.
- **Replaced hardcoded mock weather data** with live Google Maps Platform Weather API (WeatherNext-3) calls via `liveDataService.ts`.
- **Replaced static reservoir data** in LIVE mode with live CMWSSB Daily Reservoir Bulletin (scraped via Neer Vaazhvu pipeline from `cmwssb.tn.gov.in/lake-level`).
- **Dual-mode architecture**: LIVE mode (real-time weather + live reservoir data) and SIMULATION mode (pre-computed 48-hour cyclone scenario).
- **Substation markers**: Migrated from `AdvancedMarker` to standard `Marker` with inline SVG data URI generators for risk-colored icons (critical=red, high=amber, moderate=sky, low=green, lakebed=indigo ring).
- **Shelter markers**: Dynamic SVG icons — green shield (SAFE_HAVEN) in LIVE, red warning (COMPROMISED_INUNDATION) in SIMULATION.

#### Added
- **Live Weather Telemetry Bar**: Real-time temperature, wind speed, gusts, precipitation, and condition displayed in the map header (Google Weather data attribution included).
- **Live Reservoir Storage Panel**: 7 Chennai reservoir levels with storage %, inflow/outflow cusecs, headroom, and sluice threat level from CMWSSB daily bulletin.
- **Chennai Geographic Restriction**: Map viewport locked to CMA bounds (N: 13.38°, S: 12.75°, W: 79.95°, E: 80.38°) with `strictBounds: true` and `minZoom: 10`. Cannot pan outside Chennai.
- **Substation data filtering**: Only 186 substations within CMA bounds rendered (filtered from 242 total dataset covering Trichy, Coimbatore, Madurai).
- **Bilingual UI**: English ↔ Tamil toggle across all panels (header, map, action panel, metric cards).
- **Mode-aware Shelter Access Audit**: LIVE mode shows green "All 162 shelters accessible" all-clear. SIMULATION mode shows 18 compromised shelters with Access Failure warnings and safe rerouting.
- **Data Sources & Attribution Tab**: Full provenance panel with links to Neer Vaazhvu, OpenCity Datajam, GEE, TNEB, GCC, CMWSSB.
- **New data files**:
  - `chennai_live_reservoir_bulletin.json` — Live CMWSSB reservoir data
  - `chennai_coastal_hotspots.json` — Coastal vulnerability points
  - `chennai_gwr_blocks.json` / `chennai_gwr_stats.json` — CGWB groundwater data
  - `chennai_sub_basins_risk.json` — CEEW/TNGCC sub-basin flood risk index

#### Removed
- **River overlay**: Removed 473 LineString polylines from `chennai_rivers.json` — rivers (Adyar, Cooum, Kosasthalaiyar) are rendered natively by Google Maps base layer without duplication.
- **POI toggle button**: Commercial/retail POIs are now permanently hidden via `cleanMapStyles` (restaurants, shops, entertainment, transit labels all suppressed). No user toggle needed.
- **Leaflet dependency**: Fully replaced by Google Maps Platform. `GridMap.tsx` retained as fallback reference only.

#### Fixed
- **`ReferenceError: google is not defined`**: Added `getGoogleMaps()` guard function for SVG marker icon constructors (`google.maps.Size`, `google.maps.Point`) that were accessed before SDK initialization.
- **`mapId` conflict**: Removed `mapId` from `<Map>` component — required for custom `styles` to work (POI decluttering). `AdvancedMarker` requires `mapId`, so switched to standard `Marker`.
- **Red markers in fair weather**: Substation and shelter markers now reflect actual current conditions. LIVE mode with 0mm rain shows all-green markers. Red/critical only appears in SIMULATION mode.
- **Shelter audit showing red in LIVE mode**: Access Failure warnings now only appear in SIMULATION mode. LIVE mode shows reassuring all-clear.

---

## [1.0.0-init] - 2026-09-26

### Added
- **Repository Setup**: Initialized dedicated Hackathon workspace at `C:\projects\surgegrid-ai` with Vite 6 + React 19 + TypeScript + Tailwind CSS.
- **DeepMind WeatherNext 3 Simulation**: Generated 61 hourly timesteps ($T-48\text{h} \rightarrow T-0\text{h} \rightarrow T+12\text{h}$) of cyclonic wind, IMERG precipitation, barometric pressure eye drop, and surge wave height.
- **GEE 10-Band Multi-Hazard Extraction**: Extracted and attached 10 satellite and meteorological bands across all 242 Chennai Substations and 200 GCC Wards (NASA SRTM DEM, Dynamic World 10m Built-Up & Water, JRC 38-Year Water Baseline, GPM IMERG Michaung Rainfall, ERA5 Wind Gusts & Volumetric Soil Moisture).
- **Spatial Lifeline Fusion Engine**: Fused 5,513 GCC stormwater drain lines and 162 GCC emergency shelters with TNEB grid topology, automatically computing backup 11kV tie-line load transfer routes for all 44 flood-vulnerable shelters.
- **Google Cloud Services Activated**: Enabled `maps-backend.googleapis.com`, `generativelanguage.googleapis.com`, `bigquery.googleapis.com`, and `airquality.googleapis.com` on project `namma-map-407ca`.
- **System Documentation**: Established `docs/` suite including Architecture (`01-architecture-and-system-design.md`), Data Dictionary (`02-data-dictionary-and-sources.md`), and Changelog (`CHANGELOG.md`).
