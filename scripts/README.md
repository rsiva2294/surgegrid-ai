# SurgeGrid-AI Pipeline & Utility Scripts

This directory contains the core data collection, extraction, grid-building, and resolution scripts for SurgeGrid-AI. They are run manually, offline, from the repo root; none are part of the web app or the `npm` scripts.

> **Credentials come from environment variables only.** No script contains a secret literal; each one exits with a clear error if a required variable is unset. Set them in your shell (never commit them, never paste them into docs) - see the table below and the commented block in `.env.example`.
>
> | Variable | Used by | What it is |
> |---|---|---|
> | `GEMINI_API_KEY` | `extract_abstract_outages.py`, `enrich_unmapped_with_gemini.py`, `gemini_pass2_recover_remaining.py` | Google Gemini API key |
> | `IG_SESSIONID`, `IG_CSRFTOKEN`, `IG_DS_USER_ID`, `IG_IG_DID`, `IG_MID`, `IG_DATR`, `IG_RUR`, `IG_FB_LSD` | `scrape_instagram_outages.py` | Instagram web-session cookies (`sessionid`, `csrftoken`, `ds_user_id`, `ig_did`, `mid`, `datr`, `rur`) and the `x-fb-lsd` header, copied from a logged-in browser session |
> | `X_BEARER_TOKEN`, `X_CT0`, `X_AUTH_TOKEN` | `download_missing_media.py` | X/Twitter web bearer token plus the `ct0` and `auth_token` session cookies |
>
> PowerShell: `$env:GEMINI_API_KEY = '...'` &nbsp;|&nbsp; bash: `export GEMINI_API_KEY='...'`. Session cookies expire; refresh them from your browser when a scraper reports HTTP 401/403.
>
> Also note that `build_chennai_grid_v5.cjs`, `rebuild_chennai_grid.cjs`, `verify_and_export_scheduled.py` and `build_gold_registry_v2.py` reference absolute paths under `C:/projects/nammamap-v2/tneb-outage/nammamap-outage-aggregator/`, so they only run on a machine that has that sibling repo.

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
- **Model / key**: `gemini-3.1-flash-lite`; key from `GEMINI_API_KEY` (see the environment variable table above).

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

---

## 4. Gold Registry Consolidation & Gemini Enrichment

Run in this order after the OCR/resolution steps in §2. Intermediate outputs land in `data/` (committed for provenance) and the registry is written to `public/data/chennai_outage_gold_registry.json`.

- **`verify_and_export_scheduled.py`**: Filters the aggregator's historical scheduled-maintenance ledger to Chennai/CMA districts, maps each record to a grid substation/section using a curated `RAW_SS_TO_GRID` table, and writes `data/chennai_scheduled_outages_2026_verified.json`.
- **`build_gold_registry_v2.py`**: Merges the verified scheduled records and the resolved abstract-breakdown records into the Gold Registry with hierarchical signature keys and zero-duplicate screening (v2.0: 2,776 signatures), and writes the registry to both this repo and the aggregator's `functions/src/data/`.
- **`enrich_unmapped_with_gemini.py`**: Gemini (`gemini-2.5-flash-lite`) structured extraction for outages still unmapped after gold resolution; promotes matches to `VERIFIED_ASSET` and adds novel signatures (commit `2c24725`: registry 2,785).
- **`analyze_remaining_unmapped.py`** and **`categorize_remaining.py`**: Read-only diagnostics that list the remaining non-verified records and split them into *recoverable via section*, *Gemini-found SS without registry match*, and *true street-level*.
- **`gemini_pass2_recover_remaining.py`**: Second pass (fuzzy match against the full substation catalog; section→substation via registry signatures). Result: 786 of 792 outages verified (99.2 %), registry 2,789 (commit `9d6a45d`).

```bash
python scripts/verify_and_export_scheduled.py
python scripts/build_gold_registry_v2.py
python scripts/enrich_unmapped_with_gemini.py
python scripts/gemini_pass2_recover_remaining.py
```

## 5. Grid Builders & Enrichment (details)

- **`build_chennai_grid_v5.cjs`** (current): writes `public/data/chennai_tneb_grid.json`, `feeders/{circle}.json` and `dtr/{circle}.json` for the 8 circles `0400 0401 0402 0404 0406 0408 0410 0411`. Reads raw GIS from the aggregator repo.
- **`rebuild_chennai_grid.cjs`** (v3, superseded): geometry-first link resolution described in `docs/grid-topology-rebuild.md`; reads the existing grid to preserve enrichment fields.
- **`enrich_substation_history.cjs`**: Builds each substation's `outageHistory` from `data-archive/data/chennai_resolved_outages.json` (alias table + 5 km nearest-substation fallback) and merges GEE risk fields. It also inserts one **synthetic** `pm-routine-…` maintenance event for every substation with no logged incidents (119 in the shipped data).
- **`enrich_grid_with_gcc.py`** (needs `fitz`/PyMuPDF and `shapely`): point-in-polygon join of substations and sections to GCC wards/zones; parses ward contact data from the CDMP PDF at a hard-coded path under the author's Downloads folder (edit  before running).
- **`decimate-feeders.js`**: 5-decimal truncation, duplicate-vertex removal and 3 m Ramer-Douglas-Peucker simplification of `public/data/feeders/*.json` (in place).
- **`download_tneb_images.cjs`**: Downloads outage-bulletin images listed in `scratch/tneb_image_manifest.json` to `data/tneb_notices_media` (default concurrency 10).
- **`topology-rebuild-v4/`**: Placeholder workspace for a V4 rebuild (README only).
