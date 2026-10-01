// STATES.md is normative. This file asserts every row of its state table:
//   §9 fixture block (band, headline, tab, countdown) read straight from STATES.md,
//   §8 rail lines (verbatim), §8 sub-lines, §7/§8 duty lines with the placeholder rota.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  resolveDay, dayFacts, bandState, headline, tabTitle, countdown, subLine, railRows, dutyLine, dutyTexts,
} from '../public/board.js';
import { RULES } from '../public/rules.js';
import { HOLIDAYS } from '../public/holidays.js';
import { ROLES } from '../public/schedule.js';

process.env.TZ ||= 'Europe/Tallinn';

const STATES = readFileSync(new URL('../docs/ux/STATES.md', import.meta.url), 'utf8');
const FIXTURES = JSON.parse(/## 9\. Fixture block[\s\S]*?```json\n([\s\S]*?)```/.exec(STATES.replace(/\r\n/g, '\n'))[1]);

const rows = FIXTURES.flatMap((fx) => (fx.roles[0] === '*' ? ROLES : fx.roles).map((role) => [`${fx.date} ${fx.time} ${role}`, fx, role]));

describe('STATES.md §9 fixture block', () => {
  it('has the fixtures (sanity: 31 rows, 6 roles)', () => {
    expect(FIXTURES.length).toBe(31);
    expect(ROLES).toEqual(['Everyone', 'IM/AM', 'Dev', 'QA', 'Lead', 'Analyst']);
  });

  it.each(rows)('%s', (_name, fx, role) => {
    const m = resolveDay({ date: fx.date, time: fx.time, role, rules: RULES, holidays: HOLIDAYS });
    expect(m.band).toBe(fx.band);
    expect(m.headline).toBe(fx.headline);
    expect(m.tab).toBe(fx.tab);
    if (fx.countdown) expect(m.countdown?.text).toBe(fx.countdown);
  });

  it('every fixture role group covers each role once per date and time', () => {
    const seen = new Map();
    for (const fx of FIXTURES) {
      const k = `${fx.date} ${fx.time}`;
      const roles = fx.roles[0] === '*' ? ROLES : fx.roles;
      seen.set(k, [...(seen.get(k) || []), ...roles]);
    }
    for (const [k, roles] of seen) {
      expect(new Set(roles).size, k).toBe(roles.length);
    }
  });
});

describe('STATES.md §8 countdown', () => {
  it.each([['09:00', '3 h left'], ['09:10', '2 h 50 min left'], ['11:59', '1 min left']])('Mon 5 Oct %s -> %s', (time, text) => {
    expect(countdown(dayFacts('2026-10-05', RULES), time).text).toBe(text);
  });
  it('no countdown after 12:00 or on other days', () => {
    expect(countdown(dayFacts('2026-10-05', RULES), '12:00')).toBeNull();
    expect(countdown(dayFacts('2026-10-02', RULES), '09:00')).toBeNull();
  });
});

// §8 Rail lines, verbatim: [date, time, [previous, current, next]] as "label [phase] text".
const RAILS = [
  ['2026-09-28', '09:00', ['2026-20 [Freeze] Code freeze · Demo update Tue 29 Sep evening', '2026-21 [Build] Sprint day 1 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-09-29', '09:00', ['2026-20 [Freeze] Code freeze · Demo update 17:00', '2026-21 [Build] Sprint day 2 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-09-29', '17:00', ['2026-20 [Freeze] Demo update tonight', '2026-21 [Build] Sprint day 2 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-09-30', '09:00', ['2026-20 [UAT] UAT opens today · fix cut-off Mon 5 Oct 12:00', '2026-21 [Build] Sprint day 3 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-01', '09:00', ['2026-20 [UAT] UAT on Demo · fix cut-off Mon 5 Oct 12:00', '2026-21 [Build] Sprint day 4 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-02', '09:00', ['2026-20 [UAT] UAT on Demo · fix cut-off Mon 5 Oct 12:00', '2026-21 [Build] Sprint day 5 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-03', '09:00', ['2026-20 [UAT] UAT on Demo · fix cut-off Mon 5 Oct 12:00', '2026-21 [Build] Weekend · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-05', '09:00', ['2026-20 [Live] Fix cut-off 12:00 today · Live update tonight', '2026-21 [Build] Sprint day 6 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-05', '11:59', ['2026-20 [Live] Fix cut-off 12:00 today · Live update tonight', '2026-21 [Build] Sprint day 6 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-05', '12:00', ['2026-20 [Live] Cut-off passed · Live update tonight 20:00', '2026-21 [Build] Sprint day 6 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-05', '19:59', ['2026-20 [Live] Cut-off passed · Live update tonight 20:00', '2026-21 [Build] Sprint day 6 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-05', '20:00', ['2026-20 [Live] Live update tonight', '2026-21 [Build] Sprint day 6 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-06', '09:00', ['2026-20 [Live] Live update was Mon 5 Oct', '2026-21 [Build] Sprint day 7 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-07', '09:00', ['2026-20 [Live] Live update was Mon 5 Oct', '2026-21 [Build] Sprint day 8 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Refinement · planning Thu 8 Oct']],
  ['2026-10-08', '09:00', ['2026-20 [Live] Live update was Mon 5 Oct', '2026-21 [Build] Sprint day 9 of 10 · code freeze Fri 9 Oct', '2026-22 [Plan] Sprint planning today · starts Mon 12 Oct']],
  ['2026-10-09', '09:00', ['2026-20 [Live] Live update was Mon 5 Oct', '2026-21 [Freeze] Code freeze starts today · Demo update Tue 13 Oct evening', '2026-22 [Plan] Planned · starts Mon 12 Oct']],
  ['2026-10-12', '09:00', ['2026-21 [Freeze] Code freeze · Demo update Tue 13 Oct evening', '2026-22 [Build] Sprint day 1 of 10 · code freeze Fri 23 Oct', '2026-23 [Plan] Refinement · planning Thu 22 Oct']],
  ['2026-10-13', '09:00', ['2026-21 [Freeze] Code freeze · Demo update 17:00', '2026-22 [Build] Sprint day 2 of 10 · code freeze Fri 23 Oct', '2026-23 [Plan] Refinement · planning Thu 22 Oct']],
  ['2026-10-13', '20:00', ['2026-21 [Freeze] Demo update tonight', '2026-22 [Build] Sprint day 2 of 10 · code freeze Fri 23 Oct', '2026-23 [Plan] Refinement · planning Thu 22 Oct']],
];

describe('STATES.md §6 / §8 sprint rail', () => {
  it.each(RAILS)('%s %s', (date, time, expected) => {
    expect(railRows(date, time, RULES).map((r) => `${r.label} [${r.phase}] ${r.phaseLabel}`)).toEqual(expected);
  });

  it('every rail row links to its sprint view', () => {
    for (const r of railRows('2026-10-01', '09:00', RULES)) expect(r.href).toBe(`#sprint-${r.label}`);
  });

  it('the hot row is the sprint with an event today, else the one in release', () => {
    const hot = (d) => railRows(d, '09:00', RULES).find((r) => r.hot)?.label;
    expect(hot('2026-10-01')).toBe('2026-20');
    expect(hot('2026-10-08')).toBe('2026-22');
    expect(hot('2026-10-09')).toBe('2026-21');
    expect(hot('2026-10-12')).toBe('2026-21');
  });
});

// §8 sub-lines, verbatim. [date, time, role, text]
const SUBS = [
  ['2026-09-28', '09:00', 'IM/AM', 'Due today: Update Demo/Live matrix for Demo. Also: Tell clients what this sprint delivers.'],
  ['2026-09-28', '09:00', 'Dev', 'Code freeze holds until the Demo update tomorrow evening.'],
  ['2026-09-28', '09:00', 'QA', 'Run regression until the Demo update tomorrow evening.'],
  ['2026-09-28', '09:00', 'Lead', 'Bug retro for 2026-20 today.'],
  ['2026-09-28', '09:00', 'Analyst', 'Bug retro for 2026-20 today.'],
  ['2026-09-28', '09:00', 'Everyone', 'Bug retro for 2026-20 today. IM/AM: Demo/Live matrix due.'],
  ['2026-09-29', '09:00', 'Dev', 'Code freeze holds until the update. Afterwards: Release 2026-20 page.'],
  ['2026-09-29', '09:00', 'QA', 'Before the update: all tasks tested and Ready for Demo.'],
  ['2026-09-29', '09:00', 'IM/AM', 'Don\'t tell clients yet. Tomorrow: tell them, UAT deadline Mon 5 Oct 12:00.'],
  ['2026-09-29', '09:00', 'Lead', 'Nothing due for Lead today.'],
  ['2026-09-29', '09:00', 'Analyst', 'Nothing due for Analyst today.'],
  ['2026-09-29', '09:00', 'Everyone', 'QA: Ready for Demo before the update. IM/AM: tell clients tomorrow.'],
  ['2026-09-29', '17:00', 'Dev', 'After the update: create the Release 2026-20 page, tonight or tomorrow morning.'],
  ['2026-09-29', '17:00', 'QA', 'Regression closes with the update.'],
  ['2026-09-29', '17:00', 'IM/AM', 'Don\'t tell clients yet. Tomorrow: tell them, UAT deadline Mon 5 Oct 12:00.'],
  ['2026-09-30', '09:00', 'IM/AM', 'Once the developers confirm the Demo update, tell clients what is on Demo.'],
  ['2026-09-30', '09:00', 'Dev', 'Pre-Refinement at 14:00. From last night: Release 2026-20 page.'],
  ['2026-09-30', '09:00', 'QA', 'Pre-Refinement at 14:00.'],
  ['2026-09-30', '09:00', 'Lead', 'Rank the refinement queue before Pre-Refinement at 14:00.'],
  ['2026-09-30', '09:00', 'Analyst', 'Answer parked refinement questions before tomorrow\'s Full Refinement.'],
  ['2026-10-01', '09:00', 'IM/AM', 'Collect UAT feedback from clients.'],
  ['2026-10-01', '09:00', 'Lead', 'Next for Lead: Mid-sprint delivery check, Fri 2 Oct.'],
  ['2026-10-02', '09:00', 'IM/AM', 'Due today: Update Demo/Live matrix for Live. Chase UAT results.'],
  ['2026-10-02', '09:00', 'Dev', 'Blocking UAT fixes must be in by Mon 12:00.'],
  ['2026-10-02', '09:00', 'QA', 'Nothing due for QA today.'],
  ['2026-10-02', '09:00', 'Lead', 'Nothing due for Lead today.'],
  ['2026-10-02', '09:00', 'Analyst', 'Nothing due for Analyst today.'],
  ['2026-10-05', '09:00', 'IM/AM', 'Raise blocking UAT bugs with the developers now. Anything not fixed by 12:00 is reverted.'],
  ['2026-10-05', '09:00', 'Dev', 'Blocking UAT fixes in by 12:00. Live update tonight.'],
  ['2026-10-05', '09:00', 'Everyone', 'A bugfix that misses 12:00 means a revert, not a fix.'],
  ['2026-10-05', '09:00', 'QA', 'Nothing due for QA today. 2026-20 goes Live tonight.'],
  ['2026-10-05', '11:59', 'Lead', 'Nothing due for Lead today. 2026-20 goes Live tonight.'],
  ['2026-10-05', '12:00', 'IM/AM', 'Agree reverts with the developers and tell affected clients.'],
  ['2026-10-05', '13:20', 'Dev', 'If anything missed the cut-off, revert it before Live. The IM/AM decide which.'],
  ['2026-10-05', '19:59', 'Everyone', 'Fixes after 12:00 are reverts, not fixes.'],
  ['2026-10-05', '12:00', 'Analyst', 'Nothing due for Analyst today.'],
  ['2026-10-05', '20:00', 'IM/AM', 'Confirm to clients once the developers confirm it, tonight or tomorrow morning.'],
  ['2026-10-05', '20:00', 'Dev', 'After the update: create the Golive Release 2026-20 page.'],
  ['2026-10-05', '20:00', 'Everyone', 'Scheduled for this evening. The board cannot see when it finishes.'],
  ['2026-10-05', '20:00', 'QA', 'Nothing due for QA today.'],
  ['2026-10-06', '09:00', 'IM/AM', 'Last night\'s 2026-20 Live update was scheduled. Confirm once the developers have.'],
  ['2026-10-06', '09:00', 'Dev', 'If it was not done last night.'],
  ['2026-10-06', '09:00', 'QA', 'Next for QA: Pre-Refinement Wed 7 Oct 14:00.'],
  ['2026-10-06', '09:00', 'Lead', 'Next for Lead: Rank the refinement queue, Wed 7 Oct.'],
  ['2026-10-06', '09:00', 'Analyst', 'Describe and label tasks for refinement.'],
  ['2026-10-07', '09:00', 'IM/AM', 'Due today: Check Definition of Ready. Also: Chase client approval of estimates, priority calls, QA estimates, UAT findings.'],
  ['2026-10-07', '09:00', 'Lead', 'Rank the refinement queue before 14:00. Bring 2026-20 UAT findings to planning.'],
  ['2026-10-07', '09:00', 'QA', 'QA estimates on sprint candidates.'],
  ['2026-10-07', '09:00', 'Analyst', 'Nothing due for Analyst today.'],
  ['2026-10-08', '09:00', 'QA', 'Due today: Regression plans ready in TestRail.'],
  ['2026-10-08', '09:00', 'Lead', 'Plan 2/3 of capacity, keep 1/3 as buffer. Release check: revert what is not Ready for Demo due tomorrow. Bug retro page due tomorrow.'],
  ['2026-10-08', '09:00', 'IM/AM', 'Plan 2/3 of capacity, keep 1/3 as buffer. Release check: revert what is not Ready for Demo due tomorrow.'],
  ['2026-10-08', '09:00', 'Dev', 'Plan 2/3 of capacity, keep 1/3 as buffer. Release check: revert what is not Ready for Demo due tomorrow.'],
  ['2026-10-08', '09:00', 'Analyst', 'Nothing due for Analyst today.'],
  ['2026-10-09', '09:00', 'QA', 'Run regression opens today, until the Demo update Tue 13 Oct (evening).'],
  ['2026-10-09', '09:00', 'Dev', 'Only QA-approved bug fixes go to Beta until the Demo update Tue 13 Oct (evening).'],
  ['2026-10-09', '09:00', 'IM/AM', 'Config changes on Beta need QA approval until the Demo update Tue 13 Oct (evening).'],
  ['2026-10-09', '09:00', 'Lead', 'Due today: Prepare the bug retro page. Also: Release check: revert what is not Ready for Demo.'],
  ['2026-10-09', '09:00', 'Analyst', 'Nothing due for Analyst today.'],
  // Mon 12 Oct: "as Mon 28 Sep, with sprints shifted (bug retro for 2026-21)"
  ['2026-10-12', '09:00', 'Lead', 'Bug retro for 2026-21 today.'],
  ['2026-10-12', '09:00', 'IM/AM', 'Due today: Update Demo/Live matrix for Demo. Also: Tell clients what this sprint delivers.'],
  // Tue 13 Oct: "Same as Tue 29 Sep ... UAT deadline Mon 19 Oct 12:00, release page Release 2026-21"
  ['2026-10-13', '09:00', 'Dev', 'Code freeze holds until the update. Afterwards: Release 2026-21 page.'],
  ['2026-10-13', '09:00', 'IM/AM', 'Don\'t tell clients yet. Tomorrow: tell them, UAT deadline Mon 19 Oct 12:00.'],
];

describe('STATES.md §8 sub-lines', () => {
  it.each(SUBS)('%s %s %s', (date, time, role, text) => {
    const f = dayFacts(date, RULES);
    expect(subLine(f, time, role, bandState(f, time, role))).toBe(text);
  });
});

// §7 placeholder rota, in duty.js's schema.
const ROTA = {
  ROTA_UPDATED: '2026-10-01',
  RELEASES: [
    { demo: '2026-09-29', demoBy: 'Dev A.', live: '2026-10-05', liveLead: 'Dev B.', liveBackup: 'Dev C.' },
    { demo: '2026-10-13', demoBy: 'Dev C.', live: '2026-10-19', liveLead: null, liveBackup: null },
  ],
};

const DUTY = [
  ['2026-09-28', 'next', ['Next · Demo update Tue 29 Sep 17:00 Tallinn · 16:00 Warsaw · 15:00 London (2026-20): Dev A.']],
  ['2026-09-29', 'tonight', ['Tonight · Demo update 2026-20 · 17:00 Tallinn · 16:00 Warsaw · 15:00 London: Dev A.']],
  ['2026-09-30', 'last-night', ['Last night · Demo update 2026-20: Dev A.']],
  ['2026-10-01', 'next', ['Next · Live update Mon 5 Oct 20:00 Tallinn · 19:00 Warsaw · 18:00 London (2026-20): Dev B. (lead), Dev C. (backup)']],
  ['2026-10-02', 'next', ['Next · Live update Mon 5 Oct 20:00 Tallinn · 19:00 Warsaw · 18:00 London (2026-20): Dev B. (lead), Dev C. (backup)']],
  ['2026-10-03', 'next', ['Next · Live update Mon 5 Oct 20:00 Tallinn · 19:00 Warsaw · 18:00 London (2026-20): Dev B. (lead), Dev C. (backup)']],
  ['2026-10-05', 'tonight', ['Tonight · Live update 2026-20 · 20:00 Tallinn · 19:00 Warsaw · 18:00 London: Dev B. (lead), Dev C. (backup)']],
  ['2026-10-06', 'last-night', ['Last night · Live update 2026-20: Dev B. (lead), Dev C. (backup)']],
  ['2026-10-07', 'next', ['Next · Demo update Tue 13 Oct 17:00 Tallinn · 16:00 Warsaw · 15:00 London (2026-21): Dev C.']],
  ['2026-10-08', 'next', ['Next · Demo update Tue 13 Oct 17:00 Tallinn · 16:00 Warsaw · 15:00 London (2026-21): Dev C.']],
  ['2026-10-09', 'next', ['Next · Demo update Tue 13 Oct 17:00 Tallinn · 16:00 Warsaw · 15:00 London (2026-21): Dev C.']],
  ['2026-10-12', 'next', ['Next · Demo update Tue 13 Oct 17:00 Tallinn · 16:00 Warsaw · 15:00 London (2026-21): Dev C.']],
  ['2026-10-13', 'tonight', ['Tonight · Demo update 2026-21 · 17:00 Tallinn · 16:00 Warsaw · 15:00 London: Dev C.']],
  ['2026-10-15', 'next', ['Next · Live update Mon 19 Oct 20:00 Tallinn · 19:00 Warsaw · 18:00 London (2026-21): not assigned yet']],
];

describe('STATES.md §7 duty line (placeholder rota)', () => {
  it.each(DUTY)('%s: %s', (date, state, texts) => {
    const line = dutyLine(date, ROTA, RULES);
    expect(line.state).toBe(state);
    expect(dutyTexts(line)).toEqual(texts);
  });

  it('tonight / last night / not assigned / no data', () => {
    expect(dutyLine('2026-10-05', ROTA, RULES).state).toBe('tonight');
    expect(dutyLine('2026-10-06', ROTA, RULES).state).toBe('last-night');
    const na = dutyLine('2026-10-19', ROTA, RULES);
    expect(na.deploy.people.map((p) => p.name)).toEqual([null, null]);
    expect(dutyTexts(na)[0]).toBe('Tonight · Live update 2026-21 · 20:00 Tallinn · 19:00 Warsaw · 18:00 London: not assigned yet');
    expect(dutyTexts(na)).toHaveLength(1); // support duty is not shown (owner, 2026-10-01)
    expect(dutyLine('2026-10-05', null, RULES)).toBeNull();
    expect(dutyLine('2026-10-05', {}, RULES)).toBeNull();
    expect(dutyTexts(null)).toEqual([]);
  });

  it('a partly assigned Live update names the gap', () => {
    const rota = { RELEASES: [{ demo: '2026-10-13', demoBy: null, live: '2026-10-19', liveLead: 'Dev B.', liveBackup: null }] };
    expect(dutyTexts(dutyLine('2026-10-19', rota, RULES))[0]).toMatch(/: Dev B\. \(lead\), not assigned yet \(backup\)$/);
  });

  it('is identical for every role (resolveDay)', () => {
    const lines = ROLES.map((role) => JSON.stringify(resolveDay({ date: '2026-10-05', time: '09:00', role, rules: RULES, duty: ROTA }).duty));
    expect(new Set(lines).size).toBe(1);
  });
});

describe('other resolver states', () => {
  it('error: rules.js failed', () => {
    const m = resolveDay({ date: '2026-10-05', time: '09:00', role: 'Dev', rules: null });
    expect(m.band).toBe('error');
    expect(m.headline).toBe('Actions unavailable. Sprint dates below are still correct.');
    expect(m.rail).toHaveLength(3);
  });

  it('preview prefixes the tab title', () => {
    const f = dayFacts('2026-10-12', RULES);
    expect(tabTitle(f, '09:00', 'Everyone', { preview: true })).toBe('Preview Mon 12 Oct · Demo tomorrow · 2026-22 day 1 · Sprint Board');
  });

  it('weekend that is not before a cut-off', () => {
    const f = dayFacts('2026-10-10', RULES);
    expect(bandState(f, '09:00', 'Dev')).toBe('weekend');
    expect(headline(f, '09:00', 'Dev')).toBe('Weekend. 2026-22 starts Monday.');
    expect(tabTitle(f, '09:00', 'Dev')).toBe('Weekend · Sprint Board');
  });

  it('favicon is the key variant only for urgent, after and evening', () => {
    expect(resolveDay({ date: '2026-10-05', time: '09:00', role: 'QA', rules: RULES }).favicon).toBe('key');
    expect(resolveDay({ date: '2026-10-05', time: '20:00', role: 'QA', rules: RULES }).favicon).toBe('normal');
    expect(resolveDay({ date: '2026-10-01', time: '09:00', role: 'QA', rules: RULES }).favicon).toBe('normal');
  });

  it('the year-end sprint: 28 Dec 2026 is day 16 of 20, no release that day (owner, no break)', () => {
    const m = resolveDay({ date: '2026-12-28', time: '09:00', role: 'Everyone', rules: RULES, holidays: HOLIDAYS });
    expect(m.meta).toBe('2027-1 · day 16 of 20');
    expect(m.band).not.toBe('urgent');
    expect(m.tab).toMatch(/2027-1 day 16 · Sprint Board$/);
    const r = m.rail.find((x) => x.label === '2027-1');
    expect(r.phaseLabel).toBe('Sprint day 16 of 20 · code freeze Fri 1 Jan');
  });
});

describe('STATES.md §11 holiday notices', () => {
  it('2027-1 rail row once it is in play (from 23 Nov 2026)', () => {
    const r = railRows('2026-11-23', '09:00', RULES, HOLIDAYS).find((x) => x.label === '2027-1');
    // Owner correction: 2027-1 freezes Fri 1 Jan, so 24-25 Dec are build days and not listed.
    expect(r.holidayNotice).toBe('Holidays during release: 1 Jan (EE, PL, code freeze starts), 6 Jan (PL, UAT opens)');
  });

  it('no notice for a sprint without holidays on key dates', () => {
    for (const r of railRows('2026-10-01', '09:00', RULES, HOLIDAYS)) expect(r.holidayNotice).toBeNull();
  });

  it('coming up marks a holiday day', () => {
    const m = resolveDay({ date: '2027-01-04', time: '09:00', role: 'IM/AM', rules: RULES, holidays: HOLIDAYS });
    const wed = m.comingUp.find((d) => d.date === '2027-01-06');
    expect(wed.holiday).toBe('PL holiday');
  });
});
