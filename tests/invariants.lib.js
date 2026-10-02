// Copy invariants (review 2026-10-02, Batch 3). Every day 28 Sep 2026 - 25 Jan 2027 x 09:00, 12:30, 17:30, 20:30
// x every role. The oracle below is written by hand from the process, with UTC arithmetic only: it never calls
// schedule.js or board.js for an expected value. board.js is only the system under test.
//
// Process truth:
//   Two-week sprints Mon-Fri; 2026-17 = 3-14 Aug 2026; numbering resets yearly.
//   2027-1 = Mon 7 Dec 2026 - Fri 1 Jan 2027 (no break); 2027-2 starts Mon 4 Jan 2027.
//   Previous sprint: code freeze from its last Friday until the Tuesday 17:00 Demo update (Beta reopens Wednesday),
//   UAT from Wednesday, fix cut-off Monday 12:00, Live update Monday 20:00 (Tallinn).
//   Next sprint: Pre-Refinement every Wed 14:00, Full Refinement Thu 14:00 in week 1, planning the Thursday before start.
//   Holidays (EE, PL): nothing moves.
//
// Decision (2026-10-02): "in N working days" skips EE public holidays only. The board runs on Tallinn time and the
// deploys are run from Tallinn; a PL-only holiday is still a working day for the unit. Weekends never count.
import { describe, it, expect, beforeAll } from 'vitest';
import { resolveDay, dutyTexts } from '../public/board.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';
import * as DUTY from '../public/duty.js';
import { plus, dow, isWknd, days } from './oracle.lib.js';


// ---------------------------------------------------------------- oracle calendar (by hand)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function sprint(label, start, end = plus(start, 11)) {
  return {
    label, start, end, planning: plus(start, -4), freeze: end, demo: plus(end, 4), uat: plus(end, 5), cutoff: plus(end, 10), live: plus(end, 10),
  };
}
const SPRINTS = [
  ...[19, 20, 21, 22, 23, 24, 25].map((n) => sprint(`2026-${n}`, plus('2026-08-03', (n - 17) * 14))),
  sprint('2027-1', '2026-12-07', '2027-01-01'),
  ...[2, 3, 4, 5].map((k) => sprint(`2027-${k}`, plus('2027-01-04', (k - 2) * 14))),
];
const current = (d) => SPRINTS.filter((s) => s.start <= d).at(-1);
const DEPLOY_DAYS = new Set(SPRINTS.flatMap((s) => [s.demo, s.live]));
const DEMO_DAYS = new Set(SPRINTS.map((s) => s.demo));
const LIVE_DAYS = new Set(SPRINTS.map((s) => s.live));

// EE public holidays (Public Holidays and Days of National Importance Act), 2026-2027.
const EE = new Set([
  ...['01-01', '02-24', '04-03', '04-05', '05-01', '05-24', '06-23', '06-24', '08-20', '12-24', '12-25', '12-26'].map((x) => `2026-${x}`),
  ...['01-01', '02-24', '03-26', '03-28', '05-01', '05-16', '06-23', '06-24', '08-20', '12-24', '12-25', '12-26'].map((x) => `2027-${x}`),
]);
/** Weekdays in (a, b] that are not EE public holidays. */
function workingDaysEE(a, b) {
  let n = 0;
  for (let d = plus(a, 1); d <= b; d = plus(d, 1)) if (!isWknd(d) && !EE.has(d)) n += 1;
  return n;
}

