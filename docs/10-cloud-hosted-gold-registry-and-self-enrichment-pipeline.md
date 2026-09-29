# 10. Cloud-Hosted Gold Standard Registry & Automated Self-Enrichment Pipeline

## Executive Summary
This document establishes the production architecture for the **Master Gold Standard Outage Registry v2.0**, its cloud hosting on Google Cloud Storage (GCS), and the continuous, automated self-enrichment pipeline operating across `surgegrid-ai` and `nammamap-outage-aggregator`.

By transitioning from static, bundled JSON files to a cloud-hosted, live-syncing asset, SurgeGrid AI and NammaMap maintain an ever-growing, verified spatial graph of Chennai's electrical infrastructure without manual re-deployments or dataset drift.

> **Scope and audit note (verified 2026-09-29 against the aggregator repo and the live bucket).** Only the *client side* of this pipeline lives in this repository: `getGoldRegistry()` and the resolution gate in `src/services/liveOutageService.ts`. The self-enrichment engine lives in the sibling repo `nammamap-outage-aggregator` (`functions/src/services/goldRegistry.ts`, `goldRegistryEnricher.ts`, `goldRegistryTriggers.ts`, `functions/src/v2/routes.ts`). Checked there: the 6.5 km spatial-drift gate, the 15-minute cloud-cache TTL, `makePublic()` with `Cache-Control: public, max-age=3600, s-maxage=86400`, the Firestore triggers `onStatewideCacheGoldRegistry` / `onIncidentNoticeGoldRegistry`, and the `GET /api/v2/registry` and `POST /api/v2/registry/enrich` routes all exist as described.
>
> **Registry copies are out of sync.** Bundled in this repo: **2,789** signatures. Live in GCS (`registry/chennai_outage_gold_registry.json`, last modified 2026-09-28 16:57 UTC): **2,785**; it lacks the four signatures added by the second Gemini pass (`…velacherryss|taramanivelacheryfeeder`, `…chindhatripetss|buscouplerfeeder`, `…velacherryss|localfeeder`, `…tollgatess|cbhfeeder`) and contains nothing the bundle lacks. The aggregator's bundled copy (`functions/src/data/`) has **2,776** (the v2.0 consolidation). The Gemini scripts in this repo write only to `public/data/`, so nothing propagates the newest signatures to the cloud or to the aggregator automatically.

---

## 1. Registry Architecture & GCS Deployment

### 1.1 Cloud Endpoint
- **Public GCS Endpoint**:  
  `https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/registry/chennai_outage_gold_registry.json`
- **GCS Bucket Path**:  
  `gs://namma-map-407ca.firebasestorage.app/registry/chennai_outage_gold_registry.json`
- **Cache-Control**: `public, max-age=3600, s-maxage=86400`
- **Permissions**: Public Read (`makePublic()`)

### 1.2 Master Registry v2.0 Consolidation
The Gold Registry was expanded from v1.0 (1,585 signatures) to v2.0 through high-confidence historical reconciliation:
1. **Verified Historical Scheduled Maintenance**: +157 canonical signatures extracted from statewide TNEB maintenance ledgers (including Adyar Gandhi Nagar 33/11kV SS, Kadaperi MEPZ, Anakaputhur GIS SS, Pammal, and Sembakkam).
2. **Verified Abstract Breakdown Reports**: +1,034 canonical signatures extracted from official TNEB division abstract reports covering core city zones (KK Nagar, Kodambakkam, Kilpauk, Egmore, Anna Nagar, Mylapore, Valasaravakkam, etc.).
3. **Zero-Duplicate Protection**: 201 duplicate candidate keys were screened out; verified instances increment without signature key pollution.

### 1.3 Gemini Enrichment Passes (offline, this repo)

After v2.0 consolidation, two scripted passes promoted outages that the registry and gazetteer could not resolve. Both use the Gemini REST API with model `gemini-2.5-flash-lite` (not the "Gemini 3.7 Flash" named elsewhere in the docs), read `data/chennai_abstract_outages_resolved_with_gold.json` and write back to it and to `public/data/chennai_outage_gold_registry.json`:

