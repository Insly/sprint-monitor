// Dev duty rota, pasted once from "Duty dev.xlsx" (owner, 2026-10-01). Valid to the end of 2026.
// Names are first name + last initial only, because this page and repo are public (owner decision).
// TODO: replace with a live source when the rota moves to SharePoint (see docs/PROGRESS.md).
// null = not assigned yet in the sheet.

export const ROTA_UPDATED = '2026-10-01';

/** Per release: Demo update (Beta to Demo, Tue evening) and Live update (Demo to Live, Mon evening). */
export const RELEASES = [
  { demo: '2026-09-29', demoBy: 'Rafael F.',    live: '2026-10-05', liveLead: 'Konstantin M.', liveBackup: 'Evgeny M.' },
  { demo: '2026-10-13', demoBy: 'Alexander M.', live: '2026-10-19', liveLead: 'Sergei P.',     liveBackup: 'Erkki P.' },
  { demo: '2026-10-27', demoBy: 'Andrei I.',    live: '2026-11-02', liveLead: 'Erkki P.',      liveBackup: 'Sergei P.' },
  { demo: '2026-11-10', demoBy: 'Konstantin M.', live: '2026-11-16', liveLead: 'Alexander M.', liveBackup: null },
  { demo: '2026-11-24', demoBy: null,           live: '2026-11-30', liveLead: 'Andrei I.',     liveBackup: 'Alexander M.' },
  { demo: '2026-12-08', demoBy: null,           live: '2026-12-14', liveLead: 'Andrei B.',     liveBackup: 'Andrei I.' },
  // The sheet also lists 22 Dec / 28 Dec; superseded by the 2027-1 plan (7 Dec to Live 11 Jan).
  { demo: '2027-01-05', demoBy: null,           live: '2027-01-11', liveLead: null,            liveBackup: null },
];

/** Weekly support duty dev, Monday to Sunday (week = the Monday). */
export const SUPPORT_WEEKS = [
  { week: '2026-09-21', dev: 'Andrei B.' },
  { week: '2026-09-28', dev: 'Andrei I.' },
  { week: '2026-10-05', dev: 'Evgeny M.' },
  { week: '2026-10-12', dev: 'Alexander M.' },
];
