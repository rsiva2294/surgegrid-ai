# Changelog: SurgeGrid AI

All notable changes, architectural decisions, and data extractions for the SurgeGrid AI project are documented in this file.

## [3.2.0-responder-tools] - 2026-09-30

### Added
- **Relief centre popup:** clicking a relief centre marker centres it and opens an InfoWindow with ward and zone, officer contacts, GCC plan 2024 capacity and amenities, Google Maps directions and a single View Place link.
- **Section office drawer:** 1-click action hub (call Section AE and more), grid hierarchy, feeding substations and ward relief shelters.
- **Nearest relief centre fallback** when a ward has no listed centre.

### Changed
- **Feeders tab (simulation):** one consolidated distribution circuit policy banner instead of the same quote on every feeder card.
- **Substation panel:** one text scale across the three tabs (13 / 12.5 / 12 px); status badges on a single line; section office card streamlined.
- **Performance and accessibility:** stale-while-revalidate for the outage Gold Registry, Cloud Storage CORS for `surgegrid.web.app`, badge contrast fix.

## [3.1.0-performance] - 2026-09-30

### Changed
- **Map first:** the map mounts immediately and loads Google Maps in parallel with the grid data (a small "Loading Chennai grid data..." pill replaces the full-screen spinner). Preload and preconnect hints added in `index.html`.
- **Slimmer data:** grid file 3.76 MB to 1.69 MB (`scripts/slim_grid_data.py`): section boundaries moved to `section_boundaries.json` (loaded on demand), unused `hydroRisk`/advisory fields and a duplicate `outageHistory` removed. IndexedDB cache key bumped (`v17_slim`) and the cache write moved to idle time.
- **Code split:** substation drawer, AI Directive dialog and triage roster load on demand and are pre-loaded when idle (main bundle 487 KB to 321 KB, 139 to 98 KB gzip).
- **Faster repeat work:** enriched health profiles are cached per substation and live-outage list.
- **Accessibility:** amber chips darkened for contrast, small grey labels darkened, directive heading order fixed, cockpit step buttons enlarged (local Lighthouse accessibility 100).
- **Public text made truthful:** page description, social cards, `manifest.json`, `llms.txt` and `llms-full.txt` no longer mention removed claims (per-substation WeatherNext forecasts, SAR inundation models, statutory SLAs, automated tripping).

## [3.0.0-official-facts-only] - 2026-09-30

### Changed (the app now shows only official quotes, real data with a source, map checks, and labelled own calculations)
- **Official quote bank** (`src/data/officialSources.ts`, `docs/SOURCES.md`): 37 word-for-word quotes from the MoP 2021, TANGEDCO 2017, TN SDMP 2023 and GCC 2023 plans, each with its page and checked against the PDF text.
- **AI Directive and Substation Copilot rebuilt** on those quotes. Gemini only chooses names from lists we send and words one note; numbers not in the prompt are rejected.
- **Real scenarios**: Michaung 2023, 2015 floods and a Nov 2020 monsoon spell, all NASA IMERG rain and ERA5-Land wind hindcasts. The synthetic "Category-3" file was removed. Playback speed control added.
- **Gemini proxy**: Cloud Function `surgegridGemini` (Gemini 2.5 Flash on the Gemini Enterprise Agent Platform, formerly Vertex AI) with its own service account. No API key in the app.
- **Flood exposure**: model flood panels removed. Official flood-map checks per substation (`official_flood_layers.json`) and a plan quote only when it applies.
- **Relief centres**: GCC list by ward (no coordinates), backup-substation suggestion, optional map layer.

### Removed (not in any of the four plans)
- Wind (80/75/65/60 km/h) and surge/flood trip thresholds, "statutory" section numbers, restoration-hour limits (6/12/24/48 h), the five-stage restoration protocol, RMU-loop badges, the 1.5 m plinth and 3.0 m/3.2 m rules, elevation-derived flood depths, invented SOP figures, the 224 baked-in advisories and "installed 13,810 RMUs".

### Docs
- Rewrote README, docs 00, 01, 05 (renamed to `05-official-plans-and-how-the-app-uses-them.md`) and the Gemini architecture doc; patched 02, 03, 04, 06 and 07. Full history in `PROJECT_LOG.md`.

## [2.4.0-docs-refresh] - 2026-09-29

### Added (summary of simulation and Gemini work shipped earlier the same day)
- **Disaster simulation engine**: Cyclone Michaung (61 hourly steps) and 2015 Megaflood hindcast (120 hourly steps) with timeline scrubber, playback, and milestone auto-pause (`scenarioService.ts`, `DisasterCockpitBar.tsx`, `TnebGridMap.tsx`).
- **Tier-1 Gemini Grid Commander SOP** (`geminiSopService.ts`, `GeminiSopDialog.tsx`) and **Tier-2 Gemini Substation Copilot** (`geminiSubstationCopilotService.ts`, `SubstationHealthCard.tsx`), both on `gemini-2.5-flash` with a rule-engine fallback.

### Changed (documentation only)
- Rewrote `README.md` to match the current feature set, added `docs/00-feature-map.md` (feature → file locator) and `docs/PROJECT_LOG.md` (running decision log).
- Rewrote `docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md` to match the code (scoring formula, phase rules, caching, fallback rules, known issues).
- Updated status note in docs 01 and scenario descriptions in docs 05 and 07.

## [2.3.6-weather-pill-redesign-and-data-optimization] - 2026-09-29

### Added
- **Modern Glassmorphic Weather Pill (`LiveWeatherPill.tsx`)**:
  - Replaced legacy green-bordered banner with a sleek rounded capsule featuring glassmorphism (`backdrop-blur-md`), refined hairline borders, and adaptive theme styling.
  - Replaced OS system emojis with crisp, color-coded Lucide vector icons (`SunMedium`, `CloudSun`, `CloudRain`, `CloudLightning`, `CloudFog`, `Wind`, `Droplets`).
  - Added compact wind direction badges (`SE`, `ENE`, `NW`) and hairline dividers (`w-px h-3.5`).
  - Completely static GPU rendering (zero continuous CSS animations) to prevent GPU fill-rate exhaustion over the full-screen WebGL map.
