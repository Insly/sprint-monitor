# MGA Sprint Board: design direction (v2)

Status: v2.1, 2026-10-01 (the owner approved the v2 direction; the v2.1 addendum is below). Companions: `USE-CASES.md` (who and why), `ANALYSIS.md` (what is wrong with the current page), **`STATES.md` (normative state table and fixtures)**, `mockup.html` (visual reference).
Reviews addressed: `REVIEW-1-ux-a11y.md`, `REVIEW-2-practitioner.md`. The owner's decisions of 2026-10-01 override both where they conflict.

Scope: presentation, plus a precise list of rule changes (§14) and one new static data file (`duty.js`, §9). Everything on screen comes from `schedule.js`, `rules.js`, `duty.js`, the Tallinn clock and one remembered role. Static deep links to Confluence pages are allowed. No Jira API.

---

## v2 changes (summary)

| # | Change | Why |
|---|---|---|
| 1 | **State model rewritten and moved to STATES.md.** The cut-off day uses time phases (before 12:00 / after 12:00 / evening ≥ 17:00), so "cut-off passed" is reachable. An event today now leads the headline and a heads-up for tomorrow follows it ("Sprint planning today. Code freeze starts tomorrow."). A new **evening** state covers deploy nights. | R1 B-1, B-2. R2 C1, E1 |
| 2 | **Orange discipline.** A full orange band appears only on cut-off Monday before 12:00 (all roles) and on Demo Tuesday for Dev and QA. Heads-up only for the key day's actors. The four non-calm states differ in fill, bar and tag | Owner decision 5. R2 §3.2. R1 M-5, m-12 |
| 3 | **All time logic in Europe/Tallinn**, labelled "(Tallinn time)" when the device zone differs | Owner decision 4. R1 M-2. R2 §4 |
| 4 | **One "IM / AM" role button.** "Everyone" is the only name for the all-roles view. First visit is derived from "no stored role" | Owner decision 3. R2 §3.3. R1 §6 |
| 5 | **No completion claims.** A neutral "Passed" chip, "Earlier today" in the order strip, no ✓, no strikethrough. Deploys are always described as *scheduled* | Owner decision 6. R1 M-4. R2 C3, §4 |
| 6 | **Freeze copy fixed everywhere:** "until the Demo update Tue {date} (evening)". Beta reopens Wednesday. `code-freeze` window now ends at `demoStart` (§14) | Owner decision 2. R2 C6 |
| 7 | **Duty line** (one component) from the new static rota `duty.js`: tonight's deployer(s), and this week's support duty dev | Owner decision (new data) |
| 8 | **Carry-over is required:** "Confirm Live update to clients", "Golive Release page" and "Release page" also appear on the next working day | R2 A5, C7. R1 §8 |
| 9 | **First-day and last-day promotion** of short windows (Run regression on freeze Friday, UAT window on Wednesday) | R2 D2 |
| 10 | **Focus ring that works on every surface** (white, charcoal, orange, preview bar). Forced-colours styles. Focus and a status message on role change | R1 M-1, m-4, M-6 |
| 11 | **Contrast fixes.** `--accent-text-strong` removed: orange text appears only as `#C35500` on white, and links on tints are charcoal. Track bars get outlines and labels | R1 §2.2, m-8, m-11 |
| 12 | **768–1199 px layout** added. Items collapsed by default. On mobile the order strip is dropped in the urgent state. Fold measured at 1093×614 and 390×844 (§4.4) | R1 M-7 |
| 13 | **Insly vocabulary.** Sprint tags show the state ("UAT on Demo", "Sprint day 4"), not invented verbs. The deploy chip says "Update". Uses "Live update" and avoids "go-live" | R2 B2, B4, §3.5 |
| 14 | **Item hierarchy.** The cut-off row is strongest. "Last day" and "Opens today" chips are outlined. The UAT window's close merges into the cut-off row. Other roles' items use neutral chips | R1 M-3, m-10 |
| 15 | **Rule additions and changes** (§14): last chase on cut-off morning, agree reverts and tell clients, UAT findings to planning, plus `slot`, `carryOver` and `links` fields | R2 A2, A3, E4 |
| 16 | **Explainer** now shows Beta → Demo → Live environments and refinement feeding the next sprint, with a longer glossary | R2 §3.4 |

## v2.1 changes (owner-approved direction; build starts from here)

| # | Change |
|---|---|
| 1 | **Sprint detail view**, linkable as `#sprint-{label}`. Each rail row and every sprint tag links to it |
| 2 | **Owner deploy times:** Demo update 17:00, Live update 20:00 (Tallinn). Evening state: Demo Tuesday from 17:00, Live Monday from 20:00. Cut-off Monday 12:00–19:59 is `after` ("cut-off passed"). `EVENING_FROM` is replaced by these two times |
| 3 | **Three-office time display** on the duty line and in the sprint view: `20:00 Tallinn · 19:00 Warsaw · 18:00 London` |
| 4 | **Year end:** 2027-2 starts Mon 4 Jan 2027. There is no release on 28 Dec. A new `break` state covers 21–31 Dec (STATES.md §12) |
| 5 | **EE and PL public holidays** as static data, shown inline only when they touch a sprint's key dates (decision below) |
| 6 | Duty names: first name + last initial from `duty.js`. Placeholders (`Dev A.`) in all docs |

### v2.1-A. Sprint detail view

