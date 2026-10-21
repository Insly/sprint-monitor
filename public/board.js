// MGA Sprint Board: state resolver (STATES.md is normative).
// Pure ES module: no DOM, no clock reads. Every value on the page is a function of
//   (date, Tallinn time, role, rules, duty rota, holidays)
// and is computed here. index.html only renders the model this module returns.

import {
  context, actionsFor, upcoming, sprintDates, nextWorkingDay, previousWorkingDay, addDays,
  daysBetween, isWeekendDay, weekdayOf, workingDaysBetween, workingDaysIn, roleMatches, keyTimes,
  sprintPhase, fmtDay, fmtDM, formatAcrossZones, holidayTouchesKeyDates, sprintForDate, holidayWarnings, ruleTime,
  LAST_CONFIRMED, UNCONFIRMED_FROM, numberingGap, toKey,
} from './schedule.js';

export const BOARD = 'Sprint Board';
const WEEKDAY_LONG = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

/** Roles that see the `evening` band on a Live Monday, and the `urgent`/`evening` band on Demo Tuesday. */
const LIVE_EVENING_ROLES = ['Everyone', 'IM/AM', 'Dev'];
const DEMO_ROLES = ['Dev', 'QA'];
/** Windows up to this many calendar days long are promoted on their first and last day (STATES.md §5). */
export const SHORT_WINDOW_DAYS = 7;
/** Unit milestones that Coming up always shows, whatever the role (DESIGN.md §5). */
export const UNIT_IDS = ['demo-update', 'live-update', 'code-freeze', 'sprint-planning'];

/** Short words for tab titles and "Also:" lists. */
const SHORT = {
  'full-refinement': 'Refinement',
  'priority-call-due': 'priority calls',
  'qa-estimate-present': 'QA estimates',
  'uat-findings-to-planning': 'UAT findings for planning',
  'bug-retro-prep': 'Bug retro page',
  'cutoff-reminder': 'Chase UAT results',
  'release-check-before-demo': 'Release check 12:00',
};

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const roleWord = (role) => (role === 'IM/AM' ? 'IM / AM' : role);
const endSentence = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);
/** The label of sprint s when it is not the sprint being built on f.date (copy names other sprints), else ''. */
const otherLabel = (f, s) => (s && s.n !== f.ctx.current.n ? s.label : '');
/** Words that name a release or planning event: an item title with one of them gets its sprint label. */
const EVENT_WORDS = /\b(Demo update|UAT|cut-off|Live update|freeze|regression|planning)\b/i;
/** ' (2026-20)' after an item that names an event of another sprint than the one being built, else ''. */
const sprintSuffix = (f, a, text = a.title) => (a.sprintNumber != null && a.sprintNumber !== f.ctx.current.n && EVENT_WORDS.test(text) ? ` (${sprintDates(a.sprintNumber).label})` : '');
/** 'IM/AM' / 'Dev, QA': the roles of a role-only item, as the Everyone view prefixes them. */
export const whoText = (a) => (a.who || []).filter((w) => w !== 'All').join(', ');
/** Unit events (meetings, deploys, the code freeze, the fix cut-off) and "All" habits concern everyone: no role prefix. */
const isUnitEvent = (a) => ['meeting', 'deploy'].includes(a.kind) || ['code-freeze', 'fix-cutoff'].includes(a.id) || (a.who || []).includes('All');
/** 'IM/AM: ' before a role-only item in the Everyone view (review 1.5), else ''. */
export const rolePrefix = (a, role) => (role === 'Everyone' && !isUnitEvent(a) && whoText(a) ? `${whoText(a)}: ` : '');
/** What follows an item in a list of another day: its sprint label, after "if needed" for after-cut-off items. */
export const itemSuffix = (a) => {
  const L = a.sprintNumber != null ? sprintDates(a.sprintNumber).label : null;
  if (a.slot === 'after-cutoff') return L ? `if needed · ${L}` : 'if needed';
  return L;
};
/**
 * An item's title in lists of other days. "UAT findings" are the last closed UAT's: the sprint two before the one
 * being planned (2026-21 findings go to 2026-23 planning).
 */
export const listTitle = (a, t = a.title) => (a.id === 'uat-findings-to-planning' && a.sprintNumber != null
  ? t.replace('UAT findings', `${sprintDates(a.sprintNumber - 2).label} UAT findings`) : t);
/** Weekdays in (a, b] that are not EE public holidays (decision 2026-10-02: the board runs on Tallinn time). */
export function workingDaysEE(a, b, holidays = []) {
  const ee = new Set((holidays || []).filter((h) => h && h.country === 'EE').map((h) => h.date));
  let n = 0;
  for (let d = addDays(a, 1); d <= b; d = addDays(d, 1)) if (!isWeekendDay(d) && !ee.has(d)) n += 1;
  return n;
}

// ---------------------------------------------------------------- facts about one day

/** Sprints that can have a key date near `date`: the one before previous, previous, current, next. */
function sprintsNear(ctx) {
  return [sprintDates(ctx.previous.n - 1), ctx.previous, ctx.current, ctx.next];
}

/** Everything the resolvers need about a date. */
export function dayFacts(date, rules) {
  const ctx = context(date);
  const d = ctx.date;
  const near = sprintsNear(ctx);
  const times = keyTimes(rules);
  const nwd = nextWorkingDay(addDays(d, 1));
  return {
    date: d,
    ctx,
    times,
    rules,
    acts: actionsFor(d, rules),
    cut: near.find((s) => s.cutoff === d) || null,
    demo: near.find((s) => s.demoStart === d) || null,
    live: near.find((s) => s.live === d) || null,
    uatOpens: near.find((s) => s.uatStart === d && s.uatStart < s.cutoff) || null,
    freezeStarts: near.find((s) => s.freezeStart === d) || null,
    planning: near.find((s) => s.planning === d) || null,
    nwd,
    nwdIsTomorrow: nwd === addDays(d, 1),
    nearNext: [ctx.previous, ctx.current, ctx.next, sprintDates(ctx.next.n + 1)],
  };
}

// ---------------------------------------------------------------- headline parts

/** STATES.md §3.2: the next working day's key or minor event. */
export function headsUp(f) {
  const d = f.nwd;
  const near = sprintsNear(context(d));
  const when = f.nwdIsTomorrow ? 'tomorrow' : WEEKDAY_LONG[weekdayOf(d)];
  const demo = near.find((s) => s.demoStart === d);
  if (demo) return { key: true, kind: 'demo', sprint: demo, when, text: `${demo.label} Demo update ${when}`, short: `${demo.label} Demo ${f.nwdIsTomorrow ? 'tomorrow' : weekdayOf(d)}` };
  const cut = near.find((s) => s.cutoff === d);
  if (cut) return { key: true, kind: 'cutoff', sprint: cut, when, text: `Last working day before the ${cut.label} cut-off`, short: `${cut.label} cut-off ${weekdayOf(d)} ${f.times.cutoff}` };
  const plan = near.find((s) => s.planning === d);
  if (plan) return { key: false, kind: 'planning', sprint: plan, when, text: `${plan.label} sprint planning ${when}`, short: `${plan.label} planning ${when}` };
  const frz = near.find((s) => s.freezeStart === d);
  if (frz) {
    const L = otherLabel(f, frz);
    return { key: false, kind: 'freeze', sprint: frz, when, text: L ? `${L} code freeze starts ${when}` : `Code freeze starts ${when}`, short: `${L ? `${L} code` : 'Code'} freeze ${when}` };
  }
  return null;
}

