# 02 — Data Dictionary & Sources: SurgeGrid AI

This document catalogs all 28 datasets powering the SurgeGrid AI platform, organized by data category.

---

## 1. Active Datasets (Loaded at Runtime)

These files are fetched by the frontend (`App.tsx`) and rendered in the UI.

| Dataset File | Size | Records | Source | Status |
|---|---|---|---|---|
| `gee_chennai_substations_risk.json` | 335 KB | 242 nodes (186 in CMA) | GEE (NASA SRTM, Dynamic World, GPM, ERA5) | ✅ Active |
| `chennai_water_bodies_lost.json` | 27 KB | 15 lost lakes | Neer Vaazhvu / OpenCity Datajam | ✅ Active |
| `chennai_shelter_grid_drain_fusion.json` | 270 KB | 162 shelters | Spatial Fusion Engine | ✅ Active |
| `chennai_reservoirs_status.json` | 5 KB | 7 reservoirs | Simulated cyclone scenario | ✅ Active (SIMULATION) |
| `chennai_live_reservoir_bulletin.json` | 5 KB | 7 reservoirs | CMWSSB Daily Bulletin (Neer Vaazhvu scraper) | ✅ Active (LIVE) |
| `weathernext3_chennai_cyclone_48h.json` | 46 KB | 61 hourly steps | Google DeepMind WeatherNext 3 | ✅ Active (SIMULATION) |

**Live API Services** (not from `public/data/`):
| Service | Source | Data |
|---|---|---|
| Google Maps Weather API | `weathernext3.googleapis.com` | Temperature, wind, gusts, precipitation, humidity, condition |
| CMWSSB Reservoir Bulletin | `cmwssb.tn.gov.in/lake-level` (via scraper) | Live reservoir storage, inflow/outflow, sluice threat |

---

## 2. Reference Datasets (Available, Not Currently Rendered)

These files exist in `public/data/` and are available for future use but not loaded by the current UI.

| Dataset File | Size | Records | Source | Potential Use |
|---|---|---|---|---|
| `chennai_rivers.json` | 661 KB | 473 LineString features | River waterways GeoJSON | Rivers rendered natively by Google Maps |
| `chennai_drains.json` | 3.34 MB | 5,513 drain lines | GCC Stormwater Management | Drain overlay at high zoom levels |
| `chennai_drains_ward_summary.json` | 189 KB | 200 wards | Hydrological Aggregation | Ward-level backflow risk |
| `chennai_coastal_hotspots.json` | 4 KB | Coastal points | Coastal vulnerability mapping | Surge inundation markers |
| `chennai_gwr_blocks.json` | 871 KB | Groundwater blocks | CGWB Central Groundwater Board | Groundwater depletion overlay |
| `chennai_gwr_stats.json` | 18 KB | Block statistics | CGWB | Groundwater analytics |
| `chennai_sub_basins_risk.json` | 90 KB | Sub-basin zones | CEEW/TNGCC Risk Index | Basin-level flood risk |
| `chennai_flood_depth_inches.json` | 64 KB | Street-level depths | Field Survey Benchmarks | Inundation depth overlay |
| `chennai_resolved_outages.json` | 933 KB | 1,252 notices | TNEB Super Index V2 | Historical outage analytics |
| `chennai_substations_vulnerability.json` | 245 KB | 242 nodes | Outage Intelligence Engine | Substation failure ranking |
| `chennai_feeders_vulnerability.json` | 115 KB | 11kV feeder lines | Outage Intelligence Engine | Feeder failure frequency |
| `chennai_sections_vulnerability.json` | 68 KB | Section offices | Outage Intelligence Engine | TANGEDCO section ranking |
| `gee_chennai_wards_vulnerability.json` | 136 KB | 200 wards | GEE Zonal Statistics | Ward vulnerability overlay |
| `gcc_wards_polygons.json` | 443 KB | 200 wards | GCC GIS | Ward boundary polygons |
| `gcc_zones.json` | 894 KB | 15 zones | GCC GIS | Zone boundary polygons |
| `gcc_relief_centers.json` | 25 KB | 162 shelters | GCC Disaster Management | Raw shelter locations |
| `chennai_shelters.json` | 3 KB | 7 sites | Civic High-Ground Network | Elevated safe platforms |
| `gcc_flood_hotspots.json` | 24 KB | Historical points | GCC Flood Archives | Historical inundation |
| `circle_boundary.geojson` | 4.50 MB | 45 circles | TNEB GIS | Utility circle boundaries |
| `gee_cyclone_surge_grid_simulation.json` | 15 KB | Simulation grid | GEE + WeatherNext 3 | Surge grid overlay |