**Decision: a full view (hash route) that replaces `main`, not an overlay or side panel.** It has to be shareable in Teams, the browser Back button has to work, and its content (timeline plus up to 41 rules) is longer than an overlay can hold. A full view also needs no focus trap, works the same way on mobile, and keeps the top bar (date, role) in place.

- **Route:** `#sprint-2026-21`. With a preview date: `#date-2026-10-01~sprint-2026-21`. Allowed characters are `[A-Za-z0-9._~-]` (the existing `SAFE_HASH`). Unknown labels show the `unknown` state (STATES.md §10). `hashchange` re-renders. Back returns to Today.
- **Entry points:** the sprint label on every rail row is a real `<a href="#sprint-…">` (the row stays compact), every sprint tag on an item, and the ‹ › arrows inside the view.
- **Layout (desktop ≥1200):** a header row with `← Today` (link to `#`), `‹ 2026-20` and `2026-22 ›` (links), and `Copy link`. Then an h1 `Sprint 2026-21`, the status line, the 5-step bar and the duty block for this sprint (Demo deployer, Live lead and backup, with three-office times). Body in two columns: **Timeline** on the left (a vertical `ol` of milestones with date and time, status `Passed` / `Today` / `Coming · in N working days`, and a "Today" marker as its own list item), and **Actions for {role}** on the right (grouped Passed / Running / Coming, with an `Everyone` toggle), then **Holidays**. At 768–1199 and on mobile it is a single column in the order header → timeline → duty → actions → holidays.
- **Role toggle:** a 2-option segmented control `{remembered role} | Everyone` (`role="radiogroup"`). It does **not** change the stored role and is not put in the URL. Shared links always open in the viewer's own role.
- **Keyboard and screen reader:** on route entry, focus moves to the h1 (`tabindex="-1"`) and `document.title` becomes `Sprint 2026-21 · Sprint Board`. Leaving the view returns focus to the rail link that opened it. The timeline is an `ol` with `aria-current="step"` on the Today marker. Milestone statuses are text, never colour alone. "Copy link" reports "Link copied" through the existing `role="status"` node. Arrows have accessible names ("Previous sprint 2026-20"). There is no focus trap.
- **Never claims completion:** a milestone is `Passed` by date or time only.

### v2.1-B. Holiday placement decision

**Inline, conditional, and never in the band.** A one-line ⓘ notice appears under a sprint's rail row (and in the sprint view's Holidays block) only when an EE or PL weekday holiday falls on that sprint's planning or start day, or between its freeze start and its Live update. Coming-up day rows that are holidays get a muted "· PL holiday" suffix.

Why inline rather than a separate view: at today's data, this triggers for one sprint a year (2027-1: 24–25 Dec, 1 Jan, 6 Jan PL on the day UAT opens), so it cannot crowd the page. When it does matter (a holiday on UAT day or a Live update), the person needs to see it *where the date is*, not behind a link. The sprint view always carries the full list for its span (or "No public holidays (EE, PL) between planning and Live"), so it also serves as the reference view. A separate holidays page would be one more place nobody visits. The board does **not** move dates automatically: a shifted Live update is entered by a person in `OVERRIDES`.

### v2.1-C. Engine and data API for the developer

```js
// schedule.js (pure, no DOM)
export function sprintByLabel(label)            // '2026-21' -> 21 ; null if not parseable. Uses YEAR_STARTS.
export function sprintDetail(n, date, rules, { role = null } = {})
  // returns {
  //   sprint: sprintDates(n),
  //   relation: 'previous'|'current'|'next'|'past'|'upcoming',
  //   milestones: [{ key, date, time|null, status: 'passed'|'today'|'coming', workingDaysAway }],
  //      keys: planning, start, freezeStart, bugRetro, demoStart, uatStart, cutoff, live
  //   actions: [{ date, ...action }]   // every occurrence with sprintNumber === n, scanning working days
  //                                    // from sprintDates(n-1).start to sprint.live; windows listed once,
  //                                    // on their `from` date; filtered by role when given
  // }
export function isBreakDay(date)                // a weekday after current.end, beyond workingDaysIn(current)
export function zonedNow(zone = 'Europe/Tallinn')            // { date: 'YYYY-MM-DD', time: 'HH:MM' }
export function formatAcrossZones(dateKey, hhmm, zones)      // '20:00 Tallinn · 19:00 Warsaw · 18:00 London'
                                                             // zones: Europe/Tallinn, Europe/Warsaw, Europe/London

// rules.js: optional `time` on the deploy rules (owner times)
//   demo-update: time: '17:00'     live-update: time: '20:00'
// The page derives DEMO_TIME / LIVE_TIME from these; the band switches and the order strip use them.

// schedule.js
//   OVERRIDES[27] = { start: '2027-01-04' }   // 2027-2 (owner). Add `planning` once confirmed (the formula gives Thu 31 Dec).
//   UNCONFIRMED_FROM = 28

// public/holidays.js (static)
export const HOLIDAYS = [
  { date: '2026-12-24', country: 'EE', name: 'Christmas Eve' },
  { date: '2026-12-24', country: 'PL', name: 'Christmas Eve' },
  { date: '2026-12-25', country: 'EE', name: 'Christmas Day' },
  { date: '2026-12-25', country: 'PL', name: 'Christmas Day' },
  { date: '2026-12-26', country: 'EE', name: 'Boxing Day' },        // Saturday: ignored by the notice
  { date: '2026-12-26', country: 'PL', name: 'Second Day of Christmas' },
  { date: '2027-01-01', country: 'EE', name: 'New Year Day' },
  { date: '2027-01-01', country: 'PL', name: 'New Year Day' },
  { date: '2027-01-06', country: 'PL', name: 'Epiphany' },
  // ... the full EE and PL lists for 2026–2027, to be filled from the official calendars
];
export function holidaysBetween(from, to, { weekdaysOnly = true } = {})
// Tests: dates are valid keys, country is EE or PL, no duplicate (date, country).

// public/duty.js (DESIGN §9): names stored as "First L." (real data); docs use placeholders.
```

