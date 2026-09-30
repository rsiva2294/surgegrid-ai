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
**Screen:** Pick Cyclone Michaung (Dec 2023) in the Disaster Cockpit bar. Point at the timeline chips and the rain legend. Open the AI Directive.
**Say:** "This is a replay of Cyclone Michaung, using real NASA satellite rain and ERA5 wind, through Earth Engine. Not a simulation we made up. The map shows the rain of the last 24 hours in cells of about eleven kilometres, coloured on IMD's own rain classes. It is a satellite estimate, and we checked it station by station against IMD's own rain gauges: it holds about two-thirds to three-quarters of what the gauges recorded, and much less on the first day, so if anything we understate the storm. At 24 hours before the peak, the AI Directive lists the official actions for this step. Each one is a quote from the plan, with the plan name and page. Under each, the substations it applies to, chosen from our grid data."

## 1:35 - 2:15  Time moves
**Screen:** Press play. Five steps, six seconds each. Let the rain layer fill in, red rings appear, and the Exposed now list grow. Point at one cell to read its rain.
**Say:** "Press play. The timeline moves through five steps: two before the peak, the peak, and two after. The rain builds up cell by cell. A substation gets a red ring when it is flood-flagged, meaning a low yard or inside an official flood map, and its rain cell has heavy rain or worse over the last 24 hours. At the peak, eighty-six of the eighty-seven flood-flagged substations are exposed, and the full list is on the left. Point at a cell to read its rain in millimetres and its IMD class. The phase changes from watch to impact, and to restoration once the rain stops. The actions change with it, and each is still a quote. Under the timeline, IMD's own record for that moment is shown: the storm's observed position and strength, and its bulletin quoted. At the peak the storm is a cyclonic storm about a hundred and twenty-five kilometres off Chennai; at the last step it has just made landfall, about three hundred kilometres north."

## 2:15 - 2:55  One substation
**Screen:** Click a low-lying substation. Show the status line under the name, then the Overview tab (flood exposure, official flood maps, health score), then the Respond tab: the Copilot's quoted actions, relief centres, backup, then the contacts.
**Say:** "Open a low-lying substation. The line under its name shows its health and any live outage notice. The Overview tab has the flood facts: its yard elevation against Chennai's official 2.0 metre average, and only the official flood maps this spot falls in. That is a map check, not a prediction. On the Respond tab, the copilot comes first: quoted actions for this substation, with feeder names. Below are the Greater Chennai Corporation relief centres for the ward, and a nearby substation with none of the flood flags, as a backup suggestion."

## 2:55 - 3:15  Quiet when nothing applies
**Screen:** Click a substation outside every flood layer.
**Say:** "Now a substation inside no flood layer. The card stays quiet. No false alarms."

## 3:15 - 3:40  Gemini, with limits
**Screen:** Slide 7, or the Directive with a Gemini note visible.
**Say:** "Gemini 2.5 Flash on Google Cloud picks the names and writes one short note. It never writes or changes a quote. The answer format is fixed, names are filtered to our lists, and a note with a number that was not in the prompt is thrown away. If Gemini is down, the same quotes appear with rule-based notes. There is no API key in the app."

## 3:40 - 4:00  Honest close
**Screen:** Slide 9 (Track 5 fit), then the last slide with the URL and repo.
**Say:** "We are clear about the limits. One real storm, satellite rain in eleven-kilometre cells that read below IMD's gauges, no storm surge, no flood forecast, Chennai only for now. The flood maps you can switch on are fixed official layers, not this storm's flooding. What we built is a control-room tool you can trust, because nothing on screen is invented. SurgeGrid AI: the plan's own words, at the right substation, at the right hour. Try it at surgegrid.web.app."

---

## Recording checklist
- Total voiceover is about 520 words, so it should land near 4:00.
- Do not say: "predicts floods", "forecasts", "statutory trip", "simulates storm surge".
- Keep the cursor slow; zoom in on quotes and page numbers when you mention them.
- Show the quote and page number on screen for at least 3 seconds.
- End on the URL and repo link.
- If a step misbehaves on the live site (Gemini slow, a map tile late), cut it and re-record that section only.
