// QA scenario tests: day-by-day expectations for the whole S21 period, Mon 28 Sep to Mon 19 Oct 2026.
// Expectations are written from the process (CONTRACT.md, SPEC.md acceptance checks and the
// Confluence calendar), not copied from engine output:
//   S20: freeze Fri 25 Sep - Wed 30 Sep, bug retro Mon 28 Sep, Demo Tue 29 / Wed 30 Sep, Live Mon 5 Oct
//   S21: 28 Sep - 9 Oct, freeze 9-14 Oct, bug retro Mon 12 Oct, Demo 13-14 Oct, Live Mon 19 Oct
//   S22: planning Thu 8 Oct, starts Mon 12 Oct
import { describe, it, expect } from 'vitest';
import { actionsFor, context, nextWorkingDay } from '../public/schedule.js';
import { RULES } from '../public/rules.js';
import { readFileSync } from 'node:fs';

process.env.TZ ||= 'Europe/Tallinn';

const BUILD_WINDOWS = ['analyst-sprint', 'autotest-review', 'code-review-24h', 'log-time-daily', 'overrun-80', 'qa-prepare-tests', 'verify-on-beta'];

// date -> { today: { id: sprintNumber }, windows: { id: sprintNumber } (exact set), day, sprint }
const DAYS = {
  '2026-09-28': { // Mon, S21 day 1 (acceptance check 1)
    sprint: 21, day: 1,
    today: { 'sprint-start': 21, 'bug-retro': 20, 'matrix-before-demo': 20 },
    windows: { 'code-freeze': 20, 'regression-run': 20, ...build(21) },
  },
  '2026-09-29': { // Tue, S20 Demo update (acceptance check 2)
    sprint: 21, day: 2,
    today: { 'demo-update': 20, 'ready-for-demo': 20, 'release-page': 20 },
    windows: { 'code-freeze': 20, 'regression-run': 20, ...build(21) },
  },
  '2026-09-30': { // Wed, Demo day 2, UAT opens, freeze ends, week 1 refinement prep
    sprint: 21, day: 3,
    today: {
      'inform-client-uat': 20, 'check-own-items-demo': 20,
      'pre-refinement': 22, 'rank-refinement-queue': 22, 'answer-parked-questions': 22,
    },
    windows: { 'code-freeze': 20, 'uat-window': 20, 'ready-for-live': 20, ...build(21) },
  },
  '2026-10-01': { // Thu week 1: Full Refinement
    sprint: 21, day: 4,
    today: { 'full-refinement': 22 },
    windows: { 'uat-window': 20, 'ready-for-live': 20, ...build(21) },
  },
  '2026-10-02': { // Fri: cut-off reminder (acceptance check 3)
    sprint: 21, day: 5,
    today: { 'cutoff-reminder': 20, 'matrix-before-live': 20 },
    windows: { 'uat-window': 20, 'ready-for-live': 20, ...build(21) },
  },
  '2026-10-05': { // Mon: S20 cut-off and Live (acceptance check 4)
    sprint: 21, day: 6,
    today: { 'fix-cutoff': 20, 'revert-missed-fixes': 20, 'live-update': 20, 'golive-page': 20, 'confirm-live-to-client': 20 },
    windows: { 'uat-window': 20, 'ready-for-live': 20, ...build(21) },
  },
  '2026-10-06': { // Tue week 2: nothing dated
    sprint: 21, day: 7,
    today: {},
    windows: build(21),
  },
  '2026-10-07': { // Wed week 2: Pre-Refinement + S22 planning prep (acceptance check 5), no parked-questions
    sprint: 21, day: 8,
    today: {
      'pre-refinement': 22, 'rank-refinement-queue': 22,
      'priority-call-due': 22, 'definition-of-ready': 22, 'qa-estimate-present': 22,
    },
    windows: build(21),
  },
  '2026-10-08': { // Thu week 2: S22 planning, S21 regression plans, NO Full Refinement
    sprint: 21, day: 9,
    today: { 'sprint-planning': 22, 'regression-plans': 21 },
    windows: build(21),
  },
  '2026-10-09': { // Fri: S21 last day, freeze starts
    sprint: 21, day: 10,
    today: { 'bug-retro-prep': 21 },
    windows: { 'code-freeze': 21, 'regression-run': 21, ...build(21) },
  },
  '2026-10-12': { // Mon: S22 day 1, S21 bug retro
    sprint: 22, day: 1,
    today: { 'sprint-start': 22, 'bug-retro': 21, 'matrix-before-demo': 21 },
    windows: { 'code-freeze': 21, 'regression-run': 21, ...build(22) },
  },
  '2026-10-13': { // Tue: S21 Demo update
    sprint: 22, day: 2,
    today: { 'demo-update': 21, 'ready-for-demo': 21, 'release-page': 21 },
    windows: { 'code-freeze': 21, 'regression-run': 21, ...build(22) },
  },
  '2026-10-14': { // Wed: UAT opens for S21
    sprint: 22, day: 3,
    today: {
      'inform-client-uat': 21, 'check-own-items-demo': 21,
      'pre-refinement': 23, 'rank-refinement-queue': 23, 'answer-parked-questions': 23,
    },
    windows: { 'code-freeze': 21, 'uat-window': 21, 'ready-for-live': 21, ...build(22) },
  },
  '2026-10-15': { // Thu week 1 of S22: Full Refinement
    sprint: 22, day: 4,
    today: { 'full-refinement': 23 },
    windows: { 'uat-window': 21, 'ready-for-live': 21, ...build(22) },
  },
  '2026-10-16': { // Fri: S21 cut-off reminder
    sprint: 22, day: 5,
    today: { 'cutoff-reminder': 21, 'matrix-before-live': 21 },
    windows: { 'uat-window': 21, 'ready-for-live': 21, ...build(22) },
  },
  '2026-10-19': { // Mon: S21 cut-off and Live
    sprint: 22, day: 6,
    today: { 'fix-cutoff': 21, 'revert-missed-fixes': 21, 'live-update': 21, 'golive-page': 21, 'confirm-live-to-client': 21 },
    windows: { 'uat-window': 21, 'ready-for-live': 21, ...build(22) },
  },
};