---

## 1. Concept

**Lead with the day, not the sprint.** A headline band states what kind of day it is, in words. A **duty line** says who is on duty. Below that is **one time-ordered list** of *your* actions (by 12:00 → today → tonight → after the update). Each item is a single scannable line that expands to its explanation. A compact **sprint rail** keeps the three sprints in play visible as context, one line each, in Insly's own words ("UAT on Demo", "Sprint day 4 of 10", "Refinement"). The cycle diagram lives in "How the cycle works". Orange is rare and therefore meaningful: it is reserved for cut-off Monday morning and for the Demo update day of the people doing it.

## 2. Decision: time-first, not sprint columns

Unchanged from v1, and both reviewers agree. Every critical (C1) question is "what time / what next". Sprint relation is metadata: a tag on each item, plus the rail.

## 3. Information architecture

```
1. Top bar           Date · "Viewing as" role · View date
2. Headline band     What kind of day is it?                  (state, headline, sub-line, countdown/order)
3. Duty line         Who deploys tonight / last night / next · support duty this week
4. Your day          <your day>
   4a. From last night  (carry-over items, next working day only)
   4b. Slots: By 12:00 · Today · 14:00 … · Tonight · After the update
   4c. Running          one row per short window (expandable)
   4d. Every day this sprint   one row per sprint-long habit (expandable)
   4e. Next for you     first upcoming working day with items for the role
   4f. Also today       other roles' items (expanded by default for Lead)
5. Sprint rail       <sprints>
6. Coming up         <coming up> 7 working days on desktop ("+3 more"), 10 on expand
7. How the cycle works   <cycle> collapsed; open on first visit
8. Footer            Sources (once), home-page setup, data confidence, Tallinn time note
```

## 4. Layout

### 4.1 Desktop (≥ 1200 px)
- Container max 1200 px, 32 px padding. Top bar 56 px. Band full width: text left, countdown or next milestone right (340 px). Duty line directly under the band (one line, 44 px).
- Body: 7/5 columns. Left = Your day. Right = Sprint rail, then Coming up.

### 4.2 Laptop (768–1199 px), common at 125–150 % Windows scaling (1024–1093 CSS px)
- Container fluid, 24 px padding. Top bar: the segmented role control stays if it fits, otherwise it becomes the select.
- Band full width. On key days the countdown moves under the headline, and the order strip shows as one row.
- **Single column:** Your day at full width (max 760 px text measure). Below it, a 2-column row: Sprint rail | Coming up.
- Items are collapsed by default in every layout, because the band already carries the consequence line.

### 4.3 Mobile (≤ 767 px; designed at 390 px)
- 16 px gutter, single column, no sideways page scroll (only the cycle track scrolls, inside a focusable region).
- Top bar: date, then a role **select** shown as a 44 px button ("IM / AM ▾"). "View date" lives in a ⋯ menu with ‹ › stepping.
- Band: 26–28 px headline. **No order strip in the urgent state**, because Your day *is* the sequence. In `after` and `evening` a compact 2×2 strip is kept.
- Order: band → duty → Your day → rail → Coming up → cycle → footer.

### 4.4 Fold measurements (mockup v2, measured in the browser)

The fold is measured from the top of the page (top bar), with no browser chrome.

| Frame | Viewport | Band bottom | Visible above the fold |
|---|---|---|---|
| B: Mon 5 Oct 09:10, IM/AM, urgent | 1093 × 614 | 310 px (duty to 354) | All 3 "By 12:00" items (last chase, Fix cut-off, Ready for Live). The 4th item (after 12:00) starts at 640, below the fold |
| H: Thu 8 Oct, Lead, event | 1093 × 614 | 221 px (duty to 265) | Sprint planning item and the "Gates for planning" list |
| C: Mon 5 Oct 09:10, Dev, urgent | 390 × 844 | 270 px (duty to 354) | All 4 of the day's items (Fix cut-off, revert, Live update, Golive page) |
| D: Mon 5 Oct 13:20, Dev, after (dark) | 390 × 844 | 359 px (duty to 442) | The revert item, shown expanded in the mockup. Collapsed (the default), the Live update item also fits |
| E: Mon 5 Oct 20:00, Dev, evening | 390 × 844 | 330 px (duty to 414) | The Live update (expanded) and the Golive page |
| G: Wed 30 Sep, IM/AM, event | 390 × 844 | 231 px (duty to 294) | "Check your changes" and "Tell clients" (expanded, with the UAT deadline and Copy). Collapsed: all 5 items |

Target, met in every frame above: on key days the band, the duty line and every item that matches the band are above the fold.

## 5. Component inventory

