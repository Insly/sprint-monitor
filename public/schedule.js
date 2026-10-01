// Sprint Monitor date engine (MGA delivery unit).
// Pure ES module: no DOM, no clock reads. Every function takes the date it works on.
// All dates are LOCAL calendar dates, exchanged as 'YYYY-MM-DD' strings.
// See CONTRACT.md for the calendar model.

export const ANCHOR = { number: 17, start: '2026-08-03' };
// Confirmed through 2027-2: Confluence calendar to S22, rota sheet to 2026-25, owner for 2027-1/2027-2.
export const LAST_CONFIRMED = 27;
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
export const OVERRIDES = {
  // 2027-1 (owner, 2026-10-01): a longer year-end sprint, Mon 7 Dec 2026 to Fri 1 Jan 2027 (20 working days).
  // There is no year-end break: people work between Christmas and New Year. Every other key derives
  // from `end` with the standard offsets: freeze Fri 1 Jan, bug retro Mon 4 Jan, Demo update Tue 5 Jan
  // (confirmed by the duty rota sheet), UAT Wed 6 Jan, cut-off and Live Mon 11 Jan. No release on Mon 28 Dec.
  26: { end: '2027-01-01' },
  // 2027-2 (owner, 2026-10-01): starts Mon 4 Jan 2027, right after 2027-1; the cadence continues from here.
  // Open (owner): planning computes to Thu 31 Dec 2026 (start - 4); add `planning` here if it changes.
  27: { start: '2027-01-04' },
};

/**
 * Release-year numbering: the first internal sprint number of each year's series.
 * Labels are `${year}-${n - first + 1}`, e.g. internal 26 = 2027-1 (numbering resets per year).
 */
export const YEAR_STARTS = { 2026: 1, 2027: 26 };

/**
 * Internal sprint numbers from here on (2027-3 onwards) are plain projections of the 2-week cadence
 * after the year-end sprint: nobody has confirmed them yet. The page flags them (DESIGN v2.1-C).
 */
export const UNCONFIRMED_FROM = 28;

function labelOf(n) {
  let year = null;
  for (const [y, first] of Object.entries(YEAR_STARTS)) if (n >= first && (year === null || first >= YEAR_STARTS[year])) year = y;
  return year === null ? `${n}` : `${year}-${n - YEAR_STARTS[year] + 1}`;
}


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
    label: labelOf(n),
    projected: n > LAST_CONFIRMED,
    yearEndUnconfirmed: n >= UNCONFIRMED_FROM,
    overridden: Object.keys(o).length > 0,
  };
}

/** Sprint number whose [start, next start) window contains the date (Mon to the Sunday after end). */
/** Number of working days (Mon–Fri) from sprint start to end, inclusive. 10 unless overridden. */
export function workingDaysIn(sprint) {
  let n = 0;
  for (let d = sprint.start; d <= sprint.end; d = addDays(d, 1)) if (!isWeekendDay(d)) n++;
  return n;
}

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
    // Week 1 = the first 7 days. In the 4-week 2027-1 every later week counts as week 2.
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

// ---------- v2.1 API (DESIGN.md v2.1-C) ----------
// Owner, 2026-10-01: there is no year-end break (2027-1 is a longer sprint), so the DESIGN's
// `isBreakDay` and the `break` state are not implemented.

