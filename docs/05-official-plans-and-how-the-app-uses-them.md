# 05 - What the Official Plans Say, and How the App Uses Them

This document replaces the earlier "statutory SOP linkage" page. That page described a five-stage restoration protocol, restoration-hour limits, a wind level for switching off overhead lines and a 3.0 m surge rule. **None of those appear in the four official plans we checked**, so they were removed from the app and from the docs. Every quote below is listed word for word, with its page, in [SOURCES.md](./SOURCES.md) (the same list is in `src/data/officialSources.ts`).

## 1. The four plans

| Short name | Document | Issuer | Year |
|---|---|---|---|
| MoP Power-Sector DMP 2021 | Disaster Management Plan for Power Sector | Ministry of Power, Government of India (prepared by CEA) | 2021 |
| TANGEDCO DMP 2017 | TANGEDCO Disaster Management Plan (v3.0) | Tamil Nadu Generation and Distribution Corporation | 2017 |
| TN SDMP 2023 | State Disaster Management Plan 2023 (Volume II) | Tamil Nadu State Disaster Management Authority | 2023 |
| GCC City DMP 2023 | City Disaster Management Perspective Plan | Greater Chennai Corporation | 2023 |

The PDFs are not stored in this repository. Page numbers are given as "PDF p." (the viewer page) and "printed p." (the number on the page).

## 2. What the plans say (and where the app shows it)

| Topic | What the plans say | Where it appears in the app |
|---|---|---|
| Switching supply off | Supply "should be switched off, if required, to avoid electrocution and other damages" (MoP p. 246). Overhead lines "may be kept out of service" in areas likely to be affected by flood (TANGEDCO p. 73). TANGEDCO to "disconnect power supply at the time of striking of cyclone" (TN SDMP p. 152). Power supply "to be cut off during flooding, if required" (GCC p. 147). | Feeder cards say "operator decision" for overhead and mixed feeders and quote the line; AI Directive impact phase. |
| Recharging | Operators are not to recharge lines before the fault is cleared and feeders are patrolled (TANGEDCO p. 73). | Feeder patrol tooltip; AI Directive restoration phase; municipal card. |
| Flood preparation | Flood-prone locations shall be identified; a trigger mechanism shall be established; de-watering pumps arranged; sandbags; strong retaining walls (MoP p. 245; TANGEDCO pp. 73-74). | Flood exposure card (only when it applies to the substation); AI Directive watch phase. |
| Standby resources | Diesel to run substation generators for 7 days at substations likely to be affected by a cyclone; check inventories; move ERS towers; deploy expert manpower (MoP p. 245). DG sets at relief campuses (GCC p. 138). | AI Directive watch phase; Substation Copilot. |
| Restoration priority | Drainage pumping stations, drinking-water plants, hospitals, post offices, banks, government offices and residential complexes are to be restored on a priority basis (MoP p. 239). TANGEDCO lists hospitals, drinking water, public lighting and community centres (TANGEDCO p. 75). | AI Directive restoration phase; feeder priority class (our classification by feeder name). |
| Hardening | Replace overhead distribution with underground cable in cyclone-prone areas; substations on a raised platform; flood walls (MoP pp. 111, 126, 147). | Underground feeder tooltip. |
| Cyclone classes | IMD classes by wind speed: Severe 88-117 km/h, Very Severe 118-167, Extra Severe 168-221, Super 222 and above (MoP Table-4, p. 72). | Wind readout under the AI Directive and the cockpit. |
| Warning stages | IMD Pre-Cyclone Watch (72 h), Alert (48 h), Warning (24 h), Post Landfall Outlook (12 h) before landfall (TN SDMP p. 146). | In the quote bank only. The scenarios are rain hindcasts with no landfall time, so stages are not shown. |
| Chennai elevation | Most of the city has an "average elevation of barely 2.0 meters above mean sea level" (GCC Preface). | The 2.0 m line used for "low-lying yard". |
| Past events | 2015: water up to 6 feet in substations; 41 substations kept off. Vardah 2016: supply cut off in many parts; fallen trees delayed restoration. | Quote bank and docs only, not on substation cards (they are region-wide). |

## 3. What the plans do not say

We searched the full text of all four plans and found none of the following, so the app does not present them as official: a wind speed at which overhead lines must be switched off; a surge or flood depth that triggers shutdown; a plinth height; restoration times of 6, 12, 24 or 48 hours; a five-stage restoration protocol; counts of patrol gangs, cranes or pumps; pump sizes; a megger insulation limit. Where the plans speak on these topics they say "if required", and the app leaves that decision to the operator.

Earlier versions of the app and docs also claimed "installed 13,810 RMUs". The 2017 plan only mentions a proposal to replace 13,810 transformer structures with RMUs in Chennai. That claim was removed.

## 4. How the app decides what to show

- **Phase of an event** (from the scenario data only): before T-0 the phase is watch; from T-0 while hourly rain is 0.1 mm or more it is impact; after T-0 once rain is below 0.1 mm it is restoration. T-0 is the peak-rain hour. The 0.1 mm line is a presentation choice, not an official threshold.
- **Which substations an action names** (from our grid data): the lowest-lying yards (elevation at or below 2.0 m), substations with overhead or mixed feeders, and substations with hospital or water feeders.
- **Flood flags on a substation card:** yard at or below 2.0 m; inside the NRSC 2015 flood extent; rated Moderate or High on the official 5 to 100-year flood-hazard maps. These come from checking the substation's location against official layers.
- **Anything else** (health grade, the backup suggestion) is labelled as our own calculation.

## 5. Data behind the flood facts

The flood maps and relief-centre list come from OpenCity's Greater Chennai Corporation profile: NRSC 2015 flood extent, GCC 2015 water-stagnation points, GCC northeast-monsoon 2020 flood hotspots, flood-hazard maps for 5, 10, 25, 50 and 100-year return periods, GCC flood inundation zones, and the GCC relief-centre list (zone, ward, address, officer, contact; no coordinates). `scripts/build_official_flood_layers.py` and `scripts/build_relief_centres.py` turn them into the small JSON files in `public/data/`. See [02 - Data Dictionary](./02-data-dictionary-and-sources.md).
