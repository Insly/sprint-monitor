import { describe, it, expect } from 'vitest';
import { RULES, SOURCES } from '../public/rules.js';
import { actionsFor, upcoming, addDays, DATE_KEYS } from '../public/schedule.js';

const WHO = ['Dev', 'QA', 'IM/AM', 'Analyst', 'Lead', 'All'];
const KINDS = ['deadline', 'meeting', 'deploy', 'window', 'reminder'];
const SPRINTS = ['previous', 'current', 'next', null];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

describe('rules.js schema', () => {
  it('has unique kebab-case ids', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('every source entry has a title and an https URL', () => {
    for (const [key, s] of Object.entries(SOURCES)) {
      expect(s.title, key).toBeTruthy();
      expect(s.url, key).toMatch(/^https:\/\//);
    }
  });

  it.each(RULES.map((r) => [r.id, r]))('%s follows the contract schema', (_id, r) => {
    expect(typeof r.title).toBe('string');
    expect(Array.isArray(r.who) && r.who.length > 0).toBe(true);
    for (const w of r.who) expect(WHO).toContain(w);
    expect(SPRINTS).toContain(r.sprint ?? null);
    expect(KINDS).toContain(r.kind);
    expect(Object.keys(SOURCES)).toContain(r.source);
    if (r.time != null) expect(r.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    const w = r.when;
    if ('weekly' in w) {
      expect(WEEKDAYS).toContain(w.weekly);
      if (w.week != null) expect([1, 2]).toContain(w.week);
    } else if ('on' in w) {
      expect(DATE_KEYS).toContain(w.on);
      if (w.offset != null) expect(Number.isInteger(w.offset)).toBe(true);
    } else {
      expect(DATE_KEYS).toContain(w.from);
      expect(DATE_KEYS).toContain(w.to);
    }
  });
});

describe('rules.js smoke test', () => {
  it('every rule resolves without throwing for every day 2026-08-03 to 2026-12-31', () => {
    const fired = new Set();
    for (let d = '2026-08-03'; d <= '2026-12-31'; d = addDays(d, 1)) {
      const acts = actionsFor(d, RULES);
      for (const a of acts) fired.add(a.id);
      expect(() => upcoming(d, RULES, 10)).not.toThrow();
    }
    // Every rule fires at least once in that span.
    expect(RULES.filter((r) => !fired.has(r.id)).map((r) => r.id)).toEqual([]);
  });
});
