# Progress log

## 2026-09-28 (night) — state at shutdown

Done
- Research: Confluence MGA sprint process (lifecycle page, RP release calendar, refinement, live issues, QA estimation, 2026 Sprints page).
- Analysis: docs/SPEC.md (36 rules, 14 open discrepancies), docs/CONTRACT.md.
- Dev: public/schedule.js (engine), public/rules.js (36 rules), public/index.html (page), render.yaml (Render static site, publishes `public/`), README.md.
- Tests: 75 passing (`npm test`) at the time of the local commit.
- Browser check (local, http://localhost:8910 via `.claude/launch.json` "sprint-monitor" in hello-claude): mobile + desktop layout, dark mode, weekend, `#date-YYYY-MM-DD` preview all OK, no console errors.
- Hosting decision (Kaspar): Render static site, own private repo Insly/sprint-monitor, no login.

In progress at shutdown
- QA logic agent was reviewing test oracles vs Confluence dates (S5–S22 table), writing tests/scenarios.test.js for S21 day by day, DST/timezone and edge cases. It may have left uncommitted edits in tests/ (and possibly minimal fixes in public/schedule.js). Check `git status` / `git diff` first.

Next steps (morning)
1. `cd C:\dev\sprint-monitor && git status && npm test`. Review any uncommitted QA changes; re-run QA if it was cut off.
2. Commit, then create repo: `gh repo create Insly/sprint-monitor --private --source . --push` (Kaspar approved creating + pushing once QA is done).
3. Send Kaspar: Blueprint link https://render.com/deploy?repo=https://github.com/Insly/sprint-monitor and expected URL https://insly-sprint-monitor.onrender.com (he connects the Blueprint once in the Render dashboard).
4. After deploy: verify live URL, then share home-page setup steps (Edge/Chrome: Settings → Start, home, and new tabs → open specific page; Intune policies RestoreOnStartupURLs / HomepageLocation / NewTabPageLocation for company-wide).

Open questions for Kaspar
- Refinement days: lifecycle page says Tue+Wed; refinement page says Wed 14:00 / Thu 14:00 (rules follow the refinement page).
- Year-end 2026 sprint plan and 2027 numbering not published; add to OVERRIDES in public/schedule.js when known.
