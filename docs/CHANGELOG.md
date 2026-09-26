# Changelog: SurgeGrid AI

All notable changes, architectural decisions, and data extractions for the SurgeGrid AI project are documented in this file.

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

### Performance & Polish
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