/** STATES.md §3.3: Everyone plus every role in `who` of the key sprint's single-day rules on the key day or its eve. */
export function headsUpActors(f, h) {
  const roles = new Set(['Everyone']);
  for (const day of [f.date, f.nwd]) {
    for (const a of actionsFor(day, f.rules)) {
      if (a.status !== 'today' || a.sprintNumber !== h.sprint.n) continue;
      for (const w of a.who || []) if (w !== 'All') roles.add(w);
    }
  }
  return [...roles];
}

/** The carry-over items for `role` today: carryOver rules that fired on the previous working day(s). */
export function carryOverItems(date, rules, role) {
  const out = [];
  let prev = date;
  const maxBack = Math.max(0, ...rules.map((r) => r.carryOver || 0));
  for (let i = 1; i <= maxBack; i++) {
    prev = previousWorkingDay(prev);
    for (const a of actionsFor(prev, rules)) {
      if (a.status === 'today' && (a.carryOver || 0) >= i && roleMatches(a, role)) out.push({ ...a, from: prev });
    }
  }
  return out;
}

/** STATES.md §3.1: today's event for a role, first match wins. A meeting counts only until its time. */
export function todayEvent(f, role, time = '00:00') {
  const s = f.freezeStarts;
  if (s && f.acts.some((a) => a.id === 'code-freeze' && a.dates.from === f.date)) return { kind: 'freeze', text: 'Code freeze starts today', short: 'Code freeze starts' };
  const plan = f.acts.find((a) => a.id === 'sprint-planning');
  if (plan) { const L = sprintDates(plan.sprintNumber).label; return { kind: 'planning', text: `${L} sprint planning today`, short: `${L} planning today` }; }
  if (f.uatOpens) return { kind: 'uat', text: `${f.uatOpens.label} UAT opens: deadline ${fmtDay(f.uatOpens.cutoff)} ${f.times.cutoff}`, short: `${f.uatOpens.label} UAT opens` };
  const start = f.acts.find((a) => a.id === 'sprint-start');
  if (start) return { kind: 'start', text: `${sprintDates(start.sprintNumber).label} starts today`, short: `${sprintDates(start.sprintNumber).label} starts` };

  const carry = carryOverItems(f.date, f.rules, role);
  if (carry.length) {
    const c = carry[0];
    const label = sprintDates(c.sprintNumber).label;
    const prevLive = sprintDates(c.sprintNumber).live === c.from;
    if (role === 'Everyone') {
      return prevLive
        ? { kind: 'carry', text: `Morning after the ${label} Live update`, short: `Morning after ${label} Live`, carry }
        : { kind: 'carry', text: `Morning after the ${label} Demo update`, short: `Morning after ${label} Demo`, carry };
    }
    const byId = (id) => carry.find((a) => a.id === id);
    if (byId('confirm-live-to-client')) return { kind: 'carry', text: `Confirm the ${label} Live update to clients`, short: `Confirm ${label} Live to clients`, carry };
    if (byId('golive-page')) return { kind: 'carry', text: `Create the Golive Release ${label} page`, short: 'Golive page', carry };
    if (byId('release-page')) return { kind: 'carry', text: `Create the Release ${label} page`, short: 'Release page', carry };
    return { kind: 'carry', text: c.title, short: c.title, carry };
  }

  const meeting = f.acts.find((a) => a.kind === 'meeting' && a.time && a.time > time && a.status === 'today' && roleMatches(a, role));
  if (meeting) return { kind: 'meeting', text: `${meeting.title} at ${meeting.time}`, short: `${SHORT[meeting.id] || meeting.title} ${meeting.time}`, item: meeting };
  return null;
}

// ---------------------------------------------------------------- band, headline, tab

/** Phase on a cut-off day: before / after / evening (STATES.md §1). */
export function cutoffPhase(f, time) {
  if (time < f.times.cutoff) return 'before';
  if (time < f.times.live) return 'after';
  return 'evening';
}

/** STATES.md §3: the band state. */
export function bandState(f, time, role) {
  if (isWeekendDay(f.date)) return 'weekend';
  if (f.cut) {
    const p = cutoffPhase(f, time);
    if (p === 'before') return 'urgent';
    if (p === 'after') return 'after';
    return LIVE_EVENING_ROLES.includes(role) ? 'evening' : 'event';
  }
  if (f.demo) {
    if (DEMO_ROLES.includes(role)) return time < f.times.demo ? 'urgent' : 'evening';
    return 'event';
  }
  const e = todayEvent(f, role, time);
  const h = headsUp(f);
  if (h && h.key && headsUpActors(f, h).includes(role)) return 'heads-up';
  if (e || h) return 'event';
  return 'quiet';
}

function weekendHeadline(f) {
  const mon = f.nwd;
  const near = sprintsNear(context(mon));
  const cut = near.find((s) => s.cutoff === mon);
  if (cut) return `Weekend. ${fmtDay(mon)}: ${cut.label} fix cut-off ${f.times.cutoff} and Live update.`;
  const start = near.find((s) => s.start === mon);
  if (start) return `Weekend. ${start.label} starts ${WEEKDAY_LONG[weekdayOf(mon)]}.`;
  return 'Weekend';
}

/** The h1 text. */
export function headline(f, time, role) {
  if (isWeekendDay(f.date)) return weekendHeadline(f);
  if (f.cut) {
    const p = cutoffPhase(f, time);
    const L = f.cut.label;
    if (p === 'before') return `${L} fix cut-off at ${f.times.cutoff}`;
    if (p === 'after') return `${L} cut-off passed. Live update tonight.`;
    return `${L} Live update tonight`;
  }
  if (f.demo) return `${f.demo.label} Demo update tonight`;
  const parts = [todayEvent(f, role, time)?.text, headsUp(f)?.text].filter(Boolean);
  // "No deadlines today" only when nothing is due for the role; otherwise the sub-line names it (review 1.11).
  if (parts.length === 0) return f.acts.some((a) => a.status === 'today' && a.kind === 'deadline' && roleMatches(a, role) && !(a.who || []).includes('All')) ? 'Nothing key today' : 'No deadlines today';
  if (parts.length === 1) return parts[0];
  return `${parts.join('. ')}.`;
}

/** STATES.md §4: the tab title. */
export function tabTitle(f, time, role, { preview = false } = {}) {
  const pre = preview ? `Preview ${fmtDay(f.date)} · ` : '';
  const T = f.times;
  let core;
  if (isWeekendDay(f.date)) {
    const mon = f.nwd;
    const cut = sprintsNear(context(mon)).find((s) => s.cutoff === mon);
    core = cut ? `Weekend · ${cut.label} cut-off ${weekdayOf(mon)} ${T.cutoff}` : 'Weekend';
  } else if (f.cut) {
    const p = cutoffPhase(f, time);
    const L = f.cut.label;
    core = p === 'before' ? `${L} cut-off ${T.cutoff} · Live tonight` : p === 'after' ? `${L} cut-off passed · Live tonight` : `${L} Live update tonight`;
  } else if (f.demo) {
    core = `${f.demo.label} Demo update tonight`;
  } else {
    const h = headsUp(f);
    if (h && h.kind === 'cutoff') core = h.short;
    else {
      const e = todayEvent(f, role, time);
      const short = h && h.key ? h.short : e ? e.short : h ? h.short : null;
      const day = `${f.ctx.current.label} day ${f.ctx.dayOfSprint}`;
      core = short ? `${short} · ${day}` : day;
    }
  }
  return `${pre}${core} · ${BOARD}`;
}

