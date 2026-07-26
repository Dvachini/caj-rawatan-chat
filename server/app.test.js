import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from './app.js';

async function start() {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test('health endpoint returns ready state', async (t) => {
  const { server, url } = await start();
  t.after(() => server.close());

  const response = await fetch(`${url}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('CSP does not upgrade Tailscale HTTP assets to unavailable HTTPS', async (t) => {
  const { server, url } = await start();
  t.after(() => server.close());

  const response = await fetch(`${url}/api/health`);
  assert.doesNotMatch(response.headers.get('content-security-policy'), /upgrade-insecure-requests/);
});

test('chat rejects empty questions', async (t) => {
  const { server, url } = await start();
  t.after(() => server.close());

  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: '' }),
  });

  assert.equal(response.status, 400);
});

test('chat streams grounded tokens and final citations', async (t) => {
  const app = createApp({
    ask: async function* () {
      yield { type: 'token', value: 'Caj ' };
      yield { type: 'token', value: 'RM25.' };
      yield { type: 'done', status: 'official', sources: [{ label: '5.pdf', page: 2 }] };
    },
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Berapa caj gigi palsu?' }),
  });
  const lines = (await response.text()).trim().split('\n').map(JSON.parse);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/x-ndjson/);
  assert.deepEqual(lines.map(({ type }) => type), ['token', 'token', 'done']);
  assert.equal(lines.at(-1).sources[0].label, '5.pdf');
});
