// Config for `npm run freshness` only: runs tests/freshness.test.js and nothing else.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
    include: ['tests/freshness.test.js'],
  },
});
