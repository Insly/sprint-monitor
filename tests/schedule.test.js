import { describe, it, expect } from 'vitest';
import { workingDaysIn,
  ANCHOR,
  LAST_CONFIRMED,
  sprintDates,
  sprintForDate,
  context,
  actionsFor,
  upcoming,
  addDays,
  toKey,
  nextWorkingDay,
  weekdayOf,
  OVERRIDES,
} from '../public/schedule.js';
import { RULES } from '../public/rules.js';

// Tests below use OVERRIDES as scratch space; put the published plan back afterwards.
const ORIGINAL_OVERRIDES = structuredClone(OVERRIDES);
function restoreOverride(k) {
  if (k in ORIGINAL_OVERRIDES) OVERRIDES[k] = structuredClone(ORIGINAL_OVERRIDES[k]);
  else delete OVERRIDES[k];
}
import { RULES as SAMPLE_RULES } from './rules.sample.js';

// Default to a timezone with a DST switch (EU clocks go back Sun 25 Oct 2026), but let
// the caller override it (e.g. TZ=America/New_York npm test) so the suite can run under
// several zones. Previously this line overwrote TZ unconditionally, which made a
// TZ=America/New_York run silently test Tallinn again.
process.env.TZ ||= 'Europe/Tallinn';

const ids = (list) => list.map((a) => a.id);

describe('calendar model', () => {
  it('anchors S17 on 2026-08-03', () => {
    expect(ANCHOR).toEqual({ number: 17, start: '2026-08-03' });
    expect(LAST_CONFIRMED).toBe(22);
    expect(sprintDates(17).start).toBe('2026-08-03');
  });

  it('S20 matches the contract table exactly', () => {
    expect(sprintDates(20)).toEqual({
      n: 20,
      planning: '2026-09-10',
      start: '2026-09-14',
      end: '2026-09-25',
      freezeStart: '2026-09-25',
      bugRetro: '2026-09-28',
      demoStart: '2026-09-29',
      demoEnd: '2026-09-30',
      freezeEnd: '2026-09-30',
      uatStart: '2026-09-30',
      cutoff: '2026-10-05',
      live: '2026-10-05',
      label: '2026-20',
      projected: false,
      yearEndUnconfirmed: false,
      overridden: false,
    });
  });

  it('S21 runs 28 Sep to 9 Oct and goes live 19 Oct', () => {
    const s = sprintDates(21);
    expect(s.start).toBe('2026-09-28');
    expect(s.end).toBe('2026-10-09');
    expect(s.live).toBe('2026-10-19');
  });

  it('S22 goes live 2 Nov', () => {
    expect(sprintDates(22).live).toBe('2026-11-02');
  });

  it('2027-1 starts Mon 7 Dec 2026 and goes Live Mon 11 Jan 2027 (Kaspar, 2026-10-01)', () => {
    const s = sprintDates(26);
    expect(s.label).toBe('2027-1');
    expect(s.start).toBe('2026-12-07');
    expect(s.end).toBe('2026-12-18');
    expect(s.freezeStart).toBe('2026-12-18');
    expect(s.demoStart).toBe('2027-01-05'); // Tue evening, Live - 6 like every other sprint
    expect(s.freezeEnd).toBe('2027-01-06');
    expect(s.cutoff).toBe('2027-01-11');
    expect(s.live).toBe('2027-01-11');
    expect(s.yearEndUnconfirmed).toBe(false);
  });

  it('2027-2 starts Mon 4 Jan 2027 after the break (Kaspar, 2026-10-01) and the cadence continues from there', () => {
    expect(sprintDates(27).label).toBe('2027-2');
    expect(sprintDates(27).start).toBe('2027-01-04');
    expect(sprintDates(28).start).toBe('2027-01-18');
    for (const n of [25, 26, 27, 28]) expect(sprintDates(n).yearEndUnconfirmed).toBe(false);
  });

  it('numbering resets per release year (2026-25 is followed by 2027-1)', () => {
    expect(sprintDates(21).label).toBe('2026-21');
    expect(sprintDates(25).label).toBe('2026-25');
    expect(sprintDates(26).label).toBe('2027-1');
    expect(sprintDates(27).label).toBe('2027-2');
  });

  it('applies OVERRIDES over the formula', () => {
    expect(Object.keys(OVERRIDES)).toEqual(['26', '27']); // only the published 2027-1 / 2027-2 plan
    try {
      OVERRIDES[27] = { live: '2027-01-07', cutoff: '2027-01-07' };
      const s = sprintDates(27);
      expect(s.live).toBe('2027-01-07');
      expect(s.cutoff).toBe('2027-01-07');
      expect(s.start).toBe('2026-12-21'); // untouched keys still follow the formula
      expect(s.overridden).toBe(true);
      const live = actionsFor('2027-01-07', RULES).find((a) => a.id === 'live-update');
      expect(live).toMatchObject({ sprintNumber: 27, relation: 'previous' });
    } finally {
      restoreOverride(27);
    }
    expect(sprintDates(27).live).toBe('2027-01-25'); // real 2027-2 plan is back after the scratch test
  });

  it('re-derives dependent keys when an override moves start/end', () => {
    try {
      OVERRIDES[27] = { end: '2026-12-23' };
      OVERRIDES[28] = { start: '2027-01-11' };
      expect(sprintDates(27).demoStart).toBe('2026-12-27');
      expect(sprintDates(28).end).toBe('2027-01-22');
      // 21 Dec to 10 Jan now all belongs to S27
      expect(sprintForDate('2027-01-08')).toBe(27);
      expect(sprintForDate('2027-01-11')).toBe(28);
      expect(context('2027-01-11').dayOfSprint).toBe(1);
    } finally {
      restoreOverride(27);
      restoreOverride(28);
    }
  });

  it('flags sprints after S22 as projected', () => {
    expect(sprintDates(22).projected).toBe(false);
    expect(sprintDates(23).projected).toBe(true);
  });
});

