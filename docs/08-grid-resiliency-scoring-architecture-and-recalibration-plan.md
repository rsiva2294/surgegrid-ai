# 08 — Grid Resiliency & Asset Health Scoring Architecture (As Built)

> **Document Type**: Technical specification, audit and remaining-work list
> **Target System**: `src/services/gridHealthService.ts`
> **Status**: The recalibration described in the original plan (28 Sep 2026) is **largely implemented**. This revision (audited against the code on 2026-09-29) documents what the code actually does, marks which planned items are done, and lists what remains.

---

## 1. Executive Overview

SurgeGrid AI evaluates the operational resilience of the 286 substations with two layers:

1. **Planetary multi-hazard baseline (`compositeRiskScore`, 0–100)**: a static score precomputed offline from elevation, coast distance, built-up cover and flood history, stored on each substation in `chennai_tneb_grid.json`.
2. **Asset health and live dispatch profile (`SubstationHealthProfile`)**: computed in the browser by `computeHealthProfile()` from the substation's embedded 90-day event log plus any live outage notices resolved to it. It yields a 90-day **asset durability score**, a **live dispatch score** (durability capped by active trips), a grade A–D and a **disaster risk multiplier**.

In a disaster scenario (`Alert` / `Severe` / `Surge`), `calculateDynamicRisk()` multiplies the baseline by the multiplier: `finalRisk = min(100, round(baseRisk × multiplier))`. In the `Live` (`NORMAL`) scenario it returns the baseline unchanged.

```
 outageHistory (embedded, 90 d)      live notices (getOutagesForSubstation)
              │                                   │
              └─────────────── merge ─────────────┘   getEnrichedHealthProfile()
                       (live events flagged isLiveActive; de-duplicated by date + workType)
                                    │
                        evaluateOutageArchetype()   ← 7 archetypes, see doc 09
                                    │
                          computeHealthProfile()
              ┌─────────────────────┼─────────────────────┐
     trip penalties        maintenance credits      streak / neglect
              └──────────── assetDurabilityScore (15–100) ─┘
                                    │  live-trip ceiling (50 / 74 / 84)
                            liveDispatchScore = healthScore
                                    │
                    grade + disasterRiskMultiplier → calculateDynamicRisk()
```

---

## 2. The Scoring Engine

### 2.1 Event classification

`evaluateOutageArchetype(workType, {feeder, noticeCategory, rawReason, rawTamil})` (full keyword tables and precedence in doc 09) returns `category`, `archetype`, `scope`, `severityWeight`, `resetsStreak`, `isLiveFault`. Precedence: severe failure → emergency repair → civic → vegetation → hardening → periodic maintenance → weather → notice-category fallback → neutral. **Failure words beat maintenance words**, which fixes the original "Pillar Maintenance & Cable Fault" mis-classification. The scorer uses only `category`, `archetype` and `scope` from this result; `severityWeight`, `resetsStreak` and `isLiveFault` are returned but not consumed (the scorer applies its own constants below).

Scope: `yard_core` (transformer, busbar, breaker, switchgear, substation, battery, plinth, bus coupler, take-off cable and Tamil equivalents), `lt_street` (pillar, LT, street, service wire, consumer, fuse, distribution box), else `feeder_corridor`.

### 2.2 Step-by-step calculation

1. **Start** at 100.
2. **Trip penalties.** For every event whose category is *not* `periodic_maintenance`, `grid_hardening`, `vegetation_pruning` or `civic_clearance` (i.e. `forced_trip`, `emergency_repair`, `environmental_event`):

   | Scope | Base penalty |
   | :--- | :---: |
   | `yard_core` | 25 |
   | `feeder_corridor` | 12 × `feederFactor`, with `feederFactor = max(0.45, min(1, 4/√numFeeders))` |
   | `lt_street` | 5 |

   Multiplied by a **recency factor**: 1.25 if live-active or ≤ 1 day old; 1.00 for 2–14 days; 0.75 for 15–45 days; 0.50 beyond 45 days. If a periodic-maintenance or hardening event is dated *after* a **non-live** trip, that trip's penalty is multiplied by **0.55**.
3. **Maintenance credits** (across all events in the profile): `yard = min(6, 2 × n_yard)`, `feeder = min(6, 1.5 × n_feeder)`, `lt = min(3, 1 × n_lt)`, `hardening = min(5, 2.5 × n_hardening)`; total capped at **+15**. The scope counters include hardening and vegetation events, so a hardening event can earn both a scope credit and a hardening credit.
4. **Clean streak.** `cleanStreakDays` = 90 by default; 0 if any live trip is active; otherwise the age in days of the last trip. **+3** if streak ≥ 60, at least one maintenance/hardening/vegetation event and zero trips.
5. **Neglect / unresolved.** **−12** if there are trips and zero maintenance events; **−6** if the latest trip is newer than the latest maintenance (or there is no maintenance).
6. **Clamp** to 15–100 and round → `assetDurabilityScore`.
7. **Live ceiling.** Active live trips (`forced_trip`, `emergency_repair`, `environmental_event` with `isLiveActive`) cap the score: worst active scope `yard_core` → **≤ 50**, `feeder_corridor` → **≤ 74**, `lt_street` → **≤ 84**. Result is `liveDispatchScore`, which is also `healthScore`.

