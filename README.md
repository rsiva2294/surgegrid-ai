# SurgeGrid AI
> **Chennai's power grid and flood console: real weather, official plans, no invented rules**
> Hackathon: *Build with AI: Code for Communities (2nd Ed.)*, **Track 5: Cyclone Impact & Infrastructure Vulnerability Forecaster**

**SurgeGrid AI** replays Cyclone Michaung (December 2023) in five steps on a map of Chennai, shows which substations are exposed to heavy rain and official flood maps, and tells the control room what the official disaster plans say to do. Gemini writes short notes on top of quoted plan text. It is a client-side Vite + React 19 + TypeScript app on Google Maps, hosted on Firebase, with one small Cloud Function for Gemini.

> New here? Read [docs/PROJECT_LOG.md](./docs/PROJECT_LOG.md) (what we decided and did, in order) and [docs/00-feature-map.md](./docs/00-feature-map.md) (where each feature lives in the code).

---

## The one rule: only truths

Everything the app shows is one of four things, and nothing else:
1. **An official quote.** Every action or rule is a word-for-word quote from a government plan, with plan name and page. The full list is in [docs/SOURCES.md](./docs/SOURCES.md) and `src/data/officialSources.ts` (37 quotes, each checked against the PDF text). The four plans: MoP *Disaster Management Plan for Power Sector* (2021), TANGEDCO *Disaster Management Plan* (2017), Tamil Nadu *State Disaster Management Plan* (2023), Greater Chennai Corporation *City Disaster Management Perspective Plan* (2023).
2. **Real data with a source.** Rain and wind (NASA GPM IMERG, ERA5-Land), terrain (SRTM), the TNEB grid, live TANGEDCO outage notices, Google Weather, and official flood maps and relief-centre lists (OpenCity, Greater Chennai Corporation profile).
3. **A map check.** Whether a substation's location falls inside an official flood map. Not a prediction.
4. **Our own calculation, labelled as ours.** The health score and the backup suggestion say so on screen.

The plans do **not** give a wind speed or flood depth at which supply must be switched off, restoration hour limits, a plinth height or gang and pump counts. They say supply may be switched off "if required". So the app shows an "operator decision" and never trips a feeder on an invented threshold. See "What the plans do not contain" in [docs/SOURCES.md](./docs/SOURCES.md).

---

## What the app does today

### 1. One real storm: Cyclone Michaung, December 2023
Chosen from the floating *Disaster Cockpit* bar (Live or Cyclone Michaung). It is a **hindcast**: real rain (NASA GPM IMERG) and wind (ERA5-Land) through Earth Engine. T-0 is the peak-rain hour (3 December 2023, 21:00 UTC), not a landfall time: IMD's bulletin of 4 December 2023 forecast the storm to cross the coast near Nellore-Machilipatnam on 5 December. No storm surge is modelled. We earlier had two more events (the 2015 floods and a November 2020 monsoon spell); they were removed to focus on one event that we could finish well.

| Data | What it holds | File |
|---|---|---|
| Area mean | 144 hourly steps, T-69h to T+74h; peak 14.0 mm/h, total 273 mm; wind is an area mean, not gusts | `public/data/scenarios/michaung2023.json` |
| Per cell | 28 cells of 0.1 degree (about 11 km), each holding at least one substation; hourly rain per cell (worst 24 hours: 144 to 253 mm across cells). Wind is not gridded: ERA5-Land has no data over the coastal cells | `public/data/scenarios/michaung2023_grid.json` |

