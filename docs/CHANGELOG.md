# Changelog: SurgeGrid AI

All notable changes, architectural decisions, and data extractions for the SurgeGrid AI project are documented in this file.

---

## [1.4.0-gcc-municipal-and-satellite-integration] - 2026-09-27

### Added
- **GCC 200-Ward City Disaster Management Ground Truth Fusion**:
  - Extracted Ward Disaster Management Committees for all 200 Greater Chennai Corporation (GCC) Wards from the 804-page *City Disaster Management Perspective Plan 2023* (`CDMP 2023`).
  - Parsed official CUG telephone directory:
    - **Ward Councillor CUG**: `9445467xxx` series (`9445467000 + Ward`).
    - **GCC Engineering Assistant Engineer**: `9445190xxx` series.
    - **CMWSSB Water & Sewerage Area Engineer**: `8144930xxx` series.
    - **TANGEDCO O&M Ward AE/JE**: `9445850xxx` series.
    - **GCC Central Disaster Control Room**: `1913` (Ripon Building 24x7).
- **Google Earth Engine (GEE) Satellite Vulnerability Integration**:
  - Attached empirical satellite observations for all 200 wards:
    - `simulated_surface_runoff_mm`: Cyclone rainfall accumulation and watershed surface flow.
    - `urban_impervious_built_pct`: ESA WorldCover/Sentinel-2 impervious surface built percentage.
    - `ward_flood_risk_score` and `flood_risk_category`.
- **GCC Designated Disaster Relief Shelters**:
  - Cross-referenced 162 official GCC designated shelters (schools, community halls, relief camps) across all 200 wards.
- **High-Precision Spatial Containment Join (`shapely`)**:
  - Point-in-polygon containment mapped **178 of 286 substations** (62.2%) and **211 of 352 section offices** (59.9%) directly to their respective GCC Zone (1–15) and Ward (1–200).
  - Explicitly differentiated urban municipal grid nodes from the **108 peri-urban CMA nodes** (400kV/230kV bulk injection corridors in Kanchipuram/Tiruvallur/Chengalpattu circles), badged as `Peri-Urban CMA Grid Hub • EHT Transmission Corridor`.
- **Lifeline Feeder Badging**:
  - Automatically classified and badged:
    - `[💧 CMWSSB Sewage Pumping]` (`P1 NON-CUT`)
    - `[🏕️ GCC Relief Shelter Feed]` (`P1 CRITICAL`)
- **Substation & Section Inspector Cockpit Enhancements**:
  - **Pinned Header Badge**: Added `🏛️ Z{Zone}:W{Ward}` pill (e.g. `🏛️ Z6:W69` on Sembium SS) providing immediate municipal jurisdiction at a glance.
  - **Administrative Jurisdiction Card**: Enriched to display `GCC Zone {X} ({ZoneName}) • Ward {Y}` and `GCC CDMP Disaster Ward`.
  - **Municipal & Satellite Disaster Stack Card**: Displayed in Substation Inspector (Split View + Tab 3 Info) and AE Section Inspector with GEE runoff, impervious percentage, relief shelter count, and four direct `tel:` CUG emergency call buttons.
- **Reference Documentation**:
  - Published comprehensive architectural specification `docs/06-gcc-municipal-and-satellite-vulnerability-integration.md`.

---

## [1.3.1-ui-ergonomics-refinement] - 2026-09-27

### Fixed & Refined
- **Disaster Protocol Selector Ergonomics**:
  - Eliminated horizontal scroll container (`overflow-x-auto`) that previously forced scrolling and clipped the first option (`Normal Grid`).
  - Compacted labels into clean, high-visibility pills (`🌤️ Normal`, `🟡 Alert`, `🌀 Severe >80k`, `🌊 Surge 3.2m`) with `whitespace-nowrap` ensuring all 4 options fit side-by-side across all viewport sizes.
