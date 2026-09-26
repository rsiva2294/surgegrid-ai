# Chennai Grid Intelligence & Climate Risk Data Inventory

This document details the multi-hazard spatial and electrical grid datasets for **Track 5 (Extreme Weather & Climate Risk Modeling)** of the *Code for Communities 2* Hackathon.

To maintain ultra-responsive client-side performance (< 60 FPS on Google Maps) and eliminate cognitive hoarding, datasets are cleanly divided into:
1. **Active Web Application Datasets** (`public/data/`): **7 files (~713 KB total)** — actively fetched and visualized in the UI.
2. **Research & Pipeline Archive** (`data-archive/`): **19 files (~10.8 MB total)** — heavy GeoJSONs, polygon boundaries, and historical reference registries preserved for research and backend pipelines.

---

## 1. Active Web Application Datasets (`public/data/`)

| Directory | Dataset File | Size | Records | UI Feature & Purpose |
|---|---|---|---|---|
| `gee/` | `gee_chennai_substations_risk.json` | 335 KB | 242 substations | Core electrical grid layer: multi-band satellite hazard scoring (SRTM elevation, Sentinel-2 MNDWI, Dynamic World impervious surface, clay saturation, anticipatory SOPs). |
| `neervazhvu/` | `chennai_water_bodies_lost.json` | 27 KB | 15 lakebeds | Ancestral encroached water bodies. Rendered as interactive indigo basins on Google Maps. Correlated with chronic flood hotspots. |
| `neervazhvu/` | `chennai_live_reservoir_bulletin.json` | 5.5 KB | 7 reservoirs | Daily CMWSSB water storage bulletin (Poondi, Cholavaram, Redhills, Chembarambakkam, Veeranam, Kannankottai Thervoykandigai). |
| `gcc/` | `gcc_flood_hotspots.json` | 24 KB | 53 points | Official GCC chronic flood hotspots. 16 hotspots (30.2%) sit directly inside lost lake basins (e.g., Ram Nagar 1st–8th Sts inside Pallikaranai Marsh). |
| `gcc/` | `chennai_shelter_grid_drain_fusion.json` | 270 KB | 162 shelters | Municipal relief shelters spatially fused with primary 11kV feeders, backup substations, and drain backflow vulnerabilities. |
| `simulation/` | `weathernext3_chennai_cyclone_48h.json` | 46 KB | 61 hourly steps | DeepMind WeatherNext 3 cyclone trajectory simulation driving the 5-step operational temporal scrubber (T-48h to Landfall). |
| `simulation/` | `chennai_reservoirs_status.json` | 5.2 KB | 7 reservoirs | Simulated cyclonic reservoir storage states under heavy rainfall deluge. |

---

## 2. Research & Pipeline Archive (`data-archive/`)

These files were moved out of the public client bundle because Google Maps natively renders roads, coastlines, and rivers, and rendering thousands of GeoJSON vectors directly crushes browser FPS.

| Archive Folder | Dataset File | Size | Records | Reason for Archival |
|---|---|---|---|---|
| `data-archive/gcc/` | `chennai_drains.json` | 3.34 MB | 5,513 polylines | Stormwater drain lines. Over 5,000 SVG paths freeze the Google Maps vector canvas. |
| `data-archive/gcc/` | `gcc_zones.json` | 894 KB | 15 zones | GCC administrative zone boundary polygons. |
| `data-archive/gcc/` | `gcc_wards_polygons.json` | 443 KB | 200 wards | Detailed ward boundary polygons. |
| `data-archive/gcc/` | `chennai_drains_ward_summary.json` | 189 KB | 200 wards | Ward drainage roll-ups. |
| `data-archive/gcc/` | `chennai_flood_depth_inches.json` | 64 KB | Historical points | Benchmark street-level flood depth records. |
| `data-archive/gcc/` | `gcc_relief_centers.json` | 25 KB | 162 shelters | Raw shelter contact register (superseded by `chennai_shelter_grid_drain_fusion.json`). |
| `data-archive/gcc/` | `chennai_coastal_hotspots.json` | 4 KB | 12 points | Coastal vulnerability records. |
| `data-archive/gcc/` | `chennai_shelters.json` | 3 KB | 7 sites | Elevated flyover shelter register. |
| `data-archive/tneb/` | `circle_boundary.geojson` | 4.50 MB | 45 circles | Massive TNEB operational boundary polygons. |
| `data-archive/tneb/` | `chennai_resolved_outages.json` | 933 KB | 1,252 notices | Raw Q3 2026 outage logs. |
| `data-archive/tneb/` | `chennai_substations_vulnerability.json` | 245 KB | 242 nodes | Historical breakdown vulnerability rankings (superseded by GEE 10-band dataset). |
| `data-archive/tneb/` | `chennai_feeders_vulnerability.json` | 115 KB | 11kV feeders | Feeder breakdown frequency register. |
| `data-archive/tneb/` | `chennai_sections_vulnerability.json` | 68 KB | Section offices | AE Section Office failure ranking. |
| `data-archive/neervazhvu/` | `chennai_gwr_blocks.json` | 871 KB | CGWB blocks | Groundwater block spatial polygons. |
| `data-archive/neervazhvu/` | `chennai_rivers.json` | 661 KB | 473 LineStrings | River vectors (Google Maps vector tiles already render rivers crisply). |
| `data-archive/neervazhvu/` | `chennai_sub_basins_risk.json` | 90 KB | Sub-basins | CEEW/TNGCC sub-basin flood risk boundaries. |
| `data-archive/neervazhvu/` | `chennai_gwr_stats.json` | 18 KB | CGWB blocks | Historical groundwater recharge/depletion time series (2011–2024). |
| `data-archive/gee/` | `gee_chennai_wards_vulnerability.json` | 136 KB | 200 wards | Zonal satellite statistics per municipal ward. |
| `data-archive/gee/` | `gee_cyclone_surge_grid_simulation.json` | 15 KB | Inundation matrix | Category 2/3 storm surge raster matrix. |

---

## 3. Hydrological Finding: Lost Lakes & GCC Chronic Flood Hotspots

Spatial intersection between `neervazhvu/chennai_water_bodies_lost.json` and `gcc/gcc_flood_hotspots.json` reveals:
- **16 out of 53 GCC Flood Hotspots (30.2%)** sit directly within historical lake/marsh footprints.
- **23 out of 53 GCC Flood Hotspots (43.4%)** sit within 1.5 km of an encroached lakebed.
- **The Pallikaranai Marsh Cluster**: 14 distinct GCC flood hotspots (including Ram Nagar 1st–8th streets, Saraswathi Nagar, Annai Therasa Nagar) coincide with the historical 2,500-hectare marsh basin.
- **The Sholinganallur Cluster**: Ponniyamman Koil is located just 148 m from the lost Sholinganallur Marsh.
