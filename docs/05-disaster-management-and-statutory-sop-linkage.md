# 05 - Disaster Management & Statutory SOP Linkage

**Document Version:** 1.0.0  
**Effective Date:** September 2026  
**Statutory Grounding:** 
1. Tamil Nadu State Disaster Management Plan 2023 (TNSDMA SDMP 2023 — Chapters 5 & 8: ESF 14 & ESF 15)
2. TANGEDCO Disaster Management Manual & Standing Operating Procedures (Post-Vardah & Post-2015 Floods Edition)

---

## 1. Executive Context & Regulatory Provenance

During catastrophic coastal cyclones (**Cyclone Vardah 2016**, **Cyclone Michaung 2023**) and extreme pluvial floods (**Chennai Floods 2015**), electrical grid de-energization in Chennai did **not** occur predominantly due to spontaneous conductor snapping. Instead, TANGEDCO grid operators executed **statutory pre-emptive de-energizations** to preserve human life and protect critical substation assets from catastrophic insulation flashover.

SurgeGrid AI incorporates these statutory operating mandates directly into the grid simulation engine, bridging the gap between theoretical electrical topology and real-world TANGEDCO control room operations.

```mermaid
flowchart TD
    subgraph Regulatory_Mandates["Statutory Mandates & Ground Truth"]
        R1["TNSDMA 2023 SDMP<br/>§5.6 Public Safety Mandate"] --> M1["Wind Speed ≥ 80 km/h<br/>Mandatory OH De-Energization"]
        R2["TANGEDCO Flood Manual<br/>Post-2015 Benchmark"] --> M2["Water Depth ≥ Yard Plinth (1.5m)<br/>Mandatory Switchyard De-Energization"]
        R3["TNSDMA Chapter 8<br/>ESF 15: Power & Energy"] --> M3["Statutory Restoration SLAs<br/>P1: ≤6h | P2/Trunk: ≤12h | P3: ≤24h | LT: ≤48h"]
        R4["Post-Vardah Modernization<br/>13,810 Automated RMUs"] --> M4["Underground Ring Loop Sectionalizing<br/>Isolate Flooded Spans • Keep Rings Live"]
    end

    subgraph SurgeGrid_Engine["SurgeGrid AI Resilience Cockpit"]
        M1 --> E1["Pre-Emptive Trip Matrix<br/>(Overhead Lines Isolated • UG Cables Live)"]
        M2 --> E2["Switchyard Inundation Sentinel<br/>(Mobile Dewatering Pump Mandate)"]
        M3 --> E3["ESF 15 Statutory SLA Badges<br/>(6h / 12h / 24h / 48h Recovery Targets)"]
        M4 --> E4["RMU Loop Distribution Badges<br/>(Sectionalized Micro-Loop Visualization)"]
    end
```

---

## 2. Statutory Pre-Emptive De-Energization Matrix

Under the **TNSDMA 2023 State Plan (Section 5.6)** and **TANGEDCO Cyclone SOPs**, the grid de-energization decision tree is enforced as follows:

| Trigger Condition | Threshold | Statutory Action | Affected Infrastructure | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Cyclone Watch Alert** | Wind $\ge 65\text{ km/h}$ | Pre-Disaster Standby | Overhead Radial Lines & Tree Corridors | Lineman field foot patrol activated; tree-trimming gangs stationed at GCC Ripon Control Room. |
| **Severe Cyclonic Landfall** | Wind $\ge 80\text{ km/h}$ | **Statutory Pre-Emptive Trip** | **All Overhead (OH) & Mixed Feeders** | **Public Electrocution Prevention:** High winds rip tree limbs and snap overhead conductors. Charging standing water on roads causes mass fatalities. |
| **Underground Network Exemption** | Wind $\ge 80\text{ km/h}$ | **Continuously Energized** | **Pure Underground (UG) HT Cables** | Subsurface cables are immune to aerodynamic gust tearing, maintaining lifeline hospital and pumping station supply. |
| **TNSDMA Coastal Surge Breach** | Storm Surge $\ge 3.0\text{ m MSL}$ | **Substation Yard Isolation** | **Coastal / River Basin Substations** | Substation equipment plinth ($1.5\text{ m}$) submerged. De-energized to prevent transformer terminal flashovers. Mobile high-capacity diesel pumps required before restart. |

---

## 3. The TANGEDCO 5-Stage Sequential Restoration Protocol

Restoring an urban electrical grid after cyclonic blackout cannot occur arbitrarily without causing cold-load pick-up surges and secondary switchgear explosions. TANGEDCO enforces a strict 5-stage sequential restoration sequence:

```mermaid
graph TD
    S1["Stage 1: Bulk Transmission Stabilization (400 / 230 kV)<br/>SLDC Chennai synchronizes interstate lines & thermal/nuclear injection"] --> S2
    S2["Stage 2: Sub-Transmission Hub Energization (110 / 33 kV)<br/>Switchyard dewatering, busbar insulation test, step-down energization"] --> S3
    S3["Stage 3: 33 kV Trunks & P1 Express Lifelines<br/>Inter-substation subtransmission lines & dedicated hospital/water pumping feeds"] --> S4
    S4["Stage 4: Automated RMU Priority Loops<br/>Metro Rail, State Govt HQ, and industrial/commercial HT ring loops"] --> S5
    S5["Stage 5: DTR Megger Testing & Residential LT Distribution<br/>Physical lineman foot-patrol clearance certificate (PTW) & street charging"]
```

### Stage SLA & Classification Reference

1. **Stage 1 (EHT Grid Stabilization)**: Target $\le 2\text{ hours}$. Re-establishes 400kV Alamathy, Sriperumbudur, and 230kV Tondiarpet/Mylapore/Guindy bulk nodes.
2. **Stage 2 (Substation Switchyard Recovery)**: Target $\le 4\text{ hours}$. Mobile de-watering pumps drain inundated yards (1.8m historical 2015 flood benchmark).
3. **Stage 3 (Sub-Transmission Trunks & Critical Lifelines)**:
   - **ESF 15 Statutory SLA: $\le 6\text{ hours}$** for P1 Critical Lifelines (e.g., Kilpauk Water Works, Rajiv Gandhi GH, Stanley Hospital).
   - **ESF 15 Statutory SLA: $\le 12\text{ hours}$** for 33 kV sub-transmission interconnect trunks feeding downstream distribution yards.
4. **Stage 4 (Automated RMU Priority Loops)**:
   - **ESF 15 Statutory SLA: $\le 12\text{ hours}$** for P2 Essential (Chennai Metro Rail CMRL, Southern Railway, Secretariat).
   - **ESF 15 Statutory SLA: $\le 24\text{ hours}$** for P3 Commercial / Industrial HT services.
5. **Stage 5 (Last-Mile LT Distribution & DTRs)**:
   - **ESF 15 Statutory SLA: $\le 48\text{ hours}$** for general residential low-tension consumers. Requires Lineman foot-patrol clearance (Permit-To-Work / PTW) before re-closing circuit breakers.

---

## 4. Post-Disaster Grid Modernization: The 13,810 RMU Network

Following **Cyclone Vardah (2016)**, which collapsed Chennai's grid demand from $2,500\text{ MW}$ to $0\text{ MW}$ in four hours, TANGEDCO converted over $2,000\text{ km}$ of HT lines into underground cables and installed **13,810 automated 11 kV Ring Main Units (RMUs)** across the GCC metropolitan area.

### Operational Benefit of RMU Sectionalizing in SurgeGrid AI:
- Traditional radial overhead lines trip end-to-end if a single tree branch contacts the wire.
- With automated RMUs on UG/Mixed feeders, operators isolate **only** the waterlogged ring segment while keeping the remainder of the loop energized.
- SurgeGrid AI displays the computed RMU count on every feeder card (e.g. `[🔄 6 RMU Loops]`), reflecting this micro-loop sectionalizing capability.

---

## 5. UI/UX Cockpit Implementation

The SurgeGrid AI application reflects these operational realities across two synchronized surfaces:

1. **Top Center Disaster Protocol Cockpit Bar:**
   - Real-time scenario switcher:
     - `🌤️ Normal Grid`: Standard operating conditions.
     - `🟡 Cyclone Alert`: Standby alert at $65\text{ km/h}$.
     - `🌀 Severe Cyclone (>80km/h)`: Executes TNSDMA §5.6 statutory pre-emptive trip on overhead lines; underground cables remain live.
     - `🌊 Extreme Surge (3.2m)`: Triggers coastal storm surge flooding sentinel exceeding the 3.0m TNSDMA threshold.
2. **Feeder Inspection Cards:**
   - **Statutory ESF 15 SLA Badge:** `⏱️ ESF 15: 6h SLA` (P1) vs. `12h SLA` (P2/Trunk) vs. `24h SLA` (HT) vs. `48h SLA` (LT).
   - **RMU Loop Sectionalizing Badge:** `🔄 {N} RMU Loops`.
   - **Restoration Stage Badge:** `Stage 3: Sub-Transmission Trunk` or `Stage 4: Automated RMU`.
   - **Disaster Status Callout:** Displays clear statutory justification (e.g., `⚠️ PRE-EMPTIVE TRIP (WIND) • TNSDMA Mandate §5.6: Wind > 80 km/h • Public Electrocution Prevention`).
3. **Substation Risk Profile Panel:**
   - Historical **2015 Flood Submersion Benchmark** ($1.8\text{ m}$ peak submersion).
   - TNEB Equipment **Plinth Height Clearance** ($1.5\text{ m}$).
   - **TNSDMA 2023 Coastal Surge Limit** ($3.0\text{ m MSL}$).
   - **Yard Dewatering Mandate** status (Mobile diesel pumps vs gravity drainage).
