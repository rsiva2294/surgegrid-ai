# SurgeGrid AI: Pitch Deck Content (draft, 12 slides)

Track 5: Cyclone Impact & Infrastructure Vulnerability Forecaster. Every number below comes from the repo, the four official plans, or the measurements in `docs/PROJECT_LOG.md`. Live site: https://surgegrid.web.app

**Brief description (2-3 lines, for the submission form):**
SurgeGrid AI replays Cyclone Michaung (December 2023) in five steps on a map of Chennai: real satellite rain by area, official flood maps, and which of 286 substations are exposed. It lists what the official disaster plans say to do, quoted with page numbers. Gemini adds short notes but never writes or changes the plan text.

---

## 1. Title
**SurgeGrid AI: what the plan says, at the substation, at the right hour**
Chennai's power grid and flood console. Real rain, official maps, quoted plans.
*Note:* One line: we built a tool a control room can trust because nothing on screen is invented.

## 2. The problem
- Chennai averages "barely 2.0 m above mean sea level" (GCC plan).
- 2015 floods: water up to 6 feet in substations; 41 substations kept off (TANGEDCO plan).
- Vardah 2016: supply cut in many parts; fallen trees delayed restoration.
- The plans exist, but a control room has minutes, not hours, to find the right line for the right substation.
*Note:* The pain is not missing plans. It is finding and applying them under pressure.

## 3. Our insight
- The plans say supply may be switched off "if required". They give **no** wind speed or flood depth that forces it.
- Many tools invent thresholds and present them as rules. We checked four plans and removed every rule the plans do not contain.
- So SurgeGrid shows an **operator decision**, backed by the exact quote.
*Note:* This is our differentiator: trust. A wrong invented trip level is worse than none.

## 4. What SurgeGrid does
- **Replays** Cyclone Michaung (Dec 2023) in five steps: two before the peak-rain hour, the peak, two after. The map shows the last 24 hours of rain by area (about 11 km cells) at each step.
- **Shows exposure** for 286 substations: yard elevation, official flood-map checks, and an "exposed now" list at each step (flood-flagged and in heavy rain or worse).
- **AI Directive:** the official actions for this hour, each a quote with plan and page, and the substations they apply to.
- **Substation card:** flood facts, a copilot with quoted actions, GCC relief centres for the ward, and a backup suggestion.
*Note:* Show the four things in that order during the demo.

## 5. How it works
Real data (NASA IMERG rain, ERA5-Land wind, SRTM terrain, OpenCity GCC flood maps, TNEB grid, live TANGEDCO notices) → rules choose the phase and the substations → **37 word-for-word plan quotes** → Gemini 2.5 Flash words one short note → screen.
Runs on Google Maps Platform, Earth Engine (scenario data), Gemini via a Cloud Function, Firebase Hosting.
*Note:* Gemini is the last step and cannot change the quotes.

## 6. Real data, no synthetic storms
| Michaung, Dec 2023 | Satellite cells (28) | IMD gauges, Chennai district |
|---|---|---|
| Rain, 24 h to 08:30 IST 3 Dec | 13 to 37 mm | 70 to 100 mm (16 stations) |
| Rain, 24 h to 08:30 IST 4 Dec | 106 to 184 mm | 70 to 290 mm (50 stations) |
| Whole event, area mean | 273 mm (peak 14.0 mm/h) | not reported |
- **We show that our satellite rain reads below IMD's own gauges, and we do not scale it up.** The satellite cell held about a third of the gauge total on 3 Dec and about two-thirds to three-quarters afterwards, so the early steps look quieter than the gauges say (IMD's lists start at about 7 cm, so they are a floor). On 4 Dec 13 of 50 Chennai stations recorded 204.5 mm or more; no satellite cell does.
- Rain classes are IMD's (Heavy 64.5 mm, Very heavy 115.6 mm, Extremely heavy 204.5 mm), applied to a rolling 24-hour total of NASA IMERG satellite rain averaged over about 11 km cells.
- Substations exposed on the satellite rain (flood-flagged and heavy rain or worse): 0 at T-24h and T-6h, 86 at the peak, 87 at T+12h, 74 at T+36h, of 87 flood-flagged; the early counts are probably too low.
- Grid: 286 substations, 2,678 feeders, 65,557 transformers, about 4.9 million consumers on mapped transformers.
- Official layers: 48 substations sit inside the 2015 flood extent; 114 inside the 100-year flood-hazard map; 162 GCC relief centres in 120 wards.
*Note:* We deleted our earlier synthetic cyclone, and two other events, to focus on one real storm. Everything replayed is real rain and wind. We do not draw flood water: none of our flood data has a time in it. Judges reward the honest comparison with IMD's gauges.

