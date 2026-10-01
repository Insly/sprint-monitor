# MGA Sprint Board v2: practitioner review

Status: independent review, 2026-10-01. Reviewer: delivery practitioner (insurance-software implementation and release work).
Reviewed: `USE-CASES.md`, `ANALYSIS.md`, `DESIGN.md`, `mockup.html` (frames A–G). Checked against `docs/SPEC.md`, `docs/CONTRACT.md`, `public/rules.js` and `public/schedule.js`.

**Severity:** **blocker** = do not build or sign off until fixed · **major** = fix before launch, or the page will be wrong or ignored on a key day · **minor** = polish.

Process facts used as ground truth (from the brief):

- Two-week sprints, Mon to Fri.
- Previous sprint: code freeze from Friday until the Demo update on Tuesday evening (Beta reopens Wednesday). Then UAT, the fix cut-off on Monday at 12:00 (after that, reverts only), and the Live update on Monday evening.
- Refinement is Wed 14:00 and Thu 14:00 in **week 1**. It feeds the **next** sprint. Sprint planning is on the Thursday before the sprint starts.
- IM and AM share one lane.

---

## 1. Summary

The direction is right. Leading with the day, sorting by time, and making the sprint a tag instead of a column fixes the real problem with the current page. The cut-off Monday frame (B) is the best screen in the set. An AM would get the answer from it in under 5 seconds.

The design is not ready to build yet, for four reasons:

1. **Three of the five personas have no frame for their key day.** There is no Demo Tuesday, no UAT-opens Wednesday, no freeze Friday, no planning Thursday, no Live evening and no Tuesday morning after Live. The two frames that exist (Thu 1 Oct and Mon 5 Oct) are the easy ones.
2. **The mockup repeats two process errors from the rule data.** It shows a Pre-Refinement on Wed 7 Oct (week 2), and it says the freeze runs "until Wed 14 Oct". Both contradict how the process actually works.
3. **The headline state model has a precedence bug, and it will cause alarm fatigue.** On planning Thursday the unit-wide headline says "Code freeze starts tomorrow". 9 of 10 working days get some orange treatment, and Demo Tuesday turns the whole page orange for AMs and analysts, who have nothing to do that day.
4. **The page states things it cannot know.** It says "Reverts now" at 21:00. It would say "Last night: Live update" whether or not Live actually ran. It counts down to 12:00 on the device clock, not Tallinn time. It shows a "Due · Now" revert to every developer on every Live Monday, even when there is nothing to revert.

---

## 2. Persona walkthroughs

### (a) Account Manager, 5 live clients, cut-off Monday (Frame B, also F and A)

**5-second test: pass.** The orange band reads "Fix cut-off at 12:00 · 2 h 50 min left". The tab title also works before the tab is opened. This is a clear improvement on the current page.

