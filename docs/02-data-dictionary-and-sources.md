# 02 - Data Dictionary & Sources: SurgeGrid AI

This document details the core spatial, meteorological, and electrical datasets powering the SurgeGrid AI platform.

---

## 1. Master Dataset Catalog

Audited against `public/data/`, `data-archive/data/` and `src/` on 2026-09-30. Only the datasets in §1.1 are loaded by the running app. Plan text is not data: it lives in `src/data/officialSources.ts` and [SOURCES.md](./SOURCES.md).

### 1.1 Shipped in `public/data/` (loaded at runtime)

| Dataset File | Size | Records | Loaded by | Notes |
|---|---|---|---|---|
| `chennai_tneb_grid.json` | 3.2 MB | 286 substations, 352 sections, 583 links, 2,678 embedded feeders, 1,213 outage-history events | `tnebGridService.ts` | v5.0.0. Substation fields include TNEB identity, `feeders[]`, `connections[]` (`confidenceTier`, `scopingRole`, `verificationMethod`, `polygonVerified`, `feederCode`), flood/climate enrichment (`elevationM`, `riskCategory`, `compositeRiskScore`, `distanceToCoastKm`, `anticipatorySop`), GCC/GEE ward fields (178 substations, 211 sections) and `healthProfile` / `outageHistory` (all 286). Sections carry boundary polygons (all 352). |
| `feeders/{circleCode}.json` | 21 MB (8 circles: 0400, 0401, 0402, 0404, 0406, 0408, 0410, 0411) | 3,335 feeder geometries | `feederGeometryService.ts` (on demand, IndexedDB-cached) | Keyed by `fdr_code`: `name`, `code`, `ss_code`, `volt`, `len`, `dts`, `cons`, `type`, `coords` (MultiLineString, RDP-decimated). |
| `dtr/{circleCode}.json` | 6.3 MB (same 8 circles) | 65,557 DTR points | `feederGeometryService.ts` (on demand, IndexedDB-cached) | Keyed by `fdr_code`: `id`, `name`, `kva`, `cons`, `lat`, `lng`. |
| `chennai_outage_gold_registry.json` | 962 KB | 2,789 signatures, 10 localities, 2,298 verified instances (v2.0.0) | `liveOutageService.getGoldRegistry()` | Bundled fallback for the GCS-hosted copy (see doc 10). |
| `scenarios/michaung2023.json`, `floods2015.json`, `monsoon2020.json` | 30 KB, 26 KB, 30 KB | 144, 120 and 144 hourly steps | `scenarioService.ts` | Real hindcasts: NASA GPM IMERG V07 rain and ERA5-Land wind and pressure, averaged over the Chennai area via Earth Engine. Fields: `timestep_hour` (0 = peak-rain hour), `utc`, `total_precipitation_1hr_mm`, `wind_speed_10m_kmh` (area mean, not gusts), `surface_pressure_hpa`, `simulated_storm_surge_msl_m` (constant 0.4 = normal tide; no surge modelled). Built by `surgegrid-ai-v2/pipeline/07_build_scenario_from_gee.py`. |
| `official_flood_layers.json` | 36 KB | 286 substations | `officialFloodLayers.ts` | Per substation: `nrsc2015` (inside the NRSC 2015 flood extent), `returnPeriod` (highest LOW/MODERATE/HIGH across the 5, 10, 25, 50 and 100-year flood maps, or null), `inundationZone` (worst GCC class, or null), `stagnation2015Within500m`, `hotspots2020Within500m`. Point-in-polygon and distance checks against OpenCity GCC layers. Built by `scripts/build_official_flood_layers.py`. Not a prediction. |
| `relief_centres.json` | 27 KB | 120 wards, 162 centres; 87 backup suggestions | `reliefCentres.ts` | `wards[ward]`: zone, a point inside the ward polygon (the GCC list has **no coordinates**), centres with address, officer and contact. `backups[substationCode]`: nearest other distribution-tier substation with none of the flood flags (yard at or below 2.0 m, inside the 2015 extent, Moderate/High rating), straight-line km. Built by `scripts/build_relief_centres.py`. |

**Runtime remote sources**

| Source | Endpoint | Used for |
|---|---|---|
| Live outage notices | `https://outage.nammamap.in/api/v2/outages` (Vite dev proxy `/api/v2`) | Active breakdown and scheduled-maintenance notices; cached in IndexedDB (`sg_live_chennai_outages_v1`) |
| Gold registry (cloud) | `https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/registry/chennai_outage_gold_registry.json` | Self-enriching registry, in-memory cached |
| Weather | `https://weather.googleapis.com/v1/currentConditions:lookup` | Live conditions (Google Maps Platform Weather API) |

`tnebGridService.ts` also contains a fallback that parses `/data/super_index_v2.compact.json`, but that file is not shipped, so the fallback only works if it is added.

### 1.2 Archived in `data-archive/data/` (Provenance & Offline Preprocessing)

A common point of confusion is whether the app reads directly from `data-archive/data/`. **It does not.** 

