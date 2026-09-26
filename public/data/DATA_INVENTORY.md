# Chennai Grid Intelligence & Climate Risk Data Inventory

This directory contains the consolidated, multi-hazard spatial and electrical grid datasets for **Track 5 (Extreme Weather & Climate Risk Modeling)** of the *Code for Communities 2* Hackathon.

Total: **28 files across 5 categories** (~11.5 MB)

---

## Folder Structure

```
public/data/
├── gee/                     ← Google Earth Engine derived datasets
├── tneb/                    ← TNEB/TANGEDCO grid topology & outage intelligence
├── gcc/                     ← Greater Chennai Corporation municipal data
├── neervazhvu/              ← Neer Vaazhvu (MIT Urban Lab) water & hydrology data
├── simulation/              ← WeatherNext 3 cyclone scenario & simulated reservoir states
├── DATA_INVENTORY.md        ← This file
└── README.md                ← Detailed data documentation
```

---

## gee/ — Google Earth Engine (486 KB)

| File | Size | Records | Description |
|---|---|---|---|
| `gee_chennai_substations_risk.json` | 335 KB | 242 substations | 10-band multi-hazard risk scoring (SRTM DEM, Dynamic World, Sentinel-2, JRC, GPM, ERA5) |
| `gee_chennai_wards_vulnerability.json` | 136 KB | 200 wards | Zonal statistics: elevation, impervious surface, water probability per ward |
| `gee_cyclone_surge_grid_simulation.json` | 15 KB | Simulation grid | Category 2/3 cyclone storm surge inundation matrix |

## tneb/ — TNEB/TANGEDCO Grid Topology (5.76 MB)

| File | Size | Records | Description |
|---|---|---|---|
| `chennai_resolved_outages.json` | 933 KB | 1,252 notices | Q3 2026 outage notices mapped to substations, feeders, sections |
| `chennai_substations_vulnerability.json` | 245 KB | 242 nodes | Historical breakdown vulnerability rankings |
| `chennai_feeders_vulnerability.json` | 115 KB | 11kV feeders | Feeder failure frequency and parent substation mapping |
| `chennai_sections_vulnerability.json` | 68 KB | Section offices | TANGEDCO AE Section Office failure ranking |
| `circle_boundary.geojson` | 4.50 MB | 45 circles | Official TNEB operational circle boundary polygons |

## gcc/ — Greater Chennai Corporation (5.21 MB)

| File | Size | Records | Description |
|---|---|---|---|
| `chennai_drains.json` | 3.34 MB | 5,513 drains | Stormwater drain lines with gradients, backflow flags, dimensions |
| `gcc_zones.json` | 894 KB | 15 zones | GCC administrative zone boundary polygons |
| `gcc_wards_polygons.json` | 443 KB | 200 wards | GCC ward boundary polygons |
| `chennai_shelter_grid_drain_fusion.json` | 270 KB | 162 shelters | Shelter-grid-drain spatial fusion (primary + backup substations) |
| `chennai_drains_ward_summary.json` | 189 KB | 200 wards | Aggregated drainage metrics per ward |
| `chennai_flood_depth_inches.json` | 64 KB | Historical | Street-level flood depth benchmarks (inches) |
| `gcc_relief_centers.json` | 25 KB | 162 shelters | Raw GCC shelter locations and officer contacts |
| `gcc_flood_hotspots.json` | 24 KB | Historical | Ground-truth historical inundation hotspots |
| `chennai_coastal_hotspots.json` | 4 KB | Coastal points | Coastal vulnerability mapping |
| `chennai_shelters.json` | 3 KB | 7 sites | Elevated safe platforms (flyover ramps, high-ground) |

## neervazhvu/ — Neer Vaazhvu / MIT Urban Lab (1.67 MB)

| File | Size | Records | Description |
|---|---|---|---|
| `chennai_gwr_blocks.json` | 871 KB | Groundwater blocks | CGWB groundwater block geometries |
| `chennai_rivers.json` | 661 KB | 473 LineStrings | River waterway vector geometries (Adyar, Cooum, Kosasthalaiyar) |
| `chennai_sub_basins_risk.json` | 90 KB | Sub-basin zones | CEEW/TNGCC sub-basin flood risk index |
| `chennai_water_bodies_lost.json` | 27 KB | 15 lost lakes | Ancestral buried water bodies (encroached lakebeds) |
| `chennai_gwr_stats.json` | 18 KB | Block statistics | Groundwater recharge/depletion statistics |
| `chennai_live_reservoir_bulletin.json` | 5 KB | 7 reservoirs | Live CMWSSB daily reservoir storage bulletin |

## simulation/ — Cyclone Scenario Data (52 KB)

| File | Size | Records | Description |
|---|---|---|---|
| `weathernext3_chennai_cyclone_48h.json` | 46 KB | 61 hourly steps | DeepMind WeatherNext 3 cyclone trajectory simulation |
| `chennai_reservoirs_status.json` | 5 KB | 7 reservoirs | Simulated reservoir states under cyclone scenario |
