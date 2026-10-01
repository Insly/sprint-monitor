# Sprint Monitor — shared contract (analyst ↔ dev ↔ QA)

Tier: T1 (one owner, low stakes, no personal data, months-long lifetime). See software-project-playbook.
Scope: MGA delivery unit only. Static page, no backend, no Jira calls (v1).
Hosting: Render static site serving `public/` (no build step). Every push to `main` deploys.
Page loads ES modules: `schedule.js` and `board.js` statically; `rules.js`, `duty.js` and `holidays.js` dynamically, each with its own fallback.

## Files and owners

| File | Owner | Content |
|---|---|---|
| `schedule.js` | dev | Pure date engine. No DOM. ES module. |
| `board.js` | dev | Pure state resolver for `docs/ux/STATES.md`: band, headline, sub-line, tab title, rail, duty line, Your day, Coming up. No DOM, no clock reads. |
| `duty.js` | owner | Static dev duty rota: `RELEASES` (Demo deployer, Live lead and backup), `SUPPORT_WEEKS`, `ROTA_UPDATED`. Names are first name + last initial only. |
| `holidays.js` | owner | `HOLIDAYS = [{ date, country: 'EE'\|'PL', name }]` for 2026–2027 and `holidaysBetween(from, to)`. |
| `rules.js` | analyst | `export const RULES = [...]` + `export const SOURCES = {...}` — data only |
| `index.html` | dev | Page (artifact contract: no doctype/html/head/body tags; own `<title>` + `<style>` at top) |
| `schedule.test.js`, `rules.test.js` | dev (QA extends) | vitest, run with `npx vitest run sprint-monitor` |
| `SPEC.md` | analyst | Problem, non-goals, acceptance checks, rule catalogue with sources, open discrepancies |

## Calendar model (authoritative, derived from Confluence)

Anchor: **Sprint 17 starts Monday 2026-08-03.** Sprints are 14 days, back-to-back, Monday → Friday of week 2.
Sprint N start = 2026-08-03 + (N − 17) × 14 days, corrected by `OVERRIDES` (a `start` override re-bases later sprints). Labels reset per year via `YEAR_STARTS` (internal 26 = 2027-1). 2027-1 is a 20-working-day year-end sprint (7 Dec 2026 to Fri 1 Jan 2027, owner); 2027-2 starts Mon 4 Jan 2027. There is no year-end break. Sprints from 2027-3 (`UNCONFIRMED_FROM = 28`) are plain projections.
Confluence calendar confirms S17–S22; later sprints are **projected** (page must say so for N > 22).

Date keys returned by `sprintDates(n)` (all local dates, `YYYY-MM-DD` strings):

| key | rule | S20 example |
|---|---|---|
| `planning` | start − 4 days (Thursday before) | 2026-09-10 |
| `start` | Monday week 1 | 2026-09-14 |
| `end` | start + 11 (Friday week 2) | 2026-09-25 |
| `freezeStart` | = end (Friday) | 2026-09-25 |
| `bugRetro` | end + 3 (Monday) | 2026-09-28 |
| `demoStart` | end + 4 (Tuesday) — Demo update evening | 2026-09-29 |
| `demoEnd` | end + 5 (Wednesday) | 2026-09-30 |
| `freezeEnd` | end + 5 (Wednesday) | 2026-09-30 |
| `uatStart` | = demoEnd (Wednesday) | 2026-09-30 |
| `cutoff` | end + 10 (Monday, 12:00) | 2026-10-05 |
| `live` | end + 10 (Monday evening) | 2026-10-05 |

Relative sprints for a given date D: `current` = sprint whose [start, end+2 (Sunday)] contains D.
`previous` = current − 1, `next` = current + 1.
`dayOfSprint` = working-day index 1..10 of D inside current (weekend → null, flag `isWeekend`).

## Rule schema (`rules.js`)

