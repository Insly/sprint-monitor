# Review: "Bi-weekly plan" (RP delivery, Confluence 5997494274)

Source: https://insly.atlassian.net/wiki/spaces/~7120203fec5108f5e845c2864986d63e82f00f/pages/5997494274/Bi-weekly+plan
Reviewed 2026-10-01. Client-specific parts (RP standups, RP sprint retro, Insly-internal RP retro, RP capacity hours, named people, RP Jira projects) are left out. What remains are IM/AM communication and delivery-hygiene steps that apply to any MGA client.

The page's columns map to the board's model: "Sprint 1" = previous (in release), "Sprint 2" = current (building), "Sprint 3" = next (being prepared).

## Mapping against rules.js

| Day | Bi-weekly plan step (generalised) | Board today | Proposal |
|---|---|---|---|
| Mon wk1 (start) | Tell the client what we commit to deliver this sprint (planned tasks) | missing | **new** `tell-client-sprint-plan` (IM/AM, current, on start) |
| Tue wk1 (Demo) | Re-check the release tag: list still matches what goes to Demo | missing | **new** `release-check-demo-list` (IM/AM, previous, on demoStart) |
| Tue wk1 (Demo) | Send client the list of tasks + UAT instructions for what the Demo update brings | partly (Wed `inform-client-uat` has no instructions step) | **new** `prepare-uat-instructions` (IM/AM, previous, on demoStart) |
| Tue wk1 | Make sure tasks for refinement are described and labelled | partly (`definition-of-ready` is before planning) | **new** `prepare-refinement-tickets` (IM/AM, next, weekly Tue) |
| Wed wk1 | Tell client Demo update is done, freeze ended, start UAT; route fixes to devs | covered (`inform-client-uat`, `uat-window`) | none |
| Thu wk1 | Collect all UAT feedback from the client | partly (Fri `cutoff-reminder`) | **new** `collect-uat-feedback` (IM/AM, previous, on uatStart +1) |
| Fri wk1 | Chase go/no-go decisions; release check before Live: list what will not make Live, ready for Monday 12:00 | partly (`cutoff-reminder`) | **extended** `cutoff-reminder` (title and detail now include the release check; no separate rule) |
| Fri wk1 | Mid-sprint check: what was delivered this week, push QA, chase anything not moving | missing | **new** `mid-sprint-check` (IM/AM, current, on start +4) |
| Fri wk1 | Next-sprint candidates have dev + QA estimates; total hours against team capacity | partly (`qa-estimate-present`, Wed wk2) | **new** `candidate-hours-vs-capacity` (IM/AM, next, planning −6) |
| Mon wk2 (cut-off) | Remind client of the 12:00 cut-off; tell which tasks are reverted; organise reverts | covered (`cutoff-last-chase`, `tell-client-revert`, `revert-missed-fixes`) | none |
| Mon wk2 | Tickets raised in UAT: make queue-ready, flag for ranking, add to next priority call | missing | **new** `uat-tickets-queue-ready` (IM/AM, previous, on live) |
| Mon wk2 | Promised tickets for the coming sprint: make queue-ready (team, Needs estimation, unassigned), ask the lead to rank | missing | **new** `promised-tickets-queue-ready` (IM/AM, next, planning −3) |
| Tue wk2 | Verify the Live update happened; send client the list of what went live | covered (`confirm-live-to-client`, carried to Tue morning) | **extend** detail: "send the list of what went live" |
| Tue wk2 | All sprint candidates in Backlog, ranked high enough; chase quick estimates | partly (`definition-of-ready`) | **extend** `definition-of-ready` detail |
| Wed wk2 | Answer parked ticket questions before refinement; chase client approval of estimates | partly (`answer-parked-questions` is week 1 only) | **new** `chase-estimate-approval` (IM/AM, next, planning −1) |
| Thu wk2 | Priority call, then devs pull top-ranked tickets to capacity; get QA's test capacity; send client the prioritised list for approval | partly (`priority-call-due`, `sprint-planning`) | **new** `send-client-sprint-list` (IM/AM, next, on planning) |
| Fri wk2 (freeze) | Release check at 12:00 before Demo: anything not Ready for Demo is reverted unless the client agrees to wait; agree the revert list with the lead and devs; identify spillover | missing | **new** `release-check-before-demo` (IM/AM + Dev + Lead, current, on end, 12:00) |

## Left out on purpose
- RP standups, RP sprint retro (Wed wk2 evening), Insly internal RP retro (Thu wk2).
- RP capacity numbers (40–50 h, 60 h ceiling), named people, RP/RPAM Jira queries and project filter.
- "SD items" column (service desk load per day): useful for an IM/AM's own planning, but per person, not per sprint.

## Notes
- **Release-tag check** is the strongest new practice: it runs twice per cycle, two working days before each environment update (Fri 12:00 before Demo, Fri before the Live cut-off). It was agreed for RP at the Sprint 17 retro; Owner confirmed (2026-10-01): applies to all clients.
- **Priority call timing differs.** The lifecycle page puts the priority call before sprint planning (board: Wed reminder); this plan holds it Thursday morning, the planning day. Both fit "before planning"; no change needed unless the owner wants a time.
- The JQL itself is client-specific; the board could link a generic Jira search template per client later (deferred: no Jira links in v1).