| Component | Purpose | Content (all computable) | Notes |
|---|---|---|---|
| **Brand tag** `<label>` | Insly CVI section label (orange `<tag>`) | Five section anchors only: `<your day>`, `<sprints>`, `<coming up>`, `<cycle>`, plus the band's state tag (`<cut-off day>`, `<tonight>`, …) | The whole tag is `aria-hidden` where an `h2` follows. The band's state tag is repeated in visually hidden text inside the h1 (m-3). Orange `#C35500` on white. Charcoal on orange and on tints |
| **Top bar** | Orientation and controls | Date (Tallinn), "Viewing as" role, View date | `header`. The radiogroup is labelled by the visible "Viewing as" (`aria-labelledby`). Not sticky (2.4.11) |
| **Role control** | Filter | Everyone · IM / AM · Dev · QA · Lead · Analyst | Segmented radiogroup (desktop) / native select (mobile). `min-height`, not fixed heights (1.4.12). Tooltip on IM / AM: "IM, AM and project managers" |
| **First-visit picker** | Choose a role once | Six buttons, plus "New here? See how the cycle works" | Shown when no role is stored. After a pick, focus moves to the "Today for {role}" h2 (`tabindex=-1`) |
| **Status message** | Announce filter changes | "Showing 4 items for IM / AM" | Separate `role="status"` node. The headline live region only announces state changes |
| **Headline band** | The day in one sentence | State tag, h1 headline, role-aware sub-line, countdown or next milestone, order strip | 7 states (§6). The h1 text node is updated only when its string changes |
| **Countdown** | Time to 12:00 (cut-off morning only) | "2 h 50 min left until 12:00" + " (Tallinn time)" when the zones differ | Shows the date big and "in 2 working days" small on other days |
| **Order strip** | The key day's sequence | e.g. Fix cut-off 12:00 → Reverts (if any) → Tonight · Live update → After · Confirm to clients (IM/AM) / Golive page (Dev) | `ol`. The current step has `aria-current="step"` and a visible word ("Now", "Tonight"). Steps before now say "Earlier today". **No ✓.** Only timed steps can be "earlier" |
| **Duty line** | Who is on duty | Tonight's / last night's / next deployer(s); support duty dev this week | §9. One component, all roles. "not assigned yet" in muted text |
| **Agenda item** | One action | Slot or time · chip · title · sprint tag · chevron | Native `<details>`, collapsed by default. Expanded: rule `detail`, computed facts (e.g. UAT deadline with Copy), links (matrix, release pages), source |
| **Chips** | Kind and status, always words | `Due` (orange tint, charcoal text) · `Meeting` (purple) · `Update` (Green 1 fill, charcoal text) · `Check` (grey) · `Opens today` / `Last day` (**outlined**, charcoal border) · `Passed` (**neutral** grey) · `If needed` (outlined) | Every item has a chip, so colour is never the only signal. Other roles' items always use the grey chip. Items with `slot: 'after-cutoff'` show `If needed` instead of `Due` |
| **Slot heading** | Group by when | `By 12:00` · `Today` · `14:00` · `Tonight` · `After the update` · `From last night` | From the `slot` field (§14) |
| **Running list** | Short windows (≤ 7 days) between first and last day | One row each: title · "until the Demo update Tue 13 Oct (evening)" / "until Mon 5 Oct 12:00" | A `ul` of `<details>`, 44 px rows. No pipe separators |
| **Every day this sprint** | Sprint-long habits | One row each | Same pattern, collapsed group with a count |
| **Next for you** | Prepare a day ahead | "Tomorrow, Fri 2 Oct: …" or "Next for you: Mon 5 Oct …" | From `upcoming()` |
| **Also today** | Team awareness | Other roles' items for today, grey chips | Open by default for Lead, headed "Gates for planning (check in Jira)" on planning eve and planning day |
| **Empty state** | Nothing due | "Nothing due for QA today. Next: Pre-Refinement Wed 7 Oct 14:00." | One per page |
| **Sprint rail row** | Status of one sprint | Label · state label (STATES.md §6) · 5-step bar `Plan · Build · Freeze · UAT · Live` with the current step **labelled in text** | Rows = previous / current / next from the engine. The same bar on every row (R1 M-9) |
| **Coming up day** | Agenda | Date · role items · unit milestones (Demo update, Live update, freeze, planning) always shown, marked with an orange square and the word "Unit" in visually hidden text | 7 working days on desktop with "+3 more" |
| **Preview bar** | Not today | "Preview · Mon 12 Oct 2026 · ‹ › · Back to today" (+ "Show after 12:00" on a cut-off day) | Charcoal bar (light) / white bar (dark). Never orange |
| **Notice** | Projected or unconfirmed dates | "Dates after 2026-22 are projected from the 2-week cadence." | Gray Row with an ⓘ |
| **Cycle explainer** | Learning | Track with an environment strip (Beta → Demo → Live), refinement markers feeding the next planning, glossary | `<details>`, open by default only on first visit. The state is not persisted. Scroller is `tabindex=0 role=region` with a label |
| **Footer** | Trust | Sources (once), home-page setup, "Times are Tallinn time", "Confluence confirms dates up to 2026-22", rota updated date | — |

## 6. State model (summary; STATES.md is normative)

| State | Treatment | When |
|---|---|---|
| `urgent` | Orange fill, charcoal text, countdown | Cut-off Mon < 12:00 (all roles). Demo Tue < 17:00 (Dev, QA) |
| `after` | Charcoal fill (dark: `#0F0F0F` + 2 px orange outline), orange tag | Cut-off Mon 12:00–19:59 (all) |
| `evening` | Surface + 8 px Green 1 left bar + green `<tonight>` tag + order strip | Demo Tue ≥ 17:00 (Dev, QA); Live Mon ≥ 20:00 (Everyone, IM/AM, Dev) |
| `heads-up` | Orange tint wash + 4 px orange left bar + "Tomorrow"/"Monday" tag | Eve of Demo or cut-off, for that key day's actors |
| `event` | Plain | An event today, or a minor heads-up (planning, freeze) |
| `quiet` | Plain, "No deadlines today" + next item | Nothing today or tomorrow |
| `weekend` | Gray Row fill | Sat/Sun |
| `preview` | Charcoal (dark: white) bar above the band | Any non-today date |
| `error` | Gray band | rules.js failed |

