# 08 — Grid Resiliency & Asset Health Scoring Architecture: Evaluation & Recalibration Plan

> **Document Type**: Technical Specification & Audit  
> **Target System**: SurgeGrid AI Grid Health Engine (`gridHealthService.ts`)  
> **Status**: Approved for Recalibration  
> **Date**: 28 September 2026  

---

## 1. Executive Overview

SurgeGrid AI evaluates the operational resilience and disaster failure probability of the 286 electrical substations across the Chennai metropolitan electrical network. 

To bridge climate forcing (Google DeepMind WeatherNext 3, Google Earth Engine terrain inundation) with physical grid dispatch, the platform maintains a dual-layer risk model:
1. **Planetary Multi-Hazard Baseline (`compositeRiskScore`)**: A static geospatial score (0–100) reflecting elevation, slope, built-up concrete cover, and 2015/2023 flood recurrence depths.
2. **Asset Health & Maintenance Profile (`healthScore` / `SubstationHealthProfile`)**: A dynamic operational score (15–100) derived from 90-day incident histories and real-time live outage feeds from `outage.nammamap.in`.

This document details the exact mathematics, classifications, and rules of the **current scoring system**, analyzes its **structural blind spots**, and provides a formal **recalibration roadmap**.

---

## 2. In-Depth Analysis of the Current Scoring System

### 2.1 The Two-Stage Evaluation Pipeline

```
  [90-Day Historical Event Log]        [Live Outage Ingestion Feed]
  (Substation JSON / Localized)        (outage.nammamap.in /api/v2)
                 │                                   │
                 ▼                                   ▼
        [normalizeToISODate]               [classifyOutageCategory]
        [deduplicateEvents]                [classifyScope]
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼
                       [computeHealthProfile()]
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
     [Baseline Score = 100]                  [Trip Deductions]
     • Scope Base Penalties                  • Recency Decay Factor
     • Feeder Scale Normalization            • Post-Trip PM Relief (0.55x)
               │                                       │
               └───────────────────┬───────────────────┘
                                   │
                                   ▼
                      [Credits, Streaks & Neglect]
                      • Maintenance Credits (+1 to +12)
                      • Clean Operating Streak (+3)
                      • Neglect / Unresolved Penalties (-6, -12)
                                   │
                                   ▼
                    [healthScore (Clamped 15–100)]
                    [Health Grade: A / B / C / D]
                                   │
                                   ▼
                       [calculateDynamicRisk()]
              finalRisk = min(100, baseRisk * disasterMultiplier)
```

---

### 2.2 Mathematical Formula & Step-by-Step Scoring Engine

