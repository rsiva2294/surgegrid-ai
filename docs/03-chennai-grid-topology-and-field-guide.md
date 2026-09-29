# 03 - Chennai TNEB Power Grid Topology & Visual Field Guide

This document explains the physical electrical architecture, transmission hierarchy, and maintenance workflow of the Chennai power grid (TANGEDCO / TANTRANSCO) as represented in the **SurgeGrid AI** cockpit.

---

## 1. The Electrical Hierarchy (From Generation to Consumer Tap)

Electricity behaves like a high-pressure water system. Power generated at distant thermal, nuclear, and renewable plants travels at ultra-high voltages to minimize transmission losses across hundreds of kilometers. It is then stepped down in sequential stages before safely entering homes and businesses:

```
 [ Long-Distance Power Plants / State Grid ]
                     │
                     ▼
 🟢 1. BULK EHV SUBSTATIONS (400 kV / 230 kV)        ← The Super-Highways
                     │  (High-voltage trunk lines)
                     ▼
 🟡 2. SUB-TRANSMISSION STATIONS (110 kV)           ← The City Ring Roads
                     │  (33 kV sub-arterial cables)
                     ▼
 🔵 3. DISTRIBUTION SUBSTATIONS (33 / 11 kV)        ← The Neighborhood Hubs
                     │
    ┌────────────────┴────────────────┐
    ▼                                 ▼
 ⚡ 4. 11 kV FEEDERS               ⚡ 11 kV FEEDERS  ← The Main Street Delivery Vans
    │                                 │
    ▼                                 ▼
 🛢️ 5. DTRs (Street Transformers)  🛢️ DTRs          ← The Street-Corner Reducers
    │ (Steps 11,000V down to 240V)    │
    ▼                                 ▼
 🏠 6. CONSUMERS (Your Home)       🏢 Shops & Flats  ← The Kitchen Tap
```

---

## 2. Real-Life Infrastructure Breakdown

### Stage 1: Bulk Extra High Voltage (EHV) Substations (400 kV & 230 kV)
*Represented in SurgeGrid AI by Pink Markers (e.g. Korattur, Alamathy, Sriperumbudur, Manali)*

![Bulk EHV Substation (400 kV / 230 kV)](./images/01_bulk_ehv_substation_400kv.jpg)

- **Physical Characteristics**: Sprawling outdoor switchyards situated on the periphery of the Chennai metropolitan area. They feature massive lattice steel gantry towers, heavy aluminium busbars, SF6 gas circuit breakers, and enormous oil-cooled step-down transformers.
- **Key Engineering Components**:
  - **Tall Ribbed Porcelain Bushings**: High-creepage insulators standing atop transformers that prevent 400,000-volt arcs from jumping to grounded metal.
  - **Lightning Arresters**: Tall surge arresters placed at incoming gantry towers to divert lightning strikes directly to ground.
- **Function**: Bulk transmission injection gateways that receive massive blocks of power (hundreds of megawatts) from the National and State grids, stepping it down to 110 kV and 33 kV.

---

### Stage 2: Sub-Transmission Hubs (110 kV)
*Represented in SurgeGrid AI by Amber Markers (e.g. Guindy, Koyambedu, Anna Nagar, Mylapore)*

![Sub-Transmission Substation (110 kV)](./images/02_subtransmission_substation_110kv.jpg)

- **Physical Characteristics**: Medium-sized switchyards located inside Chennai's arterial traffic corridors and ring roads.
- **Key Engineering Components**:
  - **110/33 kV and 110/11 kV Power Transformers**: Mounted over deep gravel soak pits designed to contain transformer oil in the event of a fire or leak.
  - **Capacitor Banks**: Rack-mounted capacitor units that provide reactive power compensation and stabilize voltage across city districts during peak AC usage.
- **Function**: Takes 110,000-volt power from bulk stations and routes it into regional city hubs, stepping it down to 33 kV or directly to 11 kV.

---

### Stage 3: Distribution Substations (33 / 11 kV)
*Represented in SurgeGrid AI by Cyan Markers (e.g. Kilpauk 33kV, T. Nagar 33kV, Triplicane 33kV)*

