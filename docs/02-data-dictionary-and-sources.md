# 02 - Data Dictionary & Sources: SurgeGrid AI

This document details all 21 datasets powering the SurgeGrid AI platform.

---

## 1. Master Dataset Catalog

| Dataset File | Size | Records | Source | Primary Schema Fields |
|---|---|---|---|---|
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
