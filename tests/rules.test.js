import { describe, it, expect } from 'vitest';
import { RULES, SOURCES } from '../public/rules.js';
import { actionsFor, upcoming, addDays, DATE_KEYS } from '../public/schedule.js';

const WHO = ['Dev', 'QA', 'IM/AM', 'Analyst', 'Lead', 'All'];
const KINDS = ['deadline', 'meeting', 'deploy', 'window', 'reminder'];
const SPRINTS = ['previous', 'current', 'next', null];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['morning', 'before-deploy', 'after-cutoff', 'evening', 'after-deploy'];

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
    // Optional v2 fields (DESIGN.md §14)
    if (r.slot != null) expect(SLOTS).toContain(r.slot);
    if (r.carryOver != null) expect(Number.isInteger(r.carryOver) && r.carryOver >= 1).toBe(true);
    if (r.links != null) {
      expect(Array.isArray(r.links)).toBe(true);
      for (const k of r.links) expect(Object.keys(SOURCES)).toContain(k);
    }
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

describe('rules.js v2 changes (DESIGN.md §14)', () => {
  const byId = (id) => RULES.find((r) => r.id === id);

  it('deploy rules carry the owner times: Demo 17:00, Live 20:00, cut-off 12:00', () => {
    expect(byId('demo-update').time).toBe('17:00');
    expect(byId('live-update').time).toBe('20:00');
    expect(byId('fix-cutoff').time).toBe('12:00');
  });

  it('the freeze ends with the Demo update; Ready for Live ends at the cut-off', () => {
    expect(byId('code-freeze').when).toEqual({ from: 'freezeStart', to: 'demoStart' });
    expect(byId('ready-for-live').when).toEqual({ from: 'uatStart', to: 'cutoff' });
  });

  it('carry-over items are the release pages and the Live confirmation', () => {
    expect(RULES.filter((r) => r.carryOver).map((r) => r.id).sort()).toEqual(['confirm-live-to-client', 'golive-page', 'release-page']);
  });

  it('new rules exist with the specified who / when / slot', () => {
    expect(byId('cutoff-last-chase')).toMatchObject({ who: ['IM/AM'], sprint: 'previous', when: { on: 'cutoff' }, slot: 'morning' });
    expect(byId('tell-client-revert')).toMatchObject({ who: ['IM/AM'], sprint: 'previous', when: { on: 'live' }, slot: 'after-cutoff' });
    expect(byId('uat-findings-to-planning')).toMatchObject({ who: ['IM/AM', 'Lead'], sprint: 'next', when: { on: 'planning', offset: -1 } });
    expect(byId('revert-missed-fixes').who).toEqual(['Dev']);
  });
});