The calculation is executed by `computeHealthProfile()` in [`src/services/gridHealthService.ts`](file:///c:/projects/surgegrid-ai/src/services/gridHealthService.ts):

#### Step 1: Base Score Initialization
Every substation begins with a perfect operational baseline:
$$\text{Score}_{\text{initial}} = 100$$

#### Step 2: Trip Penalties with Scope Weighting & Scale Normalization
For every event where `category !== 'periodic_maintenance'`:

1. **Scope-Based Base Penalty ($\text{P}_{\text{base}}$)**:
   - **`yard_core` (Primary Switchyard Equipment)**: $18.0\text{ points}$  
     *(Power transformer burnout, busbar flashover, 110kV/33kV circuit breaker trip)*
   - **`feeder_corridor` (Radial Feeder Line)**:  
     $$\text{P}_{\text{base}} = 8.0 \times \text{Factor}_{\text{feeder}}$$
     $$\text{Factor}_{\text{feeder}} = \max\left(0.45, \min\left(1.0, \frac{4}{\sqrt{\text{numFeeders}}}\right)\right)$$
     *(Normalizes impact so large 24-feeder hubs are not disproportionately penalized for single localized feeder trips; yields ~3.6 to 8.0 points)*
   - **`lt_street` (Low-Tension Distribution & Pillar Work)**: $3.0\text{ points}$  
     *(Pillar box flashover, fuse blow, street service wire rupture)*

2. **Recency Decay Multiplier ($\text{M}_{\text{recency}}$)**:
   $$\text{M}_{\text{recency}} = \begin{cases} 
   1.25 & \text{if } \text{isLiveActive} = \text{true or } \text{age} \le 1\text{ day} \\
   1.00 & \text{if } 2 \le \text{age} \le 14\text{ days} \\
   0.75 & \text{if } 15 \le \text{age} \le 45\text{ days} \\
   0.50 & \text{if } \text{age} > 45\text{ days}
   \end{cases}$$

3. **Post-Trip Maintenance Relief ($\text{R}_{\text{relief}}$)**:
   If a `periodic_maintenance` event chronologically followed the trip ($\text{Date}_{\text{PM}} > \text{Date}_{\text{trip}}$):
   $$\text{R}_{\text{relief}} = 0.55 \quad (\text{45\% deduction relief})$$
   Otherwise:
   $$\text{R}_{\text{relief}} = 1.00$$

4. **Net Trip Deduction**:
   $$\text{Deduction}_{\text{trip}} = \text{P}_{\text{base}} \times \text{M}_{\text{recency}} \times \text{R}_{\text{relief}}$$

---

#### Step 3: Proactive Maintenance Credits
The model awards credits for active physical upkeep in the last 90 days:
- $\text{Credit}_{\text{yard}} = \min(6, \text{Count}_{\text{yard\_PM}} \times 2.0)$
- $\text{Credit}_{\text{feeder}} = \min(6, \text{Count}_{\text{feeder\_PM}} \times 1.5)$
- $\text{Credit}_{\text{lt}} = \min(3, \text{Count}_{\text{lt\_PM}} \times 1.0)$
- **Total Credit Added**:
  $$\text{Credits} = \min\left(12.0, \text{Credit}_{\text{yard}} + \text{Credit}_{\text{feeder}} + \text{Credit}_{\text{lt}}\right)$$

---

#### Step 4: Streak Bonuses and Neglect Penalties
- **Clean Operating Streak Bonus**:  
  If clean streak $\ge 60\text{ days}$, periodic maintenance $> 0$, and unscheduled trips $= 0$:
  $$\text{Bonus} = +3.0\text{ points}$$
- **Zero-PM Neglect Penalty**:  
  If trips occurred without a single maintenance run in 90 days ($\text{Count}_{\text{PM}} = 0 \land \text{Count}_{\text{trips}} > 0$):
  $$\text{Penalty}_{\text{neglect}} = -12.0\text{ points}$$
- **Unresolved Vulnerability Penalty**:  
  If the most recent event is an unaddressed trip ($\text{Date}_{\text{lastTrip}} > \text{Date}_{\text{lastPM}}$):
  $$\text{Penalty}_{\text{unresolved}} = -6.0\text{ points}$$

---

#### Step 5: Final Score Clamping & Grading
$$\text{Score}_{\text{raw}} = \text{Score}_{\text{initial}} - \sum \text{Deduction}_{\text{trip}} + \text{Credits} + \text{Bonus} + \text{Penalties}$$
$$\text{healthScore} = \max(15, \min(100, \text{round}(\text{Score}_{\text{raw}})))$$

| Health Score Range | Health Grade | Classification | Disaster Multiplier |
| :---: | :---: | :---: | :---: |
| **85 – 100** | **Grade A** | **Resilient** | $1.00\times$ (Baseline risk unchanged) |
| **75 – 84** | **Grade B** | **Stable** | $1.10\times$ (+10% vulnerability) |
| **55 – 74** | **Grade C** | **Strained** | $1.25\times$ (+25% vulnerability; triggers triage) |
| **15 – 54** | **Grade D** | **Fragile** | $1.45\times$ (+45% vulnerability; extreme hazard) |

---

### 2.3 Event Categorization & Scope Classifiers

#### 1. Category Classification (`classifyOutageCategory`)
Scans uppercase text against keyword sets:
- **`periodic_maintenance`**: Matches `RECTIFICATION`, `POLE SHIFTING`, `SHIFTING`, `CONVERSION`, `HEIGHTENING`, `RAISING`, `MAINTENANCE`, `SS MAINTENANCE`, `PM`, `OVERHAUL`, `TREE`, `CLEARANCE`, `PRE-MONSOON`, `SERVICING`, `EARTHING`, `CAPACITOR`, `TESTING`, `SHUTDOWN`.
- **`emergency_repair`**: Matches `EMERGENCY REPAIR`, `DAMAGE POLE REPLACEMENT`.
- **`forced_trip`**: Matches `FAILURE`, `FAULT`, `TRIP`, `TRIPPED`, `BREAKDOWN`, `FIRE`, `PUNCTURE`, `BURNT`, `SNAP`, `DISC`, `JUMPER CUT`.
- **Default Fallback**: Defaults to `periodic_maintenance`.

#### 2. Scope Classification (`classifyScope`)
- **`lt_street`**: Matches `PILLAR`, `LT `, `LT CABLE`, `LT CONDUCTOR`, `STREET`, `SERVICE WIRE`, `CONSUMER`, `FUSE`.
- **`yard_core`**: Matches `TRANSFORMER`, `OIL`, `BUSBAR`, `BREAKER`, `SWITCHGEAR`, `EARTHING`, `SS MAINTENANCE`, `SUBSTATION`.
- **`feeder_corridor`**: Defaults here if a feeder name exists or if none of the above match.

---

## 3. Structural Vulnerabilities & Blind Spots (The System Roast)

A critical review reveals six core engineering flaws:

### 1. The "Forgiveness Inflation" Trap
Because base maintenance credits can add up to $+12.0$ points and base penalties for low-tension faults are low ($3.0 \times 1.25 = 3.75$), a substation with **active live cable faults** can earn more maintenance credits than its penalty points. 
- *Example*: KK Nagar SS has two active cable faults today ($-7.5$ points) and four prior maintenance runs ($+8.5$ credits). The score evaluates to $100 - 7.5 + 8.5 = 101 \to \mathbf{100}$.
- *Consequence*: The substation is assigned a flawless 100/100 Resilient rating while consumers are actively without power.

### 2. The Naive Keyword Classifier Trap
- In `classifyOutageCategory`, the check for `MAINTENANCE` precedes `FAULT`.
- Consequently, notices like **"Pillar Maintenance & Cable fault work"** match `MAINTENANCE` first and are categorized as planned maintenance instead of an unscheduled fault.
- Notices like **"Cable Repair Work"** contain `REPAIR`, which is absent from both the planned and trip keyword lists; it falls through to the default fallback (`periodic_maintenance`). Real repairs are thus improperly credited as proactive maintenance.

### 3. Conflation of Asset Durability with Real-Time Dispatch Availability
The platform attempts to represent three orthogonal dimensions with a single number:
1. **Physical Asset Health (90-day equipment durability)**: Transformer age, dissolved gas levels, oil filtration history.
2. **Historical Reliability (SAIDI/SAIFI)**: Interruption frequency and mean time to restore.
3. **Real-Time Dispatch State (Today)**: Circuit breaker positions (energized vs. de-energized).
When power is cut to 41,000 consumers, asserting a score of "100/100" creates immediate operator and user distrust.

### 4. Consumer Impact & MVA Scale Blindness
The scoring engine treats all assets similarly:
- A trip affecting a 48 MVA hub feeding 41,000 consumers is penalized using the same base scale as a 5 MVA distribution node feeding 800 consumers.
- Consumer count and total interrupted MVA are omitted from the penalty equation.

### 5. Clean Streak False-Positive Bug
When events are erroneously categorized as `periodic_maintenance` by the keyword classifier, `lastTripDate` remains `undefined`. The clean streak calculator defaults to:
$$\text{cleanStreakDays} = 90$$
The system then reports **"0 Trips • 90d clean run"** despite active incidents occurring on the same day.

### 6. Independence from N-1 Grid Redundancy
A double-bus, multi-transformer substation with automatic bus-couplers is evaluated identically to a single-transformer radial stub. The presence of backup power paths is not credited during fault events.

---

## 4. Comprehensive Recalibration Roadmap

To resolve these architectural flaws, the scoring system will be refactored across three pillars:

```
                           SURGEGRID RECALIBRATED SCORING MODEL
 ┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
 │       PILLAR 1: ASSET HEALTH INDEX (AHI)      │   PILLAR 2: LIVE AVAILABILITY INDEX (LAI)     │
 │       90-Day Equipment Durability (0–100)     │       Real-Time Grid Dispatch State           │
 ├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
 │ • Measures transformer & switchyard integrity │ • Evaluates real-time power delivery state    │
 │ • Penalties decay over 90 days                │ • Dynamic instantaneous status                │
 │ • Credits CANNOT offset active trips          │ • Overrides UI during active interruptions    │
 │ • Tracks physical maintenance compliance      │ • Consumer & MVA-weighted disruption scale    │
 └───────────────────────────────────────────────┴───────────────────────────────────────────────┘
                                                 │
                                                 ▼
                                 [UNIFIED DISASTER MULTIPLIER]
                           Modulates terrain flood risk dynamically
```

---

### Phase 1: Decoupling Asset Health from Live Availability

The single score will be replaced by two distinct, complementary indicators:

1. **Asset Durability Index (ADI / 90-Day Asset Health)**:
   - Measures long-term equipment integrity, aging, and historical trip frequency.
   - Reflected as: `Asset Durability: 94/100 (Grade A)`
2. **Live Service Status (Operational State Today)**:
   - Evaluates the immediate dispatch state of the substation:
     - 🟢 **Normal Dispatch**: 100% of feeders energized; zero active notices.
     - 🟡 **Service Interrupted (Scheduled Maintenance)**: Planned maintenance shutdown active.
     - 🔴 **Service Disrupted (Forced Tripping)**: Unscheduled fault or feeder trip active.

---

### Phase 2: Mathematical Recalibration of the Health Engine

#### Rule 1: No "Blackout Forgiveness" (Credit Gating)
- Maintenance credits may **only offset historical penalties** (>48 hours old).
- Credits cannot offset any active outage occurring **today**.
- Maintenance credits are capped such that they can restore a score up to its baseline, but never elevate a damaged asset above a clean asset.

#### Rule 2: Dynamic Live Interruption Ceiling
When an outage is active *today*, the substation's real-time score is subjected to an upper bound regardless of historical maintenance:
- **Active Core Switchyard Outage**: Score ceiling $\le 50\text{ (Grade D / Fragile)}$.
- **Active Primary Feeder Trip**: Score ceiling $\le 74\text{ (Grade C / Strained)}$.
- **Active LT Street Fault**: Instant deduction of $-10.0\text{ points}$; streak reset to `0d (Interrupted Today)`.

---

### Phase 3: Robust NLP & Hierarchical Incident Classification

The keyword classifier will be replaced with a prioritized, token-aware classification hierarchy:

```
[Raw Incident Text]
        │
        ▼
[Gate 1: Trip & Fault Check] ──► Matches FAULT, BREAKDOWN, TRIP, FIRE, BURNT, SNAP?
        │                        YES: Flag as 'forced_trip' (Overrides any 'maintenance' text)
        │ NO
        ▼
[Gate 2: Repair Check]       ──► Matches REPAIR, REPLACEMENT, RECTIFICATION?
        │                        YES: Check source. Twitter/Citizen ──► 'forced_trip'
        │                             Scheduled Portal ──────────────► 'emergency_repair'
        │ NO
        ▼
[Gate 3: PM Check]           ──► Matches SHUTDOWN, SERVICING, OIL, TREE TRIMMING, PRE-MONSOON?
        │                        YES: Flag as 'periodic_maintenance'
        │ NO
        ▼
[Gate 4: Conservative Fallback] ─► Unknown text defaults to 'emergency_repair' (NEVER 'periodic_maintenance')
```

---

### Phase 4: Scale & Consumer Weighting Factor

Deductions will incorporate substation consumer scale:
$$\text{Penalty}_{\text{feeder}} = \text{P}_{\text{base}} \times \left(1.0 + \log_{10}\left(\frac{\text{Consumers}_{\text{substation}}}{5,000}\right)\right)$$
- An outage at a 41,000-consumer hub (KK Nagar) will carry a $1.91\times$ penalty multiplier compared to a 5,000-consumer rural substation.

---

### Phase 5: Implementation Roadmap

| Milestone | Deliverables | Target Files |
| :--- | :--- | :--- |
| **M1: Classifier Fix** | Deploy prioritized token hierarchy; remove `periodic_maintenance` fallback; fix `Cable fault work` misclassification. | `src/services/gridHealthService.ts` |
| **M2: Credit Gating & Live Cap** | Enforce live outage score ceilings; prevent credits from offsetting active cuts; reset clean streaks on live faults. | `src/services/gridHealthService.ts` |
| **M3: UI Metric Decoupling** | Introduce the `Live Availability Badge` alongside `Asset Durability` in the inspector drawer and roster cards. | `SubstationHealthCard.tsx`<br>`SubstationInspectorDrawer.tsx` |
| **M4: Consumer Weighting** | Incorporate connected consumer counts and feeder scales into the dynamic disaster multiplier. | `gridHealthService.ts`<br>`TnebGridMap.tsx` |
