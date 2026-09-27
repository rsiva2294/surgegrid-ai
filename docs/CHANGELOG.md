# Changelog: SurgeGrid AI

All notable changes, architectural decisions, and data extractions for the SurgeGrid AI project are documented in this file.

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
