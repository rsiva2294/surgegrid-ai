# SurgeGrid AI — Project Log

> Running log of what we decided and did, so a new chat can pick up context fast.
> Newest entries at the bottom. Update this after every step.

## Working rules (from the owner)
- **Always discuss the plan and get approval before writing code.** (Docs/log edits are fine when explicitly requested.)
- **Keep answers short, plain, non-technical.**
- Keep this log updated after each step.

## Context
- Hackathon: *Build with AI: Code for Communities (2nd Ed.)*, **Track 5 — Track-Based Cyclone Impact & Infrastructure Vulnerability Forecaster**.
- Submission deadline: **30 Sep 2026** (evaluation 1–15 Oct; shortlist 16 Oct; virtual demo day 23 Oct).
- Submission package: source repo, 3–5 min demo video, 10–12 slide deck, 2–3 line description, live deployed link.
- Scoring: AI/Technical Execution 25%; Problem-Solution Fit 20%; Depth & Reach Across India 20%; Deployability & Scalability 20%; Impact 15%.
- Must use Google AI (mandatory). Repo first commit 2026-09-26 (fine vs "no pre-existing projects" rule).

## Log

### 2026-09-29 — Session 1
1. **Saved working rules** to Claude memory (`plan-before-code`).
2. **Reviewed simulation + SOP** (`docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md` vs `geminiSopService.ts`, `geminiSubstationCopilotService.ts`). Findings (nothing changed yet):
   - SOP "impact metrics" (at-risk / tripped / protected) are rough estimates, and static templates hardcode invented numbers (e.g. "42 gangs").
   - Gemini not given hospital data, so hospital names it writes are guesses.
   - `VITE_GEMINI_API_KEY` is exposed in the browser.
   - Tier-2 caches the fallback answer on API failure (stuck until reload).
   - Doc scoring formula out of date vs code (health penalty ×1.2, Grade B +15, riskCategory bonuses, wind bonuses); "water depth/runoff" calc in doc doesn't exist in code; wind thresholds inconsistent (75 vs 80).
   - 2015 flood scenario never shows WATCH phase; restoration reuses critical title.
   - Dynamic SOP leaves `summaryTa` blank (Tamil lost).
   - Gemini posture not validated against rule engine; badge names may not match real substation names.
   - Doc overclaims "hallucination impossible".
   - Proposed fix steps A–E (honesty labels, reliability, flood phases + Tamil, move API key server-side, update doc). **Not yet approved/executed.**
3. **Reviewed hackathon PDF vs project** (Track 5 fit). Summary:
   - Strong: storm-surge simulation, power-grid exposure mapping, GEE-derived data, Weather API, two-tier Gemini, real data, Firebase hosting.
   - Gaps: no road/shelter exposure; dispatch only "copy SMS" (no Gemini dispatch); Chennai-only (India reach = 40% of score); no real predictive model; Gemini not multimodal; Tamil gap; track says "Gemini 3.7 Flash" but code uses `gemini-2.5-flash`.
   - Package not yet made: video, deck, description; live link to be confirmed.
   - Plan: today/tomorrow — finish site, then deck + video. Nice-to-have: Gemini-drafted bilingual early-warning dispatch; India-scaling story in deck. Skip roads / real forecasting / second city (roadmap only).
4. **Owner decision:** deck + video will be made *tomorrow (30 Sep)* after the site feels complete.
5. **Started full code review + docs refresh** (README + docs updated to match features as built; this log created).
6. **Full code review done and docs refreshed** (no app code changed):
   - Read all of `src/` (services, App, map, cockpit, drawer, cards), the scenario files and the grid file.
   - New: `docs/00-feature-map.md` (feature → file locator) and this log.
   - Rewritten: `README.md` (current features, "Not built yet", env vars, deploy) and `docs/DISASTER_SIMULATION_AND_GEMINI_ARCHITECTURE.md` (matches code).
   - Updated: status note in `docs/01`, scenario wording in `docs/05` and `docs/07`, new entry in `docs/CHANGELOG.md`.
   - Facts confirmed from code/data: Michaung = 61 hourly steps (peak ~134 km/h, ~4.05 m surge); Megaflood = 120-step hindcast (-85..+34h, no surge); UI exposes only Live / Michaung / 2015 Megaflood (old Alert/Severe/Surge logic remains in `disasterUtils.ts`); Tier-1 Gemini is called on every hour change (cached), not only at milestones; Tier-2 caches the fallback too, so "Re-evaluate" re-reads cache; `functions/` has no source; `VITE_PROJECT_ID` unused; `Analytics/` empty; README previously said Gemini was not in the app (now fixed).
   - Extra findings: Michaung peak surge in data (4.05 m) differs from the 3.2 m quoted in older docs and templates; RMU estimate wording in docs/05 may not match `classifyFeeder` (code sets rmuCount = 1 for UG/mixed) — not yet verified/fixed.
   - Not yet committed to git.
