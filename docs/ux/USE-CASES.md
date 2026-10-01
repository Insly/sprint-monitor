# MGA Sprint Board: usability use cases

Status: v2, 2026-10-01. Author: UX review. v2: owner decisions applied (one "IM / AM" role button, Tallinn time, freeze ends with the Demo update, duty rota as static data). IM and AM use cases stay separate on purpose.
Inputs: `public/index.html`, `public/schedule.js`, `public/rules.js` (36 rules), `docs/SPEC.md`, the live page at https://insly-sprint-monitor.onrender.com.

## How to read this

Each use case has a persona, a goal, a trigger, a main success scenario, the information the person needs, the decision they make, and how often and how critical it is. Dates use the real calendar:

| Sprint | Planning | Start | Code freeze | Demo update | UAT opens | Fix cut-off and Live |
|---|---|---|---|---|---|---|
| 2026-20 | Thu 10 Sep | Mon 14 Sep | Fri 25 Sep until the Demo update Tue 29 Sep (evening); Beta reopens Wed 30 Sep | Tue 29 Sep (evening) | Wed 30 Sep | Mon 5 Oct, 12:00 and evening |
| 2026-21 | Thu 24 Sep | Mon 28 Sep | Fri 9 Oct until the Demo update Tue 13 Oct (evening); Beta reopens Wed 14 Oct | Tue 13 Oct | Wed 14 Oct | Mon 19 Oct |
| 2026-22 | Thu 8 Oct | Mon 12 Oct | Fri 23 Oct to Wed 28 Oct | Tue 27 Oct | Wed 28 Oct | Mon 2 Nov |

Today is Thu 1 Oct 2026, so 2026-21 is on day 4 of 10. 2026-20 is in UAT on Demo, and 2026-22 is being refined.

**Scale.** Frequency: *daily*, *2-weekly* (once per sprint cycle), *occasional*. Criticality: **C1** a miss causes client impact or a broken release (a missed cut-off, a client never told about UAT, a wrong Demo/Live matrix). **C2** a miss causes team friction or rework (late reviews, missing estimates). **C3** convenience.

**What the page can know.** The page only knows the date, the time (computed in Europe/Tallinn), the rules, the static duty rota (`duty.js`: Demo deployer, Live lead and backup, weekly support dev) and one remembered role. It does not know Jira status, assignees or client names. Use cases that need more than that are marked **Out of reach**. For those, the page's job is to point at the right moment and the right place, and nothing more.

**Glance budget.** The page opens as the first tab every morning. It gets about 5 seconds then, sometimes one more look mid-day, and it has to be impossible to miss on Demo Tuesday and on cut-off/Live Monday.

---

## Personas

| Persona | Role on the page | What their day looks like |
|---|---|---|
| **Aino, Account Manager** | IM/AM | Owns live clients. Her days are about live issues and client communication: chasing UAT results, confirming releases, priority calls. She mostly works from Outlook and Jira. The board is a "don't forget" check. |
| **Marek, Implementation Manager** | IM/AM | Owns projects that are not live yet. His days are about go-lives and UAT: the Demo/Live matrix, Definition of Ready, telling clients what is on Demo. |
| **Priya, Developer** | Dev | Builds the current sprint. She cares about code reviews, freeze rules, Demo and Live nights, reverts, and refinement sessions. |
| **Tanel, QA engineer** | QA | Tests the current sprint, runs regression during the freeze, and gates what is Ready for Demo. |
| **Kristi, Dev team lead** | Lead | Ranks the refinement queue, runs sprint planning, prepares the bug retro. She needs the whole team's picture, not only her own items. |
| **Jonas, Analyst** | Analyst | Works through the analyst sprint and answers parked refinement questions. |
| **Sofia, new joiner (any role)** | not chosen yet | In her first two weeks. She does not know the vocabulary yet (cut-off, Demo/Live matrix, freeze). |

IM and AM share the **IM/AM** lane in `rules.js`, so the page shows them the same actions. Their *emphasis* differs: IM leans towards go-live and UAT, AM towards live issues and client communication. The use cases below keep them apart because they read the same page with different questions.

---

## UC-01: AM, cut-off Monday morning: "what must I chase before 12:00?"

