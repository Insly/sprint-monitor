// `npm test` = vitest defaults, minus the freshness alarm (it must never block a deploy).
// The freshness alarm runs on its own: `npm run freshness` (tests/freshness/vitest.config.js).
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/freshness.test.js'],
  },
});
