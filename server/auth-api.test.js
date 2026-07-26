import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from './app.js';

function memoryAuth() {
  const users = new Map();
  const sessions = new Map();
  let invite = 'invite-token';
  return {
    async register({ email, password, token }) {
      if (token !== invite) return null;
      invite = null;
      const user = { id: 1, email, role: 'admin', password };
      users.set(email, user);
      return { id: user.id, email, role: user.role };
    },
    async login(email, password) {
      const user = users.get(email);
      if (!user || user.password !== password) return null;
      sessions.set('session-token', user);
      return { token: 'session-token', user: { id: user.id, email, role: user.role } };
    },
    async authenticate(token) { return sessions.get(token) ?? null; },
    async logout(token) { sessions.delete(token); },
  };
}

async function start() {
  const app = createApp({ auth: memoryAuth(), ask: async function* () { yield { type: 'done', status: 'official', sources: [] }; } });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

async function json(url, path, body, cookie = '') {
  const response = await fetch(url + path, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
  return { response, body: await response.json() };
}

test('invite registration, login, session, logout lifecycle', async (t) => {
  const { server, url } = await start(); t.after(() => server.close());
  let result = await json(url, '/api/auth/register', { email: 'admin@example.com', password: 'long-secure-password', invite: 'invite-token' });
  assert.equal(result.response.status, 201);
  result = await json(url, '/api/auth/login', { email: 'admin@example.com', password: 'long-secure-password' });
  assert.equal(result.response.status, 200);
  const cookie = result.response.headers.get('set-cookie').split(';')[0];
  const session = await fetch(url + '/api/auth/session', { headers: { cookie } });
  assert.equal((await session.json()).user.email, 'admin@example.com');
  const logout = await fetch(url + '/api/auth/logout', { method: 'POST', headers: { cookie } });
  assert.equal(logout.status, 204);
});

test('chat rejects anonymous user when auth enabled', async (t) => {
  const { server, url } = await start(); t.after(() => server.close());
  const response = await fetch(url + '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'caj' }) });
  assert.equal(response.status, 401);
});
