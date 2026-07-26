import test from 'node:test';
import assert from 'node:assert/strict';

import { createLlmAnswerer } from './llm.js';

const documents = [
  { source: '5_extracted.txt', sourceType: 'official', text: 'Pelaksanaan bayaran ansuran bagi pembuatan gigi palsu.' },
  { source: '5_extracted.txt', sourceType: 'official', text: 'Contoh caj gigi palsu RM25 dibayar RM13 dan RM12.' },
];

test('LLM receives multiple top passages needed to answer amount', async () => {
  let requestBody;
  const fetchImpl = async (url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response('data: {"choices":[{"delta":{"content":"RM25"}}]}\n\ndata: [DONE]\n\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  };
  const ask = createLlmAnswerer(documents, {
    baseUrl: 'https://example.test/v1', apiKey: 'secret', model: 'model', fetchImpl,
  });
  for await (const event of ask('berapa caj gigi palsu')) void event;

  const prompt = requestBody.messages.at(-1).content;
  assert.match(prompt, /Pelaksanaan bayaran ansuran/);
  assert.match(prompt, /RM25 dibayar RM13 dan RM12/);
});

test('citations are deduplicated when passages share source', async () => {
  const fetchImpl = async () => new Response('data: {"choices":[{"delta":{"content":"RM25"}}]}\n\ndata: [DONE]\n\n');
  const ask = createLlmAnswerer(documents, {
    baseUrl: 'https://example.test/v1', apiKey: 'secret', model: 'model', fetchImpl,
  });
  const events = [];
  for await (const event of ask('berapa caj gigi palsu')) events.push(event);

  assert.deepEqual(events.at(-1).sources, [{ label: '5_extracted.txt', sourceType: 'official' }]);
});