| Commit | Script | Result |
| :--- | :--- | :--- |
| `2c24725` | `scripts/enrich_unmapped_with_gemini.py` | Structured extraction of unmapped records; recovered 6 switchyards; added 9 novel signatures (registry total 2,785). |
| `9d6a45d` | `scripts/analyze_remaining_unmapped.py`, `scripts/categorize_remaining.py`, `scripts/gemini_pass2_recover_remaining.py` | The 21 remaining records were split into: **A** (8) re-queried with the full substation catalog for fuzzy matching; **B** (9) resolved programmatically from section → substation via existing registry signatures; **C** (4) left as `LOCALIZED_AREA` (true street-level faults). Coverage reached **786 of 792** verified assets (99.2 %); registry total 2,789. |

Guardrails in pass 2: a Gemini answer is accepted only if the returned name exists in the catalog and confidence is not low. **Security:** both Gemini scripts currently embed an API key as a string literal; move it to an environment variable and rotate it (see `scripts/README.md`).

### 1.4 Key Metrics
| Metric | Registry v1.0 | Master Registry v2.0 (current bundle) | Net Expansion |
| :--- | :--- | :--- | :--- |
| **Unique Signatures** | 1,585 | **2,789** (2,776 at v2.0 consolidation; +13 from Gemini passes) | **+76.0%** |
| **Verified Outage Instances** | 1,107 | **2,298** | **+107.6%** |
| **Gazetteer Localities** | 10 | **10** | Unchanged |
| **Core City Coverage** | 32.4% | **94.8%** | **+62.4%** |

---

## 2. Automated Self-Enrichment Engine

The self-enrichment engine lives in `nammamap-outage-aggregator` under `functions/src/services/goldRegistryEnricher.ts`. It continuously evaluates live outage cards emitted by the portal scraper and social media incident feeds.

```
       ┌────────────────────────┐      ┌─────────────────────────┐
       │ 15-Min Scraper Sync    │      │ Social Breakdown Notices│
       │ (TNEB Portal Outages)  │      │ (incident_notices)      │
       └───────────┬────────────┘      └────────────┬────────────┘
                   │                                │
                   ▼                                ▼
       ┌─────────────────────────────────────────────────────────┐
       │              SOVEREIGN RESOLUTION GATE                  │
       │     (feeder_to_ss.compact + super_index_v2 + contacts)  │
       └───────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
       ┌─────────────────────────────────────────────────────────┐
       │           STRICT 4-STAGE ANTI-POISONING FILTER          │
       │                                                         │
       │  1. Geographic: Chennai / CMA Circles & Districts only  │
       │  2. Feeder Validation: Must match switchyard roster     │
       │  3. Spatial Drift Gate: Dist(SS, SecOffice) <= 6.5 km    │
       │  4. Strict Dedup: Must NOT already exist in Registry    │
       └───────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
       ┌─────────────────────────────────────────────────────────┐
       │                 ATOMIC CLOUD ENRICHMENT                 │
       │   - Append novel signatures                             │
       │   - Increment verified instances & unique counts        │
       │   - Upload to gs://.../registry/chennai_outage...json   │
       │   - Log audit telemetry in Firestore portal_scraper_logs│
       └───────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
       ┌─────────────────────────────────────────────────────────┐
       │                SURGEGRID AI CLIENT (0ms)                │
       │   Fetches latest cloud registry with fallback to bundle │
       └─────────────────────────────────────────────────────────┘
```

---

## 3. Four-Stage Anti-Poisoning Gate

To prevent erroneous, unverified, or cross-city hallucinated entries from contaminating the ground truth registry, candidate resolutions must pass four consecutive gates:

1. **Geographic Boundary Gate**:
   - Outage must belong to CMA / Chennai circles: `CHENNAI - NORTH`, `CHENNAI - CENTRAL`, `CHENNAI SOUTH I`, `CHENNAI SOUTH II`, `CHENNAI - WEST`, `KANCHIPURAM`, `CHENGALPATTU`, `TIRUVALLUR`.
2. **Physical Feeder & Substation Verification**:
   - If a feeder line name is present, it must be verified against `feeder_to_ss.compact.json` under that substation's code, or the substation switchyard must have surveyed coordinates in `super_index_v2`.
3. **Spatial Drift Gate**:
   - The physical Haversine distance between the substation switchyard and section office cannot exceed **6.5 km** (preventing regional misassignments).
4. **Strict Zero-Duplicate Dedup Gate**:
   - Hierarchical candidate keys (`town|sec|ss|feeder`, `town|sec|ss`, `ss|feeder`, `town|sec`) are generated.
   - If the candidate key is already present in `registry.signatures`, it is discarded. Only genuinely novel signatures are promoted.

