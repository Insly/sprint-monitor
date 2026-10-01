// v2.1 engine API (DESIGN.md v2.1-C): sprintByLabel, sprintDetail, zonedNow, formatAcrossZones,
// sprintPhase, workingDaysBetween, holidayTouchesKeyDates. Fixture: STATES.md §10.
import { describe, it, expect, afterEach } from 'vitest';
import {
  sprintByLabel, sprintDetail, sprintDates, zonedNow, zonedInstant, formatAcrossZones,
  deviceDiffersFromTallinn, workingDaysBetween, previousWorkingDay, holidayTouchesKeyDates,
  fmtDay, keyTimes, roleMatches, UNCONFIRMED_FROM,
} from '../public/schedule.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';

process.env.TZ ||= 'Europe/Tallinn';
const SUITE_TZ = process.env.TZ;

describe('sprintByLabel', () => {
  it.each([
    ['2026-1', 1], ['2026-21', 21], ['2026-25', 25], ['2027-1', 26], ['2027-2', 27], ['2027-14', 39],
  ])('%s -> %i', (label, n) => {
    expect(sprintByLabel(label)).toBe(n);
    expect(sprintDates(n).label).toBe(label);
  });

  it.each(['', 'x', '2026', '2026-0', '2026-26', '2025-3', '2026-21x', '2026_21', null, undefined])('%s -> null', (label) => {
    expect(sprintByLabel(label)).toBeNull();
  });
});

describe('formatAcrossZones (three offices)', () => {
  it('Live 20:00 Tallinn = 19:00 Warsaw = 18:00 London, summer and winter', () => {
    expect(formatAcrossZones('2026-10-05', '20:00')).toBe('20:00 Tallinn · 19:00 Warsaw · 18:00 London');
    expect(formatAcrossZones('2026-11-02', '20:00')).toBe('20:00 Tallinn · 19:00 Warsaw · 18:00 London');
    expect(formatAcrossZones('2027-01-11', '12:00')).toBe('12:00 Tallinn · 11:00 Warsaw · 10:00 London');
  });

  it('Demo 17:00 Tallinn = 16:00 Warsaw = 15:00 London', () => {
    expect(formatAcrossZones('2026-09-29', '17:00')).toBe('17:00 Tallinn · 16:00 Warsaw · 15:00 London');
  });

  it('zonedInstant is the real instant (20:00 Tallinn summer = 17:00 UTC, winter = 18:00 UTC)', () => {
    expect(zonedInstant('2026-10-05', '20:00').toISOString()).toBe('2026-10-05T17:00:00.000Z');
    expect(zonedInstant('2026-11-02', '20:00').toISOString()).toBe('2026-11-02T18:00:00.000Z');
  });
});

describe('Tallinn time, whatever the device zone (STATES.md §1)', () => {
  afterEach(() => { process.env.TZ = SUITE_TZ; });

  // 22:30 UTC Sun 4 Oct = 01:30 Mon 5 Oct in Tallinn, still Sun 4 Oct in New York and London.
  const LATE = new Date('2026-10-04T22:30:00Z');
  // 09:10 UTC Mon 5 Oct = 12:10 Tallinn (cut-off passed), 10:10 London, 05:10 New York.
  const NOON = new Date('2026-10-05T09:10:00Z');

  it.each(['America/New_York', 'Europe/London'])('device in %s: zonedNow returns the Tallinn date and time', (zone) => {
    process.env.TZ = zone;
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
    expect(LATE.getDate()).toBe(4); // the device thinks it is still Sunday
    expect(zonedNow('Europe/Tallinn', LATE)).toEqual({ date: '2026-10-05', time: '01:30' });
    expect(zonedNow('Europe/Tallinn', NOON)).toEqual({ date: '2026-10-05', time: '12:10' });
    expect(deviceDiffersFromTallinn(NOON)).toBe(true);
    expect(formatAcrossZones('2026-10-05', '20:00')).toBe('20:00 Tallinn · 19:00 Warsaw · 18:00 London');
  });

  it('device in Tallinn: no "(Tallinn time)" suffix needed', () => {
    process.env.TZ = 'Europe/Tallinn';
    expect(deviceDiffersFromTallinn(NOON)).toBe(false);
    expect(zonedNow(undefined, NOON)).toEqual({ date: '2026-10-05', time: '12:10' });
  });

  it('the EU DST switch (Sun 25 Oct 2026, 04:00 Tallinn) is handled', () => {
    expect(zonedNow('Europe/Tallinn', new Date('2026-10-25T00:30:00Z')).time).toBe('03:30');
    expect(zonedNow('Europe/Tallinn', new Date('2026-10-25T01:30:00Z')).time).toBe('03:30');
  });
});

