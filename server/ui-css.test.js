import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('auth form labels are not collapsed by global form label rule', () => {
  const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /(^|\n)form\s*>\s*label\s*\{/);
  assert.match(css, /\.auth-card label\s*\{[^}]*display:\s*grid/s);
});