![Distribution Substation (33/11 kV)](./images/03_distribution_substation_33_11kv.jpg)

- **Physical Characteristics**: The neighborhood substations located right inside residential and commercial zones, featuring a gated perimeter wall, outdoor transformer bays, and an indoor control room building.
- **Key Engineering Components**:
  - **Outdoor 33/11 kV Step-Down Transformers**: Convert incoming 33,000 Volts to 11,000 Volts (11 kV).
  - **Control Room Switchgear**: Houses indoor vacuum circuit breaker (VCB) panels. Each breaker controls one outgoing 11 kV feeder line.
- **Function**: The primary stepping stone into streets and wards. When a substation is de-energized during flooding or cyclone landfall, power cuts cascade across all feeders originating from this yard.

---

### Stage 4: 11 kV Feeder Lines
*Surfaced in the SurgeGrid AI Substation Inspector Drawer*

![11 kV Overhead Feeder Lines](./images/04_overhead_11kv_feeder_lines.jpg)

- **Physical Characteristics**: Overhead 3-phase conductors on tall reinforced concrete utility poles, or underground cross-linked polyethylene (XLPE) power cables running beneath city sidewalks.
- **Key Engineering Components**:
  - **Top Cross-Arm**: Holds the three primary medium-voltage phase lines (R, Y, B) mounted on brown or grey porcelain pin/disc insulators.
  - **Middle/Lower Cables**: Carry the low-tension (240V/415V) domestic distribution lines and street lighting cables.
- **Function**: Each feeder has a dedicated geographical name (e.g. *"TVS Feeder"*, *"Thirumangalam Feeder"*). A single feeder typically delivers power to 20 to 80 street-level distribution transformers.

---

### Stage 5: Street DTRs (Distribution Transformers / DTS)
*Displayed as "DTRs (DTS)" telemetry in the SurgeGrid AI Inspector Drawer*

![Street DTR Distribution Transformer](./images/05_street_dtr_distribution_transformer.jpg)

- **Physical Characteristics**: Cylindrical or rectangular oil-cooled transformers mounted on an H-frame between two concrete poles at street intersections, or mounted on street-side concrete plinths.
- **Key Engineering Components**:
  - **Drop-Out (DO) Fuses**: Angle-mounted fuse carriers at the top of the pole. When a short circuit or overload occurs, the internal fuse wire vaporizes with a loud pop, allowing the carrier to drop open and physically disconnect the transformer.
  - **Feeder Pillar Box**: A ground-level sheet-metal enclosure with a "Danger 11000V" warning sign containing low-voltage busbars and fuse units feeding separate streets.
- **Function**: Converts dangerous **11,000 Volts down to safe domestic 240 Volts (single-phase) and 415 Volts (three-phase)** for 50 to 250 consumer meters on that block.

---

### Stage 6: Consumer Service Connection (Home Meter Board)
*Displayed as "Consumers" telemetry in the SurgeGrid AI Inspector Drawer*

![Consumer Service Connection & Meter Board](./images/06_consumer_service_meter_board.jpg)

- **Physical Characteristics**: An external wall or ground-floor meter board in residential houses and apartments.
- **Key Engineering Components**:
  - **Service Drop Cable**: Weatherproof insulated cable running from the nearest street pole into the building.
  - **Digital Electronic kWh Energy Meters**: Measure cumulative energy usage in kilowatt-hours, equipped with pulse LEDs and tamper seals.
  - **Miniature Circuit Breakers (MCB / RCCB)**: Protect individual home circuits against short circuits and earth leakage before power reaches wall outlets.

---

## 3. Human Operations: AE Section Offices & Fuse of Call (FOC) Depots

### Assistant Engineer (AE) Section Offices
- **Administrative Headquarters**: Chennai's electrical grid is partitioned into **352 official jurisdictional sections**. Each section is headed by an Assistant Engineer (AE) from TANGEDCO.
- **Responsibilities**: New electricity connections, tariff adjustments, revenue collection, preventive line maintenance, and coordinating substation shut-downs.

