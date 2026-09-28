# SurgeGrid-AI Pipeline & Utility Scripts

This directory contains the core data collection, extraction, grid-building, and resolution scripts for SurgeGrid-AI.

---

## 1. Social Media Outage Scrapers

### `scrape_instagram_outages.py`
- **Purpose**: Authenticated Instagram Web GraphQL Relay scraper for `@tnpdcl_offcl`.
- **Workflow**:
  - Traverses pagination back to July 01, 2026.
  - Automatically splits single-image breakdown notices into `data/tneb_abstract_reports/` and multi-slide daily abstract carousels into `data/tneb_carousel_abstracts/`.
  - Applies strict IST timestamp prefixes (`YYYY-MM-DD_HH-MM-SS_<post_id>_slide<n>.jpg`).
- **Usage**:
  ```bash
  python scripts/scrape_instagram_outages.py
  ```

### `download_missing_media.py`
- **Purpose**: Authenticated Twitter / X GraphQL timeline scraper for `@TANGEDCO_Offcl`.
- **Workflow**:
  - Paginates the `UserMedia` timeline.
  - De-duplicates against Firestore/existing single notices to extract multi-slide abstract reports.
- **Usage**:
  ```bash
  python scripts/download_missing_media.py
  ```

---

## 2. OCR Extraction & Chennai Resolution Pipeline

### `extract_abstract_outages.py`
- **Purpose**: High-throughput Vision LLM OCR extraction pipeline using Google Gemini API (`gemini-3.1-flash-lite`).
- **Workflow**:
  - Concurrently processes carousel slides grouped by daily post.
  - Transcribes tabular outage notices into structured JSON adhering to the `DailyAbstractReport` Pydantic schema.
  - Employs automatic rate-limit backoff and compiles master statewide dataset into `data/tneb_abstract_outages_master.json`.
- **Usage**:
  ```bash
  python scripts/extract_abstract_outages.py
  ```

### `extract_chennai_outages.py`
- **Purpose**: Filters the statewide master dataset down to Chennai Metropolitan Area (CMA) outages.
- **Workflow**:
  - Extracts records across all 5 Chennai Distribution Circles (*Chennai Central, South 1, South 2, North, West*).
  - Identifies suburban grid assets (*Chengalpattu, Kanchipuram, Tiruvallur*) that physically connect to Chennai Grid substations.
  - Outputs `data/chennai_abstract_outages.json`.
- **Usage**:
  ```bash
  python scripts/extract_chennai_outages.py
  ```

### `resolve_chennai_abstract_outages.cjs`
- **Purpose**: Evaluates the Sovereign Resolution & Mapping Gate on Chennai outages.
- **Workflow**:
  - Benchmarks mapping accuracy **WITH** vs. **WITHOUT** the Gold Standard Registry (`public/data/chennai_outage_gold_registry.json`).
  - Maps outages to 286 authentic TNEB switchyards and 352 section offices in `public/data/chennai_tneb_grid.json`.
  - Outputs comparison analytics and resolved datasets to `data/`.
- **Usage**:
  ```bash
  node scripts/resolve_chennai_abstract_outages.cjs
  ```

---

## 3. Grid Topology & Enrichment Tools

- **`build_chennai_grid_v5.cjs`**: Rebuilds the unified Chennai Grid framework (`public/data/chennai_tneb_grid.json`) from surveyed GIS points, transmission backbones, and section boundaries.
- **`enrich_grid_with_gcc.py`**: Merges Greater Chennai Corporation ward and zonal administrative layers with TNEB electrical boundaries.
- **`enrich_substation_history.cjs`**: Enriches substation points with historical outage frequency and flood risk indices.
- **`decimate-feeders.js`**: Optimizes and simplifies complex 11kV/22kV feeder line geometries for fast WebGL rendering.