## 7. The AI: what Gemini does, and does not do
- **Does:** choose substation and feeder names from lists we send; write one short note, and on a live day a short summary of our data (facts shown under the card); runs on Google Cloud's Gemini Enterprise Agent Platform (formerly Vertex AI) with no API key in the app.
- **Does not:** write, reword or cite the plan quotes.
- **Guardrails:** fixed answer format; names filtered to our lists; a note with a number that was not in the prompt is discarded; if Gemini is down, the same quoted actions appear with rule-based notes.
*Note:* Meaningful AI work, with a safety design judges can inspect in `gemini-proxy/` and `geminiSopService.ts`.

## 8. Live demo (about 3 minutes)
1. Open the site and pick Cyclone Michaung; it starts at T-24h. The satellite rain layer is nearly clear (IMD's gauges had already recorded 70 to 100 mm; say so). Open the AI Directive: 6 quoted actions with page numbers.
2. Press play. The timeline moves through five steps, 6 seconds each (T-24h, T-6h, peak rain, T+12h, T+36h): the rain layer fills in by cell, red rings appear on exposed substations, and the "Exposed now" list grows from 0 to 87 and back to 74. The phase moves from watch to impact to restoration.
3. Point at a cell: it reads the mm of rain in the last 24 hours and its IMD class. Under the timeline, "IMD at the time" shows IMD's observed storm position, grade and wind for that moment (from its final report) and quotes its bulletin; at T+12h the storm is a severe cyclonic storm about 85 km from Chennai, and at T+36h it has just made landfall about 300 km north.
4. Switch on the official flood maps (fixed layers): the 2015 extent (a past event) and the 100-year hazard map.
5. Open a low-lying substation (ETL, -1 m): status line, Overview (flood facts), then Respond: copilot's quoted actions, relief centre and backup.
6. Open a substation not inside any layer: it stays quiet, no false alarms.
*Note:* End on the quote and page number: "this is the plan's own text".

## 9. Track 5 fit
| Brief asks | We deliver | Honest gap |
|---|---|---|
| Google Earth Engine + real met data | IMERG rain, ERA5-Land wind, SRTM via Earth Engine; Google Weather API | Wind is an area average |
| Simulate storm scenarios | One real hindcast (Michaung) in five steps, with rain by area | No storm surge or cyclone track; no flood depth or extent prediction |
| Map exposure of power grids and shelters | 286 substations with official flood-map checks; 162 relief centres by ward | Relief-centre coordinates not in the GCC list |
| Early-warning advisories | Quoted actions per hour and per substation; copy-SMS with a quoted action | No automatic dispatch |
| Gemini reasoning | Gemini 2.5 Flash notes with guardrails | Not multimodal |
*Note:* Judges reward honesty here; say the gaps out loud.

## 10. Built for India, deployable now
- **Live today:** https://surgegrid.web.app, static hosting plus one small Cloud Function; keyless Gemini access, origin allow-list and rate limit.
- **National by design:** the MoP 2021 power-sector plan and IMD cyclone classes apply across India; city plans (like GCC's) plug in as another set of quotes.
- **Repeatable:** the scenario builder takes any area and date; city-specific inputs sit in one config file.
- **Today it is Chennai only.** A new city needs its grid data, its local plan and its flood layers.
*Note:* Do not claim more than this; present it as the roadmap.

## 11. Evidence and honesty
- Every plan statement: word for word, with plan and page; 37 quotes each checked against the PDF text.
- What we removed because no plan says it: wind and flood trip limits, restoration hours, a five-stage protocol, plinth heights, gang and pump counts.
- Our own flood-proneness score matched the city's 53 flood hotspots (AUC 0.76) but not the 2015 satellite map, so **we show official map checks, not model depths**.
- Our satellite rain reads below IMD's gauges (median 147 against 190 mm at 16 matched stations on 4 Dec) and our wind (37 km/h) below IMD's Chennai stations (56 to 68 km/h). We show both and do not correct them.
- Live site: accessibility 100, desktop performance 91, mobile 54 (Lighthouse).
*Note:* This is proof of engineering judgement, not a weakness.

## 12. Roadmap and close
- Next: more storms and cities; substation ranking by homes in officially mapped flood areas; hospital and shelter exposure; finer rain data; Tamil advisories; faster mobile load.
- Pilot path: a TANGEDCO or GCC control room uses it as a plan-lookup layer on its own grid data.
- **Close:** SurgeGrid AI puts the plan's own words in front of the operator, at the right substation and hour, and makes no rule up.
*Note:* Finish with the live URL and the repo.

---

## Speaker checklist
- Live URL and repo link on the last slide.
- Judging weights to keep in mind: AI/technical execution 25%; problem fit 20%; depth across India 20%; deployability 20%; impact 15%.
- Never say: "predicts floods", "forecasts", "statutory trip", "simulates storm surge". We replay real rain and quote plans.