describe('sprintForDate / context', () => {
  it('Sunday 2026-09-27 is still S20, weekend', () => {
    const c = context('2026-09-27');
    expect(c.current.n).toBe(20);
    expect(c.isWeekend).toBe(true);
    expect(c.dayOfSprint).toBeNull();
    expect(c.weekOfSprint).toBe(2);
  });

  it('Monday 2026-09-28 is S21 day 1, previous S20, next S22', () => {
    const c = context('2026-09-28');
    expect(c.date).toBe('2026-09-28');
    expect(c.current.n).toBe(21);
    expect(c.dayOfSprint).toBe(1);
    expect(c.weekOfSprint).toBe(1);
    expect(c.isWeekend).toBe(false);
    expect(c.previous.n).toBe(20);
    expect(c.next.n).toBe(22);
  });

  it('Friday 2026-10-09 is day 10', () => {
    const c = context('2026-10-09');
    expect(c.current.n).toBe(21);
    expect(c.dayOfSprint).toBe(10);
    expect(c.weekOfSprint).toBe(2);
  });

  it('Monday of week 2 is day 6', () => {
    expect(context('2026-10-05').dayOfSprint).toBe(6);
  });

  it('accepts Date objects as local dates', () => {
    expect(sprintForDate(new Date(2026, 8, 28, 0, 5))).toBe(21);
    expect(sprintForDate(new Date(2026, 8, 27, 23, 59))).toBe(20);
    expect(toKey(new Date(2026, 8, 28, 23, 59))).toBe('2026-09-28');
  });

  it('handles dates before the anchor', () => {
    expect(sprintForDate('2026-08-02')).toBe(16);
    expect(sprintDates(16).start).toBe('2026-07-20');
  });

  it('rejects malformed dates', () => {
    expect(() => context('2026-02-30')).toThrow();
    expect(() => context('28.09.2026')).toThrow();
  });
});