- **Unified Statutory Alert Banner Alignment**:
  - Replaced disjointed multi-line wrapped container with awkward pipe separators (`|`) by a unified, centered, single-line alert pill (`max-w-xl text-center justify-center`).
  - Delivers balanced, polished typography under all active disaster scenarios (e.g. `⚠️ TNSDMA 3.0m Surge Mandate: Substation Inundation & Mobile Dewatering Active`).
- **Substation Info Card Above-the-Fold Restructuring**:
  - **Emergency Alert Promotion**: Dynamically promoted the active switchyard inundation alert (`CRITICAL: Switchyard Inundation Event`) to the **very top** of Tab `Info` so life-safety notifications are immediately visible without scrolling.
  - **Consolidated Administrative & Switchyard Specs**: Merged administrative circle, region code, MVA capacity, transformer count, and incomer feeder tags into a unified, space-efficient single card with compact Google Maps GPS navigation.
  - **2×2 High-Density Flood Risk Matrix**: Streamlined terrain elevation (-1m MSL), coast distance (7 km), composite risk score (51.1/100), 2015 Flood submersion benchmark, switchgear plinth clearance ($1.5\text{ m GL}$), and dewatering pump SOP into a tight, scannable grid completely visible above the fold.

---

## [1.3.0-disaster-resilience-engine] - 2026-09-27

### Added
- **TNSDMA 2023 & TANGEDCO Disaster Operations Cockpit**:
  - Implemented top-center interactive Disaster Protocol selector with 4 realistic operating modes:
    1. **Normal Grid (`🌤️`)**: Standard clear-sky grid operations.
    2. **Cyclone Watch Alert (`🟡`)**: 65 km/h gusts, lineman foot patrol standby, GCC tree-trimming liaison.
    3. **Severe Cyclone Landfall (`🌀`)**: 90 km/h gusts (Michaung / Vardah scale), executing the statutory TNSDMA §5.6 pre-emptive overhead line trip to prevent public electrocution from fallen conductors while preserving underground cables.
    4. **Extreme Surge Catastrophe (`🌊`)**: 3.2m coastal storm surge, testing the official TNSDMA 3.0m MSL threshold and triggering switchyard submersion alarms and mobile diesel dewatering pump mandates.
- **Statutory ESF 15 Restoration SLAs**:
  - Attached statutory recovery time targets to all 2,678 Chennai feeders:
    - `⏱️ ESF 15: 6h SLA`: Tier 1 P1 Critical Lifelines (Water headworks, acute hospitals, emergency HQ).
    - `⏱️ ESF 15: 12h SLA`: Tier 2 P2 Essential (Metro Rail, Southern Railway) and Tier 3 (33 kV Sub-transmission Trunks).
    - `⏱️ ESF 15: 24h SLA`: Tier 4 P3 Commercial & Dedicated Industrial HT Services.
    - `⏱️ ESF 15: 48h SLA`: Tier 5 Neighborhood Distribution Feeders.
- **Post-Vardah 13,810 Automated RMU Network Model**:
  - Computed and rendered the active Ring Main Unit (RMU) loop count on all underground and mixed feeders (`[🔄 N RMU Loops]`), simulating modern sectionalized loop rings that allow isolating flooded spans while keeping unflooded loops energized.
- **TANGEDCO 5-Stage Sequential Restoration Protocol**:
  - Classified every feeder into its canonical restoration sequence stage (`Stage 3: Sub-Transmission Trunk / Express Lifeline`, `Stage 4: Automated RMU Priority Loop`, `Stage 5: DTR Megger Testing & LT Consumer Energization`).
- **Substation Terrain & 2015 Flood Historical Benchmarks**:
  - Enriched Substation Terrain & Risk Profiles in both the Drawer Inspector and Split View Cockpit with:
    - 2015 Floods Submersion Benchmark (up to 1.8m / 6ft peak depth in vulnerable Adyar/Cooum/Buckingham basins).
    - TNEB Switchgear Equipment Plinth Clearance (1.5m standard above local ground level).
    - TNSDMA 2023 Coastal Surge Standard (3.0m MSL limit).
    - Mobile Dewatering Pump Mandate status.
