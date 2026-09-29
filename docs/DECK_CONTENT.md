# SurgeGrid AI: Pitch Deck Content (draft, 12 slides)

Track 5: Cyclone Impact & Infrastructure Vulnerability Forecaster. Every number below comes from the repo, the four official plans, or the measurements in `docs/PROJECT_LOG.md`. Live site: https://surgegrid.web.app

**Brief description (2-3 lines, for the submission form):**
SurgeGrid AI replays three real Chennai rain events hour by hour, shows which of 286 substations are exposed using official flood maps, and lists what the official disaster plans say to do, quoted with page numbers. Gemini adds short notes but never writes or changes the plan text.

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
- **Replays** three real rain events hour by hour (Michaung 2023, the 2015 floods, a Nov 2020 monsoon spell).
- **Shows exposure** for 286 substations: yard elevation and official flood-map checks.
- **AI Directive:** the official actions for this hour, each a quote with plan and page, and the substations they apply to.
- **Substation card:** flood facts, a copilot with quoted actions, GCC relief centres for the ward, and a backup suggestion.
*Note:* Show the four things in that order during the demo.

## 5. How it works
Real data (NASA IMERG rain, ERA5-Land wind, SRTM terrain, OpenCity GCC flood maps, TNEB grid, live TANGEDCO notices) → rules choose the phase and the substations → **37 word-for-word plan quotes** → Gemini 2.5 Flash words one short note → screen.
Runs on Google Maps Platform, Earth Engine (scenario data), Gemini via a Cloud Function, Firebase Hosting.
*Note:* Gemini is the last step and cannot change the quotes.

## 6. Real data, no synthetic storms
| Scenario | Peak rain | Total rain |
|---|---|---|
| Cyclone Michaung, Dec 2023 | 14.0 mm/h | 273 mm |
| 2015 floods | 23.4 mm/h | 372 mm |
| Monsoon spell, Nov 2020 | 16.8 mm/h | 198 mm |
- Grid: 286 substations, 2,678 feeders, 65,557 transformers, about 4.9 million consumers on mapped transformers.
- Official layers: 48 substations sit inside the 2015 flood extent; 114 inside the 100-year flood-hazard map; 162 GCC relief centres in 120 wards.
*Note:* We deleted our earlier synthetic cyclone. Everything replayed is real rain and wind.

## 7. The AI: what Gemini does, and does not do
- **Does:** choose substation and feeder names from lists we send; write one short note; runs on Google Cloud's Gemini Enterprise Agent Platform (formerly Vertex AI) with no API key in the app.
- **Does not:** write, reword or cite the plan quotes.
- **Guardrails:** fixed answer format; names filtered to our lists; a note with a number that was not in the prompt is discarded; if Gemini is down, the same quoted actions appear with rule-based notes.
*Note:* Meaningful AI work, with a safety design judges can inspect in `gemini-proxy/` and `geminiSopService.ts`.

## 8. Live demo (about 3 minutes)
1. Open the site; Michaung starts at T-24h. Show the AI Directive: 6 quoted actions with page numbers.
2. Press play at 4x; the directive moves to impact, then restoration.
3. Open a low-lying substation (ETL, -1 m): flood facts, official flood maps, copilot, relief centre and backup.
4. Open a substation not inside any layer: it stays quiet, no false alarms.
5. Switch to the 2015 scenario; toggle the relief-centre layer.
*Note:* End on the quote and page number: "this is the plan's own text".

## 9. Track 5 fit
| Brief asks | We deliver | Honest gap |
|---|---|---|
| Google Earth Engine + real met data | IMERG rain, ERA5-Land wind, SRTM via Earth Engine; Google Weather API | Wind is an area average |
| Simulate storm scenarios | Three real hindcasts, hour by hour | No storm surge or cyclone track |
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
- Live site: accessibility 100, desktop performance 91, mobile 54 (Lighthouse).
*Note:* This is proof of engineering judgement, not a weakness.

## 12. Roadmap and close
- Next: more cities; substation ranking by homes in officially mapped flood areas; hospital and shelter exposure; Tamil advisories; faster mobile load.
- Pilot path: a TANGEDCO or GCC control room uses it as a plan-lookup layer on its own grid data.
- **Close:** SurgeGrid AI puts the plan's own words in front of the operator, at the right substation and hour, and makes no rule up.
*Note:* Finish with the live URL and the repo.

---

## Speaker checklist
- Live URL and repo link on the last slide.
- Judging weights to keep in mind: AI/technical execution 25%; problem fit 20%; depth across India 20%; deployability 20%; impact 15%.
- Never say: "predicts floods", "forecasts", "statutory trip", "simulates storm surge". We replay real rain and quote plans.