### Fuse of Call (FOC) Depots
- **Field Operations Muster Room**: The 24x7 emergency response depot where linemen, wiremen, and inspectors report in rotating shifts.
- **Name Origin**: Named after the drop-out fuses on street transformers—when a resident calls to report a blown transformer fuse, it is a *"Fuse Call"*.
- **Co-location**: In over 90% of Chennai sections, the **Fuse Call Office is located in the exact same building/compound as the AE Section Office**. Linemen dispatch directly from here on service vehicles and two-wheelers carrying replacement fuse wire, bamboo ladders, and testing gear.

---

## 4. Cockpit Map Architecture & Performance Features

1. **Topological Precomputation**: All 286 substations, 352 AE Section Offices, 5,192,167 registered consumers, and 583 precomputed links (318 substation-to-substation, of which 228 L1 verified and 90 L2 probable, plus 265 substation-to-section) are pre-indexed into `public/data/chennai_tneb_grid.json` (3.2 MB), enabling $O(1)$ instantaneous lookups on click with zero backend network latency.
2. **On-Demand Section Office Jurisdictional Boundaries**: GeoJSON boundary polygons extracted from official TNEB district boundaries are embedded directly into section records, rendering a warm translucent amber polygon with auto-framing bounds when an AE Section is selected.
3. **Pure Zero-POI Vector Canvas**: Custom light and dark styles strip out all commercial, retail, transit, and landmark points of interest, presenting a distraction-free electrical grid canvas.
4. **Targeting Beacon Halo Ring**: An animated high-contrast dual-stroke halo ring (`selectionHaloRef`) projects around selected nodes for instant visual clarity across both light and dark backgrounds.
5. **Unified Left-Hand Control Column**: Search and the collapsible **TNEB Grid Layers** control are co-located in the top-left stack, leaving the entire right side clear for the comprehensive Substation & Section Inspector Drawer without visual overlap.
6. **Rendering Performance**: Substation and section markers are created once and only have their icon/visibility toggled (no recreation on selection); hidden markers are detached from the map; feeder lines use a single `google.maps.Data` layer. Note that the floating panels still use Tailwind `backdrop-blur` classes, so the earlier claim that GPU blur filters were removed no longer holds.
7. **On-Demand Feeder Corridors & DTR Transformers**: When a feeder is selected (`View on Map`), its surveyed street geometry is drawn as a solid, fully opaque line (V5 removed the blurred glow polylines), with a dotted takeoff tie from the substation when the line starts 15–500 m outside the fence. DTR markers attach at zoom ≥ 13.8; clicking one shows its asset code, kVA, step-down (11,000 V → 240 V / 415 V) and metered consumers. The camera auto-frames the feeder extent.
8. **Critical Lifeline Feeder Classification & Disaster Priority Badging**: During cyclonic storms or grid stress, certain 11kV lines must remain energized to sustain life and civil order. The cockpit classifies 257 lifeline feeders across Chennai (`classifyFeeder()` in `tnebGridService.ts`, keyword-matched on feeder names):
   - 🏥 **Hospitals (P1 Non-Cut)**: Government General Hospitals, Medical Colleges, Stanley, Kilpauk Medical, and major private trauma centers. Glows in **Rose / Red** with `P1 NON-CUT` pulse badge.
   - 🚰 **Water Works & Sewage (P1 Non-Cut)**: CMWSSB water headworks, raw water treatment plants (Kilpauk, Chembarambakkam), and drainage pumping stations that prevent citywide urban inundation. Glows in **Cyan / Sky Blue**.
   - 🚇 **Mass Transit (P2 Essential)**: CMRL Chennai Metro Rail traction substations, Southern Railway suburban traction, and Chennai Port Trust. Glows in **Violet / Purple**.
   - 🏛️ **Government & Emergency HQ (P2 Essential)**: Fort St. George Secretariat, Madras High Court, Police Commissionerate, Central Prison, and Fire & Rescue stations. Glows in **Amber / Gold**.
   - **Dedicated vs. Shared Line Transparency**: Clearly indicates whether an institution has a **Dedicated Service (HT)** feed (exclusive link) or is on a **Shared Distribution Line** (powers both the institution and the surrounding residential neighborhood).
   - **Quick-Filter Toggle**: The *Circuits & Grid* tab has an `All` / `🚨 Lifelines (N)` filter to isolate vital feeders for emergency dispatchers.
