import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIndex, searchIndex } from './retrieval.js';

const documents = [
  { source: 'official.txt', sourceType: 'official', text: 'Caj gigi palsu ialah RM25. Bayaran boleh dibuat dua ansuran.' },
  { source: 'experience.txt', sourceType: 'experiential', text: 'Kes gigi palsu biasanya dirujuk kepada penyelaras.' },
  { source: 'experience.txt', sourceType: 'experiential', text: 'Kes tiada dokumen biasanya perlu semakan lanjut.' },
];

test('official matching passage wins over experiential match', () => {
  const results = searchIndex(buildIndex(documents), 'berapa caj gigi palsu');
  assert.equal(results[0].sourceType, 'official');
  assert.match(results[0].text, /RM25/);
});

test('experiential passage is returned when official source is silent', () => {
  const results = searchIndex(buildIndex(documents), 'kes tiada dokumen');
  assert.equal(results[0].sourceType, 'experiential');
});

test('unrelated query returns no evidence', () => {
  assert.deepEqual(searchIndex(buildIndex(documents), 'kapal terbang'), []);
});
