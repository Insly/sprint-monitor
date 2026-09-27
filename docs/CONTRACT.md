# Sprint Monitor — shared contract (analyst ↔ dev ↔ QA)

Tier: T1 (one owner, low stakes, no personal data, months-long lifetime). See software-project-playbook.
Scope: MGA delivery unit only. Static page, no backend, no Jira calls (v1).
Hosting: claude.ai Artifact (published from `index.html` + `schedule.js` + `rules.js` as supporting files).
Page loads modules with `<script type="module">import … from './schedule.js'`.

## Files and owners

| File | Owner | Content |
|---|---|---|
| `schedule.js` | dev | Pure date engine. No DOM. ES module. |
| `rules.js` | analyst | `export const RULES = [...]` + `export const SOURCES = {...}` — data only |
| `index.html` | dev | Page (artifact contract: no doctype/html/head/body tags; own `<title>` + `<style>` at top) |
| `schedule.test.js`, `rules.test.js` | dev (QA extends) | vitest, run with `npx vitest run sprint-monitor` |
| `SPEC.md` | analyst | Problem, non-goals, acceptance checks, rule catalogue with sources, open discrepancies |

## Calendar model (authoritative, derived from Confluence)

Anchor: **Sprint 17 starts Monday 2026-08-03.** Sprints are 14 days, back-to-back, Monday → Friday of week 2.
Sprint N start = 2026-08-03 + (N − 17) × 14 days. Numbering continues across years (v1; year reset unknown).
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
  time: '18:00',                 // optional HH:MM
  kind: 'deadline',              // 'deadline' | 'meeting' | 'deploy' | 'window' | 'reminder'
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
```
