import test from 'node:test';
import assert from 'node:assert/strict';

import { redactForExternalLlm, containsSensitiveIdentifier } from './privacy.js';

test('redacts phone, email, and Malaysian identification numbers', () => {
  const clean = redactForExternalLlm('Hubungi Ali di 012-3456789, ali@example.com, IC 900101-14-5678.');
  assert.doesNotMatch(clean, /012|ali@example|900101-14-5678/);
  assert.match(clean, /\[redacted\]/g);
});

test('detects likely sensitive identifiers', () => {
  assert.equal(containsSensitiveIdentifier('IC saya 900101-14-5678'), true);
  assert.equal(containsSensitiveIdentifier('Berapa caj pesakit luar warga asing?'), false);
});

test('experiential sources are never eligible for external LLM', () => {
  assert.equal(containsSensitiveIdentifier('Pengalaman kes terdahulu'), false);
});
