// QA (logic and data), 2026-10-01. Oracle = the owner's stated truths, written here by hand,
// NOT engine output. Every expected value below is either a literal from the owner brief or
// derived from it with independent arithmetic (no schedule.js helpers in the oracle side).
//
// Owner truths:
//   Sprints 2 weeks Mon-Fri. S17 = 3-14 Aug 2026. Numbering resets yearly.
//   2026-25: 23 Nov - 4 Dec, bug retro Mon 7 Dec, Demo Tue 8 Dec, Live Mon 14 Dec.
//   2027-1: 7 Dec 2026 - Fri 1 Jan 2027, no break; bug retro Mon 4 Jan, Demo Tue 5 Jan, Live Mon 11 Jan.
//   2027-2 starts Mon 4 Jan; planning Thu 31 Dec.
//   Demo update 17:00, Live update 20:00, fix cut-off Mon 12:00 (Tallinn).
//   Code freeze from the sprint-end Friday until the Tuesday-evening Demo update; Beta reopens Wednesday.
//   Pre-Refinement every Wed 14:00; Full Refinement Thu 14:00 in week 1; refinement belongs to the NEXT sprint.
//   Sprint planning on the Thursday before the start.
//   Rota: S20 Demo 29 Sep Rafael F.; Live 5 Oct Konstantin M. (lead), Evgeny M. (backup); support week of 28 Sep Andrei I.
//   Names are always "First L."; no full surname anywhere in public/ or docs/.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDay, dutyLine, dutyTexts } from '../public/board.js';
import {
  sprintDates, sprintByLabel, sprintForDate, context, actionsFor, workingDaysIn, keyTimes, ROLES,
} from '../public/schedule.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';
import * as DUTY from '../public/duty.js';
import { plus, dow, isWknd, days, LIVE_MONDAYS, DEMO_TUESDAYS, officeTimes } from './oracle.lib.js';

process.env.TZ ||= 'Europe/Tallinn';