describe('working-day helpers', () => {
  it('workingDaysBetween counts weekdays after the first date', () => {
    expect(workingDaysBetween('2026-10-01', '2026-10-09')).toBe(6);
    expect(workingDaysBetween('2026-10-01', '2026-10-01')).toBe(0);
    expect(workingDaysBetween('2026-10-02', '2026-10-05')).toBe(1);
    expect(workingDaysBetween('2026-10-09', '2026-10-01')).toBe(-6);
  });

  it('previousWorkingDay skips the weekend', () => {
    expect(previousWorkingDay('2026-10-05')).toBe('2026-10-02');
    expect(previousWorkingDay('2026-10-06')).toBe('2026-10-05');
  });

  it('keyTimes reads the times from rules.js', () => {
    expect(keyTimes(RULES)).toEqual({ cutoff: '12:00', demo: '17:00', live: '20:00' });
    expect(keyTimes([])).toEqual({ cutoff: '12:00', demo: '17:00', live: '20:00' });
  });

  it('roleMatches: Everyone sees all; All-rules match every role', () => {
    expect(roleMatches({ who: ['Dev'] }, 'Everyone')).toBe(true);
    expect(roleMatches({ who: ['All'] }, 'QA')).toBe(true);
    expect(roleMatches({ who: ['Dev'] }, 'QA')).toBe(false);
  });

  it('UNCONFIRMED_FROM is 28 (2027-3)', () => {
    expect(UNCONFIRMED_FROM).toBe(28);
    expect(sprintDates(28).label).toBe('2027-3');
  });
});

describe('sprintDetail: #sprint-2026-21 on Thu 1 Oct 09:00, IM / AM (STATES.md §10)', () => {
  const det = sprintDetail(21, '2026-10-01', RULES, { role: 'IM/AM', time: '09:00', holidays: HOLIDAYS });

  it('is the current sprint, with the current-sprint status line', () => {
    expect(det.relation).toBe('current');
    expect(det.phase).toEqual({ phase: 'Build', label: 'Sprint day 4 of 10 · code freeze Fri 9 Oct' });
    expect(det.sprint.label).toBe('2026-21');
  });

  it('milestones, dates, times and statuses', () => {
    const rows = det.milestones.map((m) => [m.key, fmtDay(m.date), m.time, m.status, m.workingDaysAway]);
    expect(rows).toEqual([
      ['planning', 'Thu 24 Sep', null, 'passed', -5],
      ['start', 'Mon 28 Sep', null, 'passed', -3],
      ['freezeStart', 'Fri 9 Oct', null, 'coming', 6],
      ['bugRetro', 'Mon 12 Oct', null, 'coming', 7],
      ['demoStart', 'Tue 13 Oct', '17:00', 'coming', 8],
      ['uatStart', 'Wed 14 Oct', null, 'coming', 9],
      ['cutoff', 'Mon 19 Oct', '12:00', 'coming', 12],
      ['live', 'Mon 19 Oct', '20:00', 'coming', 12],
    ]);
  });

  it('23 actions for IM / AM, 41 for Everyone', () => {
    expect(det.actions.length).toBe(23);
    expect(sprintDetail(21, '2026-10-01', RULES).actions.length).toBe(41);
    expect(sprintDetail(21, '2026-10-01', RULES, { role: 'Everyone' }).actions.length).toBe(41);
  });

  it('grouped Passed / Running / Coming as listed in STATES.md §10', () => {
    const group = (st) => det.actions.filter((a) => a.status === st).map((a) => `${a.date} ${a.id}`).sort();
    expect(group('passed')).toEqual([
      '2026-09-16 answer-parked-questions', '2026-09-17 full-refinement',
      '2026-09-23 definition-of-ready', '2026-09-23 priority-call-due', '2026-09-23 qa-estimate-present',
      '2026-09-23 uat-findings-to-planning', '2026-09-24 sprint-planning', '2026-09-28 sprint-start',
    ]);
    expect(group('running')).toEqual(['2026-09-28 log-time-daily', '2026-09-28 overrun-80']);
    expect(group('today')).toEqual([]);
    expect(group('coming')).toEqual([
      '2026-10-09 code-freeze',
      '2026-10-12 bug-retro', '2026-10-12 matrix-before-demo',
      '2026-10-14 check-own-items-demo', '2026-10-14 inform-client-uat', '2026-10-14 ready-for-live', '2026-10-14 uat-window',
      '2026-10-16 cutoff-reminder', '2026-10-16 matrix-before-live',
      '2026-10-19 confirm-live-to-client', '2026-10-19 cutoff-last-chase', '2026-10-19 fix-cutoff', '2026-10-19 tell-client-revert',
    ]);
  });

  it('windows are listed once, on their first day', () => {
    const freeze = det.actions.filter((a) => a.id === 'code-freeze');
    expect(freeze).toHaveLength(1);
    expect(freeze[0].dates).toEqual({ from: '2026-10-09', to: '2026-10-13' });
  });

  it('no public holidays (EE, PL) between planning and Live', () => {
    expect(det.holidays).toEqual([]);
    expect(det.holidaysAffecting).toEqual([]);
  });
});

