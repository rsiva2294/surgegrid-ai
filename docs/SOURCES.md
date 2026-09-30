# Official Sources: Quote Bank

Every rule, warning and action the app attributes to an official plan is listed here, word for word, with its page. The same list lives in code at `src/data/officialSources.ts`; this file is generated from it and each quote was checked against the PDF text.

**Page numbers:** "PDF p." is the page in a PDF viewer. "Printed p." is the number printed on the page (some pages carry none). Quotes are shown as they appear in the source, including its wording and spelling.

**The PDFs are not stored in this repository.** Obtain them from the issuing bodies to verify.

## Sources
| Short name | Document | Issuer |
|---|---|---|
| MoP Power-Sector DMP 2021 | Disaster Management Plan for Power Sector (2021) | Ministry of Power, Government of India (prepared by Central Electricity Authority) |
| TANGEDCO DMP 2017 | TANGEDCO Disaster Management Plan (Version 3.0) (2017) | Tamil Nadu Generation and Distribution Corporation Limited |
| TN SDMP 2023 | State Disaster Management Plan 2023 (Volume II) (2023) | Tamil Nadu State Disaster Management Authority |
| GCC City DMP 2023 | City Disaster Management Perspective Plan 2023 (2023) | Greater Chennai Corporation |

## What the plans do not contain
We searched the full text of all four plans and found none of the following, so the app must not present them as official: a wind-speed level at which overhead lines must be switched off; a surge or flood depth that triggers substation shutdown; a plinth height; restoration times of 6, 12, 24 or 48 hours; a five-stage restoration protocol; counts of patrol gangs, cranes or pumps; pump sizes; a megger insulation limit. Where the plans speak on these topics they say switch off "if required" (see *Switching supply off*).

## IMD cyclone classes
MoP Power-Sector DMP 2021, Table-4, PDF p. 73 (printed p. 72). Wind speed in km/h.

| Class | Wind speed (km/h) | Inundation distance from coast | Damage |
|---|---|---|---|
| Severe | 88-117 | Up to 5 km | Moderate |
| Very Severe | 118-167 | Up to 10 km | Large |
| Extra Severe | 168-221 | Up to 10-15 km | Extensive |
| Super | 222 and above | Up to 40 km | Catastrophic |

## IMD rainfall classes
IMD brochure "Heavy Rain Warning Services" (mausam.imd.gov.in, `imd_latest/contents/pdf/pubbrochures/Heavy Rainfall Warning Services.pdf`), page 2, "Classification of Rainfall". The table is headed "24 hour rainfall over a station ending at 0830 hours IST". Checked by reading the page image (the PDF has no text layer).

| Class | 24-hour rain (mm) |
|---|---|
| Very Light Rain | Trace - 2.4 |
| Light Rain | 2.5 - 15.5 |
| Moderate Rain | 15.6 - 64.4 |
| Heavy rain | 64.5 - 115.5 |
| Very heavy rain | 115.6 - 204.4 |
| Extremely heavy rain | 204.5 and above |

**How the app uses it.** The class names and ranges are IMD's. The measurement is ours and differs from IMD's: a rolling 24-hour total (not the 0830 IST day) of NASA GPM IMERG satellite rain averaged over a ~11 km cell (not a rain-gauge station). The app says so wherever the classes appear.

**Another IMD document disagrees.** IMD's older glossary (`imdpune.gov.in/Reports/glossary.pdf`, "Intensity of Rainfall") gives Heavy 64.5-124.4, Very Heavy 124.5-244.4 and Extremely Heavy 244.5 and above. We use the warning-services brochure above, which matches IMD's current warning bulletins.

## IMD bulletin for Cyclone Michaung (context for the scenario)
IMD Press Release 4, "Cyclonic Storm MICHAUNG ... intensified into Severe Cyclonic Storm", issued 13:00 IST, 4 December 2023 (`internal.imd.gov.in/press_release/20231204_pr_2671.pdf`, 15 pages; pages 1 to 4 are text, the rest are warning maps). Checked by reading the PDF text.
- **Rain class limits** are printed in the header of every page: "Heavy rain: 64.5 - 115.5, Very heavy rain: 115.6 - 204.4, Extremely heavy rain: 204.5 or more" (mm). This matches the warning-services brochure above. The same header defines IMD's spatial words: Isolated under 25%, A few 26-50%, Many 51-75%, Most 76-100%.
- **Storm position and forecast:** centred at 08:30 IST on 4 December near 13.3 N, 81.0 E, about 90 km east-northeast of Chennai; forecast to cross the coast between Nellore and Machilipatnam, close to Bapatla, during the forenoon of 5 December. So T-0 (our peak-rain hour) is not a landfall time.
- **Wind warning:** "Gale wind speed reaching 60-70 kmph gusting to 80 kmph is prevailing along and off north Tamilnadu coast (Chennai and to its north)." Our ERA5-Land area mean at the T+12h step (14:30 IST on 4 December) is about 37 km/h; it is smoothed over about 9 km and is not gusts, so it reads lower.
- **Rain warning, north coastal Tamil Nadu and Puducherry:** "heavy to very heavy rainfall at a few places with isolated extremely heavy falls is very likely on 4th".
- **Damage expected and action suggested** (Tamil Nadu-Puducherry coastal districts) include "Minor damage to power and communication lines due to breaking of branches and uprooting of trees", "Localized Flooding of roads and closure of underpasses mainly in urban areas" and "Avoid going to areas that face the water logging problems often".
These are IMD's statements at that time (forecast wording). The app does not use them as plan quotes; they are context for the Michaung scenario.