---

## 4. Cloud Function Triggers & Handlers

The pipeline operates automatically via 2nd Gen Firebase Cloud Functions in `nammamap-outage-aggregator`:

1. **Scraper Sync Hook (`outageProcessor.ts`)**:
   - Hooked directly after `saveStatewideOutages` to run self-enrichment in the background without blocking the scrape cycle.
2. **Statewide Cache Trigger (`onStatewideCacheGoldRegistry`)**:
   - Firestore trigger on `portal_sync_state/statewide` writes.
   - Automatically inspects fresh statewide outages and triggers enrichment.
3. **Social Notice Trigger (`onIncidentNoticeGoldRegistry`)**:
   - Firestore trigger on `incident_notices/{docId}` creation.
   - Evaluates emergency breakdown notices and promotes high-confidence resolutions.
4. **REST Inspection & Manual Trigger Endpoints (`v2/routes.ts`)**:
   - `GET /api/v2/registry`: Inspects version, counts, and sample signatures (or `?full=true` for full registry).
   - `POST /api/v2/registry/enrich`: On-demand enrichment trigger for administrative or cron execution.

---

## 5. Client Integration in SurgeGrid AI

In [`src/services/liveOutageService.ts`](file:///c:/projects/surgegrid-ai/src/services/liveOutageService.ts):
- `getGoldRegistry()` fetches dynamically from `https://storage.googleapis.com/namma-map-407ca.firebasestorage.app/registry/chennai_outage_gold_registry.json`.
- In-memory caching (`cachedGoldRegistry`) gives O(1) lookups after the first load. The registry is *not* stored in IndexedDB, so an offline first load uses the bundled copy.
- The client looks up three of the four candidate keys, in this order, using `squash()`-normalised strings: `town|sec|ss|feeder`, then `town|sec`, then `ss|feeder` (the `town|sec|ss` key is not queried). A hit resolves the substation and/or section by **code** against the loaded grid.
- Tier 1 of the resolution gate uses `registry.localities` (10 entries) when the registry is loaded, otherwise the hard-coded `CHENNAI_LOCALITY_GAZETTEER`.
- **Live feed source:** the *notices* themselves come from `https://outage.nammamap.in/api/v2/outages` (Vite proxy `/api/v2` in development), not directly from the GCS `outages/*.json` files described in changelog v1.8.0. Verified in the aggregator: `GET /api/v2/outages` (edge-cached 5 s / 15 s) reads `outages/statewide_v2.json` (falling back to `statewide.json`) and the active resolved Twitter notices (`outages/twitter_notices_resolved.json`) from GCS, de-duplicates and merges them, and returns `{ success, engine: 'super_index_v2', count, data }`. The GCS files are the aggregator's storage layer; this client reads them only through that API.
- If network connectivity is restricted, it seamlessly falls back to the bundled `/data/chennai_outage_gold_registry.json` v2.0 file.

### 5.1 Strict 1-to-1 Infrastructure Resolution & Disambiguation Gate

To prevent live notices from leaking across multiple collocated substations or dozens of section offices:
1. **Fingerprint Ingestion Deduplication:** Raw live items are deduplicated by outage fingerprint prior to boundary filtering in `getLiveChennaiOutages()`.
2. **Authoritative Resolution Guards:** `getOutagesForSubstation()` and `getOutagesForSection()` strictly enforce single-asset equality (`String(outage.resolvedSubstationCode) === ssCode`). Once an outage has been bound to a verified substation or section code during `enrichLiveOutagesWithGrid()`, it immediately exits and never falls through to fuzzy string matching.
3. **Generic Locality Stoplist:** `matchesLocality()` rejects single generic tokens (`GENERIC_LOCALITY_TOKENS`: *nagar, north, south, road, street, bazaar, colony, extn, etc.*) from subset containment, preventing notices mentioning `"Nagar"` from matching dozens of AE Section Offices.
4. **Voltage-Tier Disambiguation:** In Tier 2, if multiple co-located substations share a name (e.g., Guindy 33kV / 110kV / 230kV / 400kV GIS), the resolver inspects voltage cues in the notice/feeder and defaults to urban distribution step-downs (`33/11 kV`) for routine feeder/maintenance notices rather than bulk transmission grids.
