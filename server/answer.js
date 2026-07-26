import path from 'node:path';

import { buildIndex, searchIndex } from './retrieval.js';

function streamText(text) {
  return text.match(/\S+\s*/g) ?? [];
}

export function createAnswerer(documents) {
  const index = buildIndex(documents);

  return async function* ask(question) {
    const passages = searchIndex(index, question, 1);

    if (!passages.length) {
      for (const value of streamText('Tidak menemui sumber yang sepadan. Cuba nyatakan rawatan, status warganegara, umur, jenis rujukan, GL, dan fasiliti.')) {
        yield { type: 'token', value };
      }
      yield { type: 'done', status: 'not-found', sources: [] };
      return;
    }

    const experiential = passages[0].sourceType === 'experiential';
    const prefix = experiential
      ? 'Cadangan berdasarkan pengalaman kes terdahulu, bukan ketetapan rasmi:\n\n'
      : 'Berdasarkan dokumen rasmi:\n\n';
    const answer = `${prefix}${passages.map(({ text }) => text.trim()).join('\n\n')}`;

    for (const value of streamText(answer)) yield { type: 'token', value };

    yield {
      type: 'done',
      status: experiential ? 'experiential' : 'official',
      sources: passages.map(({ source, sourceType, page }) => ({
        label: sourceType === 'experiential' ? 'Pengalaman kes terdahulu' : path.basename(source),
        sourceType,
        ...(page ? { page } : {}),
      })),
    };
  };
}