## IMD four-stage warning system
TN SDMP 2023, Four Stage Warning System, PDF p. 148 (printed p. 146).

| Stage | Issued at least |
|---|---|
| Pre-Cyclone Watch | 72 hours before |
| Cyclone Alert | 48 hours before |
| Cyclone Warning | 24 hours before |
| Post Landfall Outlook | 12 hours before |

## Quotes by topic

### Standby resources

- **`mop-diesel-7-days`** — "Adequate diesel shall be kept to run Substation DG set continuously for 7 days at Substations which are likely to be affected by the cyclone/tsunami."  
  MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245); 8.3.2 Cyclone/Tsunamis

- **`mop-check-inventories`** — "Inventories at places near to likely cyclone/tsunami affected areas shall be checked and additional inventories shall be arranged, if required."  
  MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245); 8.3.2 Cyclone/Tsunamis

- **`mop-move-ers-towers`** — "The ERS towers shall be moved to the nearest Substation of likely affected area to save transportation time."  
  MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245); 8.3.2 Cyclone/Tsunamis

- **`mop-deploy-manpower`** — "Expert manpower shall be deployed to the nearest station of likely affected area."  
  MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245); 8.3.2 Cyclone/Tsunamis

- **`gcc-run-dg-set-relief-campus`** — "Run DG set in case of power failure in Relief campus/ UPHC/ govt offices/ schools."  
  GCC City DMP 2023, PDF p. 156 (printed p. 138); 8.9 Lighting facilities

- **`gcc-generators-sewage-pumping`** — "To ensure working conditions of sewerage pumping stations and to keep generator sets in pumping stations."  
  GCC City DMP 2023, PDF p. 164 (printed p. 146)

### Flood preparation

- **`mop-identify-flood-prone`** — "Flood prone locations where substations, towers and buildings etc. are located shall be identified."  
  MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245); 8.3.3 Floods/cloud burst/urban flood

- **`mop-trigger-mechanism`** — "The trigger mechanism shall be established to initiate the action plan."  
  MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245); 8.3.3 Floods/cloud burst/urban flood

- **`tangedco-retaining-wall`** — "In all outdoor sub-stations, where there is likelihood of floods entering the sub-station, arrangements may be made to provide strong retaining wall or otherwise to prevent possible damages to the sub-station."  
  TANGEDCO DMP 2017, PDF p. 77 (printed p. 73)

- **`tangedco-sandbags`** — "As temporary measures sand bags are kept to avoid water entry."  
  TANGEDCO DMP 2017, PDF p. 78 (printed p. 74)

- **`gcc-check-transformers-pillar-boxes`** — "To attend the faults, check transformers and pillar boxes to avoid electrocution."  
  GCC City DMP 2023, PDF p. 165 (printed p. 147); Mitigation plan: Tamil Nadu Electricity Board

- **`gcc-rectify-low-lying-cables`** — "Rectify low lying TANGEDCO cables."  
  GCC City DMP 2023, PDF p. 156 (printed p. 138); 8.9 Lighting facilities

### Dewatering

- **`mop-dewatering-pump-arranged`** — "Adequate de-watering pump shall be arranged."  
  MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245); 8.3.3 Floods/cloud burst/urban flood

- **`mop-dewatering-pumps-needed`** — "Availability of de-watering pumps is therefore considered necessary for stations located in flood-prone areas."  
  MoP Power-Sector DMP 2021, PDF p. 233 (printed p. 232); De-watering Pumps

- **`mop-mobile-dg-sets`** — "A sufficient number of mobile DG sets should be available and should be moved immediately to provide emergency relief and for operating the dewatering pumps."  
  MoP Power-Sector DMP 2021, PDF p. 233 (printed p. 232); Mobile DG sets

- **`tangedco-pump-out-flood`** — "In case, flood enters the sub-station, it should be arranged to be pumped out quickly to safeguard electrical equipments."  
  TANGEDCO DMP 2017, PDF pp. 77-78 (printed pp. 73-74); 5.11 Operation coordination, Drills and exercises

- **`tangedco-diesel-pumps-low-lying`** — "also diesel pumps for draining flood water from the Sub-stations which are located in low lying areas."  
  TANGEDCO DMP 2017, PDF p. 78 (printed p. 74)

- **`tangedco-dewatering-pumps-low-lying`** — "The Sub Stations in low lying area is provided with Dewatering pumps to pump out the flooded water."  
  TANGEDCO DMP 2017, PDF p. 79 (printed p. 75)

### Switching supply off

- **`mop-switch-off-if-required`** — "The power supply should be switched off, if required, to avoid electrocution and other damages."  
  MoP Power-Sector DMP 2021, PDF p. 247 (printed p. 246); 8.3.3 Floods/cloud burst/urban flood

