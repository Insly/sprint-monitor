# Sprint Monitor: SPEC

Owner: analyst. Contract: `CONTRACT.md`. Rule data: `rules.js`.

## Problem

People in the MGA delivery unit keep having to look up where we are in the sprint cycle. Is Beta frozen? Is the Demo update tonight? When is the cut-off? Is planning this Thursday? The answers are spread across the release calendar, the task lifecycle page and the refinement page. As a result, reminders (Demo/Live matrix, UAT deadline, TestRail plans, priority call) get missed or arrive late.

Sprint Monitor is a browser home page. It shows the active sprint, today's working day within it, and the actions due today for the previous, current and next sprint, by role.

**Success measure:** within one sprint of launch, the delivery team leads report no missed Demo/Live matrix update, missed client UAT notice or missed cut-off caused by "didn't know it was today". Secondary measure: at least 5 people in the unit use it as their home page (self-reported).

## Non-goals (v1)

- No Jira integration: no live ticket status, counts or assignees.
- No other units. MGA delivery unit only.
- No notifications, e-mail, Teams messages or calendar invites.
- No editing of rules or dates in the page. Changes go through `rules.js` / `schedule.js`.
- No per-client schedules (priority call days differ per client and are not modelled).
- No hotfix or live-issue flow. It is event-driven, not calendar-driven.

## Tier

**T1**: one owner, low stakes, no personal data, static page, months-long lifetime. Minimal process: a spec, unit tests on the date engine and rule data, and a manual check against the acceptance list.

## Acceptance checks

1. **2026-09-28 (Mon)**: the page shows **S21 day 1 of 10**, with S20 as previous and S22 as next. Today includes *S20 bug retro*, *S20 code freeze* (window), *S21 sprint starts*, and *update Demo/Live matrix for Demo* (Demo update is tomorrow).
2. **2026-09-29 (Tue)**: today includes *S20 Demo update* (deploy), *S20 all tasks Ready for Demo* and *create the release page*.
3. **2026-10-02 (Fri)**: today includes the *cut-off is Monday 12:00* reminder and *update Demo/Live matrix for Live* for S20. S20 UAT window is active.
4. **2026-10-05 (Mon)**: today includes *S20 fix cut-off 12:00*, *revert items that missed the cut-off*, *Live update*, *Golive release page* and *confirm Live update to clients*.
5. **2026-10-07 / 2026-10-08**: Wednesday shows *Pre-Refinement 14:00* plus S22 planning prep (priority call, Definition of Ready, QA estimates). Thursday shows *S22 sprint planning* and *S21 regression plans ready in TestRail*. It shows **no** Full Refinement, because this is a planning week.
6. For any date after the S22 window (from 2026-10-26), the sprint header is labelled **projected**.

## Calendar model

As defined in `CONTRACT.md`: anchor S17 = Mon 2026-08-03, 14-day sprints. `rules.js` uses only the contract date keys (`planning, start, end, freezeStart, bugRetro, demoStart, demoEnd, freezeEnd, uatStart, cutoff, live`). It uses `offset` for day-before reminders (for example `cutoff` −3 = the preceding Friday). No schema extensions were needed.

Weekly refinement mapping: sprint planning falls on Thursday of week 2 of the current sprint (next.start − 4). So the bi-weekly Full Refinement is Thursday of **week 1** (`{ weekly: 'Thu', week: 1 }`).

## Rule catalogue (36 rules)

Sources: see `SOURCES` in `rules.js`. `prev` / `cur` / `next` = sprint relation.

| id | who | when | source |
|---|---|---|---|
| priority-call-due | IM/AM | next: planning −1 (Wed) | lifecycle |
| definition-of-ready | IM/AM | next: planning −1 (Wed) | lifecycle |
| qa-estimate-present | IM/AM, QA | next: planning −1 (Wed) | qaEstimation |
| sprint-planning | Lead, IM/AM, Dev | next: planning (Thu) | lifecycle |
| sprint-start | All | cur: start (Mon) | lifecycle |
| code-review-24h | Dev | cur: start → end | lifecycle |
| verify-on-beta | Dev | cur: start → end | lifecycle |
| overrun-80 | Dev, IM/AM | cur: start → end | lifecycle |
| qa-prepare-tests | QA | cur: start → end | lifecycle |
| autotest-review | QA | cur: start → end | automationReview |
| log-time-daily | All | cur: start → end | timeLogging |
| analyst-sprint | Analyst | cur: start → end | lifecycle |
| rank-refinement-queue | Lead | next: weekly Wed | refinement |
| pre-refinement | Dev, QA | next: weekly Wed 14:00 | refinement |
| answer-parked-questions | IM/AM, Analyst | next: weekly Wed, week 1 | refinement |
| full-refinement | Dev, QA, IM/AM, Analyst | next: weekly Thu 14:00, week 1 | refinement |
| regression-plans | QA | cur: freezeStart −1 (Thu) | lifecycle |
| bug-retro-prep | Lead | cur: end (Fri) | bugRetro |
| code-freeze | Dev, QA, IM/AM | prev: freezeStart → freezeEnd | calendar |
| regression-run | QA | prev: freezeStart → demoStart | lifecycle |
| bug-retro | All | prev: bugRetro (Mon) | liveIssues |
| matrix-before-demo | IM/AM | prev: demoStart −1 (Mon) | demoLiveMatrix |
| ready-for-demo | QA | prev: demoStart (Tue) | lifecycle |
| demo-update | Dev | prev: demoStart (Tue evening) | lifecycle |
| release-page | Dev | prev: demoStart (Tue) | releasePage |
| inform-client-uat | IM/AM | prev: uatStart (Wed) | lifecycle |
| check-own-items-demo | IM/AM | prev: uatStart (Wed) | oldProcess |
| uat-window | IM/AM, Dev | prev: uatStart → cutoff | lifecycle |
| ready-for-live | IM/AM | prev: uatStart → live | lifecycle |
| cutoff-reminder | IM/AM | prev: cutoff −3 (Fri) | lifecycle |
| matrix-before-live | IM/AM | prev: cutoff −3 (Fri) | demoLiveMatrix |
| fix-cutoff | IM/AM, Dev | prev: cutoff 12:00 (Mon) | lifecycle |
| revert-missed-fixes | Dev, IM/AM | prev: live (Mon) | lifecycle |
| live-update | Dev | prev: live (Mon evening) | lifecycle |
| golive-page | Dev | prev: live (Mon) | releasePage |
| confirm-live-to-client | IM/AM | prev: live (Mon) | lifecycle |