function build(n) {
  return Object.fromEntries(BUILD_WINDOWS.map((id) => [id, n]));
}

const byStatus = (acts, status) =>
  Object.fromEntries(acts.filter((a) => a.status === status).map((a) => [a.id, a.sprintNumber]));

describe('S21 period, day by day (28 Sep - 19 Oct 2026)', () => {
  it.each(Object.entries(DAYS))('%s', (date, exp) => {
    const c = context(date);
    expect(c.current.n).toBe(exp.sprint);
    expect(c.dayOfSprint).toBe(exp.day);
    const acts = actionsFor(date, RULES);
    expect(byStatus(acts, 'today')).toEqual(exp.today);
    expect(byStatus(acts, 'active-window')).toEqual(exp.windows);
  });

  it('covers every working day of the period', () => {
    const working = [];
    for (let d = '2026-09-28'; d <= '2026-10-19'; d = nextWorkingDay(addOne(d))) working.push(d);
    expect(Object.keys(DAYS)).toEqual(working);
  });

  it.each([
    ['2026-10-03', '2026-10-05'], ['2026-10-04', '2026-10-05'],
    ['2026-10-10', '2026-10-12'], ['2026-10-11', '2026-10-12'],
    ['2026-10-17', '2026-10-19'], ['2026-10-18', '2026-10-19'],
  ])('weekend %s shows the actions of %s', (weekend, monday) => {
    expect(context(weekend).isWeekend).toBe(true);
    expect(nextWorkingDay(weekend)).toBe(monday);
    expect(byStatus(actionsFor(nextWorkingDay(weekend), RULES), 'today')).toEqual(DAYS[monday].today);
  });

  it('weekends themselves have no single-day actions', () => {
    for (const d of ['2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11', '2026-10-17', '2026-10-18']) {
      expect(actionsFor(d, RULES).filter((a) => a.status === 'today'), d).toEqual([]);
    }
  });
});

function addOne(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

describe('key S20/S21 rule placements', () => {
  const on = (date, id) => actionsFor(date, RULES).find((a) => a.id === id);

  it('Demo update for S20 on Tue 29 Sep, as a deploy, sorted first', () => {
    const acts = actionsFor('2026-09-29', RULES);
    expect(acts[0]).toMatchObject({ id: 'demo-update', kind: 'deploy', sprintNumber: 20, relation: 'previous' });
  });

  it('Friday cut-off reminder for S20 on Fri 2 Oct (Live Mon 5 Oct)', () => {
    expect(on('2026-10-02', 'cutoff-reminder')).toMatchObject({ sprintNumber: 20, dates: { on: '2026-10-02' } });
  });

  it('S22 planning on Thu 8 Oct, prep on Wed 7 Oct', () => {
    expect(on('2026-10-08', 'sprint-planning')).toMatchObject({ sprintNumber: 22, relation: 'next' });
    for (const id of ['priority-call-due', 'definition-of-ready', 'qa-estimate-present']) {
      expect(on('2026-10-07', id), id).toMatchObject({ sprintNumber: 22, relation: 'next' });
    }
  });

  it('Full Refinement only on Thu of week 1: 1 Oct and 15 Oct, not 8 Oct', () => {
    expect(on('2026-10-01', 'full-refinement')).toMatchObject({ time: '14:00' });
    expect(on('2026-10-08', 'full-refinement')).toBeUndefined();
    expect(on('2026-10-15', 'full-refinement')).toBeDefined();
    expect(on('2026-10-22', 'full-refinement')).toBeUndefined();
  });

  it('fix cut-off at 12:00 sorts before untimed Monday items', () => {
    const acts = actionsFor('2026-10-05', RULES);
    expect(acts[0]).toMatchObject({ id: 'fix-cutoff', time: '12:00' });
  });
});

describe('rules.js wording and SPEC consistency', () => {
  it('no em or en dashes in any user-facing text', () => {
    for (const r of RULES) {
      expect(`${r.title} ${r.detail}`, r.id).not.toMatch(/[–—]/);
    }
  });

  it('titles are short and details end with a full stop', () => {
    for (const r of RULES) {
      expect(r.title.length, r.id).toBeLessThanOrEqual(45);
      expect(r.detail, r.id).toMatch(/[.!?]$/);
    }
  });

  it('who / sprint / source match the SPEC.md rule catalogue (36 rules)', () => {
    const spec = readFileSync(new URL('../docs/SPEC.md', import.meta.url), 'utf8');
    const rows = spec
      .split('\n')
      .filter((l) => /^\| [a-z0-9-]+ \| /.test(l))
      .map((l) => l.split('|').map((c) => c.trim()).filter(Boolean))
      .filter((cells) => cells[0] !== 'id');
    expect(rows.length).toBe(36);
    expect(RULES.length).toBe(36);
    const REL = { prev: 'previous', cur: 'current', next: 'next' };
    for (const [id, who, when, source] of rows) {
      const r = RULES.find((x) => x.id === id);
      expect(r, id).toBeDefined();
      expect(r.who.join(', '), id).toBe(who);
      expect(r.source, id).toBe(source);
      const rel = /^(prev|cur|next):/.exec(when);
      if (rel) expect(r.sprint, id).toBe(REL[rel[1]]);
    }
  });
});