export const TALLINN = 'Europe/Tallinn';
/** The three delivery offices, in display order. */
export const OFFICE_ZONES = ['Europe/Tallinn', 'Europe/Warsaw', 'Europe/London'];
/** Fallback times when rules.js has no `time` on the rule (owner, 2026-10-01). */
export const DEFAULT_TIMES = { cutoff: '12:00', demo: '17:00', live: '20:00' };
export const ROLES = ['Everyone', 'IM/AM', 'Dev', 'QA', 'Lead', 'Analyst'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Thu 8 Oct' */
export function fmtDay(input) {
  const d = parseDate(input);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** '8 Oct' */
export function fmtDM(input) {
  const d = parseDate(input);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** The previous weekday (Mon -> Fri). Holidays are not skipped: the board never moves dates for them. */
export function previousWorkingDay(input) {
  let key = addDays(input, -1);
  while (isWeekendDay(key)) key = addDays(key, -1);
  return key;
}

/** Weekdays in (a, b] when b > a; minus the weekdays in (b, a] when b < a; 0 when equal. */
export function workingDaysBetween(a, b) {
  const from = toKey(a);
  const to = toKey(b);
  if (from === to) return 0;
  const [lo, hi, sign] = from < to ? [from, to, 1] : [to, from, -1];
  let n = 0;
  for (let d = addDays(lo, 1); d <= hi; d = addDays(d, 1)) if (!isWeekendDay(d)) n += 1;
  return sign * n;
}

/** Does a rule's `who` include the role? 'Everyone' (or no role) matches every rule. */
export function roleMatches(rule, role) {
  if (!role || role === 'Everyone' || role === 'All') return true;
  const who = Array.isArray(rule.who) ? rule.who : [];
  return who.includes('All') || who.includes(role);
}

/** Read a rule's `time` from rules.js, with a fallback. */
export function ruleTime(rules, id, fallback) {
  const r = Array.isArray(rules) ? rules.find((x) => x.id === id) : null;
  return r && typeof r.time === 'string' ? r.time : fallback;
}

/** The three times the board switches on: cut-off, Demo update, Live update. Read from rules.js. */
export function keyTimes(rules) {
  return {
    cutoff: ruleTime(rules, 'fix-cutoff', DEFAULT_TIMES.cutoff),
    demo: ruleTime(rules, 'demo-update', DEFAULT_TIMES.demo),
    live: ruleTime(rules, 'live-update', DEFAULT_TIMES.live),
  };
}

function zoneParts(instant, zone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute') };
}

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Today's date and time in a zone (default Europe/Tallinn), whatever the device zone is.
 * `instant` is for tests; the page passes nothing. Returns { date: 'YYYY-MM-DD', time: 'HH:MM' }.
 */
export function zonedNow(zone = TALLINN, instant = new Date()) {
  const p = zoneParts(instant, zone);
  return { date: `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`, time: `${pad2(p.h)}:${pad2(p.mi)}` };
}

/** The instant at which the wall clock in `zone` shows dateKey hh:mm. */
export function zonedInstant(dateKey, hhmm, zone = TALLINN) {
  const d = parseDate(dateKey);
  const [hh, mm] = hhmm.split(':').map(Number);
  const wall = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const p = zoneParts(new Date(guess), zone);
    guess += wall - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  }
  return new Date(guess);
}

const cityOf = (zone) => zone.split('/').pop().replace(/_/g, ' ');

/**
 * A Tallinn wall time shown in several zones: '20:00 Tallinn · 19:00 Warsaw · 18:00 London'.
 * dateKey matters because the offsets change with daylight saving time.
 */
export function formatAcrossZones(dateKey, hhmm, zones = OFFICE_ZONES) {
  const instant = zonedInstant(dateKey, hhmm, TALLINN);
  return zones.map((z) => `${zonedNow(z, instant).time} ${cityOf(z)}`).join(' · ');
}

/** Does the device clock show a different wall time than Tallinn at this instant? */
export function deviceDiffersFromTallinn(instant = new Date()) {
  const t = zonedNow(TALLINN, instant);
  const local = `${instant.getFullYear()}-${pad2(instant.getMonth() + 1)}-${pad2(instant.getDate())} ${pad2(instant.getHours())}:${pad2(instant.getMinutes())}`;
  return local !== `${t.date} ${t.time}`;
}

/** '2026-21' -> 21, '2027-1' -> 26. null when it does not parse or names no sprint of that year. */
export function sprintByLabel(label) {
  const m = /^(\d{4})-(\d{1,3})$/.exec(String(label ?? ''));
  if (!m) return null;
  const year = Number(m[1]);
  const k = Number(m[2]);
  const first = YEAR_STARTS[year];
  if (first == null || k < 1) return null;
  const n = first + k - 1;
  const nextFirst = YEAR_STARTS[year + 1];
  if (nextFirst != null && n >= nextFirst) return null;
  return n;
}

/** 5-step bar position and rail label of sprint `s` on date d at Tallinn time t (STATES.md §6). */
export function sprintPhase(s, date, time = '09:00', times = DEFAULT_TIMES) {
  const d = toKey(date);
  if (d < s.planning) return { phase: 'Plan', label: `Refinement · planning ${fmtDay(s.planning)}` };
  if (d === s.planning) return { phase: 'Plan', label: `Sprint planning today · starts ${fmtDay(s.start)}` };
  if (d < s.start) return { phase: 'Plan', label: `Planned · starts ${fmtDay(s.start)}` };
  if (d < s.freezeStart) {
    if (isWeekendDay(d)) return { phase: 'Build', label: `Weekend · code freeze ${fmtDay(s.freezeStart)}` };
    return { phase: 'Build', label: `Sprint day ${workingDaysFrom(s.start, d)} of ${workingDaysIn(s)} · code freeze ${fmtDay(s.freezeStart)}` };
  }
  if (d === s.freezeStart) return { phase: 'Freeze', label: `Code freeze starts today · Demo update ${fmtDay(s.demoStart)} evening` };
  if (d < s.demoStart) return { phase: 'Freeze', label: `Code freeze · Demo update ${fmtDay(s.demoStart)} evening` };
  if (d === s.demoStart) {
    return time < times.demo
      ? { phase: 'Freeze', label: `Code freeze · Demo update ${times.demo}` }
      : { phase: 'Freeze', label: 'Demo update tonight' };
  }
  if (d === s.uatStart && d < s.cutoff) return { phase: 'UAT', label: `UAT opens today · fix cut-off ${fmtDay(s.cutoff)} ${times.cutoff}` };
  if (d < s.cutoff) return { phase: 'UAT', label: `UAT on Demo · fix cut-off ${fmtDay(s.cutoff)} ${times.cutoff}` };
  if (d === s.cutoff) {
    if (time < times.cutoff) return { phase: 'Live', label: `Fix cut-off ${times.cutoff} today · Live update tonight` };
    if (time < times.live) return { phase: 'Live', label: `Cut-off passed · Live update tonight ${times.live}` };
    return { phase: 'Live', label: 'Live update tonight' };
  }
  if (d <= s.live) return { phase: 'Live', label: `Live update ${fmtDay(s.live)}` }; // only if an override splits cut-off and Live
  return { phase: 'Live', label: `Live update was ${fmtDay(s.live)}` };
}

export const MILESTONE_KEYS = ['planning', 'start', 'freezeStart', 'bugRetro', 'demoStart', 'uatStart', 'cutoff', 'live'];

/**
 * Everything the sprint view needs for sprint n, seen from `date` at Tallinn `time`. Pure.
 * Options: role (filters actions; null or 'Everyone' = all), time ('HH:MM', default 09:00),
 * holidays (the HOLIDAYS list from holidays.js; schedule.js does not import data).
 */
export function sprintDetail(n, date, rules, { role = null, time = '09:00', holidays = [] } = {}) {
  const today = toKey(date);
  const sprint = sprintDates(n);
  const ctx = context(today);
  const times = keyTimes(rules);
  const relation = n === ctx.previous.n ? 'previous'
    : n === ctx.current.n ? 'current'
      : n === ctx.next.n ? 'next'
        : n < ctx.previous.n ? 'past' : 'upcoming';

  const timeOf = { demoStart: times.demo, cutoff: times.cutoff, live: times.live };
  const milestones = MILESTONE_KEYS.map((key) => {
    const d = sprint[key];
    const t = timeOf[key] ?? null;
    let status;
    if (d < today || (d === today && t && time >= t)) status = 'passed';
    else if (d === today) status = 'today';
    else status = 'coming';
    return { key, date: d, time: t, status, workingDaysAway: workingDaysBetween(today, d) };
  });

  const actions = [];
  for (let d = sprintDates(n - 1).start; d <= sprint.live; d = addDays(d, 1)) {
    if (isWeekendDay(d)) continue;
    for (const a of actionsFor(d, rules)) {
      if (a.sprintNumber !== n) continue;
      if (a.status === 'active-window' && a.dates.from !== d) continue;
      if (!roleMatches(a, role)) continue;
      let status;
      if (a.status === 'active-window') {
        status = a.dates.to < today ? 'passed' : a.dates.from <= today ? 'running' : 'coming';
      } else if (d < today || (d === today && a.time && time >= a.time)) status = 'passed';
      else status = d === today ? 'today' : 'coming';
      actions.push({ date: d, ...a, status });
    }
  }

  const span = (Array.isArray(holidays) ? holidays : [])
    .filter((h) => h.date >= sprint.planning && h.date <= sprint.live && !isWeekendDay(h.date))
    .sort((a, b) => (a.date === b.date ? a.country.localeCompare(b.country) : a.date < b.date ? -1 : 1));

  return {
    sprint,
    relation,
    phase: sprintPhase(sprint, today, time, times),
    milestones,
    actions,
    holidays: span,
    holidaysAffecting: span.filter((h) => holidayTouchesKeyDates(sprint, h.date)),
  };
}

/** STATES.md §11: a weekday holiday on planning or start day, or from freeze start to the Live update. */
export function holidayTouchesKeyDates(sprint, dateKey) {
  if (isWeekendDay(dateKey)) return false;
  if (dateKey === sprint.planning || dateKey === sprint.start) return true;
  return dateKey >= sprint.freezeStart && dateKey <= sprint.live;
}