// Every date a kind of event covers, per sprint. Windows list every day of the window.
const span = (a, b) => [...days(a, b)];
const KIND_DATES = {
  demo: (s) => [s.demo],
  uat: (s) => span(s.uat, s.cutoff),
  cutoff: (s) => [s.cutoff],
  live: (s) => [s.live],
  freeze: (s) => span(s.freeze, s.demo),
  regression: (s) => span(s.freeze, s.demo),
  planning: (s) => [s.planning],
};
// Wording that names an event of a release or planning. "on Demo" (the environment), "Ready for Demo/Live" (task
// states) and "Demo/Live matrix" (a page) are not events.
const KINDS = {
  demo: /\bDemo update\b|\bDemo (?:tomorrow|today|tonight|Mon|Tue|Wed|Thu|Fri)\b/,
  uat: /\bUAT\b/,
  cutoff: /cut-off/i,
  live: /\bLive update\b|\bLive (?:tomorrow|today|tonight|day|Mon|Tue|Wed|Thu|Fri)\b|\bgoes Live\b/,
  freeze: /\bfreeze\b/i,
  regression: /\bregression\b/i,
  planning: /\bplanning\b/i,
};
/** The sprint whose event of this kind is in play on date d when the text names no date. */
function inPlay(kind, d) {
  const within = SPRINTS.find((s) => KIND_DATES[kind](s).includes(d));
  if (within) return within;
  return SPRINTS.find((s) => KIND_DATES[kind](s)[0] >= d);
}

const WD_LONG = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };
/** Dates a text names, relative to its reference date: 'Tue 13 Oct', today/tonight, tomorrow, a bare 'Monday'/'Mon'. */
function datesIn(text, ref) {
  const out = new Set();
  for (const [, , dd, mon] of text.matchAll(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g)) {
    const y = Number(ref.slice(0, 4));
    const cands = [y - 1, y, y + 1].map((yy) => `${yy}-${String(MONTHS.indexOf(mon) + 1).padStart(2, '0')}-${dd.padStart(2, '0')}`);
    const dist = (k) => Math.abs(Date.parse(k) - Date.parse(ref));
    out.add(cands.sort((a, b) => dist(a) - dist(b))[0]);
  }
  if (/\b(today|tonight)\b/i.test(text)) out.add(ref);
  if (/\btomorrow\b/i.test(text)) out.add(plus(ref, 1));
  for (const [, w] of text.matchAll(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Mon|Tue|Wed|Thu|Fri)\b(?! \d{1,2} [A-Z])/g)) {
    const short = WD_LONG[w] || w;
    let d = plus(ref, 1);
    while (dow(d) !== short) d = plus(d, 1);
    out.add(d);
  }
  return out;
}
const hasLabel = (text, label) => new RegExp(`(?<![\\d-])${label}(?!\\d)`).test(text);

/** Sprint-label check for one text. Returns a message or null. */
function labelViolation(text, ref, cur) {
  const named = datesIn(text, ref);
  for (const [kind, re] of Object.entries(KINDS)) {
    if (!re.test(text)) continue;
    let refs = SPRINTS.filter((s) => KIND_DATES[kind](s).some((d) => named.has(d)));
    if (!refs.length) refs = [inPlay(kind, ref)].filter(Boolean);
    if (!refs.length) continue;
    if (refs.some((s) => s.label === cur.label || hasLabel(text, s.label))) continue;
    return `${kind} of ${refs.map((s) => s.label).join('/')} without its label`;
  }
  return null;
}

// Timed items on a working day: [id, time, pattern that would present it as still to come].
function timedOn(d) {
  const out = [];
  if (isWknd(d)) return out;
  if (dow(d) === 'Wed') out.push(['pre-refinement', '14:00', /Pre-Refinement(?: at)? 14:00|before Pre-Refinement/]);
  if (d === plus(current(d).start, 3)) out.push(['full-refinement', '14:00', /Refinement(?: at)? 14:00/]);
  if (SPRINTS.some((s) => s.end === d)) out.push(['release-check-before-demo', '12:00', /Release check(?: at)? 12:00/]);
  if (SPRINTS.some((s) => s.cutoff === d)) out.push(['fix-cutoff', '12:00', /[Cc]ut-off(?: at)? 12:00|by 12:00|before 12:00|misses 12:00/]);
  return out;
}