- **Statutory Documentation Reference**: Published `docs/05-disaster-management-and-statutory-sop-linkage.md` detailing the legal mandates, SOP clauses, and architecture.

---

## [1.2.2-feeder-tiering-engine] - 2026-09-27

### Added
- **Deterministic 5-Tier Electrical & Priority Feeder Sorting**:
  - Replaced arbitrary raw database row ordering in the Substation Inspector Drawer and Split View Cockpit with a 5-tier electrical hierarchy:
    1. **Tier 1 (P1 Critical Lifelines)**: Water headworks, sewage pumping, major trauma hospitals (`P1 NON-CUT`).
    2. **Tier 2 (P2 Essential Infrastructure)**: Metro Rail, suburban transit, Government/Emergency HQ (`P2 ESSENTIAL`).
    3. **Tier 3 (33 kV Sub-Transmission Trunks)**: Inter-substation step-down lines badged `[⚡ 33 kV Sub-Transmission Trunk] [INTER-SS]`.
    4. **Tier 4 (P3 Commercial & Dedicated Industrial HT)**: Heavy manufacturing and industrial estate taps badged `[🏭 Dedicated HT Commercial/Industrial] [P3 COMMERCIAL]`.
    5. **Tier 5 (Local Distribution Feeders)**: Neighborhood 11 kV lines ranked strictly descending by registered consumer population served.
- **Dedicated Feeder List Status Bar**: Added an ergonomic subheader tag (`⚡ Sorted: Priority & Voltage Tier • N lines`) providing immediate visual confirmation of the applied sorting logic.

### Fixed
- **Sub-Transmission vs. Dedicated HT Heuristic Disambiguation**: Resolved false positive `isDedicated: true` bug on 33 kV sub-transmission interconnect lines (e.g. `33 KV ANNAINAGAR SS`, `33KV TNHB KORATTUR SS`, `6th AVENUE ANNANAGAR`). Because these lines feed downstream substations, their pole transformer count and retail consumer count at the feeding yard are zero (`transformers: 0`, `consumers: 0`), which previously triggered the single-customer tap heuristic and caused them to be visually sandwiched between P3 Commercial feeders.
- **Contiguous Industrial Classification**: P3 Commercial HT lines (`TVS LUCAS`, `WHEELS INDIA`, `SIDCO`, etc.) now render contiguously in Tier 4 without inter-substation trunks in between.

---

## [1.2.1-v5-confidence-engine] - 2026-09-27

### Added
- **Ray-Casting Polygon Containment Engine (`ST_Contains`)**: Implemented bounding-box accelerated Jordan curve point-in-polygon tests indexing 1,956 switchyard boundary polygons (`substations_polygons.geojson`), proving physical feeder vector entry inside recipient yards.
- **3-Tier Grid Confidence Model**: Classified all 318 inter-substation electrical connections into mutually exclusive pathways:
  - **Level 1 Verified (228 links, 71.7%)**: 88 polygon containment (`ST_Contains == TRUE`), 88 co-located campus step-downs ($\le 150\text{m}$), and 52 surveyed 400kV/230kV EHT bulk transmission corridors.
  - **Level 2 Probable (90 links, 28.3%)**: Nominal step-down proximity ($\le 8.5\text{km}$), advisory only.
  - **Level 3 Unverified (0 links, 0.0%)**: Strictly excluded from production datasets.
- **Scoping Role Attribute & Governance**: Enforced `scopingRole` (`PHYSICAL_TOPOLOGY_ONLY` for L1; `ADVISORY_ONLY` for L2) ensuring automated outage algorithms do not assume live customer de-energization without real-time SCADA confirmation.
- **Cockpit Visual Confidence Styling**:
  - Rendered Level 1 links as solid, high-contrast polylines with directional step-down pulse animations and emerald `[L1 Verified]` badges.
  - Rendered Level 2 links as dashed amber polylines (`#f59e0b`) with amber `[L2 Inferred]` badges.