Note: the engine checks dated rules against all three sprints. So `code-freeze` and `regression-run` also show on the Friday the freeze starts, while that sprint is still "current".

## Open discrepancies

1. **Refinement days.** The lifecycle page says backlog refinement runs "every Tuesday and Wednesday". The Backlog Refinement page says Pre-Refinement is **Wed 14:00 weekly** and Full Refinement is **Thu 14:00 bi-weekly**, skipped in planning weeks. It mentions Tuesday only as a possible extra session. `rules.js` follows the refinement page as the more specific source. The lifecycle page should be corrected. The refinement page also calls its schedule "a starting point, not a fixed rule".
2. **Demo update day.** The lifecycle page says "every second Tuesday evening". The calendar lists Demo as "Tue–Wed" (e.g. 29–30 Sep). The 2023 page said Tuesday afternoon, 14:00–15:00 EET. `rules.js` puts the deploy on Tuesday (`demoStart`) with no time, and client notification and UAT start on Wednesday. Needs confirmation: is Wednesday a spill-over day, or part of the planned Demo work?
3. **Code freeze end.** The lifecycle page says the freeze lasts "until the Demo update" (Tuesday evening). The calendar says "freeze ends Wed". `code-freeze` follows the calendar (to `freezeEnd`). `regression-run` ends at `demoStart`.
4. **Sprint numbering after S22, year rollover and holidays.** The calendar confirms only S17–S22. The "2026 Sprints" page (5551063088) shows numbering **resets per year** (2026-1 … 2026-10) and release pages are named `release/2026-NN`. It also shows the cadence **broke over the year end**: 2026-1 ran 8.12.2025 with the freeze to 06.01.2026, and 2026-2 started 09.01. So the contract's "numbering continues across years, fixed 14-day cadence" will be wrong from the first sprint of 2027, and possibly around Christmas 2026. The page must label N > 22 as projected. The 2027 numbering and holiday plan are unconfirmed.
5. **2023 process page is outdated.** It describes Live on **Thursday evening / Friday morning**, UAT Wed–Thu, and sprints starting on Friday. These are all superseded by the Monday Live / Monday 12:00 cut-off model. It is used only for one uncontradicted rule (`check-own-items-demo`). The page should be archived or marked obsolete.
6. **No documented times** for sprint planning, bug retro, Demo update, Live update or priority calls. These rules have no `time`. The bug retro page date (28.09) confirms only the Monday.
7. **Priority call day** varies per client and is not modelled. `priority-call-due` is a generic reminder the day before planning.
8. **Weekly QA Refinement** (QA Estimation Process) has no documented day or time, so it has no rule. `qa-estimate-present` covers the enforcement side.
9. **Sprint retro cadence.** Team sprint retros exist for RP (e.g. "RP S11 retro"), but no MGA-wide cadence or day is documented. The bug retro is the only retro in the catalogue.
10. **Sprint review / demo to client.** Nothing found in MGA Confluence. No rule.
11. **Bug retro owner.** Recent pages are authored by a dev lead and prepared on the Friday. No page states who owns the preparation. `bug-retro-prep` is assigned to Lead. The S20 retro also notes the next query "should start from Friday 12:00".
12. **Release page ownership.** "Release 2026-NN" and "Golive Release 2026-NN" pages are created by developers per the examples. This is not stated in any process page.
13. **Demo/Live matrix title vs scope.** The matrix governs configuration only; code always deploys to all tenants. This is stated on both pages but easy to miss, so it is repeated in the rule detail.
14. **Refinement page lists three delivery leads as rankers in one place and two in others.** `rank-refinement-queue` uses the generic role Lead.
