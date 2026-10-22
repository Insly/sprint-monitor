// Mid-sprint check on the middle working day of the sprint (owner, 2026-10-22): Friday of week 1 in a normal
// 10-day sprint, day 10 (Fri 18 Dec) in the 20-day 2027-1.
import { describe, it, expect } from 'vitest';
import { sprintDates, actionsFor, addDays } from '../public/schedule.js';
import { RULES } from '../public/rules.js';

const firesOn = (from, to) => {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (actionsFor(d, RULES).some((a) => a.id === 'mid-sprint-check')) out.push(d);
  return out;
};

describe('mid-sprint check', () => {
  it('normal sprints: Friday of week 1 (unchanged)', () => {
    expect(sprintDates(22).mid).toBe('2026-10-16');
    expect(firesOn('2026-10-26', '2026-11-06')).toEqual(['2026-10-30']);
  });
  it('2027-1 (20 working days): day 10, Fri 18 Dec, once', () => {
    expect(sprintDates(26).mid).toBe('2026-12-18');
    expect(firesOn('2026-12-07', '2027-01-01')).toEqual(['2026-12-18']);
  });
});