#### Architectural Rationale
In earlier prototypes (V1–V4), the project maintained 20+ separate raw GeoJSON and JSON files (e.g. `chennai_drains.json` [3.3 MB], `circle_boundary.geojson` [4.5 MB], `gee_chennai_substations_risk.json` [1.5 MB]). Loading these disjoint files in the browser caused ~30 MB initial load times, coordinate mismatches, and duplicate substation markers across circle boundaries.

During the **V5 Ground-Truth Rebuild**, offline compilation scripts (in `scripts/`) ingested those raw datasets and pre-fused them into the unified production files in `public/data/`. The raw files were moved to `data-archive/data/` for auditability, provenance, and offline script re-runs.

#### Lineage & Compilation Mapping Table

| Original File in `data-archive/data/` | Compilation Script | Destination in `public/data/` & Active App |
|---|---|---|
| `gee_chennai_substations_risk.json` (GEE SRTM elevation, flood risk) | `scripts/enrich_substation_history.cjs` | **Embedded into each substation** in `chennai_tneb_grid.json` (`elevationM`, `riskCategory`, `compositeRiskScore`, `distanceToCoastKm`). |
| `gee_chennai_wards_vulnerability.json` (GEE runoff, impervious %) | `scripts/enrich_grid_with_gcc.py` | **Embedded into ward attributes** in `chennai_tneb_grid.json` (`geeRunoffMm`, `geeImperviousPct`, `geeFloodCategory`). |
| `gcc_wards_polygons.json` & `gcc_zones.json` (200 wards, 15 zones) | `scripts/enrich_grid_with_gcc.py` | Point-in-polygon spatial join linking 178 substations and 211 sections to GCC wards/zones in `chennai_tneb_grid.json`. |
| `gcc_relief_centers.json` & `chennai_shelters.json` (162 shelters) | `scripts/enrich_grid_with_gcc.py` | Aggregated per ward and embedded as `wardReliefSheltersCount` in `chennai_tneb_grid.json`. |
| `chennai_resolved_outages.json` (1,252 historical notices) | `scripts/enrich_substation_history.cjs` | Embedded as 90-day `outageHistory[]` and `healthProfile` in `chennai_tneb_grid.json`. |
| `circle_boundary.geojson` (45 circles) | `scripts/build_chennai_grid_v5.cjs` | Extracted and embedded as boundary polygons for all 352 Section Offices in `chennai_tneb_grid.json`. |
| Raw Feeder Wire Vectors | `scripts/decimate-feeders.js` | RDP-decimated for WebGL performance and partitioned by circle into `public/data/feeders/{circleCode}.json`. |
| Raw DTR Points | `scripts/build_chennai_grid_v5.cjs` | Partitioned by circle and saved to `public/data/dtr/{circleCode}.json`. |

#### Unrendered / Historical Files in the Archive
The following datasets were evaluated during research or prototype phases and are **not loaded or rendered at runtime**:
* `chennai_drains.json` (5,513 stormwater drain lines) & `chennai_drains_ward_summary.json`
* `chennai_rivers.json` (4 major waterways: Adyar, Cooum, Kosasthalaiyar, Buckingham Canal)
* `gcc_flood_hotspots.json` & `chennai_flood_depth_inches.json`
* `weathernext3_chennai_cyclone_48h.json` (superseded by live Google Maps Weather API)
* `gee_cyclone_surge_grid_simulation.json`
* `chennai_substations_vulnerability.json`, `chennai_feeders_vulnerability.json`, `chennai_sections_vulnerability.json`

**Data-quality notes.** (1) `outageHistory` contains authentic TNEB periodic-maintenance, forced-trip, and emergency-repair events mapped from `chennai_resolved_outages.json`. All synthetic placeholder inspections (`pm-routine-…` and `pm-gen-…`) have been removed; substations with zero logged incidents maintain clean, authentic empty histories (`outageHistory: []`). (2) `riskCategory` takes five values in the data (`CRITICAL_SURGE_RISK` 5, `HIGH_WATERLOGGING_RISK` 40, `LOW_ELEVATION_RISK` 81, `MODERATE_RISK` 105, `SAFE` 55), but the `FloodRiskCategory` type in `src/types/tneb.ts` omits `LOW_ELEVATION_RISK`.

---

## 2. Coordinate Reference System
* **Spatial Projection**: WGS 84 (`EPSG:4326`)
* **Map camera bounds** (`CHENNAI_METRO_BOUNDS`, strict): Lat `[12.750, 13.400]`, Lon `[79.850, 80.380]`
* **Live-outage Chennai bbox** (`CHENNAI_BBOX`): Lat `[12.70, 13.40]`, Lon `[79.90, 80.40]`

---

## 3. Feeder Asset Attributes & 5-Tier Electrical Hierarchy

Feeders nested inside `substations[].feeders` in `chennai_tneb_grid.json` and dynamically hydrated via `tnebGridService.ts` carry the following operational schema:

| Field | Type | Description | Values / Examples |
|---|---|---|---|
| `name` | string | Official feeder line name from GIS records | `"11 KV SAP CAMP"`, `"TVS LUCAS"`, `"33 KV ANNAINAGAR SS"` |
| `code` | string | Unique 6-digit TNEB feeder code | `"221801"`, `"930423"` |
| `voltage` | string | Nominal operating voltage tier | `"11 kV"`, `"33 kV"`, `"22 kV"` |
| `lengthKm` | number | Surveyed line length in kilometers | `2.87` |
| `transformers` | number | Number of pole-mounted Distribution Transformers (DTRs) | `19` |
| `consumers` | number | Registered connected consumers from billing registers | `809` |
| `config` | string | Physical line installation type | `"UG"` (Underground), `"Overhead"`, `"Mixed"` |
| `type` | string | Grid asset designation | `"Distribution"`, `"Dedicated (HT Service)"`, `"Interconnector"` |
| `isDedicated` | boolean | Single-customer exclusive HT service (not sub-transmission trunk) | `true` (factories/institutions), `false` (trunks & neighborhood lines) |
| `lifelineCategory` | string (optional) | Municipal emergency priority classification | `'hospital'`, `'water'`, `'transit'`, `'governance'`, `'industrial_ht'` |
| `lifelineLabel` | string (optional) | Human-readable operational category badge | `"🏥 Hospital (Dedicated HT)"`, `"🚰 Water / Sewage Pumping (Dedicated)"` |
| `priorityLevel` | string (optional) | Disaster response load-shedding priority tier | `'P1_CRITICAL'`, `'P1_NON_CUT'`, `'P2_ESSENTIAL'`, `'P3_COMMERCIAL'` |

### Roster Sorting Order:
1. **Tier 1 (P1 Critical Lifelines)**: `P1_NON_CUT` / `P1_CRITICAL` (Water headworks, drainage pumping, major hospitals).
2. **Tier 2 (P2 Essential Infrastructure)**: `P2_ESSENTIAL` (Metro Rail, suburban railways, Government/Defense HQ).
3. **Tier 3 (33 kV Sub-Transmission Trunks)**: Inter-substation bulk step-down feeds, badged `[⚡ 33 kV Sub-Transmission Trunk] [INTER-SS]`.
4. **Tier 4 (P3 Commercial & Dedicated Industrial HT)**: Heavy industrial manufacturing feeds badged `[🏭 Dedicated HT Commercial/Industrial] [P3 COMMERCIAL]`.
5. **Tier 5 (Local Low-Voltage Distribution)**: Mixed neighborhood feeders ranked strictly descending by registered consumer count (`consumers`).

---

## 4. Disaster-Related Fields (what is official, what is ours)

Earlier versions of this section listed fields such as `esf15SlaHours` (6/12/24/48 h restoration times), `restorationStage` (a five-stage protocol), `rmuCount`, `plinthElevationM` (1.5 m), depths derived from elevation and a wind/surge trip reason. **None of those come from the four official plans**, and the fields were removed from the code. What remains:

### 4.1 Feeder fields (`FeederDetail`)
| Field | Meaning | Provenance |
| :--- | :--- | :--- |
| `config` | `UG`, `OH` or `Mixed` | TNEB feeder data |
| `lifelineCategory`, `lifelineLabel`, `priorityLevel` | `hospital`, `water`, `transit`, `governance`, `industrial_ht`; priority `P1_*` to `P3_COMMERCIAL` | **Our classification from the feeder name.** The national plan lists drainage pumping, drinking-water plants and hospitals for priority restoration (MoP DMP 2021, p. 239), but does not define these classes. |
| `isDedicated`, `ltLengthKm`, `isCmwssbSps`, `isGccShelterFeed` | Service and length facts | TNEB / GCC data |
| `circuitState` | Always `LIVE` in the data | Feeder status during a scenario is computed on screen from elevation and feeder type (see doc 05) |

### 4.2 Substation fields (`TnebSubstation`)
| Field | Meaning | Provenance |
| :--- | :--- | :--- |
| `elevationM` | Ground elevation, m above mean sea level | SRTM terrain data via Earth Engine |
| `distanceToCoastKm` | Distance to the coast | Computed from the coast line |
| `gccZone`, `gccWard`, ward hotlines, `wardReliefSheltersCount` | GCC administrative data | GCC |
| `riskCategory`, `compositeRiskScore` | Flood category and score | **SurgeGrid's own model, not from the plans.** Used only by the waterlogging filter and the ranking panel, and labelled as ours. |
| `hydroRisk.*` | Modelled depths, homes at risk, advisory text from the sister project's physical model | **Not shown anywhere.** The model did not validate (near-chance match to the 2015 satellite map; see `PROJECT_LOG.md` item 24). Kept in the file only for provenance. |
| `healthProfile`, `outageHistory` | 90-day history, grade A-D | Our health model (docs 08, 09) |

### 4.3 Official flood facts
Flood facts shown to users come from `official_flood_layers.json` and `relief_centres.json` (section 1.1), not from `hydroRisk`.
