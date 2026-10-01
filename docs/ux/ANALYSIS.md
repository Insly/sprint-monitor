# MGA Sprint Board: heuristic evaluation of the current page

Status: draft for review, 2026-10-01. Evaluated build: the live page at https://insly-sprint-monitor.onrender.com. A fetch on 2026-10-01 is byte-identical to `public/index.html` in the repo.
Method: a walkthrough of each use case in `USE-CASES.md`, scored against Nielsen's 10 heuristics, plus information scent, a simulated 5-second test and a scannability check. The rendered output was measured in a browser at 1280×800 and 400×698 with `#date-` previews. Contrast was computed with the WCAG 2.x formula.

**Severity (Nielsen):** 0 = not a problem · 1 = cosmetic · 2 = minor · 3 = major (fix soon) · 4 = catastrophe (fix before relying on the page).

---

## 1. Summary

The page computes the right things. The date engine and the 36 rules are sound, and every acceptance check in SPEC.md is met. The page is clunky because of **how** it presents them:

1. The biggest thing on screen is the sprint number. The thing people come for, "what must I do today, and is today a big day?", sits below it in small type, split across three columns.
2. **Key days look exactly like quiet days.** Cut-off/Live Monday has the same colours, layout and tab title as an ordinary Thursday. That works directly against the SPEC success measure ("no missed cut-off caused by didn't know it was today").
3. The three-column "Previous / Current / Next" layout organises actions by *sprint relation*. People think in *time* ("by 12:00", "tonight", "tomorrow"). The columns scatter one day's work, waste two-thirds of the width on key days, and push items below the fold.
4. Every item is a full card with its whole explanation and source link, every day. Multi-day items repeat the same paragraph for up to 4 working days. People learn to skip them.
5. The role filter defaults to "All", is visually minor, and is never offered on first visit, so most people see everyone's actions.

## 2. Five-second test (simulated)

Each test asks what a first-tab glance of about 5 seconds, with no scrolling, gives the person at the top of the page.

**Thu 1 Oct 2026, desktop 1280×800, role All (default)**

| Order the eye lands | Element | Takeaway |
|---|---|---|
| 1 | `h1` "2026-21 · Day 4 of 10" (56 px, bold) | "We are in sprint 21." Nobody needs this every morning. |
| 2 | Meter bar + date range | "Early in the sprint." |
| 3 | Column heads "PREVIOUS Sprint 2026-20 / CURRENT Sprint 2026-21 / NEXT Sprint 2026-22" | The person has to map three sprint numbers to phases. |
| 4 | First card, left column: "WINDOW · Until Mon 5 Oct · Set tasks Ready for Live" | A low-urgency, multi-day item gets the prime spot. |
| missed | "Full Refinement 14:00" (the only timed meeting today) | It sits in the **right** column, the last reading position. On mobile it is at y = 1079 px, 1.5 screens down. |
| missed | "2026-20: UAT on Demo, cut-off Mon 5 Oct 12:00" | The most useful sentence on the page, but it is a 14 px muted phase line. |

Result: **fail.** The 5 seconds answer "which sprint" and miss "14:00 meeting today" and "cut-off is Monday".

**Mon 5 Oct 2026 (cut-off / Live), desktop 1280×800, role All**

| Order | Element | Takeaway |
|---|---|---|
| 1 | `h1` "2026-21 · Day 6 of 10" | Says nothing about cut-off day. The tab title is "2026-21 day 6 · MGA Sprint Board". |
| 2 | Left column, first card: "DEADLINE 12:00 Fix cut-off" | Found, but it has the same visual weight as every other card. |
| 3 | Middle and right columns | Nearly empty ("No actions today. Next for 2026-21: …"). Two-thirds of the width shows nothing important. |
| below fold | "Revert items that missed the cut-off" (y = 1152 px), "Set tasks Ready for Live" (1366), "UAT window: Last day" (1516) | Not seen in a glance. |

Result: **partial pass.** The cut-off card can be found, but nothing marks the day as exceptional, and the afternoon sequence is out of order (see F-05).

## 3. Findings

Each finding cites the element (selector or source line in `public/index.html`), the heuristic or principle, the use cases it hurts, and its severity.

### Hierarchy and glanceability