| # | Frame | Problem | Severity | Fix |
|---|---|---|---|---|
| A1 | B | **The countdown gives false comfort.** "2 h 50 min left until the 12:00 cut-off" suggests an AM can raise a blocking UAT bug at 11:30. In practice a fix needs a developer, 2 code reviews and a deploy before 12:00. The *effective* deadline for an AM to raise a bug is early morning, or really Friday. | major | Sub-line for IM/AM: "Raise blocking UAT bugs with the developers now. A fix must be merged and reviewed by 12:00." Keep the countdown, but frame it as the developers' deadline. |
| A2 | B | **The AM's real morning task is missing.** "Chase UAT results before the cut-off" exists only on Friday (`cutoff −3`). On Monday morning, the AM's first job is the last chase of clients who haven't signed off. The list shows "12:00 Fix cut-off" as the first item, which reads as "nothing until noon". | major | Show `cutoff-reminder` on cut-off morning as well, as the first "By 12:00" item ("Last chase: UAT sign-off and blocking bugs"). This needs one extra rule or a second `on` in `rules.js`. |
| A3 | B | **The AM's part of the revert is the wrong one.** "Revert items that missed the cut-off" reads as a git task. For IM/AM the C1 duty is agreeing *which* items are reverted and **telling the affected client that their item will not go Live tonight**. That client message is not anywhere on the page. | major | For the IM/AM view, retitle the item to "Agree reverts with the developers and tell affected clients" (rule title per role, or a separate IM/AM rule). |
| A4 | B | "Set tasks Ready for Live" sits under "By 12:00" but is labelled "Today", and the rule window runs to `live`. In practice, anything that is not Ready for Live at the cut-off becomes a revert candidate. | minor | Label it "by 12:00". Consider ending the `ready-for-live` window at `cutoff`. |
| A5 | B | "Confirm Live update to clients · **Tonight** · Due". AMs do not send client e-mails at 22:00 after a late deploy. This happens Tuesday morning, and on Tuesday the item is gone (UC-02). DESIGN §9 lists the carry-over as **optional**. For an AM it is the single most-missed C1 step. | major | Make `carryOver` on `confirm-live-to-client` (and `golive-page`) **required for v2**. On Monday, label it "After the Live update (tonight or Tue morning)". |
| A6 | B | The header says "4 things · first at 12:00", but 5 items are listed. | minor | Compute the count from the rendered list. |
| A7 | B | **No path to the AM's own data.** With 5 clients, the AM's question is "which of *my* items are still open in UAT?" The page cannot answer that, but it can **link** to it. A Jira saved-filter or JQL URL with the release `fixVersion` (`2026-20`) needs no Jira API. The same goes for a link to the Demo/Live matrix from the band. | major | Add a "Open in Jira: UAT open for 2026-20" link built from a JQL template in config. Put the matrix link on every matrix item and in the key-day band. |
| A8 | A | "Flag overruns at 80% of dev estimate" is a developer's sentence. The AM's side is "when a dev flags an overrun, tell the client or stakeholder". | minor | Per-role wording, or leave the item out of the IM/AM Standing line. |
| A9 | A, F | Weekend frame F is calm and correct. Good. Thursday (A) correctly leads with Full Refinement and keeps the cut-off in the sub-line and the rail. Good. | none | Keep. |

### (b) Implementation Manager, UAT to go-live (no dedicated frame; A, B, F apply)

**5-second test: cannot be judged on the key days.** There is no frame for Mon (matrix for Demo), Tue (Demo night), Wed (UAT opens) or Fri (matrix for Live). UC-04's main feature, the UAT deadline on the item with a Copy button, is described in DESIGN §5 but is in no frame.

| # | Frame | Problem | Severity | Fix |
|---|---|---|---|---|
| B1 | none | **No frame for UAT-opens Wednesday or Demo Tuesday**, the IM's two C1 days. | blocker (for sign-off) | Add frames: Tue 29 Sep as IM ("Demo update tonight: don't tell clients yet") and Wed 30 Sep as IM (the "Tell clients their items are on Demo" item expanded, showing "UAT deadline: Mon 5 Oct, 12:00" with Copy, plus the matrix link). |
| B2 | all | **"Go-live" means two things at Insly, and the page only knows one.** For an IM, "go-live" is usually the client's first production go-live, with its own longer UAT, cut-over and sign-off. The board only knows the 2-weekly Live update, and its "Golive page" is the *sprint's* "Golive Release 2026-NN" page. An IM taking a new client live will expect the board to know their go-live date, and it can't. | major | Say it once in the glossary: "Live update = the 2-weekly release. Client project go-lives are not on this board." In the UI, always say "Live update", never "go-live", except as the exact page name "Golive Release 2026-NN". |
| B3 | A, B | Wednesday's "Tell clients their items are on Demo" assumes Demo actually happened. Demo updates run into the night and sometimes slip. | major | Item text: "Once the developers confirm the Demo update…" (already in the rule detail). Lift it into the one-line title or sub-line, so nobody e-mails clients off the board alone. |
| B4 | A | "Releasing 2026-20" is the tag for a sprint that is *in UAT on Demo*. IMs say "20 is on Demo", "UAT for 20", "20 goes Live Monday". "Releasing", "Building" and "Preparing" are a new vocabulary on top of the one people already use. | minor | Use the state as the tag: "2026-20 · UAT on Demo", "2026-21 · Sprint day 4", "2026-22 · Refinement". Drop the verbs. |
| B5 | all | Code freeze affects IMs through **configuration**: tenant config changes on Beta need QA permission during the freeze. The detail says so, but IMs are not shown it as a one-liner. | minor | When the freeze is running, the IM/AM Running line reads "Code freeze: config changes need QA approval until the Demo update". |

