// Shared oracle for the QA tests (qa-oracle.test.js, sweep-*.test.js). Hand-written from the owner's
// truths; uses only UTC arithmetic, never schedule.js, on the oracle side.
import { expect } from 'vitest';
import { resolveDay } from '../public/board.js';
import { context, workingDaysIn, ROLES } from '../public/schedule.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';
import * as DUTY from '../public/duty.js';

const MS = 86400000;
export const k2u = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const u2k = (u) => new Date(u).toISOString().slice(0, 10);
export const plus = (k, n) => u2k(k2u(k) + n * MS);
export const dow = (k) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(k2u(k)).getUTCDay()];
export const isWknd = (k) => ['Sat', 'Sun'].includes(dow(k));
export function* days(from, to) { for (let k = from; k <= to; k = plus(k, 1)) yield k; }
const every14 = (from, to) => { const out = []; for (let k = from; k <= to; k = plus(k, 14)) out.push(k); return out; };

// Cut-off / Live Mondays and Demo Tuesdays, 28 Sep 2026 - 25 Jan 2027 (owner calendar).
export const LIVE_MONDAYS = [...every14('2026-10-05', '2026-12-14'), '2027-01-11', '2027-01-25'];
export const DEMO_TUESDAYS = [...every14('2026-09-29', '2026-12-08'), '2027-01-05', '2027-01-19'];

// EU summer time: last Sunday of March 01:00 UTC to last Sunday of October 01:00 UTC, all three offices.
const SUMMER = [['2026-03-29T01:00Z', '2026-10-25T01:00Z'], ['2027-03-28T01:00Z', '2027-10-31T01:00Z']]
  .map(([a, b]) => [Date.parse(a), Date.parse(b)]);
/** A Tallinn wall time shown in the three offices, computed without Intl. */
export function officeTimes(dateKey, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const wall = k2u(dateKey) + (h * 60 + m) * 60000;
  const dst = SUMMER.some(([a, b]) => wall - 3 * 3600000 >= a && wall - 3 * 3600000 < b) ? 1 : 0;
  const utc = wall - (2 + dst) * 3600000;
  const fmt = (off) => new Date(utc + off * 3600000).toISOString().slice(11, 16);
  return `${fmt(2 + dst)} Tallinn · ${fmt(1 + dst)} Warsaw · ${fmt(dst)} London`;
}

export const TIMES = ['09:00', '11:59', '12:00', '16:59', '17:00', '19:59', '20:00'];
const DUTY_NAMES = new Set([
  ...DUTY.RELEASES.flatMap((r) => [r.demoBy, r.liveLead, r.liveBackup]),
  ...DUTY.SUPPORT_WEEKS.map((w) => w.dev),
].filter(Boolean));
const ALLOWED_CLOCK = new Set(['12:00', '14:00', '17:00', '20:00']);

/** Every string leaf of the model (plus undefined / NaN leaves), except the echoed input time. */
export function strings(obj) {
  const out = [];
  const visit = (v, path) => {
    if (typeof v === 'string') out.push([path, v]);
    else if (typeof v === 'number' && Number.isNaN(v)) out.push([path, 'NaN']);
    else if (v === undefined) out.push([path, 'undefined']);
    else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!(path === '' && k === 'time')) visit(x, path ? `${path}.${k}` : k);
  };
  visit(obj, '');
  return out;
}

/** The sweep invariants for one date, all TIMES x all ROLES. */
export function sweepDay(date) {
  const liveDay = LIVE_MONDAYS.includes(date);
  const demoDay = DEMO_TUESDAYS.includes(date);
  for (const time of TIMES) {
    for (const role of ROLES) {
      const at = `${date} ${time} ${role}`;
      let m;
      expect(() => { m = resolveDay({ date, time, role, rules: RULES, duty: DUTY, holidays: HOLIDAYS }); }, at).not.toThrow();

      // No undefined / null / NaN / [object ...] in any text.
      for (const [path, s] of strings(m)) {
        expect(s, `${at} ${path}`).not.toMatch(/undefined|\bnull\b|\bNaN\b|\[object /);
      }

      // Headline non-empty.
      expect(typeof m.headline === 'string' && m.headline.trim().length > 0, at).toBe(true);

      // Urgent: cut-off Monday before 12:00 (all roles); Demo Tuesday before 17:00 (Dev, QA only).
      const wantUrgent = (liveDay && time < '12:00') || (demoDay && ['Dev', 'QA'].includes(role) && time < '17:00');
      expect(m.band === 'urgent', `${at} band=${m.band}`).toBe(wantUrgent);
      if (liveDay && time >= '12:00' && time < '20:00') expect(m.band, at).toBe('after');

      // Day counter never above the sprint's working days.
      const cur = context(date).current;
      const total = workingDaysIn(cur);
      expect(total, at).toBe(cur.label === '2027-1' ? 20 : 10);
      const meta = /day (\d+) of (\d+)/.exec(m.meta);
      if (isWknd(date)) expect(meta, at).toBeNull();
      else {
        expect(meta, `${at} meta=${m.meta}`).not.toBeNull();
        expect(Number(meta[2]), at).toBe(total);
        expect(Number(meta[1]), at).toBeGreaterThanOrEqual(1);
        expect(Number(meta[1]), at).toBeLessThanOrEqual(total);
      }
      const tabDay = / day (\d+) · /.exec(m.tab);
      if (tabDay) expect(Number(tabDay[1]), `${at} tab=${m.tab}`).toBeLessThanOrEqual(total);

      // Duty names come from duty.js.
      const people = [m.duty?.support?.name, ...(m.duty?.deploy?.people ?? []).map((p) => p.name)].filter(Boolean);
      for (const p of people) expect(DUTY_NAMES.has(p), `${at} ${p}`).toBe(true);

      // Deploy times: Demo 17:00, Live 20:00 Tallinn, Warsaw and London converted correctly.
      const dep = m.duty?.deploy;
      if (dep) {
        expect(dep.time, at).toBe(dep.kind === 'Demo' ? '17:00' : '20:00');
        expect(dep.kind === 'Demo' ? DEMO_TUESDAYS : LIVE_MONDAYS, `${at} ${dep.kind} ${dep.date}`).toContain(dep.date);
        expect(dep.zones, at).toBe(officeTimes(dep.date, dep.time));
      }
      const all = strings(m).map(([, s]) => s).join('\n');
      for (const [, hhmm] of all.matchAll(/(\d\d:\d\d) Tallinn/g)) expect(['17:00', '20:00'], at).toContain(hhmm);
      for (const [hhmm] of all.replace(/\d\d:\d\d (Warsaw|London)/g, '').matchAll(/\b\d\d:\d\d\b/g)) expect(ALLOWED_CLOCK, `${at} ${hhmm}`).toContain(hhmm);
      for (const [, w, l] of all.matchAll(/(\d\d:\d\d) Warsaw · (\d\d:\d\d) London/g)) {
        expect(['16:00', '19:00'], at).toContain(w);
        expect(['15:00', '18:00'], at).toContain(l);
      }

      // Duty line on deploy days says tonight, with the right kind.
      if (!isWknd(date) && (liveDay || demoDay)) {
        expect(m.duty.state, at).toBe('tonight');
        expect(m.duty.deploy.kind, at).toBe(liveDay ? 'Live' : 'Demo');
      }
    }
  }
}
