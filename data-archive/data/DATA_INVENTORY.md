# Chennai Grid Intelligence & Climate Risk Data Inventory (Track 5)

This directory contains the consolidated, multi-hazard spatial and electrical grid datasets for **Track 5 (Extreme Weather & Climate Risk Modeling)** of the *Code for Communities 2* Hackathon.

---

## Complete Data Assets (11.48 MB Total)

| Filename | Size | Data Source | Primary Role in Track 5 Platform |
| :--- | :--- | :--- | :--- |
| **`gee_chennai_substations_risk.json`** | 190 KB | Google Earth Engine (SRTM DEM + Dynamic World 10m + Sentinel-2 MNDWI) | 242 Chennai Substations with exact elevations, slope, modern 2024–2026 water recurrence, and automated pre-landfall de-energization SOPs. |
| **`gee_chennai_wards_vulnerability.json`** | 60 KB | Google Earth Engine (SRTM DEM Zonal Stats) | Topographic profiles, mean/min elevation, and flood risk categorization across all 200 GCC Wards. |
| **`gee_cyclone_surge_grid_simulation.json`** | 15 KB | GEE Multi-tier Storm Surge Model | Simulated Category 2/3 cyclone storm surge (1.5m – 3.0m) inundation matrix. |
| **`chennai_shelter_grid_drain_fusion.json`** | 256 KB | Spatial Multi-Layer Fusion Engine | 162 GCC Emergency Relief Shelters mapped with primary vs. backup safe tie-line substations, officer contacts, and evacuation access routes. |
| **`chennai_drains.json`** | 3.26 MB | GCC Stormwater Management | 5,513 individual stormwater drain lines with gradients, uphill/backflow flags, dimensions, and outfalls. |
| **`chennai_drains_ward_summary.json`** | 184 KB | Hydrological Fusion Model | Aggregated drainage metrics per ward (total network km, % uphill backflow choke risk, minimum road elevation). |
| **`chennai_rivers.json`** | 646 KB | Chennai River Waterways | Vector lines for Adyar River, Cooum River, Kosasthalaiyar River, and Buckingham Canal. |
| **`gcc_wards_polygons.json`** | 432 KB | GCC Geographic Information System | Exact GeoJSON polygon boundaries for all 200 Greater Chennai Corporation Wards. |
| **`gcc_zones.json`** | 873 KB | GCC Geographic Information System | GeoJSON polygon boundaries for the 15 GCC Administrative Zones. |
| **`gcc_relief_centers.json`** | 25 KB | GCC Disaster Management | Designated flood evacuation centers with zone, ward, address, and nodal officer phone numbers. |
| **`chennai_shelters.json`** | 2.5 KB | Civic High-Ground Network | Designated elevated vehicle parking and pedestrian high-ground ramps (e.g., G.N. Chetty Flyover ramp at +9.4m MSL). |
| **`gcc_flood_hotspots.json`** | 23 KB | GCC Historical Flooding Archives | Historical pluvial flood depth hotspots across Chennai for ground-truth model calibration. |
| **`chennai_flood_depth_inches.json`**| 63 KB | Historical Inundation Benchmarks | Street-level flood depth benchmarks (in inches) from past major monsoon events. |
| **`chennai_resolved_outages.json`** | 911 KB | TNEB Super Index V2 + Outage Engine | 1,252 historical Q3 2026 Chennai outage notices mapped to exact substations, 11kV feeders, and sections. |
| **`chennai_substations_vulnerability.json`** | 239 KB | Outage Intelligence Engine | Historical breakdown vulnerability rankings across all Chennai substations. |
| **`chennai_feeders_vulnerability.json`** | 112 KB | Outage Intelligence Engine | Vulnerability rankings for 11kV distribution feeders. |
| **`chennai_sections_vulnerability.json`**| 67 KB | Outage Intelligence Engine | Vulnerability rankings for TANGEDCO AE Section Offices. |
| **`circle_boundary.geojson`** | 4.39 MB | TNEB Official GIS Records | 45 Official TNEB Operational Circle boundary polygons. |
