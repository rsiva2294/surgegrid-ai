# SurgeGrid AI: Demo Video Script (limit 3-5 min; times are a guide, speed up portions in the edit if it runs long)

Record the live site (https://surgegrid.web.app), desktop, 1080p, with a voiceover. Speak slowly. About 130 words per minute. Check each on-screen step against the live site before recording, since the numbers below come from the deck.

Before recording: open the site fresh, dark or light theme (pick one), close other tabs, zoom the browser to 100%.

---

## 0:00 - 0:25  Hook
**Screen:** The Chennai map, held while the voiceover plays (no slides).
**Say:** "Chennai sits about two metres above sea level. In 2015, water reached six feet inside substations, and 41 were switched off. The disaster plans exist. But in the middle of a storm, a control room has minutes to find the right line for the right substation, and the right person to call. SurgeGrid AI does that lookup."

## 0:25 - 0:45  The rule
**Screen:** The Chennai map, unchanged.
**Say:** "The official plans say supply may be switched off 'if required'. They never give a wind speed or flood depth. Most tools invent one. We use only what the four plans say. Everything you'll see is a word-for-word quote with a page number, real data with a source, or our own calculation, labelled as ours."

## 0:45 - 1:15  Live Chennai
**Screen:** The live map. Point at the weather pill, then click the reservoir pill and let the six reservoirs show. Open a substation's status line, then the live outage banner.
**Say:** "This is Chennai's grid, live. Two hundred and eighty-six substations, three hundred and fifty-two section offices, and nearly three thousand feeders, with live outage notices matched to assets and a health grade for each substation. In the top bar: today's weather, and the combined storage of Chennai's six supply reservoirs, straight from the water board, with each reservoir one click away."

## 1:15 - 2:05  Live triage and outages
**Screen:** Click "Poor Stability (<75)": the list of grade D and C substations; click the top one, Velacherry (Grade D, 15/100, three live outage notices today, inside the 2015 flood extent); scroll its card to the health model and the 90-day incident log. Click "Waterlogging Risk": the list, lowest yard first, ETL SS at minus 1 m on top. Click "Live Outages" and show the outage list with the causes and times. Click Clear.
**Say:** "Three chips under the top bar triage the whole grid. Poor stability lists the substations whose health score is below seventy-five, built from their forced trips and maintenance record. Velacherry is grade D, fifteen out of a hundred, with three live outage notices today and a place inside the 2015 flood extent. Waterlogging risk lists the substations with a low yard, inside the 2015 flood extent, or rated moderate or high on the official flood maps, lowest first. ETL sits at minus one metre. And Live outages shows today's notices from the utility, matched to substations, with the cause and the time window."

## 2:05 - 2:50  Replay a real storm
**Screen:** Pick Cyclone Michaung (Dec 2023) in the Disaster Cockpit bar. Point at the timeline chips and the rain legend. Open the AI Directive.
**Say:** "Now a replay of Cyclone Michaung, using real NASA satellite rain and ERA5 wind, through Earth Engine. The map shows the last 24 hours of rain in cells of about eleven kilometres, coloured on IMD's own rain classes, and we checked it station by station against IMD's own rain gauges. At 24 hours before the peak, the AI Directive lists the official actions for this step. Each one is a quote from the plan, with the plan name and page. Under each, the substations it applies to, chosen from our grid data."

## 2:50 - 3:30  Time moves
**Screen:** In the "Storm on the map" panel, check "Animate between steps" is ticked (it starts off if the computer asks for reduced motion), and untick "Open at each step" in the AI Directive so it does not pop up during play. Then press play. Five steps, six seconds each; between steps the hours play through and the storm marker slides along IMD's track to the landfall point. Let the rain layer fill in, red rings appear, and the "Sites to check" list on the left fill. Point at one cell to read its rain.
**Say:** "Press play. Five steps: two before the peak, the peak, and two after. The rain builds up cell by cell. A substation with a flood record gets a ring when its rain is heavy or worse: red for "check first" when the flood fact is strong, like the 2015 flood extent, orange for "check next" when it is weaker. Nothing is listed at the first step. At six hours before the peak, eighty-eight of our hundred and eleven flood-record sites already have heavy rain. At the peak, all hundred and eleven are listed, ninety-four of them check first, and the full list is on the left. The squares are IMD's own rain gauges, and under the timeline is IMD's own record for that moment: the storm's observed position, strength and bulletin. The phase changes from watch to impact to restoration, and the actions change with it."

## 3:30 - 4:30  One substation, its circuits, and who to call
**Screen:** Search "ETL" and open 110/33-11 KV ETL SS (yard at minus 1 m). Show the status line, the Overview tab (flood exposure, official flood maps, health score), then the Feeders tab: the list of 11 circuits, the Lifelines filter (the dedicated commercial line to Telephone Nagar), then "View on Map" on "ETL to Madipakkam", the 33 kV inter-substation trunk, drawn across the map; click Dismiss. Then the Respond tab: the Copilot's quoted actions, relief centres, backup substation, the nearest sewerage pumping station with the plan's line on pumping stations.
**Say:** "Open a low-lying substation, ETL in Pallikaranai. The Overview has the flood facts: its yard elevation of minus one metre against Chennai's official two-metre average, and the official flood maps this spot falls in. The Feeders tab lists its eleven circuits, and the Lifelines filter picks out the feeders that serve hospitals, water works or a dedicated commercial line. One tap on View on Map draws a circuit on the grid: here is the thirty-three kilovolt trunk that links ETL to Madipakkam. On the Respond tab, the copilot's quoted actions come first. Below them: the Greater Chennai Corporation relief centres for the ward, a nearby substation with none of the flood flags as a backup, and the nearest sewerage pumping station, next to the power-sector plan's own line: restore pumping stations on a priority basis."

## 4:30 - 5:05  From plan to phone call
**Screen:** Switch on Relief centres, click a diamond: capacity, amenities, officer contacts, View Place (opens the map). Then open a section office: Call Section AE, Email, View on Google Maps, feeding substations, ward shelters.
**Say:** "Every relief centre shows capacity, cooking, water and toilets, the officers to call, and a link to open the place on the map. Open a section office, and the next step is one tap: call the section engineer, email the office, open it on the map. With the feeding substations and the ward's shelters beside it. From the plan's words to the person who acts."

## 5:05 - 5:25  Gemini, with limits
**Screen:** Open ETL SS > Overview and scroll to its copilot actions, where the line "Gemini 2.5 Flash, wording only, quotes are official" sits under the quoted actions. Or the AI Directive header, which carries the same line. (No Gemini note text appeared in the Directive at the peak in the dry run; do not rely on one.)
**Say:** "Gemini 2.5 Flash on Google Cloud picks the names and writes one short note. It never writes or changes a quote. The answer format is fixed, names are filtered to our lists, and a note with a number that was not in the prompt is thrown away. There is no API key in the app."

## 5:25 - 5:40  Close
**Screen:** The live site with the URL visible. Add the repo link as a text overlay in the edit.
**Say:** "SurgeGrid AI is a control-room tool you can trust, because nothing on screen is invented. Live grid, real rain, official maps, quoted plans, and the right people one tap away. The plan's own words, at the right substation, at the right hour. Try it at surgegrid.web.app."

---

## Recording checklist
- The voiceover is now about 730 words, so it lands near 5:40. The limit is 5:00: speed up the quiet stretches (the five-step playback, scrolling, loading) in the edit.
- Do not say: "predicts floods", "forecasts", "statutory trip", "simulates storm surge".
- Keep the cursor slow; zoom in on quotes and page numbers when you mention them.
- Show the quote and page number on screen for at least 3 seconds.
- Before recording, check the reservoir pill shows (it appears in Live mode only, top bar) and switch on the Relief centres layer.
- End on the URL and repo link.
- If a step misbehaves on the live site (Gemini slow, a map tile late), cut it and re-record that section only.
