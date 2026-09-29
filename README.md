# SurgeGrid AI
> **Chennai's Real-Time Grid & Flood Resiliency Console**
> Hackathon: *Build with AI: Code for Communities (2nd Ed.)* — **Track 5: Cyclone Impact & Infrastructure Vulnerability Forecaster**

**SurgeGrid AI** is a disaster-operations console for the Chennai power network (TNEB / TANGEDCO / TANTRANSCO / GCC). It replays cyclone and flood scenarios hour by hour, shows which substations and feeders are exposed, and uses Google Gemini to write the action plan (SOP) a control room would follow. It is a client-side Vite + React 19 + TypeScript app on Google Maps, hosted on Firebase.

> New here? Start with [docs/00-feature-map.md](./docs/00-feature-map.md) (where each feature lives in the code) and [docs/PROJECT_LOG.md](./docs/PROJECT_LOG.md) (what we decided and did, in order).

---

## What the app does today

### 1. Disaster simulation (the core of the Track 5 story)
- **Two scenarios**, chosen from the floating *Disaster Cockpit* bar (top of the map): **Cyclone Michaung** and **2015 Megaflood**. The default view is **Live** (no simulation).
  - *Michaung*: 61 hourly steps from T-48h to T+12h (wind up to ~134 km/h, rain up to 46 mm/h, surge up to ~4 m). File: `public/data/scenarios/michaung_class_cat3.json`. This is a modelled benchmark dataset, not a live forecast.
  - *2015 Megaflood*: 120 hourly steps, a **hindcast** built from NASA GPM IMERG rain and ERA5-Land wind (via Earth Engine). It has no storm surge (sea level held at 0.4 m). File: `public/data/scenarios/floods2015.json`.
- **Timeline controls**: play / pause, step back / forward, and an hour-by-hour scrubber, with live wind, rain and surge readouts.
- **Per-feeder status** at the chosen hour: yard-flood trip, pre-emptive wind trip (overhead and mixed lines), cyclone watch, or underground line still live. Rules are in `src/components/Map/disasterUtils.ts`.
- The timeline auto-pauses and opens the AI Directive at milestone hours (Michaung: -24, 0, 12; Megaflood: -48, 0, 12).
- `?scenario=MICHAUNG_CAT3` or `?scenario=FLOODS_2015` in the URL opens a scenario directly.

### 2. Gemini AI (two tiers)
- **Tier 1 — Grid Commander SOP** (city-wide). Ranks the 6 most vulnerable substations at the current hour and asks Gemini for a prioritised checklist (P0 critical / P1 lifeline / P2 field) with a statutory reference. Shown in the *AI Directive* window.
- **Tier 2 — Substation Copilot** (one substation). When you open a substation, Gemini gives an operating posture (safe / dewatering / selective load-shed / pre-emptive isolate) and three switchyard actions.
- Model: `gemini-2.5-flash` via the REST API, with strict JSON output, results cached in memory, and a **built-in rule engine fallback** when there is no key, no network, or the API fails.
- Details: [docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md](./docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md).

### 3. Grid and asset data
- **286 substations** (37 bulk EHV 230/400 kV, 89 sub-transmission 110 kV, 160 distribution 33/11 kV) and **352 section offices**, from `public/data/chennai_tneb_grid.json` (v5.0.0-ground-truth).
- **Grid interconnections**: precomputed links with confidence tiers (L1 verified, L2 probable); links longer than the physical distance limit for their voltage are dropped at load time.
- **Feeders and transformers on demand**: 2,678 feeders inside the substation records; street geometry and ~65,000 distribution transformers (DTRs) load per circle from `public/data/feeders/` and `dtr/`, cached in IndexedDB. DTR pins show from zoom 13.8.
- **Lifeline feeders**: hospitals, water/sewage pumping (P1), metro/rail/port and government (P2), commercial (P3), each with a restoration target time (6 / 12 / 24 / 48 h).
- **Flood and terrain fields per substation** (baked in from Earth Engine): elevation, distance to coast, risk category, runoff, impervious %, and a `hydroRisk` block (cyclone depth, first-fail hour, isolate recommended, 2015 flood depth).
- **Municipal context**: GCC zone and ward, ward officer hotlines, relief-shelter counts, and a **Copy incident SMS** button that builds a ready-to-send dispatch text.

### 4. Live intelligence
- **Live outages**: active TANGEDCO notices from `outage.nammamap.in`, matched to substations by a local resolution gate (Gold Registry → locality list → name matching → coordinate snap). The Gold Registry (2,789 signatures) loads from Cloud Storage with a bundled fallback.
- **Live weather**: Google Maps Platform Weather API, for the selected substation (Chennai Central by default), refreshed every 10 minutes, with an offline fallback.
- **Health scoring**: 90-day asset durability plus live dispatch score, grades A–D, seven outage types with English and Tamil keywords, and a disaster risk multiplier.