- **Persona and goal:** Aino (AM). Make sure every client UAT result that needs a bugfix reaches the developers before the fix cut-off, so nothing has to be reverted.
- **Trigger and context:** Mon 5 Oct, 08:45, first tab of the day. 2026-21 day 6, week 2. 2026-20 cut-off at 12:00, Live this evening.
- **Main success scenario:**
  1. Aino opens the browser and the board loads as the first tab.
  2. Without scrolling she sees that today is cut-off day, that the cut-off is 12:00, how much time is left, and that it concerns 2026-20.
  3. She sees the consequence in one line: a fix after 12:00 means a revert, not a fix.
  4. She sees her own items for today in time order: fix cut-off 12:00, the last day of the UAT window and of setting tasks Ready for Live, revert items that missed the cut-off (after 12:00), then confirm Live to clients after the evening update.
  5. She switches to Jira and Outlook to chase clients with open UAT results.
  6. Mid-morning she comes back to the tab. The countdown tells her how long is left.
- **Information needed:** that today is cut-off day, the cut-off time, the time remaining, which sprint, the rule for missing it (revert), and what comes after (Live tonight, confirm to clients).
- **Decision:** which clients to chase now, and whether to warn a client that a fix will be reverted. The client list itself comes from Jira, which is out of reach.
- **Also needed (v2):** who is on support duty this week, to route a live issue a client raises while she chases UAT. This comes from the duty line.
- **Frequency and criticality:** 2-weekly. **C1.**

## UC-02: AM, Live night to Tuesday morning: "tell clients Live is done"

- **Persona and goal:** Aino (AM). Tell each client their release is live once the developers confirm the Live update.
- **Trigger and context:** Mon 5 Oct, late afternoon or evening, when the Live update runs. Often she only sees the confirmation on Tue 6 Oct at 08:30.
- **Main success scenario:**
  1. On Monday the board shows "Confirm Live update to clients" as something that happens after tonight's Live update, not as a morning task.
  2. On Tuesday morning the board still says that last night was Live night for 2026-20 and reminds her to confirm to clients if she has not done so yet.
  3. Aino sends the confirmations.
- **Information needed:** that Live ran last night, for which sprint, and that the confirmation is still hers to send.
- **Decision:** send now, or wait for the developers' confirmation.
- **Note:** today the rule exists only on Monday (`confirm-live-to-client`, `on: live`). Someone who opens the page on Tuesday sees nothing about it.
- **Frequency and criticality:** 2-weekly. **C1.** Clients who are not told assume nothing happened.

## UC-03: AM, Friday before Live: "update the Live matrix and chase UAT"

- **Persona and goal:** Aino (AM). Before the weekend, get the Demo/Live matrix right for Monday and push clients to finish UAT.
- **Trigger and context:** Fri 2 Oct, 09:00. 2026-21 day 5.
- **Main success scenario:**
  1. The board shows the heads-up: "Cut-off Monday 12:00".
  2. Her items are "Update Demo/Live matrix for Live" (due today) and "Chase UAT results before the cut-off".
  3. The matrix link and its scope note (it covers configuration only; code always deploys to all tenants) are one click away.
  4. She updates her tenants' Live columns and emails her clients.
- **Information needed:** the cut-off date and time, which matrix columns to update (Live), and where the matrix is.
- **Decision:** which configuration to exclude from Live.
- **Frequency and criticality:** 2-weekly. **C1.**

## UC-04: IM, Demo Tuesday and UAT Wednesday: "tell clients items are on Demo, with the UAT deadline"

- **Persona and goal:** Marek (IM). As soon as Demo is updated, tell each client what is on Demo and the exact UAT deadline.
- **Trigger and context:** Tue 29 Sep: Demo update in the evening. Wed 30 Sep, 08:45: UAT opens.
- **Main success scenario:**
  1. On Tuesday the board makes it clear that tonight is Demo night for 2026-20. No client message goes out yet.
  2. On Wednesday morning the board shows "Tell clients their items are on Demo" and "Check your changes on Demo".
  3. The UAT deadline is printed on that item ("UAT deadline: Mon 5 Oct, 12:00"), so Marek can copy it straight into his client email.
  4. He checks his clients' changes on Demo, then sends the emails.
- **Information needed:** whether Demo has been updated, the UAT deadline as a date and time, and which sprint.
- **Decision:** when to send (after Demo is confirmed and his checks pass), and what deadline to quote.
- **Note:** today the item's detail says "give them the UAT deadline" but does not show the date. Marek has to find it in the phase line or the release track.
- **Frequency and criticality:** 2-weekly. **C1.**

## UC-05: IM, the day before a deploy: "update the Demo/Live matrix"

