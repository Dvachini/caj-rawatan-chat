import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnswerer } from './answer.js';

async function collect(iterable) {
  const events = [];
  for await (const event of iterable) events.push(event);
  return events;
}

test('public citation hides source directories', async () => {
  const ask = createAnswerer([{ source: 'private-folder/official.txt', sourceType: 'official', text: 'Caj pesakit luar warga asing ialah RM40.' }]);
  const events = await collect(ask('caj pesakit luar warga asing'));
  assert.equal(events.at(-1).sources[0].label, 'official.txt');
});

test('answer uses only best matching passage', async () => {
  const ask = createAnswerer([
    { source: 'best.txt', sourceType: 'official', text: 'Caj gigi palsu RM25.' },
    { source: 'other.txt', sourceType: 'official', text: 'Rawatan gigi lain memerlukan semakan.' },
  ]);
  const events = await collect(ask('caj gigi palsu'));
  assert.equal(events.at(-1).sources.length, 1);
});
