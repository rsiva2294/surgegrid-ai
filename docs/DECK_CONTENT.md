# SurgeGrid AI: Pitch Deck Content (draft, 12 slides)

Track 5: Cyclone Impact & Infrastructure Vulnerability Forecaster. Every number below comes from the repo, the four official plans, or the measurements in `docs/PROJECT_LOG.md`. Live site: https://surgegrid.web.app

**Brief description (2-3 lines, for the submission form):**
SurgeGrid AI is a live control-room console for Chennai's power grid and flood risk, and a replay of Cyclone Michaung (December 2023) with real satellite rain, official flood maps and the substations exposed at each step. Every action it suggests is a quote from the official disaster plans, with the page number, placed at the right substation and hour, with one-tap contacts for the people who act. Gemini adds short notes, but never writes or changes the plan text.

---

## 1. Title
**SurgeGrid AI: what the plan says, at the substation, at the right hour**
Chennai's power grid and flood console. Live grid, real rain, official maps, quoted plans.
*Note:* One line: a control-room tool you can trust, because nothing on screen is invented.

## 2. The problem
- Chennai averages "barely 2.0 m above mean sea level" (GCC plan).
- 2015 floods: water up to 6 feet in substations; 41 substations kept off (TANGEDCO plan).
- Vardah 2016: supply cut in many parts; fallen trees delayed restoration.
- The plans exist, but a control room has minutes, not hours, to find the right line for the right substation, and the right person to call.
*Note:* The pain is not missing plans. It is finding and applying them under pressure.

## 3. Our insight
- The plans say supply may be switched off "if required". They give **no** wind speed or flood depth that forces it.
- Many tools invent thresholds and present them as rules. We checked four plans and kept only what they actually say.
- So SurgeGrid shows an **operator decision**, backed by the exact quote, next to the people and places that matter: the section office, the relief centre, the pumping station.
*Note:* This is our differentiator: trust. A wrong invented trip level is worse than none.

## 4. What SurgeGrid does
- **Live grid view:** 286 substations, 352 section offices, 2,678 feeders and 65,557 transformers on one map, with live TANGEDCO outage notices matched to assets, a health grade per substation, live weather, and the Chennai reservoirs' storage in the app bar.
- **Storm replay:** Cyclone Michaung (Dec 2023) in five steps. The map shows the last 24 hours of rain by area (about 11 km cells) on IMD's own classes, IMD's rain gauges, and the storm's real track to landfall.
- **Exposure:** yard elevation, official flood-map checks and a "Sites to check" list at each step (sites with a flood record and heavy rain or worse).
- **AI Directive and Copilot:** the official actions for this hour, each a quote with plan and page, and the substations they apply to. Gemini words one short note.
- **Responder hub:** for any substation or section office: relief centres with directions and officer contacts, a nearby backup substation, nearest sewerage pumping station, and one-tap call, email and map.
*Note:* Show them in that order: live, replay, exposure, directive, responders.

## 5. How it works
Real data (NASA IMERG rain, ERA5-Land wind, SRTM terrain, OpenCity GCC flood maps, TNEB grid, live TANGEDCO notices, CMWSSB reservoir levels, TNGIS pumping stations) → rules choose the phase and the substations → **37 word-for-word plan quotes** → Gemini 2.5 Flash words one short note → screen.
Runs on Google Maps Platform, Earth Engine (scenario data), Gemini via a Cloud Function, Firebase Hosting and Cloud Functions.
*Note:* Gemini is the last step and cannot change the quotes.

## 6. Real data, checked against the gauges
| Michaung, Dec 2023 (median over matched gauges) | Satellite cell | IMD gauge |
|---|---|---|
| 24 h to 08:30 IST 3 Dec (7 stations) | 30 mm | 80 mm |
| 24 h to 08:30 IST 4 Dec (16 stations) | 147 mm | 195 mm |
| 24 h to 08:30 IST 5 Dec (10 stations) | 115 mm | 170 mm |
| Whole event, area mean | 273 mm (peak 14.0 mm/h) | not reported |
- **We checked our satellite rain against IMD's own gauges, station by station, and show the comparison on the map.** The IMD gauges appear as squares beside the satellite cell's value. We do not scale the satellite up: what you see is what NASA measured.
- Rain classes are IMD's (Heavy 64.5 mm, Very heavy 115.6 mm, Extremely heavy 204.5 mm), applied to a rolling 24-hour total averaged over about 11 km cells.
- Sites to check (a flood record and heavy rain or worse, satellite or nearest IMD gauge): 0 at T-24h, 88 at T-6h, 111 at the peak and at T+12h, 106 at T+36h, of 111 sites with a flood record (94 check first and 17 check next at the peak). The separate waterlogging filter counts 87, a stricter rule.
- Grid: 286 substations, 2,678 feeders, 65,557 transformers, about 4.9 million consumers on mapped transformers.
- Official layers: 48 substations sit inside the 2015 flood extent; 114 inside the 100-year flood-hazard map; 162 GCC relief centres in 120 wards; 124 CMWSSB sewerage pumping stations (TNGIS).
*Note:* Judges reward the honest comparison with IMD's gauges. Everything replayed is real rain and wind.

