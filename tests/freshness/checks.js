// Freshness checks: does the static data still cover the next HORIZON_DAYS days?
// Pure functions over the data modules; tests/freshness.test.js turns each finding into a failure.
// Not part of `npm test` (see vitest.config.js): data running out must never block a deploy.
// Run with `npm run freshness`; CI runs it weekly (.github/workflows/scheduled.yml).
import { RELEASES } from '../../public/duty.js';
import { HOLIDAYS } from '../../public/holidays.js';
import {
  OVERRIDES, YEAR_STARTS, LAST_CONFIRMED, sprintDates, sprintForDate, addDays, toKey,
} from '../../public/schedule.js';

export const HORIZON_DAYS = 60;

/** Today in Tallinn as 'YYYY-MM-DD'; FRESHNESS_TODAY=YYYY-MM-DD overrides (for dry runs). */
export function todayKey(env = process.env, instant = new Date()) {
  if (env.FRESHNESS_TODAY) return toKey(env.FRESHNESS_TODAY);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Tallinn' }).format(instant);
}

const full = (r) => Boolean(r.demoBy && r.liveLead && r.liveBackup);
const yearOf = (key) => Number(key.slice(0, 4));

/**
 * Each check returns { name, coveredTo, ok, message }. `coveredTo` is the last date the data covers;
 * `ok` is false when today + HORIZON_DAYS passes it. `message` says what to update and where.
 */
export function runChecks(today, horizonDays = HORIZON_DAYS) {
  const horizon = addDays(today, horizonDays);
  const out = [];
  const add = (name, coveredTo, ok, message) => out.push({ name, coveredTo, ok, message });

  // 1a. Rota: last release with a full assignment (Demo deployer, Live lead and Live backup).
  const sorted = [...RELEASES].sort((a, b) => (a.live < b.live ? -1 : 1));
  const lastFull = [...sorted].reverse().find(full);
  const fullTo = lastFull ? lastFull.live : '0000-00-00';
  const gaps = sorted.filter((r) => r.live > today && r.live <= horizon && !full(r))
    .map((r) => `Live ${r.live} (${['demoBy', 'liveLead', 'liveBackup'].filter((k) => !r[k]).join(', ')})`);
  add('rota: fully assigned releases', fullTo, horizon <= fullTo,
    `public/duty.js RELEASES: the last fully assigned release goes Live on ${fullTo}, but the board must cover to ${horizon}. `
    + `Fill demoBy / liveLead / liveBackup from "Duty dev.xlsx" (first name + last initial only)`
    + (gaps.length ? `; open slots in the window: ${gaps.join('; ')}` : '')
    + `. Then update ROTA_UPDATED.`);

  // 1b. Rota: last release listed at all.
  const lastListed = sorted.length ? sorted[sorted.length - 1].live : '0000-00-00';
  add('rota: releases listed', lastListed, horizon <= lastListed,
    `public/duty.js RELEASES: the last release listed goes Live on ${lastListed}; add releases up to at least ${horizon} `
    + `as { demo, demoBy, live, liveLead, liveBackup } (dates = the engine's Demo Tuesday and Live Monday; duty.test.js checks this). `
    + `Then update ROTA_UPDATED.`);

  // 2. Holidays: last year covered.
  const lastYear = Math.max(...HOLIDAYS.map((h) => yearOf(h.date)));
  const holTo = `${lastYear}-12-31`;
  add('holidays: years covered', holTo, horizon <= holTo,
    `public/holidays.js HOLIDAYS covers EE and PL to ${lastYear}; add ${lastYear + 1} (fixed dates plus the Easter-based ones, `
    + `see the file header and README "Holidays") before ${holTo}.`);

  // 3. YEAR_STARTS: every sprint in play up to the horizon needs its release year configured.
  //    The release year is the year of its Live update (2027-1 starts 7 Dec 2026, Live 11 Jan 2027).
  const maxYear = Math.max(...Object.keys(YEAR_STARTS).map(Number));
  let firstMissing = null;
  for (let n = sprintForDate(today); sprintDates(n).start <= horizon; n += 1) {
    const s = sprintDates(n);
    if (!(yearOf(s.live) in YEAR_STARTS)) { firstMissing = s; break; }
  }
  // Covered to the day before the first sprint whose release year is missing (searched up to the horizon).
  add('YEAR_STARTS: release-year numbering', firstMissing ? addDays(firstMissing.start, -1) : horizon, !firstMissing,
    firstMissing
      ? `public/schedule.js YEAR_STARTS has no ${yearOf(firstMissing.live)} entry, but internal sprint ${firstMissing.n} `
        + `(starts ${firstMissing.start}, Live ${firstMissing.live}) belongs to it and would be labelled "${firstMissing.label}". `
        + `Add { ${yearOf(firstMissing.live)}: <first internal sprint number of the ${yearOf(firstMissing.live)} series> } `
        + `(projection: ${firstMissing.n}; confirm with the year-end plan).`
      : `public/schedule.js YEAR_STARTS covers every sprint to ${horizon} (last configured year ${maxYear}).`);

  // 4. Year-end OVERRIDES: the sprint that spans Christmas needs an override once Christmas is in the window.
  for (let y = yearOf(today); y <= yearOf(horizon); y += 1) {
    const xmas = `${y}-12-25`;
    if (xmas < today || xmas > horizon) continue;
    const n = sprintForDate(xmas);
    const s = sprintDates(n);
    // Key dates the plain cadence puts between Christmas Eve and New Year (what people would see).
    const inBreak = [n - 1, n].flatMap((m) => {
      const d = sprintDates(m);
      return [['Demo update', d.demoStart], ['cut-off and Live', d.cutoff], ['planning', d.planning]]
        .filter(([, k]) => k >= `${y}-12-24` && k <= `${y + 1}-01-01`).map(([what, k]) => `${d.label} ${what} ${k}`);
    });
    add(`year-end OVERRIDES: ${y}`, OVERRIDES[n] ? `${y}-12-31` : addDays(xmas, -1), Boolean(OVERRIDES[n]),
      `public/schedule.js OVERRIDES has no entry for internal sprint ${n} (${s.label}, ${s.start} to ${s.end}, Live ${s.live}), `
      + `the sprint that spans Christmas ${y}. Without it the board shows the plain 14-day cadence over the holidays`
      + (inBreak.length ? ` (${inBreak.join('; ')})` : '')
      + `. Add the published year-end plan, e.g. { ${n}: { end: 'YYYY-MM-DD' } }, `
      + `see the 2026 entry (26) for the pattern; then check LAST_CONFIRMED and UNCONFIRMED_FROM.`);
  }

  // 5. LAST_CONFIRMED: the end of the last confirmed sprint.
  const lc = sprintDates(LAST_CONFIRMED);
  add('LAST_CONFIRMED: confirmed sprints', lc.end, horizon <= lc.end,
    `public/schedule.js LAST_CONFIRMED = ${LAST_CONFIRMED} (${lc.label}) ends ${lc.end}; sprints after it show as projected. `
    + `Confirm the next sprints against the Confluence release calendar, raise LAST_CONFIRMED (and UNCONFIRMED_FROM if `
    + `the year-end plan is confirmed), and update the comment above it.`);

  return { today, horizon, checks: out };
}
