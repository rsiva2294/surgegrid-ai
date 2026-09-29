# 01 - Architecture & System Design

*Rewritten 2026-09-30 to describe what is built. The earlier version described a larger design (a live Earth Engine pipeline, WeatherNext forecast slider, parametric-insurance reports, inundation contours, shelter tie-line routing) that was never implemented, plus risk formulas with invented thresholds. Those were removed.*

## 1. What the app is

A control-room console for Chennai's power network during heavy rain. It replays three real rain events hour by hour, shows which substations, feeders and relief-centre wards are exposed, and lists the actions the official disaster plans call for, with Gemini adding short notes. Principle: every rule, warning and action is either an official quote, real data with a source, a map check against an official layer, or our own calculation labelled as ours (see the README and [SOURCES.md](./SOURCES.md)).

## 2. Data flow

```
 REAL DATA (offline builds)                          APP (browser)                                   GOOGLE CLOUD
 ------------------------------------------          ---------------------------------------------   ---------------------------
 NASA IMERG rain + ERA5-Land wind (Earth Engine)     public/data/scenarios/*.json (3 hindcasts)      Cloud Function surgegridGemini
 TNEB grid, feeders, DTRs, outage history            public/data/chennai_tneb_grid.json, feeders/,      (keyless: service account
 OpenCity GCC flood layers                             dtr/, substation_feeders/                       calls Gemini 2.5 Flash on the
   -> scripts/build_official_flood_layers.py         public/data/official_flood_layers.json             Gemini Enterprise Agent
 GCC relief-centre list + ward polygons              public/data/relief_centres.json                    Platform, formerly Vertex AI)
   -> scripts/build_relief_centres.py                src/data/officialSources.ts (37 plan quotes)
 Live: TANGEDCO notices, Google Weather              outageService, weatherService  ---------------> /api/gemini  (wording only)
```

## 3. Layers in the code

| Layer | What it does | Main files |
|---|---|---|
| Scenario engine | Loads a hindcast, plays it hour by hour, opens the AI Directive at milestones | `scenarioService.ts`, `TnebGridMap.tsx`, `DisasterCockpitBar.tsx` |
| Official quote bank | The only source of plan text shown to users | `src/data/officialSources.ts`, `docs/SOURCES.md` |
| SOP (city-wide) | Chooses the official actions for the phase and the substations they name; Gemini words a note | `geminiSopService.ts`, `GeminiSopDialog.tsx` |
| Substation Copilot | Flags from our data plus quoted actions for one substation | `geminiSubstationCopilotService.ts`, `SubstationHealthCard.tsx` |
| Flood exposure | Elevation, official flood-map checks, plan quote when it applies | `FloodExposureCard.tsx`, `officialFloodLayers.ts` |
| Relief centres | GCC centres by ward, backup suggestion, map layer | `ReliefCentresCard.tsx`, `reliefCentres.ts`, `TnebGridMap.tsx` |
| Grid model | Substations, feeders, DTRs, links, lifeline classification by feeder name | `tnebGridService.ts`, `feederGeometryService.ts`, `types/tneb.ts` |
| Live layers | Outage notices matched to substations; live weather | `liveOutageService.ts`, `liveWeatherService.ts` |
| Health score (our model) | Grades A-D from 90-day history and live notices | `gridHealthService.ts` (docs 08, 09) |
| Gemini access | One shared browser client; the proxy holds the identity | `geminiClient.ts`, `gemini-proxy/` |

## 4. How Gemini is used

Gemini 2.5 Flash chooses target names from lists we send and writes one short note. It never writes or cites the plan quotes, and a note that contains a number not present in the prompt is discarded. With Gemini unavailable the same quoted actions appear with rule-based notes. Details in [DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md](./DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md).

## 5. Offline resilience

The grid, feeders, transformers and outage data are cached in IndexedDB (stale-while-revalidate). If the Gemini proxy, the weather API or the outage feed is unreachable, the app falls back to rule-based text, a labelled fallback for weather, and the cached outage data.

## 6. What is not built

Storm surge and cyclone-track modelling; a trained flood forecast; road exposure; Tamil text; image input to Gemini; other cities. The sister project `surgegrid-ai-v2` holds an evaluated flood-proneness pipeline whose honest results (good match to the city's 2020 hotspots, poor match to the 2015 satellite map) are the reason the app shows official-map checks instead of model flood depths.