describe('sprintDetail: other relations and timed milestones', () => {
  it('2026-20 on Mon 5 Oct: releasing; the cut-off passes at 12:00, Live at 20:00', () => {
    const at = (time) => Object.fromEntries(sprintDetail(20, '2026-10-05', RULES, { time }).milestones.map((m) => [m.key, m.status]));
    expect(sprintDetail(20, '2026-10-05', RULES).relation).toBe('previous');
    expect(at('11:59')).toMatchObject({ cutoff: 'today', live: 'today', uatStart: 'passed' });
    expect(at('12:00')).toMatchObject({ cutoff: 'passed', live: 'today' });
    expect(at('20:00')).toMatchObject({ cutoff: 'passed', live: 'passed' });
  });

  it('relations: past, next and upcoming', () => {
    expect(sprintDetail(19, '2026-10-01', RULES).relation).toBe('past');
    expect(sprintDetail(22, '2026-10-01', RULES).relation).toBe('next');
    expect(sprintDetail(26, '2026-10-01', RULES).relation).toBe('upcoming');
    expect(sprintDetail(19, '2026-10-01', RULES).milestones.every((m) => m.status === 'passed')).toBe(true);
  });

  it('2027-1: the year-end sprint, with holidays on its release dates', () => {
    const d = sprintDetail(26, '2026-10-01', RULES, { role: 'IM/AM', holidays: HOLIDAYS });
    expect(d.sprint.label).toBe('2027-1');
    expect(d.actions[0].date).toBe('2026-11-25');
    expect(d.holidays.map((h) => `${h.date} ${h.country}`)).toEqual([
      '2026-12-24 EE', '2026-12-24 PL', '2026-12-25 EE', '2026-12-25 PL',
      '2027-01-01 EE', '2027-01-01 PL', '2027-01-06 PL',
    ]);
    // Owner correction: 2027-1's freeze starts Fri 1 Jan, so 24-25 Dec are in the build, not the release.
    expect(d.holidaysAffecting.map((h) => `${h.date} ${h.country}`)).toEqual(['2027-01-01 EE', '2027-01-01 PL', '2027-01-06 PL']);
  });

  it('holidayTouchesKeyDates follows STATES.md §11 and ignores weekends', () => {
    const s = sprintDates(26);
    expect(holidayTouchesKeyDates(s, '2027-01-06')).toBe(true); // UAT opens
    expect(holidayTouchesKeyDates(s, '2026-12-24')).toBe(false); // build phase
    expect(holidayTouchesKeyDates(s, '2026-12-07')).toBe(true); // start day
    expect(holidayTouchesKeyDates(s, '2027-01-02')).toBe(false); // Saturday
  });
});
