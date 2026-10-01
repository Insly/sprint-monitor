# Review 1: UX and accessibility critique of the v2 design

Status: independent review, 2026-10-01. Reviewer lens: usability heuristics, 5-second glanceability, hierarchy, interaction design, WCAG 2.2 AA, dark mode, Insly brand craft.
Reviewed: `USE-CASES.md`, `ANALYSIS.md`, `DESIGN.md`, `mockup.html` (frames A–G, rendered in headless Chrome at 1300 px wide), with `public/index.html`, `public/rules.js` and `public/schedule.js` as reference.
Method: I walked each frame against the use cases. I checked the state model against the real rule timings in `rules.js`, and I recomputed every contrast pair in DESIGN.md §10.2/§10.3, plus the pairs the mockup uses that the tables leave out, with the WCAG 2.x relative-luminance formula.

Severity: **blocker** = must be fixed before build starts (the spec is wrong or a C1 case fails). **major** = fix before release. **minor** = fix when convenient.

---

## 1. Summary

The direction is right, and it is a large improvement. Leading with the day, using one time-ordered list, naming sprints by phase and giving key days an orange state answers the four biggest findings in ANALYSIS.md (F-01, F-02, F-04, F-05). It also looks like Insly: Arial, charcoal, orange used with restraint, and no web fonts.

The problems are in the **spec underneath the pictures**, not in the concept:

1. The state model has a precedence bug that makes the post-cut-off state unreachable. It also contradicts UC-11 on planning Thursday.
2. Only one of the five C1 moments (cut-off Monday) is mocked. Demo night, the Friday heads-up, UAT opening on Wednesday and the Tuesday "last night" strip have no frames.
3. Focus visibility breaks on the coloured surfaces the design introduces (orange band, charcoal band, preview bar).
4. Inside "Your day", the chip hierarchy is inverted: the "Last day" windows outshout the 12:00 cut-off.
5. The countdown uses the device's time zone, so the most critical number on the page is wrong for anyone outside EET.

**Verdict: ship with fixes.** The fixes are listed in section 9. Items 1 and 2 must be fixed before implementation starts.

---

## 2. Contrast verification (DESIGN.md §10.2 / §10.3)

All ratios were recomputed. **The token tables are correct to two decimals, with one exception**, but several pairs the mockup actually renders are missing from them.

### 2.1 Table values checked

| Pair | DESIGN.md says | Measured | Result |
|---|---|---|---|
| `#1A1A1A` on white / on `#EDEDED` | 17.40 / 14.87 | 17.40 / 14.87 | ✓ |
| `#3C3C3C` on white / `#EDEDED` | 11.03 / 9.42 | 11.03 / 9.42 | ✓ |
| `#575757` on white / `#EDEDED` | 7.23 / 6.17 | 7.23 / 6.17 | ✓ |
| `#9B9B9B` on white (faint) | 2.78 ✗ | 2.78 | ✓ (correctly decorative only) |
| `#8A8A8A` control border | 3.45 | 3.45 | ✓ (≥ 3:1, 1.4.11) |
| `#FF7D00` on white | 2.57 ✗ | 2.57 | ✓ (correctly not used for text) |
| `#1A1A1A` on `#FF7D00` | 6.78 | 6.78 | ✓ |
| `#C35500` on white / `#EDEDED` | 4.55 / 3.88 ✗ | 4.55 / 3.88 | ✓ |
| `#A84900` on `#EDEDED` / `#FFF1E5` | 4.96 / 5.24 | 4.96 / 5.24 | ✓ |
| `#1A1A1A` on `#FFF1E5` / `#FFBE91` | 15.72 / 10.80 | 15.72 / 10.80 | ✓ |
| white on `#C35500` | 4.55 | 4.55 | ✓ (passes with 0.05 to spare) |
| `#1A1A1A` on `#00D7A5` / `#00C8FF` | 9.33 / 8.87 | 9.33 / 8.87 | ✓ |
| `#007A5E` / `#006E8F` on white | 5.32 / 5.79 | 5.32 / 5.79 | ✓ |
| `#784BAF` on white / `#F1EAF9` | 6.13 / 5.22 | 6.13 / 5.22 | ✓ |
| Dark: white on `#242424` | 15.52 | 15.52 | ✓ |
| Dark: `#EBEBEB` on `#242424` | 13.02 | 13.02 | ✓ |
| Dark: `#9B9B9B` on bg / surface / surface-2 | 6.26 / 5.58 / 4.89 | 6.26 / 5.58 / 4.89 | ✓ (surface-2 has little margin) |
| Dark: `#FF7D00` on bg / surface / surface-2 | 6.78 / 6.05 / 5.29 | 6.78 / 6.05 / 5.29 | ✓ |
| Dark: `#FFBE91` on `#3A2410` / `#242424` | 9.05 / 9.63 | 9.05 / 9.63 | ✓ |
| Dark: `#EBEBEB` on `#3A2410` | 12.24 | 12.24 | ✓ |
| Dark: `#00D7A5` / `#00C8FF` / `#B48CE6` on `#242424` | 8.33 / 7.91 / 5.79 | 8.33 / 7.91 / 5.79 | ✓ |
| Dark: Purple 1 `#965FD7` on charcoal | **3.95** ✗ | **4.07** ✗ | Number wrong, conclusion right (still fails 4.5) |