/** Countdown to the cut-off, cut-off morning only: '3 h left', '2 h 50 min left', '1 min left'. */
export function countdown(f, time) {
  if (!f.cut || isWeekendDay(f.date) || cutoffPhase(f, time) !== 'before') return null;
  const left = toMin(f.times.cutoff) - toMin(time);
  const h = Math.floor(left / 60);
  const m = left % 60;
  const parts = [h ? `${h} h` : null, m ? `${m} min` : null].filter(Boolean);
  return { minutes: left, text: `${parts.join(' ')} left`, until: f.times.cutoff };
}

// ---------------------------------------------------------------- sub-line

function nextForSentence(f, role) {
  const n = nextFor(f.date, f.rules, role);
  if (!n) return `Nothing due for ${roleWord(role)} today.`;
  // One item for the sentence: the timed one, else the weekly rhythm (rank the queue before the session), else the first.
  const a = n.items.find((x) => x.time) || n.items.find((x) => 'weekly' in (x.when || {})) || n.items[0];
  const what = `${listTitle(a)}${sprintSuffix(f, a)}`;
  const lead = role === 'Everyone' ? `Next, for ${whoText(a)}:` : `Next for ${roleWord(role)}:`;
  return a.time ? `${lead} ${what} ${fmtDay(n.date)} ${a.time}.` : `${lead} ${what}, ${fmtDay(n.date)}.`;
}

const RULE_ORDER = (rules) => new Map(rules.map((r, i) => [r.id, i]));