// Rules for one role only: their titles need a role prefix in the Everyone view. Unit events (meetings, deploys,
// the code freeze and the fix cut-off) concern everyone and are exempt.
const ROLE_ONLY = RULES.filter((r) => !(r.who || []).includes('All') && !['meeting', 'deploy'].includes(r.kind) && !['code-freeze', 'fix-cutoff'].includes(r.id));
const PREFIX = /(?:IM\/AM|IM \/ AM|Dev|QA|Lead|Analyst)(?:,? (?:and )?(?:IM\/AM|IM \/ AM|Dev|QA|Lead|Analyst))*:[^.:]*$/;
function prefixViolation(text) {
  for (const r of ROLE_ONLY) {
    for (const t of [r.title, r.title[0].toLowerCase() + r.title.slice(1)]) {
      const i = text.indexOf(t);
      if (i >= 0 && !PREFIX.test(text.slice(0, i))) return `"${r.title}" (${r.who.join(', ')}) without a role prefix`;
    }
  }
  return null;
}

// ---------------------------------------------------------------- what the page shows, as text
const BOARD_SUFFIX = / · Sprint Board$/;
const MONTH_IDX = (k) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${k}T12:00:00Z`).getUTCDay()]} ${Number(k.slice(8))} ${MONTHS[Number(k.slice(5, 7)) - 1]}`;

/** Next for you: { heading, date, items: [{ text }] }. Reads agenda.next; before the fix it rebuilds index.html's old builder. */
function nextView(m) {
  const a = m.agenda;
  if (!a || !a.groups.length) return null;
  if (a.next !== undefined) {
    if (!a.next) return null;
    return { heading: a.next.heading, date: a.next.date, items: a.next.items.map((x) => [x.time, `${x.prefix || ''}${x.title}`, x.suffix].filter(Boolean).join(' ')) };
  }
  const nf = a.nextFor; // pre-fix page (index.html): heading and "time title" rows
  if (!nf) return null;
  const heading = nf.date === plus(a.day, 1) ? `Tomorrow, ${MONTH_IDX(nf.date)}` : `Next for you · ${MONTH_IDX(nf.date)}`;
  return { heading, date: nf.date, items: nf.items.map((x) => [x.time, x.title].filter(Boolean).join(' ')) };
}
/** Coming up rows: { date, text } per item, as rendered (time, title, then sprint label / "if needed"). */
function comingRows(m) {
  return m.comingUp.flatMap((d) => d.items.map((x) => ({
    date: d.date,
    text: [d.label, x.time, `${x.prefix || ''}${x.title}`, x.suffix !== undefined ? x.suffix : x.ifNeeded ? 'if needed' : x.label].filter(Boolean).join(' '),
  })));
}
/** Folded "Today" summary. Reads agenda.summary; before the fix it rebuilds index.html's todaySummary. */
function summaryOf(m, time) {
  const a = m.agenda;
  if (!a) return '';
  if (a.summary !== undefined) return a.summary;
  const items = a.groups.flatMap((g) => g.items);
  if (!items.length) return '';
  const clock = (t) => /^\d\d:\d\d$/.test(t || '');
  const next = items.find((it) => clock(it.when) && (a.weekend || it.when >= time)) || items[0];
  return `${items.length} items · next ${clock(next.when) ? `${next.when} ` : ''}${next.title}`;
}
function nextBox(m) {
  return m.next ? [m.next.kicker, m.next.big, m.next.what, m.next.extra].filter(Boolean).join(' · ') : null;
}
/** Texts read against the viewing date: [where, text]. */
function bandTexts(m, time) {
  return [
    ['headline', m.headline], ['sub', m.sub], ['tab', m.tab.replace(BOARD_SUFFIX, '')], ['meta', m.meta],
    ['next', nextBox(m)], ...dutyTexts(m.duty).map((t) => ['duty', t]), ['summary', summaryOf(m, time)],
  ].filter(([, t]) => t);
}

// ---------------------------------------------------------------- the sweep
const ROLES = ['Everyone', 'IM/AM', 'Dev', 'QA', 'Lead', 'Analyst'];
const TIMES = ['09:00', '12:30', '17:30', '20:30'];

/**
 * The invariants for every day from..to (inclusive) x TIMES x ROLES. Called by invariants-1..4.test.js, which split
 * 28 Sep 2026 - 25 Jan 2027 in four so vitest runs them in parallel.
 */
