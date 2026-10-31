import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('route fallback is branded, accessible and motion-optional without client dependencies', () => {
  const source = readFileSync(new URL('../src/app/loading.tsx', import.meta.url), 'utf8');
  assert.match(source, /min-h-svh.*items-center justify-center/);
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(source, /180dc-uc-davis-landscape-dark.png/);
  assert.match(source, /loading="eager"/);
  assert.match(source, /motion-safe:animate-pulse/);
  assert.match(source, /className="sr-only">Loading GAP…/);
  assert.doesNotMatch(source, /use client|useEffect|fetch\(|setTimeout|fixed/);
});