### (c) Developer, Live-update night (Frame D; no evening frame)

**5-second test at 13:20: pass** ("Reverts now, Live update tonight"). **At 19:00 or later: fail.** The page has nothing past 12:00. It keeps saying "Reverts now" until midnight, and on Tuesday morning the Golive page task is gone.

| # | Frame | Problem | Severity | Fix |
|---|---|---|---|---|
| C1 | D | **There is no evening state.** Without a documented Live time (DESIGN open question 1), "Now: Revert" stays on screen all evening, and the sequence strip never moves to "Live update" as now. | major | Add a clock threshold (for example 16:00, owner to confirm) after which the band reads "Live update tonight". The sequence strip "now" marker moves to Live. Never claim that reverts are done. |
| C2 | D | **"Revert · Due · Now" in hot orange, every Live Monday, for every developer.** Most Mondays nothing needs reverting, and whether anything does is an IM/AM plus Jira fact. Showing it as a due action every time trains people to ignore the strongest colour on the page. | major | Conditional wording and neutral styling: "If anything missed the cut-off: revert it before Live (the IM/AM decides which)". Use the orange key style only for the 12:00 deadline itself. |
| C3 | D | **Strikethrough plus "Passed" on the fix cut-off.** A strikethrough reads as *done*, which is the opposite of "you missed the window". | minor | Drop the strikethrough. Use "12:00 · cut-off passed, reverts only" in muted text. |
| C4 | D | **The Live update item has no working links.** On Live night a developer needs the Demo/Live matrix (Live follows it), the "Release 2026-20" page from Demo night, and the "Golive Release" template. The page cannot know page IDs, but it can build a Confluence title search URL for "Release 2026-20". | major | In the Live and Demo update details, link to: the matrix (known URL), "Release 2026-NN" and "Golive Release 2026-NN" (via a Confluence search URL), and the revert procedure. |
| C5 | D | **"Who runs Live tonight" is not shown.** That is the right call, because there is no rota data. Do not add a placeholder. | none | Keep. If a rota page exists, a static link is fine. A name is not. |
| C6 | A, B | Coming up: "Code freeze starts, until **Wed 14 Oct**". The freeze ends with the Demo update on **Tuesday evening**, and Beta reopens Wednesday. A developer reading "until Wed" will hold merges all of Wednesday. The glossary (G) says "until the Demo update", so the mockup contradicts itself. | major | Everywhere: "Code freeze until the Demo update (Tue 13 Oct evening). Beta reopens Wed 14 Oct." |
| C7 | D | The morning after: "Create the Golive release page" disappears on Tuesday, even when Live finished at 23:00. | major | Covered by the required carry-over (A5). |
| C8 | B | The sequence strip shows "Confirm to clients · Golive page" as one step. These are two roles (IM/AM and Dev). That is fine in the unit-wide band, but it confuses the Dev view. | minor | In the Dev view, the step reads "Golive page". In the IM/AM view, "Confirm to clients". |

### (d) QA engineer, the Friday the code freeze starts (no frame)

**5-second test: cannot be judged.** No frame shows Thu 8 Oct (regression plans due) or Fri 9 Oct (freeze starts). From the state model, Friday gives the event band "Code freeze starts today". That is right, but QA's actual work for the day is not shown prominently.