- **Operational Topology Scoping Disclaimer**: Added map canvas banner distinguishing static GIS conductor paths from live breaker/SCADA state.
- **Technical Provenance Reference**: Published `docs/04-electrical-grid-linkages-provenance.md` detailing the dual-endpoint methodology, verbatim JSON extracts, and circuit reconciliation across 286 substations and 5,192,167 registered consumers.

---

## [1.2.0-v5-ground-truth] - 2026-09-27

### Added
- **Ground-Truth Grid V5 Architecture**: Comprehensive data pipeline update resolving all duplicate entities and deploying a 100% verified master registry of 286 unique Chennai substations.
- **Option A Electrical Grid Links**: Implemented incoming-to-outgoing feeder line validation matching downstream incoming lines (`in_fdr_n_1/2/3`) against upstream feeding substations, eliminating all fictional cross-city ties.
- **Surveyed Feeder Vector Loader & 42k+ DTRs**: Asynchronous on-demand loader (`feederGeometryService.ts`) for real surveyed 11 kV MultiLineString street routes (`/data/feeders/{circle}.json`) and 42,000+ Distribution Transformers (`/data/dtr/{circle}.json`) with live kVA, asset IDs, and metered consumer telemetry.
- **External Google Maps Hyperlink**: Replaced raw decimal GPS coordinates with an interactive `Google Maps ↗` button opening directly in a new tab (`https://www.google.com/maps?q=${lat},${lng}`) with full coordinate hover tooltips.
- **Technical Reference Documentation**: Created `docs/v5-ground-truth-rebuild.md` detailing the V5 pipeline, data provenance, and ground-truth verification matrix.

### Fixed & Enhanced
- **Zero-Approximation Policy**: Completely eliminated the fallback radial spur line (`hash % 360` approximation). If a feeder lacks digitized street vectors, only real surveyed DTR points and switchyard coordinates are plotted—zero fictional lines are rendered.
- **Razor-Sharp Conductor Rendering**: Removed multi-layered translucent blurred glow polylines that made feeder lines appear hazy, restoring crisp, utility-grade solid conductor cables with directional power flow arrows.
- **Typography & Alignment Scaling**: Upgraded font sizes across the Substation Info tab, Switchyard cards, Climate & Flood Risk metrics, AE Depot section, and header Quick-Stats ribbon from microscopic `text-[8px]` to legible `text-[10px]`–`text-xs` / `text-sm font-bold`.
- **Administrative Ribbon Formatting**: Balanced `Circle` and `Region` spacing with `whitespace-nowrap`, eliminating premature truncation and awkward wide spacing against the vertical divider.

---

## [1.1.0-cockpit] - 2026-09-26