Precedence: weekend → cut-off day phases → Demo day → (today's event + tomorrow's heads-up). The full algorithm, the day-by-day table and the JSON fixtures are in STATES.md.

Evening switches (v2.1, owner): Demo Tuesday from **17:00**, Live Monday from **20:00** Tallinn. Cut-off Monday 12:00–19:59 is `after`.

## 7. Role selection

| Situation | Behaviour |
|---|---|
| First visit (no `mgaSprintBoard.role`, no `?role=`) | The picker sits at the top of Your day, with the Everyone list underneath it. The cycle explainer is open. |
| Pick | Store the role, re-render, move focus to "Today for {role}", announce via `role="status"`. |
| Returning | The role is applied. The top bar shows "Viewing as IM / AM". |
| `?role=imam` / `dev` / `qa` / `lead` / `analyst` / `everyone` | Overrides and stores the role (rollout links). |
| Lead | "Also today" is expanded by default. |
| Storage blocked | The role holds for the session. The picker shows again next visit. |
| Stored keys | **One**: `mgaSprintBoard.role`. Nothing else is persisted (the explainer state is derived from first visit). |

## 8. Content rules

### 8.1 Copy
- Lead with the moment: "12:00 Fix cut-off", "Tonight · Live update". 24 h times, `Mon 5 Oct` dates, all in Tallinn time.
- **Sprint tags and rail labels use Insly's words:** "2026-20 · UAT on Demo", "2026-21 · Sprint day 4 of 10", "2026-22 · Refinement". Not "Releasing/Building/Preparing".
- **Freeze:** "Code freeze until the Demo update Tue 13 Oct (evening)". "Beta reopens Wed 14 Oct" only where needed. Never "until Wed".
- **Deploys are scheduled, not confirmed:** "Live update tonight", "Last night's Live update was scheduled. Confirm to clients once the developers have."
- **Conditional duties are conditional:** "If anything missed the cut-off, revert it before Live. The IM/AM decide which."
- Use "Live update", never "go-live", except in the page name "Golive Release 2026-NN". The glossary says client project go-lives are not on this board.
- Chip words: Due, Meeting, Update, Check, Opens today, Last day, Passed, If needed. Never schema words.
- No exclamation marks, no red, no ✓.

### 8.2 Slots (from the `slot` field)
`morning` (by 12:00) → timed items → `today` (default: Due, Meeting, Check) → `after-cutoff` (cut-off day afternoon) → `before-deploy` → `evening` (deploys) → `after-deploy`. On the next working day, `carryOver` items appear under "From last night", first.

## 9. Duty rota (`public/duty.js`, static data)

Schema proposal (owner to fill from the rota sheet). Names are stored **already shortened** to first name + last initial. No full names are ever written.

```js
export const DUTY_UPDATED = '2026-10-01';
// Keyed by release label. Dates are optional cross-checks: a test asserts they equal sprintDates().
export const RELEASES = {
  '2026-20': { demo: { date: '2026-09-29', dev: 'Dev A.' }, live: { date: '2026-10-05', lead: 'Dev B.', backup: 'Dev C.' } },
  '2026-21': { demo: { date: '2026-10-13', dev: 'Dev C.' }, live: { date: '2026-10-19', lead: null, backup: null } },
  '2027-1':  { demo: { date: '2027-01-05', dev: null },     live: { date: '2027-01-11', lead: null, backup: null } },
};
// Keyed by the Monday of the Mon–Sun week.
export const SUPPORT = { '2026-09-28': 'Dev D.', '2026-10-05': 'Dev E.', '2026-10-12': null };
```

- Display: `Support this week: Dev E.` · `Tonight · Live update 2026-20: Dev B. (lead), Dev C. (backup)` · `Next · Demo update Tue 13 Oct (2026-21): Dev C.` · `null` or a missing key → `not assigned yet` (muted, no warning colour) · file missing → the line is not rendered.
- States: `tonight`, `last-night` (the next working day), `next`, `unassigned`, `no-data` (STATES.md §7).
- Tests: names match `/^\p{L}[\p{L}'-]* \p{Lu}\.$/u`. Rota dates equal engine dates. The weekly keys are Mondays.
- The sheet confirms **2027-1: Demo Tue 5 Jan 2027, Live Mon 11 Jan 2027**. This closes the "Demo 5 Jan assumed" open item. Update the comment in `OVERRIDES[26]` and SPEC accordingly.
- No "this is me" highlighting. It would need a second stored key holding a person's name. Deferred.

## 10. Visual identity and tokens

Arial everywhere, `font-variant-numeric: tabular-nums`, minimum 13 px. 4 px radius, hairlines, no shadows. The orange `<tag>` section label is Insly CVI, used for the five section anchors and the band's state tag only.

### 10.1 Semantic mapping

