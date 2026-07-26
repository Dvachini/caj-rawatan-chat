import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseEvidence, publicSourceLabel } from './policy.js';

test('official evidence wins over experiential evidence', () => {
  const evidence = chooseEvidence([
    { sourceType: 'experiential', text: 'Pengalaman lama' },
    { sourceType: 'official', text: 'Perintah Fi' },
  ]);

  assert.deepEqual(evidence, [{ sourceType: 'official', text: 'Perintah Fi' }]);
});

test('experiential evidence is used only when official evidence is absent', () => {
  const evidence = chooseEvidence([
    { sourceType: 'experiential', text: 'Pengalaman kes terdahulu' },
  ]);

  assert.deepEqual(evidence, [
    { sourceType: 'experiential', text: 'Pengalaman kes terdahulu' },
  ]);
});

test('private chat platform is never exposed in public source label', () => {
  assert.equal(publicSourceLabel('experiential'), 'Pengalaman kes terdahulu');
  assert.equal(publicSourceLabel('official'), 'Dokumen rasmi');
});

test('unsupported source types are discarded', () => {
  assert.deepEqual(chooseEvidence([{ sourceType: 'unknown', text: 'No' }]), []);
});