**F-01. The hero answers the wrong question.** *Severity 3.*
`header.today > h1` ("2026-21 · Day 4 of 10", `clamp(34px, 7vw, 56px)` bold, line 131) is by far the most prominent element. The phase line `p.phases` (line 150: 14 px, `--muted`) holds the operationally useful facts ("2026-20: UAT on Demo, cut-off Mon 5 Oct 12:00. 2026-22: planning Thu 8 Oct.") but looks like a footnote. The 10-segment meter adds a second, redundant encoding of "day 4".
*Heuristics:* H8 aesthetic and minimalist design (the emphasis is on low-value information), H1 visibility of system status (the status that matters is not prominent). *Hurts:* every daily use case, UC-14.

**F-02. Key days are not distinguishable from quiet days.** *Severity 4.*
`render()` has no state for "today is cut-off/Live", "Demo night" or "freeze starts". The fix cut-off is one `.act.k-deadline` card among others, with the same 4 px orange-brown left border as "Create the Golive release page". `document.title` (line 503) is always `"<sprint> day N · MGA Sprint Board"`. The browser tab, which is the cheapest glance surface for a first-tab home page, never says "Cut-off 12:00". After 12:00 nothing changes either: the page is not aware of the time of day, so the 12:00 card stays as it was all afternoon (UC-16).
*Heuristics:* H1 visibility of system status. *Hurts:* UC-01, 04, 06, 07, 08, 16, and the SPEC success measure directly.

**F-03. Scannability: card titles compete with their own explanations.** *Severity 2.*
Each `.act` shows the kind chip (11 px uppercase), an optional time, the title (16 px/600), the full `act-detail` paragraph (14 px, often 2–3 lines), role chips, and the source link. With 7 cards on Monday that is about 1,100 px of prose. People scanning in an F-pattern read the first two words of each title, but the titles are not front-loaded with time or consequence ("Fix cut-off" has no time in the title; the time is in a 12 px chip above it).
*Principle:* scannability, progressive disclosure. *Hurts:* UC-01, 07.

### Information architecture: the three-column model

**F-04. "Previous / Current / Next" is the wrong primary axis.** *Severity 3.*
`renderActions()` (lines 541–589) builds `.cols` with three equal columns keyed by `relation`. Problems:
- **Mapping cost.** People must translate "Previous Sprint 2026-20" into "the one in UAT that goes live Monday". The labels describe sprint *order*, not *phase*. "Previous" suggests "done", yet the previous sprint carries the most critical work of the cycle (Demo, UAT, cut-off, Live). That is poor information scent.
- **Time is scattered.** One day's work is split by sprint. On Thu 1 Oct the only meeting is in the right column. On Wed 7 Oct the IM/AM's three planning-prep items sit in "Next" while the freeze-related items sit elsewhere. People think "today in time order", not "today by sprint".
- **The same event jumps columns.** The engine evaluates dated rules against all three sprints (SPEC note). So `code-freeze` appears under **Current** on Fri 9 Oct and under **Previous** from Mon 12 Oct. One continuous event moves across the screen over a weekend. *H4 consistency.*
- **Width is wasted on key days.** On Mon 5 Oct at 1280 px, all 7 cards are in the left column (x = 107 px), and the middle and right columns contain one empty-state line each. The left column runs to y ≈ 1,650 px.
- **Mobile stacking order.** Under 820 px the columns stack Previous → Current → Next. A UAT window card from last sprint therefore comes before today's 14:00 meeting.

The sprint relation is still worth showing as a **tag** on each item and as a compact three-sprint **status summary** (it answers UC-14). It should not be the layout axis.
*Heuristics:* H2 match with the real world, H4 consistency, H8. *Hurts:* all daily use cases.

**F-05. The order within a day contradicts the process.** *Severity 3.*
`compareActions()` in `schedule.js` sorts by time, then kind (`deploy < deadline < meeting < window < reminder`), then alphabetically. On Mon 5 Oct that gives: Fix cut-off 12:00 → **Live update** → Confirm Live update to clients → Create the Golive release page → **Revert items that missed the cut-off**. The real order is cut-off → revert → Live (evening) → confirm/Golive page (after Live). In the current sort the revert comes last, after the Live update it must precede. The same happens on Tuesday: "Demo update" (evening) is listed before "All tasks tested and Ready for Demo" (due before it).
*Heuristics:* H2 match with the real world. *Hurts:* UC-06, 07, 08.

**F-06. Items that follow a deploy disappear the morning after.** *Severity 2.*
`confirm-live-to-client` and `golive-page` exist only `on: live` (Monday). The Live update runs Monday evening, so the confirmation often happens Tuesday morning, when the page no longer mentions it. Demo is handled better: `inform-client-uat` is on Wednesday.
*Heuristics:* H6 recognition rather than recall. *Hurts:* UC-02.

