# 02 - Data Dictionary & Sources: SurgeGrid AI

This document details the core spatial, meteorological, and electrical datasets powering the SurgeGrid AI platform.

---

## 1. Master Dataset Catalog

| Dataset File | Size | Records | Source | Primary Schema Fields |
|---|---|---|---|---|
| `chennai_tneb_grid.json` | 5.41 MB | 286 substations, 352 sections | TNEB V5 Ground-Truth Rebuild Engine | `substations[]`, `sections[]`, `connections[]` (with `confidenceTier`, `scopingRole`, `verificationMethod`, `polygonVerified`, `feederCode`), `totalConsumers` |
| `feeders/{circleCode}.json` | 27.2 MB (8 circles) | 3,438 feeder lines | TNEB GIS Vector Surveys | Keyed by `fdr_code`: `name`, `code`, `ss_code`, `volt`, `len`, `dts`, `cons`, `type`, `coords` (MultiLineString) |
| `dtr/{circleCode}.json` | 6.27 MB (8 circles) | 65,557 DTR points | TNEB GIS Distribution Network | Keyed by `fdr_code`: `id`, `name`, `kva`, `cons`, `lat`, `lng` |
| `weathernext3_chennai_cyclone_48h.json` | 28 KB | 61 hourly steps | Google DeepMind WeatherNext 3 | `timestep_hour`, `wind_speed_10m_kmh`, `imerg_tp_1hr_mm`, `mean_sea_level_pressure_hpa`, `simulated_storm_surge_msl_m`, `alert_phase` |
| `gee_chennai_substations_risk.json` | 190 KB | 242 nodes | GEE (NASA SRTM, Dynamic World, GPM, ERA5) | `name`, `coordinates`, `elevation_m`, `distance_to_coastline_km`, `urban_impervious_built_pct`, `composite_risk_score`, `risk_category`, `anticipatory_sop` |
| `gee_chennai_wards_vulnerability.json` | 60 KB | 200 wards | GEE Zonal Statistics | `ward_number`, `zone_number`, `elevation_mean_m`, `elevation_min_m`, `urban_impervious_built_pct`, `dynamic_world_water_prob_2024_2026_pct`, `flood_risk_category` |
| `chennai_shelter_grid_drain_fusion.json` | 256 KB | 162 shelters | Spatial Fusion Engine | `shelter_id`, `zone`, `ward`, `address`, `officer_in_charge`, `emergency_contact`, `primary_substation`, `backup_safe_substation`, `evacuation_advisory` |
| `chennai_drains.json` | 3.26 MB | 5,513 lines | GCC Stormwater Management | `id`, `slope`, `is_uphill`, `length_m`, `dimension`, `road_elevation_m`, `status`, `geometry` |
| `chennai_drains_ward_summary.json` | 184 KB | 200 wards | Hydrological Aggregation | `total_drains`, `uphill_backflow_count`, `gravity_flow_count`, `total_length_km`, `backflow_risk_pct`, `min_road_elevation_m` |
| `chennai_rivers.json` | 646 KB | 4 waterways | Chennai River Waterways | Adyar River, Cooum River, Kosasthalaiyar River, Buckingham Canal vector geometries |
| `gcc_wards_polygons.json` | 432 KB | 200 wards | GCC Geographic Information System | Ward polygon boundaries (Wards 1–200) |
| `gcc_zones.json` | 873 KB | 15 zones | GCC Geographic Information System | Zone polygon boundaries (Zones 1–15) |
| `gcc_relief_centers.json` | 25 KB | 162 shelters | GCC Disaster Management | Relief shelter locations, ward mapping, officer contacts |
| `chennai_shelters.json` | 2.5 KB | 7 sites | Civic High-Ground Network | Designated elevated vehicle parking ramps and safe pedestrian platforms |
| `gcc_flood_hotspots.json` | 23 KB | Historical points | GCC Flood Archives | Ground-truth historical inundation hotspots |
| `chennai_flood_depth_inches.json` | 63 KB | Historical benchmarks | Field Survey Benchmarks | Street-level flood depths in inches |
| `chennai_resolved_outages.json` | 911 KB | 1,252 notices | TNEB Super Index V2 Engine | Resolved Q3 2026 Twitter outage notices with substation and feeder mapping |
| `chennai_substations_vulnerability.json` | 239 KB | 242 nodes | Outage Intelligence Engine | Substation failure ranking and affected feeder counts |
| `chennai_feeders_vulnerability.json` | 112 KB | 11kV lines | Outage Intelligence Engine | Feeder failure frequency and parent substation mapping |
| `chennai_sections_vulnerability.json` | 67 KB | Section offices | Outage Intelligence Engine | TANGEDCO AE Section Office failure ranking |
| `circle_boundary.geojson` | 4.39 MB | 45 circles | TNEB GIS Operational Maps | Official operational utility circle boundaries |

---

## 2. Coordinate Reference System
* **Spatial Projection**: WGS 84 (`EPSG:4326`)
* **Bounding Box**: Lat `[12.750, 13.350]`, Lon `[79.950, 80.350]`

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

