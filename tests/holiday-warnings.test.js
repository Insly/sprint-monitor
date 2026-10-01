// Holiday heads-up (owner, 2026-10-01): nothing moves; every public holiday (EE or PL, treated the same,
// weekend ones included) is announced on the working day before it and marked on the day itself.
// Shown for every role as a muted note at the top of "Today"; band, headline and sub-line do not change.
import { describe, it, expect } from 'vitest';
import { holidayWarnings, actionsFor, sprintDates, sprintByLabel, ROLES, addDays } from '../public/schedule.js';
import { resolveDay } from '../public/board.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';
import * as DUTY from '../public/duty.js';

process.env.TZ ||= 'Europe/Tallinn';

const W = (date) => holidayWarnings(date, HOLIDAYS);
const brief = (date) => W(date).map((w) => [w.holidayDate, w.countries.join(',')]);

describe('holidayWarnings(date, holidays)', () => {
  it('Thu 31 Dec warns about Fri 1 Jan (EE, PL)', () => {
    expect(W('2026-12-31')).toEqual([{
      holidayDate: '2027-01-01', countries: ['EE', 'PL'], names: ['New Year\'s Day'],
      text: 'Tomorrow, Fri 1 Jan, is a public holiday (EE, PL): New Year\'s Day.',
    }]);
  });

  it('Tue 5 Jan warns about Wed 6 Jan (PL only)', () => {
    expect(W('2027-01-05')).toEqual([{
      holidayDate: '2027-01-06', countries: ['PL'], names: ['Epiphany'],
      text: 'Tomorrow, Wed 6 Jan, is a public holiday (PL): Epiphany.',
    }]);
  });

  it('Wed 23 Dec warns about Thu 24, Fri 25 and Sat 26 Dec (weekend holidays included, owner)', () => {
    expect(W('2026-12-23').map((w) => w.text)).toEqual([
      'Tomorrow, Thu 24 Dec, is a public holiday (EE, PL): Christmas Eve.',
      'Fri 25 Dec is a public holiday (EE, PL): Christmas Day.',
      'Sat 26 Dec is a public holiday (EE, PL): Boxing Day, Second Day of Christmas.',
    ]);
  });

  it('the holiday itself is marked "Today, …", also on a weekend', () => {
    expect(W('2027-01-01').map((w) => w.text)).toEqual(["Today, Fri 1 Jan, is a public holiday (EE, PL): New Year's Day."]);
    expect(W('2026-12-26').map((w) => w.text)).toEqual(['Today, Sat 26 Dec, is a public holiday (EE, PL): Boxing Day, Second Day of Christmas.']);
    expect(W('2027-01-06').map((w) => w.text)).toEqual(['Today, Wed 6 Jan, is a public holiday (PL): Epiphany.']);
  });

  it('no note on ordinary days that are not the working day before a holiday', () => {
    for (const d of ['2026-12-22', '2026-12-28', '2027-01-04', '2027-01-07']) expect(W(d), d).toEqual([]);
  });

  it('a Monday holiday is announced on the Friday, without "Tomorrow"; a Sunday holiday too', () => {
    const test = [{ date: '2027-03-29', country: 'PL', name: 'Easter Monday' }];
    expect(holidayWarnings('2027-03-26', test)).toEqual([{
      holidayDate: '2027-03-29', countries: ['PL'], names: ['Easter Monday'],
      text: 'Mon 29 Mar is a public holiday (PL): Easter Monday.',
    }]);
    // Real data: Fri 26 Mar is Good Friday (EE), so Thu 25 Mar announces Fri 26, Sun 28 (Easter Sunday) and Mon 29.
    expect(brief('2027-03-25')).toEqual([['2027-03-26', 'EE'], ['2027-03-28', 'EE,PL'], ['2027-03-29', 'PL']]);
  });

  it('without a holiday list there are no warnings', () => {
    expect(holidayWarnings('2026-12-31')).toEqual([]);
    expect(holidayWarnings('2026-12-31', null)).toEqual([]);
  });

  it('every warning in Dec 2026 - Jan 2027', () => {
    const got = [];
    for (let d = '2026-12-01'; d <= '2027-01-31'; d = addDays(d, 1)) for (const w of W(d)) got.push(`${d}: ${w.text}`);
    expect(got).toEqual([
      '2026-12-23: Tomorrow, Thu 24 Dec, is a public holiday (EE, PL): Christmas Eve.',
      '2026-12-23: Fri 25 Dec is a public holiday (EE, PL): Christmas Day.',
      '2026-12-23: Sat 26 Dec is a public holiday (EE, PL): Boxing Day, Second Day of Christmas.',
      '2026-12-24: Today, Thu 24 Dec, is a public holiday (EE, PL): Christmas Eve.',
      '2026-12-24: Tomorrow, Fri 25 Dec, is a public holiday (EE, PL): Christmas Day.',
      '2026-12-24: Sat 26 Dec is a public holiday (EE, PL): Boxing Day, Second Day of Christmas.',
      '2026-12-25: Today, Fri 25 Dec, is a public holiday (EE, PL): Christmas Day.',
      '2026-12-25: Tomorrow, Sat 26 Dec, is a public holiday (EE, PL): Boxing Day, Second Day of Christmas.',
      '2026-12-26: Today, Sat 26 Dec, is a public holiday (EE, PL): Boxing Day, Second Day of Christmas.',
      "2026-12-31: Tomorrow, Fri 1 Jan, is a public holiday (EE, PL): New Year's Day.",
      "2027-01-01: Today, Fri 1 Jan, is a public holiday (EE, PL): New Year's Day.",
      '2027-01-05: Tomorrow, Wed 6 Jan, is a public holiday (PL): Epiphany.',
      '2027-01-06: Today, Wed 6 Jan, is a public holiday (PL): Epiphany.',
    ]);
  });
});

