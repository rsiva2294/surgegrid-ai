# SurgeGrid AI — Ground-Truth Grid V5 Technical Documentation

> **Version:** 1.2.0-v5-ground-truth  
> **Date:** September 27, 2026  
> **Status:** Production Verified  

---

## 1. Executive Summary

Ground-Truth Grid V5 represents a foundational architectural overhaul of SurgeGrid AI's electrical grid data layer and visualization engine. The primary mandate of V5 is **strict data veracity**: ensuring that every substation, feeder conductor, distribution transformer (DTR), and electrical interconnection rendered on the map is grounded in surveyed utility records—with **zero synthetic approximations, zero cross-city fake splines, and zero POI clutter**.

---

## 2. Core V5 Accomplishments

### 2.1 Deduplication & Substation Master Registry (286 Substations)
* **Root Cause of Prior Duplicates:** Earlier rebuild scripts merged fuzzy-matched substation entities across adjacent circles (e.g. South I vs. South II border nodes), creating ~15 duplicate marker overlays with conflicting coordinates.
* **V5 Resolution:** Enforced strict deduplication keyed on normalized TNEB substation asset codes (`ss_code`), resolving identical co-located compounds (such as EHV 400/230 kV bulk yards co-located with 33/11 kV distribution step-downs) while eliminating duplicate markers.
* **Result:** A clean master registry of **286 canonical Chennai substations** spanning all four voltage tiers:
  - 400 kV Extra High Voltage (EHV) Bulk Transmission
  - 230 kV High Voltage Bulk Transmission
  - 110 kV Sub-Transmission Hubs
  - 33 kV Secondary Distribution Substations

---

### 2.2 Feeder Routing: Ground Truth Vectors vs. Zero Approximations
* **Surveyed 11 kV MultiLineString Street Geometry:** Integrated asynchronous on-demand loading of digitized feeder street routes (`/data/feeders/{circleCode}.json`) across 8 circles (3,438 feeder lines). When a user selects a feeder, the system queries its physical surveyed geometry and plots the conductor cables directly along Chennai's street network.
* **65,557 Surveyed Distribution Transformers (DTRs):** Ingested `/data/dtr/{circleCode}.json`, providing on-demand spatial plotting of real pole-mounted and plinth-mounted transformers. Each DTR displays:
  - Unique TNEB Asset Code
  - Step-down rating (e.g., $11\text{ kV} \rightarrow 240\text{V} / 415\text{V}$)
  - Capacity ($kVA$)
  - Verified connected metered consumer accounts
* **Zero-Approximation Policy (Elimination of Radial Fallback):**
  - In earlier iterations, feeders without digitized street vectors fell back to a mathematical radial spur (`angleRad = (hash % 360)`).
  - In V5, this approximation has been **completely removed**. If a feeder does not have a digitized street path in the GIS vector dataset, no fictional line is rendered. The system plots only the real surveyed DTR markers and substation takeoff switchyard point.

---

### 2.3 Confidence-Aware Electrical Grid Links Architecture
* **The Problem:** Generic distance-based clustering previously drew straight and curved splines between substations that had no actual electrical tie, occasionally drawing cross-city lines up to 21 km away.
* **V5 Solution:** Implemented ray-casting switchyard polygon containment (`ST_Contains`), dual-endpoint circuit identification, and explicit confidence classification:
  1. **Level 1: Verified Physical Connection (228 links, 71.7%):**
     - `polygon_containment` (88 links): Feeder vector endpoint strictly enclosed in recipient switchyard polygon (`ST_Contains == TRUE`) with dual-endpoint circuit confirmation.
     - `collocated_switchyard` (88 links): Verified shared-campus busbar step-down ($\le 150\text{m}$, e.g. 230kV to 110kV).
     - `surveyed_eht_line` (52 links): 400kV/230kV bulk transmission corridors mapped from TANTRANSCO surveyed line vectors.
     - Role: `PHYSICAL_TOPOLOGY_ONLY` (authoritative asset bounding; live interruption requires operational confirmation).
  2. **Level 2: Probable / Inferred Connection (90 links, 28.3%):**
     - `nominal_stepdown_proximity`: Compatible step-down ($110\text{kV} \rightarrow 33\text{kV}$) within urban cable radius ($\le 8.5\text{km}$), advisory only.
  3. **Level 3: Unverified (0 links):**
     - Strictly suppressed and excluded from production datasets.
