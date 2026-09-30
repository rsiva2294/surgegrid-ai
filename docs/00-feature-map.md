# 00 - Feature Map: Where Things Live

A locator: **feature to file**. Updated 2026-09-30 for the final state. Search by name, since line numbers drift.

## App shell
| What | File |
|---|---|
| Entry, header, light/dark toggle, grid loading, weather refresh every 10 min | `src/App.tsx` |
| The map screen (state hub for scenario, timeline, directive, selection, layers) | `src/components/Map/TnebGridMap.tsx` |

## Scenarios and timeline
| What | File |
|---|---|
| Scenario id, data file, the five timeline steps and the 6 s dwell, loader | `src/services/scenarioService.ts` |
| The Michaung hindcast: area mean (IMERG rain + ERA5-Land wind) and per-cell rain grid (28 cells of about 11 km) | `public/data/scenarios/michaung2023.json`, `michaung2023_grid.json`; grid built by `scripts/build_scenario_grids.py` |
| Cockpit bar: Live / Michaung buttons, play/pause, previous/next step, the five step chips (phase colour), wind/rain readouts, triage filters, AI Directive button | `src/components/Map/DisasterCockpitBar.tsx` |
| Step playback (6 s per step), debounce of Gemini calls | `TnebGridMap.tsx` |
| Grid loader, cell lookup, rolling 24 h rain, city wind direction | `src/services/scenarioGrid.ts` |
| IMD rain classes (with source) | `src/data/officialSources.ts`, `docs/SOURCES.md` |
| Rain colour scale and legend breaks | `src/components/Map/rainScale.ts` |
| Storm legend and switches: 24 h rain, wind, fixed flood maps | `src/components/Map/SimulationMapPanel.tsx` |
| Simplified official flood maps (2015 extent, 5 to 100-year hazard maps), drawn on demand | `public/data/flood_maps/`; built by `scripts/build_flood_polygons.py` |
| IMD at the time: quotes from IMD's press releases and final report, observed best track, distance from Chennai, per step | `src/data/imdBulletins.ts`, `src/components/Map/ImdAtTheTimeCard.tsx`; quotes checked by `scripts/verify_imd_quotes.py` |
| GCC ward records: 2015 to 2022 depth-of-inundation registers per ward, the 2023 north-east monsoon list, relief-centre capacity for verified zones | `src/services/gccPlan.ts`, `public/data/gcc_plan_2024.json`; built by `scripts/build_gcc_plan_2024.py`; shown in `FloodExposureCard.tsx` and `ReliefCentresCard.tsx` |
| Check that our GCC quotes also appear in the 2024 plan | `scripts/verify_gcc_quotes_2024.py` |
| IMD rain gauges drawn on the map (latest 24 h window before the step) with the satellite cell's value | `src/services/gaugePoints.ts`, `public/data/scenarios/michaung2023_gauges.json`; built by `scripts/build_gauge_points.py` |
| Exposed now: flood-flagged and Heavy rain or worse, per step | `src/services/simulationExposure.ts`, `src/components/Map/ExposedSubstationsCard.tsx`, red rings in `mapIcons.ts` |
| Feeder flags in a scenario (low-lying yard, operator decision, underground) | `src/components/Map/disasterUtils.ts` |

## Official plan text (the only source of plan wording)
| What | File |
|---|---|
| 37 word-for-word quotes with page numbers, IMD cyclone classes, IMD warning stages, `CHENNAI_AVERAGE_ELEVATION_M` (2.0 m) | `src/data/officialSources.ts` |
| Human-readable copy of the same list and what the plans do not say | `docs/SOURCES.md` |
| How the app uses each plan | `docs/05-official-plans-and-how-the-app-uses-them.md` |

## AI Directive and Substation Copilot
| What | File |
|---|---|
| Phase rule, action table per scenario and phase, targets from grid data, Gemini wording layer | `src/services/geminiSopService.ts` |
| AI Directive window (quotes, citations, notes, target chips) | `src/components/Map/GeminiSopDialog.tsx` |
| Flags, quoted actions, Gemini note for one substation | `src/services/geminiSubstationCopilotService.ts` |
| Copilot card inside the health card | `src/components/Map/SubstationHealthCard.tsx` |
| Shared browser client for Gemini (no key) | `src/services/geminiClient.ts` |
| Cloud Function proxy to Gemini (own service account) | `gemini-proxy/` (`index.js`, `README.md`) |
| Architecture write-up | `docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md` |