**F-07. The UAT-notice item does not carry the UAT deadline.** *Severity 3.*
On Wed 30 Sep the IM/AM card "Tell clients their items are on Demo" says "…give them the UAT deadline" but does not print it. The date (Mon 5 Oct, 12:00) is only in the 14 px phase line or the release track. This is exactly the fact the IM pastes into the client email, and it is computable (`previous.cutoff`).
*Heuristics:* H6 recognition rather than recall, H7 efficiency. *Hurts:* UC-04.

### Role filter

**F-08. The role filter defaults to "All", is visually minor, and is never introduced.** *Severity 3.*
`#roles` (line 286) is a row of 13 px pills placed right of a 13 px uppercase "TODAY" label. On first visit `loadRole()` returns `'All'`, so a new user sees every role's actions: 14 items on Mon 5 Oct, including QA regression and analyst work. Nothing invites them to choose. Persistence in `localStorage` (`mgaSprintBoard.role`) works, but:
- there is no visible "you are viewing as Dev" summary once chosen, so a colleague at someone else's screen cannot tell the view is filtered;
- the choice cannot be set by URL (`?role=dev`), which would let teams roll out per-role home-page links;
- pill height is 32 px, below the 44 px touch target on mobile.
*Heuristics:* H1, H3 user control, H7. *Hurts:* every daily use case.

**F-09. Filtering hides what Leads and IM/AMs need to see about others.** *Severity 2.*
`roleMatch()` is strict. With **Lead** selected, Thu 1 Oct shows only "Log time today" (inside the collapsed Ongoing group). Wed 7 Oct shows one Lead item and hides the IM/AM Definition of Ready and priority-call gates the Lead must chase (UC-11). With **Dev** selected on Mon 5 Oct, the IM/AM's "Confirm Live update to clients" is hidden, which is fine. But unit-wide milestones (for example "Demo update tonight" for a QA) are also hidden unless the rule lists that role. There is no "also today for others" affordance.
*Heuristics:* H1, H7. *Hurts:* UC-11, UC-14.

**F-10. "IM/AM" reads as one role.** *Severity 1.*
The pill reads "IM/AM", which is accurate for the rules but not how people name themselves. A first-visit picker could offer "IM" and "AM" as separate choices that map to the same rules today and leave room for different emphasis later.

### Card density and repetition

**F-11. A source link on every card.** *Severity 2.*
`.src` (line 190, `margin-left:auto`) shows the full source title, for example "Delivery process task lifecycle by role", on every card. On Mon 5 Oct, 7 of 7 cards have one, and 4 are the same page. The footer lists all 11 sources again. Sources matter for trust and onboarding (UC-13), but in daily use they are noise that also adds an extra tab stop per card.
*Heuristics:* H8. *Fix:* move the source into the expandable detail.

**F-12. Multi-day items repeat at full size every day.** *Severity 3.*
`isOngoing` (line 380) collapses only windows of **7 or more calendar days**. The UAT window (Wed 30 Sep → Mon 5 Oct = 5 days), "Set tasks Ready for Live" (same) and "Code freeze" (Fri → Wed = 5 days) are therefore full cards with full paragraphs on every working day they are open: 4 consecutive working days with identical text. This trains banner blindness, so when the *last day* comes (Mon 5 Oct: "Last day") the card looks exactly as it did on Wednesday.
*Heuristics:* H8, H1. *Hurts:* UC-01, 06.

**F-13. The "Ongoing this sprint" group hides daily duties and uses an arbitrary threshold.** *Severity 2.*
`details.ongoing` is collapsed by default. Its open state is not remembered, and it holds 7 items on Thu 1 Oct with role All. For Dev it contains the core daily habits ("Get 2 code reviews within 24h", "Verify on Beta"). For everyone it contains "Log time today". Hiding these is right for the glance, but they are then never seen at all. Showing them as a one-line compact checklist would serve the glance and still keep them in view. The label "this sprint" is also inaccurate whenever a previous-sprint window is 7 days or longer (not the case today, but possible with overrides).
*Heuristics:* H6, H8. *Hurts:* UC-07, UC-10.

### Release track

