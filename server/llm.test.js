import test from 'node:test';
import assert from 'node:assert/strict';

import { createLlmAnswerer } from './llm.js';

const documents = [
  { source: '5_extracted.txt', sourceType: 'official', text: 'Contoh caj gigi palsu ialah RM25, dibayar RM13 dan RM12.' },
];

function sseResponse(events) {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

async function collect(iterable) {
  const events = [];
  for await (const event of iterable) events.push(event);
  return events;
}

test('streams final content but never provider reasoning', async () => {
  const fetchImpl = async () => sseResponse([
    { choices: [{ delta: { reasoning_content: 'Rahsia proses fikir' } }] },
    { choices: [{ delta: { content: 'Caj gigi palsu ' } }] },
    { choices: [{ delta: { content: 'ialah RM25.' } }] },
  ]);
  const ask = createLlmAnswerer(documents, { baseUrl: 'https://example.test/v1', apiKey: 'secret', model: 'model', fetchImpl });
  const events = await collect(ask('Berapa caj gigi palsu?'));
  const answer = events.filter(({ type }) => type === 'token').map(({ value }) => value).join('');

  assert.equal(answer, 'Caj gigi palsu ialah RM25.');
  assert.doesNotMatch(JSON.stringify(events), /Rahsia proses fikir/);
  assert.deepEqual(events.at(-1).sources, [{ label: '5_extracted.txt', sourceType: 'official' }]);
});

test('falls back to extractive answer when provider fails', async () => {
  const fetchImpl = async () => { throw new Error('provider down'); };
  const ask = createLlmAnswerer(documents, { baseUrl: 'https://example.test/v1', apiKey: 'secret', model: 'model', fetchImpl });
  const events = await collect(ask('Berapa caj gigi palsu?'));
  const answer = events.filter(({ type }) => type === 'token').map(({ value }) => value).join('');

  assert.match(answer, /RM25/);
  assert.equal(events.at(-1).fallback, true);
});

test('does not call LLM when no matching evidence exists', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return sseResponse([]); };
  const ask = createLlmAnswerer(documents, { baseUrl: 'https://example.test/v1', apiKey: 'secret', model: 'model', fetchImpl });
  const events = await collect(ask('siapa menang bola?'));

  assert.equal(called, false);
  assert.equal(events.at(-1).status, 'not-found');
});
