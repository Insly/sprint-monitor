# Progress log

## 2026-10-01 — v2.2 readability: Option B panels (owner-approved; developer, not pushed)
- Spec: docs/ux/READABILITY.md (normative) + mockup-readability.html. Every collapsible section is a panel: white header strip with the orange tag, `--section-body` tray, white items and rail rows, 8 px radius; full bleed on ≤767. Headers 40 px (44 px on coarse pointers and ≤767).
- Inline chevrons (§3.2): hidden on an open section until hover (tray tint) or keyboard focus (inset ring); always shown when folded, with "Folded · summary" (§3.1); small and quiet on touch / ≤767. Same header for the cycle explainer, which stays unboxed with a 2 px rule. Sprint view: Timeline and Actions panels; Holidays is a footer line in Timeline unless a holiday exists; `<deploys>` box on the tray.
- Footer: one bar (meta facts + "Sources N" and "Home page setup" disclosures). Footer links use `--link-on-tint` (orange on the tray is 4.17:1).
- Layout (owner): Today left, Sprints then Coming up right, down to 1024 px; one column below. At 1024–1199 Today's item rows drop the sprint tag to keep the cut-off fold.
- Phone extras (≤767): Coming up 3 days (+N more to 7, then 10), no sprint labels (keeps "if needed"), Next for you as a list of 3 + "+N more", no repeated "Today" in the time column under a Today slot (kept on the urgent day, where slots are hidden).
- New tokens `--radius-section`, `--section-edge`, `--section-body`, `--tag-on-tray` (DESIGN §10). Fold: Mon 5 Oct 09:10 IM/AM at 1093×614, 3rd "By 12:00" item ends at 610 px (was 629).
- Checked in headless Chrome at 1440, 1093, 1024, 900, 390, light and dark, forced colours, touch: no horizontal scroll, no console errors, no external requests. 620 tests pass (Tallinn, New York); no test changes.

## 2026-10-01 — Rules: Bi-weekly plan additions (owner, 2026-10-01)
- Rules: Bi-weekly plan additions (owner, 2026-10-01). 13 new IM/AM communication rules (source `biweeklyPlan`, review in docs/notes/bi-weekly-plan-review.md); `definition-of-ready`, `confirm-live-to-client` and `cutoff-reminder` extended (the proposed `release-check-live-list` merged into `cutoff-reminder`; owner confirmed the release check applies to all clients). 52 rules.
- Sweep Aug 2026 to Jun 2027, all roles: no band, headline, tab or Next key moment changes, no new orange; only sub-lines changed. Fixtures updated (scenarios, STATES.md §8/§10 sub-lines and sprint view, engine-v21 counts 37/55, qa-oracle 28 Dec now allows the one IM/AM planning-prep task). 603 tests pass (Tallinn, New York).

## 2026-10-01 — owner feedback on the live redesign
- Support duty removed from the page and data (differs per team). Duty line now shows only the Demo/Live deployers, same font size as labels.
- Whole sprint block in the rail opens the sprint view. "Your day" tag renamed `<today>`.
- Cycle picture laid out in % of the page width: no sideways or vertical scroll at 100% (min width 760px, scrolls on phones only).
- Full Refinement once (Thu 10 Dec) in the long 2027-1 is enough (owner).

## TODO (future)
- Dev deploy rota (public/duty.js) is a one-time paste from "Duty dev.xlsx" valid to end of 2026. Replace with a live source (SharePoint) when the sheet is available there; extend by hand for 2027 until then. Names: first name + last initial only (page and repo are public).

## 2026-10-01 — v2.1 build (developer; not pushed, QA next)
- Rules v2 (DESIGN §14): 39 rules. New cutoff-last-chase, tell-client-revert, uat-findings-to-planning. code-freeze ends at demoStart, ready-for-live at cutoff, revert-missed-fixes is Dev only. Optional slot / carryOver / links fields; demo-update 17:00, live-update 20:00. SPEC table and CONTRACT schema updated.
- Owner correction: no year-end break. 2027-1 = 7 Dec to Fri 1 Jan (20 working days, `OVERRIDES[26] = { end: '2027-01-01' }`), Demo Tue 5 Jan, Live Mon 11 Jan; 2027-2 starts Mon 4 Jan. `context().isBreak` removed. UNCONFIRMED_FROM = 28 (2027-3 onwards = plain projections).
- New: public/holidays.js (EE + PL 2026-2027), public/board.js (pure state resolver for STATES.md), engine API (sprintByLabel, sprintDetail, zonedNow, formatAcrossZones, sprintPhase, ...).
- Page rebuilt to DESIGN v2.1 / mockup: band states, duty line, Your day, rail, Coming up, sprint view (#sprint-…), first-visit picker, focus ring, forced colours, 768–1199 layout, dark mode, Arial only.
- Tests: states.test.js reads the STATES.md fixture block; rails, sub-lines, duty lines, sprintDetail, holidays, duty.js, device in New York / London.
- Open for the owner: 2027-2 planning (formula gives Thu 31 Dec); in 4-week 2027-1 Full Refinement fires only Thu 10 Dec (weeks 2–4 count as "week 2") while Pre-Refinement runs every Wednesday incl. 23 and 30 Dec; 1 Jan (holiday) is 2027-1's freeze start.

## 2026-10-01 — UX redesign in progress
- UX specialist: docs/ux/USE-CASES.md, ANALYSIS.md, DESIGN.md, mockup.html (v1). Reviews: docs/ux/REVIEW-1-ux-a11y.md, REVIEW-2-practitioner.md. v2 revision running (STATES.md, rule additions, rota component).
- Rota data added (public/duty.js): Demo/Live deployers per release to Jan 2027, weekly support duty dev to 18 Oct. Sheet's 22/28 Dec release dropped (superseded by 2027-1 plan); sheet confirms 2027-1 Demo 5 Jan.

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
