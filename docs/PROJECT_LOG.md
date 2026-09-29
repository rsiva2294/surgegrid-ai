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