- **Persona and goal:** Marek (IM). Make sure excluded configuration does not move in tomorrow's Demo update (Mon 28 Sep, before Demo) or in Monday's Live update (Fri 2 Oct, before Live).
- **Trigger and context:** Mon 28 Sep or Fri 2 Oct, morning.
- **Main success scenario:**
  1. The board shows a heads-up: "Demo update tomorrow" or "Cut-off Monday 12:00".
  2. "Update Demo/Live matrix for Demo/Live" is marked as due today.
  3. He opens the matrix from the item and updates his tenants' rows.
- **Information needed:** which update is next (Demo or Live), when it is, and where the matrix is.
- **Decision:** which tenants to include or exclude.
- **Frequency and criticality:** twice per cycle. **C1.**

## UC-06: IM, go-live Monday: "what is going live and what is my last call?"

- **Persona and goal:** Marek (IM). On cut-off Monday, set signed-off tasks Ready for Live and make sure anything not signed off is reverted.
- **Trigger and context:** Mon 5 Oct, 09:00, then again at about 13:00.
- **Main success scenario:**
  1. Before 12:00 the board shows that today is the last day of the UAT window and of "Set tasks Ready for Live", with the cut-off at 12:00.
  2. After 12:00 the board changes state: the cut-off has passed, reverts come next, and the Live update is tonight.
  3. He agrees with the developers which items must be reverted.
- **Information needed:** the cut-off time, whether it has passed, and the order of the afternoon (reverts before Live).
- **Decision:** which items to revert. The item list comes from Jira, which is out of reach.
- **Frequency and criticality:** 2-weekly. **C1.**

## UC-07: Dev, cut-off/Live Monday: "do I need to revert anything, who runs Live, and my code reviews"

- **Persona and goal:** Priya (Dev). Know whether today needs revert work, when the Live update happens, and keep up with code reviews.
- **Trigger and context:** Mon 5 Oct, 09:15, and again after lunch.
- **Main success scenario:**
  1. The board shows cut-off day with "Live update tonight" for 2026-20.
  2. Her items in order: fix cut-off 12:00 (UAT fixes merged by then), revert items that missed the cut-off (afternoon), Live update (evening), Golive release page (after Live).
  3. Her standing duties for 2026-21 (2 code reviews within 24h, verify on Beta) stay visible as a compact line, not as cards.
  4. After 12:00 the board leads with "Revert what missed the cut-off, then Live tonight".
- **Information needed:** the cut-off time, the revert rule (remove the commits from the release branch, re-point the feature branch), the Live timing, and the Golive page task.
- **Decision:** whether to start revert work now. This depends on Jira and on IM/AM input.
- **Answered by the duty line (v2):** *who* runs Live tonight comes from the static rota (`duty.js`): "Tonight · Live update 2026-20: Dev B. (lead), Dev C. (backup)". It also shows this week's support duty dev, so Priya can see at a glance whether she is on duty. If the slot is empty, it reads "not assigned yet".
- **Frequency and criticality:** 2-weekly. **C1.**

## UC-08: Dev, Demo Tuesday: "Demo update and release page"

- **Persona and goal:** Priya (Dev). Ship the Demo update tonight and publish the release page.
- **Trigger and context:** Tue 29 Sep, 09:00.
- **Main success scenario:** the board leads with "Demo update tonight". Her items are the Demo update (tonight) and "Create the release page" (after the update). The freeze is on its last full day and Beta reopens on Wednesday.
- **Information needed:** that it is Demo night, that the freeze is still in force, and the release page task.
- **Decision:** whether a pending fix still goes in (QA decides during the freeze).
- **Frequency and criticality:** 2-weekly. **C1.**

## UC-09: QA, freeze eve and freeze start: "regression plans and regression run"

- **Persona and goal:** Tanel (QA). Have regression plans ready in TestRail before the freeze, then run regression during it.
- **Trigger and context:** Thu 8 Oct (freeze eve: `regression-plans`, due) and Fri 9 Oct (freeze starts: `code-freeze` and `regression-run` open).
- **Main success scenario:**
  1. On Thursday the board shows the heads-up "Code freeze starts tomorrow" and "Regression plans ready in TestRail" is due today.
  2. On Friday the board leads with "Code freeze starts today (2026-21)". "Run regression" shows as running until Tue 13 Oct (the Demo update).
- **Information needed:** the freeze dates, the regression window end, and the TestRail plan deadline.
- **Decision:** which plans to prepare, and what may still be deployed during the freeze.
- **Frequency and criticality:** 2-weekly. **C1** (a missing regression means an untested Demo).

