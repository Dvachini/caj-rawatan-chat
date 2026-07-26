import test from 'node:test';
import assert from 'node:assert/strict';

import { createLlmAnswerer } from './llm.js';

const documents = [
  { source: 'official.txt', sourceType: 'official', text: 'Caj pesakit luar ialah RM40. Rekod contoh IC 900101-14-5678.' },
  { source: 'chat.txt', sourceType: 'experiential', text: 'Pengalaman kes tiada dokumen perlu semakan.' },
];

function provider(content = 'RM40') {
  return async () => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`, { status: 200 });
}

test('experiential evidence never reaches external LLM', async () => {
  let called = false;
  const ask = createLlmAnswerer(documents, { baseUrl: 'https://provider.test/v1', apiKey: 'key', model: 'model', fetchImpl: async () => { called = true; return provider()(); } });
  const events = [];
  for await (const event of ask('tiada dokumen semakan')) events.push(event);
  assert.equal(called, false);
  assert.equal(events.at(-1).status, 'experiential');
});

test('official request redacts identifiers before external LLM', async () => {
  let request;
  const ask = createLlmAnswerer(documents, { baseUrl: 'https://provider.test/v1', apiKey: 'key', model: 'model', fetchImpl: async (url, options) => { request = JSON.parse(options.body); return provider()(); } });
  for await (const event of ask('Berapa caj pesakit luar?')) void event;
  const sent = JSON.stringify(request);
  assert.doesNotMatch(sent, /900101-14-5678/);
  assert.match(sent, /redacted/);
});

test('sensitive experiential query stays local', async () => {
  let called = false;
  const ask = createLlmAnswerer(documents, { baseUrl: 'https://provider.test/v1', apiKey: 'key', model: 'model', fetchImpl: async () => { called = true; return provider()(); } });
  for await (const event of ask('tiada dokumen IC 900101-14-5678')) void event;
  assert.equal(called, false);
});
