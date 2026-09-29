# SurgeGrid AI
> **Chennai's power grid and flood console: real weather, official plans, no invented rules**
> Hackathon: *Build with AI: Code for Communities (2nd Ed.)*, **Track 5: Cyclone Impact & Infrastructure Vulnerability Forecaster**

**SurgeGrid AI** replays three real Chennai rain events hour by hour, shows which substations and feeders are exposed, and tells the control room what the official disaster plans say to do. Gemini writes short notes on top of quoted plan text. It is a client-side Vite + React 19 + TypeScript app on Google Maps, hosted on Firebase, with one small Cloud Function for Gemini.

> New here? Read [docs/PROJECT_LOG.md](./docs/PROJECT_LOG.md) (what we decided and did, in order) and [docs/00-feature-map.md](./docs/00-feature-map.md) (where each feature lives in the code).

---

## The one rule: only truths

Everything the app shows is one of four things, and nothing else:
1. **An official quote.** Every action or rule is a word-for-word quote from a government plan, with plan name and page. The full list is in [docs/SOURCES.md](./docs/SOURCES.md) and `src/data/officialSources.ts` (37 quotes, each checked against the PDF text). The four plans: MoP *Disaster Management Plan for Power Sector* (2021), TANGEDCO *Disaster Management Plan* (2017), Tamil Nadu *State Disaster Management Plan* (2023), Greater Chennai Corporation *City Disaster Management Perspective Plan* (2023).
2. **Real data with a source.** Rain and wind (NASA GPM IMERG, ERA5-Land), terrain (SRTM), the TNEB grid, live TANGEDCO outage notices, Google Weather, and official flood maps and relief-centre lists (OpenCity, Greater Chennai Corporation profile).
3. **A map check.** Whether a substation's location falls inside an official flood map. Not a prediction.
4. **Our own calculation, labelled as ours.** The health score, the SurgeGrid ranking and the backup suggestion say so on screen.

The plans do **not** give a wind speed or flood depth at which supply must be switched off, restoration hour limits, a plinth height or gang and pump counts. They say supply may be switched off "if required". So the app shows an "operator decision" and never trips a feeder on an invented threshold. See "What the plans do not contain" in [docs/SOURCES.md](./docs/SOURCES.md).

---

## What the app does today

### 1. Three real rain scenarios
Chosen from the floating *Disaster Cockpit* bar. Each is a **hindcast**: real rain (NASA GPM IMERG) and wind (ERA5-Land), averaged over the Chennai area through Earth Engine. Wind is an area average, not gusts. No storm surge is modelled. T-0 is the peak-rain hour.

| Scenario | Steps | Peak rain | Total rain | File |
|---|---|---|---|---|
| Cyclone Michaung, Dec 2023 | 144 hourly, T-69h to T+74h | 14.0 mm/h | 273 mm | `public/data/scenarios/michaung2023.json` |
| 2015 Megaflood | 120 hourly, T-85h to T+34h | 23.4 mm/h | 372 mm | `public/data/scenarios/floods2015.json` |
| Monsoon Spell, 12-18 Nov 2020 (ordinary heavy monsoon rain) | 144 hourly, T-69h to T+74h | 16.8 mm/h | 198 mm | `public/data/scenarios/monsoon2020.json` |

Timeline controls: play/pause, playback speed (1x to 8x, default 4x), step, milestone jumps and a scrubber. The AI Directive opens at milestone hours. `?scenario=MICHAUNG_2023`, `FLOODS_2015` or `MONSOON_2020` opens a scenario directly. The scenario files were built with the script in the sister project `surgegrid-ai-v2` (`pipeline/07_build_scenario_from_gee.py`).

### 2. AI Directive (city-wide SOP)
For the hour on screen, the directive lists the official actions that apply, each as a quote with its citation, and the substations they apply to, chosen from our grid data (lowest-lying yards, substations with overhead feeders, substations with hospital or water feeders). Phases come only from the data: before T-0 = watch; from T-0 while hourly rain is 0.1 mm or more = impact; after T-0 once rain is below 0.1 mm = restoration. Wind is shown with its IMD cyclone class (Severe 88 km/h and above) but does not drive the phase.

### 3. Substation card
- **Flood exposure**: yard elevation against Chennai's 2.0 m average (GCC plan), then only the official flood maps this location falls in: NRSC 2015 flood extent, the 5 to 100-year flood-hazard maps, GCC inundation zones, nearby 2015 stagnation points and 2020 hotspots. When the yard is low, inside the 2015 extent or rated Moderate/High, it also quotes the plan's action.
- **Substation Copilot**: flags from our data (low-lying yard, overhead feeders, hospital/water feeders) and up to four quoted actions for the current phase, with feeder names.
- **Relief centres and backup**: the GCC relief centres listed for the substation's ward (address, officer, contact). The GCC list has **no coordinates**, so we do not say which substation feeds which centre. Flagged substations also show the nearest other substation with none of the flood flags, as a suggestion (straight-line distance; load transfer not checked).
- Feeder cards carry facts and quotes only: low-lying yard, overhead ("operator decision"), underground, priority class by feeder name.

### 4. Gemini
Gemini 2.5 Flash on Google Cloud's Gemini Enterprise Agent Platform (formerly Vertex AI). It **only chooses target names from lists we send and words one short note**. It never writes, changes or cites the quotes; notes with a number that was not in the prompt are dropped. If Gemini is unavailable, the app shows the same quoted actions with rule-based notes. Calls go through our own Cloud Function, so **no API key exists in the app**: see [gemini-proxy/](./gemini-proxy/README.md). Details: [docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md](./docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md).

