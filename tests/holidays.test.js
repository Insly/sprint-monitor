import { describe, it, expect } from 'vitest';
import { HOLIDAYS, holidaysBetween } from '../public/holidays.js';
import { addDays, parseDate, weekdayOf } from '../public/schedule.js';

process.env.TZ ||= 'Europe/Tallinn';

// Anonymous Gregorian computus, written independently of the data so it can check it.
function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const has = (date, country, name) => HOLIDAYS.some((h) => h.date === date && h.country === country && (!name || h.name === name));

describe('holidays.js data', () => {
  it('every date is a valid YYYY-MM-DD calendar date in 2026 or 2027', () => {
    for (const h of HOLIDAYS) {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(() => parseDate(h.date), h.date).not.toThrow();
      expect(['2026', '2027']).toContain(h.date.slice(0, 4));
    }
  });

  it('country is EE or PL only, and every row has a name', () => {
    for (const h of HOLIDAYS) {
      expect(['EE', 'PL']).toContain(h.country);
      expect(typeof h.name === 'string' && h.name.length > 0).toBe(true);
      expect(Object.keys(h).sort()).toEqual(['country', 'date', 'name']);
    }
  });

  it('has no duplicate (date, country)', () => {
    const keys = HOLIDAYS.map((h) => `${h.date}|${h.country}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is sorted by date', () => {
    const dates = HOLIDAYS.map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('has the full official lists: EE 12 days and PL 14 days per year', () => {
    for (const y of ['2026', '2027']) {
      expect(HOLIDAYS.filter((h) => h.country === 'EE' && h.date.startsWith(y)).length, `EE ${y}`).toBe(12);
      expect(HOLIDAYS.filter((h) => h.country === 'PL' && h.date.startsWith(y)).length, `PL ${y}`).toBe(14);
    }
  });

  it('Easter Sunday is 5 Apr 2026 and 28 Mar 2027 (computus check)', () => {
    expect(easter(2026)).toBe('2026-04-05');
    expect(easter(2027)).toBe('2027-03-28');
  });

  it.each([2026, 2027])('Easter-derived dates for %i are correct', (year) => {
    const e = easter(year);
    // EE: Good Friday, Easter Sunday, Pentecost
    expect(has(addDays(e, -2), 'EE', 'Good Friday')).toBe(true);
    expect(has(e, 'EE', 'Easter Sunday')).toBe(true);
    expect(has(addDays(e, 49), 'EE', 'Pentecost')).toBe(true);
    // PL: Easter Sunday, Easter Monday, Pentecost, Corpus Christi
    expect(has(e, 'PL', 'Easter Sunday')).toBe(true);
    expect(has(addDays(e, 1), 'PL', 'Easter Monday')).toBe(true);
    expect(has(addDays(e, 49), 'PL', 'Pentecost')).toBe(true);
    expect(has(addDays(e, 60), 'PL', 'Corpus Christi')).toBe(true);
    expect(weekdayOf(addDays(e, -2))).toBe('Fri');
    expect(weekdayOf(addDays(e, 60))).toBe('Thu');
  });

  it('spells out the explicit Easter-based dates', () => {
    expect(has('2026-04-03', 'EE', 'Good Friday')).toBe(true);
    expect(has('2026-05-24', 'PL', 'Pentecost')).toBe(true);
    expect(has('2026-06-04', 'PL', 'Corpus Christi')).toBe(true);
    expect(has('2027-03-26', 'EE', 'Good Friday')).toBe(true);
    expect(has('2027-03-29', 'PL', 'Easter Monday')).toBe(true);
    expect(has('2027-05-27', 'PL', 'Corpus Christi')).toBe(true);
  });

  it('PL Christmas Eve is a holiday (from 2025), EE too', () => {
    for (const y of [2026, 2027]) {
      expect(has(`${y}-12-24`, 'PL', 'Christmas Eve')).toBe(true);
      expect(has(`${y}-12-24`, 'EE', 'Christmas Eve')).toBe(true);
    }
  });

  it('includes the fixed-date holidays of both countries', () => {
    for (const y of [2026, 2027]) {
      for (const md of ['01-01', '02-24', '05-01', '06-23', '06-24', '08-20', '12-25', '12-26']) expect(has(`${y}-${md}`, 'EE'), `EE ${y}-${md}`).toBe(true);
      for (const md of ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26']) expect(has(`${y}-${md}`, 'PL'), `PL ${y}-${md}`).toBe(true);
    }
  });
});

describe('holidaysBetween', () => {
  it('returns the year-end weekday holidays and drops the Saturday 26 Dec', () => {
    const list = holidaysBetween('2026-12-18', '2027-01-11');
    expect(list.map((h) => `${h.date} ${h.country}`)).toEqual([
      '2026-12-24 EE', '2026-12-24 PL', '2026-12-25 EE', '2026-12-25 PL',
      '2027-01-01 EE', '2027-01-01 PL', '2027-01-06 PL',
    ]);
  });

  it('includes weekend holidays when weekdaysOnly is false', () => {
    const list = holidaysBetween('2026-12-26', '2026-12-26', { weekdaysOnly: false });
    expect(list.map((h) => h.country)).toEqual(['EE', 'PL']);
  });

  it('is inclusive at both ends and empty for a quiet span', () => {
    expect(holidaysBetween('2027-01-06', '2027-01-06').length).toBe(1);
    expect(holidaysBetween('2026-09-24', '2026-10-19')).toEqual([]);
  });
});