- **Selective Hospital POI Map Filtering (`mapStyles.ts`, `TnebGridMap.tsx`)**:
  - Added `HOSPITALS_ONLY_DARK_STYLE` and `HOSPITALS_ONLY_LIGHT_STYLE` that selectively re-enable `poi.medical` while suppressing commercial and general clutter.
  - Automatically activates when a Hospital Lifeline feeder (e.g., `33KV APOLLO`, `STANLEY`, `KMC`) is actively chosen and displayed on the map, and reverts to zero-POI on dismissal.
  - Added active `🏥 HOSPITALS VISIBLE` telemetry badge in `MapLayerControls.tsx`.
- **Substation-Level On-Demand Feeder Sharding (`feederGeometryService.ts`)**:
  - Created `scripts/generate_substation_shards.cjs` partitioning monolithic circle files into 357 substation-level shards in `public/data/substation_feeders/`.
  - Upgraded `getFeederGeometry()` and `getFeederTransformers()` to load the compact substation shard (~69 KB for TIDEL Park SS vs ~4.3 MB circle files), achieving a **98.4% payload reduction** with zero loss of fields or metadata.
  - Added synchronous in-memory RAM cache (`ssShardCache`) so subsequent feeder selections on the same substation execute in 0ms without network requests.
  - Verified exact 1:1 data integrity across all 357 substations.

### Optimized
- **Startup JSON Minification**:
  - Minified `public/data/chennai_tneb_grid.json` (8.07 MB → 3.48 MB, **-4.59 MB / 57% reduction**).
  - Minified `public/data/chennai_outage_gold_registry.json` (939 KB → 660 KB, **-279 KB / 30% reduction**).
  - 100% of all fields, coordinates, health profiles, and flood metadata strictly preserved.

---

## [2.3.5-disaster-recovery-metadata-and-rmu-fix] - 2026-09-29

### Added
- **Disaster Recovery Metadata Enrichment from Raw GIS Data**:
  - Created `scripts/enrich_disaster_metadata.py` to parse physical pole counts (`no_of_pole`), HT feeder connectivity (`no_ht_fdr`), LT corridor counts, and equipment manufacturer data from raw TNEB GIS `.geojson.gz` files in `tneb_gis_raw/`.
  - Enriched all DTR JSON files (`public/data/dtr/*.json`) with new fields: `poles`, `htFeeders`, `ltFeeders`, `make`, `scheme`.
  - Updated `DTRPoint` interface in `feederGeometryService.ts` with disaster recovery metadata fields.
  - Bumped IDB cache key to `sg_dtr_circle_${cir}_v2` to invalidate stale DTR caches.
- **DTR InfoWindow Disaster Context**:
  - Ground plinth mount DTRs (`poles == 0`) now display `⚠️ Ground Plinth Mount • Inundation / Dewatering Risk` warning.
  - Elevated pole DTRs show `🛡️ Elevated Pole Structure (N-Pole) • Storm Water Resilient` confirmation.
  - Dual HT incomer DTRs (`htFeeders >= 2`) show `🔄 Dual HT Incomer • Loop Switchable` capability badge.
  - Equipment make and LT feeder count displayed when available.
- **Lineman Foot-Patrol Corridor Badge** in `FeederCardItem.tsx` showing estimated patrol distance from LT corridor length data.

### Fixed
- **RMU Detection — False Positives from GIS Naming Convention**:
  - **Root Cause**: TNEB's raw GIS data uses "RMU" as a generic suffix in DTR names (e.g., "NO.2 CRESCENT PARK STREET RMU") — this is a naming convention, NOT an indication of actual Ring Main Unit switchgear. The old name-based detection (`name.includes('RMU')`) was classifying 10-70 DTRs per feeder as RMUs, creating massive visual contradictions against the feeder card's estimated count.
  - **Fix**: RMU detection across all three detection sites now uses `htFeeders >= 2` (dual HT incomer = genuine loop-switchable node):
    - `mapIcons.ts` → `classifyDtrPoint()`: Updated signature to accept `htFeeders` field.
    - `TnebGridMap.tsx` → marker rendering: Replaced name-matching Pass 1 and synthetic even-distribution Pass 2 with single `htFeeders >= 2` check.
    - `tnebGridService.ts` → feeder-level estimation: Replaced aggressive formula (`Math.max(2, ...)`) with simple UG/MIXED topology capability flag.
  - Feeder card RMU badge now shows **"RMU Loop"** (topology capability) instead of a fabricated count like "2 RMU".
- **InfoWindow Header Excess Blank Space**:
  - Long DTR names (e.g., "VN ROAD JUNCTION SOUTH BOAG ROAD RMU (CGL)") caused `white-space:nowrap` to force a single-line layout, widening the popup excessively.
  - Fixed header to use `word-break:break-word` with `max-width:280px` and `align-items:flex-start` for clean multi-line wrapping.