### 5. Grid, live data and map
- **TNEB grid**: 286 substations (37 bulk EHV, 89 sub-transmission, 160 distribution) and 352 section offices (`public/data/chennai_tneb_grid.json`, v5.0.0); 583 precomputed links; 2,678 feeders; street geometry for 3,335 feeders and 65,557 distribution transformers loaded on demand and cached in IndexedDB.
- **Live outages** from `outage.nammamap.in`, matched to substations by a local resolution gate (Gold Registry v2, 2,789 signatures).
- **Live weather** from the Google Maps Platform Weather API.
- **Health score** (grades A-D from 90-day outage history and live notices) is our own model and is labelled that way.
- Map: light/dark themes, satellite toggle, voltage layers, section offices, connection lines, search, resizable panel, triage filters (poor stability, waterlogging, live outages), and an optional relief-centre layer (one marker per ward, inside the ward, not at the centre's real site).

---

## Honest limits
- **Rain scenarios only.** No storm surge, no cyclone track, no street-level flood forecast.
- **Not a predictor.** Nothing here forecasts where water will go. Flood facts are map checks against official layers. In the sister project `surgegrid-ai-v2`, our own flood-proneness score matched the city's 53 flood hotspots (AUC 0.76) but did not match the 2015 satellite flood map, so we do not show model flood depths.
- **Chennai only.** Nothing has been built for other cities. The scripts and data layout are city-specific.
- **Relief centres have no exact locations** in the GCC list.
- **Wind is an area average**, so it stays below the lowest IMD cyclone class in all three scenarios.
- **Our own labelled items:** the health score, the SurgeGrid ranking panel and the backup suggestion. The waterlogging filter uses facts and official map checks only: yard at or below 2.0 m, inside the 2015 flood extent, or rated Moderate/High on the official flood-hazard maps (87 of 286 substations).
- **Not built:** road exposure, Tamil text, image input to Gemini, a trained forecasting model, other cities.

---

## Performance (live site, Lighthouse 13.5.0, 2026-09-30)
Mobile: Performance 54, Accessibility 100, Best Practices 92, SEO 100 (LCP 8.3 s, total blocking time 720 ms). Desktop: Performance 91, Accessibility 100, Best Practices 92, SEO 100 (LCP 1.9 s). The map, code split and slimmed data files (grid file 1.7 MB) helped; the mobile LCP is now mostly Google Maps' own load time. Remaining ideas are listed in `docs/PROJECT_LOG.md` (item 34).

---

## Documentation
- [PROJECT_LOG.md](./docs/PROJECT_LOG.md): every decision and step, newest last. Read first.
- [00 - Feature Map](./docs/00-feature-map.md): feature to file locator.
- [SOURCES.md](./docs/SOURCES.md): the quote bank with page numbers, and what the plans do not say.
- [Disaster Simulation & Gemini Architecture](./docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md)
- [01 - Architecture](./docs/01-architecture-and-system-design.md)
- [02 - Data Dictionary & Sources](./docs/02-data-dictionary-and-sources.md)
- [03 - Grid Topology & Field Guide](./docs/03-chennai-grid-topology-and-field-guide.md)
- [04 - Grid Linkages & Provenance](./docs/04-electrical-grid-linkages-provenance.md)
- [05 - What the Official Plans Say and How the App Uses Them](./docs/05-official-plans-and-how-the-app-uses-them.md)
- [06 - GCC Municipal & Satellite Integration](./docs/06-gcc-municipal-and-satellite-vulnerability-integration.md)
- [07 - Crisis Resilience & Maps Optimization](./docs/07-crisis-resilience-and-maps-optimization.md)
- [08 - Health Scoring](./docs/08-grid-resiliency-scoring-architecture-and-recalibration-plan.md) · [09 - Outage Taxonomy](./docs/09-outage-reason-taxonomy-and-scoring-dictionary.md) · [10 - Gold Registry](./docs/10-cloud-hosted-gold-registry-and-self-enrichment-pipeline.md)
- [Changelog](./docs/CHANGELOG.md) · [Data pipeline scripts](./scripts/README.md)

---

## Development

```bash
npm install        # install dependencies
npm run dev        # dev server (proxies /api/v2 to outage.nammamap.in and /api/gemini to the Gemini proxy)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

Copy `.env.example` to `.env` and set:

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `VITE_GOOGLE_MAPS_API_KEY` | Map + Weather API | Required. Restrict by HTTP referrer, since it ships in the browser bundle. |
| `VITE_GOOGLE_MAPS_MAP_ID` | Map | Optional. Enables vector map rendering. |
| `VITE_GEMINI_PROXY_URL` | AI Directive + Substation Copilot | Optional. Defaults to `/api/gemini`. There is **no Gemini API key in the app**. If the proxy is unreachable the app falls back to rule-based notes. |

**Deploy**: `npm run build`, then Firebase Hosting (site `surgegrid`, project `namma-map-407ca`). `/api/v2/**` is rewritten to the `outageApi` function (source in another repo) and `/api/gemini` to the `surgegridGemini` function in this repo's `gemini-proxy/`. Deploy that function with the command in [gemini-proxy/README.md](./gemini-proxy/README.md).

**Data scripts** (not part of the app runtime):
- `scripts/build_official_flood_layers.py` writes `public/data/official_flood_layers.json` from the OpenCity GCC flood layers (large KML files kept outside this repo).
- `scripts/build_relief_centres.py` writes `public/data/relief_centres.json` (ward-level relief centres and backup suggestions).
- `scripts/slim_grid_data.py` slims the grid file after it is regenerated (moves section boundaries to `section_boundaries.json`, drops the unused model fields and a duplicate history list; 3.76 MB to 1.69 MB).
- Older scripts rebuild the grid, gold registry and enrichments. See [scripts/README.md](./scripts/README.md).