## UC-10: QA, midweek: "what is ready, and is refinement today?"

- **Persona and goal:** Tanel (QA). On Wednesday, know whether it is a refinement day and what the testing gates are this week.
- **Trigger and context:** Wed 30 Sep or Wed 7 Oct, 09:00.
- **Main success scenario:** the board shows Pre-Refinement at 14:00 (for the next sprint). On Wed 7 Oct it also shows "QA estimates on sprint candidates" (planning is tomorrow). The standing QA duties (prepare tests, review autotest results) stay compact.
- **Information needed:** the meeting time, which sprint the estimates feed, and the QA estimate rule.
- **Out of reach:** *which tickets* are ready for test. That needs Jira. The board should not pretend to know.
- **Frequency and criticality:** weekly. **C2.**

## UC-11: Lead, planning prep Wednesday and Thursday

- **Persona and goal:** Kristi (Lead). Get the next sprint ready for planning: queue ranked, IM/AMs' Definition of Ready and priority calls done, QA estimates present.
- **Trigger and context:** Wed 7 Oct, 08:30 (planning eve), and Thu 8 Oct (planning day). 2026-21 days 8 and 9.
- **Main success scenario:**
  1. On Wednesday the board leads with "Sprint planning tomorrow (2026-22)".
  2. Her own item: rank the refinement queue (before Pre-Refinement at 14:00).
  3. She can also see what the *team* must have done before planning (IM/AM: Definition of Ready, priority calls; QA: estimates), so she can nudge people. Her role view must not hide this.
  4. On Thursday the board leads with "Sprint planning today". It also shows that Friday is code freeze for 2026-21 and that the bug retro page is hers to prepare on Friday.
- **Information needed:** the planning date, everyone's pre-planning gates, and the freeze and bug retro that follow.
- **Decision:** whom to chase, and whether planning can go ahead.
- **Note:** with the current filter set to **Lead**, the page shows almost nothing on most days. Only 3 rules name Lead.
- **Frequency and criticality:** 2-weekly. **C2** (planning goes ahead with unready tickets).

## UC-12: Analyst, refinement week

- **Persona and goal:** Jonas (Analyst). Answer parked questions before Full Refinement.
- **Trigger and context:** Wed 30 Sep (answer parked questions, due) and Thu 1 Oct (Full Refinement at 14:00).
- **Main success scenario:** the board shows the due item on Wednesday and the 14:00 meeting on Thursday. His standing duty (analysis in the analyst sprint) stays compact.
- **Frequency and criticality:** 2-weekly. **C2.**

---

## Cross-role use cases

## UC-13: New joiner: "how does this cycle work?"

- **Persona and goal:** Sofia, week 1. Build a mental model of the two-week cycle and its vocabulary.
- **Trigger and context:** her first days. She has been told "use this as your home page". Any sprint day.
- **Main success scenario:**
  1. On her first visit the board asks her role (IM / AM, Dev, QA, Lead, Analyst or Everyone) and offers "New here? See how the cycle works".
  2. The cycle explainer shows three overlapping sprints as a timeline (plan, build, freeze, Demo, UAT, cut-off, Live) with today marked, and a short glossary (fix cut-off, Demo/Live matrix, code freeze, UAT, Ready for Live).
  3. On each item she can expand a "why / how" detail and follow its Confluence source.
  4. After a week she no longer needs the explainer. It stays collapsed and out of her way.
- **Information needed:** the cycle shape, definitions, and where each rule comes from.
- **Decision:** none. This is learning.
- **Frequency and criticality:** occasional (one person, about 2 weeks). **C3** for the page, but it lowers future C1 risk.

## UC-14: Back from two weeks' holiday: "where are we?"

- **Persona and goal:** anyone, returning on Mon 12 Oct after two weeks away. Reorient in under a minute.
- **Trigger and context:** Mon 12 Oct, 08:30. 2026-22 starts today, 2026-21 is frozen (Demo tomorrow), and 2026-20 went live on 5 Oct.
- **Main success scenario:**
  1. The board shows the three sprints as one line each, in plain words: "2026-21: in code freeze, Demo update tomorrow"; "2026-22: starts today"; "2026-23: being refined, planning Thu 22 Oct".
  2. "Today" shows the role's items: matrix for Demo (IM/AM), bug retro (all), sprint starts (all).
  3. "Coming up" shows the next 10 working days, with unit milestones always visible.