7. **Committed docs refresh** (`fc1f890`) on `feature/disaster-simulation-mvp`, then created and switched to new branch **`feature/hackathon-polish`** for the remaining work (fix plan A–E, Track 5 gaps). Nothing pushed.
8. **Checked where the hard-coded SOP numbers came from** (owner's assumption: TANGEDCO 2017 DMP + TN SDMP 2023). Result from the docs:
   - **Backed by docs (framework):** 5-stage restoration, restoration times 6/12/24/48 h (ESF 15), wind ≥ 80 km/h overhead de-energization ("§5.6"), 3.0 m surge threshold, 1.5 m plinth, mobile dewatering before restart, megger + permit-to-work before LT charging, hospital/water lifelines first. Docs 02 and 05 cite "TNSDMA SDMP 2023 (Ch. 5 & 8)" and a "TANGEDCO Disaster Management Manual (Post-Vardah & Post-2015 edition)".
   - **Not backed anywhere in docs (specifics):** "42 patrol gangs", "24 lineman squads", "85 crane units", "50HP pumps", "72-hour diesel autonomy", "4x 100HP pumps", "1000 kVA truck transformers", ">50 MΩ megger limit", "inundated >0.6 m", "285 km SE", "Zones 1–5". These look invented for realism.
   - **Inconsistencies:** T+12h template says "3-stage" re-energization but docs say 5-stage; docs say watch at 65 km/h, code uses 60 (feeder status) and 75 (SOP/copilot); docs never name the 2017 plan (they call it "Post-Vardah & Post-2015 edition"); source PDFs/page numbers are not in the repo, so "§5.6" and other clause numbers can't be verified from here.
   - Suggested next step: owner confirms which numbers are real from the PDFs; keep those with citations, mark or remove the rest.
9. **Checked the two source plans** (`dmpfinal combined.pdf` = TANGEDCO Disaster Management Plan, Aug 2017, 105 pp; `dm_plan_2023.pdf` = Tamil Nadu State Disaster Management Plan 2023, 272 pp). Text extracted to scratchpad only (PDFs stay outside the repo).
   - **Confirmed in the plans:** restoration priority = hospitals, drinking water, public lighting, community centres (2017 plan, printed pp. 79, 83–84); cyclone/flood precaution = switch off or trip supply, operators must not recharge until fault cleared and feeders patrolled (2017, pp. 83–84, 73); keep overhead lines out of service in flood-prone areas to avoid conductor snap/electrocution (2017, p. 73–74); sandbags, retaining walls and diesel dewatering pumps at low-lying substations (2017, pp. 74–75); 2015 floods: water up to 6 ft (~1.8 m) in substations, 41 substations kept off (22 Chennai + 13 Kanchipuram + 6 Tiruvallur), restored in 2 days (up to 4 in stagnant areas); Vardah: 130–140 km/h, Chennai load ~2,500 MW fell to 0; 2023 plan: TANGEDCO to "disconnect power supply at the time of striking of cyclone", and IMD warning stages Watch 72h / Alert 48h / Warning 24h / Post-landfall outlook 12h (matches our timeline hours).
   - **NOT in either plan:** any 80 km/h (or 75/65/60) wind trip threshold; "TNSDMA §5.6" as a wind mandate (in the 2023 plan §5.6 is just the generic "Standard Operating Procedures" table, p. 199); "CEA Safety Reg 33", "§5.2", "§8.2/8.4", "SOP-401" (unverified); ESF-15 restoration times 6/12/24/48 h (the "6 hours" hits in the 2023 plan are about procurement of RO units etc.); 5-stage restoration protocol, megger/PTW, cold-load pickup, 3.0 m MSL surge rule, 1.5 m plinth; all the SOP template figures (gangs, cranes, pump sizes, 72 h diesel, kVA, MΩ, 0.6 m).
   - **Overclaim in our docs:** "installed 13,810 RMUs" — the 2017 plan only mentions a proposal to replace 13,810 DT structures with RMUs in Chennai (planned, not installed). Also "load fell to 0 in four hours" not verified (plan says load went to 0 MW).
   - **Proposed:** keep the confirmed items with plan + page citations; relabel thresholds/times as "operating assumptions (not from the plans)"; drop invented numbers; fix wrong section citations and the RMU claim. Awaiting owner approval.
