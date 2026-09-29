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
| Scenario ids, data files, start hours, milestone jumps, loader | `src/services/scenarioService.ts` |
| Three real hindcasts (IMERG rain + ERA5-Land wind) | `public/data/scenarios/michaung2023.json`, `floods2015.json`, `monsoon2020.json` |
| Cockpit bar: scenario buttons, play/pause, speed (1x to 8x), scrubber, wind/rain readouts, triage filters, AI Directive button | `src/components/Map/DisasterCockpitBar.tsx` |
| Playback loop, auto-open of the directive at milestones, debounce of Gemini calls | `TnebGridMap.tsx` |
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
| Phase rule, action table per scenario and phase, targets from grid data, Gemini wording layer, our ranking panel | `src/services/geminiSopService.ts` |
| AI Directive window (quotes, citations, notes, target chips) | `src/components/Map/GeminiSopDialog.tsx` |
| Flags, quoted actions, Gemini note for one substation | `src/services/geminiSubstationCopilotService.ts` |
| Copilot card inside the health card | `src/components/Map/SubstationHealthCard.tsx` |
| Shared browser client for Gemini (no key) | `src/services/geminiClient.ts` |
| Cloud Function proxy to Gemini (own service account) | `gemini-proxy/` (`index.js`, `README.md`) |
| Architecture write-up | `docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md` |

## Substation card (Civic & Crisis tab)
| What | File |
|---|---|
| Flood exposure: grid facts, official flood-map checks, plan quote when it applies | `src/components/Map/FloodExposureCard.tsx` |
| Official flood-layer results per substation (loader + hook) | `src/services/officialFloodLayers.ts`, `public/data/official_flood_layers.json` |
| Built by | `scripts/build_official_flood_layers.py` (reads OpenCity GCC KML files kept outside the repo) |
| Relief centres by ward, backup suggestion | `src/components/Map/ReliefCentresCard.tsx`, `src/services/reliefCentres.ts`, `public/data/relief_centres.json` |
| Built by | `scripts/build_relief_centres.py` |
| Map layer "Relief centres (by ward)" | `TnebGridMap.tsx`, `MapLayerControls.tsx` |
| GCC zone/ward card, hotlines, quoted TANGEDCO role, copy-SMS dispatch (quoted action) | `MunicipalDisasterCard.tsx`, `CopyIncidentSmsButton.tsx` |
| Drawer with the three tabs (Plant & Specs, Circuits & Grid, Civic & Crisis) | `SubstationInspectorDrawer.tsx` |

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
| Outage parser, health score (our model), A-D grade, waterlogging filter (2.0 m or our flood category) | `src/services/gridHealthService.ts` |
| Live outage notices, Gold Registry, matching | `src/services/liveOutageService.ts` |
| Live weather (Google Weather API) | `src/services/liveWeatherService.ts`, `LiveWeatherPill.tsx` |

## Other panels
`MapLayerControls.tsx` (layers), `MapSearchBox.tsx` (search), `TriageSubstationRosterCard.tsx` (triage roster), `FeederCardItem.tsx` (feeder cards with quotes), `GridJargonCheatSheet.tsx`, `mapIcons.ts`, `mapStyles.ts`.

## Offline pipeline (not part of the app)
`scripts/` rebuilds the grid, gold registry, enrichments and the two new JSON files above. The sister project `C:\projects\surgegrid-ai-v2` (not in this repo) holds the scenario builder, the official flood layers as KML, an evaluated flood-proneness pipeline and its honest test results (see `PROJECT_LOG.md`, items 15 and 26).

## Deploy
`firebase.json` and `.firebaserc`: Hosting site `surgegrid` on project `namma-map-407ca`. `/api/v2/**` goes to `outageApi` (source in another repo) and `/api/gemini` goes to `surgegridGemini` (`gemini-proxy/`). Build output is `dist/`.

## Leftovers worth knowing
- `hydroRisk` fields remain in `chennai_tneb_grid.json` but nothing on screen shows them (they came from a model that did not validate; see log item 24).
- `VITE_PROJECT_ID` in `.env.example` is unused. `src/components/Analytics/` is empty. `functions/` holds only `node_modules`.