**F-14. The release track holds prime space for occasional value.** *Severity 2.*
`#track-scroll` is the second section, directly after Today. It is 3 lanes × 84 px plus the axis, about 8 weeks wide at 22 px/day (≈1,300 px), so it scrolls sideways below about 1,300 px, with 10–11 px labels (`.stn-label small` 10 px, `.axis .tick` 11 px). It is the best artefact on the page for **learning** the cycle (UC-13) and for **returning** (UC-14). Nobody needs it daily: no daily use case reads it. On mobile it starts at y = 1,332 px, and "Coming up", which is used more, is pushed to y = 1,747 px.
*Heuristics:* H8. *Fix:* collapse it into a "How the cycle works" section, opened by default only on first visit.

**F-15. "Coming up" is the second most useful section but comes last.** *Severity 2.*
`#upcoming` is role-filtered and grouped by day, which is good. But it comes after the track. It gives unit-wide milestones (Demo update, Live update) no more emphasis than a reminder. Windows read as "UAT window opens, until Mon 19 Oct", which is fine.
*Hurts:* UC-03, 11, 14.

### States

**F-16. Weekend behaviour is mostly right but slightly off in tone.** *Severity 1.*
On Sat 3 Oct the `h1` reads "2026-21 · Weekend", a note says the actions are for Mon 5 Oct, and the section heading becomes "Actions for Mon 5 Oct". That is correct. But Monday's cut-off cards render exactly as they would on Monday itself, and nothing summarises the day ("Monday is cut-off and Live day"). This is acceptable, but a calm one-line summary would be better (UC-17).

**F-17. Empty states are helpful but repeated per column.** *Severity 2.*
`p.empty` ("No actions today. Next for 2026-21: Regression plans ready in TestRail, Thu 8 Oct.") is a good pattern because it gives the next step. But it can appear in up to three columns at once. For narrow roles (Lead, Analyst) most days produce three empty columns plus a collapsed group, so the whole Today block says "nothing" three times. The fallback "Nothing scheduled for it in the next five weeks" is odd wording ("it" = the sprint).
*Heuristics:* H8, H10.

**F-18. Preview has no UI.** *Severity 2.*
Previewing works only by typing `#date-YYYY-MM-DD` or `?date=` into the address bar (lines 399–411). The preview banner (`#preview`, amber `--deadline-soft`) and "Back to today" are good once you are there. There is no date picker and no ‹ › day stepping, so UC-15 depends on knowing a URL trick. The banner's amber colour is the same family as deadlines, so a preview can be mistaken for a warning.
*Heuristics:* H7 flexibility, H6. *Hurts:* UC-15.

**F-19. Projected and unconfirmed sprints are communicated with small grey tags.** *Severity 1.*
`.tag` "projected" (11 px) is good practice. Around year end, though (2027-2 onward), the "unconfirmed" amber note is the only signal, and it uses the same styling as other notices.

### Language

**F-20. Internal jargon in labels.** *Severity 2.*
The kind chips print the rule schema's vocabulary: "WINDOW", "REMINDER", "DEADLINE", "DEPLOY", "MEETING". "Window" and "reminder" mean nothing to a reader. The column labels "Previous / Current / Next" are similar (see F-04). "Today only" / "Opens today, until…" / "Last day" (`whenText`) are good and should be the model.
*Heuristics:* H2 match with the real world.

### Mobile (≤ 420 px)

**F-21. On mobile the page is about 5 screens long and the important item is buried.** *Severity 3.*
At 400×698, Thu 1 Oct: the document is 3,582 px. The first card is a previous-sprint window at y = 462. The 14:00 meeting is at 1,079 and the track at 1,332 (it scrolls sideways inside a vertically scrolling page, which is awkward on touch). Coming up is at 1,747. Monday stacks 7 full cards before the current sprint is mentioned. The role pills wrap well, but at 32 px they are below the 44 px touch-target guideline. The hero clamps to 34 px, which still gives about 120 px of the first screen to "2026-21 · Day 4 of 10".
*Hurts:* everyone who checks the board on a phone, for example on Monday before reaching the office.

### Accessibility

**F-22. The whole header is an `aria-live` region and it re-renders on every role click.** *Severity 2.*
`<header class="today" id="today" aria-live="polite">` (line 279) is fully replaced by `fill()` on every `render()`, and `render()` runs on every role-pill click. Screen-reader users therefore hear the date, sprint and phase line again each time they change the filter. The live region should be limited to the one thing that changes on its own (the day or state rollover) and should not fire on user-initiated filtering.