### 5. Map and inspector UI
- Google Map with light/dark themes, satellite toggle, voltage-tier layer toggles, section-office layer, connection lines, search box, resizable left panel.
- **Triage roster**: filter to *Poor stability (<75)*, *Waterlogging risk* or *Live outages*.
- **Substation inspector drawer** (three tabs): *Plant & Specs*, *Circuits & Grid*, *Civic & Crisis*, plus a section-office view with boundary polygons.
- Works offline for grid, feeder, DTR and outage data (IndexedDB, stale-while-revalidate).

---

## Not built yet
- Road exposure and shelter routing (only shelter counts per ward).
- A trained forecasting model: surge and damage come from scenario data and rules, not a predictive model.
- Gemini reading images (no multimodal use).
- Gemini-drafted early-warning dispatch (today's dispatch is the copy-SMS button).
- Tamil in the AI Directive (the dynamic SOP leaves `summaryTa` empty).
- Any city other than Chennai.
- The full Earth Engine pipeline and hourly WeatherNext forecast slider described in docs/01 (Earth Engine outputs are pre-baked into the grid file).

## Known issues
See the review notes in [docs/PROJECT_LOG.md](./docs/PROJECT_LOG.md) (SOP impact numbers are estimates, the Gemini key is exposed in the browser, and a few cache and phase edge cases).

---

## Documentation
- [00 - Feature Map (where things live)](./docs/00-feature-map.md)
- [Project Log (decisions and history)](./docs/PROJECT_LOG.md)
- [Disaster Simulation & Gemini Architecture](./docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md)
- [01 - Architecture & System Design](./docs/01-architecture-and-system-design.md) (design vision; see its status note)
- [02 - Data Dictionary & Sources](./docs/02-data-dictionary-and-sources.md)
- [03 - Chennai TNEB Grid Topology & Field Guide](./docs/03-chennai-grid-topology-and-field-guide.md)
- [04 - Electrical Grid Linkages & Provenance](./docs/04-electrical-grid-linkages-provenance.md)
- [05 - Disaster Management & Statutory SOP Linkage](./docs/05-disaster-management-and-statutory-sop-linkage.md)
- [06 - GCC Municipal & Satellite Vulnerability Integration](./docs/06-gcc-municipal-and-satellite-vulnerability-integration.md)
- [07 - Crisis Resilience & Google Maps Optimization](./docs/07-crisis-resilience-and-maps-optimization.md)
- [08 - Grid Resiliency Scoring Architecture](./docs/08-grid-resiliency-scoring-architecture-and-recalibration-plan.md)
- [09 - Outage Reason Taxonomy & Scoring Dictionary](./docs/09-outage-reason-taxonomy-and-scoring-dictionary.md)
- [10 - Cloud-Hosted Gold Registry & Self-Enrichment Pipeline](./docs/10-cloud-hosted-gold-registry-and-self-enrichment-pipeline.md)
- [V5 Ground-Truth Rebuild](./docs/v5-ground-truth-rebuild.md) · [V4 Topology Rebuild (superseded)](./docs/grid-topology-rebuild.md)
- [Data pipeline scripts](./scripts/README.md) · [Changelog](./docs/CHANGELOG.md)

---

## Development

```bash
npm install        # install dependencies
npm run dev        # dev server (proxies /api/v2 to outage.nammamap.in)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

Copy `.env.example` to `.env` and set:

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `VITE_GOOGLE_MAPS_API_KEY` | Map + Weather API | Required. Restrict by HTTP referrer, since it ships in the browser bundle. |
| `VITE_GOOGLE_MAPS_MAP_ID` | Map | Optional. Enables vector map rendering; without it the embedded JSON styles are used. |
| `VITE_GEMINI_API_KEY` | Gemini SOP + Substation Copilot | Optional. Without it the app uses the built-in rule engine. The key ships in the browser bundle, so restrict it. |
| `VITE_PROJECT_ID` | none in `src/` | Listed in `.env.example` but not read by the app. |

**Deploy**: `npm run build`, then Firebase Hosting (site target `surgegrid`, project `namma-map-407ca`). `/api/v2/**` is rewritten to the `outageApi` Cloud Function (source lives in a separate repo, `nammamap-outage-aggregator`).

**Offline scripts** (`scripts/`) rebuild the grid, gold registry and enrichments. They are not part of the app runtime. See [scripts/README.md](./scripts/README.md).