/** The band's role-aware second line (STATES.md §8). */
export function subLine(f, time, role, band) {
  if (band === 'weekend' || band === 'error') return null;
  const T = f.times;
  const R = role;
  const nothing = `Nothing due for ${roleWord(R)} today.`;

  if (f.cut) {
    const L = f.cut.label;
    const p = cutoffPhase(f, time);
    if (p === 'before') {
      if (R === 'IM/AM') return `Raise blocking bugs with the developers now. Anything not fixed by ${T.cutoff} is reverted.`;
      if (R === 'Dev') return `Blocking fixes in by ${T.cutoff}. ${L} goes Live tonight.`;
      if (R === 'Everyone') return `A bugfix that misses ${T.cutoff} means a revert, not a fix.`;
      return `${nothing} ${L} goes Live tonight.`;
    }
    if (p === 'after') {
      if (R === 'IM/AM') return 'Agree reverts with the developers and tell affected clients.';
      if (R === 'Dev') return `If anything missed the ${L} cut-off, revert it before Live. The IM/AM decide which.`;
      if (R === 'Everyone') return `Fixes after ${T.cutoff} are reverts, not fixes.`;
      return nothing;
    }
    if (R === 'IM/AM') return 'Confirm to clients once the developers confirm it, tonight or tomorrow morning.';
    if (R === 'Dev') return `After the update: create the Golive Release ${L} page.`;
    if (R === 'Everyone') return 'Scheduled for this evening. The board cannot see when it finishes.';
    return nothing;
  }

  if (f.demo) {
    const L = f.demo.label;
    const evening = time >= T.demo;
    if (R === 'Dev') return evening ? `After the update: create the Release ${L} page, tonight or tomorrow morning.` : `${L} code freeze holds until the update. Afterwards: Release ${L} page.`;
    if (R === 'QA') return evening ? `${L} regression closes with the update.` : 'Before the update: all tasks tested and Ready for Demo.';
    if (R === 'IM/AM') return `Don't tell clients yet. Tomorrow: tell them, ${L} UAT deadline ${fmtDay(f.demo.cutoff)} ${T.cutoff}.`;
    if (R === 'Everyone') return 'QA: Ready for Demo before the update. IM/AM: tell clients tomorrow.';
    // Lead / Analyst: name their own item if they have one today (e.g. the Tuesday refinement prep).
    const own = f.acts.find((a) => a.status === 'today' && roleMatches(a, R) && !(a.who || []).includes('All'));
    return own ? `Due today: ${own.title}.` : nothing;
  }

  const h = headsUp(f);
  const e = todayEvent(f, R, time);
  const retro = f.acts.find((a) => a.id === 'bug-retro');
  const retroLine = retro ? `Bug retro for ${sprintDates(retro.sprintNumber).label} today.` : null;

  if (h && h.kind === 'demo') {
    const L = h.sprint.label;
    if (R === 'Dev') return `${L} code freeze holds until the Demo update ${h.when} evening.`;
    if (R === 'QA') return `${L} regression runs until the Demo update ${h.when} evening.`;
    if (R === 'Everyone') return [retroLine, 'IM/AM: Demo/Live matrix due.'].filter(Boolean).join(' ');
    if ((R === 'Lead' || R === 'Analyst') && retroLine) return retroLine;
  }
  if (h && h.kind === 'cutoff') {
    const L = h.sprint.label;
    const by = `${fmtDay(h.sprint.cutoff)} ${T.cutoff}`;
    const matrix = f.acts.find((a) => a.id === 'matrix-before-live');
    if (R === 'IM/AM') return matrix ? `Due today: ${matrix.title}. Chase ${L} UAT results.` : `Chase ${L} UAT results.`;
    if (R === 'Dev') return `Blocking ${L} UAT fixes must be in by ${by}.`;
    if (R === 'Everyone') return `IM/AM: Demo/Live matrix for Live, chase ${L} UAT results. Dev: blocking fixes in by ${by}.`;
    // Every other role still sees when the cut-off is (review 1.12), after their own items if they have any.
    const own = f.acts.filter((a) => a.status === 'today' && roleMatches(a, R) && !(a.who || []).includes('All'));
    return `${own.length ? own.map((a) => endSentence(listTitle(a))).join(' ') : nothing} ${L} fix cut-off ${by}.`;
  }
  if (f.uatOpens) {
    const L = f.uatOpens.label;
    if (R === 'IM/AM') return `Once the developers confirm the ${L} Demo update, tell clients what is on Demo.`;
    if (R === 'Everyone') return `IM/AM: tell clients what is on Demo. ${L} UAT deadline ${fmtDay(f.uatOpens.cutoff)} ${T.cutoff}.`;
  }
  if (f.freezeStarts) {
    const u = `until the Demo update ${fmtDay(f.freezeStarts.demoStart)} (evening)`;
    if (R === 'QA') return `Regression runs from today ${u}.`;
    if (R === 'Dev') return `Only QA-approved bug fixes go to Beta ${u}.`;
    if (R === 'IM/AM') return `Config changes on Beta need QA approval ${u}.`;
    if (R === 'Everyone') return `Code freeze ${u}. Beta reopens ${fmtDay(f.freezeStarts.uatStart)}.`;
  }
  const planning = f.acts.find((a) => a.id === 'sprint-planning');
  if (planning && (R === 'Everyone' || roleMatches(planning, R))) {
    const out = ['Plan 2/3 of capacity, keep 1/3 as buffer.'];
    if (R !== 'Everyone') {
      for (const a of actionsFor(f.nwd, f.rules)) {
        if (a.status === 'today' && a.kind === 'deadline' && roleMatches(a, R) && !(a.who || []).includes('All')) out.push(`${SHORT[a.id] || a.title} due ${f.nwdIsTomorrow ? 'tomorrow' : fmtDay(f.nwd)}.`);
      }
    }
    return out.join(' ');
  }
  if (e && e.kind === 'carry' && f.live === null) {
    const c = e.carry[0];
    const L = sprintDates(c.sprintNumber).label;
    const afterLive = sprintDates(c.sprintNumber).live === c.from;
    if (afterLive && R === 'IM/AM') return `Last night's ${L} Live update was scheduled. Confirm once the developers have.`;
    if (afterLive && R === 'Everyone') return `Last night's ${L} Live update was scheduled. IM/AM confirm to clients once the developers have.`;
    if (R === 'Dev') return 'If it was not done last night.';
  }

  // Generic composition.
  const order = RULE_ORDER(f.rules);
  const headlineItem = e && e.kind === 'meeting' ? e.item.id : null;
  const headlineHasMeeting = (id) => headlineItem === id;
  const mine = f.acts
    .filter((a) => a.status === 'today' && roleMatches(a, R) && !(a.who || []).includes('All'))
    .filter((a) => !headlineHasMeeting(a.id))
    .filter((a) => !(a.time && a.kind !== 'deploy' && a.time <= time)); // passed meetings and timed deadlines (review 1.7)
  const sentences = [];
  if (R === 'Everyone') {
    // Every task here belongs to some roles only: name them (review 1.5). One sentence per role group, at most three.
    const rank = (a) => (a.kind === 'meeting' ? 0 : a.kind === 'deadline' ? 1 : 2);
    const list = mine.map((a, i) => [a, i]).sort((x, y) => rank(x[0]) - rank(y[0]) || (order.get(x[0].id) ?? 0) - (order.get(y[0].id) ?? 0) || x[1] - y[1]).map(([a]) => a);
    const groups = new Map();
    for (const a of list) { const w = whoText(a); if (!groups.has(w)) groups.set(w, []); groups.get(w).push(a); }
    for (const [w, g] of [...groups].slice(0, 3)) {
      const a = g[0];
      sentences.push(`${w}: ${listTitle(a)}${a.time ? ` at ${a.time}` : ''}${sprintSuffix(f, a)}${g.length > 1 ? ` and ${g.length - 1} more` : ''}.`);
    }
    if (groups.size > 3) sentences.push(`And more for ${[...groups.keys()].slice(3).join('; ')}.`);
    if (sentences.length) return sentences.join(' ');
  }
  for (const a of mine.filter((x) => x.kind === 'meeting' && x.time)) sentences.push(`${a.title} at ${a.time}.`);
  if (e && e.kind !== 'carry') {
    for (const c of carryOverItems(f.date, f.rules, R)) {
      if (c.id === 'release-page') sentences.push(`From last night: Release ${sprintDates(c.sprintNumber).label} page.`);
    }
  }
  const handled = new Set(mine.filter((x) => x.kind === 'meeting' && x.time).map((x) => x.id));
  const rank = mine.find((a) => a.id === 'rank-refinement-queue');
  const findings = mine.find((a) => a.id === 'uat-findings-to-planning');
  if (rank && R === 'Lead') {
    const pre = ruleTime(f.rules, 'pre-refinement', '14:00');
    const before = time < pre;
    if (findings) {
      sentences.push(before ? `Rank the refinement queue before ${pre}.` : 'Rank the refinement queue.', `Bring ${f.ctx.previous.label} UAT findings to ${f.ctx.next.label} planning.`);
      handled.add(findings.id);
    } else sentences.push(before ? `Rank the refinement queue before Pre-Refinement at ${pre}.` : 'Rank the refinement queue.');
    handled.add(rank.id);
  }
  const parked = mine.find((a) => a.id === 'answer-parked-questions');
  if (parked && R === 'Analyst') {
    sentences.push('Answer parked refinement questions before tomorrow\'s Full Refinement.');
    handled.add(parked.id);
  }
  const left = mine.filter((a) => !handled.has(a.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const due = left.filter((a) => a.kind === 'deadline');
  const rest = left.filter((a) => a.kind !== 'deadline');
  if (due.length) {
    sentences.push(`Due today: ${listTitle(due[0])}${sprintSuffix(f, due[0])}.`);
    const also = [...due.slice(1), ...rest];
    const short = (a) => { const t = listTitle(a, SHORT[a.id] || a.title); return `${t}${sprintSuffix(f, a, t)}`; };
    if (also.length) sentences.push(`Also: ${also.map(short).join(', ')}.`);
  } else {
    for (const a of rest) sentences.push(`${listTitle(a).replace(/[.!?]$/, '')}${sprintSuffix(f, a)}.`);
  }
  if (sentences.length) return sentences.join(' ');

  const uat = [f.ctx.previous, f.ctx.current].find((s) => s.uatStart < f.date && f.date < s.cutoff);
  if (uat && (R === 'IM/AM' || R === 'Everyone')) return `${uat.label} is in UAT on Demo. Fix cut-off ${fmtDay(uat.cutoff)} ${T.cutoff}.`;
  if (band === 'quiet') return nextForSentence(f, R);
  return nothing;
}

// ---------------------------------------------------------------- next for you

/** The first upcoming working day with single-day items for the role (not windows, not "All" habits). */
export function nextFor(date, rules, role, horizon = 15) {
  const list = upcoming(date, rules, horizon).filter((a) => a.status === 'today' && roleMatches(a, role) && !(a.who || []).includes('All'));
  if (!list.length) return null;
  const first = list[0].date;
  // Within the day: the order of Your day and Coming up (review 1.10): morning, timed, the rest, the evening deploy, after it.
  const items = sortWithinDay(list.filter((a) => a.date === first));
  return { date: first, items };
}

/**
 * "Next for you" under Your day: { date, heading, items: [{ id, time, prefix, title, suffix }] } or null.
 * "Tomorrow" only when the day is the real date + 1 (review 1.4); "Next" in the Everyone view (review 1.14).
 */
export function nextView(date, day, rules, role) {
  const n = nextFor(day, rules, role);
  if (!n) return null;
  const heading = n.date === addDays(date, 1) ? `Tomorrow, ${fmtDay(n.date)}` : `${role === 'Everyone' ? 'Next' : 'Next for you'} · ${fmtDay(n.date)}`;
  return {
    date: n.date,
    heading,
    items: n.items.map((a) => ({ id: a.id, time: a.time ?? null, prefix: rolePrefix(a, role), title: listTitle(a), suffix: itemSuffix(a) })),
  };
}

// ---------------------------------------------------------------- rail

function sprintTagText(s, date, time, times) {
  const d = date;
  if (d < s.planning) return 'Refinement';
  if (d <= s.planning) return 'Sprint planning';
  if (d < s.start) return 'Planned';
  if (d < s.freezeStart) return isWeekendDay(d) ? 'Sprint' : sprintPhase(s, d, time, times).label.split(' · ')[0];
  if (d <= s.demoStart) return 'Code freeze';
  if (d < s.cutoff) return 'UAT on Demo';
  if (d === s.cutoff) return 'Live update tonight';
  return null;
}

/** "2026-20 · UAT on Demo" style tag for an item of sprint n (DESIGN.md §8.1). */
export function sprintTag(n, date, time = '09:00', times) {
  if (n == null) return null;
  const s = sprintDates(n);
  const text = sprintTagText(s, date, time, times);
  return { label: s.label, text, href: `#sprint-${s.label}` };
}

/** STATES.md §11 holiday notice for one sprint, or null. */
export function holidayNotice(s, holidays) {
  const list = (holidays || []).filter((h) => holidayTouchesKeyDates(s, h.date));
  if (!list.length) return null;
  const KEY_WORDS = [
    ['planning', 'sprint planning'], ['start', 'sprint starts'], ['freezeStart', 'code freeze starts'],
    ['bugRetro', 'bug retro'], ['demoStart', 'Demo update'], ['uatStart', 'UAT opens'], ['cutoff', 'cut-off and Live update'],
  ];
  const byDate = new Map();
  for (const h of list) {
    if (!byDate.has(h.date)) byDate.set(h.date, new Set());
    byDate.get(h.date).add(h.country);
  }
  const days = [...byDate.keys()].sort().map((date) => {
    const countries = [...byDate.get(date)].sort().join(', ');
    const key = KEY_WORDS.find(([k]) => s[k] === date);
    return { date, countries, key: key ? key[1] : null };
  });
  // Merge consecutive days with the same countries and no key date: "24–25 Dec (EE, PL)".
  const groups = [];
  for (const day of days) {
    const g = groups[groups.length - 1];
    if (g && !g.key && !day.key && g.countries === day.countries && addDays(g.to, 1) === day.date) g.to = day.date;
    else groups.push({ from: day.date, to: day.date, countries: day.countries, key: day.key });
  }
  const fmtGroup = (g) => {
    const range = g.from === g.to ? fmtDM(g.from)
      : g.from.slice(0, 7) === g.to.slice(0, 7) ? `${Number(g.from.slice(8))}–${fmtDM(g.to)}` : `${fmtDM(g.from)} – ${fmtDM(g.to)}`;
    return `${range} (${g.countries}${g.key ? `, ${g.key}` : ''})`;
  };
  return `Holidays during release: ${groups.map(fmtGroup).join(', ')}`;
}

/** The three sprints in play, with the STATES.md §6 label and phase. */
export function railRows(date, time, rules, holidays = []) {
  const f = dayFacts(date, rules);
  const T = f.times;
  const rows = [f.ctx.previous, f.ctx.current, f.ctx.next].map((s) => {
    const p = sprintPhase(s, f.date, time, T);
    return {
      n: s.n,
      label: s.label,
      href: `#sprint-${s.label}`,
      phase: p.phase,
      phaseLabel: p.label,
      projected: s.projected,
      unconfirmed: s.yearEndUnconfirmed,
      holidayNotice: holidayNotice(s, holidays),
      eventToday: [s.planning, s.freezeStart, s.demoStart, s.uatStart, s.cutoff].includes(f.date),
      inRelease: f.date >= s.freezeStart && f.date <= s.live,
    };
  });
  const hot = rows.find((r) => r.eventToday) || rows.find((r) => r.inRelease);
  for (const r of rows) r.hot = r === hot;
  return rows;
}

// ---------------------------------------------------------------- duty line

function releaseFor(duty, kind, date) {
  const list = Array.isArray(duty?.RELEASES) ? duty.RELEASES : [];
  return list.find((r) => (kind === 'Demo' ? r.demo : r.live) === date) || null;
}

/** The people on a deploy, from the rota: Demo = one dev; Live = lead and backup. null name = not assigned yet. */
export function deployPeople(duty, kind, date) {
  const r = releaseFor(duty, kind, date);
  if (kind === 'Demo') return [{ name: r?.demoBy ?? null, role: null }];
  return [{ name: r?.liveLead ?? null, role: 'lead' }, { name: r?.liveBackup ?? null, role: 'backup' }];
}

/** Deploys (engine dates) for sprints near a date: [{ kind, date, time, sprint }]. */
function deploysNear(date, times) {
  const n = sprintForDate(date);
  const out = [];
  for (let k = n - 2; k <= n + 1; k++) {
    const s = sprintDates(k);
    out.push({ kind: 'Demo', date: s.demoStart, time: times.demo, sprint: s });
    out.push({ kind: 'Live', date: s.live, time: times.live, sprint: s });
  }
  return out.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

/** Monday of the Mon–Sun week containing date. */
export function weekMonday(date) {
  const wd = weekdayOf(date);
  const back = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[wd];
  return addDays(date, -back);
}

/**
 * STATES.md §7. duty = the duty.js module ({ RELEASES, ROTA_UPDATED }) or null.
 * Returns null when there is no rota (state `no-data`: the line is not rendered).
 */
export function dutyLine(date, duty, rules = []) {
  if (!duty || !Array.isArray(duty.RELEASES)) return null;
  const times = keyTimes(rules);
  const d = date;
  const deploys = deploysNear(d, times);
  const mk = (dep) => ({
    kind: dep.kind,
    label: dep.sprint.label,
    date: dep.date,
    time: dep.time,
    zones: formatAcrossZones(dep.date, dep.time),
    people: deployPeople(duty, dep.kind, dep.date),
  });
  const tonight = !isWeekendDay(d) && deploys.find((x) => x.date === d);
  if (tonight) return { state: 'tonight', deploy: mk(tonight) };
  const prev = previousWorkingDay(d);
  const last = !isWeekendDay(d) && deploys.find((x) => x.date === prev);
  if (last) return { state: 'last-night', deploy: mk(last) };
  const next = deploys.find((x) => x.date > d);
  return { state: 'next', deploy: next ? mk(next) : null };
}

export const NOT_ASSIGNED = 'not assigned yet';

/** 'Dev B. (lead), Dev C. (backup)' / 'Dev A.' / 'not assigned yet'. */
export function peopleText(people) {
  if (people.every((p) => !p.name)) return NOT_ASSIGNED;
  return people.map((p) => `${p.name ?? NOT_ASSIGNED}${p.role ? ` (${p.role})` : ''}`).join(', ');
}

/**
 * The duty line's parts, the one source for the page and the tests (review 1.14, B8):
 * { state, before, label, after, people }. The page renders `before`, the sprint label as a link, `after`, a space,
 * then the people. null when there is nothing to show. Support duty is not shown: it differs per team (owner, 2026-10-01).
 */
export function dutyParts(line) {
  const dep = line && line.deploy;
  if (!dep) return null;
  const base = { state: line.state, label: dep.label, people: dep.people };
  if (line.state === 'tonight') return { ...base, before: `Tonight · ${dep.kind} update `, after: ` · ${dep.zones}:` };
  if (line.state === 'last-night') return { ...base, before: `Last night · ${dep.kind} update `, after: ':' };
  return { ...base, before: `Next · ${dep.kind} update ${fmtDay(dep.date)} ${dep.zones} (`, after: '):' };
}

/** The duty line as plain text, as the page shows it (STATES.md §7 patterns). */
export function dutyTexts(line) {
  const p = dutyParts(line);
  return p ? [`${p.before}${p.label}${p.after} ${peopleText(p.people)}`] : [];
}

// ---------------------------------------------------------------- agenda ("Your day")

/** 'until the Demo update Tue 13 Oct (evening)' / 'until Mon 5 Oct 12:00' / 'by Mon 5 Oct 12:00' for a window action. */
export function untilText(a, times) {
  const s = sprintDates(a.sprintNumber ?? context(a.dates.from).current.n);
  const to = a.dates.to;
  const by = a.id === 'ready-for-live' ? 'by' : 'until';
  if (to === s.demoStart) return `until the Demo update ${fmtDay(to)} (evening)`;
  if (to === s.cutoff) return `${by} ${fmtDay(to)} ${times.cutoff}`;
  return `${by} ${fmtDay(to)}`;
}

const CHIP = { deadline: 'Due', meeting: 'Meeting', deploy: 'Update', reminder: 'Check', window: 'Check' };
const SLOT_ORDER = ['carry', 'morning', 'today', 'timed', 'after-cutoff', 'before-deploy', 'evening', 'after-deploy', 'earlier'];
const SLOT_HEAD = {
  carry: 'From last night',
  morning: 'By 12:00',
  today: 'Today',
  'after-cutoff': 'After 12:00',
  'before-deploy': 'Before the update',
  evening: 'Tonight',
  'after-deploy': 'After the update (tonight or tomorrow morning)',
  earlier: 'Earlier today',
};
/** Slot headings on a weekend, when the list is the next working day's. */
const WEEKEND_HEAD = { evening: 'Evening', 'after-deploy': 'After the update (that evening or the next morning)' };
const WHEN = { morning: 'Morning', today: 'Today', 'after-cutoff': 'After 12:00', 'before-deploy': 'Before', evening: 'Tonight', 'after-deploy': 'After', carry: 'From last night' };

/** One agenda item for the page. */
function itemModel(a, day, time, times, { other = false } = {}) {
  const s = a.sprintNumber != null ? sprintDates(a.sprintNumber) : null;
  const facts = [];
  if (a.id === 'inform-client-uat' && s) facts.push({ text: `UAT deadline: ${fmtDay(s.cutoff)}, ${times.cutoff}`, copy: `UAT deadline: ${fmtDay(s.cutoff)} ${s.cutoff.slice(0, 4)}, ${times.cutoff} (Tallinn time)` });
  const releasePages = ['release-page', 'golive-page', 'demo-update', 'live-update'].includes(a.id) && s
    ? { release: s.label, golive: ['golive-page', 'live-update'].includes(a.id) } : null;
  return {
    id: a.id,
    title: a.title,
    detail: a.detail,
    kind: a.kind,
    who: a.who || [],
    time: a.time ?? null,
    source: a.source,
    links: a.links || [],
    releasePages,
    facts,
    tag: s ? sprintTag(s.n, day, time, times) : null,
    other,
    sub: null,
    chip: other ? { text: CHIP[a.kind] || 'Check', cls: 'other' } : null,
    key: false,
    when: null,
    slot: null,
  };
}

const mRank = (m) => (m.chip && m.chip.cls === 'outl' ? 2 : m.time ? 1 : 0);

function slotFor(a, day, times, isCutDay) {
  if (a.slot) return a.slot;
  if (a.time && isCutDay && a.time <= times.cutoff) return 'morning';
  if (a.time) return 'timed';
  return 'today';
}

const isClock = (t) => /^\d\d:\d\d$/.test(t || '');
/** The folded "Today" panel's summary (READABILITY.md §3.1): the count and the next item that has not passed. */
function todaySummary(groups, count, weekendDay) {
  const items = groups.flatMap((g) => g.items);
  if (!items.length) return weekendDay ? `Nothing due on ${weekendDay}` : 'Nothing due today';
  const n = `${count} ${count === 1 ? 'item' : 'items'}`;
  const ahead = items.filter((it) => it.slot !== 'earlier');
  if (!ahead.length) return `${n} · all passed`;
  const next = ahead.find((it) => isClock(it.when)) || ahead[0];
  return `${n} · next ${isClock(next.when) ? `${next.when} ` : ''}${next.title}`;
}

/**
 * "Your day" for a role. On a weekend it lists the next working day's items (STATES.md §8 Sat 3 Oct).
 * Returns { day, weekend, heading, summary, groups: [{ slot, heading, items }], running, everyday, next, gates, count }.
 */
export function agenda(date, time, role, rules) {
  const weekend = isWeekendDay(date);
  const day = weekend ? nextWorkingDay(date) : date;
  const now = weekend ? '00:00' : time;
  const f = dayFacts(day, rules);
  const T = f.times;
  const isCutDay = !!f.cut;
  const phase = isCutDay ? cutoffPhase(f, now) : null;
  const demoEvening = !!f.demo && now >= T.demo;

  const mine = f.acts.filter((a) => roleMatches(a, role));

  const items = [];
  const running = [];
  const everyday = [];

  const place = (a, list, opts = {}) => {
    const m = itemModel(a, day, now, T, opts);
    if (a.status === 'active-window') {
      const short = daysBetween(a.dates.from, a.dates.to) <= SHORT_WINDOW_DAYS;
      if (!short) { if (!opts.other) everyday.push(m); return; }
      const first = a.dates.from === day;
      const last = a.dates.to === day;
      m.sub = untilText(a, T);
      if (a.id === 'code-freeze' && first) m.sub = `${m.sub}. Beta reopens ${fmtDay(sprintDates(a.sprintNumber).uatStart)}.`;
      if (!first && !last) { if (!opts.other) running.push(m); return; }
      if (!opts.other) m.chip = { text: first ? 'Opens today' : 'Last day', cls: 'outl' };
      m.slot = last && a.dates.to === (a.sprintNumber != null && sprintDates(a.sprintNumber).cutoff) ? 'morning' : 'today';
      m.when = m.slot === 'morning' ? `by ${T.cutoff}` : 'Today';
      if (last) m.sub = a.id === 'code-freeze' ? 'until the Demo update tonight' : null; // the "when" column already says "by 12:00"/"Today"
      list.push(m);
      return;
    }
    m.slot = slotFor(a, day, T, isCutDay);
    // On a weekend the list is Monday's: the deploy shows its time, not "Tonight".
    m.when = m.time && (m.slot !== 'evening' || weekend) ? m.time : WHEN[m.slot] || 'Today';
    if (!opts.other) {
      m.chip = a.slot === 'after-cutoff' ? { text: 'If needed', cls: 'outl' } : { text: CHIP[a.kind] || 'Check', cls: a.kind === 'deadline' ? 'due' : a.kind === 'meeting' ? 'meet' : a.kind === 'deploy' ? 'upd' : 'check' };
      if (a.id === 'fix-cutoff' && phase === 'before') m.key = true;
      if (a.slot === 'after-cutoff' && phase === 'after') m.when = 'Now';
      if (a.slot === 'after-deploy') m.sub = weekend ? 'That evening or the next morning' : 'Tonight or tomorrow morning';
    }
    list.push(m);
  };

  for (const a of mine) place(a, items);

  // Cut-off day: the UAT window's last day merges into the Fix cut-off row (STATES.md §5).
  if (isCutDay) {
    const fix = items.find((m) => m.id === 'fix-cutoff');
    const uat = items.findIndex((m) => m.id === 'uat-window');
    if (fix && uat >= 0) { fix.sub = 'UAT window closes at the same time'; items.splice(uat, 1); }
  }

  // Passed items move to "Earlier today" with the neutral Passed chip. Never claims completion.
  for (const m of items) {
    let passed = false;
    if (isCutDay && phase !== 'before' && m.slot === 'morning') passed = true;
    // Any day: a meeting or timed deadline is over once its time has come (review 1.7). Deploys stay "Tonight".
    if (!weekend && m.time && m.time <= now && m.kind !== 'deploy') passed = true;
    if (isCutDay && phase === 'evening' && m.slot === 'after-cutoff') passed = true;
    if (demoEvening && (m.slot === 'before-deploy' || m.id === 'code-freeze' || m.id === 'regression-run')) passed = true;
    if (passed) { m.slot = 'earlier'; m.chip = { text: 'Passed', cls: 'passed' }; m.key = false; }
  }

  // Carry-over from last night, first.
  const carry = weekend ? [] : carryOverItems(day, rules, role).map((a) => {
    const m = itemModel(a, day, now, T);
    const s = sprintDates(a.sprintNumber);
    const afterLive = s.live === a.from;
    m.slot = 'carry';
    m.when = 'From last night';
    m.chip = { text: CHIP[a.kind] || 'Check', cls: a.kind === 'deadline' ? 'due' : 'check' };
    m.sub = a.id === 'confirm-live-to-client'
      ? `Last night's ${s.label} ${afterLive ? 'Live' : 'Demo'} update was scheduled. Confirm to clients once the developers have.`
      : 'If it was not done last night.';
    return m;
  });

  const groups = [];
  const all = [...carry, ...items];
  for (const slot of SLOT_ORDER) {
    if (slot === 'timed') {
      const timed = all.filter((m) => m.slot === 'timed').sort((a, b) => (a.time < b.time ? -1 : 1));
      const times = [...new Set(timed.map((m) => m.time))];
      for (const t of times) groups.push({ slot: 'timed', heading: t, items: timed.filter((m) => m.time === t) });
      continue;
    }
    let list = all.filter((m) => m.slot === slot);
    // By 12:00: untimed items, then the 12:00 row, then windows that end at 12:00 (mockup frame B).
    if (slot === 'morning') list = list.map((m, i) => [m, i]).sort((x, y) => mRank(x[0]) - mRank(y[0]) || x[1] - y[1]).map(([m]) => m);
    const head = slot === 'morning' ? (isCutDay ? `By ${T.cutoff}` : 'Morning') : weekend && WEEKEND_HEAD[slot] ? WEEKEND_HEAD[slot] : SLOT_HEAD[slot];
    if (list.length) groups.push({ slot, heading: head, items: list });
  }

  let gates = null;
  const planningTomorrow = f.nwd && sprintsNear(context(f.nwd)).some((s) => s.planning === f.nwd);
  const planningToday = !!f.planning;
  if (role === 'Lead' && (planningToday || planningTomorrow)) {
    const eve = planningToday ? previousWorkingDay(day) : day;
    const list = actionsFor(eve, rules).filter((a) => a.when && a.when.on === 'planning' && a.when.offset === -1);
    gates = { heading: 'Gates for planning (check in Jira)', due: eve, items: list.map((a) => itemModel(a, day, now, T, { other: true })) };
  }

  return {
    day,
    weekend,
    heading: weekend ? fmtDay(day) : null,
    summary: todaySummary(groups, all.length, weekend ? fmtDay(day) : null),
    groups,
    running,
    everyday,
    next: nextView(date, day, rules, role),
    gates,
    count: all.length,
  };
}

// ---------------------------------------------------------------- order strip, next box

/** The key day's sequence (DESIGN.md §5 "Order strip"). null on other days. */
export function orderStrip(f, time, role) {
  const T = f.times;
  if (f.cut && !isWeekendDay(f.date)) {
    const p = cutoffPhase(f, time);
    const firstWhat = role === 'IM/AM' ? 'Last chase, fixes in' : role === 'Dev' ? 'Fixes in' : 'Fix cut-off';
    const after = role === 'IM/AM' ? 'Confirm to clients' : role === 'Dev' ? 'Golive page' : role === 'Everyone' ? 'Confirm to clients · Golive page' : null;
    const steps = [
      p === 'before' ? { when: `Now, by ${T.cutoff}`, what: firstWhat, state: 'current' } : { when: 'Earlier today', what: `Fix cut-off ${T.cutoff}`, state: 'earlier' },
      p === 'before' ? { when: `After ${T.cutoff}`, what: 'Reverts, if needed', state: 'coming' }
        : p === 'after' ? { when: 'Now', what: 'Reverts, if needed', state: 'current' } : { when: 'Earlier today', what: 'Reverts, if needed', state: 'earlier' },
      p === 'evening' ? { when: `Tonight, ${T.live}`, what: 'Live update', state: 'current' } : { when: T.live, what: 'Live update', state: 'coming' },
    ];
    if (after) steps.push({ when: p === 'before' ? 'After the update' : 'After', what: after, state: 'coming' });
    return steps;
  }
  if (f.demo && DEMO_ROLES.includes(role)) {
    const ev = time >= T.demo;
    return [
      { when: ev ? 'Earlier today' : 'Today', what: 'Freeze holds · QA: Ready for Demo', state: ev ? 'earlier' : 'current' },
      { when: ev ? `Tonight, ${T.demo}` : T.demo, what: 'Demo update', state: ev ? 'current' : 'coming' },
      { when: 'After the update', what: `Release ${f.demo.label} page`, state: 'coming' },
      { when: fmtDay(f.demo.uatStart), what: 'Beta reopens · UAT opens', state: 'coming' },
    ];
  }
  return null;
}

/** The right-hand box on calm days: the next key moment (Demo update or fix cut-off). */
export function nextKeyMoment(f, time, holidays = []) {
  const T = f.times;
  const cands = [];
  for (const s of f.nearNext) {
    cands.push({ date: s.demoStart, time: T.demo, what: 'Demo update', s });
    cands.push({ date: s.cutoff, time: T.cutoff, what: 'Fix cut-off', s, extra: 'Live update that evening' });
  }
  const now = `${f.date} ${time}`;
  const next = cands.filter((c) => `${c.date} ${c.time}` > now).sort((a, b) => (`${a.date} ${a.time}` < `${b.date} ${b.time}` ? -1 : 1))[0];
  if (!next) return null;
  const n = workingDaysEE(f.date, next.date, holidays); // EE public holidays are not working days (review 1.13)
  const inText = next.date === f.date ? 'today'
    : next.date === addDays(f.date, 1) ? 'tomorrow'
      : n <= 1 ? `on ${WEEKDAY_LONG[weekdayOf(next.date)]}` : `in ${n} working days`;
  return {
    kicker: `Next key moment · ${next.s.label}`,
    big: `${fmtDay(next.date)}, ${next.time}`,
    what: `${next.what} · ${inText}`,
    extra: next.extra || null,
    href: `#sprint-${next.s.label}`,
  };
}

// ---------------------------------------------------------------- coming up

const SLOT_AT = { morning: '00:00', 'after-cutoff': '12:01', 'before-deploy': '16:00', evening: '23:00', 'after-deploy': '23:30' };
/**
 * Sort one day's actions in the order of Your day: morning items, timed items, the rest of the day,
 * then the evening deploy and what follows it. Stable. `timeOf` reads the item's time.
 */
export function sortWithinDay(list, timeOf = (x) => x.time) {
  const at = (x) => SLOT_AT[x.slot] || timeOf(x) || '12:30';
  return list.sort((x, y) => (at(x) < at(y) ? -1 : at(x) > at(y) ? 1 : 0));
}

/** The next working days after the agenda day with role items and unit milestones (DESIGN.md §5). */
export function comingUp(date, rules, role, holidays = [], days = 10) {
  const day = isWeekendDay(date) ? nextWorkingDay(date) : date;
  const T = keyTimes(rules);
  const out = [];
  let d = day;
  for (let i = 0; i < days; i++) {
    d = nextWorkingDay(addDays(d, 1));
    const list = [];
    for (const a of actionsFor(d, rules)) {
      const unit = UNIT_IDS.includes(a.id);
      if (!unit && !roleMatches(a, role)) continue;
      if (a.status === 'active-window') {
        if (a.dates.from !== d || daysBetween(a.dates.from, a.dates.to) > SHORT_WINDOW_DAYS) continue;
      }
      if (a.id === 'sprint-start' && role !== 'Everyone' && !roleMatches(a, role)) continue;
      const s = a.sprintNumber != null ? sprintDates(a.sprintNumber) : null;
      let title = listTitle(a);
      if (a.status === 'active-window') title = a.id === 'code-freeze' ? `Code freeze starts, ${untilText(a, T)}` : `${a.title} opens, ${untilText(a, T)}`;
      list.push({
        id: a.id,
        title,
        // Another day: the deploy's time, never "Tonight" (review 1.6).
        time: a.time ?? (a.id === 'demo-update' ? T.demo : a.id === 'live-update' ? T.live : null),
        prefix: rolePrefix(a, role),
        suffix: itemSuffix(a),
        label: s ? s.label : null,
        unit,
        ifNeeded: a.slot === 'after-cutoff',
        slot: a.slot ?? null,
        at: a.time ?? null,
      });
    }
    sortWithinDay(list, (x) => x.at);
    const h = (holidays || []).filter((x) => x.date === d);
    const near = sprintsNear(context(d));
    out.push({
      date: d,
      label: fmtDay(d),
      cutoff: near.some((s) => s.cutoff === d),
      holiday: h.length ? `${[...new Set(h.map((x) => x.country))].sort().join(', ')} holiday` : null,
      items: list,
      index: i,
    });
  }
  return out.filter((x) => x.items.length);
}

// ---------------------------------------------------------------- the whole page

const BAND_TAG = {
  urgent: (f) => (f.cut ? '<cut-off day>' : '<demo day>'),
  after: () => '<cut-off passed>',
  evening: () => '<tonight>',
  'heads-up': () => '<heads-up>',
  weekend: () => '<weekend>',
};
const BAND_SR = {
  urgent: (f) => (f.cut ? 'Cut-off day. ' : 'Demo update day. '),
  after: () => 'Cut-off passed. ',
  evening: () => 'Update tonight. ',
  'heads-up': (f) => (f.nwdIsTomorrow ? 'Heads-up for tomorrow. ' : 'Heads-up. '),
  weekend: () => '',
};

/** Notices under the rail: projected and unconfirmed dates (DESIGN.md §5 "Notice"). */
export function railNotices(rows) {
  const out = [];
  if (rows.some((r) => r.projected)) out.push(`Dates after ${sprintDates(LAST_CONFIRMED).label} are projected from the 2-week cadence.`);
  if (rows.some((r) => r.unconfirmed)) out.push(`${sprintDates(UNCONFIRMED_FROM).label} onwards: plain projection after the year-end sprint, not confirmed yet.`);
  return out;
}

/** The Today model for a date the board cannot label (review 2.3): an explicit notice, no sprint labels. */
function outOfRange(date, time, role, gap, preview) {
  return {
    date, time, role, band: 'error', range: gap, tag: null, srTag: '', meta: gap.text,
    headline: gap.text,
    sub: gap.kind === 'before' ? `The board starts with sprint ${gap.text.slice('No board before '.length)}.` : `Add ${gap.year} to YEAR_STARTS in schedule.js to show its sprints.`,
    countdown: null, order: null, next: null, blinks: [],
    tab: `${preview ? `Preview ${fmtDay(date)} · ` : ''}${gap.text} · ${BOARD}`,
    favicon: 'normal', duty: null, agenda: null, rail: [], notices: [], comingUp: [], holidayWarnings: [],
  };
}

/**
 * The complete Today model. Inputs: date 'YYYY-MM-DD' and time 'HH:MM' (both Tallinn), role, rules
 * (null when rules.js failed), duty (duty.js module or null), holidays (array or null).
 */
export function resolveDay({ date, time = '09:00', role = 'Everyone', rules, duty = null, holidays = [], preview = false }) {
  // Review 2.3: before the anchor or past the configured years there is no label to show. Say so instead of
  // "-155 day 3" or "2027-28".
  const gap = numberingGap(date);
  if (gap) return outOfRange(toKey(date), time, role, gap, preview);
  const ok = Array.isArray(rules);
  const R = ok ? rules : [];
  const f = dayFacts(date, R);
  const rail = railRows(f.date, time, R, holidays || []);
  const meta = isWeekendDay(f.date)
    ? `${f.ctx.current.label} · weekend`
    : f.cut || f.demo
      ? `${f.cut ? `${f.cut.label} cut-off` : `${f.demo.label} Demo update`} · ${f.ctx.current.label} day ${f.ctx.dayOfSprint} of ${workingDaysIn(f.ctx.current)}`
      : `${f.ctx.current.label} · day ${f.ctx.dayOfSprint} of ${workingDaysIn(f.ctx.current)}`;
  if (!ok) {
    return {
      date: f.date, time, role, band: 'error', tag: null, srTag: '', meta,
      headline: 'Actions unavailable. Sprint dates below are still correct.', sub: null,
      countdown: null, order: null, next: null, tab: `${preview ? `Preview ${fmtDay(f.date)} · ` : ''}${BOARD}`,
      favicon: 'normal', duty: dutyLine(f.date, duty, R), agenda: null, rail, notices: railNotices(rail), comingUp: [],
      holidayWarnings: holidayWarnings(f.date, holidays || []),
    };
  }
  const band = bandState(f, time, role);
  const isKey = ['urgent', 'after', 'evening'].includes(band);
  let next = null;
  if (band === 'urgent' && f.demo) next = { kicker: 'Tonight', big: 'Beta → Demo', what: 'Everything on Beta moves to Demo unless excluded in the matrix', extra: null, href: `#sprint-${f.demo.label}` };
  else if (!f.cut && !(f.demo && DEMO_ROLES.includes(role))) next = nextKeyMoment(isWeekendDay(f.date) ? dayFacts(f.date, R) : f, isWeekendDay(f.date) ? '00:00' : time, holidays || []);
  const blinks = [];
  if (f.cut || f.demo || (band === 'heads-up')) blinks.push('demoLiveMatrix');
  return {
    date: f.date,
    time,
    role,
    band,
    tag: BAND_TAG[band] ? BAND_TAG[band](f) : null,
    srTag: BAND_SR[band] ? BAND_SR[band](f) : '',
    meta,
    headline: headline(f, time, role),
    sub: subLine(f, time, role, band),
    countdown: countdown(f, time),
    order: orderStrip(f, time, role),
    next,
    blinks,
    tab: tabTitle(f, time, role, { preview }),
    favicon: isKey ? 'key' : 'normal',
    duty: dutyLine(f.date, duty, R),
    agenda: agenda(f.date, time, role, R),
    rail,
    notices: railNotices(rail),
    comingUp: comingUp(f.date, R, role, holidays || []),
    // Muted heads-up at the top of "Today": public holidays coming before the next working day. Nothing moves.
    holidayWarnings: holidayWarnings(f.date, holidays || []),
  };
}
