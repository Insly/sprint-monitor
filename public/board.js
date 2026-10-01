// MGA Sprint Board: state resolver (STATES.md is normative).
// Pure ES module: no DOM, no clock reads. Every value on the page is a function of
//   (date, Tallinn time, role, rules, duty rota, holidays)
// and is computed here. index.html only renders the model this module returns.

import {
  context, actionsFor, upcoming, sprintDates, nextWorkingDay, previousWorkingDay, addDays,
  daysBetween, isWeekendDay, weekdayOf, workingDaysBetween, workingDaysIn, roleMatches, keyTimes,
  sprintPhase, fmtDay, fmtDM, formatAcrossZones, holidayTouchesKeyDates, sprintForDate,
  LAST_CONFIRMED, UNCONFIRMED_FROM,
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
  'uat-findings-to-planning': 'UAT findings',
  'bug-retro-prep': 'Bug retro page',
  'cutoff-reminder': 'Chase UAT results',
};

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const roleWord = (role) => (role === 'IM/AM' ? 'IM / AM' : role);
const endSentence = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);

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
  if (demo) return { key: true, kind: 'demo', sprint: demo, text: `Demo update ${when}`, short: f.nwdIsTomorrow ? 'Demo tomorrow' : `Demo ${weekdayOf(d)}` };
  const cut = near.find((s) => s.cutoff === d);
  if (cut) return { key: true, kind: 'cutoff', sprint: cut, text: `Cut-off ${WEEKDAY_LONG[weekdayOf(d)]} ${f.times.cutoff}`, short: `Cut-off ${weekdayOf(d)} ${f.times.cutoff}` };
  const plan = near.find((s) => s.planning === d);
  if (plan) return { key: false, kind: 'planning', sprint: plan, text: `Sprint planning ${when}`, short: `Planning ${when}` };
  const frz = near.find((s) => s.freezeStart === d);
  if (frz) return { key: false, kind: 'freeze', sprint: frz, text: `Code freeze starts ${when}`, short: `Code freeze ${when}` };
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

/** STATES.md §3.1: today's event for a role, first match wins. */
export function todayEvent(f, role) {
  const s = f.freezeStarts;
  if (s && f.acts.some((a) => a.id === 'code-freeze' && a.dates.from === f.date)) return { kind: 'freeze', text: 'Code freeze starts today', short: 'Code freeze starts' };
  if (f.acts.some((a) => a.id === 'sprint-planning')) return { kind: 'planning', text: 'Sprint planning today', short: 'Planning today' };
  if (f.uatOpens) return { kind: 'uat', text: `UAT opens: deadline ${fmtDay(f.uatOpens.cutoff)} ${f.times.cutoff}`, short: 'UAT opens' };
  const start = f.acts.find((a) => a.id === 'sprint-start');
  if (start) return { kind: 'start', text: `${sprintDates(start.sprintNumber).label} starts today`, short: `${sprintDates(start.sprintNumber).label} starts` };

  const carry = carryOverItems(f.date, f.rules, role);
  if (carry.length) {
    const c = carry[0];
    const label = sprintDates(c.sprintNumber).label;
    const prevLive = sprintDates(c.sprintNumber).live === c.from;
    if (role === 'Everyone') {
      return prevLive
        ? { kind: 'carry', text: `Morning after the ${label} Live update`, short: 'Morning after Live', carry }
        : { kind: 'carry', text: `Morning after the ${label} Demo update`, short: 'Morning after Demo', carry };
    }
    const byId = (id) => carry.find((a) => a.id === id);
    if (byId('confirm-live-to-client')) return { kind: 'carry', text: 'Confirm the Live update to clients', short: 'Confirm Live to clients', carry };
    if (byId('golive-page')) return { kind: 'carry', text: `Create the Golive Release ${label} page`, short: 'Golive page', carry };
    if (byId('release-page')) return { kind: 'carry', text: `Create the Release ${label} page`, short: 'Release page', carry };
    return { kind: 'carry', text: c.title, short: c.title, carry };
  }

  const meeting = f.acts.find((a) => a.kind === 'meeting' && a.time && a.status === 'today' && roleMatches(a, role));
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
  const e = todayEvent(f, role);
  const h = headsUp(f);
  if (h && h.key && headsUpActors(f, h).includes(role)) return 'heads-up';
  if (e || h) return 'event';
  return 'quiet';
}

