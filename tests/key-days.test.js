// Key days of the 28 Sep - 19 Oct 2026 cycle and the year end, per role group.
// Expected copy written by hand from the process, not from engine output. Owner to confirm (2026-10-02).
//
// Copy direction (owner, 2026-10-02): always name the sprint for anything that is not in the current sprint.
// The current sprint is the one being built (2026-21 from Mon 28 Sep, 2026-22 from Mon 12 Oct, 2027-1 from Mon 7 Dec,
// 2027-2 from Mon 4 Jan). Its own code freeze needs no label; the previous sprint's Demo, UAT, cut-off and Live
// update and the next sprint's planning always carry theirs.
import { describe, it, expect } from 'vitest';
import { resolveDay } from '../public/board.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';
import * as DUTY from '../public/duty.js';

process.env.TZ ||= 'Europe/Tallinn';

const ALL = ['Everyone', 'IM/AM', 'Dev', 'QA', 'Lead', 'Analyst'];
const day = (date, time, role) => resolveDay({ date, time, role, rules: RULES, duty: DUTY, holidays: HOLIDAYS });
const tabOf = (m) => m.tab.replace(/ · Sprint Board$/, '');

// [date, time, roles, headline, tab]
const KEY_DAYS = [
  ['2026-09-28', '09:00', ALL, '2026-21 starts today. 2026-20 Demo update tomorrow.', '2026-20 Demo tomorrow · 2026-21 day 1'],
  ['2026-09-30', '09:00', ALL, '2026-20 UAT opens: deadline Mon 5 Oct 12:00', '2026-20 UAT opens · 2026-21 day 3'],
  ['2026-10-01', '09:00', ['Everyone', 'IM/AM', 'Dev', 'QA', 'Analyst'], 'Full Refinement at 14:00', 'Refinement 14:00 · 2026-21 day 4'],
  ['2026-10-01', '09:00', ['Lead'], 'No deadlines today', '2026-21 day 4'],
  // 20:30: the 14:00 Full Refinement is over. Nothing else is due today for anyone.
  ['2026-10-01', '20:30', ALL, 'No deadlines today', '2026-21 day 4'],
  ['2026-10-02', '09:00', ALL, 'Last working day before the 2026-20 cut-off', '2026-20 cut-off Mon 12:00'],
  ['2026-10-03', '09:00', ALL, 'Weekend. Mon 5 Oct: 2026-20 fix cut-off 12:00 and Live update.', 'Weekend · 2026-20 cut-off Mon 12:00'],
  ['2026-10-05', '09:00', ALL, '2026-20 fix cut-off at 12:00', '2026-20 cut-off 12:00 · Live tonight'],
  ['2026-10-05', '13:00', ALL, '2026-20 cut-off passed. Live update tonight.', '2026-20 cut-off passed · Live tonight'],
  ['2026-10-05', '20:30', ALL, '2026-20 Live update tonight', '2026-20 Live update tonight'],
  ['2026-10-08', '09:00', ALL, '2026-22 sprint planning today. Code freeze starts tomorrow.', '2026-22 planning today · 2026-21 day 9'],
  ['2026-10-09', '09:00', ALL, 'Code freeze starts today', 'Code freeze starts · 2026-21 day 10'],
  ['2026-10-13', '09:00', ALL, '2026-21 Demo update tonight', '2026-21 Demo update tonight'],
  ['2026-12-24', '09:00', ALL, 'No deadlines today', '2027-1 day 14'],
  // Mon 28 Dec: the IM/AM have one desk task for 2027-2 planning. Not a deadline day for anyone else.
  ['2026-12-28', '09:00', ['Everyone', 'IM/AM'], 'Nothing key today', '2027-1 day 16'],
  ['2026-12-28', '09:00', ['Dev', 'QA', 'Lead', 'Analyst'], 'No deadlines today', '2027-1 day 16'],
  ['2027-01-04', '09:00', ALL, '2027-2 starts today. 2027-1 Demo update tomorrow.', '2027-1 Demo tomorrow · 2027-2 day 1'],
  ['2027-01-06', '09:00', ALL, '2027-1 UAT opens: deadline Mon 11 Jan 12:00', '2027-1 UAT opens · 2027-2 day 3'],
];

describe('key days: headline and tab title (hand-written)', () => {
  const rows = KEY_DAYS.flatMap(([date, time, roles, headline, tab]) => roles.map((role) => [`${date} ${time} ${role}`, date, time, role, headline, tab]));
  it.each(rows)('%s', (_n, date, time, role, headline, tab) => {
    const m = day(date, time, role);
    expect(m.headline).toBe(headline);
    expect(tabOf(m)).toBe(tab);
  });
});