// ---------------------------------------------------------------- 1. calendar against the owner
describe('owner calendar', () => {
  it('S17 = 2026-17 = Mon 3 to Fri 14 Aug 2026', () => {
    const s = sprintDates(17);
    expect([s.label, s.start, s.end]).toEqual(['2026-17', '2026-08-03', '2026-08-14']);
  });

  it('2026-25: 23 Nov - 4 Dec, bug retro Mon 7 Dec, Demo Tue 8 Dec, Live Mon 14 Dec', () => {
    const s = sprintDates(sprintByLabel('2026-25'));
    expect([s.start, s.end, s.freezeStart, s.bugRetro, s.demoStart, s.uatStart, s.cutoff, s.live])
      .toEqual(['2026-11-23', '2026-12-04', '2026-12-04', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-14', '2026-12-14']);
  });

  it('2027-1: 7 Dec - Fri 1 Jan, freeze 1 Jan, bug retro 4 Jan, Demo 5 Jan, Live 11 Jan, 20 working days', () => {
    const s = sprintDates(sprintByLabel('2027-1'));
    expect([s.planning, s.start, s.end, s.freezeStart, s.bugRetro, s.demoStart, s.uatStart, s.cutoff, s.live])
      .toEqual(['2026-12-03', '2026-12-07', '2027-01-01', '2027-01-01', '2027-01-04', '2027-01-05', '2027-01-06', '2027-01-11', '2027-01-11']);
    expect(workingDaysIn(s)).toBe(20);
  });

  it('2027-1 has no break: every weekday 7 Dec - 1 Jan is a counted sprint day 1..20', () => {
    let n = 0;
    for (const d of days('2026-12-07', '2027-01-01')) {
      const c = context(d);
      expect(c.current.label, d).toBe('2027-1');
      if (isWknd(d)) { expect(c.dayOfSprint, d).toBeNull(); continue; }
      n += 1;
      expect(c.dayOfSprint, d).toBe(n);
    }
    expect(n).toBe(20);
  });

  it('2027-2 starts Mon 4 Jan; planning Thu 31 Dec', () => {
    const s = sprintDates(sprintByLabel('2027-2'));
    expect([s.planning, s.start, s.end, s.demoStart, s.live]).toEqual(['2026-12-31', '2027-01-04', '2027-01-15', '2027-01-19', '2027-01-25']);
  });

  it('numbering resets yearly: 2026-25 is followed by 2027-1', () => {
    expect(sprintDates(sprintByLabel('2026-25') + 1).label).toBe('2027-1');
    expect(sprintByLabel('2026-26')).toBeNull();
  });

  it('every sprint 2026-17 .. 2027-6: Mon-Fri, back to back, planning the Thursday before, freeze Fri -> Demo Tue -> Beta/UAT Wed -> cut-off+Live Mon', () => {
    for (let n = 17; n <= sprintByLabel('2027-6'); n++) {
      const s = sprintDates(n);
      const p = sprintDates(n - 1);
      expect(dow(s.start), s.label).toBe('Mon');
      expect(dow(s.end), s.label).toBe('Fri');
      expect(s.start, s.label).toBe(plus(p.end, 3));
      expect(s.planning, s.label).toBe(plus(s.start, -4));
      expect(dow(s.planning), s.label).toBe('Thu');
      expect(s.freezeStart, s.label).toBe(s.end);
      expect(s.bugRetro, s.label).toBe(plus(s.end, 3));
      expect(s.demoStart, s.label).toBe(plus(s.end, 4));
      expect(dow(s.demoStart), s.label).toBe('Tue');
      expect(s.uatStart, s.label).toBe(plus(s.end, 5)); // Beta reopens Wednesday
      expect(s.cutoff, s.label).toBe(s.live);
      expect(dow(s.live), s.label).toBe('Mon');
      expect(s.live, s.label).toBe(plus(s.end, 10));
    }
  });

  it('the hand-written deploy calendar agrees with the engine', () => {
    const lives = new Set(); const demos = new Set();
    for (let n = 19; n <= 28; n++) { lives.add(sprintDates(n).live); demos.add(sprintDates(n).demoStart); }
    for (const d of LIVE_MONDAYS) expect(lives.has(d), d).toBe(true);
    for (const d of DEMO_TUESDAYS) expect(demos.has(d), d).toBe(true);
  });

  it('times: cut-off 12:00, Demo 17:00, Live 20:00 (Tallinn)', () => {
    expect(keyTimes(RULES)).toEqual({ cutoff: '12:00', demo: '17:00', live: '20:00' });
    const t = Object.fromEntries(RULES.filter((r) => r.time).map((r) => [r.id, r.time]));
    expect(t['fix-cutoff']).toBe('12:00');
    expect(t['demo-update']).toBe('17:00');
    expect(t['live-update']).toBe('20:00');
    expect(t['pre-refinement']).toBe('14:00');
    expect(t['full-refinement']).toBe('14:00');
  });

  it('code freeze runs Fri (sprint end) to the Tuesday Demo update, not into Wednesday', () => {
    const r = RULES.find((x) => x.id === 'code-freeze');
    expect(r.when).toEqual({ from: 'freezeStart', to: 'demoStart' });
    const ids = (d) => actionsFor(d, RULES).map((a) => a.id);
    expect(ids('2026-10-09')).toContain('code-freeze');
    expect(ids('2026-10-13')).toContain('code-freeze');
    expect(ids('2026-10-14')).not.toContain('code-freeze');
  });
});

// ---------------------------------------------------------------- 2. refinement and planning
describe('refinement and planning (owner)', () => {
  const fired = (id) => {
    const out = [];
    for (const d of days('2026-09-28', '2027-01-25')) for (const a of actionsFor(d, RULES)) if (a.id === id) out.push([d, a]);
    return out;
  };

  it('Pre-Refinement every Wednesday at 14:00, for the NEXT sprint', () => {
    const hits = fired('pre-refinement');
    const weds = [...days('2026-09-28', '2027-01-25')].filter((d) => dow(d) === 'Wed');
    expect(hits.map(([d]) => d)).toEqual(weds);
    for (const [d, a] of hits) {
      expect(a.time).toBe('14:00');
      expect(a.sprintNumber, d).toBe(context(d).next.n);
    }
  });

  it('Full Refinement on Thursday 14:00 of week 1, for the NEXT sprint (regular 2-week sprints)', () => {
    const hits = fired('full-refinement');
    for (const [d, a] of hits) {
      expect(dow(d)).toBe('Thu');
      expect(a.time).toBe('14:00');
      expect(a.sprintNumber, d).toBe(context(d).next.n);
      expect(d, 'Thursday of week 1').toBe(plus(context(d).current.start, 3));
    }
    // Regular sprints in the window: one Full Refinement each, on start + 3.
    for (const label of ['2026-21', '2026-22', '2026-23', '2026-24', '2026-25', '2027-2', '2027-3']) {
      const s = sprintDates(sprintByLabel(label));
      expect(hits.some(([d]) => d === plus(s.start, 3)), label).toBe(true);
    }
  });

  it('2027-1 (4 weeks): Full Refinement fires Thu 10 Dec only (weeks 2-4 count as week 2). OWNER TO DECIDE', () => {
    const inYearEnd = fired('full-refinement').map(([d]) => d).filter((d) => d >= '2026-12-07' && d <= '2027-01-01');
    // Observed behaviour, recorded for the owner. Not a certified truth: see the it.todo below.
    expect(inYearEnd).toEqual(['2026-12-10']);
  });
  it.todo('2027-1: should Full Refinement also run Thu 17 Dec / 24 Dec / 31 Dec? (owner decision pending)');

  it('sprint planning on the Thursday before each start, for the next sprint; 2027-2 on Thu 31 Dec', () => {
    const hits = fired('sprint-planning');
    for (const [d, a] of hits) {
      expect(dow(d)).toBe('Thu');
      expect(sprintDates(a.sprintNumber).start).toBe(plus(d, 4));
    }
    expect(hits.find(([, a]) => sprintDates(a.sprintNumber).label === '2027-2')?.[0]).toBe('2026-12-31');
  });
});

// ---------------------------------------------------------------- 3. duty rota against the owner
describe('duty rota (owner)', () => {
  it('S20 Demo Tue 29 Sep by Rafael F.; Live Mon 5 Oct Konstantin M. (lead), Evgeny M. (backup)', () => {
    const r = DUTY.RELEASES.find((x) => x.demo === '2026-09-29');
    expect(r).toMatchObject({ demoBy: 'Rafael F.', live: '2026-10-05', liveLead: 'Konstantin M.', liveBackup: 'Evgeny M.' });
    expect(sprintDates(20).demoStart).toBe('2026-09-29');
    expect(sprintDates(20).live).toBe('2026-10-05');
  });

  it('support duty for the week of Mon 28 Sep is Andrei I.', () => {
    expect(DUTY.SUPPORT_WEEKS.find((w) => w.week === '2026-09-28')?.dev).toBe('Andrei I.');
    // Sat 3 Oct belongs to the week starting Mon 28 Sep.
    expect(dutyTexts(dutyLine('2026-10-03', DUTY, RULES))[0]).toBe('Support this week: Andrei I.');
  });

  it('the page shows them on the day (duty line, real rota)', () => {
    expect(dutyTexts(dutyLine('2026-09-29', DUTY, RULES))).toEqual([
      'Tonight · Demo update 2026-20 · 17:00 Tallinn · 16:00 Warsaw · 15:00 London: Rafael F.',
      'Support this week: Andrei I.',
    ]);
    expect(dutyTexts(dutyLine('2026-10-05', DUTY, RULES))[0])
      .toBe('Tonight · Live update 2026-20 · 20:00 Tallinn · 19:00 Warsaw · 18:00 London: Konstantin M. (lead), Evgeny M. (backup)');
  });
});

// ---------------------------------------------------------------- 4. holidays: complete official lists, by hand
// Estonia (Public Holidays and Days of National Importance Act) and Poland (Act of 18 Jan 1951 as amended;
// 24 Dec added from 2025). Easter Sunday 5 Apr 2026, 28 Mar 2027.
const OFFICIAL = {
  EE: {
    2026: ['01-01', '02-24', '04-03', '04-05', '05-01', '05-24', '06-23', '06-24', '08-20', '12-24', '12-25', '12-26'],
    2027: ['01-01', '02-24', '03-26', '03-28', '05-01', '05-16', '06-23', '06-24', '08-20', '12-24', '12-25', '12-26'],
  },
  PL: {
    2026: ['01-01', '01-06', '04-05', '04-06', '05-01', '05-03', '05-24', '06-04', '08-15', '11-01', '11-11', '12-24', '12-25', '12-26'],
    2027: ['01-01', '01-06', '03-28', '03-29', '05-01', '05-03', '05-16', '05-27', '08-15', '11-01', '11-11', '12-24', '12-25', '12-26'],
  },
};

describe('holidays.js equals the official EE and PL lists exactly', () => {
  it.each(['EE', 'PL'])('%s 2026-2027', (c) => {
    const want = [2026, 2027].flatMap((y) => OFFICIAL[c][y].map((md) => `${y}-${md}`));
    const got = HOLIDAYS.filter((h) => h.country === c).map((h) => h.date);
    expect(got).toEqual(want);
  });

  it('PL 6 Jan 2027 (Epiphany) is a Wednesday = 2027-1 UAT opens, and the page shows it', () => {
    expect(dow('2027-01-06')).toBe('Wed');
    const m = resolveDay({ date: '2027-01-05', time: '09:00', role: 'Everyone', rules: RULES, holidays: HOLIDAYS });
    expect(m.comingUp.find((d) => d.date === '2027-01-06')?.holiday).toBe('PL holiday');
    const onDay = resolveDay({ date: '2027-01-06', time: '09:00', role: 'Everyone', rules: RULES, holidays: HOLIDAYS });
    expect(onDay.rail.find((r) => r.label === '2027-1').holidayNotice).toContain('6 Jan (PL, UAT opens)');
  });
});

// ---------------------------------------------------------------- 5. names: "First L." only, no full surnames
const ROOT = fileURLToPath(new URL('..', import.meta.url));
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('no full surnames in public/ or docs/', () => {
  const people = [
    ...DUTY.RELEASES.flatMap((r) => [r.demoBy, r.liveLead, r.liveBackup]),
    ...DUTY.SUPPORT_WEEKS.map((w) => w.dev),
  ].filter(Boolean);
  const firsts = [...new Set(people.map((n) => n.split(' ')[0]))];
  const files = [...walk(join(ROOT, 'public')), ...walk(join(ROOT, 'docs'))].filter((p) => /\.(js|html|md|json|css|txt)$/.test(p));

  it('every rota name is "First L."', () => {
    for (const n of people) expect(n).toMatch(/^\p{Lu}[\p{L}'-]+ \p{Lu}\.$/u);
  });

  it.each(files.map((f) => [f.slice(ROOT.length)]))('%s', (rel) => {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    // A known first name followed by a capitalised word of 2+ letters is a full surname.
    const re = new RegExp(`\\b(${firsts.join('|')})\\s+\\p{Lu}\\p{Ll}+`, 'gu');
    expect(text.match(re) ?? [], rel).toEqual([]);
  });
});

// ---------------------------------------------------------------- 6. zone oracle (the sweep itself is in sweep-*.test.js)
describe('zone oracle sanity (DST change Sun 25 Oct 2026)', () => {
  it('UTC offsets flip on 25 Oct but the office-to-office difference does not', () => {
    expect(officeTimes('2026-10-19', '20:00')).toBe('20:00 Tallinn · 19:00 Warsaw · 18:00 London');
    expect(officeTimes('2026-11-02', '20:00')).toBe('20:00 Tallinn · 19:00 Warsaw · 18:00 London');
    expect(officeTimes('2026-11-02', '17:00')).toBe('17:00 Tallinn · 16:00 Warsaw · 15:00 London');
  });
});

const SWEEP_DAYS = [...days('2026-09-28', '2027-01-25')];

// ---------------------------------------------------------------- 7. owner spot checks
describe('owner spot checks', () => {
  const day = (date, time = '09:00', role = 'Everyone') => resolveDay({ date, time, role, rules: RULES, duty: DUTY, holidays: HOLIDAYS });

  it('Mon 28 Dec = 2027-1 day 16 of 20, a quiet build day with no cut-off or deploy', () => {
    for (const role of ROLES) {
      const m = day('2026-12-28', '09:00', role);
      expect(m.meta).toBe('2027-1 · day 16 of 20');
      expect(m.band, role).toBe('quiet');
      expect(m.headline, role).toBe('No deadlines today');
    }
    expect(actionsFor('2026-12-28', RULES).filter((a) => a.status === 'today')).toEqual([]);
  });

  it('the 2027-1 code freeze starts Fri 1 Jan (holiday) and holds until the Demo update Tue 5 Jan', () => {
    const m = day('2027-01-01');
    expect(m.headline).toBe('Code freeze starts today');
    expect(m.meta).toBe('2027-1 · day 20 of 20');
    expect(m.rail.find((r) => r.label === '2027-1').phaseLabel).toBe('Code freeze starts today · Demo update Tue 5 Jan evening');
    const f = actionsFor('2027-01-01', RULES).find((a) => a.id === 'code-freeze');
    expect(f.dates).toEqual({ from: '2027-01-01', to: '2027-01-05' });
    expect(actionsFor('2026-12-31', RULES).some((a) => a.id === 'code-freeze')).toBe(false);
    expect(actionsFor('2027-01-06', RULES).some((a) => a.id === 'code-freeze')).toBe(false);
  });

  it('Mon 4 Jan: 2027-2 starts, 2027-1 bug retro, Demo heads-up; Tue 5 Jan Demo; Mon 11 Jan cut-off and Live', () => {
    const ids = (d) => actionsFor(d, RULES).filter((a) => a.status === 'today').map((a) => `${a.id}:${sprintDates(a.sprintNumber).label}`);
    expect(ids('2027-01-04')).toEqual(expect.arrayContaining(['sprint-start:2027-2', 'bug-retro:2027-1', 'matrix-before-demo:2027-1']));
    expect(day('2027-01-04').headline).toBe('2027-2 starts today. Demo update tomorrow.');
    expect(ids('2027-01-05')).toEqual(expect.arrayContaining(['demo-update:2027-1']));
    expect(day('2027-01-05', '09:00', 'Dev').band).toBe('urgent');
    expect(ids('2027-01-11')).toEqual(expect.arrayContaining(['fix-cutoff:2027-1', 'live-update:2027-1']));
    expect(day('2027-01-11', '11:59').band).toBe('urgent');
  });

  it('2027-2 planning shows on Thu 31 Dec', () => {
    const m = day('2026-12-31');
    expect(m.headline).toBe('Sprint planning today. Code freeze starts tomorrow.');
    expect(m.rail.find((r) => r.label === '2027-2').phaseLabel).toBe('Sprint planning today · starts Mon 4 Jan');
    const p = actionsFor('2026-12-31', RULES).find((a) => a.id === 'sprint-planning');
    expect(sprintDates(p.sprintNumber).label).toBe('2027-2');
  });

  it('no release activity during the 2027-1 build after the 2026-25 Live (15 Dec - 31 Dec)', () => {
    for (const d of days('2026-12-15', '2026-12-31')) {
      for (const a of actionsFor(d, RULES)) {
        expect(['demo-update', 'live-update', 'fix-cutoff', 'bug-retro'], `${d} ${a.id}`).not.toContain(a.id);
      }
    }
  });

  it('sprintForDate never lands on a sprint whose start is after the date (overrides consistent)', () => {
    for (const d of SWEEP_DAYS) {
      const n = sprintForDate(d);
      expect(sprintDates(n).start <= d, d).toBe(true);
      expect(sprintDates(n + 1).start > d, d).toBe(true);
    }
  });
});