| # | Frame | Problem | Severity | Fix |
|---|---|---|---|---|
| D1 | none | **No QA frame at all.** QA is a C1 gate (UC-09) twice per cycle: freeze eve, and Ready for Demo on Tuesday. | blocker (for sign-off) | Add Thu 8 Oct and Fri 9 Oct frames as QA. |
| D2 | design §5 | **"Run regression" opens on Friday, and DESIGN puts windows of 7 days or less in the compact "Running" line.** It is promoted to a full item only on its *last* day. On the freeze Friday, the start of regression is QA's main job of the day, and it would sit in a grey one-liner. | major | Promote a window to a full item on its **first** day as well as its last ("Opens today · until the Demo update Tue 13 Oct"). |
| D3 | none | **QA is the freeze gate,** and the page should say so to QA: "Only QA-approved bug fixes go to Beta until the Demo update. Devs will ask you." The rule says "QA controls what may still be deployed" but it sits inside `regression-run` detail. | minor | Make it the QA sub-line in the freeze band. |
| D4 | none | The regression window ends at the Demo update, and the real deliverable is "All tasks tested and **Ready for Demo**" on Tuesday. On Friday QA should already see that end-point. | minor | Running line: "Run regression → Ready for Demo by Tue 13 Oct (before the evening update)". |
| D5 | Fri state | **The rail is ambiguous on the freeze Friday.** 2026-21 is both "Building, day 10 of 10" (still current) and frozen. QA will expect the 2026-21 row to say "Code freeze, Demo Tue". | minor | On `freezeStart` and later, the current row's state reads "Code freeze · Demo Tue 13 Oct" instead of "Day 10 of 10". |
| D6 | Thu state | Thu 8 Oct has both `regression-plans` (heads-up) and `sprint-planning` (event). Heads-up wins, so the headline is "Code freeze starts tomorrow". That is right for QA but wrong for everyone else (see E1). | see E1 | see E1 |

### (e) Delivery lead, preparing Thursday sprint planning (no frame)

**5-second test on Thu 8 Oct: fail, by the design's own rules.** State precedence (DESIGN §6) puts heads-up (#5) above event day (#6). On planning day, `regression-plans` makes the unit-wide headline "Code freeze starts tomorrow", and "Sprint planning today" drops to second place. UC-11 explicitly requires "Sprint planning today".

| # | Frame | Problem | Severity | Fix |
|---|---|---|---|---|
| E1 | §6 | **The precedence bug on planning Thursday** (above). | major | Rank by importance and by "today before tomorrow": an event happening today beats a heads-up for tomorrow, except for cut-off and Demo heads-ups. Or let the headline be role-aware within one tier: Lead, IM/AM and Dev get "Sprint planning today", QA gets "Regression plans due · freeze tomorrow". |
| E2 | none | **No Lead frame**, and the Lead's "Also today" (expanded by default) is not shown. | blocker (for sign-off) | Add Wed 7 Oct and Thu 8 Oct as Lead. |
| E3 | §7 | The Lead's "Also today" lists the gates (Definition of Ready, priority calls, QA estimates) **but cannot know whether they are done**. A Lead will read a list of gates as a status. | minor | Head the list "Gates for planning (check in Jira)", and link to the JQL for "S22 candidates not Estimated / not approved". |
| E4 | none | **The planning inputs the Lead actually brings are missing**: (1) S20 UAT's **non-blocking findings go into the next sprint as first priority** (`uat-window` detail), so they must be in S22 planning; (2) the 2/3 capacity, 1/3 buffer rule; (3) "Full Refinement is skipped this week". (2) and (3) are in the `sprint-planning` detail. (1) is not a rule anywhere. | major | Add a Lead/IM/AM rule on planning −1: "Bring 2026-20 UAT non-blocking findings to 2026-22 planning as first priority". Show the capacity rule in the planning item's one-liner. |
| E5 | none | Capacity (leave, public holidays) is the other half of planning, and the page cannot supply it. | minor | Say so in the planning item: "Check team leave before committing". Do not invent numbers. |
| E6 | A, B, C | **Pre-Refinement on Wed 7 Oct 14:00 (week 2) is shown** in rail B and in Coming up C. So is "Rank the refinement queue" on week-2 Wednesdays. Per the process, refinement runs only in **week 1** (Wed and Thu). `pre-refinement` and `rank-refinement-queue` are `{ weekly: 'Wed' }` with no `week: 1`, so `schedule.js` emits them every week, and SPEC acceptance check 5 even asserts the week-2 one. That sends developers and QA to a meeting that does not exist, on the busiest prep day of the cycle. | major | Confirm with the owner. If week 1 only is right, set `week: 1` on both rules and correct SPEC check 5. Then the rail and Coming up follow automatically. |
| E7 | top bar | The role is called "Lead", but in the unit there are delivery leads and dev team leads, and the refinement page names three different rankers. | minor | Label it "Delivery lead". Add a tooltip saying who it covers. |