describe('key days: eyebrow on release days names both sprints', () => {
  it.each([
    ['2026-10-05', '09:00', '2026-20 cut-off · 2026-21 day 6 of 10'],
    ['2026-10-05', '20:30', '2026-20 cut-off · 2026-21 day 6 of 10'],
    ['2026-10-13', '09:00', '2026-21 Demo update · 2026-22 day 2 of 10'],
    ['2026-10-02', '09:00', '2026-21 · day 5 of 10'],
    ['2026-10-03', '09:00', '2026-21 · weekend'],
  ])('%s %s', (date, time, meta) => {
    for (const role of ALL) expect(day(date, time, role).meta, role).toBe(meta);
  });
});

// [date, time, role, sub-line]
const SUBS = [
  // Review 1.5: the Everyone line names the role of a role-only task (and its sprint when not the current one).
  ['2026-10-01', '09:00', 'Everyone', 'IM/AM: Collect UAT feedback from clients (2026-20).'],
  // Review 1.12: on the cut-off eve every role sees the cut-off time.
  ['2026-10-02', '09:00', 'QA', 'Nothing due for QA today. 2026-20 fix cut-off Mon 5 Oct 12:00.'],
  // The Lead's own item that day (mid-sprint check, day 5) comes first.
  ['2026-10-02', '09:00', 'Lead', 'Mid-sprint delivery check. 2026-20 fix cut-off Mon 5 Oct 12:00.'],
  ['2026-10-02', '09:00', 'Analyst', 'Nothing due for Analyst today. 2026-20 fix cut-off Mon 5 Oct 12:00.'],
  // Review 1.8: freeze lines on a new sprint's day 1 name the sprint that is frozen.
  ['2027-01-04', '09:00', 'Dev', '2027-1 code freeze holds until the Demo update tomorrow evening.'],
  ['2027-01-04', '09:00', 'QA', '2027-1 regression runs until the Demo update tomorrow evening.'],
  // Review 1.14: "Run regression opens" -> "Regression runs from today until ...".
  ['2026-10-09', '09:00', 'QA', 'Regression runs from today until the Demo update Tue 13 Oct (evening).'],
  // Review 1.11: the IM/AM task on 28 Dec is named under "Nothing key today".
  ['2026-12-28', '09:00', 'Everyone', 'IM/AM: Make promised tickets queue-ready (2027-2).'],
];

describe('key days: sub-lines (hand-written)', () => {
  it.each(SUBS)('%s %s %s', (date, time, role, sub) => {
    expect(day(date, time, role).sub).toBe(sub);
  });
});

describe('key days: Next for you', () => {
  const view = (m) => m.agenda.next && { heading: m.agenda.next.heading, items: m.agenda.next.items.map((x) => [x.time, `${x.prefix || ''}${x.title}`, x.suffix].filter(Boolean).join(' ')) };

  it('Sat 5 Dec: the next items are on Tue 8 Dec, which is not "Tomorrow" (review 1.4)', () => {
    expect(view(day('2026-12-05', '09:00', 'Dev')).heading).toBe('Next for you · Tue 8 Dec');
    expect(view(day('2026-12-05', '09:00', 'IM/AM')).heading).toBe('Next for you · Tue 8 Dec');
  });

  it('Fri 2 Oct, Dev: Monday in the order of the day, with "if needed" and the sprint (review 1.10)', () => {
    expect(view(day('2026-10-02', '09:00', 'Dev'))).toEqual({
      heading: 'Next for you · Mon 5 Oct',
      items: [
        '12:00 Fix cut-off 2026-20',
        'Revert items that missed the cut-off if needed · 2026-20',
        '20:00 Live update 2026-20',
        'Create the Golive Release page 2026-20',
      ],
    });
  });

  it('Everyone gets "Next", with the role on role-only tasks', () => {
    const v = view(day('2026-09-28', '09:00', 'Everyone'));
    expect(v.heading).toBe('Tomorrow, Tue 29 Sep');
    expect(v.items).toContain('17:00 Demo update 2026-20');
    expect(v.items).toContain('IM/AM: Prepare UAT instructions for clients 2026-20');
    expect(view(day('2026-10-02', '09:00', 'Everyone')).heading).toBe('Next · Mon 5 Oct');
  });
});
