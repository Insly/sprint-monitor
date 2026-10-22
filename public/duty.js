// Dev deploy rota: Demo update (Beta to Demo, Tue evening) and Live update (Demo to Live, Mon evening).
// Names are temporarily removed from the page and from this public repo (owner, 2026-10-22), until the board
// moves behind employee sign-in (docs/aws/MIGRATION.md). The release dates stay so the duty line still shows
// when the next update is. To bring names back: set SHOW_NAMES = true and fill demoBy / liveLead / liveBackup
// (first name + last initial only). The owner keeps the filled-in copy outside the repo.

export const SHOW_NAMES = false;

export const ROTA_UPDATED = '2026-10-22';

export const RELEASES = [
  { demo: '2026-09-29', demoBy: null, live: '2026-10-05', liveLead: null, liveBackup: null },
  { demo: '2026-10-13', demoBy: null, live: '2026-10-19', liveLead: null, liveBackup: null },
  { demo: '2026-10-27', demoBy: null, live: '2026-11-02', liveLead: null, liveBackup: null },
  { demo: '2026-11-10', demoBy: null, live: '2026-11-16', liveLead: null, liveBackup: null },
  { demo: '2026-11-24', demoBy: null, live: '2026-11-30', liveLead: null, liveBackup: null },
  { demo: '2026-12-08', demoBy: null, live: '2026-12-14', liveLead: null, liveBackup: null },
  // The sheet also lists 22 Dec / 28 Dec; superseded by the 2027-1 plan (7 Dec to Live 11 Jan).
  { demo: '2027-01-05', demoBy: null, live: '2027-01-11', liveLead: null, liveBackup: null },
];
