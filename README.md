# SurgeGrid AI
> **Chennai's Real-Time Grid & Flood Resiliency Console**

**SurgeGrid AI** is an electrical grid topology, infrastructure resilience, and disaster-operations console for the Chennai metropolitan power network (TNEB / TANGEDCO / TANTRANSCO / GCC). It is a client-side Vite + React 19 + TypeScript app on Google Maps.

---

## ⚡ Core Features (as built)

- **TNEB grid topology**: 286 substations (37 bulk EHV 230/400 kV, 89 sub-transmission 110 kV, 160 distribution 33/11 kV) and 352 Assistant Engineer (AE) section offices, from `public/data/chennai_tneb_grid.json` (v5.0.0).
- **Grid interconnections**: 583 precomputed links: 318 substation-to-substation (228 L1 verified, 90 L2 probable) and 265 substation-to-section. Links exceeding the physical distance ceilings are dropped at load time. "Isolate Electrical Circuit" hides unrelated markers and draws directional dotted lines (L2 links dashed amber).
- **Feeders and DTRs on demand**: 2,678 feeders are embedded in the substation records. Surveyed street geometry (3,335 feeders) and 65,557 distribution transformers load per circle from `public/data/feeders/` and `dtr/`, cached in IndexedDB. DTR pins appear at zoom ≥ 13.8.
- **Lifeline classification**: 257 feeders are tagged Hospital / Water & Sewage (P1), Metro-Rail-Port / Govt (P2), or Commercial-Industrial (P3), with ESF-15 restoration SLAs (6/12/24/48 h), estimated RMU counts, and restoration stage.
- **Live outage intelligence**: active TANGEDCO notices are fetched from `outage.nammamap.in/api/v2/outages`, stripped of upstream coordinates, and re-resolved locally by the *sovereign resolution gate* (Gold Registry → locality gazetteer → guarded substation/section/feeder matching → coordinate snap). See [docs/10](./docs/10-cloud-hosted-gold-registry-and-self-enrichment-pipeline.md).
- **Gold Standard Outage Registry v2.0**: 2,789 verified signatures, fetched from Google Cloud Storage with a bundled fallback.
- **Grid health scoring**: seven-archetype outage classifier with bilingual (English/Tamil) keywords, separate 90-day asset durability and live dispatch scores, live-outage score ceilings, grades A–D and a disaster risk multiplier. See [docs/08](./docs/08-grid-resiliency-scoring-architecture-and-recalibration-plan.md) and [docs/09](./docs/09-outage-reason-taxonomy-and-scoring-dictionary.md).
- **Disaster Protocol cockpit**: `Live` (with current temperature), `Alert` (65 km/h), `Severe` (> 80 km/h) and `Surge` (3.2 m) scenarios drive per-feeder pre-emptive-trip and yard-inundation status; triage filters for *Poor Stability (< 75)*, *Waterlogging Risk* and *Live Outages*.
- **Live weather**: Google Maps Platform Weather API (WeatherNext 3), keyed to the selected substation, with ~1.1 km cell caching (10-min TTL) and an offline fallback.
- **Municipal and satellite context**: GCC zone/ward, ward hotlines, GEE runoff and impervious-surface metrics, relief-shelter counts, 2015 flood benchmark, and a "copy incident SMS" dispatch button. These fields are embedded in the grid file (178 substations and 211 sections fall inside GCC wards; the rest are peri-urban CMA nodes).
- **Inspector drawer**: three tabs (*Plant & Specs*, *Circuits & Grid*, *Civic & Crisis*) for substations, and a section-office view with jurisdiction boundary polygons.
- **Performance and offline**: IndexedDB stale-while-revalidate for grid, feeder, DTR and outage data; strict Chennai map bounds; zero-POI light/dark map styles.

### Not in the app (design intent or offline tooling only)
- Gemini 3.7 Flash dispatch generation, de-energization timetables and parametric-insurance reports (docs/01 layer 4). Gemini is used only in the offline registry-enrichment scripts.
- A WeatherNext hourly forecast slider, dynamic inundation overlays and shelter tie-line routing (docs/01 layer 5).
- Consumer/MVA-weighted scoring and N-1 redundancy credit (docs/08 roadmap).

---

## 📚 Project Documentation

- [01 - Architecture & System Design](./docs/01-architecture-and-system-design.md)
- [02 - Data Dictionary & Sources](./docs/02-data-dictionary-and-sources.md)
- [03 - Chennai TNEB Power Grid Topology & Visual Field Guide](./docs/03-chennai-grid-topology-and-field-guide.md)
- [04 - Electrical Grid Linkages & Provenance](./docs/04-electrical-grid-linkages-provenance.md)
- [05 - Disaster Management & Statutory SOP Linkage](./docs/05-disaster-management-and-statutory-sop-linkage.md)
- [06 - GCC Municipal & Satellite Vulnerability Integration](./docs/06-gcc-municipal-and-satellite-vulnerability-integration.md)
- [07 - Crisis Resilience & Google Maps Platform Optimization](./docs/07-crisis-resilience-and-maps-optimization.md)
- [08 - Grid Resiliency Scoring Architecture](./docs/08-grid-resiliency-scoring-architecture-and-recalibration-plan.md)
- [09 - Outage Reason Taxonomy & Scoring Dictionary](./docs/09-outage-reason-taxonomy-and-scoring-dictionary.md)
- [10 - Cloud-Hosted Gold Registry & Self-Enrichment Pipeline](./docs/10-cloud-hosted-gold-registry-and-self-enrichment-pipeline.md)
- [V5 Ground-Truth Rebuild](./docs/v5-ground-truth-rebuild.md) · [V4 Topology Rebuild (superseded)](./docs/grid-topology-rebuild.md)
- [Data pipeline scripts](./scripts/README.md)
- [Changelog](./docs/CHANGELOG.md)

---

## 🛠️ Development

```bash
npm install        # install dependencies
npm run dev        # dev server (proxies /api/v2 to outage.nammamap.in)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

Copy `.env.example` to `.env` and set:

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `VITE_GOOGLE_MAPS_API_KEY` | Map + Weather API | Required. Restrict by HTTP referrer, since it ships in the browser bundle and is sent in Weather API URLs. |
| `VITE_GOOGLE_MAPS_MAP_ID` | Map | Optional. Enables vector map rendering; without it the embedded JSON styles are used. |
| `VITE_GEMINI_API_KEY` | none in `src/` | Listed in `.env.example` but not read by the app. |
| `VITE_PROJECT_ID` | none in `src/` | Listed in `.env.example` but not read by the app. |