* **Result:** Exactly 318 reconciled, verified and probable electrical connections across Greater Chennai with zero cross-city artifacts.

---

### 2.4 Elimination of Rendering Haziness & Visual Polish
* **Conductor Line Sharpness:**
  - Removed multi-layered blurred glow polylines (`feederGlowLinesRef` with low-opacity and heavy stroke weights) that made lines look hazy and out-of-focus.
  - Replaced with utility-grade, solid, 100% opaque vector polylines with crisp directional flow arrows indicating power flow from substation to load centers.
* **Substation Inspector UI & Typography Overhaul:**
  - **Google Maps External Hyperlink:** Removed raw decimal GPS coordinates (`13.0184°N, 80.2390°E`) that occupied excessive horizontal space in the administrative ribbon. Replaced with a clean, styled `Google Maps ↗` button opening directly in a new tab (`https://www.google.com/maps?q=${lat},${lng}`) with exact coordinate tooltips on hover.
  - **Administrative Alignment:** Grouped `Circle` and `Region` naturally on the left with `whitespace-nowrap` to prevent truncation, separated by a crisp 14px divider line.
  - **Typography Scaling:** Upgraded font sizes across the panel:
    - Metric labels upgraded from microscopic `text-[8px]`–`text-[9px]` to legible `text-[10px]`–`text-xs`.
    - Metric values upgraded to `text-xs` / `text-sm font-bold font-mono`.
    - Switchyard capacity, Transformers & Incomers redesigned into a balanced 2-column card layout.
    - Climate & Flood Risk statistics (Elevation MSL, Coast Distance, Risk Score) aligned into a high-visibility 3-column grid.
    - Field SOP and Grid Dispatch Note upgraded to `text-xs leading-relaxed`.

---

## 3. Data Integrity Matrix

| Component | Source / Verification Method | Approximation Status |
| :--- | :--- | :--- |
| **Substations (286)** | Official TNEB / TANTRANSCO Asset Registers | **0% Approximation (100% Ground Truth)** |
| **GPS Locations** | Surveyed Physical Switchyard Coordinates | **0% Approximation (100% Ground Truth)** |
| **Administrative EDC & Region** | Official TNEB Operational Hierarchy (352 Sections) | **0% Approximation (100% Ground Truth)** |
| **Switchyard Hardware & Incomers** | TANTRANSCO SLDC Single-Line Diagrams (SLDs) | **0% Approximation (100% Ground Truth)** |
| **Feeder Line Vectors (3,438)** | TNEB Surveyed MultiLineString Street Geometry | **0% Approximation (100% Ground Truth)** |
| **Distribution Transformers (65,557 DTRs)** | Surveyed DTR Points with 5.19M Registered Consumer Baseline | **0% Approximation (100% Ground Truth)** |
| **Elevation (MSL)** | NASA SRTM 30m Digital Elevation Model | **Physical Topography Telemetry** |
| **Distance to Coast** | Geodesic Distance to OpenStreetMap Coastline | **Exact Mathematical Geodesic** |
| **Level 1 Electrical Links (228)** | Ray-Casting Polygon Containment (`ST_Contains`), Collocated Yards & EHT Corridors | **Geometrically & Circuit Verified** |
| **Level 2 Electrical Links (90)** | Nominal Voltage Step-Down Proximity ($\le 8.5\text{km}$) | **Advisory Topology Scoping** |
| **Flood Risk Score (0-100)** | Hydro-topographical Index Formula | **Analytical Risk Formula** |

---

## 4. Key Commits in V5 Branch

* `c9d2d32`: Ingest Ground-Truth Grid V5 dataset and clean unique substation registry.
* `707f2ec`: Implement Option A electrical interconnections and eliminate cross-city false ties.
* `fc9e478`: Upgrade feeder conductor rendering to razor-sharp utility grade, eliminating translucent blur.
* `51f87be`: Polish Substation Info tab typography, alignments, and hyperlink GPS to Google Maps in new tab.
* `668e683`: Expand Circle name width to eliminate premature text truncation.
* `8d5581a`: Group Circle and Region with natural gap and whitespace-nowrap, eliminating excessive flex spacing.
* `e3474f9`: Eliminate synthetic radial feeder fallback line: strictly render surveyed GIS vectors and surveyed DTR points.
