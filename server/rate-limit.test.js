import test from 'node:test';
import assert from 'node:assert/strict';

import { createRateLimiter } from './rate-limit.js';

test('limits each user independently inside time window', () => {
  let now = 0;
  const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
  assert.equal(allow(1), true);
  assert.equal(allow(1), true);
  assert.equal(allow(1), false);
  assert.equal(allow(2), true);
  now = 1001;
  assert.equal(allow(1), true);
});
