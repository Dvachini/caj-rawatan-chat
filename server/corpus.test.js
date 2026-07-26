import test from 'node:test';
import assert from 'node:assert/strict';

import { chunkText, redactPrivateText } from './corpus.js';

test('chunks preserve source line range', () => {
  const chunks = chunkText(
    'Baris pertama mempunyai kandungan rasmi\nBaris kedua menerangkan kadar rawatan\nBaris ketiga mempunyai syarat kelayakan\nBaris keempat menerangkan sumber kadar',
    { source: 'a.txt', sourceType: 'official' },
    2,
  );
  assert.deepEqual(chunks.map(({ lineStart, lineEnd }) => [lineStart, lineEnd]), [[1, 2], [3, 4]]);
});

test('private text removes phone numbers and email addresses', () => {
  const clean = redactPrivateText('Ali 012-3456789 ali@example.com kata caj perlu semakan.');
  assert.doesNotMatch(clean, /012|example\.com|Ali/);
  assert.match(clean, /caj perlu semakan/);
});
