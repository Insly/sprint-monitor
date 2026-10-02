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
| `tests/freshness.test.js` | Freshness alarm: does the static data cover the next 60 days? Not part of `npm test`; run `npm run freshness`. |
| `.github/workflows/deploy.yml` | Tests on every push; on `main`, triggers the Render deploy hook for the tested commit. |
| `.github/workflows/scheduled.yml` | Weekly freshness check and 30-minute uptime check. |
| `render.yaml` | Render Blueprint, **not applied** (see "Deploys"). Kept as a record of the intended settings. |

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
npm run freshness                 # data freshness alarm (not part of npm test)
FRESHNESS_TODAY=2026-12-01 npm run freshness   # dry run for another day
```

CI runs `npm test` under Europe/Tallinn and America/New_York on Node 22. The freshness alarm never runs on push, so data running out never blocks a deploy.

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

## Deploys

The Render service was created by hand in the dashboard, and Render has no GitHub app access to this repo. So `render.yaml` is **not applied**: Render does not read it, and a push does not redeploy by itself. The live service's settings (publish directory `public`, headers) are whatever the dashboard says; on 2 Oct 2026 the live site did not send the `Cache-Control: no-cache` and `Referrer-Policy` headers from `render.yaml`. To get them, add them under Render > service > Settings > Headers.

Deploys come from CI only: `.github/workflows/deploy.yml` runs the tests (Tallinn and New York time zones) on every push, and on `main`, once they pass, POSTs the deploy hook from the GitHub secret `RENDER_DEPLOY_HOOK` with `ref=<tested commit SHA>`, so Render deploys exactly the commit that passed. Deploys run one at a time (concurrency group `deploy`; a newer push waits, it does not cancel a running deploy).

## Scheduled checks

`.github/workflows/scheduled.yml` (also runnable by hand: Actions > scheduled-checks > Run workflow):

- **Freshness**, Monday 06:00 UTC: `npm run freshness`. Fails when today + 60 days passes the end of the rota, holidays, `YEAR_STARTS`, the year-end `OVERRIDES` entry or `LAST_CONFIRMED`. The failure message says what to update and in which file. See "Yearly data renewal".
- **Uptime**, every 30 minutes: the live page returns 200 and contains `MGA Sprint Board`, and `/schedule.js`, `/board.js` and `/rules.js` return 200.

A failed run makes GitHub email the **workflow owner**: the person who last changed the `cron` lines in `scheduled.yml` (or who re-enabled the workflow). That person must have Settings > Notifications > Actions > "Notify me for failed workflows only" (email) turned on. To move the alerts to someone else, that person makes a small commit to the cron lines.

GitHub **disables scheduled workflows after 60 days without activity** in the repository (no commits). You get an email first. To re-enable: Actions > scheduled-checks > "Enable workflow" (or push any commit). Re-enabling also makes you the workflow owner.

## Runbooks

### Deploy hook leaked

The hook URL is a secret: anyone with it can trigger deploys. If it appears in a log, chat, screenshot or commit, rotate it within 24 hours:

1. Render > insly-sprint-monitor > Settings > Deploy Hook > Regenerate. The old URL stops working.
2. GitHub > Insly/sprint-monitor > Settings > Secrets and variables > Actions > `RENDER_DEPLOY_HOOK` > Update, paste the new URL.
3. Actions > test-and-deploy > Run workflow on `main` to check the new hook deploys.

### Rollback

Render dashboard > insly-sprint-monitor > Events > pick the last good deploy > Rollback. Then fix or `git revert` the bad commit on `main`, so the next deploy does not bring the problem back.

Break-glass, when CI is down or the hook does not work: `git revert <bad commit>` and push to `main`, then in Render > Manual Deploy > "Deploy a specific commit" and pick the revert commit (or the last good one).

### Dependency updates (cooldown)

The page has no runtime dependencies; vitest is a dev dependency only. Do not take a new release the day it comes out: wait at least 1 to 3 days (malicious or broken releases are usually pulled within that time), then update with `npm install`, run `npm test`, and commit the lockfile. A security advisory for a version we use is the exception: update immediately.

## Yearly data renewal

The board runs on static data with an end date. The weekly freshness check warns 60 days ahead; this is the calendar it checks against.

| Data | File | Covers to (Oct 2026) | Renew |
|---|---|---|---|
| Duty rota: fully assigned releases | `public/duty.js` `RELEASES` | Live 2 Nov 2026 (gaps from 16 Nov) | When the rota sheet changes; fill gaps as soon as known |
| Duty rota: releases listed | `public/duty.js` `RELEASES` | Live 11 Jan 2027 | By early November each year, for the next quarter |
| Public holidays EE + PL | `public/holidays.js` | 31 Dec 2027 | By 1 November of the last covered year, add the next year |
| Release-year numbering | `public/schedule.js` `YEAR_STARTS` | 2027 series | By mid-October, add next year's first internal sprint number |
| Year-end plan | `public/schedule.js` `OVERRIDES` | 2026 (sprint 26 = 2027-1) | By late October, add the sprint that spans Christmas |
| Confirmed sprints | `public/schedule.js` `LAST_CONFIRMED` | 2027-2, ends 15 Jan 2027 | Each time the Confluence release calendar is extended |

## Maintainer and accounts

- Owner and maintainer: Kaspar Ilves (Insly). Backup maintainer: <owner to fill>.
- GitHub: `Insly/sprint-monitor` (public). Org owner who can change repo visibility or install apps: <owner to fill>.
- Render: workspace <owner to fill>, service `insly-sprint-monitor` (static site), URL https://insly-sprint-monitor.onrender.com. Dashboard access: <owner to fill>.
- Deploy hook: GitHub Actions secret `RENDER_DEPLOY_HOOK` (repo Settings > Secrets and variables > Actions). The source is Render > service > Settings > Deploy Hook.
- Alerts: GitHub Actions failure emails to the workflow owner of `scheduled.yml` (see "Scheduled checks").