---

## 3. Cross-cutting judgements

### 3.1 Time-first single list vs the old Previous / Current / Next columns

**Time-first wins clearly.** The old "Previous" column carried the most critical work (Demo, UAT, cut-off, Live) under a label that reads as "done". Every C1 question is "what time / what next". Frame B proves the point: the cut-off Monday reads top to bottom in process order (12:00 → revert → Live → confirm), which the column layout could never do.

Two conditions:

- The sprint tag must use **Insly's words for the state**, not new verbs (B4). People track a release by its number and its environment: "20 is on Demo", "21 freezes Friday".
- One thing the columns did give is a stable place to look for "my clients' release". The rail must keep that: the UAT-on-Demo sprint always in the top row, with the cut-off date in bold. Frame A does this well.

### 3.2 Urgent state: help or alarm fatigue?

Counting the design's own states over one 10-day cycle (S21, 28 Sep – 9 Oct):

| Day | State | Band |
|---|---|---|
| Mon w1 | heads-up (matrix for Demo) | orange top rule |
| Tue w1 | **urgent** (Demo update) | **full orange, all day, all roles** |
| Wed w1 | event (UAT opens) | orange top rule |
| Thu w1 | event (Full Refinement) | orange top rule |
| Fri w1 | heads-up (cut-off Monday) | orange top rule |
| Mon w2 | **urgent** → urgent-after | **full orange** → charcoal |
| Tue w2 | quiet | white |
| Wed w2 | heads-up (planning tomorrow) | orange top rule |
| Thu w2 | heads-up (freeze tomorrow), wrongly beating planning | orange top rule |
| Fri w2 | event (freeze starts) | orange top rule |

- **Cut-off Monday before 12:00: the full orange is right**, for everyone. Every role is affected.
- **Demo Tuesday all day, all roles: too much.** For AM, Analyst and Lead, nothing is due on Tuesday. QA's deadline is before the update, and the deploy is Dev's. Two full-orange days in ten, where one of them is irrelevant to half the readers, is how alarm fatigue starts.
- **The orange top rule on 9 of 10 days stops meaning anything.** Event and heads-up both use it (`band--event` has `border-top: 4px var(--accent)`).

**Fix:** keep the full orange for cut-off Monday morning (all roles) and for Demo Tuesday only for Dev and QA. Others get the heads-up style: "Demo update tonight. Don't tell clients yet." Reserve the orange top rule for **heads-up days** (eve of cut-off, Demo or planning). Event days get a plain white band. The headline text carries the event.

### 3.3 Role picker and separate IM / AM buttons

