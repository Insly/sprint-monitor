# MGA Sprint Board (Sprint Monitor)

A browser home page for the Insly MGA delivery unit. It leads with the day: a headline band says what kind of day it is, a duty line says who deploys and who is on support, and "Your day" lists your actions in time order. A compact rail keeps the three sprints in play in view, and every sprint has its own linkable view.

Tier: T1 per software-project-playbook (one owner, low stakes, no personal data, static page).

Spec: `docs/SPEC.md`. Calendar model, rule schema and API: `docs/CONTRACT.md`. Design: `docs/ux/DESIGN.md` and the normative state table `docs/ux/STATES.md`. Progress log: `docs/PROGRESS.md`.

## Features

- **Headline band** with the day's state: `urgent` (cut-off Monday before 12:00, and Demo Tuesday for Dev and QA), `after` (cut-off passed), `evening` (deploy tonight), `heads-up` (Demo or cut-off tomorrow, for that day's actors), `event`, `quiet`, `weekend`. Countdown to 12:00 on cut-off morning, an order strip on key days, and the next key moment on calm days. The tab title and favicon follow the state.
- **Tallinn time everywhere.** "Today", "now", the countdown and every switch (12:00 cut-off, 17:00 Demo update, 20:00 Live update) are computed in Europe/Tallinn, whatever the device zone. When the device is in another zone the page says "(Tallinn time)".
- **Duty line:** tonight's or last night's deployer(s), or the next deploy, with the time in Tallinn, Warsaw and London, plus this week's support dev. "not assigned yet" where the rota has a gap.
- **Your day** for one role (Everyone, IM / AM, Dev, QA, Lead, Analyst): grouped by when (By 12:00, timed, Today, After 12:00, Tonight, After the update), with "From last night" carry-over items, first-day and last-day promotion of short windows, Running, Every day this sprint, Next for you, and other roles' items under Also today. Items expand to the rule text, computed facts (UAT deadline with Copy) and Confluence links.
- **Sprint rail** with the three sprints in play, the 5-step bar `Plan · Build · Freeze · UAT · Live`, a link to each sprint's view, and holiday notices.
- **Sprint view** at `#sprint-2026-21`: timeline with a Today marker, Demo and Live times for three offices, the rota, every action for the sprint (your role or Everyone), and the EE/PL holidays between planning and Live.
- **Coming up:** the next 7 working days (10 on expand) with your items and the unit milestones.
- **Preview:** `#date-2026-10-05` or `?date=2026-10-05`, combinable with the sprint view: `#date-2026-10-01~sprint-2026-21`. A preview renders 09:00 Tallinn; on a cut-off day the preview bar can step to 13:00 and 20:00.
- **First visit:** a role picker and the "How the 2-week cycle works" explainer are shown. Only the role is stored (`localStorage` key `mgaSprintBoard.role`). `?role=imam|dev|qa|lead|analyst|everyone` sets it (for rollout links).
- Accessible: landmarks, skip link, native `<details>`, a focus ring that works on every surface, forced-colours styles, status messages on role change. Light and dark themes. Layouts for ≥1200, 768–1199 and ≤767 px. Arial only, no external resources.

## Files

| File | What it is |
|---|---|
| `public/index.html` | The page. Renders what `board.js` returns. No build step. |
| `public/schedule.js` | Date engine: sprint dates, today's context, which rules fire, Tallinn time, sprint view data. No DOM. |
| `public/board.js` | State resolver: everything on the page as a pure function of (date, Tallinn time, role, rules, rota, holidays). |
| `public/rules.js` | Rule catalogue and Confluence sources. Data only. |
| `public/duty.js` | Dev duty rota (Demo deployer, Live lead and backup, weekly support dev). Data only. |
| `public/holidays.js` | Estonian and Polish public holidays, 2026 and 2027. Data only. |
| `tests/*.test.js` | vitest. `states.test.js` asserts every row of `docs/ux/STATES.md`. |
| `render.yaml` | Render Blueprint (static site). |

## Run locally

ES modules do not load from `file://`, so serve the folder:

```
npm run serve            # npx serve public
# or
cd public && python -m http.server 8000
```

## Tests

```
npm test
TZ=America/New_York npm test      # the suite must pass in any device zone
```

## Change the data

All data changes follow the same steps: edit the file, run `npm test`, commit and push to `main`. Render redeploys, and people see the change on their next page load.

### Rules (`public/rules.js`)

Schema in `docs/CONTRACT.md`. Optional fields: `time` (Tallinn), `slot` (where the item sits in the day), `carryOver` (repeat on the next working day), `links` (`SOURCES` keys shown in the expanded item). Keep `docs/SPEC.md`'s rule table in step: a test compares them.

### Sprint dates (`public/schedule.js`)

To correct a sprint's dates, add an entry to `OVERRIDES`, e.g. `{ 27: { planning: '2026-12-30' } }`. Setting `start` or `end` re-derives the other keys for that sprint, and a `start` override moves the cadence of every later sprint. When a new release year starts, add its first internal number to `YEAR_STARTS`.

### Duty rota (`public/duty.js`)

Names are **first name + last initial only** (`'Andrei I.'`), because the page and the repo are public. Never add full names.

- A release: add `{ demo: 'YYYY-MM-DD', demoBy, live: 'YYYY-MM-DD', liveLead, liveBackup }` to `RELEASES`. The dates must be the engine's Demo (Tuesday) and Live (Monday) dates for that sprint; a test checks this. Use `null` for "not assigned yet".
- A support week: add `{ week: 'YYYY-MM-DD', dev }` to `SUPPORT_WEEKS`, keyed by the Monday of the Mon–Sun week.
- Update `ROTA_UPDATED`. If the file is missing or broken, the duty line is simply not shown.

### Holidays (`public/holidays.js`)

One row per country and date: `{ date: 'YYYY-MM-DD', country: 'EE' | 'PL', name }`, in date order. To add a year, copy the fixed dates and compute the Easter-based ones from that year's Easter Sunday (EE: Good Friday −2, Pentecost +49; PL: Easter Monday +1, Pentecost +49, Corpus Christi +60). The tests check the format, duplicates and the Easter offsets. The board never moves dates for a holiday: it shows a notice when a weekday holiday falls on a sprint's planning or start day, or between its freeze and its Live update. A moved Live update goes into `OVERRIDES`.

## Set it as your home page

The page has the same help under "Make this your browser home page".

- **Edge:** Settings > Start, home, and new tabs > "When Edge starts" > Open these pages > Add a new page > paste the URL. To also use it for the Home button, set "Home button" to the same URL.
- **Chrome:** Settings > On startup > Open a specific page or set of pages > Add a new page > paste the URL. For the Home button: Settings > Appearance > Show home button > enter the URL.

### Company-wide (IT, Microsoft Intune)

IT can push the page to every managed laptop with an Intune configuration profile (Administrative Templates > Microsoft Edge; the same policy names exist for Chrome):

- `RestoreOnStartup` = 4 and `RestoreOnStartupURLs` = the page address (opens on browser start)
- `HomepageLocation` = the page address, `ShowHomeButton` = enabled (Home button)
- `NewTabPageLocation` = the page address (new tabs; the only way to set a custom new tab page without an extension)

## Rollback

Render dashboard > insly-sprint-monitor > Events (deploys) > pick the previous good deploy > Rollback. Then fix or revert the commit in git so the next deploy does not bring the problem back.