### 2.2 Pairs the mockup uses that the tables do not cover

| Where | Pair | Ratio | Needed | Result |
|---|---|---|---|---|
| Frame B, open "Fix cut-off" item (`.item.key`, `#FFF1E5` wash) | source link `#C35500` on `#FFF1E5` | **4.11** | 4.5 (text) | **✗ fail**. Use `--accent-text-strong` (#A84900, 5.24) for links inside tinted items. |
| Focus ring, light, on the urgent-after band / preview bar (`#1A1A1A`) | `#1A1A1A` ring on `#1A1A1A` | **1.00** | 3:1 (1.4.11) | **✗ invisible**. The mockup uses `outline-offset`, so the "2 px white offset" in DESIGN §10.2 does not exist. |
| Focus ring, dark, on the urgent band (`#FF7D00`) | `#FF7D00` on `#FF7D00` | **1.00** | 3:1 | **✗ invisible** |
| Focus ring, dark, on the preview bar (white) | `#FF7D00` on white | **2.57** | 3:1 | **✗** |
| Rail progress "now" segment | `#FF7D00` on `#EDEDED` | 2.19 | 3:1 if it carries meaning | Passes only because the bold "UAT" label repeats it. The Building row has no label (see M-9). |
| Rail inactive segments | `#D6D6D6` on `#EDEDED`; dark `#3C3C3C` on `#2E2E2E` | 1.2 / 1.23 | — | Decorative only. Acceptable if the phase is in text. |
| Item left-border colour code | orange 2.57, green `#00D7A5` 1.86, grey `#EDEDED` 1.17 on white | < 3 | 3:1 if meaningful | Acceptable only because each item also has a word chip. Keep that rule strict: no item without a chip. |
| Urgent-after sequence tiles (border) | `#575757` on `#1A1A1A` / `#242424` | 2.41 / 2.15 | 3:1 for component bounds | Decorative (the text is the content). Acceptable. |
| Cycle track bars | Blue 1 on white 1.96, Light Orange on white 1.61 | < 3 | 3:1 (graphical object) | **✗**, and the key names them by colour only ("blue = freeze"). See m-8. |
| "Today" urgent band tiles | `#FFBE91` on `#FF7D00` | 1.59 | — | Decorative. The tile text is charcoal (10.80). OK. |

**Conclusion:** the text palette is sound and honestly documented. The failures are all in **focus indicators** and **one tinted link**, which the tables do not cover. Add a "focus ring on each surface" row and a "link on tint" row to both tables.

---

## 3. Blockers

### B-1. State model: "urgent-after" can never trigger. *DESIGN §6.*
State 3 (Urgent) matches if "today has `live-update`". `live-update` is `on: 'live'`, which is the **whole of Monday**. Because the first match wins and state 3 comes before state 4, the "Cut-off passed. Reverts, then Live tonight" band (frame D, UC-06, UC-16, C1) is unreachable. Monday stays orange with a countdown that has run out.
**Fix:** evaluate state 4 before state 3. Better, define it as a single key-day state with a time phase:

```
keyDay = fix-cutoff | demo-update | live-update today
phase  = (fix-cutoff today && now >= 12:00) ? 'after' : 'before'
```

Add a unit test for Mon 5 Oct at 11:59, 12:00 and 20:00.

### B-2. State model contradicts UC-11 on every planning Thursday. *DESIGN §6, USE-CASES UC-11.*
`regression-plans` is `freezeStart − 1`, which is always the same Thursday as `sprint-planning`. State 5 (heads-up) beats state 6 (event), so on Thu 8 Oct the headline is "Code freeze starts tomorrow". UC-11 step 4 requires "Sprint planning today". This happens on every cycle, not as an edge case.
**Fix:** let an event *today* beat a heads-up for *tomorrow*, or allow a two-part headline: "Sprint planning today · code freeze tomorrow". Write out the resolved headline for **all 10 working days** of one cycle as a table in DESIGN.md, and make it a test fixture.

### B-3. Four of the five C1 moments are not mocked. *mockup.html.*
USE-CASES says every C1 case falls on Demo eve, Demo night, UAT opens, Live eve (Friday) or cut-off Monday. The mockup covers only cut-off Monday (B, D, and F as a weekend preview). Missing:
- **Demo Tuesday** (urgent state, all day orange for everyone).
- **Friday before Live** (heads-up state, UC-03/05). This is the state with the weakest visual treatment (see M-5).
- **UAT opens on Wednesday**, with the UAT deadline and the Copy button (UC-04, the fix for F-07).
- **"Last night" strip on Tuesday** (UC-02, the fix for F-06).
- **Preview bar**, **Lead view** with "Also today" expanded (UC-11), the **single empty state**, the **error state**, and **mobile urgent-before-12:00**.

The unmocked states are exactly where the design makes new promises, so the review cannot sign them off.
**Fix:** add frames H–N (one per item above) before implementation starts. The mobile urgent frame is the one most likely to break the "headline + 3 items above the fold" goal (see M-7).

---

## 4. Major issues

### M-1. Focus is invisible on the new coloured surfaces. *mockup `.frame :focus-visible`; DESIGN §10.2–10.3, §11.*
See table 2.2. The light focus ring is charcoal, so it disappears on the charcoal urgent-after band and the charcoal preview bar ("Back to today", ‹ ›, which are the preview's only controls). The dark focus ring is orange, so it disappears on the orange urgent band and is 2.57:1 on the white dark-mode preview bar. That fails WCAG 1.4.11 and 2.4.7 in practice.
**Fix:** one theme-independent double ring: `outline: 2px solid #1A1A1A; box-shadow: 0 0 0 4px #FFFFFF;` (or the inverse in dark mode). One of the two rings is always at least 6.78:1 against charcoal, white or orange. Document it per surface in §10.

### M-2. The countdown and the 12:00 switch use the device's time zone. *DESIGN §6 note, §13 Q4.*
The cut-off is 12:00 Tallinn time. A colleague on London or Warsaw time sees "2 h 50 min left" when the real figure is 0 h 50 min or 1 h 50 min, and the after-12:00 state flips 1–2 hours late. This is the single most critical number on the page. It is fully computable with no user data: `Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Tallinn' })`.
**Fix:** evaluate "now" and "today" in `Europe/Tallinn`. When the device zone differs, label times "12:00 Tallinn time (10:00 your time)". Close open question 4 with this decision rather than asking it.

### M-3. The chip hierarchy in "Your day" is inverted. *Frames B and F.*
In the render, the solid black **"Last day"** chips on "UAT window" and "Set tasks Ready for Live" are the darkest, highest-contrast marks in the list. The item that matters, **12:00 Fix cut-off**, has a pale peach "Due" chip. The eye goes to the two windows first. "UAT window, 12:00, Last day" also duplicates the fix cut-off: it is the same moment.
**Fix:** (a) render "Last day" as an outlined chip (charcoal 1 px border, no fill). (b) Merge the UAT window's last day into the fix cut-off row as a sub-line: "UAT window closes at the same time". (c) Give the band-matching item (the cut-off) the strongest treatment in the list: bold time, `--accent-soft` wash, and an orange rule, which it already has.

### M-4. "Passed" uses the danger colour, and the sequence strip marks steps as "done". *Frame D, DESIGN §5 "Sequence strip", §10.1.*
- The "Passed" chip is solid `#C35500`, the most saturated element in Your day, on an item that can no longer be acted on. The danger colour should go to the **revert** (the thing to act on now), not to the expired deadline.
- "12:00 ✓ Fix cut-off" and "Steps before 'now' are shown as done ✓" claim completion the page cannot know. The clock can say that 12:00 has *passed*, not that fixes are *done*. For untimed steps ("Live update tonight") the page cannot even tell whether they have passed. **This overreaches** beyond date + rules.
**Fix:** a neutral "Passed" chip (Gray Row, charcoal text) and a clock icon instead of ✓. Mark only steps with a rule `time` as passed. Untimed steps never change state. Use `aria-current="step"` plus a visible word ("Now", "Next") on the current tile, which frame B lacks: it shows "now" only by inverting the colours.

### M-5. In dark mode, and for the heads-up state, states are not visually distinct. *Frames C/D; DESIGN §6 states 4–6.*
- Dark urgent-after band = `#242424` on a `#1A1A1A` page (1.12:1) with a 4 px orange top rule. The dark event band = page colour with the same 4 px orange rule. On a dark screen, "Cut-off passed, reverts now" looks like "Full Refinement at 14:00" except for the copy and the orange "Now" tile.
- In both themes, the heads-up state (Friday: "Cut-off Monday 12:00", C1) is specified as "thick orange top rule", which in practice is the same treatment as an ordinary meeting day.
**Fix:** make the four non-calm states differ in more than one property. Suggested: event = 4 px rule; heads-up = `--accent-soft` wash plus a 4 px rule and a "Tomorrow"/"Monday" tag; urgent = orange fill; after = charcoal fill in **both** themes (in dark mode use `#0F0F0F` with an orange 2 px outline, 7.36:1 for the orange). Show all four side by side in one frame per theme.

### M-6. Focus and announcements on role changes, and the first-visit picker. *DESIGN §7, §11; frame E.*
- After someone picks a role in the first-visit picker, the picker is removed. Focus is lost and goes to `body` (2.4.3).
- Role changes deliberately do not touch the headline's live region, which is right. But nothing then announces that the list changed (4.1.3 Status Messages).
**Fix:** after a pick, move focus to the "Today for Dev" `h2` (`tabindex="-1"`). Add a separate polite `role="status"` node: "Showing 4 items for Dev". Keep the headline live region for state changes only. Also make sure the 60-second tick updates the h1 **text node only when its string changes**. Today's `fill()` replaces the whole header, which would re-announce every minute.

### M-7. Above-the-fold claims are unverified, and there is no layout for the commonest laptop width. *DESIGN §4.*
- Measured on the render: at 1280×800, frame A's "Coming up" starts at about 625 px below the top bar. With browser chrome (~690 px usable) only its heading fits, not "both columns". In frame B the band is about 260 px. With "Fix cut-off" expanded by default, "Revert" and "Confirm to clients" fall below the fold, against the claim that all items fit.
- Only ≥ 1200 px and ≤ 420 px are specified. Windows laptops at 125–150 % scaling give 1024–1093 CSS px wide and about 600 px tall, which is this audience's most common viewport and is unspecified.
- The mobile urgent band (headline + countdown + 4-tile strip in 2 rows) will be about 330 px before Your day starts. That risks the "3 items above the fold" goal on the most important day.
**Fix:** add a 768–1199 px layout (single column, rail collapsed under Your day). Render items collapsed by default, because the band already carries the consequence line. On ≤ 420 px, drop the sequence strip in the urgent state, since Your day *is* the sequence. Re-measure at 1093×614 and 390×844 for states 3 and 4 and write the numbers into DESIGN.md.

### M-8. Ambiguous compact-line controls. *Frames A, C, E: "Running", "Every day this sprint", "Also today".*
- One "Details" control serves two items joined by a literal `|`, which a screen reader reads as "vertical bar". It is unclear what expands.
- "Details" and "Show" are 13 px text with roughly 19 px of hit height. That passes 2.5.8 (24 px) only through the spacing exception, and it breaks DESIGN's own "≥ 44 px on touch" rule.
**Fix:** render Running and Standing as `<ul>` with one `<details>` per item, or one `<button aria-expanded>` named "Show running items (2)". Give it a 44 px hit area on touch. Drop the pipe separator.

### M-9. The sprint rail has rows with mixed encodings, and the phase mapping is undefined on transition days. *Frames A/B rail; DESIGN §5, §8.1.*
- Releasing has 5 labelled phase segments, while Building has 10 unlabelled day segments. They are two different scales drawn the same way in adjacent rows. DESIGN §5 also lists the phases as "Plan, Build, Freeze/Demo, UAT, Live", but the mockup shows "Build, Freeze, Demo, UAT, Live".
- On Tue 6 – Thu 8 Oct no sprint is "Releasing" (2026-20 is live, 2026-21 is still building). On Fri 9 Oct there is no "Building" sprint (2026-21 is frozen and 2026-22 starts Mon 12). The rule "3 rows, in the fixed order Releasing, Building, Preparing" cannot hold on those days, and the spec says nothing about it.
**Fix:** one 5-phase bar on every row (Plan · Build · Freeze · UAT · Live) with "day 4 of 10" as text. Specify the phase verb for each sprint on each of the 10 cycle days (the same table as B-2). Allow "Live 2026-20 · went live Mon 5 Oct" and an empty-slot row.

---

## 5. Minor issues

| # | Where | Problem | Fix |
|---|---|---|---|
| m-1 | Favicon (DESIGN §6, frame B) | The "dot" sits outside the 14 px square (`right:-3px`). A real 16×16 favicon is clipped, and a charcoal dot disappears on dark browser tab strips. | Draw the signal *inside* the 16 px: for example a charcoal square with an orange "!" or an orange ring, tested on light and dark tab strips. |
| m-2 | Tab title | "●" is read as "black circle". The weekend title "Weekend · Sprint Board" drops UC-17's message. | Start with words: "Cut-off 12:00 · Live tonight". Weekend: "Weekend · Mon cut-off 12:00". |
| m-3 | Brand tags `<today>` etc. | DESIGN puts `aria-hidden` on the brackets only, so a screen reader hears "today" followed by "Today for AM". On the band, the tag `<cut-off day>` / `<cut-off passed>` is the *state*, and hiding it removes state information. 8 different tags appear across frames. | `aria-hidden` the whole tag where an h2 follows. Where the tag is the state, put the state into the h1 or into visually hidden text. Limit tags to the five section anchors, plus the state tag on the band. |
| m-4 | Forced colours (Windows High Contrast) | The orange band, chips, selected segment (inverted fill) and "Now" tile all rely on backgrounds, which forced-colours mode removes. The selected role becomes invisible. This matters for a Windows-heavy team. | A `@media (forced-colors: active)` block: borders on band and chips, `aria-checked` segment underlined or `Highlight` coloured, "Now" as text. |
| m-5 | Top bar | Mobile has no "View date" control (UC-15). The role select needs an accessible name ("Viewing as: Dev"). The radiogroup is labelled "Role" while the visible label says "Viewing as". | Put ‹ › and the date in a menu on mobile. Use `aria-labelledby` on the visible "Viewing as". |
| m-6 | Frame A | The cut-off fact appears three times above the fold (sub-line, next-milestone box, Releasing row). | Leave it in the box and the rail. Make the sub-line role-aware as §6 says ("For AM: 1 meeting, 2 running"). Frame B's sub-line is not role-aware either. |
| m-7 | Frame D | "Running: UAT window · closed at 12:00". A closed item under "Running" is a contradiction. | Drop it after 12:00. The passed cut-off row already says it. |
| m-8 | Cycle track (frame G) | Freeze and UAT bars are below 3:1 and named only by colour in the key (1.4.1, 1.4.11). The `.track-wrap` scroller has no `tabindex="0"`, which the current page has (`#track-scroll`), so keyboard users cannot scroll it in Safari or Firefox. | 1 px charcoal outline on bars plus in-bar or above-bar text ("Freeze", "UAT"). Keep `tabindex="0"`, `role="region"` and a label on the scroller. |
| m-9 | Fixed heights | `.seg span {height:34px}`, `.picker .grid span {height:44px}` and `.btn {height}` clip text under 1.4.12 text spacing and 200 % zoom. | Use `min-height`. |
| m-10 | Release chip in "Also today" (frame B) | Bright `#00D7A5` is the most saturated element in the lower body, but for an AM it marks someone else's task. | Show other roles' items in neutral chips. Keep brand colours for your own items. |
| m-11 | `--accent-text-strong` `#A84900` | An off-palette derivation of Orange 2, used because orange text is placed on tints. | Prefer charcoal text on tints with an orange marker, and keep `#C35500` on white as the only orange text. This removes one token and the 4.11 failure in table 2.2. |
| m-12 | Urgent band on Demo Tuesday for non-Dev roles | Orange all day for IM/AM, Analyst and Lead, who have nothing that day, weakens the orange signal (alarm fatigue): 2 of every 10 days are orange. | Keep the unit-wide headline, but make the sub-line say "Nothing for AM tonight. Tomorrow: tell clients, UAT deadline Mon 19 Oct 12:00". Consider orange fill only for roles with a same-day item, and the heads-up treatment for others. |
| m-13 | Preview of a key day | DESIGN does not say whether a preview of Mon 5 Oct shows the before-12:00 or after-12:00 state. | Show "before" by default, with a "Show after 12:00" toggle in the preview bar. |
| m-14 | Sticky header (if built) | 2.4.11 Focus Not Obscured. | Keep the top bar non-sticky, or set `scroll-padding-top` to its height. |

---

## 6. Overreach check (date engine + static rules + one role only)

Mostly clean. The design explicitly refuses rota names, Jira status and client lists (§8.1 "Honest gaps", §9.4), which is the right call. Specific checks:

| Claim on screen | Computable? | Note |
|---|---|---|
| Headline state, countdown, tab title | Yes | Uses the clock plus `fix-cutoff.time`. Must use Tallinn time (M-2). |
| "UAT window until Mon 5 Oct 12:00" | Yes | `uat-window.to = cutoff` is date-only. The 12:00 is borrowed from `fix-cutoff.time`. Derive it, do not hard-code it. |
| "Tonight", "After the Live update" slots | Yes | They come from rule detail wording via a 5-id lookup. Fine as static data, and better as the `slot` field in §9. |
| Sequence ✓ "done" | **No** | The page cannot know a step is done (M-4). |
| "Now: Revert" | Yes | It names a phase by clock. Fine. |
| "Last night: … Confirm to clients if you haven't" | Yes | Hedged wording, carry-over rule. Fine. |
| "Also today: 5 every-day items (Dev 2, QA 2, Analyst 1)" | Yes | I verified it against `rules.js` for Thu 1 Oct. |
| Coming-up content in frames A, B, C | Yes | Spot-checked against the rule `when`/`who` fields. All correct. |
| Persisted state | **Slightly more than a role** | §5 "Cycle explainer: open on first visit, then remembered" adds a second `localStorage` key and an implicit "has visited" flag. **Fix:** derive "first visit" from the absence of `mgaSprintBoard.role` and do not persist the explainer state, or have the owner accept a second, non-personal UI key explicitly. |

---

## 7. Brand and visual craft

**Does it look like Insly?** Yes. Arial throughout, charcoal text, Insly Orange as a fill and rule (never as text on white), `#C35500` for orange text, and secondary greens, blues and purple used only as small semantic chips. The render reads as calm and corporate, and the orange band on cut-off Monday is unmistakably on brand. Dropping Google Fonts and teal fixes F-27 completely.

**Clunky?** No. The 4 px radius, hairlines and no shadows are disciplined. The one clunky spot is the compact lines ("Running … | … Details"), which read as run-on text. See M-8.

**Generic?** At some risk on quiet days. Seven of ten days render as white, grey boxes and 13 px orange tags, which could be any admin template. What saves it is the `<tag>` motif and the orange rule. Confirm that the angle-bracket label is part of the Insly CVI (DESIGN calls it "the Insly convention"). If it is, keep it as the signature but use it less (m-3). If it is not, replace it with the orange square mark used in the favicon. Consider adding that orange square next to "sprint board" in the top bar as a constant brand anchor. Frame A's desktop layout also leaves the left column empty for about 600 px below "Also today" while Coming up runs on. A shorter Coming up on desktop (7 working days, "+3 more") would balance it.

---

## 8. What is clearly better than the current page (keep all of it)

1. **The day leads, not the sprint number** (fixes F-01). "Full Refinement at 14:00" and "Fix cut-off at 12:00" pass the 5-second test that the current 56 px "2026-21 · Day 4 of 10" fails.
2. **Key days look different, in the page and in the tab title** (fixes F-02, the only severity-4 finding). The orange band is the right, on-brand, high-contrast signal (6.78:1).
3. **A time-of-day-aware post-12:00 state** (UC-16), once B-1 is fixed.
4. **One time-ordered list in process order** (cut-off → revert → Live → confirm). This fixes F-04 and F-05, and the slot headings ("By 12:00", "After 12:00, before the Live update") are excellent copy.
5. **The UAT deadline printed on the client-notice item, with Copy** (F-07), and **post-deploy carry-over** (F-06).
6. **Multi-day items demoted to Running/Standing lines** and promoted on their last day (F-12, F-13).
7. **A first-visit role picker, a persistent "Viewing as", `?role=` URLs, IM and AM split in the label only, and Lead "Also today" open** (F-08, F-09, F-10).
8. **One empty state that names the next item** (F-17).
9. **Preview UI that is charcoal, never orange** (F-18).
10. **Plain-language chips** (Due / Release / Meeting / Check) and **phase verbs** (Releasing / Building / Preparing) instead of schema words and Previous/Current/Next (F-20).
11. **Accessibility plan:** `main` + skip link, h1 = the message, items as list entries rather than headings, `aria-live` limited to the state text, native `<details>`, 13 px minimum, and honest, correct contrast tables (F-22, F-23, F-24).
12. **The release track moved to "How the cycle works"**, open on first visit only, with a glossary (F-14, UC-13).

---

## 9. Verdict

**Ship with fixes.** The concept, IA and visual language should go ahead unchanged. B-1 to B-3 must be fixed in the spec and mockup *before implementation starts*. The majors must be fixed before release.

### Top 5 required changes

1. **Correct and pin down the state model** (B-1, B-2, M-9). Put urgent-after before urgent. Let an event today beat a heads-up for tomorrow, or combine them. Write the resolved headline, tab title and rail phase verbs for all 10 working days of one cycle (plus the weekend and 11:59/12:00/20:00 on Monday) as a table in DESIGN.md, and use it as the test fixture.
2. **Mock the missing C1 states** (B-3): Demo Tuesday, Friday heads-up, UAT-opens Wednesday with Copy, the Tuesday "last night" strip, the preview bar, the Lead view, and mobile urgent before 12:00. Make the four non-calm band states visibly distinct in both themes (M-5).
3. **Compute time in `Europe/Tallinn`** for "today", the countdown and the 12:00 switch, and label it when the device zone differs (M-2).
4. **Fix the focus ring and the remaining contrast gaps**: a theme-independent double ring that works on white, charcoal, orange and the preview bar (M-1). Use `#A84900` or charcoal for links on the `#FFF1E5` tint (4.11 today). Add forced-colours styles (m-4). Manage focus and a `role="status"` message after role picks (M-6).
5. **Re-balance "Your day" for the glance**: make the cut-off the strongest row, outline the "Last day" chips and merge the UAT window close into the cut-off row (M-3). Use a neutral "Passed" chip and no ✓ "done" claims (M-4). Collapse items by default, add the 768–1199 px layout, drop the sequence strip on mobile in the urgent state, and re-measure the fold claims at 1093×614 and 390×844 (M-7).