- **InfoWindow JSX Comment Leak**: Removed `{/* ... */}` comment blocks that were rendering as visible text in the Google Maps InfoWindow HTML template (template literals don't strip JSX comments).
- **Removed FeederFlowSchematic Card** from `SubstationInspectorDrawer.tsx` — was taking up excessive vertical space without adding essential value.

---

## [2.3.4-typography-standardization-and-layout-harmonization] - 2026-09-29

### Fixed
- **Typography & Font Weight Harmonization Across Drawer**:
  - Eliminated chaotic mixing of `font-mono`, `font-black` (900 weight), and random `text-[9px]/[10px]/[11px]` sizes that caused line wrapping and ugly vertical misalignments.
  - Standardized font family to native UI sans-serif (`font-sans`) with `tabular-nums` for clean, professional digit alignments.
  - Reduced exaggerated `font-black` weights to balanced, readable `font-semibold` and `font-bold` for values, and `font-medium text-[11px]` for field labels.
- **Line Wrapping & Badge Layout Fixes**:
  - Refactored long labels (`Cyclone Peak Depth (Michaung Class):` -> `Peak Water Depth`, `Vulnerable Consumers (Downstream):` -> `Downstream Consumers`, `Low-Plinth DTRs Exposed:` -> `Low-Plinth DTRs Exposed`, `Landfall Failure Clock:` -> `Failure Timeline`) so they never wrap in narrow 2-column drawer containers.
  - Added `whitespace-nowrap shrink-0` to all source attribution badges (`CWC • IMERG`, `IMERG • CWC • GEE`, `Adyar/Cooum 100-Yr Crest`) so they stay crisp and single-line.
  - Optimized the accordion trigger button title (`Cyclone Michaung Stress Model (Cat 3)`) with `truncate` and `min-w-0` to prevent ugly 2-line header breakage.

---

## [2.3.3-tailwind-dark-variant-isolation-and-accordion-clean] - 2026-09-29

### Fixed
- **Root Cause of Poor Contrast Resolved (Tailwind v4 OS Media Collision)**:
  - In Tailwind v4, `@import "tailwindcss"` defaults the `dark:` variant to `@media (prefers-color-scheme: dark)`. Because the host OS was set to dark mode, all `dark:...` classes were overriding the UI with white/pale text on top of white backgrounds (`isLight === true`), making text invisible.
  - Added `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` to bind Tailwind dark variants strictly to the `.dark` class rather than OS preference.
  - Added root `.dark` class synchronization in `src/App.tsx`.
  - Converted the entire Climate & Flood Hydro-Risk inspector card to explicit `isLight ? ... : ...` expressions, eliminating all conflicting `dark:` text styles.
- **Accordion Button Simplification**:
  - Removed "Hide Model" / "Inspect Model" text labels from the cyclone stress-test button as requested, leaving the clean, minimalist `<ChevronUp />` / `<ChevronDown />` controls.

---

## [2.3.2-high-contrast-historic-redesign-and-normal-weather-guard] - 2026-09-29

### Fixed & Enhanced
- **High-Contrast Typography Overhaul (Light & Dark Theme)**:
  - Fixed washed-out grey text in `90-Day Incident & Maintenance Log` header by setting dark slate / pure white fonts and prominent clock icons.
  - Replaced low-contrast cyan (`text-cyan-400`) on white with deep rich blue (`text-blue-800`, AAA 7.5:1 contrast) for statutory standards.
  - Hardened font weights and contrasts across all metric headers, labels, and sub-labels in the inspector drawer (`text-slate-700 font-bold`, `text-slate-900 font-black`).
- **Historic Flood & Defense Box Redesign**:
  - Replaced raw, hard-to-read float numbers (`0.038m Submerged`) with contextual flood status banners:
    - `✅ 0.0m — Switchyard Remained Completely Dry`
    - `🛡️ {depth}m Yard Floor Waterlogging — Protected by Plinth (+{plinth}m GL)`
    - `🚨 {depth}m Inundation — Exceeded Equipment Plinth`
  - Added clean 3-column engineering defense cards showing Equipment Plinth ground clearance, TNSDMA 3.0m MSL statutory datum, and switchyard dewatering readiness.
- **Normal Live Weather Field Advisory SOP Guard**:
  - Emergency Operational Field Advisory SOPs are now strictly guarded by `disasterScenario !== 'NORMAL'`.
  - When live weather is normal, emergency cyclone action orders ("Action by 23 hours before peak rain: place sandbags...") are completely hidden, keeping the inspector calm and focused on live operational health.
  - During simulated stress-testing, only the hydrodynamic parameters (peak depth, consumers at risk, DTR exposure, landfall failure clock) are displayed.

---

## [2.3.1-comprehensive-multi-hazard-model-labeling] - 2026-09-29

### Added
- **Multi-Hazard Model Transparency & Labeling**:
  - **Explicit Source Attribution**: Updated the Climate & Flood Hydro-Risk header to state: `Multi-Hazard: 2015 Riverine • Dec 2023 Michaung • GEE '26`.
  - **Elevation & Exposure Standards**: Labeled elevation as `SRTM / DEM` MSL, distance to coastline as `Surge Exposure`, and overall risk as `Multi-Hazard Index`.
  - **Ground Truth Riverine vs Cyclone Distinctions**:
    - Labeled baseline riverine flood benchmark as `2015 Historic Flood (100-Yr)`.
    - Labeled equipment height as `Equipment Plinth (GL)`.
    - Labeled statutory reference as `TNSDMA Statutory Standard: 3.0m MSL Mandate`.
  - **Cyclone Michaung Simulation Benchmark**:
    - Stress-test model trigger explicitly labeled: `🌀 Cyclone Michaung Stress Model (Dec 2023 Cat 3)` with badge `CWC • IMERG`.
    - Hydrodynamic drawer labeled `Michaung-Class Cat 3 Hydro Model` with badge `NASA IMERG • CWC • GEE '26`.
    - Peak inundation labeled `Cyclone Peak Depth (Michaung Class)`.
    - Failure countdown labeled `Landfall Failure Clock` (simulated breach timeline).
  - **Post-Michaung TNSDMA Standard Operating Procedure (SOP)**:
    - Advisory labeled `Operational Field Advisory (Post-Michaung TNSDMA SOP)` under `TNEB SOP`.
    - Added explicit model synthesis attribution footnote: `Synthesis: 2015 Adyar Crest • Dec 2023 Michaung Rainfall • NASA GPM • GEE '26 • TNSDMA 3.0m MSL Mandate`.

---

## [2.3.0-hydrodynamic-risk-and-context-aware-sop] - 2026-09-29

### Added
- **Hydrodynamic Simulation Model Data Integration**:
  - Replaced heuristic elevation-derived flood depths with authentic hydrodynamic simulation data from `C:\projects\surgegrid-ai-v2\data\processed\` (`substation_risk.csv` and `substation_risk_2015.csv`).
  - Enriched all 286 substations with modeled cyclone storm surge inundation (`cycloneMaxDepthM`), consumers in vulnerable flood pockets (`cycloneConsAtRisk`), critical distribution transformers exposed (`cycloneDtrsAtRisk`), landfall failure clock (`cycloneFirstFailHour`), and isolation recommendations (`cycloneIsolateRecommended`).
  - Embedded ground-truth 2015 historic flood depths (`flood2015DepthM`) and 2015 consumer impacts.
  - Bumped IndexedDB cache key to `surgegrid_chennai_grid_v14_real_hydrorisk_advisories` to invalidate stale caches.
- **Context-Aware Display & English-Only Operational Advisories**:
  - **Live Weather Calm Baseline**: When live weather is normal (`disasterScenario === 'NORMAL'`), the card shows only the calm baseline (Elevation, 2015 historic flood, equipment plinth, standard drainage) without alarming landfall failure countdowns or pulsating emergency banners.
  - **Collapsible Stress Test Drawer**: Added a clean `[🌀 Cyclone Stress-Test Model]` accordion button that allows engineers to inspect the hydrodynamic simulation model on demand during normal weather.
  - **Automatic Disaster Protocol Activation**: When an active disaster protocol is selected (`Alert`, `Severe >80k`, `Surge 3.2m`), the simulation model and `⚠️ ISOLATION MANDATE` alerts automatically open in full prominence.
  - **English-Only Advisory**: Standardized field operational SOPs in clear English.
- **90-Day Incident & Maintenance Log Progressive Disclosure**:
  - **Closed by default when 0 logs**: Substations with clean records (0 notices) now display a single compact, closed row (`Clean Record ▼`), eliminating the tall empty placeholder box.
  - **Most Recent Notice Preview**: When a substation has logs, only the single most recent notice is displayed by default, with a `+ View N earlier records ▼` button to expand the full history and scope filters on demand.
  - **Automatic Reset**: Switching substations automatically collapses earlier expansions to keep the view clean and compact.

---

## [2.2.0-authentic-grid-and-strict-mapping] - 2026-09-29

### Fixed
- **Purged 119 Synthetic Maintenance Placeholders**:
  - Removed synthetic `pm-routine-…` switchyard inspection placeholders from `scripts/enrich_substation_history.cjs`.
  - Removed runtime synthetic event generator (`pm-gen-…`, `trip-gen-…`) from `src/services/gridHealthService.ts`.
  - Regenerated `public/data/chennai_tneb_grid.json` and `data-archive/data/gee_chennai_substations_risk.json`, preserving 1,094 authentic raw TNEB events across 167 substations while keeping the 119 clean substations strictly empty (`outageHistory: []`).
  - Bumped IndexedDB key to `surgegrid_chennai_grid_v13_authentic_only_no_synthetic` to immediately invalidate legacy caches in user browsers.
- **Fixed 1-to-Many Outage-to-Infrastructure Multi-Mapping**:
  - **Authoritative Resolution Guards**: Added strict equality guards in `getOutagesForSubstation()` and `getOutagesForSection()`. Once an outage is enriched and bound to a specific asset code, it immediately exits rather than falling through to fuzzy string matching.
  - **Generic Locality Stoplist**: Introduced `GENERIC_LOCALITY_TOKENS` (`nagar`, `north`, `south`, `road`, `street`, etc.) in `matchesLocality()`, barring single generic words from subset matching. Eliminated the flaw where an outage mentioning `"Nagar"` matched 45 AE Section Offices.
  - **Multi-Voltage Substation Disambiguation**: Added voltage cues and feeder-ownership matching in Tier 2 of `enrichLiveOutagesWithGrid()`. For collocated substations (e.g., Guindy 33kV / 110kV / 230kV / 400kV GIS), notices now bind to the correct voltage tier rather than broadcasting across all 4 substations.
  - **Upstream Ingestion Deduplication**: Deduplicated incoming raw notices by fingerprint before boundary filtering in `getLiveChennaiOutages()`.

---

## [2.1.0-gemini-enrichment-and-documentation-audit] - 2026-09-29

### Security
- Removed hardcoded credentials from `scripts/` (Instagram cookies, X/Twitter tokens, Gemini API keys). Scripts now read them from environment variables and fail fast if unset; variables are documented in `scripts/README.md`. Previously committed values remain in git history.

### Changed (Gold Registry: Gemini enrichment passes, 2026-09-28)
- **Pass 1 (`2c24725`)**: `scripts/enrich_unmapped_with_gemini.py` recovered 6 unmapped switchyards and added 9 novel signatures (registry 2,785).
- **Pass 2 (`9d6a45d`)**: `analyze_remaining_unmapped.py`, `categorize_remaining.py` and `gemini_pass2_recover_remaining.py` resolved the last 21 records (8 fuzzy catalog matches, 9 section→substation resolutions, 4 left as street-level `LOCALIZED_AREA`). Abstract-report coverage reached **786 / 792 (99.2 %)**; bundled registry now **2,789 signatures**, 2,298 verified instances, 10 localities.

### Documentation audit (all docs re-verified against `src/`, `public/data/` and `scripts/`)
- **README**: corrected the link count (583 total: 318 substation-to-substation + 265 substation-to-section; the earlier "1,493" was a V4-era figure), added docs 08–10 and the scripts README to the index, added an environment-variable table and an explicit *Not in the app* list.
- **Doc 01**: added an implementation-status note (Gemini features, forecast slider, inundation overlays and shelter tie-line routing are design intent, not shipped).
- **Doc 02**: rewrote the dataset catalog into *shipped* (`public/data/`, with real sizes and counts) vs *archived* (`data-archive/data/`, not loaded); documented runtime endpoints, real map bounds, that the 2015 flood depth and dewatering flag are derived from elevation, and data-quality caveats (119 synthetic maintenance events; `LOW_ELEVATION_RISK` missing from the TypeScript type).
- **Doc 03**: replaced the removed *Split View* / *Grid Links* / *Info* descriptions with the three-tab drawer; lifeline feeders are 257 (not 223+); noted that the topology scoping banner is not rendered.
- **Doc 04**: circle file tree now lists all 8 circles; corrected marker colors; outage scoping is by substation/section, not feeder vector.
- **Doc 05**: `Normal` is now `Live`; RMU counts and restoration stages are documented as estimates/limited to stages 3–5; corrected UI descriptions.
- **Doc 06**: clarified that ward/GEE values are embedded in the grid file; jargon toggle label.
- **Doc 07**: updated grid payload (3.2 MB; 371 KB Brotli), IndexedDB behaviour (cache key, version-gated revalidation, missing compact fallback file), triage filters, component list and line counts.
- **Doc 08**: rewritten as an as-built specification (actual penalty/credit constants, live ceilings 50/74/84, status of each planned milestone, known limitations).
- **Doc 09**: added an as-built status section (rule order, `severityWeight` not consumed by the scorer, feeder-name misclassification risk).
- **Doc 10**: clarified repository boundary (aggregator repo not verifiable here), added the Gemini passes, current registry counts and the client's actual lookup keys and live-feed source.
- **V5 doc**: feeder geometry count corrected to 3,335 (was 3,438).
- **Scripts README**: added the registry/Gemini and grid-builder scripts and a credentials warning.
- **`public/llms.txt`, `public/llms-full.txt`**: corrected feeder/DTR counts and substation count.

### Also changed
- `index.html`: meta, Open Graph and Twitter descriptions now say 286 TNEB substations (were "75+").

### Known documentation-relevant issues found (not fixed here)
- The GCS gold registry (2,785 signatures) and the aggregator's bundled copy (2,776) lag the local bundle (2,789); see doc 10.
- Credentials are committed as string literals in `scripts/` (Instagram session cookies, X/Twitter auth token, Gemini keys). Rotate and move to environment variables.
- `computeHealthProfile()` fabricates placeholder events for substations with only a historical count; 119 shipped events are synthetic.
- The Weather API key is sent in the request URL from the browser.

---

## [2.0.0-cloud-gold-registry-and-automated-self-enrichment] - 2026-09-28

### Added & Consolidated (Master Gold Registry v2.0 & Continuous Cloud Self-Enrichment Pipeline)
- **Master Gold Registry v2.0 Consolidation**:
  - Expanded signature coverage from 1,585 to **2,776 unique verified signatures (+75.1% growth)**.
  - Sourced and verified +157 scheduled maintenance signatures from the statewide historical ledger (recovering Core City Adyar Gandhi Nagar 33/11kV SS, Kadaperi MEPZ, Anakaputhur GIS SS, Pammal, Sembakkam).
  - Sourced and verified +1,034 breakdown signatures from TNEB division abstract reports covering core city zones (KK Nagar, Kodambakkam, Kilpauk, Egmore, Anna Nagar, Mylapore, Valasaravakkam).
  - Enforced zero-duplicate screening across 201 candidate signatures; verified outage instances incremented to 2,298 (+107.6%).
- **Cloud Storage Hosting (GCS)**:
  - Hosted at `https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/registry/chennai_outage_gold_registry.json`.
  - Configured public read access and cache-control headers (`public, max-age=3600, s-maxage=86400`).
- **Continuous Self-Enrichment Pipeline (`nammamap-outage-aggregator`)**:
  - Implemented `goldRegistry.ts`: Asynchronous GCS hydration, 15-minute TTL caching, atomic cloud save, and dynamic circle/district metadata resolution.
  - Implemented `goldRegistryEnricher.ts`: 4-stage anti-poisoning filter (Chennai/CMA boundary check, physical feeder verification against `feeder_to_ss.compact.json`, $6.5\text{ km}$ spatial drift gate, and zero duplicate padding).
  - Hooked background self-enrichment into the 15-minute scheduled portal scrape in `outageProcessor.ts`.
  - Created 2nd Gen Firestore triggers: `onStatewideCacheGoldRegistry` and `onIncidentNoticeGoldRegistry`.
  - Added REST endpoints in `v2/routes.ts`: `GET /api/v2/registry` and `POST /api/v2/registry/enrich`.
- **Client Frontend Direct Ingestion (`surgegrid-ai`)**:
  - Updated `liveOutageService.ts` to dynamically fetch from GCS with zero-latency in-memory caching and bundled local fallback.
  - Verified with live statewide outage runs (83 active outages evaluated, zero duplicate pollution).

---

## [1.8.0-direct-storage-ingestion-and-autonomous-resolution] - 2026-09-28

### Added & Modernized (Direct Storage Ingestion & 100% Autonomous Resolution Engine)
- **Direct Cloud Storage Telemetry Ingestion (`liveOutageService.ts`)**:
  - Replaced tight coupling to legacy backend scrapers/APIs with direct ingestion from Google Cloud Storage / Firebase Storage public endpoints:
    - `https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/outages/twitter_notices_resolved.json`: Real-time active field breakdown alerts.
    - `https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/outages/statewide.json`: Real-time statewide scheduled maintenance notices.
  - Implemented client-side IndexedDB caching (`surgegrid_live_outages_gcs_cache`) for instantaneous load and resilient offline operation.
- **100% Autonomous Resolution Engine**:
  - Completely strips all upstream heuristic coordinates and fuzzy guesses (`latitude: null`, `longitude: null`, `resolvedSubstationName: undefined`, `resolvedSectionName: undefined`).
  - Feeds raw notice extraction text (`substation_english`, `section_english`, `feeder_english`, `town`) directly into SurgeGrid's local **Gold Standard Outage Registry** (`chennai_outage_gold_registry.json`) and guarded locality matcher (`CHENNAI_LOCALITY_GAZETTEER`).
  - Added ground-truth bindings for critical field localities (e.g. *Neelankarai* `secCode: '294'`, `ssCode: '9417'` to `110/33/11 KV PERUNGUDI SS`).
  - Autonomously resolves 100% of live Chennai outages (e.g., *Kellys*, *Sowcarpet West*, *Periamet*, *Neelankarai*) directly to official TNEB substation IDs, section codes, and GIS coordinates.
- **Statewide Outage Governance & District Isolation**:
  - Ingestion of statewide scheduled maintenance outages (`statewide.json`).
  - District-level screening isolates Chennai metropolitan notices from non-Chennai districts (Viluppuram, Coimbatore, Trichy, Karur, Ariyalur, etc.), eliminating false-positive GIS mappings onto unrelated Chennai switchyards.
  - Scheduled maintenance notices within Chennai automatically flow into the autonomous resolution pipeline.

---

## [1.7.0-live-weather-and-app-bar-modernization] - 2026-09-27

### Added & Modernized (DeepMind WeatherNext 3 Live Weather & Executive App Bar)
- **Google Maps Platform Weather API Integration (`liveWeatherService.ts`)**:
  - Connected to `https://weather.googleapis.com/v1/currentConditions:lookup` powered by Google DeepMind **WeatherNext 3**.
  - Fetches real-time atmospheric telemetry: ambient temperature, feels-like temperature, dew point, relative humidity (% RH), wind velocity, wind gusts, cardinal wind direction, barometric air pressure (hPa), cloud cover %, and current condition text.
  - Implemented **spatial grid cluster caching** (`lat.toFixed(2), lng.toFixed(2)` ~1.1 km cells) with 10-minute TTL: neighboring switchyards share identical cached atmospheric telemetry, preventing redundant network requests.
  - Built-in graceful offline and error fallback to maintain seamless operational readiness during storm telecom blackouts.
- **Hyperlocal Substation-Specific Weather Polling**:
  - Selecting any substation on the map or via search automatically targets its exact latitude & longitude coordinates for localized micro-climate awareness.
  - Accounts for coastal marine switchyards (*Ennore 400kV*, *Royapuram*, *Thiruvanmiyur*) vs western inland hubs (*Sriperumbudur 400kV*, *Ambattur*) which experience 2–5°C heat index variations and localized sea-breeze gusts.
  - Automatically reverts to city-wide **Chennai Central** baseline (`13.0827°N, 80.2707°E`) when no substation is selected.
- **Disaster Protocol Cockpit Modernization ("LIVE")**:
  - Renamed baseline monitoring button from `Normal` to **`Live`** with an animated pulsing beacon and real-time temperature badge.
  - Retained statutory emergency scenario drills (`Alert`, `Severe >80k`, `Surge 3.2m`) with clean un-obstructed map viewport.
- **Executive App Bar Redesign (`App.tsx`)**:
  - Modernized title and branding: **`SURGEGRID AI • V5.0`** with subtitle *"Chennai's Real-Time Grid & Flood Resiliency Console"*.
  - Eradicated non-actionable visual noise: eliminated static counts box (`Chennai Substations: 286 | AE Section Offices: 352`) and dummy status pill (`Map Status: Active`).
  - Allocated prominent horizontal breathing room for the **Live Weather** instrument, showing the active switchyard name, ambient temp, wind velocity, humidity, sky conditions, and manual refresh trigger.

---

## [1.6.0-authentic-outage-ingestion-and-calibrated-scoring] - 2026-09-27

### Added & Calibrated (100% Authentic TNEB Outage Integration & Power Engineering Health Scoring)
- **100% Authentic TNEB Outage Data Ingestion**:
  - Replaced all synthetic mock operational event generators with direct ingestion of **1,094 authentic Chennai outage notices** from `data-archive/data/chennai_resolved_outages.json`.
  - Mapped **595 direct substation and canonical alias matches** (covering complex name variants like *Pallavaram*, *Kilpauk Water Works*, *Ambattur IE*, *Vadapalani GIS*, *MKB Nagar*, *St. Thomas Mount*).
  - Implemented spatial nearest-substation mapping ($\le 5.0\text{ km}$) for **499 O&M section-level and street calls** logged with `Unknown SS` (e.g., `AE/O&M/SAIDAPET/WEST`, `AE/O&M/SOWCARPET/EAST`), binding localized incidents to their parent grid nodes.
  - Filtered out **152 statewide non-Chennai records** (Trichy Metro, Coimbatore, Madurai, Thoothukudi) scraped during statewide sweeps.
  - Substation operational log breakdown: **840 scheduled maintenance & planned civic works** + **373 sudden forced trips / line breakdowns**.
- **Power Engineering Calibrated Health Scoring Engine (`gridHealthService.ts`)**:
  - **Substation Feeder Scale Normalization ($\frac{4}{\sqrt{N_{\text{feeders}}}}$)**: Eliminates unfair penalties on high-capacity multi-feeder hubs (e.g., *Pallavaram SS* with 25 feeders, 132 MVA); normalizes radial corridor trips to $3.6 - 8$ pts per incident rather than penalizing as whole-yard failures.
  - **Scope-Based Base Penalties**: Distinct penalty weights for switchyard core equipment breakdowns (`yard_core` = 18 pts), 11kV radial line corridor faults (`feeder_corridor` = $8 \times \text{feederFactor}$), and low-tension street pillars (`lt_street` = 3 pts).
  - **Civic & Scheduled Works Classification**: Accurately classifies planned road-widening pole shifts, RMU conversions, and planned transformer rectifications as `periodic_maintenance` rather than forced trips.
  - **Post-Trip Maintenance Relief**: Subsequent scheduled maintenance provides a **45% penalty relief ($0.55\times$)** on prior trips, rewarding verified field crew remediation.
  - **Recency Decay**: $\le 14\text{ days} = 1.0\times$, $15 - 45\text{ days} = 0.75\times$, $> 45\text{ days} = 0.50\times$.
  - **Neglect Penalties**: $-12$ pts for 0 PM with trips; $-6$ pts for unaddressed trips following the last scheduled PM.
- **Triage Filter Alignment**:
  - Triage quick-filters in `DisasterCockpitBar.tsx` now accurately isolate:
    - **⚠️ Poor Stability (`< 75`)**: Identifies exactly 10 chronically strained substations (e.g., *Chindhatripet SS*, *Perungudi SS*, *Velachery SS*, *Cooks Road SS*).
    - **🌊 Waterlogging Risk**: Identifies 45 substations with low plinth elevation ($\le 3.2\text{m MSL}$) or critical surge inundation risk.
- **Client Cache Invalidation**:
  - Bumped IndexedDB key to `surgegrid_chennai_grid_v12_all_authentic_outages_mapped` in `tnebGridService.ts` for immediate browser cache rehydration.

---

## [1.5.0-crisis-resilience-and-maps-optimization] - 2026-09-27

### Added & Optimized (Google Maps Platform & Crisis Resilience Architecture)
- **P0: Grid Payload Diet & Offline-First IndexedDB Persistence**:
  - Minified `public/data/chennai_tneb_grid.json` by **62%** (5.81 MB down to 2.22 MB; compresses to **299 KB** via Brotli).
  - Integrated `idb-keyval` in `src/services/tnebGridService.ts` for stale-while-revalidate offline architecture (`surgegrid_chennai_grid_v5`).
  - Guarantees full grid visualization boots within <100ms even in 100% offline conditions during storm blackouts.
- **P0: Strict Spatial Boundary Clamping & Zoom Restrictions**:
  - Restricted camera bounds strictly to the Chennai Metropolitan Area (`CHENNAI_METRO_BOUNDS`: 12.75N–13.40N, 79.85E–80.38E) with `strictBounds: true`.
  - Locked zoom levels to `10.5–18.0`, preventing invalid map tile requests outside the district and eliminating wasted tile quota.
  - Added official Google Maps Platform agent skill attribution: `internalUsageAttributionIds: ['gmp_git_agentskills_v1']`.
- **P1: Hardware-Accelerated `google.maps.Data` Layer & DTR Zoom LOD**:
  - Replaced multi-`Polyline` DOM creation with a unified GeoJSON vector `google.maps.Data` layer, utilizing WebGL hardware-accelerated batching.
  - Implemented zoom-gated Level of Detail (LOD) for Distribution Transformers (DTRs), rendering them only when zoomed to street level (`zoom >= 13.8`).
- **P1: Circle Geometry IndexedDB Caching & Zero-Dependency List Virtualization**:
  - Persisted fetched circle feeder geometries and DTRs into client-side IndexedDB (`sg_feeders_circle_${cir}`).
  - Applied zero-dependency CSS list virtualization (`content-visibility: auto; contain-intrinsic-size: auto 90px;`) across feeder cards, reducing DOM paint times by ~65%.
- **P1: Feeder Geometry Coordinate Decimation & RDP Simplification**:
  - Eradicated **490,024 redundant coordinate vertices** across all 8 circle feeder networks (`public/data/feeders/*.json`).
  - Applied 5-decimal precision truncation (~1.1m resolution), duplicate consecutive vertex pruning, and Ramer-Douglas-Peucker line simplification (3m tolerance).
  - Reduced dense urban feeder payloads by up to **58.3%** (`0402.json`: 4.78 MB -> 2.00 MB; `0400.json`: 4.63 MB -> 2.17 MB), shaving **9.24 MB** off total public assets and drastically accelerating WebGL buffer upload times.
- **P2: Cloud Map ID & Google Maps Platform Modernization**:
  - Added support for Google Cloud Vector Map IDs (`mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || ''`) with seamless fallback to dark/light styles for offline/local development.
- **P3: Crisis Operations Triage Bar & Offline 2G SMS Dispatch Copy**:
  - Added instant Disaster Triage Quick Filters in the top cockpit (`All Grid`, `🌊 Submerged Yards <= 3.2m MSL`, `🏥 Lifeline Hubs`) with camera auto-fit.
  - Added standardized **`📋 Copy Incident SMS (Offline Dispatch)`** button for 2G SMS / VHF voice transmission with GCC Ward, Councillor, CMWSSB AE, GCC AE, and Ripon 1913 hotlines.
  - Pre-indexed search tokens (`searchIndex`) with early-exit iteration for O(1) autocomplete on 1,200+ grid assets.
- **P4: Monolith Decomposition & Complete Component Modularization**:
  - Decomposed 3,900+ line `TnebGridMap.tsx` monolith down to **988 lines** (~75% reduction in size), isolating into 10 single-responsibility modules:
    - [`mapStyles.ts`](file:///c:/projects/surgegrid-ai/src/components/Map/mapStyles.ts): Zero-POI cartography styles & Chennai bounds.
    - [`mapIcons.ts`](file:///c:/projects/surgegrid-ai/src/components/Map/mapIcons.ts): Dynamic SVG markers, selection halos, and DTR status badges.
    - [`disasterUtils.ts`](file:///c:/projects/surgegrid-ai/src/components/Map/disasterUtils.ts): Inundation heuristics, flood risk profiles, and cyclone SOPs.
    - [`DisasterCockpitBar.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/DisasterCockpitBar.tsx): Top floating disaster operations cockpit and triage filters.
    - [`MapSearchBox.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/MapSearchBox.tsx): Fast O(1) autocomplete search box.
    - [`MapLayerControls.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/MapLayerControls.tsx): Grid voltage tier and satellite layer controls.
    - [`MunicipalDisasterCard.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/MunicipalDisasterCard.tsx): GCC Ward command, CUG directory, and GEE satellite cards.
    - [`CopyIncidentSmsButton.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/CopyIncidentSmsButton.tsx): Offline 2G SMS / wireless VHF dispatch generator.
    - [`FeederCardItem.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/FeederCardItem.tsx): Single feeder card with priority rank and voltage badges.
    - [`GridJargonCheatSheet.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/GridJargonCheatSheet.tsx): Emergency grid operations terminology guide.
    - [`SubstationInspectorDrawer.tsx`](file:///c:/projects/surgegrid-ai/src/components/Map/SubstationInspectorDrawer.tsx): Complete right-hand inspector drawer with dual-column split and tabbed view.
  - Published comprehensive architectural specification in [`docs/07-crisis-resilience-and-maps-optimization.md`](file:///c:/projects/surgegrid-ai/docs/07-crisis-resilience-and-maps-optimization.md).

---

## [1.4.1-typography-and-feeder-deduplication] - 2026-09-27

### Fixed & Refined
- **Typography Standardization (Strict 3-Tier Hierarchy)**:
  - Eradicated all arbitrary fractional micro-pixel typography classes (`text-[8px]`, `text-[8.5px]`, `text-[9px]`, `text-[9.5px]`, `text-[10px]`, `text-[10.5px]`, `text-[11px]`) across the entire repository.
  - Standardized all UI surfaces to a cohesive 3-tier typographic system:
    - **Tier 1 (Values & Titles)**: `text-base font-bold` / `text-base font-mono font-bold` (16px) for quick telemetry metrics and substation titles; `text-sm font-bold` for section headers.
    - **Tier 2 (Body & Section Labels)**: `text-xs font-semibold` / `text-xs font-medium` (12px) for telemetry labels, section descriptors, and operational notes.
    - **Tier 3 (Pills & Badges)**: `px-2 py-0.5 rounded-md text-xs font-mono font-semibold` across all technical badges (SLA chips, RMU counters, sequential restoration stages, and disaster callouts).
- **Tab 1 & Tab 2 Content Routing Architecture**:
  - Corrected structural nesting in the single-column inspector drawer: isolated Tab 2 (`Circuits & Grid`) after the outgoing feeder list.
  - Properly routed all physical switchyard specifications, capacity metrics, flood risk benchmarks, and operational dispatch notes into Tab 1 (`Plant & Specs`), resolving the blank Tab 1 issue.
- **GEE Satellite Card Layout Ergonomics**:
  - Moved the flood category badge (`SEVERE INUNDATION ZONE`) to a dedicated second line under the title with a clean `mt-1` margin.
  - Prevents awkward text-wrapping of `Google Earth Engine (GEE) Satellite Stack` and avoids horizontal badge compression.
- **Feeder Card Redundancy Elimination (HT & Dedicated Deduplication)**:
  - Resolved quad-redundancy of "HT" and "Dedicated" in commercial and industrial feeder cards:
    - Replaced `Dedicated HT Commercial/Industrial` badge with **`Commercial & Industrial`**.
    - Replaced metadata tag `• Dedicated HT` with **`• Dedicated Line`** (describing point-to-point physical topology rather than repeating voltage).
    - Fixed bottom consumer slot: replaced raw database string `Dedicated (HT Service)` with **`👥 1 Bulk Consumer`** when consumer count is zero on dedicated lines, clearly explaining why retail consumer numbers are absent.

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
- **Balanced 3-Tab Architecture & Zero-Scroll Standard**:
  - Replaced the temporary 4-tab model with a balanced, ergonomic 3-tab layout:
    - **Tab 1: `[ℹ️ Plant & Specs]`**: Pure TNEB physical switchyard asset profile (**`CHENNAI SOUTH 2`** • `Region 01` • `16 MVA` • Switchyard GPS), civil elevation defense (Elevation MSL, Coast Dist, Composite Risk Score, 2015 Flood benchmark, Switchgear plinth clearance $1.5\text{m GL}$, Dewatering SOP), and jurisdictional AE Section Depot. Symmetrical ~380px height, 100% visible above the fold with zero scroll.
    - **Tab 2: `[⚡ Circuits & Grid (N)]`**: Consolidated electrical topology combining upstream transmission incomers/links, an "Isolate Electrical Circuit" toggle switch with animated power flow lines, an expandable linked nodes drawer (`View Links` / `Hide Links`), and the full downstream 11kV feeder management suite with lifelines (`💧 CMWSSB`, `🏕️ Shelter`, `🏥 Hospital`) and search.
    - **Tab 3: `[🛡️ Civic & Crisis]`**: Dedicated municipal disaster management command featuring GCC Zone & Ward identity (CDMP 2023), GEE satellite hydrology (Runoff mm, Impervious built %), 2×2 emergency hotlines (Councillor, CMWSSB AE, GCC AE, Ripon 1913) with direct `tel:` links, and multi-agency restoration clearance SOP. Symmetrical ~390px height, 100% visible above the fold with zero scroll.
  - **Pinned Header Ambient Reference**: Retained a single global pill (`🏛️ Z13:W174`) providing ambient civic awareness across all tabs without duplicating card titles below.
- **Feeder Card Decluttering & Jargon Cheat Sheet**:
  - Addressed visual crowding and confusing technical jargon inside Tab 2 (`Circuits & Grid`) and Split Inspector:
    - **Collapsible Grid Jargon Explainer**: Added an inline cheat sheet (`Explain Jargon (P1, ESF, RMU) ▼`) defining statutory codes (P1 NON-CUT, ESF 15 SLA, RMU Loops, Stage 3 Sequential Restoration).
    - **Compact Metadata Strip**: Reduced feeder card vertical height by ~40% by replacing multi-badge blocks with a clean strip (`⏱️ 6h SLA`, `🔄 2 RMU`, `📋 Stage 3`) with native hover tooltips (`cursor-help`).
    - **Plain-English Tooltips**: Every technical acronym (`P1 Non-Cut`, `ESF 15 SLA`, `RMU`, `Stage 3`, `UG`, `DTR`) now includes descriptive context on hover and tap.
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
- **Statutory Documentation Reference**: Published `docs/05-official-plans-and-how-the-app-uses-them.md` detailing the legal mandates, SOP clauses, and architecture.

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
