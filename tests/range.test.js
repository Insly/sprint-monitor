// Review 2026-10-02, item 2.3: dates the board cannot label. Expected copy written by hand.
// Before the anchor (2026-17 = Mon 3 Aug 2026) and past the last YEAR_STARTS year (2027), the page says so
// instead of showing "-155 day 3" or "2027-28".
import { describe, it, expect } from 'vitest';
import { resolveDay } from '../public/board.js';
import { numberingGap, sprintByLabel, isNumbered, sprintForDate } from '../public/schedule.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';
import * as DUTY from '../public/duty.js';

process.env.TZ ||= 'Europe/Tallinn';

const day = (date, role = 'Everyone') => resolveDay({ date, time: '09:00', role, rules: RULES, duty: DUTY, holidays: HOLIDAYS });
const LABEL = /\b(?:-?\d+|\d{4}-\d+) day\b|\b2027-(?:2[89]|[3-9]\d)\b|(?<![\d-])-\d+\b/;

describe('before the anchor: "No board before 2026-17"', () => {
  it.each(['2026-08-02', '2026-07-01', '2025-01-01'])('%s', (date) => {
    expect(numberingGap(date)).toEqual({ kind: 'before', text: 'No board before 2026-17' });
    for (const role of ['Everyone', 'Dev']) {
      const m = day(date, role);
      expect(m.headline).toBe('No board before 2026-17');
      expect(m.meta).toBe('No board before 2026-17');
      expect(m.tab).toBe('No board before 2026-17 · Sprint Board');
      expect(m.band).toBe('error');
      expect(m.rail).toEqual([]);
      expect(m.comingUp).toEqual([]);
      expect(m.duty).toBeNull();
      expect(JSON.stringify(m)).not.toMatch(LABEL);
    }
  });

  it('the anchor day itself is a normal day', () => {
    expect(numberingGap('2026-08-03')).toBeNull();
    expect(day('2026-08-03').meta).toBe('2026-17 · day 1 of 10');
  });

  it('the day before the anchor sprint starts (Sun 2 Aug) already has no board', () => {
    expect(day('2026-08-02').headline).toBe('No board before 2026-17');
    expect(sprintByLabel('2026-17')).toBe(17);
  });
});

describe('past the configured years: "Sprint numbering for 2028 is not configured"', () => {
  it.each(['2028-01-10', '2028-03-01', '2027-12-29'])('%s', (date) => {
    expect(numberingGap(date)).toEqual({ kind: 'after', year: 2028, text: 'Sprint numbering for 2028 is not configured' });
    const m = day(date);
    expect(m.headline).toBe('Sprint numbering for 2028 is not configured');
    expect(m.tab).toBe('Sprint numbering for 2028 is not configured · Sprint Board');
    expect(m.rail).toEqual([]);
    expect(JSON.stringify(m)).not.toMatch(LABEL);
  });

  it('a 2028 sprint gets no "2027-NN" label or sprint view', () => {
    const n2028 = sprintForDate('2028-01-10');
    expect(isNumbered(n2028)).toBe(false);
    expect(sprintByLabel('2027-28')).toBeNull();
    expect(sprintByLabel('2027-1')).toBe(26);
  });

  it('a 2027 day whose next sprint is still in 2027 is a normal day', () => {
    expect(numberingGap('2027-11-15')).toBeNull();
    expect(day('2027-11-15').headline).not.toMatch(/not configured/);
  });
});
