// Sprint Monitor date engine (MGA delivery unit).
// Pure ES module: no DOM, no clock reads. Every function takes the date it works on.
// All dates are LOCAL calendar dates, exchanged as 'YYYY-MM-DD' strings.
// See CONTRACT.md for the calendar model.

export const ANCHOR = { number: 17, start: '2026-08-03' };
export const LAST_CONFIRMED = 22;
export const SPRINT_LENGTH_DAYS = 14;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// ---------- date helpers (local calendar, DST-safe) ----------

/** Parse 'YYYY-MM-DD' or a Date into a local-midnight Date. Throws on bad input. */
export function parseDate(input) {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new Error('Invalid Date');
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  const m = typeof input === 'string' ? KEY_RE.exec(input) : null;
  if (!m) throw new Error(`Expected YYYY-MM-DD, got ${String(input)}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    throw new Error(`Not a calendar date: ${input}`);
  }
  return date;
}

/** Format a Date (or pass through a key) as local 'YYYY-MM-DD'. */
export function toKey(input) {
  const d = parseDate(input);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Add calendar days; returns a key. Uses Y/M/D arithmetic so DST never shifts the day. */
export function addDays(input, n) {
  const d = parseDate(input);
  return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

/** 'Sun'..'Sat' */
export function weekdayOf(input) {
  return WEEKDAYS[parseDate(input).getDay()];
}

export function isWeekendDay(input) {
  const wd = parseDate(input).getDay();
  return wd === 0 || wd === 6;
}

/** The given date if it is a weekday, otherwise the following Monday. */
export function nextWorkingDay(input) {
  let key = toKey(input);
  while (isWeekendDay(key)) key = addDays(key, 1);
  return key;
}

// ---------- calendar model ----------

/**
 * Per-sprint corrections merged over the 14-day formula, e.g. for the year-end plan:
 *   { 26: { live: '2027-01-07', cutoff: '2027-01-07' } }
 * If an override sets `start` and/or `end`, the other keys are re-derived from them first,
 * then any further override keys are applied on top. Keep empty until a plan is published.
 */
export const OVERRIDES = {};

/** Sprints starting after this date may have year-end changes that are not confirmed yet. */
export const YEAR_END_UNCONFIRMED_AFTER = '2026-11-30';

function formulaStart(n) {
  // A `start` override re-bases the 14-day cadence for every later sprint, so that
  // moving one sprint's start (e.g. after the year-end break) does not leave the
  // following sprints on the old grid, overlapping it.
  let baseN = ANCHOR.number;
  let baseStart = ANCHOR.start;
  for (const [k, o] of Object.entries(OVERRIDES)) {
    const m = Number(k);
    if (o && o.start && m < n && m > baseN) {
      baseN = m;
      baseStart = o.start;
    }
  }
  return addDays(baseStart, (n - baseN) * SPRINT_LENGTH_DAYS);
}

export function sprintDates(n) {
  if (!Number.isInteger(n)) throw new Error(`Sprint number must be an integer, got ${n}`);
  const o = OVERRIDES[n] || {};
  const start = o.start ?? formulaStart(n);
  const end = o.end ?? addDays(start, 11);
  const demoEnd = addDays(end, 5);
  const base = {
    n,
    planning: addDays(start, -4),
    start,
    end,
    freezeStart: end,
    bugRetro: addDays(end, 3),
    demoStart: addDays(end, 4),
    demoEnd,
    freezeEnd: demoEnd,
    uatStart: demoEnd,
    cutoff: addDays(end, 10),
    live: addDays(end, 10),
  };
  const merged = { ...base, ...o, n };
  return {
    ...merged,
    label: `${merged.start.slice(0, 4)}-${n}`,
    projected: n > LAST_CONFIRMED,
    yearEndUnconfirmed: merged.start > YEAR_END_UNCONFIRMED_AFTER,
    overridden: Object.keys(o).length > 0,
  };
}

/** Sprint number whose [start, next start) window contains the date (Mon to the Sunday after end). */
export function sprintForDate(date) {
  const key = toKey(date);
  let n = ANCHOR.number + Math.floor(daysBetween(ANCHOR.start, key) / SPRINT_LENGTH_DAYS);
  // Only matters when OVERRIDES move a start date; with no overrides this is a no-op.
  while (sprintDates(n).start > key) n -= 1;
  while (sprintDates(n + 1).start <= key) n += 1;
  return n;
}

function workingDaysFrom(startKey, key) {
  let count = 0;
  for (let d = startKey; d <= key; d = addDays(d, 1)) if (!isWeekendDay(d)) count += 1;
  return count;
}

export function context(date) {
  const key = toKey(date);
  const n = sprintForDate(key);
  const current = sprintDates(n);
  const idx = daysBetween(current.start, key); // 0..13 for a regular sprint
  const isWeekend = isWeekendDay(key);
  return {
    date: key,
    isWeekend,
    dayOfSprint: isWeekend ? null : workingDaysFrom(current.start, key),
    weekOfSprint: idx < 7 ? 1 : 2,
    previous: sprintDates(n - 1),
    current,
    next: sprintDates(n + 1),
  };
}

// ---------- rules ----------

const RELATIONS = ['previous', 'current', 'next'];

function relationSprint(ctx, relation) {
  return relation ? ctx[relation] : null;
}

export const DATE_KEYS = [
  'planning', 'start', 'end', 'freezeStart', 'bugRetro', 'demoStart',
  'demoEnd', 'freezeEnd', 'uatStart', 'cutoff', 'live',
];

function resolveKey(sprint, key) {
  if (!DATE_KEYS.includes(key)) throw new Error(`Unknown date key "${key}"`);
  return sprint[key];
}

/**
 * Rules evaluated against a given sprint. Returns an action object or null.
 * on / on+offset / from-to rules are checked against previous, current and next sprint,
 * and `relation` reports which of the three actually matched (normally equal to rule.sprint).
 */
function matchDated(rule, key, sprint, relation) {
  const w = rule.when;
  if ('on' in w) {
    const on = addDays(resolveKey(sprint, w.on), w.offset ?? 0);
    if (on !== key) return null;
    return { ...rule, relation, sprintNumber: sprint.n, dates: { on }, status: 'today' };
  }
  const from = resolveKey(sprint, w.from);
  const to = resolveKey(sprint, w.to);
  if (key < from || key > to) return null;
  return { ...rule, relation, sprintNumber: sprint.n, dates: { from, to }, status: 'active-window' };
}

export function actionsFor(date, rules) {
  const ctx = context(date);
  const key = ctx.date;
  const out = [];
  for (const rule of rules) {
    const w = rule.when || {};
    if ('weekly' in w) {
      if (weekdayOf(key) !== w.weekly) continue;
      if (w.week != null && ctx.weekOfSprint !== w.week) continue;
      const s = relationSprint(ctx, rule.sprint);
      out.push({
        ...rule,
        relation: rule.sprint ?? null,
        sprintNumber: s ? s.n : null,
        dates: { on: key },
        status: 'today',
      });
      continue;
    }
    if (!('on' in w) && !('from' in w && 'to' in w)) {
      throw new Error(`Rule ${rule.id}: unsupported "when" ${JSON.stringify(w)}`);
    }
    // Not sprint-bound dated rules are resolved against the current sprint.
    const relations = rule.sprint ? RELATIONS : ['current'];
    for (const rel of relations) {
      const hit = matchDated(rule, key, ctx[rel], rule.sprint ? rel : null);
      if (hit) {
        if (!rule.sprint) hit.sprintNumber = null;
        out.push(hit);
      }
    }
  }
  return out.sort(compareActions);
}

const KIND_ORDER = { deploy: 0, deadline: 1, meeting: 2, window: 3, reminder: 4 };

function compareActions(a, b) {
  const ta = a.time ?? '99:99';
  const tb = b.time ?? '99:99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  const ka = KIND_ORDER[a.kind] ?? 9;
  const kb = KIND_ORDER[b.kind] ?? 9;
  if (ka !== kb) return ka - kb;
  return String(a.title).localeCompare(String(b.title));
}

/**
 * Occurrences strictly after `date`, over the next `days` working days.
 * Single-day and weekly rules appear on their day; windows appear on the day they open.
 * Returns [{ date, ...action }] sorted by date, then time, kind, title.
 */
export function upcoming(date, rules, days = 10) {
  const out = [];
  let d = toKey(date);
  let working = 0;
  while (working < days) {
    d = addDays(d, 1);
    if (!isWeekendDay(d)) working += 1;
    for (const a of actionsFor(d, rules)) {
      if (a.status === 'active-window' && a.dates.from !== d) continue;
      out.push({ date: d, ...a });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? compareActions(a, b) : a.date < b.date ? -1 : 1));
}