## 7. The AI: what Gemini does, and does not do
- **Does:** choose substation and feeder names from lists we send; write one short note, and on a live day a short summary of our data (facts shown under the card); runs on Google Cloud's Gemini Enterprise Agent Platform (formerly Vertex AI) with no API key in the app.
- **Does not:** write, reword or cite the plan quotes.
- **Guardrails:** fixed answer format; names filtered to our lists; a note with a number that was not in the prompt is discarded; if Gemini is down, the same quoted actions appear with rule-based notes.
*Note:* Meaningful AI work, with a safety design judges can inspect in `gemini-proxy/` and `geminiSopService.ts`.

## 8. Live demo (about 4 minutes)
1. **Live.** Open the site. Point at the weather pill and the reservoir pill (combined storage, click for each reservoir, source CMWSSB). Show live outage notices and a substation's health grade.
2. **Replay.** Pick Cyclone Michaung. The rain layer is nearly clear at T-24h (IMD's gauges had already recorded 70 to 100 mm; say so). Open the AI Directive: 6 quoted actions with page numbers.
3. **Time moves.** Press play: five steps, 6 seconds each (T-24h, T-6h, peak rain, T+12h, T+36h). The rain fills in by cell, red and orange rings appear on sites to check, the "Sites to check" list grows from 0 to 111 and eases to 106. The storm marker slides along IMD's track to landfall; "IMD at the time" shows its bulletin.
4. **Official flood maps.** Switch on the 2015 extent and the 100-year hazard map.
5. **One substation.** Open a low-lying one (ETL, -1 m): Overview (flood facts), then Respond: the copilot's quoted actions, relief centres, backup substation, nearest sewerage pumping station with the MoP line on restoring pumping stations first.
6. **Responders.** Switch on Relief centres and click a diamond: capacity, cooking, water, toilets, officer contacts, directions. Open a section office: call the Section AE, email, open the office on Google Maps, see the feeding substations and the ward's shelters.
7. **Quiet when nothing applies.** Open a substation inside no flood layer: no false alarms.
*Note:* End on a quote and its page number: "this is the plan's own text".

## 9. Track 5 fit
| The brief asks for | What SurgeGrid delivers |
|---|---|
| Google Earth Engine and real meteorological data | NASA IMERG rain, ERA5-Land wind and SRTM terrain through Earth Engine; live weather from the Google Maps Weather API; IMD rain gauges and IMD's observed cyclone track |
| Gemini reasoning | Gemini 2.5 Flash picks targets and writes notes inside strict guardrails, on Google Cloud with no API key in the app |
| Exposure of critical infrastructure | 286 substations with official flood-map checks, 352 section offices, 2,678 feeders, 162 relief centres, 124 sewerage pumping stations, reservoir storage |
| Early-warning advisories for local authorities | Quoted plan actions per hour and per substation, copy-ready dispatch text with ward contacts, one-tap call and email to the section office |
| Municipal and disaster-management coordination | GCC zone and ward contacts, relief-centre officers, CMWSSB and GCC engineers shown next to each substation |
*Note:* Lead with the strengths: real data, quoted plans, and the control room's next action, one tap away.

## 10. Built for India, deployable now
- **Live today:** https://surgegrid.web.app, static hosting plus two small Cloud Functions; keyless Gemini access, origin allow-lists and rate limits.
- **National by design:** the MoP 2021 power-sector plan and IMD cyclone classes apply across India; city plans (like GCC's) plug in as another set of quotes.
- **Repeatable:** the scenario builder takes any area and date from global NASA and ECMWF data; city-specific inputs sit in one config file. The same method works for any coastal city with a grid map and a disaster plan, in India or in other BRICS countries.
- **Open public data:** TNEB and TANGEDCO notices, OpenCity GCC flood maps, TNGIS, CMWSSB, IMD, NASA.
*Note:* Present Chennai as the first city, and the method as the product.

## 11. Evidence and honesty
- Every plan statement: word for word, with plan and page; 37 quotes each checked against the PDF text.
- What we left out because no plan says it: wind and flood trip limits, restoration hours, plinth heights, gang and pump counts. Nothing on screen is invented.
- Flood facts are official map checks, not model depths: our own flood-proneness score matched the city's 53 flood hotspots (AUC 0.76), and we chose to show the official maps.
- Satellite rain and wind are shown next to IMD's own gauge and station readings.
- Live site: accessibility 100, desktop performance 91 (Lighthouse).
*Note:* This is proof of engineering judgement.

## 12. Roadmap and close
- Next: more storms and cities; substation ranking by homes in officially mapped flood areas; hospital and shelter exposure; storm-drain and manhole layer (TNGIS); Tamil advisories.
- Pilot path: a TANGEDCO or GCC control room uses it as a plan-lookup and dispatch layer on its own grid data.
- **Close:** SurgeGrid AI puts the plan's own words in front of the operator, at the right substation and hour, with the right people one tap away.
*Note:* Finish with the live URL and the repo.

---

## Speaker checklist
- Live URL and repo link on the last slide.
- Judging weights to keep in mind: AI/technical execution 25%; problem fit 20%; depth across India 20%; deployability 20%; impact 15%.
- Lead every slide with what the app does. Words to avoid, because they overclaim: "predicts floods", "forecasts", "statutory trip", "simulates storm surge".