| Meaning | Visual |
|---|---|
| Cut-off morning / Demo day for Dev and QA | `urgent`: Insly Orange `#FF7D00` fill, charcoal text (6.78) |
| Cut-off passed | `after`: charcoal fill, white text, orange tag |
| Deploy tonight | `evening`: Green 1 bar and green tag (green = "goes out") |
| Key day tomorrow | `heads-up`: orange tint + orange left bar |
| Due | Orange-tint chip, **charcoal** text |
| Update (deploy) | Green 1 fill chip, charcoal text |
| Freeze | Blue 1 fill + charcoal text (track and chips) |
| Meeting | Purple 3 text on the soft purple chip |
| Passed / neutral / others' items | Gray Row chip, Gray Dark text |
| Preview | Charcoal bar (light) / white bar (dark) |

### 10.2 Light tokens

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--bg`, `--surface` | `#FFFFFF` | Page, panels | — |
| `--surface-2` | `#EDEDED` Gray Row | Rail rows, chips, weekend band | — |
| `--line` | `#EBEBEB` Gray Light | Hairlines (decorative) | — |
| `--control` | `#8A8A8A` (derived) | Control borders | 3.45 on white |
| `--text` | `#1A1A1A` | Text | 17.40 white · 14.87 `#EDEDED` · 15.72 `#FFF1E5` |
| `--text-2` | `#3C3C3C` | Secondary | 11.03 · 9.42 · 9.96 `#FFF1E5` |
| `--muted` | `#575757` | Meta | 7.23 · 6.17 · 6.53 `#FFF1E5` |
| `--accent` | `#FF7D00` | Fills, bars | Never text on white (2.57) |
| `--on-accent` | `#1A1A1A` | Text on orange | 6.78 |
| `--accent-text` | `#C35500` Orange 2 | Orange text and links, **on white only** | 4.55 |
| `--link-on-tint` | `#1A1A1A` underlined | Links inside tinted items | 15.72 on `#FFF1E5` (fixes the 4.11 failure) |
| `--accent-soft` | `#FFF1E5` | Heads-up wash, Due chip | — |
| `--accent-light` | `#FFBE91` Light Orange | Order-strip tiles on orange, UAT bar | charcoal 10.80 |
| `--after-bg/fg` | `#1A1A1A` / `#FFFFFF`, tag `#FF7D00` | After band | 17.40 / 6.78 |
| `--evening-bar` / `--evening-tag` | `#00D7A5` Green 1 / `#007A5E` | Evening band | tag 5.32 on white |
| `--update-fill` | `#00D7A5` | Update chip | charcoal 9.33 |
| `--freeze-fill` / `--freeze-text` | `#00C8FF` / `#006E8F` | Freeze bar / text | charcoal 8.87 / 5.79 |
| `--meeting-text` / `--meeting-soft` | `#784BAF` / `#F1EAF9` | Meeting chip | 6.13 / 5.22 |
| `--preview-bg/fg` | `#1A1A1A` / `#FFFFFF` | Preview bar | 17.40 |

Removed: `--accent-text-strong` (`#A84900`). Charcoal text on tints replaces it (R1 m-11).

### 10.3 Dark tokens

| Token | Value | Contrast |
|---|---|---|
| `--bg` | `#1A1A1A` | — |
| `--surface` / `--surface-2` | `#242424` / `#2E2E2E` (derived) | — |
| `--line` | `#3C3C3C` | — |
| `--control` | `#9B9B9B` | 5.58 on `#242424` |
| `--text` / `--text-2` | `#FFFFFF` / `#EBEBEB` | 15.52 / 13.02 on `#242424` |
| `--muted` | `#9B9B9B` | 6.26 bg · 5.58 surface · 4.89 surface-2 · 5.25 on `#3A2410` · 6.90 on `#0F0F0F` |
| `--accent-text` | `#FF7D00` | 6.78 bg · 6.05 surface · 5.29 surface-2 · 7.47 on `#0F0F0F` |
| `--accent-soft` | `#3A2410` (derived) | white 14.59 · `#EBEBEB` 12.24 · `#FFBE91` 9.05 |
| `--after-bg` | `#0F0F0F` + 2 px `#FF7D00` outline | white 19.17. Differs from the page (`#1A1A1A`) by outline and tag, not only by luminance |
| `--evening-tag` | `#00D7A5` | 8.33 on `#242424` |
| `--freeze-text` | `#00C8FF` | 7.91 |
| `--meeting-text` | `#B48CE6` (lightened Purple 1) | 5.79. Purple 1 `#965FD7` fails: 4.07 on `#1A1A1A`, 3.95 on `#1D1D1D` |
| `--preview-bg/fg` | `#FFFFFF` / `#1A1A1A` | 17.40 |

The urgent band is identical in both themes (`#FF7D00` + `#1A1A1A`).

### 10.4 Focus ring: one definition for every surface

```css
:focus-visible { outline: 2px solid transparent;            /* survives forced-colors */
                 box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #1A1A1A; }
```

| Surface | Outer charcoal ring | Inner white ring | Visible? |
|---|---|---|---|
| White / `#FFF1E5` | 17.40 / 15.72 | — | ✓ |
| Charcoal (after band, light preview bar, dark page) | 1.00 | 17.40 | ✓ |
| Orange (urgent band) | 6.78 | 2.57 | ✓ (the charcoal ring) |
| White preview bar (dark) | 17.40 | — | ✓ |
| `#242424` / `#2E2E2E` | — | 15.52 / 13.4 | ✓ |

### 10.5 Favicon
16×16, drawn inside the square. Normal: an orange square. Key-day states (`urgent`, `after`, `evening`): a charcoal square with an orange 2 px inner ring. Tested on light and dark tab strips. No dot outside the square.