- **Information needed:** the phase of every live sprint, the next big milestone, and what is due today.
- **Decision:** what to catch up on first.
- **Frequency and criticality:** occasional. **C2.**

## UC-15: Preview a future date: "what will be happening on that day?"

- **Persona and goal:** Marek (IM) agreeing a client workshop date, or Kristi planning leave. Check what the board will say on a chosen date (for example Tue 13 Oct: Demo night, or Mon 19 Oct: cut-off).
- **Trigger and context:** occasional, any time of day.
- **Main success scenario:**
  1. He picks "View another date" (a date input, or ‹ › to step one day) without editing the URL.
  2. The board clearly shows it is a preview (it cannot be mistaken for today) and renders that day's state, items and sprints.
  3. The preview URL can be shared ("look what Mon 19 Oct looks like").
  4. "Back to today" is one click away.
- **Information needed:** the state for that date, and whether its dates are confirmed or projected (after 2026-22 they are projected).
- **Decision:** whether the date is suitable.
- **Frequency and criticality:** occasional. **C3** (but **C2** around year end, when the sprint dates are unconfirmed).

## UC-16: Mid-day return on a key day

- **Persona and goal:** any IM/AM or Dev on Mon 5 Oct, 13:10, back from lunch. "Did the cut-off pass, and what now?"
- **Main success scenario:** the tab title alone says "Cut-off passed · Live tonight". On opening, the board leads with the post-cut-off state (reverts, then Live tonight), and the 12:00 item is marked as passed.
- **Information needed:** the current time against the cut-off.
- **Frequency and criticality:** 2-weekly. **C1.**

## UC-17: Weekend or Sunday-evening glance

- **Persona and goal:** anyone opening the browser on Sat 3 Oct or Sun 4 Oct. "Is Monday a big day?"
- **Main success scenario:** the board says it is the weekend and that Monday is cut-off and Live day for 2026-20, in a calm tone (no urgent colouring on a Saturday). It shows Monday's items for the role.
- **Frequency and criticality:** weekly. **C3.**

---

## Summary matrix

| UC | Persona | Day (example) | Frequency | Crit. | Must be visible in 5 s |
|---|---|---|---|---|---|
| 01 | AM | Mon 5 Oct | 2-weekly | C1 | Cut-off 12:00, time left, revert rule |
| 02 | AM | Mon 5 / Tue 6 Oct | 2-weekly | C1 | Live tonight / "last night: Live, confirm to clients" |
| 03 | AM | Fri 2 Oct | 2-weekly | C1 | Cut-off Monday, matrix for Live due |
| 04 | IM | Tue 29 / Wed 30 Sep | 2-weekly | C1 | Demo tonight / UAT deadline date |
| 05 | IM | Mon 28 Sep, Fri 2 Oct | 2× cycle | C1 | Matrix due, which update |
| 06 | IM | Mon 5 Oct | 2-weekly | C1 | Last call before 12:00, then reverts |
| 07 | Dev | Mon 5 Oct | 2-weekly | C1 | Reverts, Live tonight |
| 08 | Dev | Tue 29 Sep | 2-weekly | C1 | Demo tonight, release page |
| 09 | QA | Thu 8 / Fri 9 Oct | 2-weekly | C1 | Freeze tomorrow / today, plans due |
| 10 | QA | Wed | weekly | C2 | Pre-Refinement 14:00 |
| 11 | Lead | Wed 7 / Thu 8 Oct | 2-weekly | C2 | Planning tomorrow / today, team gates |
| 12 | Analyst | Wed 30 Sep / Thu 1 Oct | 2-weekly | C2 | Parked questions due, refinement 14:00 |
| 13 | New joiner | any | occasional | C3 | Where to learn the cycle |
| 14 | Returner | Mon 12 Oct | occasional | C2 | The three sprints' phases in words |
| 15 | Any | preview | occasional | C3/C2 | It is a preview; that day's state |
| 16 | IM/AM, Dev | Mon 5 Oct 13:10 | 2-weekly | C1 | Cut-off passed (in the tab title) |
| 17 | Any | Sat 3 Oct | weekly | C3 | Monday is a big day (calm) |

**Pattern.** Of the 17 cases, 9 are C1, and every C1 case is tied to one of five moments: Demo eve, Demo night, UAT opens, Live eve (Friday), and cut-off/Live Monday. On any day the questions are "what time" and "what next", and nobody asks "which sprint column". This is why the analysis questions the three-column model.
