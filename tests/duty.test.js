// duty.js (the real rota) against DESIGN.md §9: names are first name + last initial only,
// rota dates equal engine dates. Support duty is not part of the rota (differs per team).
import { describe, it, expect } from 'vitest';
import * as DUTY from '../public/duty.js';
import { sprintDates, sprintForDate, weekdayOf, parseDate } from '../public/schedule.js';
import { dutyLine, dutyTexts } from '../public/board.js';
import { RULES } from '../public/rules.js';

process.env.TZ ||= 'Europe/Tallinn';

const NAME = /^\p{L}[\p{L}'-]* \p{Lu}\.$/u;
const names = [
  ...DUTY.RELEASES.flatMap((r) => [r.demoBy, r.liveLead, r.liveBackup]),
].filter((x) => x != null);

/** The sprint whose Demo update is on this date. */
function sprintWithDemo(date) {
  const n = sprintForDate(date);
  for (let k = n - 2; k <= n; k++) if (sprintDates(k).demoStart === date) return sprintDates(k);
  return null;
}

describe('duty.js data', () => {
  it('has a ROTA_UPDATED date', () => {
    expect(() => parseDate(DUTY.ROTA_UPDATED)).not.toThrow();
  });

  it('every name is "First L." (first name + last initial only; the page and repo are public)', () => {
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n, n).toMatch(NAME);
  });

  it.each(DUTY.RELEASES.map((r) => [r.demo, r]))('release with Demo %s matches the engine dates', (_d, r) => {
    const s = sprintWithDemo(r.demo);
    expect(s, `no sprint has its Demo update on ${r.demo}`).not.toBeNull();
    expect(r.live).toBe(s.live);
    expect(weekdayOf(r.demo)).toBe('Tue');
    expect(weekdayOf(r.live)).toBe('Mon');
  });

  it('the 2027-1 release is Demo Tue 5 Jan, Live Mon 11 Jan 2027', () => {
    expect(DUTY.RELEASES.find((r) => r.demo === '2027-01-05')?.live).toBe('2027-01-11');
    expect(sprintWithDemo('2027-01-05').label).toBe('2027-1');
  });
});

describe('duty line from the real rota', () => {
  it('Mon 5 Oct 2026: tonight is the 2026-20 Live update', () => {
    const line = dutyLine('2026-10-05', DUTY, RULES);
    expect(line.state).toBe('tonight');
    expect(dutyTexts(line)[0]).toMatch(/^Tonight · Live update 2026-20 · 20:00 Tallinn · 19:00 Warsaw · 18:00 London: \S+ \S\. \(lead\), \S+ \S\. \(backup\)$/);
  });

  it('has no support-duty data or text (owner, 2026-10-01: it differs per team)', () => {
    expect(DUTY.SUPPORT_WEEKS).toBeUndefined();
    for (const d of ['2026-09-29', '2026-10-01', '2026-12-02']) {
      expect(dutyTexts(dutyLine(d, DUTY, RULES)).join(' ')).not.toMatch(/support/i);
    }
  });
});
