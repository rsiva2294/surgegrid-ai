# 00 - Feature Map: Where Things Live

A quick locator: **feature → file**. Written from a full read of `src/` on 2026-09-29. Line numbers are approximate and will drift; search by name.

## App shell
| What | File |
|---|---|
| Entry, header, light/dark toggle (saved as `sg_theme`), grid loading, weather refresh every 10 min | `src/App.tsx` |
| The whole map screen (state hub for scenario, timeline, Gemini, selection, layers) | `src/components/Map/TnebGridMap.tsx` (1,400 lines) |

## Disaster simulation
| What | File |
|---|---|
| Scenario list, milestone hours, scenario JSON loader | `src/services/scenarioService.ts` |
| Scenario data (61 hourly steps, T-48h..T+12h) | `public/data/scenarios/michaung_class_cat3.json` |
| Scenario data (120 hourly steps, hindcast, no surge) | `public/data/scenarios/floods2015.json` |
| Cockpit bar: scenario buttons, play/pause, scrubber, wind/rain/surge readouts, triage filter buttons, *AI Directive* button (draggable) | `src/components/Map/DisasterCockpitBar.tsx` |
| Timeline state, playback (2.2 s per step), auto-open of the directive at milestones | `TnebGridMap.tsx` (search `Scenario Loader`, `Playback Loop`, `Autonomous Gemini`) |
| Per-feeder trip/status rules (yard flood, wind > 80 km/h, watch > 60) | `src/components/Map/disasterUtils.ts` |
| `?scenario=` URL switch | `TnebGridMap.tsx` (`disasterScenario` initial state) |

## Gemini AI
| What | File |
|---|---|
| Tier 1: top-6 vulnerable substations scorer (`extractTopCompromisedInfra`) | `src/services/geminiSopService.ts` |
| Tier 1: built-in SOP (fixed templates + dynamic fill-in) and live Gemini call with cache | `src/services/geminiSopService.ts` (`getDirectiveForTimestep`, `fetchLiveGeminiDirective`) |
| Tier 1 UI: floating *AI Directive* window, checklist, minimize | `src/components/Map/GeminiSopDialog.tsx` |
| Tier 2: rule-based posture (`generateDeterministicTacticalAdvisory`) and live Gemini call with cache | `src/services/geminiSubstationCopilotService.ts` |
| Tier 2 UI: advisory card inside the substation health card | `src/components/Map/SubstationHealthCard.tsx` (search `Tier-2`) |
| Deep dive | `docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md` |

Both services read `VITE_GEMINI_API_KEY`, call `gemini-2.5-flash`, and fall back to the rule engine on any failure.

## Grid data and topology
| What | File |
|---|---|
| Load grid (memory → IndexedDB → network), classify feeders as lifelines, restoration SLAs, prune impossible links | `src/services/tnebGridService.ts` |
| Main dataset (286 substations, 352 sections) | `public/data/chennai_tneb_grid.json` |
| Feeder street geometry and transformer (DTR) points, per circle / per substation | `src/services/feederGeometryService.ts`, `public/data/feeders/`, `dtr/`, `substation_feeders/` |
| All data types (`TnebSubstation`, `FeederDetail`, `SubstationHydroRisk`, health profile, etc.) | `src/types/tneb.ts` |
| GCC ward hotlines and disaster directory | `src/data/gcc_ward_disaster_directory.json` |

## Health scoring and live outages
| What | File |
|---|---|
| Outage-reason parser, health score, A–D grade, risk multiplier, "at risk" (< 75) and waterlogging checks | `src/services/gridHealthService.ts` |
| Live outage fetch, Gold Registry, locality matching, outage → substation/section matching | `src/services/liveOutageService.ts` |
| Live weather (Google Weather API, 10-min cache, fallback) | `src/services/liveWeatherService.ts`, pill UI in `src/components/Map/LiveWeatherPill.tsx` |

## Map and panels
| What | File |
|---|---|
| Map layers (tiers, sections, satellite, connections) panel | `src/components/Map/MapLayerControls.tsx` |
| Search box | `src/components/Map/MapSearchBox.tsx` |
| Triage roster (poor stability / waterlogging / live outages) | `src/components/Map/TriageSubstationRosterCard.tsx` |
| Marker icons, lifeline badges | `src/components/Map/mapIcons.ts` |
| Map styles (light/dark, no POI) | `src/components/Map/mapStyles.ts` |
| Substation / section inspector drawer (tabs: *Plant & Specs*, *Circuits & Grid*, *Civic & Crisis*) | `src/components/Map/SubstationInspectorDrawer.tsx` (1,800 lines) |
| Health card (score, grade, history, Tier-2 advisory) | `src/components/Map/SubstationHealthCard.tsx` |
| Feeder list card | `src/components/Map/FeederCardItem.tsx` |
| GCC ward / GEE runoff / shelters card | `src/components/Map/MunicipalDisasterCard.tsx` |
| Copy incident SMS button | `src/components/Map/CopyIncidentSmsButton.tsx` |
| Grid jargon cheat sheet | `src/components/Map/GridJargonCheatSheet.tsx` |

## Offline data pipeline (not part of the app)
`scripts/` rebuilds the grid, gold registry, GCC/ward enrichment, substation history and Gemini-assisted outage recovery. See `scripts/README.md`. `data/` and `data-archive/` hold raw and archived inputs; they are not loaded at runtime.

## Deploy
`firebase.json` + `.firebaserc`: Hosting target `surgegrid` on project `namma-map-407ca`. `/api/v2/**` → Cloud Function `outageApi` (source in another repo). Build output: `dist/`.

## Leftovers worth knowing
- `DisasterScenario` in `DisasterCockpitBar.tsx` still lists `CYCLONE_ALERT`, `SEVERE_CYCLONE`, `EXTREME_SURGE`. The UI no longer offers them, but `disasterUtils.ts` still handles them.
- `VITE_PROJECT_ID` is in `.env.example` but unused. `src/components/Analytics/` is empty.
- `functions/` holds only `node_modules` (no function source).