- **The first-visit picker is good.** Rendering the "Everyone" list underneath, so the page is useful before a choice, is the right call. Keep `?role=` for rollout links.
- **Separate IM and AM buttons: merge them.** They map to the same lane, so two buttons with identical output are a choice without a consequence. That invites "did I pick the wrong one?" In a small delivery unit, the same person is often IM for one client and AM for another, and an IM becomes the AM after a client goes live. Storing `AM` vs `IM` "for future emphasis" (DESIGN §9.3) is speculative. Use one button labelled **"IM / AM"**. The process documents and `rules.js` already use that term, so people recognise it. If emphasis rules ever exist, split the button then.
- "Everyone", "Show everything" and the `Everyone ▾` select are three names for one option. Pick one ("Everyone").
- Project managers (for example on the BB account) are not in the list. They will pick IM / AM, and the label should make that obvious (tooltip: "IM, AM, project managers").

### 3.4 "How the cycle works" explainer (Frame G)

It is useful, and better than anything new joiners get today. Three overlapping lanes with a today line is the right picture. It is missing the two things new joiners actually get stuck on:

1. **Environments.** The explainer never says that **Beta, Demo and Live are three environments**, and that a sprint's code moves Beta → Demo (Tuesday) → Live (Monday). That is the backbone of every other term. Add a one-row "where the code is" strip under each lane: Beta (build and freeze) → Demo (UAT) → Live.
2. **Refinement feeding the next sprint.** "Why are we refining 22 while building 21 and releasing 20?" is the classic week-1 confusion. The track shows planning dots but no Pre-Refinement or Full Refinement markers. Add week-1 Wed and Thu markers on the *building* lane, with an arrow to the next lane's planning dot.

The glossary should also include: Beta, Ready for Demo, Ready for Live, revert, release branch, Release / Golive Release page, Pre- vs Full Refinement, Definition of Ready, priority call, bug retro and hotfix. Keep each entry to one line, and fix the freeze wording to "until the Demo update (Tue evening); Beta reopens Wed".

Collapsed by default after the first visit is right. "Open by default on first visit" is fine. On mobile, the 1008 px sideways-scrolling track is weak. A vertical list version ("Week 1 Mon: …") would serve phones better, but this is minor.

### 3.5 Wording against how Insly people talk

| In the mockup | Issue | Use instead |
|---|---|---|
| "Code freeze … until Wed 14 Oct" | Wrong: the freeze ends with the Demo update | "until the Demo update Tue 13 Oct; Beta reopens Wed" |
| "Releasing / Building / Preparing" | Invented verbs | "UAT on Demo", "Sprint day 4", "Refinement" |
| "Demo night", "Live night" | Not house terms | "Demo update", "Live update" |
| Chip "Release" on deploys | Collides with "Release 2026-NN" page | "Update" (Demo update / Live update) |
| "Revert items that missed the cut-off" for IM/AM | Dev task wording | "Agree reverts, tell affected clients" |
| "Fix cut-off" | Fine. People also say just "cut-off" | Keep "Fix cut-off" in titles, "cut-off" in running text |
| "2026-20" | Correct per release pages. Colloquially people also say "S20" (bug retro page "S20 – 28.09.2026") | "2026-20" is fine. Accept "S20" in the glossary as an alias |
| "Golive page" (sequence strip) | Fine as a short form | Full name in the item: "Golive Release 2026-20 page" |
| "2 working days" (next milestone) | People think in weekdays | "Mon 5 Oct, 12:00" big, and "in 2 working days" small |

---

## 4. What the design depends on but the data cannot supply

