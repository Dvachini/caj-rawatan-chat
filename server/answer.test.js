import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnswerer } from './answer.js';

async function collect(iterable) {
  const events = [];
  for await (const event of iterable) events.push(event);
  return events;
}

test('answerer streams evidence text then citation metadata', async () => {
  const ask = createAnswerer([
    { source: '5_extracted.txt', sourceType: 'official', text: 'Caj gigi palsu ialah RM25 dan boleh dibayar dua ansuran.' },
  ]);
  const events = await collect(ask('berapa caj gigi palsu'));

  assert.ok(events.filter(({ type }) => type === 'token').length > 1);
  assert.match(events.filter(({ type }) => type === 'token').map(({ value }) => value).join(''), /RM25/);
  assert.deepEqual(events.at(-1), {
    type: 'done',
    status: 'official',
    sources: [{ label: '5_extracted.txt', sourceType: 'official' }],
  });
});

test('answerer labels experiential fallback without private platform name', async () => {
  const ask = createAnswerer([
    { source: 'private-chat.txt', sourceType: 'experiential', text: 'Kes tiada dokumen biasanya perlu semakan lanjut.' },
  ]);
  const events = await collect(ask('kes tiada dokumen'));
  const answer = events.filter(({ type }) => type === 'token').map(({ value }) => value).join('');

  assert.match(answer, /Cadangan berdasarkan pengalaman kes terdahulu/);
  assert.doesNotMatch(JSON.stringify(events), /whatsapp|private-chat/i);
});

test('answerer refuses unrelated questions without evidence', async () => {
  const ask = createAnswerer([]);
  const events = await collect(ask('siapa menang bola'));
  const answer = events.filter(({ type }) => type === 'token').map(({ value }) => value).join('');
  assert.match(answer, /tidak menemui sumber/i);
  assert.equal(events.at(-1).status, 'not-found');
});
