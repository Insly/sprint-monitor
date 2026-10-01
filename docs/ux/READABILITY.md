# MGA Sprint Board: section readability (v2.2 proposal)

Status: proposal, 2026-10-01. Answers the owner's feedback: "Maybe worth trying to put a rounded block around the collapsible blocks, such as you have 'Show only what is yours' in the beginning. Maybe increasing readability. Or the UX specialist has some other ideas?"
Companions: `DESIGN.md` (tokens §10, fold targets §4.4), `STATES.md`, `mockup-readability.html` (the recommended option and the owner's option side by side at 1093 open, dark and folded, at 1440 all folded, and at 390).
Scope: presentation only. No change to `schedule.js`, `board.js` or `rules.js` output, except where §5 says so.

---

## 1. What I measured

The live page (`https://insly-sprint-monitor.onrender.com`, build `84336f7`) in headless Chrome, Tallinn time zone, at 1440×900, 1093×614 and 390×844, light and dark, on:
Thu 1 Oct (IM/AM and Everyone), Mon 5 Oct cut-off (IM/AM, 09:00), Fri 9 Oct (IM/AM), and `#sprint-2026-21`.
Fold numbers below are measured **with the preview bar hidden**, so they match a real day. The preview bar adds 50 px at 1093 and 126 px at 390.
Each option was injected as CSS into the live page and measured the same way. Section 4 lists the numbers.

What the engine returns for IM/AM (`resolveDay`, 09:00, working tree of `board.js` and `rules.js`):

| Day | Band | Own items | Every day | Next for you | Also today |
|---|---|---|---|---|---|
| Thu 1 Oct | event | 2 (+2 running) | 2 | 4 | 0 |
| Fri 2 Oct | heads-up | 4 (+2 running) | 2 | **6** | 0 |
| Mon 5 Oct | urgent | **7** | 2 | 1 | 3 |
| Wed 7 Oct | event | 5 | 2 | 2 | 2 |
| **Fri 9 Oct** | event | **3** | 2 | 2 | 2 |
| Wed 14 Oct | event | 5 | 2 | 2 | 2 |

Fri 9 Oct is not one of the busiest days in "Today": it has 3 own items. The 13 new IM/AM rules mostly land in **Coming up**. On Fri 9 Oct that list has 34 rows: Mon 12 has 4, Wed 14 has 5 and Mon 19 has 7. It is 871 px tall at 1093 and 1,314 px tall at 390, the tallest block on the page.

## 2. Diagnosis

1. **Every boundary is the same faint hairline, so sections do not read as sections.** `--line` (#EBEBEB, 1.2:1 on white) is used for at least nine things: the band and duty edges, slot rules, item borders, the "Every day" and "Also today" group rules, the "Next for you" rule, Coming-up day rules, the cycle top and the footer top. "Today for IM / AM", "Three sprints in play" and "Coming up" are separated only by 18–22 px of white. At 1093, the end of "Today" and the start of "Sprints" look like the next group inside the same list. The h2 (20 px) is only 1.25× the item titles (16 px bold). The orange `<tag>`s help you find a heading, but they do not show where a section ends. **Folded sections are worse.** They become loose headings with no edge and no summary: at 1440, folding all three leaves three floating h2s. Only "Today" says how many items it holds. The cycle explainer folds with a different pattern again (top rule, 18 px h2, no chevron). The owner's 1440 screenshot with everything folded shows exactly this: "Today for IM / AM 2 items ⌄", "Three sprints in play ⌄" and "Next 7 working days ⌄" float with large gaps between them and do not read as blocks. **The footer** repeats the problem at small scale: three loose lines (the meta facts, "Sources", "Make this your browser home page") with no shared edge.
2. **The page is long, not dense, and the length is in Coming up, not Today.** The day's items scan well: one line each, with a chip and a time. The cost is in the lists that grew with the 13 new rules. Coming up has 34 rows, and at 390 the sprint label column wraps 15 of them onto two lines. "Next for you" is one dot-separated run-on line (6 items on Fri 2 Oct). There is repetition: "Today" appears three times above the first item (h2, slot heading, and the `when` column of every untimed item). "2026-21" appears 20 times in Coming up.
3. **The cut-off fold target in DESIGN §4.4 is now missed by 15 px.** On Mon 5 Oct, IM/AM, at 1093×614, the third "By 12:00" item ("Set tasks Ready for Live") ends at **629 px**. The fold is at 614. The section header (44 px), fold-body padding (8 px) and slot heading (35 px) added since the v2 mockup push it down. Any box around the sections adds to this, so whichever option we pick must reclaim the space. At 390×844 the three morning items are still in (759 px).

## 3. Options

All three share these rules:
- The section header stays a native `<summary>`.
- The chevron is the existing `.chev`.
- A fold lasts for the page visit only (unchanged).
- No shadows. No orange fills.
- Sections never use `--accent`, `--accent-soft` or a left colour bar, because those mean "key day" or "due".

### Option A: rounded cards like the picker (the owner's idea)

Each collapsible section becomes a white, outlined, rounded card, like the first-visit picker but with a neutral border (the picker's orange 2 px border stays reserved for the picker, which asks you to do something).

| Rule | Light | Dark |
|---|---|---|
| Fill | `--surface` #FFFFFF | `--surface` #242424 (page #1A1A1A) |
| Border | 1 px `--bar-off` #D6D6D6 (1.45:1, decorative) | 1 px `--line` #3C3C3C |
| Radius | 8 px (new token `--radius-section`) | same |
| Padding | 0 16 px 16 px (all breakpoints) | same |
| Gap between sections | 16 px | same |
| Items inside | unchanged (white, `--line` border, 4 px radius, colour left bar) | items get `--surface-2` #2E2E2E so they lift off the card |
| Header | 48 px row inside the card: tag + h2 left, aside + chevron right | same |
| Folded | a 50 px outlined rounded bar | same |

- **Pros:** it is literally what the owner asked for. The orange tag stays on white (4.55:1, CVI-legal). Folded sections look like closed, clickable bars. It is easy to build: one rule on `.fold`.
- **Cons:** it adds a tenth hairline. The section border (#D6D6D6) and the item borders (#EBEBEB) are close in weight, so in the Today section you see a box of boxes. 16 px padding on both sides costs 32 px of width everywhere: item titles lose 32 px at 1093 (391 → 359) and 24–32 px at 390 (237 → 213). On mobile, more titles wrap to two lines. The rail rows are grey blocks inside a white card, which is fine, but Coming up is a 900 px outlined box with nothing new inside it.
- **Fold:** 1093 Mon 5, third "By 12:00" item ends at **631** (❌, was 629). 1093 Fri 9: all 3 items are in (590). 390 Mon 5: the three morning items end at 780 (✓), and the 4th moves from 853 to 874. 390 Fri 9: the page grows by 123 px, the most of the three options.

### Option B: panels with a white header and a tinted body (recommended)

The owner's rounded block, with two changes that make it carry its own weight. The **header is a white strip** that holds the orange tag. The **body is a light neutral tray**, and the item cards inside stay white. Figure and ground do the separating, not another line.

| Rule | Light | Dark |
|---|---|---|
| Panel edge | 1 px `--bar-off` #D6D6D6 | 1 px `--line` #3C3C3C |
| Radius | 8 px (`--radius-section`), `overflow: hidden` | same |
| Header fill | `--surface` #FFFFFF | `--surface` #242424 |
| Header rule (open only) | 1 px `--bar-off` under the header | 1 px `--line` |
| Body fill | **`--section-body` #F5F5F5** (new, derived halfway between white and Gray Row #EDEDED) | **`--section-body` #1F1F1F** (derived, between `--bg` and `--surface`) |
| Item cards, rail rows | `--surface` #FFFFFF (rail rows change from #EDEDED to white) | `--surface` #242424 |
| Header layout | 16 px left padding, 12 px right. Tag + h2 left. Aside (count or summary) + chevron right. Min height **40 px** on `pointer: fine`, 44 px on `pointer: coarse`. The whole strip is the target | same |
| Body padding | 0 16 px 14 px. The first slot heading gets 4 px top margin. `fold-body` padding-top goes from 8 to 0 | same |
| Gap | 16 px between stacked panels. In the 1093 two-column row, both panels are top-aligned (no top margin on the second) | same |
| Mobile ≤767 | **Full bleed:** `margin: 0 -16px`, no side borders, radius 0. Content keeps the 16 px gutter, so **width costs nothing**. 12 px of page between panels | same |
| Folded | Only the white header strip remains: a rounded, outlined 40–44 px bar. The aside switches to a **one-line summary** (§3.1) | same |

Contrast on the tray (all body text was checked):

| Text | Light, on #F5F5F5 | Dark, on #1F1F1F |
|---|---|---|
| Body text | 15.96 | 16.48 |
| `--text-2` | 10.12 | 13.83 |
| `--muted` | 6.63 | 5.93 |
| `--meeting-text` | 5.63 | 6.15 |
| Orange tag | **header only, on white: 4.55** (`#C35500` on #F5F5F5 would be 4.17 ❌, so the tag never sits on the tray) | `#FF7D00`: 6.05 on the header, 6.42 on the tray |

- **Pros:**
  - The three sections read as three objects at a glance, and white items on the tray scan faster than white on white. This is the biggest readability gain we measured.
  - The h2 gets its own strip, which fixes the weak heading hierarchy without making the type bigger.
  - Folded panels are tidy outlined bars that carry a summary.
  - On mobile the panel costs **no width**.
  - With the tightened header it gets the cut-off fold back (below).
- **Cons:**
  - It needs two new tokens (`--radius-section`, `--section-body`).
  - Rail rows change from grey to white. That is a small visual change, and it also fixes the rail "hover" grey vanishing on a grey tray.
  - In light, the weekend band (#EDEDED) sits close to the tray (#F5F5F5). The white duty line and white panel header separate them, so this is acceptable.
  - The full-bleed panel on mobile has the same shape as the band. It is told apart by the white header with the orange `<tag>` and by its neutral grey (never orange, orange tint, green or charcoal).
- **Fold (measured with the CSS injected):**

  | Frame | Now | Option B | DESIGN §4.4 target |
  |---|---|---|---|
  | 1093×614 Mon 5 IM/AM, 3rd "By 12:00" item bottom | 629 ❌ | **610 ✓** | all By-12:00 items above the fold |
  | 1093×614 Fri 9 IM/AM, 3rd item bottom | 588 | **569** | — |
  | 390×844 Mon 5 IM/AM, 3 morning items | 759 | **752 ✓** | — |
  | 390×844 Mon 5, 4th item | 853 | 846 | (2 px short of fully visible; its title is visible) |
  | 390×844 Fri 9, 3rd item | 730 | **715** | — |
  | Page height, 1093 Fri 9 | 1,858 | 1,896 (+38) | — |
  | Page height, 390 Fri 9 | 2,837 | 2,869 (+32) | — |

### Option C: ruled sections (no box)

The smallest change. Each section starts with a **2 px `--text` rule** (#1A1A1A, or #FFFFFF in dark) across its full width. The header is 48 px. Sections are 28 px apart. Nothing else changes.
- **Pros:** no width cost, no new tokens. The strong rule is distinct from every hairline, and black rules sit well with Insly's typographic CVI.
- **Cons:** it does not give the "block" feel the owner asked for. Items stay white on white, so scanning does not improve. A folded section is a ruled heading, which is better than now but still not visibly a closed container. Without the header tightening from Option B it also misses the 1093 cut-off fold (631).
- Use it if the owner prefers to keep the page "flat". It is also the right treatment for the **cycle explainer** in Option B, because the cycle is reference material and not a working section.

### 3.1 Folded summaries (Options A and B)

When a section is folded, the header aside shows one line instead of the count (muted, 13 px, truncated with an ellipsis):

| Section | Folded aside |
|---|---|
| Today for {role} | `3 items · next 12:00 Release check` (the next timed or first item) |
| Three sprints in play | `2026-21 · Code freeze starts today` (the hot row's state) |
| Coming up | `Mon 12 Oct · 4 for you` |
| Sprint view, Timeline | `Today · day 4 of 10 · next Code freeze Fri 9 Oct` |
| Sprint view, Actions | `16 passed · 2 running · 19 coming` |

The text comes from data the renderer already has. Screen readers get it as part of the summary's name.

### 3.2 Chevrons: quiet when open, explicit when folded

Owner: a cleaner look, and "people can figure out collapsibility themselves?" Mostly yes. The exception is a section **folded by accident**. On a page whose job is "don't miss today's actions", a folded "Today" must never look like an empty or finished section. So the chevron's visibility depends on the state:

| State | Mouse / trackpad (`hover: hover` and `pointer: fine`) | Touch (`hover: none` or `pointer: coarse`, and every frame ≤767) |
|---|---|---|
| **Open, at rest** (the default) | **No chevron.** It stays in the layout with `visibility: hidden`, so nothing shifts | A small, quiet chevron (8 px, `--control` #8A8A8A, 3.45:1 on white, 3.14 on the tray). Touch has no hover, so the cue has to be there |
| **Open, hover** | The header gets the tray tint (`--section-body`) and the chevron appears (`--muted`). The cursor is a pointer | — |
| **Open, keyboard focus** (`:focus-visible`) | The chevron appears, and the focus ring is drawn *inside* the header (`inset 0 0 0 2px #1A1A1A, inset 0 0 0 4px #FFFFFF`; reversed in dark), because the panel clips with `overflow: hidden` | same |
| **Folded** | **Always** a chevron (`--text-2`), then **"Folded ·"** in bold `--text-2`, then the one-line summary from §3.1 in `--muted`: `Folded · 3 items · next 12:00 Release check` | same |

- **Placement:** the chevron sits **inline**, right after the h2 (and after the count when open: `Today for IM / AM 3 items ⌃`). It is no longer pushed to the far right edge. The count and the chevron sit next to the title, so they no longer scatter across the header (the owner's screenshot). When folded, the chevron comes straight after the title and the summary follows it.
- **Narrow headers:** the header `sec-head` wraps (`flex-wrap: wrap`). The folded summary has `flex: 1 1 200px; min-width: 200px`, so when space runs out it drops to a second line under the title instead of truncating to "F…". The ellipsis only cuts the end of the summary.
- **Target:** the whole header strip stays the `<summary>` target (40 px on a mouse, 44 px on touch). The chevron is decoration and stays `aria-hidden`. The native `<details>` exposes expanded/collapsed to screen readers, and the folded summary is part of the summary's accessible name.
- **The same rule for every fold:** Today, Sprints, Coming up, the sprint view's Timeline and Actions, and the cycle explainer (its chevron also moves inline). The footer's two disclosures always show their small chevron, because they are closed by default.
- **Option A** uses the same chevron rules. Its hover is an underline on the h2 instead of a tint, because its header is not a separate strip.
- **Implementation note for the developer:** the live page puts `.chev` as a sibling of `.sec-head` with `margin-right: 4px`. Move it inside `.sec-head`, after `.aside` when open and before it when folded (or reorder with CSS `order`), and drop `margin-left: auto` from `.aside`.
- **Rejected:** removing the chevron entirely. That is cleaner when open, but a folded section with no cue looks identical to a section that simply has no content, which is the one failure this page cannot afford.

## 4. Measurements side by side

| Frame | Now | A (cards) | B (panels, recommended) | C (rules) |
|---|---|---|---|---|
| 1093 Mon 5 IM/AM, 3rd By-12:00 item | 629 ❌ | 631 ❌ | **610 ✓** | 631 ❌ (610 with B's header tightening) |
| 390 Mon 5 IM/AM, 3rd morning item | 759 | 780 | **752** | 761 |
| Title width, 1093 / 390 | 391 / 237 | 359 / 213 | 357 / **237** | 391 / 237 |
| Page height, 390 Fri 9 | 2,837 | 2,960 | **2,869** | 2,871 |

## 5. Restraint: how sections stay distinct

DESIGN keeps cards for things that separate objects. In Option B:
- **Panel ≠ item card.**
  - A panel is a *container*: an 8 px radius, a neutral tray fill and a white header strip, with no colour. It is never clickable as a whole; only its header folds it.
  - An item is an *object*: 4 px radius, a white fill with a hairline, a coloured left bar that carries meaning (Due, Meeting, Update), a chip and a chevron.
  - The two never share a fill: items are always white (or #242424 in dark), and trays are always #F5F5F5 (or #1F1F1F).
- **Panel ≠ orange band.**
  - The band is full-bleed, square, and colour-coded (orange, charcoal, green bar, or orange wash).
  - Panels are inset with rounded corners on ≥768. They are neutral only and are never tinted by the day's state.
  - The urgent day stays the only big orange area on the page.
- **Panel ≠ picker.** The picker keeps its 2 px orange border and sits at the top of the Today panel's body as a card, because it is a question to answer.
- **Rail rows** become white blocks on the tray (they are objects: each opens a sprint view). The hot row keeps its 4 px orange inset bar.
- **Sprint view:**
  - Timeline and Actions become panels.
  - The `<deploys>` box (now #EDEDED) changes to the tray fill with the panel edge, so the page has only one grey.
  - **Holidays folds into the Timeline panel** as a footer line when there are none ("No public holidays (EE, PL) between planning and Live"). It is its own panel only when a holiday exists. A 74 px section for one sentence is the clearest case of a box costing more than it gives.

## 6. Other readability ideas, ranked by effect

1. **Shorter Coming up on mobile.** Show 3 working days at ≤767 (now 7), with "+4 more days to Tue 20 Oct". This saves about 700 px at 390 on Fri 9 Oct. Coming up is context; the day's items are the job.
2. **Drop sprint labels from Coming-up rows at ≤767** (keep "if needed"). They wrap 15 of 34 rows at 390, and sprint relation is metadata (DESIGN §2). Desktop keeps them.
3. **"Next for you" as a short list**, one item per line, up to 3, then "+3 more". Fri 2 Oct has 6 items in one wrapped line today.
4. **No "Today" in the `when` column under the "Today" slot.** Leave the cell empty, and keep the chip. This removes two of the three "Today"s above the first item on Fri 9.
5. **Tighten the section header (part of Option B).** Use 40 px on `pointer: fine`, no `fold-body` top padding, and a 4 px top margin on the first slot. This alone brings the 1093 cut-off frame back under the fold.
6. **One fold pattern.** The cycle explainer uses the same header (tag, h2, aside, chevron at the right) but stays unboxed with Option C's rule, since it is reference material.
7. **Not recommended:** making headings bigger or adding icons. The panel header fixes the hierarchy without either.

## 6a. Footer: one bar instead of three lines

Owner: "Collapsibility is ok on sources, but 3 lines seems like scribble on notepad."

The footer becomes **one bar** in the same visual language as the panels. It is a single strip with no header/body split, because it is not a working section and has no h2.

| Rule | Light | Dark |
|---|---|---|
| Fill | `--section-body` #F5F5F5 | `--section-body` #1F1F1F |
| Edge, radius | 1 px `--section-edge`, `--radius-section` 8 px | same |
| Layout ≥768 | One row, min height 44 px, padding 0 12 px 0 16 px. Left: `Times are Tallinn time · Dates confirmed up to 2027-2 · Rota updated 1 Oct` (13 px `--muted`, dot separators drawn with CSS, so they never start a line). Right: two inline disclosures, **`Sources 12 ⌄`** and **`Home page setup ⌄`** (13 px bold `--text-2`, 32 px high, 4 px radius) | same |
| Open disclosure | It takes a full-width row inside the bar (`flex-basis: 100%`). Its summary gets a white (`--surface`) pill so you can see which one is open. Sources list in two columns at ≥768 | pill `--surface` #242424 |
| Mobile ≤767 | Full bleed like the panels: the meta line wraps to two lines, then the two disclosures sit side by side on one row (32 px on desktop, 44 px tap height) | same |
| Spacing | 16 px above the bar (the same gap as between panels), 24 px below | same |

The cycle explainer stays between the panels and the footer, with Option C's 2 px rule. Order: panels → cycle → footer bar.
Option A gets the same bar as a white outlined strip, so the two mockup columns compare like with like.

Keep both disclosures native `<details>`. "Make this your browser home page" is shortened to **"Home page setup"** so both fit on one row at 390. The full sentence becomes the first line inside it.

## 7. Recommendation

**Option B: panels with a white header and a tinted body**, plus the header tightening (§6.5), the folded summaries (§3.1), the state-dependent inline chevrons (§3.2) and the footer bar (§6a). If there is time, add §6.1–6.4 as well.

It keeps the owner's idea (rounded blocks around the collapsible sections), but uses fill rather than another outline. That way the sections read as objects, the white items scan better, the orange tags stay on white and pass AA, mobile loses no width, and the cut-off fold at 1093×614 is back on target (610 ≤ 614). Option A works but adds a tenth hairline, costs 32 px of width and leaves the fold regression in place.

### Tokens to add to DESIGN §10

| Token | Light | Dark |
|---|---|---|
| `--radius-section` | 8 px | 8 px |
| `--section-edge` | #D6D6D6 (= `--bar-off`) | #3C3C3C (= `--line`) |
| `--section-body` | #F5F5F5 (derived) | #1F1F1F (derived) |

Forced colours: panels get `1px solid CanvasText`, the tray becomes `Canvas`, and folded headers keep their summary text.