### 10.6 Forced colours
`@media (forced-colors: active)`: the band and the chips get `1px solid CanvasText` borders. The selected role gets `Highlight` / `HighlightText`. The "Now" tile keeps its word. Bars on the track get `CanvasText` outlines.

## 11. Accessibility

- Landmarks: `header`, `main`, `footer`, and a skip link "Skip to your day". The headline h1 = the message. Section h2s. Items are list entries.
- Live regions: the headline h1 updates only when its string changes (day rollover, 12:00, 17:00). A separate `role="status"` announces filter changes.
- The order strip is an `ol` with `aria-current="step"` and a visible word.
- Native `<details>` everywhere. Min 44 px rows on touch. `min-height`, never fixed `height`.
- Cycle track: bars have a 1 px charcoal outline (meets 1.4.11) and text labels ("Freeze", "UAT") above them. The scroller is `tabindex="0" role="region" aria-label="Cycle timeline"`. It keeps the full text alternative.
- Contrast: AA everywhere (tables above). Every coloured item has a word chip.

## 12. Links (static only)

| Where | Link |
|---|---|
| Matrix items, the Demo and Live update items, heads-up bands before Demo and Live | `SOURCES.demoLiveMatrix.url` |
| Release page / Golive page items, the Live and Demo update details | Confluence search: `https://insly.atlassian.net/wiki/search?text=%22Release%20{label}%22` and `…%22Golive%20Release%20{label}%22` |
| Revert item | `SOURCES.lifecycle.url` (revert procedure) |
| Every item | Its `source` (inside the expanded detail only) |

JQL deep links ("UAT open for 2026-20", "planning candidates not ready", R2 A7/E3) are **deferred**. They need project keys and fixVersion naming confirmed by the owner, and they are Jira links, which decision 8 does not cover.

## 13. What gets removed or moved (vs today)

As v1 (sprint-number hero, meter, three columns, per-card source links, Ongoing group, track as section 2, per-column empty states, URL-only preview, teal and Google Fonts), plus in v2: the Releasing/Building/Preparing verbs, separate IM and AM buttons, the "Show everything" wording, ✓ marks, strikethrough, and `#A84900`.

## 14. Rule changes for `rules.js` (for the developer)

Every item is grounded in a source already cited in `SOURCES`. New optional fields: `slot` (`morning | before-deploy | after-cutoff | evening | after-deploy`), `carryOver` (number of following working days, here 1), and `links` (array of `SOURCES` keys shown in the expanded detail). CONTRACT.md and the schema tests need these three fields added.

### 14.1 New rules

```js
{
  id: 'cutoff-last-chase',
  title: 'Last chase of UAT results before 12:00',
  detail: 'The fix cut-off is 12:00 today. Chase clients who have not signed off UAT, and raise any blocking bug with the developers now: a fix still needs code review and a deploy before 12:00. Anything not fixed by then is reverted, not fixed.',
  who: ['IM/AM'], sprint: 'previous', when: { on: 'cutoff' },
  kind: 'deadline', slot: 'morning', source: 'lifecycle',
},
// Grounding: lifecycle (UAT window: blocking bugs are fixed before the cut-off; 2 code reviews per change; a fix after the cut-off means a revert).

{
  id: 'tell-client-revert',
  title: 'Agree reverts and tell affected clients',
  detail: 'If anything missed the cut-off: agree with the developers which items are reverted, then tell each affected client that the item will not go Live tonight and will come in a later release.',
  who: ['IM/AM'], sprint: 'previous', when: { on: 'live' },
  kind: 'deadline', slot: 'after-cutoff', source: 'lifecycle',
},
// Grounding: lifecycle (revert removes the item from the release and re-points it at the next release; the IM/AM informs stakeholders, as for overruns).

{
  id: 'uat-findings-to-planning',
  title: 'Bring UAT findings to planning as first priority',
  detail: 'Non-blocking findings from the last UAT go into the next sprint as first priority. Make sure each one is a ticket that meets the Definition of Ready before tomorrow\'s sprint planning.',
  who: ['IM/AM', 'Lead'], sprint: 'next', when: { on: 'planning', offset: -1 },
  kind: 'reminder', source: 'lifecycle',
},
// Grounding: lifecycle (UAT window: "non-blocking findings go into the next sprint as first priority"; Definition of Ready).
```

### 14.2 Changed rules

| id | Field | From | To | Grounding / reason |
|---|---|---|---|---|
| `code-freeze` | `when.to` | `'freezeEnd'` | `'demoStart'` | Owner decision 2 + lifecycle: the freeze ends with the Tuesday evening Demo update. Beta reopens Wednesday, so Wednesday no longer shows the freeze. The detail text already says this. Update any test that expects the freeze on `freezeEnd`, and the SPEC catalogue row. |
| `code-freeze` | `links` | — | `['demoLiveMatrix']` | Config changes during the freeze |
| `revert-missed-fixes` | `who` | `['Dev','IM/AM']` | `['Dev']` | The IM/AM part is now `tell-client-revert` |
| `revert-missed-fixes` | `detail` | "Remove the ticket's commits…" | "If anything missed the cut-off: remove the ticket's commits from the release branch so it is gone from Demo before Live starts. Re-point the feature branch at the next release and move the task to Canceled, To Do or Code review. The IM/AM decide which items." | Conditional wording (R2 C2) |
| `revert-missed-fixes` | `slot` | — | `'after-cutoff'` | Order |
| `ready-for-live` | `when.to` | `'live'` | `'cutoff'` | Same date, but the meaning is "by the 12:00 cut-off" (R2 A4) |
| `ready-for-demo` | `slot` | — | `'before-deploy'` | Order (ANALYSIS F-05) |
| `demo-update`, `live-update` | `slot`, `links` | — | `'evening'`, `['demoLiveMatrix']` | Both details say "evening". The matrix governs both updates |
| `release-page`, `golive-page` | `slot`, `carryOver` | — | `'after-deploy'`, `1` | Published after the evening update |
| `confirm-live-to-client` | `slot`, `carryOver` | — | `'after-deploy'`, `1` | Required (R2 A5). The update runs in the evening, and clients are told after the developers confirm it |
| `confirm-live-to-client` | `detail` | "Once developers confirm the Live update, tell each client…" | "Once the developers confirm the Live update (tonight or next morning), tell each client it is completed. Issues found after release go through live issue triage." | — |
| `matrix-before-demo`, `matrix-before-live` | `links` | — | `['demoLiveMatrix']` | — |
| `check-own-items-demo` | `slot` | — | `'morning'` | Its detail says to check "before asking them to test", so it comes before `inform-client-uat` |
| `regression-run` | `detail` | (append) | "It ends with the Demo update, by when every task should be Ready for Demo." | R2 D4 |

