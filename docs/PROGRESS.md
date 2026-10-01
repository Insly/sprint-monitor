# Progress log

## 2026-10-01 — Kaspar's answers applied

- Refinement rules now under the Next sprint column.
- 2027-1 = internal sprint 26: start 7 Dec 2026, Live 11 Jan 2027 (Demo Tue 5 Jan assumed). Labels reset per year via YEAR_STARTS.
- Open: 2027-2 start after the break (UNCONFIRMED_FROM = 27 shows a notice); confirm Demo 5 Jan; times for planning/retro/Demo/Live; QA Refinement day; team retro/client demo; owner confirmations (bug retro prep = Lead, release pages = Dev).

## 2026-10-01 — live

- LIVE: https://insly-sprint-monitor.onrender.com (Render static site, created manually from the public repo; render.yaml headers not applied, Render default cache is max-age=0, s-maxage=300).
- Repo made public by Kaspar (Render GitHub app has no access to Insly org repos; Kaspar is org member, not owner). Colleague names removed from SPEC (still in old commit history).
- CI: .github/workflows/deploy.yml runs tests on push and POSTs secret RENDER_DEPLOY_HOOK on main. Pending: Kaspar adds the secret; until then use Manual Deploy in Render.
- Render build currently runs `npm install` (auto-detected) and reports audit warnings from vitest devDeps; harmless (not served). Set Build Command to `echo ok` to skip.
- Verified live: title, "2026-21 Day 4 of 10" on Thu 1 Oct, help box shows live URL, no console errors.

## 2026-09-29 — morning session

Done
- Wording fixes in rules.js (priority-call title imperative; code-freeze text matches Wed freeze end; cut-off reminder no longer hard-codes Monday).
- Day counter/meter use real working-day count of the sprint (`workingDaysIn` in schedule.js) so year-end overrides never show "day 15 of 10".
- In-page "Make this your browser home page" help (copy button, Edge/Chrome steps); README Intune section.
- 129 tests pass. Pushed to main.

Waiting on
- Kaspar connects the Render Blueprint (https://render.com/deploy?repo=https://github.com/Insly/sprint-monitor). Then: verify live URL, confirm the help box shows the real URL.
- Kaspar's call on refinement days (Tue/Wed vs Wed/Thu).
- Year-end 2026 plan and 2027 numbering → OVERRIDES in public/schedule.js (label year reset still TODO once known).

## 2026-09-28 (night) — state at shutdown (QA passed, pushed)

Done
- Research: Confluence MGA sprint process (lifecycle page, RP release calendar, refinement, live issues, QA estimation, 2026 Sprints page).
- Analysis: docs/SPEC.md (36 rules, 14 open discrepancies), docs/CONTRACT.md.
- Dev: public/schedule.js (engine), public/rules.js (36 rules), public/index.html (page), render.yaml (Render static site, publishes `public/`), README.md.
- Tests: 75 passing (`npm test`) at the time of the local commit.
- Browser check (local, http://localhost:8910 via `.claude/launch.json` "sprint-monitor" in hello-claude): mobile + desktop layout, dark mode, weekend, `#date-YYYY-MM-DD` preview all OK, no console errors.
- Hosting decision (Kaspar): Render static site, own private repo Insly/sprint-monitor, no login.

In progress at shutdown
- QA logic done: 127 tests pass (TZ Tallinn, New York, Santiago, Kiritimati). Fixed start-override cascade bug in schedule.js. Open wording items: rules.js code-freeze text vs Wed freeze end, cutoff-reminder hard-codes "Monday 12:00", priority-call title not imperative; dayOfSprint can exceed 10 with year-end overrides.

Next steps (morning)
1. DONE: QA passed, 127 tests.
2. DONE: pushed to https://github.com/Insly/sprint-monitor (private).
3. Send Kaspar: Blueprint link https://render.com/deploy?repo=https://github.com/Insly/sprint-monitor and expected URL https://insly-sprint-monitor.onrender.com (he connects the Blueprint once in the Render dashboard).
4. After deploy: verify live URL, then share home-page setup steps (Edge/Chrome: Settings → Start, home, and new tabs → open specific page; Intune policies RestoreOnStartupURLs / HomepageLocation / NewTabPageLocation for company-wide).

Open questions for Kaspar
- Refinement days: lifecycle page says Tue+Wed; refinement page says Wed 14:00 / Thu 14:00 (rules follow the refinement page).
- Year-end 2026 sprint plan and 2027 numbering not published; add to OVERRIDES in public/schedule.js when known.
