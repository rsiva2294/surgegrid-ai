# Prompt for Opus: reimagine how SurgeGrid AI shows the cyclone simulation

Copy everything below the line into a new chat that has read access to this repository (`C:\projects\surgegrid-ai`, branch `feature/spatial-simulation`).
Edit the two bracketed lines (time left, what you liked or disliked) before sending.

---

## Your task

You are helping finish **SurgeGrid AI**, a Chennai electricity-grid and flood console built for the Build with AI hackathon (Track 5, "Code for Communities"). The hackathon deadline is 2026-09-30. **[Owner: write how many hours are left, and what you still have to record or submit yourself.]**

The **simulation** is the part of the app that replays Cyclone Michaung (December 2023) on the map. The owner does not feel it is close to complete. **Do not write code yet.** Read the material below, then give me a design proposal I can approve, following the "What I want back" section. I work plan first, code after approval.

**[Owner: add in one or two lines what feels wrong or flat when you use it, and anything you liked in other tools such as Windy.]**

## Rules the app must keep (from the owner, not negotiable)

1. **Only sourced truths on screen.** Every number or claim is one of: an official quote with source and page, real data with a named source, a check against an official map, or our own calculation that is **labelled as ours**. No invented thresholds, no made-up scores, no predictions dressed as facts.
2. **Say what the data cannot do.** For example, the satellite rain reads lower than IMD's gauges, and we show that gap instead of rescaling it away. Any design that needs data we do not have must say so, or be dropped.
3. **Plain, short wording** in the interface. The owner reads quickly and dislikes dense text and jargon (an earlier version showed "hazard rating: Low" next to "inside the flood extent" and confused people).
4. **Light and dark themes both work, and it must be usable at phone width.**
5. Plan before code; keep `docs/PROJECT_LOG.md` updated; do not touch `master`.

## What the simulation is today (read the code, do not trust this summary blindly)

- **One event only:** Cyclone Michaung, chosen because we have the most real data for it (the 2015 and 2020 scenarios were removed).
- **Five steps**, not continuous playback: T-24h, T-6h, T-0h (the hour of peak rain, 2023-12-03 21:00 UTC), T+12h, T+36h. Play stays 6 seconds on each step; between steps the map now glides through the real hourly values over 2.5 seconds (a switch "Animate between steps" controls this and starts off if the device asks for reduced motion).
- **Rain layer:** rectangles of about 11 km (0.1 degree) coloured by the **rolling 24-hour rain total**, on IMD's own classes (Heavy 64.5, Very heavy 115.6, Extremely heavy 204.5 mm). Only **28 cells** exist, the ones that contain substations (they hold all 286 substations).
- **IMD rain gauges:** 18 stations drawn as squares with the same colours, with the satellite cell's value beside them.
- **Fixed official flood maps** (toggle): the 2015 flood extent and the 5, 10, 25, 50 and 100-year hazard maps. These do not change with time.
- **Exposed now list:** a substation is exposed when it is flood-flagged (low yard, or inside an official flood map) **and** its rain cell has Heavy or worse rain over the last 24 hours. This is a rule, not a model.
- **Cyclone track:** IMD's observed best track (34 rows), a storm marker coloured by IMD grade, landfall point, "Show whole storm".
- **"IMD at the time" card:** quotes from IMD's press releases of 3 to 6 December, tied to each step.
- **AI Directive** (Gemini words notes only, from quoted plan actions), **Substation Copilot**, relief centres, backup-substation suggestion, ward flood history from the GCC plan (see below).
- Wind readout: ERA5-Land city-wide mean (about 37 km/h at peak) against IMD's observed 56 to 68 km/h with gusts of 75 to 90 km/h; we show both and say so.

## Where everything is