### 14.3 Deliberately unchanged
- `pre-refinement` and `rank-refinement-queue` stay `{ weekly: 'Wed' }`, i.e. **every Wednesday** (owner decision 1; Backlog Refinement page). `full-refinement` stays Thursday of week 1.
- No rule for "check team leave before planning" (R2 E5): no cited source. No per-client go-live rule (R2 B2): it is not calendar data.

## 15. Review disposition

| Item | Decision |
|---|---|
| R1 B-1, B-2 · R2 E1 | **Accepted.** STATES.md |
| R1 B-3 · R2 B1, D1, E2 | **Accepted.** Mockup v2 frames F–J |
| R1 M-1 focus | **Accepted.** §10.4 |
| R1 M-2 · R2 §4 time zone | **Accepted.** Owner decision 4 |
| R1 M-3 chip hierarchy | **Accepted** |
| R1 M-4 · R2 C3 completion claims | **Accepted.** Owner decision 6 |
| R1 M-5 · R2 §3.2 orange | **Accepted.** Owner decision 5 |
| R1 M-6 focus/status | **Accepted** |
| R1 M-7 layout/fold | **Accepted.** §4 |
| R1 M-8 compact lines | **Accepted.** Lists of `<details>` |
| R1 M-9 rail | **Accepted.** STATES.md §6 |
| R1 m-1 to m-14 | Accepted, except **m-13** ("Show after 12:00" toggle in the preview bar): accepted as an option only on cut-off days. **m-14** sticky header: accepted, the header is not sticky |
| R1 §6 second stored key | **Accepted.** One key only |
| R1 §7 `<tag>` motif | **Kept.** Owner decision 7: it is Insly CVI, now used with restraint |
| R2 A1, A2, A3 | **Accepted.** Sub-line plus new rules `cutoff-last-chase`, `tell-client-revert` |
| R2 A4 | **Accepted.** `ready-for-live` ends at the cut-off |
| R2 A5, C7 carry-over | **Accepted, required** |
| R2 A7, E3 JQL links | **Deferred.** Needs owner-confirmed JQL; Jira links are outside decision 8 |
| R2 A8 per-role overrun wording | **Deferred.** Needs a per-role title mechanism. The rule stays as is |
| R2 B2 go-live wording | **Accepted** (glossary + "Live update" wording) |
| R2 B3, B5 | **Accepted** (sub-lines) |
| R2 B4 Insly words | **Accepted.** Verbs dropped |
| R2 C1 evening state | **Accepted.** `EVENING_FROM` 17:00, owner to confirm |
| R2 C2 conditional revert | **Accepted** |
| R2 C4 links | **Accepted** for Confluence (matrix, release-page search) |
| R2 C5 no rota placeholder | **Superseded.** The rota is now static data (`duty.js`) |
| R2 C6 freeze wording | **Accepted.** Owner decision 2 |
| R2 D2 first-day promotion | **Accepted** |
| R2 D3–D5 | **Accepted** (sub-lines, rail) |
| R2 E4 UAT findings to planning | **Accepted.** New rule |
| R2 E5 leave/capacity | **Rejected** for rules (no source). The planning sub-line quotes the 2/3 capacity rule only |
| R2 E6 refinement week 1 only | **Rejected.** Owner decision 1: Pre-Refinement and ranking run every Wednesday |
| R2 E7 "Delivery lead" label | **Deferred.** The button stays "Lead", with a tooltip listing who it covers |
| R2 §3.3 merge IM/AM, one "Everyone" | **Accepted.** Owner decision 3 |
| R2 §3.4 environments + glossary | **Accepted.** Frame J |
| R2 §4 holidays | **Deferred.** A static holiday list in `schedule.js` is a separate engine change |

## 16. Open questions for the owner

1. ~~Evening threshold~~: answered in v2.1 (Demo 17:00, Live 20:00).
2. ~~2027-2 start~~: answered in v2.1 (Mon 4 Jan 2027). **New:** the 2027-2 planning date. The formula gives Thu 31 Dec.
2b. **New:** the 2027-1 bug retro computes to Mon 21 Dec, inside the break. Confirm the date or override `bugRetro`.
3. JQL deep links: which project keys and fixVersion naming would be stable enough to template?
4. ~~Holidays~~: answered in v2.1 (EE + PL static data, inline notices).