describe('DST crossing (EU clocks go back Sun 25 Oct 2026)', () => {
  it('addDays keeps calendar days across the switch', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-10-23', 3)).toBe('2026-10-26');
    expect(addDays('2026-10-26', -3)).toBe('2026-10-23');
  });

  it('S23 starts Mon 26 Oct, the day after the switch', () => {
    expect(sprintDates(22).end).toBe('2026-10-23');
    expect(sprintDates(23).start).toBe('2026-10-26');
    expect(sprintForDate('2026-10-25')).toBe(22);
    expect(sprintForDate('2026-10-26')).toBe(23);
    expect(sprintForDate(new Date(2026, 9, 26, 0, 30))).toBe(23);
    const c = context('2026-10-26');
    expect(c.dayOfSprint).toBe(1);
    expect(c.previous.n).toBe(22);
  });

  it('S22 bug retro and live land on Mondays across the switch', () => {
    expect(sprintDates(22).bugRetro).toBe('2026-10-26');
    expect(sprintDates(22).live).toBe('2026-11-02');
    expect(nextWorkingDay('2026-10-24')).toBe('2026-10-26');
  });

  it('spring DST (29 Mar 2026) is also safe', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
});

describe('actionsFor (real rules.js)', () => {
  it('2026-09-28 includes previous-sprint bug retro and freeze window', () => {
    const acts = actionsFor('2026-09-28', RULES);
    const retro = acts.find((a) => a.id === 'bug-retro');
    expect(retro).toMatchObject({
      sprint: 'previous',
      when: { on: 'bugRetro' },
      sprintNumber: 20,
      relation: 'previous',
      status: 'today',
      dates: { on: '2026-09-28' },
    });
    const freeze = acts.find((a) => a.id === 'code-freeze');
    expect(freeze).toMatchObject({
      when: { from: 'freezeStart', to: 'freezeEnd' },
      sprintNumber: 20,
      relation: 'previous',
      status: 'active-window',
      dates: { from: '2026-09-25', to: '2026-09-30' },
    });
    // on + offset: day before the Demo update (29 Sep)
    expect(ids(acts)).toContain('matrix-before-demo');
    expect(ids(acts)).toContain('sprint-start');
    expect(ids(acts)).not.toContain('live-update');
  });

  it('freeze window is visible on its opening Friday (sprint still current)', () => {
    const freeze = actionsFor('2026-09-25', RULES).find((a) => a.id === 'code-freeze');
    expect(freeze).toMatchObject({ sprintNumber: 20, relation: 'current' });
  });

  it('2026-09-29: Demo update, Ready for Demo, release page', () => {
    const acts = actionsFor('2026-09-29', RULES);
    expect(ids(acts)).toEqual(expect.arrayContaining(['demo-update', 'ready-for-demo', 'release-page']));
    expect(acts.find((a) => a.id === 'demo-update').sprintNumber).toBe(20);
  });

  it('2026-10-02: cut-off reminder (cutoff -3) and UAT window', () => {
    const acts = actionsFor('2026-10-02', RULES);
    expect(acts.find((a) => a.id === 'cutoff-reminder')).toMatchObject({ sprintNumber: 20, dates: { on: '2026-10-02' } });
    expect(acts.find((a) => a.id === 'uat-window')).toMatchObject({ sprintNumber: 20, status: 'active-window' });
  });

  it('2026-10-05: cut-off 12:00 and Live update for S20', () => {
    const acts = actionsFor('2026-10-05', RULES);
    expect(acts.find((a) => a.id === 'live-update')).toMatchObject({ sprintNumber: 20, relation: 'previous' });
    expect(acts.find((a) => a.id === 'fix-cutoff')).toMatchObject({ time: '12:00' });
  });

  it('2026-10-08: S22 planning, S21 regression plans, no Full Refinement', () => {
    const acts = actionsFor('2026-10-08', RULES);
    expect(acts.find((a) => a.id === 'sprint-planning')).toMatchObject({ sprintNumber: 22, relation: 'next' });
    expect(acts.find((a) => a.id === 'regression-plans')).toMatchObject({ sprintNumber: 21 });
    expect(ids(acts)).not.toContain('full-refinement');
  });

  it('weekly rules fire every week on their weekday', () => {
    expect(ids(actionsFor('2026-09-30', RULES))).toContain('pre-refinement');
    expect(ids(actionsFor('2026-10-07', RULES))).toContain('pre-refinement');
    expect(ids(actionsFor('2026-10-06', RULES))).not.toContain('pre-refinement');
  });

  it('weekly week:1 rules fire only in week 1', () => {
    expect(ids(actionsFor('2026-10-01', RULES))).toContain('full-refinement');
    expect(ids(actionsFor('2026-10-08', RULES))).not.toContain('full-refinement');
  });

  it('weekly week:2 rules fire only in week 2 (sample rule)', () => {
    expect(ids(actionsFor('2026-09-29', SAMPLE_RULES))).not.toContain('qa-estimates'); // Tue week 1
    const hit = actionsFor('2026-10-06', SAMPLE_RULES).find((a) => a.id === 'qa-estimates'); // Tue week 2
    expect(hit).toMatchObject({ sprintNumber: 22, relation: 'next', dates: { on: '2026-10-06' } });
  });

  it('weekends produce no single-day actions, but open windows stay active', () => {
    const acts = actionsFor('2026-09-27', RULES);
    expect(acts.filter((a) => a.status === 'today')).toEqual([]);
    expect(ids(acts).sort()).toEqual(['code-freeze', 'regression-run']);
  });

  it('sorts by time, untimed last', () => {
    const acts = actionsFor('2026-10-05', RULES);
    const times = acts.map((a) => a.time ?? '99:99');
    expect([...times].sort()).toEqual(times);
  });
});