```js
{
  id: 'demo-update',             // unique kebab-case
  title: 'Demo update',          // short, imperative or event name
  detail: 'Everything on Beta moves to Demo unless excluded in the Demo/Live update matrix.',
  who: ['Dev'],                  // any of: 'Dev','QA','IM/AM','Analyst','Lead','All'
  sprint: 'previous',            // 'previous' | 'current' | 'next' | null (null = not sprint-bound)
  when: { on: 'demoStart' }      // one of:
                                 //   { on: <dateKey> }                     single day
                                 //   { on: <dateKey>, offset: -1 }         day relative to key (calendar days)
                                 //   { from: <dateKey>, to: <dateKey> }    window, inclusive
                                 //   { weekly: 'Wed' }                     every week on that weekday
                                 //   { weekly: 'Thu', week: 1|2 }          only in week 1 or 2 of CURRENT sprint
  time: '17:00',                 // optional HH:MM, Europe/Tallinn (demo-update 17:00, live-update 20:00, fix-cutoff 12:00)
  kind: 'deadline',              // 'deadline' | 'meeting' | 'deploy' | 'window' | 'reminder'
  slot: 'evening',               // optional: 'morning' | 'before-deploy' | 'after-cutoff' | 'evening' | 'after-deploy'
  carryOver: 1,                  // optional: also show on the next N working days ("From last night")
  links: ['demoLiveMatrix'],     // optional: SOURCES keys shown in the expanded item
  source: 'lifecycle'            // key into SOURCES
}
```

`SOURCES = { lifecycle: { title, url }, calendar: {...}, refinement: {...}, liveIssues: {...}, qaEstimation: {...} }`.

## Engine API (`schedule.js`)

```js
export const ANCHOR = { number: 17, start: '2026-08-03' };
export const LAST_CONFIRMED = 22;
export function sprintDates(n)            // → { n, planning, start, end, ..., projected: n > LAST_CONFIRMED }
export function sprintForDate(date)       // → n (Date or 'YYYY-MM-DD')
export function context(date)             // → { date, isWeekend, dayOfSprint, weekOfSprint, previous, current, next } (each a sprintDates object)
export function actionsFor(date, rules)   // → [{ ...rule, sprintNumber, dates:{from,to}|{on}, status:'today'|'active-window' }]
export function upcoming(date, rules, days = 10) // → next occurrences after date, sorted, each with its date

// v2.1 (DESIGN.md v2.1-C). All pure; the page passes the Tallinn date and time in.
export function sprintByLabel(label)                 // '2026-21' -> 21, '2027-1' -> 26, else null
export function sprintDetail(n, date, rules, { role, time, holidays })
  // -> { sprint, relation, phase, milestones[{ key, date, time, status, workingDaysAway }], actions[], holidays[], holidaysAffecting[] }
export function sprintPhase(sprint, date, time)      // -> { phase: 'Plan'|'Build'|'Freeze'|'UAT'|'Live', label } (STATES.md §6)
export function zonedNow(zone = 'Europe/Tallinn', instant = new Date())   // -> { date, time } in that zone
export function formatAcrossZones(dateKey, hhmm)     // '20:00 Tallinn · 19:00 Warsaw · 18:00 London'
export function deviceDiffersFromTallinn(instant)    // true -> show "(Tallinn time)"
export function keyTimes(rules)                      // { cutoff, demo, live } from rules.js `time` fields
export function holidayTouchesKeyDates(sprint, date) // STATES.md §11 rule
```

`isBreakDay` from DESIGN v2.1-C is not implemented: the owner dropped the year-end break (2026-10-01).

## State resolver (`board.js`)

```js
export function resolveDay({ date, time, role, rules, duty, holidays, preview })
  // -> { band, tag, headline, sub, countdown, order, next, tab, favicon, meta, duty, agenda, rail, notices, comingUp }
export function dutyLine(date, duty, rules)          // STATES.md §7; null when there is no rota
export function railRows(date, time, rules, holidays)
```
`tests/states.test.js` reads the fixture block from `docs/ux/STATES.md` and asserts every row.