### Added
- **TNEB Super Index V2 Topology**: Embedded 286 Chennai substations, 352 AE Section Offices, and 1,493 precomputed bidirectional electrical interconnections into `public/data/chennai_tneb_grid.json`.
- **Pure Zero-POI Vector Canvas**: Custom light and dark vector map styles removing all commercial, transit, and landmark POIs for a distraction-free electrical grid canvas.
- **Circuit Isolation & Power Flow**: Added on-demand "Show Connections" switch isolating the active electrical circuit (Substation $\leftrightarrow$ Substation trunks and step-downs) with directional flow arrows.
- **On-Demand Section Jurisdictional Boundaries**: Embedded official GeoJSON boundaries across 342 AE Section Offices, rendering warm amber territorial polygons with auto-framing on selection.
- **Selection Beacon Halo**: Integrated dedicated high-contrast radar beacon ring (`selectionHaloRef`) providing instant targeting clarity in both light and dark modes.
- **Unified Left-Hand Control Stack**: Relocated collapsible **TNEB Grid Layers** control directly beneath the Search Box on the top-left, freeing the entire right side for the Substation & Section Inspector Drawer without UI overlap.
- **Visual Field Guide & Documentation**: Added `docs/03-chennai-grid-topology-and-field-guide.md` accompanied by 6 high-resolution engineering photographs in `docs/images/` covering all tiers from 400kV Bulk EHV stations to the consumer meter box.
- **On-Demand Feeder Corridors & DTR Transformers**: Interactive feeder selection in the Substation Inspector Drawer. Clicking any feeder plots its glowing 11 kV line with directional flow arrows, distributes individual pole-mounted DTR transformer pins along the road, and reveals interactive DTR step-down specs on click.
- **Critical Lifeline Feeder Classification & Disaster Priority Badging**: Classified 223+ critical feeders across Chennai substations into Hospitals (P1 Non-Cut, Rose glow), Water & Sewage Pumping (P1 Non-Cut, Cyan/Sky glow), Metro & Rail Mass Transit (P2 Essential, Purple glow), and Government / Defense HQ (P2 Essential, Amber glow). Added a "⭐ Critical Lifelines" quick-filter button to immediately isolate vital infrastructure feeders during cyclone preparation. Distinguishes between Dedicated HT service feeds and Shared neighborhood distribution lines.
- **Full-Height Inspector Cockpit with Tabs & Side-by-Side Split View**: Re-engineered the Substation Inspector dialog to span the full window height (`top-4 bottom-4`), eliminating cramped scrolling. Added clean tabbed navigation (`🔌 Feeders`, `⚡ Grid Links`, `ℹ️ Info`) where each section receives 100% of the vertical space, plus an instant `[⤢ Split View]` toggle button that expands the dialog to `860px` dual-columns displaying Grid Connections and Outgoing Feeders side-by-side simultaneously.
- **Substation Elevation, Coastal Surge & Flood Risk Profiling (P0)**: Integrated Google Earth Engine satellite topography (`elevation_m`, `distance_to_coastline_km`, `composite_risk_score`) across all 286 Chennai substations. The inspector header displays live terrain elevation (e.g. `⛰️ 2.1m MSL • 🌊 Surge Risk`), while the Info tab and Split View reveal full hydrological risk profiles and field-actionable storm standard operating procedures (SOPs).
- **Feeder Trip Vulnerability & Breakdown Recurrence Badging (P0)**: Fused 560 historical feeder outage records (`chennai_feeders_vulnerability.json`) directly into feeder cards. Feeders with trip records display dynamic fragility badges (e.g. `⚡ 4 Trips` in rose or `⚡ 2 Trips` in amber) with hoverable incident date logs, enabling disaster dispatchers to identify fragile lines before storm landfall.
- **Raw TNEB GIS Incomer Extraction & Switchyard Hardware Profiling**:
  - Ingested official incoming transmission line records (`in_fdr_n_1`, `in_fdr_n_2`, `in_fdr_n_3`, `no_in_fdr`) directly from `data-source/tneb_gis_raw/grid_infrastructure/substations_points.geojson` across all 286 Chennai substations.
  - Resolved orphaned distribution substations (such as `33/11KV THIRUMALAIVASAN NAGAR SS`) by establishing upstream transmission ties to `110/33-11 KV AVADI SS` (0.5 km), `33/11 KV MENAMBEDU SS` (5.6 km), and `110/33-11 KV AMBATTUR SS` (6.3 km).
  - Added authentic hardware specifications: Power Transformer units (`powerTransformersCount`), Total Installed Capacity (`totalCapacityMva` in MVA), and Maximum Demand (`peakDemandMva`).
  - Rendered dedicated **Switchyard & Power Transformers** specification cards with live incomer line breaker tags across both the Substation Inspector Info Tab and the Side-by-Side Split View.