| Dependency | Where | Why it fails | What to do |
|---|---|---|---|
| **Time zone of 12:00** | Countdown, urgent → after switch | `schedule.js` uses the device clock. The cut-off is Tallinn time. Anyone travelling, or working with Dubai or other non-EET clients, gets a wrong countdown and a wrong "cut-off passed". | Compute "now" in `Europe/Tallinn` with `Intl.DateTimeFormat`. This is computable, so it is not a data gap. Show "12:00 Tallinn time" when the device zone differs. **Major.** |
| **Demo and Live update times** | Evening state, "tonight" | Not documented (SPEC #6). | Use an owner-agreed threshold for the band switch. Keep saying "tonight", never a fake time. |
| **Whether Demo or Live actually ran** | "Last night" strip, UAT notice Wednesday | No Jira and no deploy signal. Updates slip into the night or to the next day. | Phrase as schedule, not fact: "Live update was scheduled last night. Confirm to clients once the developers confirm it." |
| **Whether anything needs reverting** | Revert item, "Reverts now" band | Jira and IM/AM knowledge. | Conditional wording (C2). |
| **Who deploys** | UC-07 | No rota. | Show nothing (as designed), or a static link to a rota page if one exists. |
| **Which clients or items are mine** | AM with 5 clients, IM in UAT | No Jira, no client data. | Deep links built from JQL templates and the release number. No API needed. |
| **Gate status before planning** | Lead "Also today" | No Jira. | Label as gates to check, not status (E3). |
| **Public holidays and year-end breaks** | "in 2 working days", countdowns, projected sprints | Working days exclude only weekends. An Estonian public holiday on a Monday cut-off, or the Christmas break (SPEC discrepancy #4), makes countdowns and projected dates wrong. | Add a holiday list to `schedule.js` (static data, no integration). Until then, label projected dates as now, and never count working days across an unconfirmed range. |
| **Per-client priority call days** | Wed reminder | Not modelled (SPEC non-goal). | Keep the generic reminder. Don't imply a date. |
| **Client project go-live dates** | IM persona | Not sprint-calendar data. | State the scope in the glossary (B2). |
| **Week-1-only refinement** | Rail, Coming up | Rule data says weekly. | Fix in `rules.js` after confirming (E6). |

---

## 5. Verdict

**Approve the direction. Do not approve the design for build yet.**

Time-first, a unit-wide headline, the key-day tab title, a compact sprint rail, and one empty state are the right architecture, and Frame B shows they work. The gaps are in process truth (refinement weeks, freeze end, AM revert duty, effective cut-off), the state model (planning-day precedence, too much orange), and coverage (no frames for Demo Tuesday, UAT Wednesday, freeze Friday, planning Thursday, Live evening or the Tuesday after Live). A board whose success measure is "nobody missed a key day" has to be shown working on all the key days before it is built.

### Top 5 required changes

1. **Correct the process truth in rules and copy.** Make Pre-Refinement and queue ranking week-1 only (after owner confirmation; also fix SPEC check 5). Change the freeze wording everywhere to "until the Demo update Tue evening; Beta reopens Wed". Set Ready for Live by 12:00. Give IM/AM the revert duty as "agree reverts and tell affected clients". Add the Monday-morning "last chase" and the "raise blocking bugs now" sub-line for IM/AM.
2. **Make post-deploy carry-over required, with an evening state.** Show "Confirm Live to clients" and "Golive Release page" on the morning after Live (and the Demo equivalent). Add a clock-based evening band ("Live update tonight") so the page never says "Reverts now" at 21:00. Always phrase deploys as scheduled, not confirmed.
3. **Fix the headline state model.** Today's event beats tomorrow's heads-up (so planning Thursday reads "Sprint planning today"), with role-aware tie-breaks. Full orange on Demo Tuesday only for Dev and QA. The orange top rule only on heads-up days. Promote windows to full items on their first day as well as their last (regression run on freeze Friday). Compute all clock logic in Europe/Tallinn time.
4. **Mock the missing key days before build.** Tue Demo (Dev, QA, IM), Wed UAT opens (IM, with the deadline and Copy), Thu planning (Lead, including "Also today"), Fri freeze (QA), Mon 19:00 (Dev), and Tue after Live (AM). Check each against the 5-second test.
5. **Simplify roles and link out where the data stops.** Merge IM and AM into one "IM / AM" button and use one name for "Everyone". Add deep links instead of data: the Demo/Live matrix, Confluence searches for "Release / Golive Release 2026-NN", and JQL links for "UAT open in 2026-NN" and "planning candidates not ready". Extend the explainer with the Beta → Demo → Live environment strip and the refinement → next-sprint arrow.
