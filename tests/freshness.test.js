// Freshness alarm (review 2026-10-02, Batch 5 / AU15): fails when today + 60 days passes the end of
// any static data the board depends on. Excluded from `npm test` so it never blocks a deploy;
// run `npm run freshness` (weekly in .github/workflows/scheduled.yml).
// Dry run for another day: FRESHNESS_TODAY=2026-12-01 npm run freshness
import { describe, it, expect } from 'vitest';
import { runChecks, todayKey, HORIZON_DAYS } from './freshness/checks.js';

process.env.TZ ||= 'Europe/Tallinn';

const { today, horizon, checks } = runChecks(todayKey());

describe(`data freshness: today ${today}, must cover to ${horizon} (+${HORIZON_DAYS} days)`, () => {
  for (const c of checks) {
    it(`${c.name} (covered to ${c.coveredTo})`, () => {
      if (!c.ok) expect.fail(`STALE: ${c.name}. ${c.message}`);
    });
  }
});
