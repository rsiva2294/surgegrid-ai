# SurgeGrid AI: Demo Video Script (target 4:00, limit 3-5 min)

Record the live site (https://surgegrid.web.app), desktop, 1080p, with a voiceover. Speak slowly. About 130 words per minute. Check each on-screen step against the live site before recording, since the numbers below come from the deck.

Before recording: open the site fresh, dark or light theme (pick one), close other tabs, zoom the browser to 100%, and do one dry run so the Gemini note is cached.

---

## 0:00 - 0:25  Hook (slide 2 or the site's map)
**Screen:** Title slide, then cut to the Chennai map.
**Say:** "Chennai sits about two metres above sea level. In 2015, water reached six feet inside substations, and 41 were switched off. The disaster plans exist. But in the middle of a storm, a control room has minutes to find the right line for the right substation. SurgeGrid AI does that lookup."

## 0:25 - 0:50  The rule (slide 3)
**Screen:** Slide 3, then back to the site.
**Say:** "The official plans say supply may be switched off 'if required'. They never give a wind speed or flood depth. Most tools invent one. We checked four plans and removed every rule they don't contain. Everything you'll see is a word-for-word quote with a page number, real data with a source, or our own calculation, labelled as ours."

## 0:50 - 1:35  Replay a real storm
**Screen:** Pick Cyclone Michaung (Dec 2023) in the Disaster Cockpit bar. Point at the rain and wind readouts. Open the AI Directive.
**Say:** "This is a replay of Cyclone Michaung, using real NASA rain data and ERA5 wind, through Earth Engine. Not a simulation we made up. At 24 hours before the peak, the AI Directive lists the official actions for this hour. Each one is a quote from the plan, with the plan name and page. Under each, the substations it applies to, chosen from our grid data: the lowest-lying yards, overhead feeders, hospital and water feeders."

## 1:35 - 2:05  Time moves
**Screen:** Press play at 4x. Let the phase change to impact, then restoration. The directive updates.
**Say:** "Press play. As the rain peaks, the phase changes from watch to impact. When the rain stops, it moves to restoration. The phase comes only from the rain data. The actions change with it, and each is still a quote."

## 2:05 - 2:55  One substation
**Screen:** Click a low-lying substation. Show the Civic & Crisis tab: flood exposure, official flood maps, copilot, relief centres, backup.
**Say:** "Open a low-lying substation. Its yard elevation is compared with Chennai's official 2.0 metre average. Then we show only the official flood maps this spot falls in: the 2015 satellite flood extent and the hazard maps. That is a map check, not a prediction. The copilot lists quoted actions for this substation, with feeder names. Below that are the Greater Chennai Corporation relief centres for the ward, and a nearby substation with none of the flood flags, as a backup suggestion."

## 2:55 - 3:15  Quiet when nothing applies
**Screen:** Click a substation outside every flood layer.
**Say:** "Now a substation inside no flood layer. The card stays quiet. No false alarms."

## 3:15 - 3:40  Gemini, with limits
**Screen:** Slide 7, or the Directive with a Gemini note visible.
**Say:** "Gemini 2.5 Flash on Google Cloud picks the names and writes one short note. It never writes or changes a quote. The answer format is fixed, names are filtered to our lists, and a note with a number that was not in the prompt is thrown away. If Gemini is down, the same quotes appear with rule-based notes. There is no API key in the app."

## 3:40 - 4:00  Honest close
**Screen:** Slide 9 (Track 5 fit), then the last slide with the URL and repo.
**Say:** "We are clear about the limits. Rain scenarios only, no storm surge, no forecast, Chennai only for now. What we built is a control-room tool you can trust, because nothing on screen is invented. SurgeGrid AI: the plan's own words, at the right substation, at the right hour. Try it at surgegrid.web.app."

---

## Recording checklist
- Total voiceover is about 520 words, so it should land near 4:00.
- Do not say: "predicts floods", "forecasts", "statutory trip", "simulates storm surge".
- Keep the cursor slow; zoom in on quotes and page numbers when you mention them.
- Show the quote and page number on screen for at least 3 seconds.
- End on the URL and repo link.
- If a step misbehaves on the live site (Gemini slow, a map tile late), cut it and re-record that section only.