export function invariantSuite(from, to) {
const CASES = [...days(from, to)].flatMap((date) => TIMES.flatMap((time) => ROLES.map((role) => ({ date, time, role }))));
let MODELS;
beforeAll(() => {
  MODELS = CASES.map((c) => ({ ...c, m: resolveDay({ ...c, rules: RULES, duty: DUTY, holidays: HOLIDAYS }) }));
}, 120000);

/** Run one invariant over the sweep; collects violations as "date time role: where: message | text". */
function sweep(check) {
  const out = [];
  for (const c of MODELS) for (const v of check(c) || []) out.push(`${c.date} ${c.time} ${c.role}: ${v}`);
  return out;
}
const show = (v) => (v.length ? `${v.length} violations, first:\n${v.slice(0, 40).join('\n')}` : '');

describe(`copy invariants, ${from} - ${to} x 4 times x 6 roles`, () => {
  it('the hand calendar agrees with the process (sanity)', () => {
    const s20 = SPRINTS.find((s) => s.label === '2026-20');
    expect([s20.demo, s20.uat, s20.cutoff]).toEqual(['2026-09-29', '2026-09-30', '2026-10-05']);
    expect(current('2026-10-02').label).toBe('2026-21');
    expect(current('2027-01-01').label).toBe('2027-1');
    expect(current('2027-01-04').label).toBe('2027-2');
    expect(SPRINTS.find((s) => s.label === '2027-1').demo).toBe('2027-01-05');
    expect(SPRINTS.find((s) => s.label === '2027-2').planning).toBe('2026-12-31');
    expect(workingDaysEE('2026-12-15', '2027-01-05')).toBe(12);
  });

  it('text about another sprint\'s Demo, UAT, cut-off, Live, freeze, regression or planning names that sprint', () => {
    const v = sweep(({ date, time, m }) => {
      const cur = current(date);
      const texts = [
        ...bandTexts(m, time).filter(([w]) => w !== 'summary').map(([w, t]) => [w, t, date]),
        ...m.rail.map((r) => ['rail', `${r.label} · ${r.phaseLabel}`, date]),
        ...comingRows(m).map((r) => ['coming up', r.text, r.date]),
      ];
      const nv = nextView(m);
      if (nv) texts.push(...nv.items.map((t) => ['next for you', `${nv.heading} ${t}`, nv.date]));
      return texts.map(([w, t, ref]) => { const x = labelViolation(t, ref, cur); return x && `${w}: ${x} | ${t}`; }).filter(Boolean);
    });
    expect(v.length, show(v)).toBe(0);
  });

  it('"tomorrow" only for the next calendar day, and only for something on that day', () => {
    const v = sweep(({ date, time, m }) => {
      const out = [];
      const t1 = plus(date, 1);
      const texts = bandTexts(m, time);
      const nv = nextView(m);
      if (nv) texts.push(['next for you', nv.heading]);
      for (const [w, t] of texts) {
        if (!/\btomorrow\b/i.test(t)) continue;
        if (isWknd(t1)) out.push(`${w}: tomorrow is ${dow(t1)} | ${t}`);
        const after = /Tomorrow, (\w{3} \d{1,2} \w{3})/.exec(t);
        if (after && !datesIn(after[1], date).has(t1)) out.push(`${w}: "Tomorrow" is not ${t1} | ${t}`);
        if (/Demo (?:update )?tomorrow/.test(t) && !DEMO_DAYS.has(t1)) out.push(`${w}: no Demo update tomorrow | ${t}`);
        if (/planning tomorrow/i.test(t) && !SPRINTS.some((s) => s.planning === t1)) out.push(`${w}: no planning tomorrow | ${t}`);
        if (/freeze starts tomorrow|freeze tomorrow/i.test(t) && !SPRINTS.some((s) => s.freeze === t1)) out.push(`${w}: no freeze start tomorrow | ${t}`);
      }
      return out;
    });
    expect(v.length, show(v)).toBe(0);
  });

  it('"tonight" only for today\'s deploy', () => {
    const v = sweep(({ date, time, m }) => {
      const out = [];
      for (const [w, t] of bandTexts(m, time)) {
        if (!/\btonight\b/i.test(t)) continue;
        if (!DEPLOY_DAYS.has(date)) out.push(`${w}: no deploy today | ${t}`);
        if (/Demo (?:update )?tonight/.test(t) && !DEMO_DAYS.has(date)) out.push(`${w}: no Demo update today | ${t}`);
        if (/Live (?:update )?tonight|goes Live tonight/.test(t) && !LIVE_DAYS.has(date)) out.push(`${w}: no Live update today | ${t}`);
      }
      for (const r of comingRows(m)) if (/\bTonight\b/.test(r.text)) out.push(`coming up ${r.date}: "Tonight" on another day | ${r.text}`);
      const nv = nextView(m);
      if (nv) for (const t of nv.items) if (/\btonight\b/i.test(t) && !DEPLOY_DAYS.has(nv.date)) out.push(`next for you ${nv.date}: no deploy that day | ${t}`);
      if (m.agenda && m.agenda.day !== date) {
        for (const g of m.agenda.groups) {
          if (/Tonight/.test(g.heading)) out.push(`your day (${m.agenda.day}): heading "${g.heading}" seen on ${date}`);
          for (const it of g.items) if (/Tonight/.test(it.when || '')) out.push(`your day (${m.agenda.day}): "${it.when} ${it.title}" seen on ${date}`);
        }
      }
      return out;
    });
    expect(v.length, show(v)).toBe(0);
  });

  it('the Everyone view never shows a role-only task without its role', () => {
    const v = sweep(({ role, time, m }) => {
      if (role !== 'Everyone') return [];
      const texts = [...bandTexts(m, time).filter(([w]) => ['headline', 'sub', 'tab'].includes(w)), ...comingRows(m).map((r) => ['coming up', r.text])];
      const nv = nextView(m);
      if (nv) texts.push(...nv.items.map((t) => ['next', t]));
      return texts.map(([w, t]) => { const x = prefixViolation(t); return x && `${w}: ${x} | ${t}`; }).filter(Boolean);
    });
    expect(v.length, show(v)).toBe(0);
  });

  it('a timed item is not shown as still to come after its time', () => {
    const v = sweep(({ date, time, m }) => {
      const out = [];
      for (const [id, at, re] of timedOn(date)) {
        if (time <= at) continue;
        for (const [w, t] of bandTexts(m, time)) if (['headline', 'sub', 'tab', 'summary'].includes(w) && re.test(t)) out.push(`${w}: ${id} ${at} still upcoming | ${t}`);
        for (const g of (m.agenda && m.agenda.day === date ? m.agenda.groups : [])) {
          for (const it of g.items) if (it.id === id && g.slot !== 'earlier') out.push(`your day: ${id} ${at} under "${g.heading}"`);
        }
      }
      const sum = /next (\d\d:\d\d) /.exec(summaryOf(m, time));
      if (sum && !isWknd(date) && sum[1] < time) out.push(`summary: "next ${sum[1]}" at ${time}`);
      return out;
    });
    expect(v.length, show(v)).toBe(0);
  });

  it('the headline never says "No deadlines today" above a line that says something is due today', () => {
    const v = sweep(({ m }) => (m.headline === 'No deadlines today' && /due today/i.test(m.sub || '') ? [`${m.headline} | ${m.sub}`] : []));
    expect(v.length, show(v)).toBe(0);
  });

  it('"in N working days" skips weekends and EE public holidays', () => {
    const v = sweep(({ date, m }) => {
      const t = nextBox(m);
      const n = t && /in (\d+) working days/.exec(t);
      if (!n) return [];
      const target = [...datesIn(m.next.big, date)][0];
      const want = workingDaysEE(date, target);
      return Number(n[1]) === want ? [] : [`next: says ${n[1]}, EE working days to ${target} = ${want} | ${t}`];
    });
    expect(v.length, show(v)).toBe(0);
  });
});
}
