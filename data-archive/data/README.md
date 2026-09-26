# Chennai Grid Intelligence & Climate Risk Platform (Track 5 Master Engine)

> **Platform Mission**: Shifting coastal cyclone disaster response from reactive post-landfall recovery to predictive, precision-guided pre-landfall action.  
> **Data Fusion Stack**: Google Earth Engine (GEE 2024–2026) + TNEB Super Index V2 Topology + GCC Stormwater Drains + GCC Emergency Relief Shelters + Gemini 3.7 Flash.  
> **Coverage**: 242 Chennai Grid Substations | 200 GCC Wards | 5,513 Stormwater Drains | 162 Relief Shelters | 1,252 Historical Outages.

---

## 1. Executive Data & Intelligence Overview

This directory houses the unified multi-hazard climate and electrical grid dataset for **Track 5 (Extreme Weather & Climate Risk Modeling)** of the *Code for Communities 2* Hackathon.

```
+----------------------------------------------------------------------------------------------------+
|                                    DATA CONVERGENCE ARCHITECTURE                                   |
+----------------------------------------------------------------------------------------------------+
|  1. HAZARD LAYER: GEE 2024–2026 (NASA SRTM 30m DEM + Dynamic World 10m + Sentinel-2 MNDWI)        |
|  2. HYDROLOGY LAYER: 5,513 GCC Stormwater Drains + Adyar, Cooum, Kosasthalaiyar, Buckingham Canal  |
|  3. GRID INFRASTRUCTURE: 242 TNEB Substations (33kV-400kV) + 11kV Feeders + 1,252 Q3 Outages       |
|  4. CIVIC LIFELINES: 162 GCC Relief Centers + Designated High-Ground Safe Evacuation Corridors    |
|  5. AI REASONING LAYER: Gemini 3.7 Flash Pre-Landfall Controlled Isolation SOPs & Dispatches       |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Satellite & Terrain Intelligence (Google Earth Engine 2024–2026)

Extracted via Earth Engine API (`namma-map-407ca`) across the Chennai Metropolitan Area:

* **Topography (NASA SRTM 30m DEM & Terrain Slope)**:
  * Measured precise ground elevation (meters above sea level) and drainage slope across all 242 substations.
* **Modern Surface Water & Soil Moisture (2024–September 2026)**:
  * **Google Dynamic World 10m (`GOOGLE/DYNAMICWORLD/V1`)**: 201 scenes processed for active water probability.
  * **Copernicus Sentinel-2 MNDWI (`COPERNICUS/S2_SR_HARMONIZED`)**: 442 cloud-screened passes for 10m wetness indexing.
* **Substation Inundation Risk Breakdown**:
  * 🔴 **Critical Storm Surge / Flood Risk ($\le 3\text{m}$ MSL)**: **9 Substations**
  * 🟠 **High Waterlogging Risk ($3\text{m} - 6\text{m}$ MSL)**: **19 Substations**
  * 🟡 **Moderate Risk ($6\text{m} - 10\text{m}$ MSL)**: **73 Substations**
  * 🟢 **Safe / High Ground ($> 10\text{m}$ MSL)**: **141 Substations**

### Top Critical Substations at Risk of Transformer Submergence:
| Substation Name | Circle | Elevation | Composite Risk | Connected Feeders | Anticipatory Action Protocol |
|---|---|:---:|:---:|:---:|---|
| **33/11 KV Thoraipakkam SS** | Chennai South 2 | $\le 0\text{m}$ MSL | **63.5 / 100** | 6 | Controlled De-energization ($T-2\text{h}$); Basement Sandbagging |
| **110/33-11 KV ETL SS** | Chennai South 2 | $\le 0\text{m}$ MSL | **59.8 / 100** | 5 | Controlled De-energization ($T-2\text{h}$); Deploy High-Capacity Dewatering Pumps |
| **33/11 KV Hiranandani SS** | Chennai South 2 | $3.0\text{m}$ MSL | **54.0 / 100** | 7 | Isolate low-lying busbars; switch relief shelters to alternative feeder |
| **Pallikaranai SS** | Chennai South 2 | $\le 0\text{m}$ MSL | **52.2 / 100** | 3 | Pre-landfall marshland drainage isolation |
| **33/11 KV DLF SS** | Chennai South 2 | $0.0\text{m}$ MSL | **44.8 / 100** | 1 | Protect transformer yard; continuous water level telemetry |
| **110/33-11 KV Tidel Park SS** | Chennai South 2 | $1.0\text{m}$ MSL | **44.5 / 100** | 2 | Standby mobile DG sets; seal underground cable ducts |
| **230/110KV Siruseri SS** | Chennai South 2 | $3.0\text{m}$ MSL | **44.0 / 100** | 2 | Critical 230kV transmission node protection |

---

## 3. Civic Lifelines & Relief Shelter Power Routing

Spatial cross-referencing between **162 GCC Relief Centers**, **5,513 Stormwater Drains**, and **Grid Substations**:

* 🟢 **118 Shelters (72.8%)**: Served by naturally elevated, resilient substations ($> 8\text{m}$ MSL).
* 🔴 **44 Shelters (27.2%)**: Primary supplying substations are vulnerable to surge.
* **Automated Tie-Line Solution**: The engine automatically pairs every vulnerable shelter with its nearest **Safe Substation ($> 8\text{m}$ MSL)**, calculating exact road distances for pre-landfall 11kV tie-line load switching.

### Sample Shelter Resilience Protocols:
| Zone / Ward | Relief Center | Primary SS (Vulnerable) | Backup Safe Substation | Distance | Action Protocol |
|---|---|---|---|:---:|---|
| **Zone 1 (Ward 7)** | West Thiruvottiyur | *Kaladipet SS* | **33/11 KV Thiruvottiyur SS** | 3.39 km | $T-2\text{h}$ Load transfer via 11kV Tie-line; Pre-stage 50kVA DG set |
| **Zone 1 (Ward 3)** | CPS, AS Nagar, Ennore | *Ennore 110kV SS* | **33/11 KV Thiruvottiyur SS** | 2.90 km | Isolate coastal breaker; switch to inland feeder |
| **Zone 2 (Ward 15)**| Manali High School | *Ennore 110kV SS* | **110/33-11 KV Melur SS** | 4.66 km | Switch to Melur 110kV grid feed |
| **Zone 13 (Ward 173)**| R.A. Puram Community Hall | *R A Puram 33kV SS* | **R.A. Puram 230/33 KV SS** | 1.58 km | Shift from 33kV yard to elevated 230kV GIS substation |
| **Zone 15 (Ward 196)**| Sholinganallur Center | *Thoraipakkam SS* | **230/110KV Siruseri SS** | 4.12 km | Isolate flooded OMR busbars; feed via inland 110kV corridor |

---

## 4. Complete Dataset Inventory (19 Files, 11.48 MB)

| File Name | Size | Description |
|---|:---:|---|
| **`gee_chennai_substations_risk.json`** | 190 KB | 242 Chennai Substations with GEE DEM, slope, Dynamic World, Sentinel-2 MNDWI & SOPs |
| **`gee_chennai_wards_vulnerability.json`** | 60 KB | Topography and flood risk classification for all 200 GCC Wards |
| **`gee_cyclone_surge_grid_simulation.json`** | 15 KB | Category 2/3 cyclone storm surge (1.5m – 3.0m) inundation matrix |
| **`chennai_shelter_grid_drain_fusion.json`** | 256 KB | 162 GCC Relief Shelters with primary vs. backup tie-line substations & road status |
| **`chennai_drains.json`** | 3.26 MB | 5,513 stormwater drain segments with slopes, uphill flags & outfalls |
| **`chennai_drains_ward_summary.json`** | 184 KB | Aggregated drainage metrics per ward (% uphill backflow, min road elevation) |
| **`chennai_rivers.json`** | 646 KB | Vector geometries for Adyar, Cooum, Kosasthalaiyar, and Buckingham Canal |
| **`gcc_wards_polygons.json`** | 432 KB | GeoJSON polygon boundaries for all 200 GCC Wards |
| **`gcc_zones.json`** | 873 KB | GeoJSON polygon boundaries for the 15 GCC Administrative Zones |
| **`gcc_relief_centers.json`** | 25 KB | 162 GCC flood relief evacuation centers with officer contacts & addresses |
| **`chennai_shelters.json`** | 2.5 KB | Designated elevated high-ground ramps & parking zones |
| **`gcc_flood_hotspots.json`** | 23 KB | Historical pluvial flood depth hotspots across Chennai |
| **`chennai_flood_depth_inches.json`** | 63 KB | Ground-truth flood depth benchmarks for model calibration |
| **`chennai_resolved_outages.json`** | 911 KB | 1,252 resolved Q3 2026 Chennai outages mapped to substations & feeders |
| **`chennai_substations_vulnerability.json`**| 239 KB | Breakdown vulnerability rankings across all Chennai substations |
| **`chennai_feeders_vulnerability.json`** | 112 KB | Vulnerability rankings for 11kV distribution feeders |
| **`chennai_sections_vulnerability.json`** | 67 KB | Vulnerability rankings for TANGEDCO AE Section Offices |
| **`circle_boundary.geojson`** | 4.39 MB | Official operational TNEB Circle boundary polygons |
| **`DATA_INVENTORY.md`** | 3.5 KB | Detailed technical schema and data dictionary |