describe('upcoming', () => {
  const list = upcoming('2026-09-28', RULES);

  it('excludes today', () => {
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((a) => a.date > '2026-09-28')).toBe(true);
  });

  it('is sorted by date', () => {
    const dates = list.map((a) => a.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('covers the next 10 working days', () => {
    const last = list[list.length - 1].date;
    expect(last <= '2026-10-12').toBe(true);
    expect(list.find((a) => a.id === 'live-update')?.date).toBe('2026-10-05');
    expect(list.find((a) => a.id === 'sprint-planning')?.date).toBe('2026-10-08');
  });

  it('lists windows on their opening day only', () => {
    const freeze = upcoming('2026-10-05', RULES).filter((a) => a.id === 'code-freeze');
    expect(freeze.map((a) => a.date)).toEqual(['2026-10-09']);
    expect(freeze[0].sprintNumber).toBe(21);
  });

  it('respects the days argument', () => {
    const short = upcoming('2026-09-28', RULES, 2);
    expect(short.every((a) => a.date <= '2026-09-30')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------
// QA oracle: dates copied from Confluence, not from engine output.
//   "RP: Sprint and environment release calendar" (S17-S22), "2026 Sprints" (2026-5, 2026-10),
//   bug retro pages "S19 - 14.09.2026" and "S20 - 28.09.2026".
// Freeze runs end (Fri) -> freezeEnd (Wed); Demo is demoStart (Tue) -> demoEnd (Wed); Prod = live.
// null = not stated on the source page.
// ---------------------------------------------------------------------------------------
const CONFLUENCE = [
  // n,  start,        end/freeze,   freezeEnd,    demoStart,    demoEnd,      live,         bugRetro
  [17, '2026-08-03', '2026-08-14', '2026-08-19', '2026-08-18', '2026-08-19', '2026-08-24', null],
  [18, '2026-08-17', '2026-08-28', '2026-09-02', '2026-09-01', '2026-09-02', '2026-09-07', null],
  [19, '2026-08-31', '2026-09-11', '2026-09-16', '2026-09-15', '2026-09-16', '2026-09-21', '2026-09-14'],
  [20, '2026-09-14', '2026-09-25', '2026-09-30', '2026-09-29', '2026-09-30', '2026-10-05', '2026-09-28'],
  [21, '2026-09-28', '2026-10-09', '2026-10-14', '2026-10-13', '2026-10-14', '2026-10-19', null],
  [22, '2026-10-12', '2026-10-23', '2026-10-28', '2026-10-27', '2026-10-28', '2026-11-02', null],
  // "2026 Sprints": 2026-10 started 27.04, freeze 8.05, Demo 12/13.05, Prod 18.05
  [10, '2026-04-27', '2026-05-08', null, '2026-05-12', '2026-05-13', '2026-05-18', null],
  // "2026 Sprints": 2026-5 started 16.02, freeze 27.02, Prod 9.03 (Demo checked separately below)
  [5, '2026-02-16', '2026-02-27', null, null, null, '2026-03-09', null],
];

describe('Confluence calendar oracle (table-driven)', () => {
  it.each(CONFLUENCE)('S%i matches Confluence', (n, start, end, freezeEnd, demoStart, demoEnd, live, bugRetro) => {
    const s = sprintDates(n);
    expect(s.start).toBe(start);
    expect(s.end).toBe(end);
    expect(s.freezeStart).toBe(end);
    if (freezeEnd) expect(s.freezeEnd).toBe(freezeEnd);
    if (demoStart) expect(s.demoStart).toBe(demoStart);
    if (demoEnd) expect(s.demoEnd).toBe(demoEnd);
    expect(s.live).toBe(live);
    expect(s.cutoff).toBe(live); // cut-off is 12:00 on the Live Monday
    if (bugRetro) expect(s.bugRetro).toBe(bugRetro);
    expect(s.label).toBe(`2026-${n}`); // release pages are named release/2026-NN
  });

  it('every confirmed sprint has the weekday pattern of the calendar', () => {
    for (let n = 17; n <= LAST_CONFIRMED; n++) {
      const s = sprintDates(n);
      expect(weekdayOf(s.planning), `S${n} planning`).toBe('Thu');
      expect(weekdayOf(s.start), `S${n} start`).toBe('Mon');
      expect(weekdayOf(s.end), `S${n} end`).toBe('Fri');
      expect(weekdayOf(s.bugRetro), `S${n} bugRetro`).toBe('Mon');
      expect(weekdayOf(s.demoStart), `S${n} demoStart`).toBe('Tue');
      expect(weekdayOf(s.demoEnd), `S${n} demoEnd`).toBe('Wed');
      expect(weekdayOf(s.live), `S${n} live`).toBe('Mon');
      // planning of sprint n+1 is the Thursday of week 2 of sprint n
      expect(sprintDates(n + 1).planning).toBe(addDays(s.end, -1));
    }
  });

  it('sprints are back to back with no gap or overlap', () => {
    for (let n = 5; n <= 40; n++) {
      if (n === 26) continue; // the year-end break, asserted below
      expect(sprintDates(n + 1).start).toBe(addDays(sprintDates(n).end, 3));
    }
    // 2027-1 ends Fri 18 Dec; 2027-2 starts Mon 4 Jan after the break (owner, 2026-10-01).
    expect(sprintDates(26).end).toBe('2026-12-18');
    expect(sprintDates(27).start).toBe('2027-01-04');
  });

  it('known historical deviation: 2026-5 Demo was Wed 04.03 / Thu 05.03, the engine models Tue/Wed', () => {
    // The Tue/Wed Demo pattern holds from at least 2026-10 onwards (see table above).
    // The engine does not model the older Wed/Thu Demo. This pins the difference so it
    // stays visible; it only matters if someone browses dates before May 2026.
    const s = sprintDates(5);
    expect(s.demoStart).toBe('2026-03-03');
    expect(s.demoStart).not.toBe('2026-03-04');
  });
});

describe('edge exploration (QA)', () => {
  it('weekend: the page shows the next working day, which gets that day\'s actions', () => {
    // index.html computes actionsFor(nextWorkingDay(today)).
    expect(nextWorkingDay('2026-10-03')).toBe('2026-10-05');
    expect(nextWorkingDay('2026-10-04')).toBe('2026-10-05');
    expect(nextWorkingDay('2026-10-02')).toBe('2026-10-02');
    const monIds = ids(actionsFor(nextWorkingDay('2026-10-03'), RULES));
    expect(monIds).toEqual(expect.arrayContaining(['fix-cutoff', 'live-update', 'revert-missed-fixes']));
    // Sat/Sun before a sprint starts -> Monday = new sprint day 1 with bug retro
    const mon = actionsFor(nextWorkingDay('2026-10-10'), RULES);
    expect(mon.find((a) => a.id === 'sprint-start')?.sprintNumber).toBe(22);
    expect(mon.find((a) => a.id === 'bug-retro')?.sprintNumber).toBe(21);
    expect(context(nextWorkingDay('2026-10-11')).dayOfSprint).toBe(1);
  });

  it('weekend context itself: no day number, right sprint, windows only', () => {
    const c = context('2026-10-03');
    expect(c).toMatchObject({ isWeekend: true, dayOfSprint: null, weekOfSprint: 1 });
    expect(c.current.n).toBe(21);
    expect(actionsFor('2026-10-03', RULES).every((a) => a.status === 'active-window')).toBe(true);
  });

  it('dates before S17 compute sensibly (2026-03-01 = Sunday at the end of 2026-5)', () => {
    const c = context('2026-03-01');
    expect(c.current.n).toBe(5);
    expect(c.current.label).toBe('2026-5');
    expect(c.isWeekend).toBe(true);
    expect(c.previous.n).toBe(4);
    expect(c.next.start).toBe('2026-03-02');
    expect(() => actionsFor('2026-03-01', RULES)).not.toThrow();
    expect(() => upcoming('2026-03-01', RULES, 25)).not.toThrow();
    expect(context('2026-03-02')).toMatchObject({ dayOfSprint: 1, isWeekend: false });
  });

  it('far future (2027-06-01) does not throw and is flagged projected', () => {
    const c = context('2027-06-01');
    expect(c.current.n).toBe(37); // cadence re-based on 2027-2 = Mon 4 Jan 2027
    expect(c.current.start).toBe('2027-05-24');
    expect(c.dayOfSprint).toBe(7);
    expect(c.current.projected).toBe(true);
    expect(() => actionsFor('2027-06-01', RULES)).not.toThrow();
    expect(() => upcoming('2027-06-01', RULES, 25)).not.toThrow();
  });

  it('dayOfSprint is 1..10 on every working day and null on weekends, S5 to S40', () => {
    for (let d = sprintDates(5).start; d < sprintDates(41).start; d = addDays(d, 1)) {
      const c = context(d);
      if (c.isWeekend || c.isBreak) expect(c.dayOfSprint).toBeNull();
      else {
        expect(c.dayOfSprint).toBeGreaterThanOrEqual(1);
        expect(c.dayOfSprint).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe('timezone independence (run with TZ=Europe/Tallinn and TZ=America/New_York)', () => {
  it('the requested TZ is really in effect', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(process.env.TZ);
  });

  it('both DST switches (EU 25 Oct, US 1 Nov 2026) keep dates and day numbers intact', () => {
    for (const [d, n, day] of [
      ['2026-10-23', 22, 10], ['2026-10-24', 22, null], ['2026-10-25', 22, null],
      ['2026-10-26', 23, 1], ['2026-10-30', 23, 5], ['2026-10-31', 23, null],
      ['2026-11-01', 23, null], ['2026-11-02', 23, 6], ['2026-11-06', 23, 10],
    ]) {
      const c = context(d);
      expect(c.date, d).toBe(d);
      expect(c.current.n, d).toBe(n);
      expect(c.dayOfSprint, d).toBe(day);
      // Date objects at 00:30 and 23:30 local on the same day resolve to the same key
      const [y, m, dd] = d.split('-').map(Number);
      expect(toKey(new Date(y, m - 1, dd, 0, 30))).toBe(d);
      expect(toKey(new Date(y, m - 1, dd, 23, 30))).toBe(d);
    }
    expect(sprintDates(23)).toMatchObject({ start: '2026-10-26', end: '2026-11-06', bugRetro: '2026-11-09', live: '2026-11-16' });
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09'); // US spring switch 8 Mar
    expect(ids(actionsFor('2026-11-02', RULES))).toContain('live-update'); // S22 Live, after both switches
  });
});

describe('OVERRIDES: start override (QA)', () => {
  it('a start override re-bases later sprints instead of overlapping them', () => {
    // Scratch: push 2027-5 (internal 30, normally Mon 15 Feb 2027) back one week.
    expect(sprintDates(30).start).toBe('2027-02-15');
    try {
      OVERRIDES[30] = { start: '2027-02-22' };
      expect(sprintDates(30)).toMatchObject({ start: '2027-02-22', end: '2027-03-05', planning: '2027-02-18', live: '2027-03-15', overridden: true });
      // S31 must follow S30, not stay on the old grid (it would start 2027-03-01, inside S30)
      expect(sprintDates(31).start).toBe('2027-03-08');
      expect(sprintDates(31).overridden).toBe(false);
      expect(sprintForDate('2027-03-01')).toBe(30);
      expect(context('2027-03-05').dayOfSprint).toBe(10);
      expect(sprintForDate('2027-03-08')).toBe(31);
      // earlier sprints are untouched
      expect(sprintDates(29).start).toBe('2027-02-01');
      expect(sprintDates(22).live).toBe('2026-11-02');
      for (let n = 27; n <= 38; n++) {
        expect(sprintDates(n + 1).start > sprintDates(n).end, `S${n}/S${n + 1}`).toBe(true);
      }
    } finally {
      restoreOverride(30);
    }
    expect(sprintDates(31).start).toBe('2027-03-01');
  });

  it('a start override plus other keys: derived first, extra keys applied on top', () => {
    try {
      OVERRIDES[28] = { start: '2027-01-11', live: '2027-02-02' };
      const s = sprintDates(28);
      expect(s.end).toBe('2027-01-22');
      expect(s.demoStart).toBe('2027-01-26');
      expect(s.cutoff).toBe('2027-02-01'); // still derived
      expect(s.live).toBe('2027-02-02'); // overridden
      expect(actionsFor('2027-02-02', RULES).find((a) => a.id === 'live-update')).toMatchObject({ sprintNumber: 28 });
    } finally {
      restoreOverride(28);
    }
  });
});

describe('workingDaysIn', () => {
  it('is 10 for a normal sprint', () => {
    expect(workingDaysIn(sprintDates(21))).toBe(10);
  });
  it('follows an end override so the page never shows "day 15 of 10"', () => {
    OVERRIDES[27] = { end: '2027-01-08' };
    try {
      const s = sprintDates(27); // starts Mon 21 Dec 2026
      expect(workingDaysIn(s)).toBe(15);
      expect(context('2027-01-08').dayOfSprint).toBeLessThanOrEqual(workingDaysIn(s));
    } finally {
      restoreOverride(27);
    }
  });
});

describe('year-end break', () => {
  it('21 Dec 2026 to 1 Jan 2027 is a break: no sprint day, 2027-1 still current, 2027-2 next', () => {
    for (const d of ['2026-12-21', '2026-12-24', '2026-12-31', '2027-01-01']) {
      const c = context(d);
      expect(c.isBreak).toBe(true);
      expect(c.dayOfSprint).toBeNull();
      expect(c.current.label).toBe('2027-1');
      expect(c.next.label).toBe('2027-2');
    }
    expect(context('2026-12-18').isBreak).toBe(false);
    expect(context('2027-01-04')).toMatchObject({ isBreak: false, dayOfSprint: 1 });
  });
});
