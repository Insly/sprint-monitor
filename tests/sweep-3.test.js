// Resolver sweep part 3/4 (2026-11-27 to 2026-12-26): every day x 09:00, 11:59, 12:00, 16:59, 17:00, 19:59, 20:00 x every role.
// Invariants and oracle in oracle.lib.js (sweepDay). Split in four files so vitest runs them in parallel.
import { describe, it } from 'vitest';
import { days, sweepDay } from './oracle.lib.js';

process.env.TZ ||= 'Europe/Tallinn';

describe('resolver sweep 2026-11-27 .. 2026-12-26', () => {
  it.each([...days('2026-11-27', '2026-12-26')])('%s', (date) => sweepDay(date), 30000);
});
