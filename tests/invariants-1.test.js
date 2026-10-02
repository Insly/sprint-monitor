// Copy invariants part 1/4 (2026-09-28 to 2026-10-27). Oracle and checks in invariants.lib.js (hand-written from the process).
import { invariantSuite } from './invariants.lib.js';

process.env.TZ ||= 'Europe/Tallinn';

invariantSuite('2026-09-28', '2026-10-27');
