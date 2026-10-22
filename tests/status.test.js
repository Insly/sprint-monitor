// Maintenance switch (public/status.json). The owner turns it on/off; this only checks the file is well formed,
// so a bad edit can't break the page (the page also fails open if the file is unreadable).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const raw = readFileSync(new URL('../public/status.json', import.meta.url), 'utf8');

describe('public/status.json', () => {
  it('is valid JSON with a boolean "maintenance" and a string "message"', () => {
    const s = JSON.parse(raw);
    expect(typeof s.maintenance).toBe('boolean');
    expect(typeof s.message).toBe('string');
    expect(s.message.length).toBeGreaterThan(0);
  });
});
