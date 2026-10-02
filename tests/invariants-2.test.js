// Copy invariants part 2/4 (2026-10-28 to 2026-11-26). Oracle and checks in invariants.lib.js (hand-written from the process).
import { invariantSuite } from './invariants.lib.js';

process.env.TZ ||= 'Europe/Tallinn';

invariantSuite('2026-10-28', '2026-11-26');
