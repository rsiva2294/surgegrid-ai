# SurgeGrid AI: Demo Video Script (target 4:40, limit 3-5 min)

Record the live site (https://surgegrid.web.app), desktop, 1080p, with a voiceover. Speak slowly. About 130 words per minute. Check each on-screen step against the live site before recording, since the numbers below come from the deck.

Before recording: open the site fresh, dark or light theme (pick one), close other tabs, zoom the browser to 100%, and do one dry run so the Gemini note is cached.

---

## 0:00 - 0:25  Hook (slide 2 or the site's map)
**Screen:** Title slide, then cut to the Chennai map.
**Say:** "Chennai sits about two metres above sea level. In 2015, water reached six feet inside substations, and 41 were switched off. The disaster plans exist. But in the middle of a storm, a control room has minutes to find the right line for the right substation, and the right person to call. SurgeGrid AI does that lookup."

## 0:25 - 0:45  The rule (slide 3)
**Screen:** Slide 3, then back to the site.
**Say:** "The official plans say supply may be switched off 'if required'. They never give a wind speed or flood depth. Most tools invent one. We use only what the four plans say. Everything you'll see is a word-for-word quote with a page number, real data with a source, or our own calculation, labelled as ours."

## 0:45 - 1:15  Live Chennai
**Screen:** The live map. Point at the weather pill, then click the reservoir pill and let the six reservoirs show. Open a substation's status line, then the live outage banner.
**Say:** "This is Chennai's grid, live. Two hundred and eighty-six substations, three hundred and fifty-two section offices, and nearly three thousand feeders, with live outage notices matched to assets and a health grade for each substation. In the top bar: today's weather, and the combined storage of Chennai's six supply reservoirs, straight from the water board, with each reservoir one click away."

## 1:15 - 2:00  Replay a real storm
**Screen:** Pick Cyclone Michaung (Dec 2023) in the Disaster Cockpit bar. Point at the timeline chips and the rain legend. Open the AI Directive.
**Say:** "Now a replay of Cyclone Michaung, using real NASA satellite rain and ERA5 wind, through Earth Engine. The map shows the last 24 hours of rain in cells of about eleven kilometres, coloured on IMD's own rain classes, and we checked it station by station against IMD's own rain gauges. At 24 hours before the peak, the AI Directive lists the official actions for this step. Each one is a quote from the plan, with the plan name and page. Under each, the substations it applies to, chosen from our grid data."

## 2:00 - 2:40  Time moves
**Screen:** Tick "Animate between steps" in the storm panel first (it starts off if the computer asks for reduced motion). Click "Show whole storm", then press play. Five steps, six seconds each; between steps the hours play through and the storm marker slides along IMD's track to the landfall point. Let the rain layer fill in, red rings appear, and the Exposed now list grow. Point at one cell to read its rain.
**Say:** "Press play. Five steps: two before the peak, the peak, and two after. The rain builds up cell by cell. A substation gets a red ring when it is flood-flagged, meaning a low yard or inside an official flood map, and its rain cell has heavy rain or worse. At the peak, eighty-six of the eighty-seven flood-flagged substations are exposed, and the full list is on the left. The squares are IMD's own rain gauges, and under the timeline is IMD's own record for that moment: the storm's observed position, strength and bulletin. The phase changes from watch to impact to restoration, and the actions change with it."

## 2:40 - 3:30  One substation, and who to call
**Screen:** Click a low-lying substation. Show the status line, the Overview tab (flood exposure, official flood maps, health score), then the Respond tab: the Copilot's quoted actions, relief centres, backup substation, the nearest sewerage pumping station with the plan's line on pumping stations.
**Say:** "Open a low-lying substation. The Overview has the flood facts: its yard elevation against Chennai's official two-metre average, and the official flood maps this spot falls in. On the Respond tab, the copilot's quoted actions come first. Below them: the Greater Chennai Corporation relief centres for the ward, a nearby substation with none of the flood flags as a backup, and the nearest sewerage pumping station, next to the power-sector plan's own line: restore pumping stations on a priority basis."

## 3:30 - 4:05  From plan to phone call
**Screen:** Switch on Relief centres, click a diamond: capacity, amenities, officer contacts, Directions. Then open a section office: Call Section AE, Email, View on Google Maps, feeding substations, ward shelters.
**Say:** "Every relief centre shows capacity, cooking, water and toilets, the officers to call, and directions. Open a section office, and the next step is one tap: call the section engineer, email the office, open it on the map. With the feeding substations and the ward's shelters beside it. From the plan's words to the person who acts."

## 4:05 - 4:25  Gemini, with limits
**Screen:** Slide 7, or the Directive with a Gemini note visible.
**Say:** "Gemini 2.5 Flash on Google Cloud picks the names and writes one short note. It never writes or changes a quote. The answer format is fixed, names are filtered to our lists, and a note with a number that was not in the prompt is thrown away. There is no API key in the app."

## 4:25 - 4:40  Close
**Screen:** Slide 9 (Track 5 fit), then the last slide with the URL and repo.
**Say:** "SurgeGrid AI is a control-room tool you can trust, because nothing on screen is invented. Live grid, real rain, official maps, quoted plans, and the right people one tap away. The plan's own words, at the right substation, at the right hour. Try it at surgegrid.web.app."

---

## Recording checklist
- Total voiceover is about 610 words, so it should land near 4:40. If it runs over 5:00, trim the live-Chennai or the section-office paragraph.
- Do not say: "predicts floods", "forecasts", "statutory trip", "simulates storm surge".
- Keep the cursor slow; zoom in on quotes and page numbers when you mention them.
- Show the quote and page number on screen for at least 3 seconds.
- Before recording, check the reservoir pill shows (it appears in Live mode only, top bar) and switch on the Relief centres layer.
- End on the URL and repo link.
- If a step misbehaves on the live site (Gemini slow, a map tile late), cut it and re-record that section only.
