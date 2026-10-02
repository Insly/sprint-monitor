// Copy invariants part 3/4 (2026-11-27 to 2026-12-26). Oracle and checks in invariants.lib.js (hand-written from the process).
import { invariantSuite } from './invariants.lib.js';

process.env.TZ ||= 'Europe/Tallinn';

invariantSuite('2026-11-27', '2026-12-26');