---

## 3. Primary Schema: Active Datasets

### Substations (`gee_chennai_substations_risk.json`)
```
name, circle, district, coordinates [lng, lat], elevation_m, slope_degrees,
satellite_water_probability_2026_pct, sentinel2_mndwi_2026,
historical_q3_2026_outages, connected_feeders_count, connected_sections_count,
feeders[], sections[], composite_risk_score (0-100), risk_category,
anticipatory_sop, distance_to_coastline_km, urban_impervious_built_pct,
ancestral_lakebed_hazard, lakebed_details {}
```

### Lost Water Bodies (`chennai_water_bodies_lost.json`)
```
geometry.coordinates [lng, lat], properties.name, properties.name_ta,
properties.type, properties.status, properties.historical_area_ha,
properties.current_area_ha, properties.replaced_by,
properties.approx_radius_m, properties.source, properties.notes
```

### Relief Shelters (`chennai_shelter_grid_drain_fusion.json`)
```
shelter_id, name, ward, zone, address, officer_in_charge, emergency_contact,
coordinates [lng, lat], elevation_m, drain_backflow_risk_pct,
shelter_viability_status (SAFE_HAVEN | COMPROMISED_INUNDATION),
compromised_reason, recommended_safe_shelter {}, primary_substation,
backup_safe_substation
```

### Reservoirs (`chennai_reservoirs_status.json` / `chennai_live_reservoir_bulletin.json`)
```
id, name, name_ta, river_basin, capacity_mcft, current_storage_mcft,
storage_pct, headroom_mcft, full_tank_level_ft, current_level_ft,
inflow_cusecs, outflow_cusecs, rainfall_24h_mm, emergency_sluice_threat,
fluvial_corridor_warning, threatened_substations[], catchment_area_sqkm
```

### Weather Simulation (`weathernext3_chennai_cyclone_48h.json`)
```
timestep_hour, hours_to_landfall, wind_speed_10m_kmh,
imerg_tp_1hr_mm, rainfall_24h_cumulative_mm,
mean_sea_level_pressure_hpa, simulated_storm_surge_msl_m,
alert_phase, phase_description
```

---

## 4. Coordinate Reference System

* **Spatial Projection**: WGS 84 (`EPSG:4326`)
* **Chennai Metropolitan Area Bounding Box**: Lat `[12.750°, 13.380°]`, Lon `[79.950°, 80.380°]`
* **Coordinate Convention**: All datasets use `[longitude, latitude]` array order (GeoJSON standard)

---

## 5. Data Provenance & Licensing

| Source | License | Attribution |
|---|---|---|
| Neer Vaazhvu (MIT Urban Lab) | CC BY-NC 4.0 | Lost water bodies, CMWSSB bulletin scraper |
| OpenCity Datajam Team 4 | Open Data | Shelter accessibility benchmarks |
| Google Earth Engine | GEE Terms of Service | SRTM, Dynamic World, Sentinel-2, JRC, GPM, ERA5 |
| Google Maps Platform | GMP ToS | Maps, Weather API, geocoding |
| Google DeepMind WeatherNext 3 | Research | Cyclone trajectory simulation |
| TNEB / TANGEDCO | Public Domain | Substation topology, outage records |
| GCC (Greater Chennai Corporation) | Public Domain | Relief shelters, drains, wards, zones |
| CMWSSB | Public Domain | Daily reservoir bulletin |
| CGWB | Public Domain | Groundwater block data |