**Timeline:** five steps, two before the peak, the peak and two after: T-24h, T-6h, T-0h Peak rain, T+12h, T+36h (the first hour where rain stays below 0.1 mm for six hours). Play walks the steps, 6 seconds each; between two steps the map plays the real hours in between over 2.5 seconds (the hourly satellite rain, and the storm along IMD's track; 1.2 seconds after a click). The switch "Animate between steps" follows the device's reduced-motion setting until ticked. Previous and next buttons and the step chips jump directly. The phase colour of each step comes from the data (watch, impact, restoration). `?scenario=MICHAUNG_2023` opens the scenario directly.

**What the screen shows during the replay** (the map stays on Chennai; the header's live weather is hidden because it describes today, not December 2023)
- **Substations to check, as a glow:** every substation keeps its usual colour (bulk pink, 110 kV amber, distribution blue). A site to check gets a halo behind its dot: a wide red one for **Check first**, a smaller orange one for **Check next**. The order is ours and the card says so: "rain here" (the higher of the satellite 24-hour value over the site's cell and the nearest IMD gauge reading of the latest IMD day) at IMD's Heavy class or worse (64.5 mm), plus a flood fact. Check first needs a strong fact (inside the 2015 flood extent, High on the hazard maps, or a ward location at 3 ft or deeper in the GCC 2015 register); Check next a weaker one (Moderate hazard rating, or yard at or below 2 m). The plans set no rain level for action, so this is an order for inspection, not a prediction of flooding. For Michaung, of the 111 substations with a flood fact: 0 at T-24h, 88 at T-6h (75 first, 13 next), 111 at T-0h and T+12h (94 first, 17 next), 106 at T+36h.
- **Sites to check** (left panel): the same list in full, Check first first, each row with its rain, whether it came from a gauge or the satellite, and its flood facts.
- **Where water stood before (not a Michaung map):** the NRSC 2015 flood extent as a light tint, on by default; the GCC 5 to 100-year hazard maps as a switch. No public map shows where water stood during Michaung (see Honest limits).
- **Rain numbers, not a rain layer:** the satellite rain is not drawn on the map (at about 11 km one square covered several neighbourhoods and turned the whole city one colour); it appears in the site card and the list. **It reads below IMD's rain gauges.** IMD's final report lists gauge totals for 3, 4 and 5 December (24 hours to 08:30 IST). At the 18 gauges we could place (17 inside our cells; coordinates from the Tamil Nadu gauge list, names matched exactly), the satellite cell held about a third of the gauge total on 3 December (median 30 against 80 mm, 7 stations), three-quarters on 4 December (147 against 195 mm, 16 stations) and about three-fifths on 5 December (115 against 170 mm, 10 stations). On 4 December, 13 of the 50 Chennai-district stations IMD lists recorded 204.5 mm or more (its "Extremely heavy" class); our cells never reach it. This is why "rain here" also uses the nearest gauge.
- **IMD rain gauges:** the gauges IMD's final report lists for the latest 24-hour window (to 08:30 IST) that had ended at that step, drawn as small squares coloured by rain class: 7 gauges for 3 December (T-6h and T-0h), 17 for 4 December (T+12h), 11 for 5 December (T+36h), none at T-24h. IMD lists only stations with 7 cm or more, so a station that is missing is "not listed", not zero. Built by `scripts/build_gauge_points.py` from the report and the Tamil Nadu gauge list; values checked against the report text.
- **Wind:** one city-wide reading with its direction (from the land cells). IMD's bulletin of 4 December 2023, 13:00 IST, reported gale wind of 60-70 km/h gusting 80 along and off the Chennai coast; our smoothed area mean reads lower. IMD's final report records 56 km/h (Nungambakkam weather station, 14:15 IST) and 68 km/h (Meenambakkam, 10:30 IST) on 4 December, with gusts of 75 to 90 km/h.
- **Cyclone track (IMD, observed):** the whole best track of Michaung from the IMD final report (Table 1, 34 rows, 3-hourly) drawn as a dotted line, the part travelled as a solid line, a marker at the storm centre coloured by IMD grade (D, DD, CS, SCS) with its wind, and IMD's landfall point (5 Dec, 07:00-09:00 UTC, near 15.7 N 80.3 E) with IMD's own sentence. Between two IMD positions the marker moves on a straight line (our interpolation, labelled). The distance to Chennai is our calculation. "Show whole storm" zooms out over the Bay of Bengal. Data: `public/data/scenarios/michaung2023_track.json`, built and self-checked by `scripts/build_best_track.py`.
- **Less on screen:** the AI Directive banner is one line (its summary is in the tooltip and the dialog); the storm panel starts folded with the halo key visible; on phones the left panels sit at the bottom so the timeline and map stay visible.

**Clicking a substation during the replay** opens a briefing for that site at that step, at the top of the Overview tab:
- **At T-6h, 20:30 IST, 3 Dec, Standby**, then the headline (Check first / Check next / Watch / No flood flag in our data) with its reason, for example "Heavy rain (MGR Nagar gauge, 70 mm) on a site with a flood record: ward 119 had a flooded spot above 5 ft deep in 2015; Moderate on the official hazard maps."
- **IMD said:** one IMD statement for the step (rain statements first).
- **Rain here:** the satellite 24-hour value over the site's cell and up to three IMD gauges within 10 km (the nearest, then the nearest with a reading), with the IMD day and how long before the step it ended, and the satellite value for the same day.
- **What the plans say to do now:** the quoted plan actions for the site's flood and feeder facts at this stage (the Substation Copilot, moved here from the Respond tab), with a two-sentence Gemini note that words the same rain and flood facts (every number must come from the prompt).
- The live-only items (health score, outage notices, 90-day log) are hidden during a replay; the replay cards use 13 px text with nothing under 12 px.

Scripts: `scripts/build_scenario_grids.py` (per-cell rain and wind from Earth Engine) and `scripts/build_flood_polygons.py` (simplified flood-map polygons from the OpenCity KML files). The area-mean file was built with `pipeline/07_build_scenario_from_gee.py` in the sister project `surgegrid-ai-v2`.

### 2. AI Directive (city-wide SOP), at every step
**When it opens:** during the replay, pressing Play or clicking a step opens the directive for that step once the map has settled, and playback waits. Its main button, "Next step: T-6h" (and so on), closes it and plays the move to the next step, where it opens again; "Finish replay" on the last step. A switch in the dialog, "Open at each step", turns this off.

**What it shows, top to bottom:**
- **The stage** (Standby, Impact, Restoration) and **what IMD said at that time**: up to two word-for-word statements from IMD's press releases or final report, each labelled with its kind (rain warning, observed rain, wind warning, landfall) and its bulletin, rain first. T-24h comes before IMD's first bulletin in our set, so it shows IMD's observed best-track position instead (deep depression, about 345 km from Chennai, our distance). This replaced our own summary sentence and the separate "IMD at the time" card.
- **Counts for the step** (our order, the same as the map halos and the list): sites to check first "of N to check (111 with a flood fact)", sites to check with overhead feeders, and hospital or water feeders at them. For Michaung: 0 / 0 at T-24h, 75 of 88 at T-6h, 94 of 111 at T-0h and T+12h, 89 of 106 at T+36h.
- **Sites to check first, across the city:** up to six, at most one per ~11 km cell, most rain first (ties by consumers served), so one cluster cannot fill the list. Click one to open it.
- **The official actions for the stage**, each a quote with its citation. Phases come only from the data: before T-0 = standby; from T-0 while hourly rain is 0.1 mm or more = impact; after T-0 once rain is below 0.1 mm = restoration. Each action names sites only where our data gives a reason (our match, labelled): dewatering, sandbags and pumping out go to check-first sites inside the 2015 flood extent or with a yard at or below 2 m; ERS towers to 230 kV and 110 kV check-first sites; overhead-line actions to sites to check with overhead feeders; lifeline actions to sites to check serving hospital or water feeders; planning and city-wide actions (diesel, inventories, manpower, identifying flood-prone locations, the emergency operation centre) name no site and say they apply to all sites to check.
- **Gemini** words a short note per action from the step's lists and counts; it can only pick names from those lists, every number must come from the prompt, and wording such as "flood-prone", "vulnerable", "experiencing" or invented wind words is rejected. The rain totals are written in the past tense ("had Heavy rain or worse in the last 24 hours or the latest IMD gauge day"); city-mean rain and wind are "this hour".

### 3. Substation card
- **Flood exposure**: yard elevation against Chennai's 2.0 m average (GCC plan), then only the official flood maps this location falls in: NRSC 2015 flood extent, the 5 to 100-year flood-hazard maps, GCC inundation zones, nearby 2015 stagnation points and 2020 hotspots. When the yard is low, inside the 2015 extent or rated Moderate/High, it also quotes the plan's action.
- **Respond tab** (third tab, after Overview and Feeders): the AI card first, then relief centres, all contacts, and collapsed plan notes. During a scenario the **Substation Copilot** (up to four quoted actions for the current phase, with feeder names) sits at the top of the Overview tab instead (section 1). On the live view the AI card is an **AI summary**: Gemini words two or three sentences from facts we send and show under "Facts used" (health score, live outage notices, yard elevation, official flood-map checks, feeder counts, ward relief-centre count, real live weather). It never picks or quotes actions, predicts or advises.
- **GCC ward records** (flood card): from the GCC City DMP 2024, the plan's own depth-of-inundation registers counted per ward: how many locations the 2015 register lists in the ward and the deepest class (above 5 ft, 3 to 5 ft, 2 to 3 ft, under 2 ft), in how many of the 7 monsoon registers (2015 and 2017 to 2022) the ward appears, and whether the ward is on the 2023 north-east monsoon list (which includes Michaung; no depth classes). Street names by ward, not points. Each register equals the plan's printed total; built by `scripts/build_gcc_plan_2024.py`.
- **Relief centres and backup**: the GCC relief centres listed for the substation's ward (address, officer, contact); also capacity and facilities from the GCC plan 2024 table (all 15 zones). The GCC list has **no coordinates**, so we do not say which substation feeds which centre. Flagged substations also show the nearest other substation with none of the flood flags, as a suggestion (straight-line distance; load transfer not checked).
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
- **One rain event.** No storm surge, no cyclone track, no street-level flood forecast. The flood layers are fixed maps: none of our flood data (the 2015 extent, the depth readings, the stagnation points, the hazard maps) has a time in it, so we do not animate flooding. We have no observed flood extent for Michaung: NRSC mapped standing water from RISAT-1A radar on 7 December 2023, 06:00 (874 ha in Chennai district, about 40 hours after our last step), but its GIS file went only to state agencies and Bhuvan's public map services hold no December 2023 layer; there is no Sentinel-1 image of Chennai from 1 to 25 December 2023 (see `docs/SOURCES.md`).
- **Not a predictor.** Nothing here forecasts where water will go. Flood facts are map checks against official layers. In the sister project `surgegrid-ai-v2`, our own flood-proneness score matched the city's 53 flood hotspots (AUC 0.76) but did not match the 2015 satellite flood map, so we do not show model flood depths.
- **Chennai only.** Nothing has been built for other cities. The scripts and data layout are city-specific.
- **Relief centres have no exact locations** in the GCC list. Capacity and facilities are the 2024 plan's table rows as printed, for all 15 zones (each row checked against the page text; zones 10, 13 and 14 were copied by hand from the PDF). The plan's own zone totals often differ from its tables (11 zones), so the card shows the table's numbers, not the totals.
- **Wind is an area average**, so it stays below the lowest IMD cyclone class in this scenario, and below IMD's own reported gale wind for the Chennai coast.
- **Rain cells are coarse and read low.** About 11 km, satellite-derived: good for where the heavier rain fell, not for streets, and below IMD's gauges (see section 1). We show the comparison and do not scale the satellite up: a correction factor would be invented. The nearest gauge is a daily total, often several km away (3.7 km at the median across substations, more than 10 km for one in ten), and the card says which reading it uses.
- **Our own labelled items:** the health score and the backup suggestion. The waterlogging filter uses facts and official map checks only: yard at or below 2.0 m, inside the 2015 flood extent, or rated Moderate/High on the official flood-hazard maps (87 of 286 substations).
- **Not built:** road exposure, Tamil text, image input to Gemini, a trained forecasting model, other cities.

---

## Performance (live site, Lighthouse 13.5.0, after the final deploy)
Mobile: Performance 48 to 57 across three runs (median 53), Accessibility 100, Best Practices 92, SEO 100 (LCP about 9 s, total blocking time 660 to 1,000 ms). Desktop: Performance 88, Accessibility 100, Best Practices 92, SEO 100 (LCP 2.2 s). Mobile scores vary by about 10 points from run to run. The map, code split and slimmed data files (grid file 1.7 MB) helped; the mobile LCP is now mostly Google Maps' own load time. Remaining ideas are listed in `docs/PROJECT_LOG.md` (items 34 and 39).

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
