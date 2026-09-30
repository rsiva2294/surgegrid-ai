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
| GCC City DMP 2024 | City Disaster Management Perspective Plan 2024 (2024, 806 pages) | Greater Chennai Corporation (later edition of the same plan; see "GCC City DMP 2024" below) |

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

**The four bulletins used** (`src/data/imdBulletins.ts`; every quote is checked against the PDF text by `python scripts/verify_imd_quotes.py <folder with the PDFs>`): `20231203_pr_2669.pdf` (13:30 IST, 3 Dec), `20231204_pr_2671.pdf` (Press Release 4, 13:00 IST, 4 Dec), `20231205_pr_2674.pdf` (Press Release 5, 11:00 IST, 5 Dec) and `20231206_pr_2677.pdf` (Press Release 6, 13:30 IST, 6 Dec), all under `https://internal.imd.gov.in/press_release/`. Our T-0 is 02:30 IST on 4 December, so the steps are T-24h 02:30 IST 3 Dec, T-6h 20:30 IST 3 Dec, T-0h 02:30 IST 4 Dec, T+12h 14:30 IST 4 Dec and T+36h 14:30 IST 5 Dec.
- **Landfall time** (6 Dec bulletin): "crossed south Andhra Pradesh coast between Nellore and Machilipatnam, close to south of Bapatla during 1230 to 1430 hours IST of yesterday, the 5th December 2023 as a Severe Cyclonic Storm". That is T+34h to T+36h.
- **Observed gauge rainfall** (Annexure I "Realized weather" of the 3 and 4 Dec bulletins, 24 hours to 08:30 IST; lists only stations above about 7 cm, so they are a floor, not a city mean): 3 Dec, 16 Chennai-district stations, 70 to 100 mm (all in IMD's Heavy class); 4 Dec, 50 Chennai-district stations, 70 to 290 mm: 13 at 204.5 mm or more, 33 at 115.6 to 204.4, 4 at 64.5 to 115.5 (highest: Chennai Zone 14 and Perungudi 290 mm, Alandur 250 mm, Meenambakkam AWS and Zone 12 Meenambakkam 230 mm). For the same windows our IMERG cells (14 in Chennai) give 13 to 37 mm and 106 to 184 mm. The satellite estimate reads below the gauges; the app says so and does not rescale it. The bulletins give station names and totals but no coordinates.
- The 6 Dec bulletin's "Observed track" is a map image; we did not extract positions from it.

## IMD final report on Cyclone Michaung
"Severe Cyclonic Storm 'MICHAUNG' over the Bay of Bengal (1st-6th December, 2023): A Report", IMD Cyclone Warning Division, New Delhi, December 2023 (file `26_0580dd_Michaung Report_Final_Sir.pdf`, 24 pages; text checked by reading the PDF text). Not published at a link we know, so the app names it without a link.
- **Best track, whole table** (Table 1, 34 rows from 1 Dec 00:00 to 6 Dec 00:00 UTC): `public/data/scenarios/michaung2023_track.json`, built by `scripts/build_best_track.py` from the IMD final report; the script stops unless it reads 34 rows with increasing times and the five rows below are among them. The map draws it as the cyclone track; between two rows the storm position is a straight line (our interpolation). Landfall is IMD's own sentence in the same report (5 Dec, 07:00-09:00 UTC, near 15.7 N 80.3 E).
- **Best track** (Table 1, 3-hourly, UTC): the five rows the timeline uses are in `src/data/imdBulletins.ts` and checked by `scripts/verify_imd_quotes.py`: 2 Dec 18:00 (11.1 N, 82.7 E, deep depression, 30 kt, 996 hPa; the table has no row at 21:00, so this is the nearest earlier one for T-24h); 3 Dec 15:00 (12.4 N, 81.9 E, cyclonic storm, 40 kt, 994); 3 Dec 21:00 (13.0 N, 81.4 E, cyclonic storm, 45 kt, 992); 4 Dec 09:00 (13.7 N, 80.7 E, severe cyclonic storm, 50 kt, 988); 5 Dec 09:00 (15.8 N, 80.3 E, severe cyclonic storm, 50 kt, 990). Distances from Chennai are our calculation. Peak intensity was 55 kt (100-110 km/h) at 12:00 UTC (17:30 IST) on 4 Dec, 986 hPa. The system moved slowly (8-10 km/h) along and off the north Tamil Nadu and south Andhra coast from 23:30 IST on 3 Dec to 20:30 IST on 4 Dec.
- **Landfall:** "Crossed South Andhra Pradesh coast close to south of Bapatla during 0700-0900 UTC (1230-1430 IST) of 05th December near Lat 15.7 deg. N and Lon 80.3 deg. E as a severe Cyclonic Storm with the maximum sustained wind speed of 50 knots (90-100 kmph gusting to 110 kmph)".
- **Realised rainfall** (section 8.1; 24 hours to 08:30 IST; lists stations of 7 cm or more, so a floor): the lists for 3, 4 and 5 December name Chennai-area stations by name only, without coordinates. Highest: 4 Dec Zone 14 Perungudi 29 cm, Avadi 28, Alandur and Chennai (AP) 25 each; 5 Dec Poonamallee 34 cm, Avadi 28, KVK Kattukuppam 27.
- **Realised wind at Chennai** (section 8.2): "High Wind Speed Recorder at Chennai (NBK) recorded wind speed of about 75 kmph (40-45 knots) in gusts during early hours to noon of 04th December 2023"; "NBK AWS 30 kt (56 kmph) on 04th / 14:15 IST"; "MBK AWS 37 kt (68 kmph) on 04th / 10:30 IST"; MBK gusts of 80-90 km/h. Our ERA5-Land area mean is about 37 km/h at T+12h.
- **Damage** (section 9, "as per media reports"): 17 people killed in Tamil Nadu and two in Andhra Pradesh; more than 41,000 evacuated, including 32,158 in Tamil Nadu.
- **Annexure 1** lists past cyclonic disturbances with 12 cm or more over Chennai, Chengalpattu, Kancheepuram and Tiruvallur since 1976 (for example 1976: Chennai 45 cm; Vardah 2016: Satyabhama University 38 cm).

## Michaung flood extent: what exists (checked 2026-09-30)
- **NRSC, "Tamil Nadu Heavy Rains 2023 - Michaung Cyclone - Near Real Time Inundation Mapping using satellite data"**, letter NRSC/DMSG/2023/CY/TN/01, 7 Dec 2023 (https://ndem.nrsc.gov.in/documents/Disaster_Document/2023/TN/tncyclone50dsc07122023_0600hrs/tncyclone50dsc07122023_0600hrs_report.pdf): RISAT-1A (EOS-04) MRS SAR of 7 Dec 2023, 06:00; 148,360 ha of "flood inundation / standing water" in ten districts, 874 ha in Chennai. Its disclaimer: preliminary, may include rain water, water in low-lying areas and paddy fields, no ground verification. The shapefile was e-mailed to TNSAC and TNSDMA only. Not used in the app.
- **Bhuvan** (bhuvan-app1.nrsc.gov.in disaster services): the public WMS/WMTS services (`bhuvan-ras2.nrsc.gov.in/cgi-bin/flood.exe`, `/mapcache`) hold no December 2023 or Michaung layer; the Tamil Nadu flood layer there is `fld_cuml_2021_tn` (cumulative 2021). It was tried in place of the 2015 extent and dropped: little water shows in the city core, and the app would depend on Bhuvan's server while running.
- **Sentinel-1:** the Copernicus Data Space catalogue has no Sentinel-1 GRD image over Chennai (13.05 N, 80.25 E) from 1 to 25 Dec 2023; the last before the storm is 30 Nov 2023, 00:32 UTC.
- **Copernicus EMS:** no Chennai activation found for December 2023. **OpenCity** "Chennai flooding data": 2015 points, depth points (year not stated) and hazard maps; nothing for Michaung.

## Rain-gauge coordinates and the satellite check
`rain guage statiosn.pdf`: "Raingauge stations as on 2026-09-30", a Tamil Nadu list (printed from a web page; the issuer is not stated on the printout) with station name, district, taluk, village, start date, latitude, longitude and status. We parsed 564 stations; 11 are in Chennai district (all started 2019-10-25, so they existed in 2023) and 28 more in Tiruvallur, Chengalpattu and Kancheepuram. IMD's lists also name GCC "Zone nn" stations that are not in this list, so those cannot be placed.
We matched 18 stations (17 inside our cells) to the report's daily lists by exactly equal names (Alandur, Ayanavaram, MGR Nagar, DGP Office, Perambur, Chennai Collector Office, CD Hospital Tondiarpet, Ambattur, Avadi, Poonamallee, Cholavaram, Red Hills, Ponneri, Thamaraipakkam, Gummidipoondi, Tambaram, Sriperumbudur; Mahabalipuram is outside our cells). Names that appear twice in IMD's lists (Chennai (N), Anna University, Sholinganallur, Chembarambakkam) were left out. For each, the satellite value is the sum of the hourly IMERG rain of the station's 0.1 degree cell over the same 24 hours to 08:30 IST. Results, gauge against satellite cell (mm):
- 3 Dec, 7 stations with a listed value: medians 80 against 30; satellite/gauge ratio median 0.33 (0.16 to 0.53).
- 4 Dec, 16 stations: medians 195 against 147; ratio median 0.74 (0.40 to 0.97).
- 5 Dec, 10 stations: medians 170 against 114.5; ratio median 0.59 (0.38 to 1.05).
Values were read with `scripts/build_gauge_points.py`, which ends a station's group at the number followed by "each" or ";" (IMD chains several stations after one "each"); an earlier hand-written parse mis-assigned three values (Ayanavaram 4 Dec, Thamaraipakkam 5 Dec, Tambaram 5 Dec) and was replaced, and every matched value was re-checked against the report text. "Ambattur" is IMD's state-network station; the GCC's "Zone 07 Ambattur" is a different station and is not used. The same script writes the layer's data file `public/data/scenarios/michaung2023_gauges.json`.
Example: Avadi 280 mm on 4 Dec against 111 mm in its cell; Poonamallee 340 mm on 5 Dec against 130 mm. The satellite estimate reads below the gauges on every day; the app says so and does not rescale it.

## GCC City DMP 2024: what we use from the later edition
"City Disaster Management Perspective Plan 2024", Greater Chennai Corporation, 806 PDF pages (file `chennai Gcc ddmp 2024.pdf`, not stored in the repo; checksum below). The text has a broken font map (ligatures such as "fl" and "ffi" come out as CJK characters), so it is repaired before comparing.

**1. Our GCC quotes are unchanged in the 2024 edition.** All 8 GCC quotes in the bank appear word for word in it, about two PDF pages later than in the 2023 edition (`python scripts/verify_gcc_quotes_2024.py` re-checks this): cut-off during flooding 165 -> 167; check transformers and pillar boxes 165 -> 167; run DG set at relief campus 156 -> 158; generators at sewage pumping stations 164 -> 166; rectify low-lying cables 156 -> 158; Vardah fallen trees 54 -> 55; TANGEDCO role 163 -> 165; average elevation 5 -> 5 (and 790). The quote bank keeps the 2023 page numbers; the 2024 pages are listed here.

**2. Inundation registers by ward** (`public/data/gcc_plan_2024.json`, built by `scripts/build_gcc_plan_2024.py`). The plan lists named streets with a depth class per north-east monsoon: very high (above 5 ft), high (3 to 5 ft), medium (2 to 3 ft), low (under 2 ft). Each register was read with a table-aware parser and equals the plan's own printed total, row count and class split (the script stops if not):

| Register | Locations | Very high / high / medium / low | PDF pages |
|---|---|---|---|
| 2015 | 306 | 37 / 84 / 1 / 184 | 62-74 |
| 2017 | 205 | 0 / 0 / 23 / 182 | 76-82 |
| 2018 | 53 | 0 / 0 / 1 / 52 | 84-85 |
| 2019 | 19 | 0 / 0 / 0 / 19 | 87 |
| 2020 | 23 | 0 / 0 / 0 / 23 | 89-90 |
| 2021 | 561 | 0 / 18 / 61 / 482 | 92-106 |
| 2022 | 37 | 0 / 1 / 8 / 28 | 108-109 |

There is no 2016 register. The 2022 register is headed "Depth of Inundation During Monsoon -2021" in the plan, but its 37 rows equal the plan's 2022 summary table (page 107), so it is used as 2022. A location listed under several wards counts once in each (7 of the 1,204 rows), and one 2017 row has no ward and is not counted for any ward. The plan gives street names and ward numbers, not coordinates, so the app shows these as facts about a ward ("2015 register: 5 locations in this ward, deepest above 5 ft"), never as points. 178 of our 286 substations have a GCC ward; 53 of them are in wards with a 2015 location at 3 ft or deeper.

**3. The 2023 north-east monsoon list** (page 110): 35 inundated locations in 30 wards, by zone and ward, with no depth classes. The plan does not say how many were caused by Michaung, so the app words it as "north-east monsoon 2023 (includes Michaung)".

**4. Relief centres: capacity and facilities.** Each zone has a table (ward, capacity, name and address, streets to be shifted, drinking water, toilets, cooking, officers) and its own statement ("There are N relief centres to a total capacity of C"). The plan's tables and statements differ in 11 of 15 zones, in both directions (zone 2: table capacity 3,440 against 3,040 stated; zone 4: 11 centres in the table against 18 stated, the 18 being the map legend on the next page, which has names only; zone 14: 12 centres in both but 10,500 in the table against 3,250 stated). The table is the data, so the app shows the table's rows as printed, for all 15 zones: 162 centres, listed capacity 59,345 (2 blank). Each row is checked by script (`scripts/build_gcc_plan_2024.py`): the serial numbers run 1 to n with no gap, and the row's ward, capacity and name words also appear in the page's plain text. Zones 1 to 9, 11, 12 and 15 come from the automatic table parse (phone numbers are checked too). Zones 10, 13 and 14 were copied by hand from the PDF by the project owner (`scripts/relief_manual_zones.json`) because the parse missed rows; in zone 13 seven rows have a blank ward cell (the ward of the row above is used, flagged `wardInherited`) and four rows print no Yes/No facilities (shown as "not stated"). Every table-versus-statement difference is recorded in the data file (`reliefZoneDiscrepancies`). The plan's statements add up to 169 relief centres and 73,920 capacity; our OpenCity list has 162 centres in 120 wards.

**5. Michaung in the 2024 plan** (section 4.3, page 120, two paragraphs and photos): "moved very close to Chennai before Landing Andhra Pradesh Coast caused continuous rainfall for 24 hrs with wind speed of about 80kmph"; "In Perungudi, Velachery, Shozinganallur, Kodambakkam, Valasaravakkam, Thiru.vi.kaNagar recorded historically highest rainfall (78 cm, 47cm etc., respectively)". The 78 cm gives no period and does not match IMD's gauge lists (Perungudi's highest 24-hour reading was 29 cm on 4 December), so the app does not use it. The 80 km/h fits IMD's gusts. Also in the plan for the 2023 monsoon: boats stationed for the 2023 flood (page 216), NDRF stationing (706), 230 trees and branches fallen in the Adyar zone (703).

**6. Not used:** a TANGEDCO Junior Engineer contact per ward (200 ward tables; not compared with the contacts the app already shows), zone centroids (15 latitude and longitude pairs), park, playground and pump-set tables.

## Source files kept outside the repo (checksums)
These are the files behind the ward records, the IMD material and the gauge points. They are not in git (the 2024 plan is 56 MB); keep the originals, and use the checksums to confirm a re-downloaded copy is the same file.

| File | Bytes | SHA-256 | Used for |
|---|---|---|---|
| `chennai Gcc ddmp 2024.pdf` (GCC City DMP 2024) | 56,100,653 | `d8540435c42ff64f5fe5c26698b9ecc0cf73d65fc598df76a984c5f8441c0920` | ward inundation registers, 2023 list, relief-centre table, quote check |
| `26_0580dd_Michaung Report_Final_Sir.pdf` (IMD final report) | 3,442,876 | `c3d86a513eeed97888f8ec77d903df26848a925d27f11b47a6b6838c7b1df51d` | best track, gauge lists, observed wind, landfall |
| `rain guage statiosn.pdf` (Tamil Nadu gauge list, as on 2026-09-30) | 2,206,622 | `f1b00b8622c0fd1852e0500ede3cb2d642bb9bf991c6e143cea4fe382c6bd40b` | gauge coordinates |
| `20231203_pr_2669.pdf` (IMD press release, 3 Dec) | 1,544,247 | `63dc7e217b83e9386af26fcfdde9d688ca67524a6ceb6cd5128ca98c5c538fa7` | "IMD at the time" quotes |
| `20231204_pr_2671.pdf` (Press Release 4, 4 Dec) | 2,985,651 | `b17af3490e023064d85db9972b681dae606d5fdcda3c1263770eba51f39404ef` | "IMD at the time" quotes |
| `20231205_pr_2674.pdf` (Press Release 5, 5 Dec) | 3,094,181 | `d6c193cee145630987fe9315294260519a1c24f70bab3c6755c8b0b6889f4754` | "IMD at the time" quotes |
| `20231206_pr_2677.pdf` (Press Release 6, 6 Dec) | 515,841 | `b5b0463753053ab2ff861a12f0623211d9ac0eb1cc1995856bb83d7f3230d2a2` | later-bulletin reference |

The four IMD bulletins are at `https://internal.imd.gov.in/press_release/<file>`. Not yet recorded here: the OpenCity flood KML files in `surgegrid-ai-v2/data/external` (their checksums and download dates were never noted).

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