| `healthScore` | Grade | Label | Disaster multiplier |
| :---: | :---: | :--- | :---: |
| 85–100 | A | Resilient | 1.00× |
| 75–84 | B | Stable | 1.10× |
| 55–74 | C | Strained | 1.25× |
| 15–54 | D | Fragile | 1.45× |

`RESILIENCY_CUTOFF_SCORE = 75`: `isSubstationAtRisk()` (the *Poor Stability* triage filter) is true when `healthScore < 75`.

**Dispatch status** (`dispatchStatus`): `ACTIVE_TRIP` or `EMERGENCY_REPAIR` when a live trip exists; else `PLANNED_MAINTENANCE` if a live maintenance/hardening event exists; else `CIVIC_CLEARANCE` for live civic events; else `NORMAL`. `SubstationHealthCard` shows this as a banner and shows `90d Durability` beside it when the durability score differs from the live score.

### 2.3 How live notices enter the profile

`getEnrichedHealthProfile()` calls `getOutagesForSubstation()` (resolved substation code/name, gazetteer, guarded name/feeder/section matching) and converts **every** matching notice in the fetched feed into an event with `isLiveActive: true`, whatever its date. "Live" therefore means "present in the current feed", not "occurring today". Live events replace stored events with the same date and `workType`.

---

## 3. Original Blind Spots: Status

| # | Blind spot (original audit) | Status |
| :-: | :--- | :--- |
| 1 | *Forgiveness inflation*: credits offset active blackouts, yielding 100/100 during an outage | **Fixed** by the live-trip ceiling (50 / 74 / 84). Credits still raise the *durability* score; they no longer lift the live score above the ceiling. |
| 2 | *Naive keyword classifier*: `MAINTENANCE` checked before `FAULT`; `REPAIR` fell through to maintenance | **Fixed**: failure regex first; unknown text no longer defaults to maintenance. |
| 3 | Asset durability conflated with real-time dispatch | **Fixed in the model** (`assetDurabilityScore` vs `liveDispatchScore`, `dispatchStatus`). The UI headline shows the live score; durability appears only when it differs. |
| 4 | Consumer count / MVA scale blindness | **Open.** No consumer or capacity weighting anywhere in the penalty. |
| 5 | Clean-streak false positive (`90d clean` when the last trip was mis-classified) | **Mitigated**: streak is 0 with an active live trip, and the classifier fix removes the main cause. It still defaults to 90 when no trip exists in the log. |
| 6 | No N-1 / bus-coupler redundancy credit | **Open.** |

### Implementation roadmap status

| Milestone | Deliverable | Status |
| :--- | :--- | :--- |
| M1 Classifier fix | Prioritised token hierarchy | **Done** (7 archetypes, bilingual). Deviation from plan: unknown text with no category hint becomes a *neutral advisory* (`civic_clearance`, 0 pts), not `emergency_repair`. |
| M2 Credit gating & live cap | Ceilings; streak reset | **Done** via ceilings and streak reset. Credits are not excluded from the durability score. |
| M3 UI decoupling | Availability badge next to durability | **Partial**: dispatch banner + durability text in `SubstationHealthCard`; roster cards show grade and score only. |
| M4 Consumer weighting | Consumers / MVA in penalty | **Not started** (the proposed `1 + log10(consumers/5000)` factor is not implemented). |

---

## 4. Known Limitations and Data Caveats

- **Synthetic placeholder events.** In the shipped data, 119 of 1,213 events are placeholder `pm-routine-…` inspections added by `scripts/enrich_substation_history.cjs` for substations with no logged Q3 incidents. In addition, `computeHealthProfile()` fabricates events (fixed dates in Jul–Sep 2026, 65 % maintenance / 35 % trips) when a substation has no events but a non-zero `historicalOutagesCount`. These earn maintenance credit and can create trips, so scores for those substations are partly synthetic.
- **Fixed dates.** Placeholder dates are hard-coded; as real time advances they age out of the recency windows without being replaced.
- **Age computation** uses the browser's current UTC date; unparseable dates default to 60 or 90 days.
- **Scope of "90-day".** No event is filtered by age; the 90-day window is a property of the data, not of the code.
- **Penalty constants differ from the taxonomy.** Doc 09 lists −35 / −20 / −10 for *severe-fault* archetypes; the scorer's own trip deductions are 25 / 12 / 5. `severityWeight` is returned by the classifier but not summed.
- **Multiplier is coarse**: four steps, applied only outside the `Live` scenario.