- **`tangedco-oh-lines-out-of-service`** — "The O/H lines may be kept out of service in the areas likely to be affected by flood to avoid damage due to snapping of conductors, electrocution etc.,"  
  TANGEDCO DMP 2017, PDF p. 77 (printed p. 73); 5.11 Operation coordination, Drills and exercises

- **`tangedco-switch-off-or-trip`** — "Generally power supply is switched off or tripped on protection to ensure safety of public and equipments."  
  TANGEDCO DMP 2017, PDF p. 87 (printed p. 83); Part II, Chapter I: Cyclone and Storm

- **`sdmp-disconnect-at-cyclone-strike`** — "Disconnect power supply at the time of striking of cyclone."  
  TN SDMP 2023, PDF p. 154 (printed p. 152); Response matrix (responsibility: TANGEDCO)

- **`gcc-cut-off-during-flooding`** — "Power supply to be cut off during flooding, if required."  
  GCC City DMP 2023, PDF p. 165 (printed p. 147); Mitigation plan: Tamil Nadu Electricity Board

### Restoration priority

- **`mop-restore-priority`** — "The power supply of vital installations e.g. Drainage pumping stations, drinking water supply plants, hospitals, post offices, banks, government offices and residential complexes should be restored on a priority basis."  
  MoP Power-Sector DMP 2021, PDF p. 240 (printed p. 239); 8.2.5.1.4 Restoration of Distribution Networks

- **`mop-emergency-operation-centre`** — "Every distribution company must build up Emergency Operation Centre (EOC) with full logistics, conventional and alternative communication systems and connectivity with external authorities for assistance and support."  
  MoP Power-Sector DMP 2021, PDF p. 240 (printed p. 239); 8.2.5.1.4 Restoration of Distribution Networks

- **`mop-mobile-substation-12-24h`** — "Mobile Substation deployment capability is a major advantage to utilities as it can be used to restore power supply in disaster affected areas in 12-24 hours, which otherwise may take several days to weeks."  
  MoP Power-Sector DMP 2021, PDF p. 240 (printed p. 239); Mobile Substation

- **`tangedco-restore-priority`** — "The priority is for Hospitals, drinking water supply, public lighting, community centers where peoples have been safely accommodated."  
  TANGEDCO DMP 2017, PDF p. 79 (printed p. 75); Initial assessment of Damages

### Hardening

- **`mop-underground-in-cyclone-areas`** — "the existing overhead distribution system should be replaced with the underground cable system in cyclone-prone areas."  
  MoP Power-Sector DMP 2021, PDF p. 112 (printed p. 111); 6.1.2.1 Cyclone

- **`mop-raised-platform`** — "Construction of building, substations on a raised platform"  
  MoP Power-Sector DMP 2021, PDF p. 127 (printed p. 126); 6.2 General Recommendations for Building Resilience

- **`mop-floodwalls`** — "Floodwalls can be established around the substation"  
  MoP Power-Sector DMP 2021, PDF p. 148 (printed p. 147); Table-12.2.3: Investing in DRR - Structural Measures (Flood)

### Safe recharging

- **`tangedco-no-recharge-before-patrol`** — "Sub-station operators may be instructed not to recharge the lines before the fault is cleared. They should charge the feeders only after ensuring safety of the public after patrolling the feeders."  
  TANGEDCO DMP 2017, PDF p. 77 (printed p. 73); 5.11 Operation coordination, Drills and exercises

### Past events (context)

- **`tangedco-2015-six-feet`** — "water flooded in the Substations up to a height of 6 feet"  
  TANGEDCO DMP 2017, PDF p. 37 (printed p. 33); Case history: floods of November-December 2015

- **`tangedco-2015-substations-kept-off`** — "22 Nos. substations in Chennai Districts, 13 Nos. substations in Kanchipuram District feeding Chennai area and 6 Nos. substations in Tiruvallur District feeding Chennai area were kept off for safety purposes due to water logging."  
  TANGEDCO DMP 2017, PDF p. 37 (printed p. 33); Case history: floods of November-December 2015

- **`tangedco-vardah-cut-off`** — "To avoid accidents, as precautionary measure power supply was cut off in many parts."  
  TANGEDCO DMP 2017, PDF p. 38 (printed p. 34); Case history: Vardah cyclone, 2016

- **`gcc-vardah-fallen-trees`** — "81 electricity installations were covered with fallen trees which delayed the restoration of power supply"  
  GCC City DMP 2023, PDF p. 54 (printed p. 36); 4.1.2.1 Damages Caused (Vardah, 2016)

### Context

- **`gcc-tangedco-role`** — "Proper maintenance of the electric cables, ensuring 24x7 power supply, attending to cable faults"  
  GCC City DMP 2023, PDF p. 163 (printed p. 145); Role of the Assistant Engineer, TANGEDCO

- **`gcc-average-elevation`** — "most of the areas are with average elevation of barely 2.0 meters above mean sea level"  
  GCC City DMP 2023, PDF p. 5; Preface
