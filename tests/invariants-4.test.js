// Copy invariants part 4/4 (2026-12-27 to 2027-01-25). Oracle and checks in invariants.lib.js (hand-written from the process).
import { invariantSuite } from './invariants.lib.js';

process.env.TZ ||= 'Europe/Tallinn';

invariantSuite('2026-12-27', '2027-01-25');