## Substation card (Overview and Respond tabs)
| What | File |
|---|---|
| Flood exposure: grid facts, official flood-map checks, plan quote when it applies | `src/components/Map/FloodExposureCard.tsx` |
| Official flood-layer results per substation (loader + hook) | `src/services/officialFloodLayers.ts`, `public/data/official_flood_layers.json` |
| Built by | `scripts/build_official_flood_layers.py` (reads OpenCity GCC KML files kept outside the repo) |
| Relief centres by ward, backup suggestion | `src/components/Map/ReliefCentresCard.tsx`, `src/services/reliefCentres.ts`, `public/data/relief_centres.json` |
| Built by | `scripts/build_relief_centres.py` |
| Map layer "Relief centres (by ward)" | `TnebGridMap.tsx`, `MapLayerControls.tsx` |
| GCC zone/ward card, hotlines, quoted TANGEDCO role, copy-SMS dispatch (quoted action) | `MunicipalDisasterCard.tsx`, `CopyIncidentSmsButton.tsx` |
| Drawer: header with a status line (health grade, live outage notice, 2015 flood extent) and three tabs: Overview (outage banner, health score and 90-day log, flood exposure, plant specs), Feeders (feeder list first, circuit isolation below), Respond (AI card, relief centres, all contacts, collapsed plan notes) | `SubstationInspectorDrawer.tsx` |
| Flood exposure card (headline, ward flood-history year strip and 2015 depth bar, three site rows, detail fold; official map checks only) and the flood plan quotes shown in Respond > Plan notes | `FloodExposureCard.tsx`, `FloodPlanNotes.tsx` |
| Substation Copilot (quoted actions, shown only while a scenario plays) | `SubstationCopilotCard.tsx` |
| Live-day AI summary (facts only, shown when no scenario plays), with its prompt facts, rule-based fallback and grounding checks | `SubstationLiveBriefCard.tsx`, `src/services/geminiLiveBriefService.ts` |
| Live weather: real Weather API readings only; a missing field is null and a failed call returns null ("Weather unavailable"), never made-up values | `src/services/liveWeatherService.ts`, `LiveWeatherPill.tsx` |

## Grid data and topology
| What | File |
|---|---|
| Load grid (memory, IndexedDB, network), lifeline classification by feeder name, prune impossible links | `src/services/tnebGridService.ts` |
| Main dataset (286 substations, 352 sections) | `public/data/chennai_tneb_grid.json` |
| Feeder street geometry and transformer points, per circle and per substation | `src/services/feederGeometryService.ts`, `public/data/feeders/`, `dtr/`, `substation_feeders/` |
| Data types | `src/types/tneb.ts` |
| GCC ward hotline directory | `src/data/gcc_ward_disaster_directory.json` |

## Health score and live layers
| What | File |
|---|---|
| Outage parser, health score (our model), A-D grade, waterlogging filter (2.0 m, 2015 flood extent, or Moderate/High official map; rule in `officialFloodLayers.ts`) | `src/services/gridHealthService.ts` |
| Live outage notices, Gold Registry, matching | `src/services/liveOutageService.ts` |
| Live weather (Google Weather API) | `src/services/liveWeatherService.ts`, `LiveWeatherPill.tsx` |

## Other panels
`MapLayerControls.tsx` (layers), `MapSearchBox.tsx` (search), `TriageSubstationRosterCard.tsx` (triage roster), `FeederCardItem.tsx` (feeder cards with quotes), `GridJargonCheatSheet.tsx`, `mapIcons.ts`, `mapStyles.ts`.

## Offline pipeline (not part of the app)
`scripts/` rebuilds the grid, gold registry, enrichments and the two new JSON files above. The sister project `C:\projects\surgegrid-ai-v2` (not in this repo) holds the scenario builder, the official flood layers as KML, an evaluated flood-proneness pipeline and its honest test results (see `PROJECT_LOG.md`, items 15 and 26).

## Deploy
`firebase.json` and `.firebaserc`: Hosting site `surgegrid` on project `namma-map-407ca`. `/api/v2/**` goes to `outageApi` (source in another repo) and `/api/gemini` goes to `surgegridGemini` (`gemini-proxy/`). Build output is `dist/`.

## Leftovers worth knowing
- The grid file is slimmed by `scripts/slim_grid_data.py` (section boundaries live in `section_boundaries.json`, loaded on demand by `src/services/sectionBoundaries.ts`; the unused `hydroRisk` fields were removed). Re-run it after regenerating the grid.
- The substation drawer, AI Directive dialog and triage roster are code-split (`React.lazy` in `TnebGridMap.tsx`) and pre-loaded when the browser is idle.
- `VITE_PROJECT_ID` in `.env.example` is unused. `src/components/Analytics/` is empty. `functions/` holds only `node_modules`.
