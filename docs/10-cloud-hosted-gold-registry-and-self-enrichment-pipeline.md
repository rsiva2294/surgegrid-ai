# 10. Cloud-Hosted Gold Standard Registry & Automated Self-Enrichment Pipeline

## Executive Summary
This document establishes the production architecture for the **Master Gold Standard Outage Registry v2.0**, its cloud hosting on Google Cloud Storage (GCS), and the continuous, automated self-enrichment pipeline operating across `surgegrid-ai` and `nammamap-outage-aggregator`.

By transitioning from static, bundled JSON files to a cloud-hosted, live-syncing asset, SurgeGrid AI and NammaMap maintain an ever-growing, verified spatial graph of Chennai's electrical infrastructure without manual re-deployments or dataset drift.

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

### 1.3 Key Metrics
| Metric | Registry v1.0 | Master Registry v2.0 | Net Expansion |
| :--- | :--- | :--- | :--- |
| **Unique Signatures** | 1,585 | **2,776** | **+75.1%** |
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
- In-memory caching ensures $O(1)$ zero-latency lookups on subsequent calls.
- If network connectivity is restricted, it seamlessly falls back to the bundled `/data/chennai_outage_gold_registry.json` v2.0 file.