function weekendHeadline(f) {
  const mon = f.nwd;
  const near = sprintsNear(context(mon));
  if (near.some((s) => s.cutoff === mon)) return `Weekend. ${WEEKDAY_LONG[weekdayOf(mon)]} is cut-off and Live day.`;
  const start = near.find((s) => s.start === mon);
  if (start) return `Weekend. ${start.label} starts ${WEEKDAY_LONG[weekdayOf(mon)]}.`;
  return 'Weekend';
}

/** The h1 text. */
export function headline(f, time, role) {
  if (isWeekendDay(f.date)) return weekendHeadline(f);
  if (f.cut) {
    const p = cutoffPhase(f, time);
    if (p === 'before') return `Fix cut-off at ${f.times.cutoff}`;
    if (p === 'after') return 'Cut-off passed. Live update tonight.';
    return 'Live update tonight';
  }
  if (f.demo) return 'Demo update tonight';
  const parts = [todayEvent(f, role)?.text, headsUp(f)?.text].filter(Boolean);
  if (parts.length === 0) return 'No deadlines today';
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
    const cut = sprintsNear(context(mon)).some((s) => s.cutoff === mon);
    core = cut ? `Weekend · ${weekdayOf(mon)} cut-off ${T.cutoff}` : 'Weekend';
  } else if (f.cut) {
    const p = cutoffPhase(f, time);
    core = p === 'before' ? `Cut-off ${T.cutoff} · Live tonight` : p === 'after' ? 'Cut-off passed · Live tonight' : 'Live update tonight';
  } else if (f.demo) {
    core = 'Demo update tonight';
  } else {
    const h = headsUp(f);
    if (h && h.kind === 'cutoff') core = h.short;
    else {
      const e = todayEvent(f, role);
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
  const a = n.items[0];
  return a.time
    ? `Next for ${roleWord(role)}: ${a.title} ${fmtDay(n.date)} ${a.time}.`
    : `Next for ${roleWord(role)}: ${a.title}, ${fmtDay(n.date)}.`;
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
      if (R === 'IM/AM') return `Raise blocking UAT bugs with the developers now. Anything not fixed by ${T.cutoff} is reverted.`;
      if (R === 'Dev') return `Blocking UAT fixes in by ${T.cutoff}. Live update tonight.`;
      if (R === 'Everyone') return `A bugfix that misses ${T.cutoff} means a revert, not a fix.`;
      return `${nothing} ${L} goes Live tonight.`;
    }
    if (p === 'after') {
      if (R === 'IM/AM') return 'Agree reverts with the developers and tell affected clients.';
      if (R === 'Dev') return 'If anything missed the cut-off, revert it before Live. The IM/AM decide which.';
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
    if (R === 'Dev') return evening ? `After the update: create the Release ${L} page, tonight or tomorrow morning.` : `Code freeze holds until the update. Afterwards: Release ${L} page.`;
    if (R === 'QA') return evening ? 'Regression closes with the update.' : 'Before the update: all tasks tested and Ready for Demo.';
    if (R === 'IM/AM') return `Don't tell clients yet. Tomorrow: tell them, UAT deadline ${fmtDay(f.demo.cutoff)} ${T.cutoff}.`;
    if (R === 'Everyone') return 'QA: Ready for Demo before the update. IM/AM: tell clients tomorrow.';
    return nothing;
  }

  const h = headsUp(f);
  const e = todayEvent(f, R);
  const retro = f.acts.find((a) => a.id === 'bug-retro');
  const retroLine = retro ? `Bug retro for ${sprintDates(retro.sprintNumber).label} today.` : null;

  if (h && h.kind === 'demo') {
    if (R === 'Dev') return 'Code freeze holds until the Demo update tomorrow evening.';
    if (R === 'QA') return 'Run regression until the Demo update tomorrow evening.';
    if (R === 'Everyone') return [retroLine, 'IM/AM: Demo/Live matrix due.'].filter(Boolean).join(' ');
    if ((R === 'Lead' || R === 'Analyst') && retroLine) return retroLine;
  }
  if (h && h.kind === 'cutoff') {
    const matrix = f.acts.find((a) => a.id === 'matrix-before-live');
    if (R === 'IM/AM') return matrix ? `Due today: ${matrix.title}. Chase UAT results.` : 'Chase UAT results.';
    if (R === 'Dev') return `Blocking UAT fixes must be in by ${weekdayOf(h.sprint.cutoff)} ${T.cutoff}.`;
    if (R === 'Everyone') return `IM/AM: Demo/Live matrix for Live, chase UAT results. Dev: blocking fixes in by ${weekdayOf(h.sprint.cutoff)} ${T.cutoff}.`;
    return nothing;
  }
  if (f.uatOpens) {
    if (R === 'IM/AM') return 'Once the developers confirm the Demo update, tell clients what is on Demo.';
    if (R === 'Everyone') return `IM/AM: tell clients what is on Demo. UAT deadline ${fmtDay(f.uatOpens.cutoff)} ${T.cutoff}.`;
  }
  if (f.freezeStarts) {
    const u = `until the Demo update ${fmtDay(f.freezeStarts.demoStart)} (evening)`;
    if (R === 'QA') return `Run regression opens today, ${u}.`;
    if (R === 'Dev') return `Only QA-approved bug fixes go to Beta ${u}.`;
    if (R === 'IM/AM') return `Config changes on Beta need QA approval ${u}.`;
    if (R === 'Everyone') return `Code freeze ${u}. Beta reopens ${fmtDay(f.freezeStarts.uatStart)}.`;
  }
  const planning = f.acts.find((a) => a.id === 'sprint-planning');
  if (planning && (R === 'Everyone' || roleMatches(planning, R))) {
    const out = ['Plan 2/3 of capacity, keep 1/3 as buffer.'];
    if (R !== 'Everyone') {
      for (const a of actionsFor(f.nwd, f.rules)) {
        if (a.status === 'today' && a.kind === 'deadline' && roleMatches(a, R) && !a.who.includes('All')) out.push(`${SHORT[a.id] || a.title} due ${f.nwdIsTomorrow ? 'tomorrow' : fmtDay(f.nwd)}.`);
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
    .filter((a) => !headlineHasMeeting(a.id));
  const sentences = [];
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
    if (findings) {
      sentences.push('Rank the refinement queue before 14:00.', `Bring ${f.ctx.previous.label} UAT findings to planning.`);
      handled.add(findings.id);
    } else sentences.push('Rank the refinement queue before Pre-Refinement at 14:00.');
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
    sentences.push(`Due today: ${due[0].title}.`);
    const also = [...due.slice(1), ...rest];
    if (also.length) sentences.push(`Also: ${also.map((a) => SHORT[a.id] || a.title).join(', ')}.`);
  } else {
    for (const a of rest) sentences.push(endSentence(a.title));
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
  // Within the day: timed first, then weekly-rhythm items (e.g. rank the queue before the 14:00 session).
  const rank = (a) => (a.time ? 0 : 'weekly' in (a.when || {}) ? 1 : 2);
  const items = list.filter((a) => a.date === first).map((a, i) => [a, i]).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).map(([a]) => a);
  return { date: first, items };
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

/** The duty line as plain text parts in display order (STATES.md §7 patterns). */
export function dutyTexts(line) {
  if (!line) return [];
  // Support duty is not shown: it differs per team (owner, 2026-10-01).
  const dep = line.deploy;
  if (!dep) return [];
  const who = peopleText(dep.people);
  if (line.state === 'tonight') return [`Tonight · ${dep.kind} update ${dep.label} · ${dep.zones}: ${who}`];
  if (line.state === 'last-night') return [`Last night · ${dep.kind} update ${dep.label}: ${who}`];
  return [`Next · ${dep.kind} update ${fmtDay(dep.date)} ${dep.zones} (${dep.label}): ${who}`];
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
    who: a.who,
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

/**
 * "Your day" for a role. On a weekend it lists the next working day's items (STATES.md §8 Sat 3 Oct).
 * Returns { day, heading, groups: [{ slot, heading, items }], running, everyday, carry, nextFor, also, gates, count }.
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
  const others = role === 'Everyone' ? [] : f.acts.filter((a) => !roleMatches(a, role));

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
    m.when = m.time && m.slot !== 'evening' ? m.time : WHEN[m.slot] || 'Today';
    if (!opts.other) {
      m.chip = a.slot === 'after-cutoff' ? { text: 'If needed', cls: 'outl' } : { text: CHIP[a.kind] || 'Check', cls: a.kind === 'deadline' ? 'due' : a.kind === 'meeting' ? 'meet' : a.kind === 'deploy' ? 'upd' : 'check' };
      if (a.id === 'fix-cutoff' && phase === 'before') m.key = true;
      if (a.slot === 'after-cutoff' && phase === 'after') m.when = 'Now';
      if (a.slot === 'after-deploy') m.sub = 'Tonight or tomorrow morning';
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
    if (isCutDay && phase !== 'before' && (m.slot === 'morning' || (m.time && m.time <= now && m.kind !== 'deploy'))) passed = true;
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
    if (list.length) groups.push({ slot, heading: slot === 'morning' ? (isCutDay ? `By ${T.cutoff}` : 'Morning') : SLOT_HEAD[slot], items: list });
  }

  const also = [];
  for (const a of others) {
    if (a.status === 'active-window') {
      const short = daysBetween(a.dates.from, a.dates.to) <= SHORT_WINDOW_DAYS;
      if (short && (a.dates.from === day || a.dates.to === day)) place(a, also, { other: true });
      continue;
    }
    place(a, also, { other: true });
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
    groups,
    running,
    everyday,
    nextFor: nextFor(day, rules, role),
    nextForIsTomorrow: (() => { const n = nextFor(day, rules, role); return !!n && n.date === addDays(day, 1); })(),
    also,
    alsoOpen: role === 'Lead',
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
export function nextKeyMoment(f, time) {
  const T = f.times;
  const cands = [];
  for (const s of f.nearNext) {
    cands.push({ date: s.demoStart, time: T.demo, what: 'Demo update', s });
    cands.push({ date: s.cutoff, time: T.cutoff, what: 'Fix cut-off', s, extra: 'Live update that evening' });
  }
  const now = `${f.date} ${time}`;
  const next = cands.filter((c) => `${c.date} ${c.time}` > now).sort((a, b) => (`${a.date} ${a.time}` < `${b.date} ${b.time}` ? -1 : 1))[0];
  if (!next) return null;
  const n = workingDaysBetween(f.date, next.date);
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
      let title = a.title;
      if (a.status === 'active-window') title = a.id === 'code-freeze' ? `Code freeze starts, ${untilText(a, T)}` : `${a.title} opens, ${untilText(a, T)}`;
      list.push({
        id: a.id,
        title,
        time: a.kind === 'deploy' ? 'Tonight' : a.time ?? null,
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
  'heads-up': (f) => (f.nwdIsTomorrow ? '<tomorrow>' : `<${WEEKDAY_LONG[weekdayOf(f.nwd)].toLowerCase()}>`),
  weekend: () => '<weekend>',
};
const BAND_SR = {
  urgent: (f) => (f.cut ? 'Cut-off day. ' : 'Demo update day. '),
  after: () => 'Cut-off passed. ',
  evening: () => 'Deploy tonight. ',
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

/**
 * The complete Today model. Inputs: date 'YYYY-MM-DD' and time 'HH:MM' (both Tallinn), role, rules
 * (null when rules.js failed), duty (duty.js module or null), holidays (array or null).
 */
export function resolveDay({ date, time = '09:00', role = 'Everyone', rules, duty = null, holidays = [], preview = false }) {
  const ok = Array.isArray(rules);
  const R = ok ? rules : [];
  const f = dayFacts(date, R);
  const rail = railRows(f.date, time, R, holidays || []);
  const meta = isWeekendDay(f.date)
    ? `${f.ctx.current.label} · weekend`
    : f.cut || f.demo
      ? `${(f.cut || f.demo).label} · ${f.ctx.current.label} day ${f.ctx.dayOfSprint} of ${workingDaysIn(f.ctx.current)}`
      : `${f.ctx.current.label} · day ${f.ctx.dayOfSprint} of ${workingDaysIn(f.ctx.current)}`;
  if (!ok) {
    return {
      date: f.date, time, role, band: 'error', tag: null, srTag: '', meta,
      headline: 'Actions unavailable. Sprint dates below are still correct.', sub: null,
      countdown: null, order: null, next: null, tab: `${preview ? `Preview ${fmtDay(f.date)} · ` : ''}${BOARD}`,
      favicon: 'normal', duty: dutyLine(f.date, duty, R), agenda: null, rail, notices: railNotices(rail), comingUp: [],
    };
  }
  const band = bandState(f, time, role);
  const isKey = ['urgent', 'after', 'evening'].includes(band);
  let next = null;
  if (band === 'urgent' && f.demo) next = { kicker: 'Tonight', big: 'Beta → Demo', what: 'Everything on Beta moves to Demo unless excluded in the matrix', extra: null, href: `#sprint-${f.demo.label}` };
  else if (!f.cut && !(f.demo && DEMO_ROLES.includes(role))) next = nextKeyMoment(isWeekendDay(f.date) ? dayFacts(f.date, R) : f, isWeekendDay(f.date) ? '00:00' : time);
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
  };
}
