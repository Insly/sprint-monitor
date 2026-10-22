# MGA Sprint Board — handover (state at 2026-10-22)

One page to pick the project up cold. Details: README.md (how to run/operate), docs/PROGRESS.md (dated log), docs/reviews/2026-10-02-review.md (review findings), docs/ux/ (design), docs/aws/MIGRATION.md (hosting plan).

## What it is
Browser home page for Insly MGA delivery staff: active sprint, day in sprint, and today's actions per role (Everyone, IM/AM, Dev, QA, Lead, Analyst) across the three sprints in play (being released / built / prepared). Static site, no backend. Used company-wide since 2026-10-21.

## Where it runs
- Live: https://insly-sprint-monitor.onrender.com (Render static site, publish dir `public/`, build command `echo ok`).
- Repo: github.com/Insly/sprint-monitor (public, because Render's GitHub app can't see Insly org repos; the owner is an org member, not owner). Secret scanning + push protection on.
- Deploy: push to `main` → GitHub Actions runs tests in Europe/Tallinn and America/New_York → on success POSTs the Render deploy hook with `ref=<tested SHA>` (secret `RENDER_DEPLOY_HOOK`). ~3–5 min to live.
- Scheduled checks: uptime every 30 min, data freshness every Monday 06:00 UTC (`npm run freshness`, never blocks deploys).

## Current switches (check before acting)
- **Maintenance: ON** since 2026-10-22 (owner request). `public/status.json` `{"maintenance": true|false, "message": "…"}`. Only a "Temporarily unavailable" panel shows; open tabs follow within a minute; `?full=1` bypasses; unreadable file = normal page.
- **Names: OFF.** `public/duty.js` `SHOW_NAMES = false`, all names removed from the public repo (dates kept). The filled rota is kept outside the repo at `C:\dev\sprint-monitor-private\duty-with-names.js`. To restore: set `SHOW_NAMES = true`, paste names as "First L." only; un-skip/restore the real-name tests (see comment in tests/qa-oracle.test.js).

## How the owner works with it
- Owner says "turn maintenance on/off" in chat → flip `status.json` on top of `origin/main` (temp worktree `C:\dev\sm-toggle`), push, wait for CI and confirm on the live page.
- Release routine (tool is company-wide): tests green in both TZs → compare old vs new visible text on key days → release in a quiet slot (evening, or early morning with owner's OK) → check the live page → rollback = Render → Events → previous deploy.
- Per the playbook: analysis/spec first, then dev, then QA — don't run them in parallel. Owner wants to see mockups before visual rebuilds.
- Owner declined branch protection / PR flow "not at the moment" (2026-10-22). Don't push it.

## Process truth the board encodes (owner-confirmed)
- 2-week sprints Mon–Fri; numbering resets yearly (YEAR_STARTS). S17 = 3–14 Aug 2026.
- Previous sprint: code freeze from end Friday until the Tue 17:00 Demo update (Beta reopens Wed) → UAT → Mon 12:00 fix cut-off (after it only reverts) → Live update Mon 20:00. Times are Tallinn; Warsaw/London shown alongside.
- Next sprint: Pre-Refinement every Wed 14:00, Full Refinement Thu 14:00 in week 1, sprint planning the Thursday before start. Refinement belongs to the NEXT sprint.
- Release check applies to all clients (Fri 12:00 before Demo; Friday before cut-off).
- Year end: 2027-1 is one long sprint 7 Dec 2026 – Fri 1 Jan 2027 (20 working days, no break); bug retro Mon 4 Jan, Demo Tue 5 Jan, Live Mon 11 Jan. 2027-2 starts Mon 4 Jan; its planning shows Thu 31 Dec (owner: probably earlier — add `planning` to OVERRIDES[27] when known). One Full Refinement (10 Dec) is enough. Mid-sprint check on day 10 (Fri 18 Dec).
- Holidays EE + PL 2026–2027: nothing moves; a note on the previous working day and on the day itself (weekend holidays too).
- Support duty is not shown (differs per team).

## Open items
- AWS move for employee-only access (Entra sign-in, repo private again): plan + OpenTofu skeleton + manual workflow ready, not applied. Needs IT (AWS account allowing us-east-1, Entra app registration, DNS, Intune). Insly console registration may route it to the Insly AI platform instead.
- External uptime service (optional; GitHub check already runs).
- Rota for 2027 and missing slots; names to restore after the AWS move.
- Data renewal before 2028: YEAR_STARTS 2028, 2027 year-end OVERRIDES, holidays 2028 (freshness alarm warns 60 days ahead).
- Small leftovers: literal "12:00" in some rule titles; folded Holidays summary counts entries not dates; sprint-view toggle lacks arrow keys.

## Key files
public/index.html (markup + boot, reads status.json first) · public/render.js (rendering) · public/board.css · public/board.js (pure state resolver) · public/schedule.js (date engine, OVERRIDES, YEAR_STARTS) · public/rules.js (52 rules) · public/duty.js · public/holidays.js · public/status.json · tests/ (vitest; run from PowerShell with $env:TZ — Git Bash drops TZ).