9. **Full-Height Inspector Drawer with Three Tabs**: A right-hand drawer (`top-4 bottom-4`, 460 px on desktop; bottom sheet on mobile) with tabs `Plant & Specs`, `Circuits & Grid (N)` and `Civic & Crisis`. Tab 2 combines the *Isolate Electrical Circuit* toggle, an expandable linked-substations list and the sorted feeder roster with name filter and a jargon cheat sheet. (An earlier 860 px dual-column *Split View* no longer exists in the code.)
10. **Feeder Cards**: each `FeederCardItem` shows voltage, the UG/OH badge, a lifeline badge with a SurgeGrid priority class (classified from the feeder name), consumers, transformers and length. During a scenario it adds a fact-only flag with an official quote (low-lying yard, operator decision, underground). The restoration-hour, restoration-stage and RMU badges described in earlier versions were removed because the official plans do not contain them.
11. **Substation Ground Elevation & Flood / Surge Risk Profiling (P0)**: Ground elevation above Mean Sea Level (MSL) sourced from Google Earth Engine SRTM DEM is integrated into every substation record. Substation headers dynamically flag low-elevation yards (`⛰️ 2.1m MSL • 🌊 Surge Risk`), while the Info tab and Split View detail distance to coast, composite climate vulnerability scores, and field-ready standard operating procedures (SOPs).
12. **Feeder Breakdown Fragility & Trip History Badging (P0)**: Feeder cards display a trip-frequency badge (e.g. `⚡ 4 Trips`, with a hoverable date list) when the feeder record carries `outageCount` / `outageDates`; the substation health card separately shows the 90-day incident log, pinpointing chronic trip hotspots before storm landfall.
13. **V5 Confidence-Aware Grid Link Visuals**: `showConnections` draws each substation link as a dotted line with a directional arrow (incoming links point toward the selected substation). `L1_VERIFIED` links use the target's voltage-tier color; `L2_PROBABLE` links are thinner, lower-opacity and amber (`#f59e0b`). Confidence tier and verification method are carried on each `ConnectedGridNode`, but the linked-substations list shows only name, voltage and distance (no L1/L2 text badge).
14. **Operational Topology Scoping Disclaimer**: Not present in the current UI. The `scopingRole` field (`PHYSICAL_TOPOLOGY_ONLY` / `ADVISORY_ONLY`) exists in the data, and the disclaimer text is documented in doc 04, but no banner is rendered. Treat mapped lines as physical GIS paths, not confirmed energized flow; live switching state requires SCADA.
15. **Deterministic 5-Tier Feeder Sorting & Sub-Transmission Trunk Differentiation**: Both the Substation Inspector Drawer and Split View Cockpit organize outgoing feeder rosters by operational load-shedding and electrical priority:
    - **Tier 1 (P1 Critical Lifelines)**: Water headworks, sewage pumping stations (`P1 NON-CUT`), and major trauma hospitals.
    - **Tier 2 (P2 Essential Infrastructure)**: Metro Rail, suburban transit, and Government / Police HQ lines (`P2 ESSENTIAL`).
    - **Tier 3 (33 kV Sub-Transmission Trunks)**: Inter-substation bulk step-down feeds supplying downstream distribution yards, badged `[⚡ 33 kV Sub-Transmission Trunk] [INTER-SS]`. These are strictly separated from single-consumer dedicated taps (`isDedicated`).
    - **Tier 4 (P3 Commercial & Dedicated Industrial HT)**: Dedicated factory and industrial customer services badged with `[🏭 Dedicated HT Commercial/Industrial] [P3 COMMERCIAL]`.
    - **Tier 5 (Local Distribution Feeders)**: Residential and commercial 11 kV neighborhood lines, ordered strictly descending by registered consumer population served.
    - Sort order in `SubstationInspectorDrawer.tsx`: priority rank, then voltage (descending), then consumers, then DTR count, then name. The list header shows `Distribution Circuits (N)`; there is no separate sort-indicator label.