describe('nothing moves', () => {
  const ids = (d) => actionsFor(d, RULES).map((a) => a.id);
  it('items stay on their holiday dates', () => {
    expect(ids('2027-01-01')).toEqual(expect.arrayContaining(['release-check-before-demo', 'bug-retro-prep', 'send-early-start-list', 'code-freeze']));
    expect(ids('2026-12-31')).not.toContain('release-check-before-demo');
    expect(ids('2026-12-31')).not.toContain('bug-retro-prep');
    expect(ids('2026-12-25')).toContain('candidate-hours-vs-capacity');
    expect(ids('2026-12-23')).not.toContain('candidate-hours-vs-capacity');
    expect(ids('2027-01-06')).toEqual(expect.arrayContaining(['inform-client-uat', 'pre-refinement', 'rank-refinement-queue']));
  });
  it('weekly rules are not dropped on a holiday (Wed 24 Feb 2027, EE)', () => {
    expect(ids('2027-02-24')).toEqual(expect.arrayContaining(['pre-refinement', 'rank-refinement-queue']));
  });
  it('sprint dates are unchanged', () => {
    const s = sprintDates(sprintByLabel('2027-1'));
    expect([s.end, s.freezeStart, s.bugRetro, s.demoStart, s.uatStart, s.cutoff, s.live])
      .toEqual(['2027-01-01', '2027-01-01', '2027-01-04', '2027-01-05', '2027-01-06', '2027-01-11', '2027-01-11']);
    expect(sprintDates(sprintByLabel('2027-2')).planning).toBe('2026-12-31');
  });
});

describe('resolveDay: warning for every role, nothing else changes', () => {
  const DAYS = ['2026-12-23', '2026-12-31', '2027-01-05'];
  for (const date of DAYS) {
    it(`${date}: same warnings for all roles; band, headline, sub-line and agenda as without holidays`, () => {
      for (const role of ROLES) {
        for (const time of ['09:00', '12:00', '17:00', '20:00']) {
          const withH = resolveDay({ date, time, role, rules: RULES, duty: DUTY, holidays: HOLIDAYS });
          const without = resolveDay({ date, time, role, rules: RULES, duty: DUTY, holidays: [] });
          expect(withH.holidayWarnings, `${role} ${time}`).toEqual(W(date));
          expect(withH.holidayWarnings.length, `${role} ${time}`).toBeGreaterThan(0);
          expect(without.holidayWarnings).toEqual([]);
          for (const k of ['band', 'headline', 'sub', 'tab', 'favicon', 'order', 'agenda']) {
            expect(withH[k], `${date} ${time} ${role} ${k}`).toEqual(without[k]);
          }
        }
      }
    });
  }
  it('the error model (rules failed to load) still carries the warning', () => {
    const m = resolveDay({ date: '2026-12-31', rules: null, holidays: HOLIDAYS });
    expect(m.holidayWarnings.map((w) => w.holidayDate)).toEqual(['2027-01-01']);
  });
});
