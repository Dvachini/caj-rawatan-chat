import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, newSessionToken, verifyPassword } from './auth.js';

test('password hash verifies correct password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
});

test('password hash rejects wrong password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('session token has public selector and secret verifier', () => {
  const session = newSessionToken();
  assert.match(session.token, /^[a-f0-9]{32}\.[a-f0-9]{64}$/);
  assert.equal(session.selector.length, 32);
  assert.equal(session.verifierHash.length, 64);
  assert.notEqual(session.verifierHash, session.token.split('.')[1]);
});