**F-23. Landmark and heading structure.** *Severity 2.*
There is no `<main>` and no skip link. Content sits in `div.wrap` with a `header`, three `section`s, a `details` and a `footer`. Headings: `h1` (sprint/day) → `h2` "Today" → `h3` column titles → `h3` card titles. Cards share the heading level of their column, so the outline is flat and ambiguous. "Coming up" days are also `h3`. The page's main question ("what do I do today") has no heading of its own above the fold.

**F-24. Contrast mostly passes. Small type and the external fonts are the issue.** *Severity 1.*
Measured: `--muted #5B6672` on `--paper #F4F6F3` = 5.38:1 ✓. Muted on `--reminder-soft` = 4.87:1 ✓. Link `--accent #0E7C6B` on paper = 4.70:1 ✓. Dark `--muted #9AA6B1` on `--surface #172028` = 6.64:1 ✓. `--deadline #B86E00` on white = 3.99:1, which would fail as text but is only used for borders ✓. The real problems are the 10–12 px sizes (track stations, chips, axis ticks, `.who`) and the 11 px uppercase letter-spaced chips, which are hard to read at a glance. Kind is shown with colour *and* text, which is good. `:focus-visible` gives a clear 2 px outline, which is good. Role buttons use `aria-pressed` correctly, and the track has a full text alternative (`role="img"` + `aria-label`). Both are good.

**F-25. Reduced motion is respected.** *Severity 0.* There is no motion anyway.

### Dark mode and brand

**F-26. Dark mode follows the system but has no manual switch.** *Severity 1.*
The tokens are well built (`prefers-color-scheme` plus a `[data-theme]` override), but no control sets `data-theme`. This is acceptable for a home page, since the OS setting is usually what people want.

**F-27. The page is off-brand and loads external fonts.** *Severity 2.*
The accent is teal `#0E7C6B`, the favicon is teal, and the type is Familjen Grotesk, IBM Plex Sans and IBM Plex Mono from `fonts.googleapis.com` (line 12). Insly's CVI is Insly Orange `#FF7D00` with charcoal and greys, set in Arial. On a page that opens in every browser every morning, a third-party font request also adds a dependency and a font swap on first paint. Switching to Arial removes both.

### Things that work and should be kept

- Correct, tested date logic, plus honest "projected" and "unconfirmed" labelling.
- Empty states that point to the next item (`p.empty`).
- Human time phrasing in `whenText()` ("Opens today", "Last day").
- Self-refresh on day change and on `visibilitychange` (important for a tab left open for days).
- The preview banner with "Back to today".
- The release track as an onboarding artefact, including its text alternative.
- Role persistence.

## 4. Findings by severity

| Sev | Findings |
|---|---|
| 4 | F-02 key days are indistinguishable |
| 3 | F-01 hero hierarchy · F-04 three-column model · F-05 order within a day · F-07 UAT deadline not on the item · F-08 role default and discoverability · F-12 repeating multi-day cards · F-21 mobile length |
| 2 | F-03 card scannability · F-06 post-deploy items vanish · F-09 strict filter hides team gates · F-11 source link on every card · F-13 Ongoing group · F-14 track placement · F-15 Coming up placement · F-17 empty states ×3 · F-18 no preview UI · F-20 jargon · F-22 aria-live · F-23 landmarks/headings · F-27 brand/fonts |
| 1 | F-10 IM/AM label · F-16 weekend tone · F-19 projected tags · F-24 small type · F-26 no theme switch |
| 0 | F-25 |

## 5. Use-case coverage today

| UC | Supported today? | Main blockers |
|---|---|---|
| 01 AM cut-off morning | Partly | F-02, F-05, F-12 |
| 02 AM confirm Live | No (Tuesday) | F-06 |
| 03 AM Friday | Yes | F-04 (tomorrow's Monday not emphasised) |
| 04 IM UAT notice | Partly | F-07 |
| 05 IM matrix | Yes | F-11 (link hunt) |
| 06 IM go-live Monday | Partly | F-02 (no post-12:00 state), F-05 |
| 07 Dev Monday | Partly | F-05; rota out of reach |
| 08 Dev Demo night | Partly | F-02, F-05 |
| 09 QA freeze | Yes | F-04 (freeze jumps columns) |
| 10 QA midweek | Yes | F-13 |
| 11 Lead planning | Poor | F-09 |
| 12 Analyst | Yes | none |
| 13 New joiner | Partly | F-08 (no first-visit flow), F-20 |
| 14 Returner | Partly | F-01 (the phase line is the answer but is a footnote) |
| 15 Preview | Hidden | F-18 |
| 16 Mid-day return | No | F-02 |
| 17 Weekend | Yes | F-16 |
