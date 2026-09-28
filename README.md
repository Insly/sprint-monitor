# MGA Sprint Board (Sprint Monitor)

A browser home page for the Insly MGA delivery unit. It shows which sprint is active, which working day of it today is, and what needs doing today for the previous, current and next sprint, filtered by role. It also draws the release track (sprint, code freeze, Demo, UAT, cut-off, Live) and lists the next 10 working days.

Tier: T1 per software-project-playbook (one owner, low stakes, no personal data, static page).

Spec: `docs/SPEC.md`. Calendar model and rule schema: `docs/CONTRACT.md`. Progress log: `docs/PROGRESS.md`.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Loads `schedule.js` and `rules.js` as ES modules. |
| `schedule.js` | Date engine: sprint dates, today's context, which rules fire. No DOM. |
| `rules.js` | Rule catalogue and Confluence sources. Data only. |
| `*.test.js`, `rules.sample.js` | Tests and test data. Published with the site but not used by the page. |
| `render.yaml` | Render Blueprint (static site). |

No build step. The files are served as they are.

## Run locally

ES modules do not load from `file://`, so serve the folder:

```
npx serve public
# or
cd public && python -m http.server 8000
```

Preview another date with `?date=2026-09-28` or `#date-2026-09-28`.

## Tests

From the repo root:

```
npm test
```

## Change the rules

1. Edit `rules.js` (schema in `CONTRACT.md`).
2. Run the tests.
3. Commit and push to `main`. Render redeploys the site automatically, and `Cache-Control: no-cache` means people see the change on their next page load.

To correct a sprint's dates (for example the year-end plan), add an entry to `OVERRIDES` in `schedule.js`, e.g. `{ 27: { live: '2027-01-07', cutoff: '2027-01-07' } }`. Setting `start` or `end` re-derives the other keys for that sprint.

## Set it as your home page

- **Edge:** Settings > Start, home, and new tabs > "When Edge starts" > Open these pages > Add a new page > paste the URL. To also use it for the Home button, set "Home button" to the same URL.
- **Chrome:** Settings > On startup > Open a specific page or set of pages > Add a new page > paste the URL. For the Home button: Settings > Appearance > Show home button > enter the URL.

### Company-wide (IT, Microsoft Intune)

IT can push the page to every managed laptop with an Intune configuration profile (Administrative Templates > Microsoft Edge; the same policy names exist for Chrome):

- `RestoreOnStartup` = 4 and `RestoreOnStartupURLs` = the page address (opens on browser start)
- `HomepageLocation` = the page address, `ShowHomeButton` = enabled (Home button)
- `NewTabPageLocation` = the page address (new tabs; the only way to set a custom new tab page without an extension)

## Rollback

Render dashboard > insly-sprint-monitor > Events (deploys) > pick the previous good deploy > Rollback. Then fix or revert the commit in git so the next deploy does not bring the problem back.