**Repo:** `C:\projects\surgegrid-ai`. Vite + React 19 + TypeScript, Google Maps JS API (markers, rectangles, polylines and Data layers; the map instance is created in `src/components/Map/TnebGridMap.tsx` and is not exposed), Firebase Hosting (site `surgegrid`, project `namma-map-407ca`, live at https://surgegrid.web.app), Gemini through a keyless Cloud Function. Dev server: `npm run dev` (port 5173); open `http://localhost:5173/?scenario=MICHAUNG_2023` to go straight to the simulation. Type-check with `npx tsc --noEmit -p tsconfig.app.json` (plain `tsc -p .` checks nothing here).

**Code you will want to read first**
- `src/components/Map/TnebGridMap.tsx` (about 1,900 lines): map, layers, playback, `paintStorm` and the glide effect, exposure memo.
- `src/components/Map/DisasterCockpitBar.tsx` (step chips, play, footer), `SimulationMapPanel.tsx` (legend and switches), `ExposedSubstationsCard.tsx`, `ImdAtTheTimeCard.tsx`, `FloodExposureCard.tsx`, `ReliefCentresCard.tsx`, `rainScale.ts`, `mapIcons.ts`.
- `src/services/`: `scenarioService.ts` (steps, dwell and glide times), `scenarioGrid.ts` (`rolling24hRain`, wind), `simulationExposure.ts`, `bestTrack.ts`, `gaugePoints.ts`, `gccPlan.ts`, `officialFloodLayers.ts`, `geminiSopService.ts`.
- `src/data/officialSources.ts` (quote bank, IMD rain classes), `src/data/imdBulletins.ts` (IMD quotes, best-track rows for the five steps).

**Read for the story and decisions:** `docs/PROJECT_LOG.md` (items 44 to 60 cover the simulation; it also holds what failed and why), `docs/SOURCES.md` (every source, quote and checksum), `docs/00-feature-map.md`, `docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md`, `docs/VIDEO_SCRIPT.md` and `docs/DECK_CONTENT.md` (how the demo is told today), `README.md`.

## Data we actually have (all in `public/data/`, served as static files)

| File | What it is | Source |
|---|---|---|
| `scenarios/michaung2023.json` | Hourly city-mean rain (mm), wind (km/h), pressure and a surge field for 144 hours, hour -69 to +74 (hour 0 = 2023-12-03 21:00 UTC). Timestamps are UTC without a zone mark. | NASA GPM IMERG V07 (rain), ERA5-Land (wind, pressure) via Google Earth Engine |
| `scenarios/michaung2023_grid.json` | Per-cell hourly rain (`rainMm`), wind speed and direction for the 28 cells; `cells[i]` has `lat0`, `lng0`, `substations`. Cell size 0.1 degree. | same |
| `scenarios/michaung2023_gauges.json` | 18 IMD rain gauges with coordinates and 24-hour readings for 3, 4 and 5 Dec (to 08:30 IST), with the satellite cell for comparison. A station missing for a day read under about 70 mm or did not report. | IMD final report section 8.1; coordinates from the Tamil Nadu gauge list |
| `scenarios/michaung2023_track.json` | 34 best-track rows, 1 to 6 Dec: time (UTC), lat, lng, pressure, wind (kt), grade; plus IMD's landfall sentence (5 Dec 07:00 to 09:00 UTC near 15.7 N 80.3 E). | IMD final report Table 1 |
| `flood_maps/nrsc2015.json`, `hazard_{5,10,25,50,100}yr.json` | Official flood polygons: the 2015 flood extent (satellite) and GCC flood-hazard maps by return period. **Fixed, not time-varying.** | NRSC via OpenCity; GCC via OpenCity |
| `official_flood_layers.json` | Per substation: inside 2015 extent, hazard rating, GCC inundation zone, stagnation points within 500 m. | derived by `scripts/build_official_flood_layers.py` |
| `chennai_tneb_grid.json`, `substation_feeders/`, `feeders/`, `dtr/`, `section_boundaries.json` | The grid: 286 substations (with yard elevation, coordinates, GCC ward, feeders, health), feeders, distribution transformers, AE section boundaries. | TNEB / TANGEDCO data rebuilt in this project (see `docs/03`, `docs/04`) |
| `chennai_outage_gold_registry.json` | Historical outage records matched to substations. | scraped and enriched (see `docs/10`); the cloud copy is CORS-blocked, the app falls back to this file |
| `gcc_plan_2024.json` | Per ward: inundation registers 2015 and 2017 to 2022 (counts by depth class), the 2023 monsoon list, relief-centre capacity and facilities for all 15 zones. | GCC City Disaster Management Plan 2024, built by `scripts/build_gcc_plan_2024.py` |
| `relief_centres.json` | Relief centres by ward with officers and contacts (no coordinates). | GCC list via OpenCity |

**Source documents outside the repo** (originals, with checksums in `docs/SOURCES.md`): IMD final report `26_0580dd_Michaung Report_Final_Sir.pdf`, IMD press releases `20231203_pr_2669.pdf` to `20231206_pr_2677.pdf` (https://internal.imd.gov.in/press_release/), the Tamil Nadu rain-gauge list, the GCC 2024 plan PDF (806 pages), and the OpenCity KML files in `C:\projects\surgegrid-ai-v2\data\external` (also holds the scenario builder; not in git). Build scripts are in `scripts/`; the quote checks are `scripts/verify_imd_quotes.py` and `scripts/verify_gcc_quotes_2024.py`.

## What we do NOT have (do not design around it, or say clearly that it is missing)

- **No time-varying flood depth or extent.** Nothing tells us where water stood at each hour of Michaung. The flood maps are fixed layers. Predicting inundation from rain was considered and rejected as inventing data.
- **No Michaung-specific outage, feeder-trip or substation-status record** that we can tie to the hours of the storm. Check `chennai_outage_gold_registry.json` before assuming; I do not believe it covers those days.
- **Rain is a satellite estimate** in 11 km cells: at the 7, 16 and 10 gauge stations we could match for 3, 4 and 5 Dec it holds about one third, three quarters and three fifths of the gauge total. Wind (ERA5-Land) is a smoothed area mean, no coastal cells, no gusts.
- **No street-level rain, no radar, no storm-surge data** (the surge field in the scenario file is not observed and is not shown).
- GCC data gives street names and ward numbers, **not coordinates**; relief centres have no coordinates.
- Relief-centre capacity totals in the plan often disagree with its own tables; the app shows the table rows as printed.

## Ideas already considered (so you do not repeat them blindly)

- **Windy-style smooth rain surface** instead of squares: not built (needs a finer grid; only the 28 substation cells are in the file today, though IMERG itself covers the whole area).
- **Animated flooding spreading over streets:** rejected, no data (above).
- A per-place hourly rain chart, an accumulation window (last 3, 6, 24 hours), and Gemini-written per-area rain facts: not built.
- The map is held to Chennai (`CHENNAI_METRO_BOUNDS`) except while a hindcast plays.

## What I want back

1. **Your diagnosis in a few sentences:** why the simulation may feel unfinished, given only the data above.
2. **Two or three distinct redesign concepts** (not variations of one), each with: the story it tells in the 3-minute demo video, a text wireframe of the screen (what is on the map, what is in the side panels, what the timeline looks like), which files or data each element uses, what is new to build, and an honest effort estimate in hours.
3. **For each concept, a truth check:** every element mapped to its source, or marked "our calculation, labelled", or dropped. Flag anything that would need data we do not have.
4. **Your recommendation** and what to cut if time runs out, in order.
5. **Risks:** performance with the Google Maps API (the map instance is not exposed; Data layers and rectangles are used today), mobile width, dark mode, and anything that could break the live site.
6. Keep it short and plain. Ask me before writing any code; when I approve a concept, build it in small steps with a pause after each, update `docs/PROJECT_LOG.md`, and verify in the browser before you tell me it works.