### Fixed
- **Physical Voltage Distance Ceilings & Grid Topology Sanitization**:
  - Investigated and resolved anomalous cross-city interconnections (such as a 21.2 km line between `110/33-11 KV AVADI SS` in West Chennai and `110/33-11 KV TIDEL PARK SS` in South Chennai).
  - Identified root cause: automated data synthesis fuzzy-matched local distribution feeder names across disparate geographic districts (e.g., Avadi's 6.83 km `33KV TIDAL PARK` feeder serves the newly constructed **TIDEL Park Pattabiram** campus in West Chennai, but was mistakenly linked to the famous **TIDEL Park Taramani** substation 21.2 km away on the IT corridor).
  - Enforced strict physical electrical engineering distance thresholds matching TNEB urban grid design standards:
    - 33/11 kV distribution: $\le 8.5\text{ km}$
    - 110 kV sub-transmission: $\le 12.0\text{ km}$
    - 230/400 kV EHV bulk transmission: $\le 30.0\text{ km}$
    - Co-located substation campus ties: $\le 3.0\text{ km}$
  - Pruned 187 physically impossible cross-city false-positive ties, retaining 1,306 genuine local physical interconnections. Avadi SS now links strictly to its 6 valid local step-down neighbors (`Kamaraj Nagar 2.4 km`, `TI Cycle 3.1 km`, `Pattabiram 4.8 km`, `Thirumullaivoyal SIDCO 5.9 km`, `Korattur TNHB 7.2 km`, `Poonamallee Bypass 8.0 km`).

### Performance & Polish
- **Equal-Width 3-Way Tabs & Info-First Default**:
  - Re-ordered the Substation Inspector navigation tabs to lead with **`ℹ️ Info`**, followed by **`🔌 Feeders (N)`** and **`⚡ Grid Links (N)`**, setting `info` as the primary landing view upon selecting any substation.
  - Granted equal `flex-1` width to all three tabs (33.3% each) for a perfectly balanced visual layout.
- **Feeder Inspector De-duplication**:
  - Replaced the bulky duplicate active feeder clone card above the list with a sleek, 1-line active corridor indicator strip (`Plotted on map: [Feeder Name] (N DTRs) [Clear Map]`), eliminating visual redundancy when filtering by lifelines.
  - Resolved double-emoji rendering glitch (e.g. `🚆 🚇`) by separating emoji icons from label strings in `LIFELINE_PATTERNS` and introducing a defensive `cleanLifelineLabel()` sanitization regex in badge components.
- **60fps Pan & Zoom Fluidity**: Removed heavy GPU `backdrop-blur` filters and artificial bounding drag friction, cutting frame render latency.
- **Detached Marker Optimization**: Inactive section office markers are detached from Google Maps until toggled on or inspected, halving active DOM marker overhead.
- **Consistent Layer Controls**: Aligned AE Section Offices layer button with voltage tiers, removing redundant eye icon for a uniform, clean interface.

---

## [1.0.0-init] - 2026-09-26

### Added
- **Repository Setup**: Initialized dedicated Hackathon workspace at `C:\projects\surgegrid-ai` with Vite 6 + React 19 + TypeScript + Tailwind CSS.
- **DeepMind WeatherNext 3 Simulation**: Generated 61 hourly timesteps ($T-48\text{h} \rightarrow T-0\text{h} \rightarrow T+12\text{h}$) of cyclonic wind, IMERG precipitation, barometric pressure eye drop, and surge wave height.
- **GEE 10-Band Multi-Hazard Extraction**: Extracted and attached 10 satellite and meteorological bands across all 242 Chennai Substations and 200 GCC Wards (NASA SRTM DEM, Dynamic World 10m Built-Up & Water, JRC 38-Year Water Baseline, GPM IMERG Michaung Rainfall, ERA5 Wind Gusts & Volumetric Soil Moisture).
- **Spatial Lifeline Fusion Engine**: Fused 5,513 GCC stormwater drain lines and 162 GCC emergency shelters with TNEB grid topology, automatically computing backup 11kV tie-line load transfer routes for all 44 flood-vulnerable shelters.
- **Google Cloud Services Activated**: Enabled `maps-backend.googleapis.com`, `generativelanguage.googleapis.com`, `bigquery.googleapis.com`, and `airquality.googleapis.com` on project `namma-map-407ca`.
- **System Documentation**: Established `docs/` suite including Architecture (`01-architecture-and-system-design.md`), Data Dictionary (`02-data-dictionary-and-sources.md`), and Changelog (`CHANGELOG.md`).
