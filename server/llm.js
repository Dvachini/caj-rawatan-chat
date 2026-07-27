import path from 'node:path';

import { createAnswerer } from './answer.js';
import {
  containsSensitiveIdentifier,
  redactForExternalLlm,
} from './privacy.js';
import { buildIndex, searchIndex } from './retrieval.js';

const systemPrompt = `Anda pembantu caj rawatan KKM.
Jawab ringkas dalam Bahasa Melayu hanya berdasarkan PETIKAN.
Jangan tambah kadar, syarat, atau fakta yang tiada dalam PETIKAN.
Jika bukti tidak cukup, jawab "Belum dapat disahkan daripada sumber tersedia."
Bezakan dokumen rasmi daripada pengalaman kes terdahulu.
Jangan sebut platform komunikasi, identiti individu, atau proses pemikiran.
Untuk pergigian, jangan samakan prosedur dengan prosedur lain.`;

function publicSource({ source, sourceType, page }) {
  return {
    label:
      sourceType === 'experiential'
        ? 'Pengalaman kes terdahulu'
        : path.basename(source),
    sourceType,
    ...(page ? { page } : {}),
  };
}

function uniqueSources(passages) {
  const sources = passages.map(publicSource);
  const unique = new Map(
    sources.map((source) => [
      `${source.label}:${source.page || ''}`,
      source,
    ]),
  );
  return [...unique.values()];
}

function evidenceText(passages) {
  return passages
    .map(({ text }, index) => `PETIKAN ${index + 1}:\n${text}`)
    .join('\n\n');
}

function requestBody(model, question, passages) {
  const safeQuestion = redactForExternalLlm(question);
  const safeEvidence = redactForExternalLlm(evidenceText(passages));

  return JSON.stringify({
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `SOALAN:\n${safeQuestion}\n\nJENIS SUMBER: Dokumen rasmi\n\n${safeEvidence}`,
      },
    ],
  });
}

async function* streamContent(response, maxBytes) {
  if (!response.ok || !response.body) {
    throw new Error(`LLM HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let bytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop();

    for (const block of blocks) {
      const line = block
        .split('\n')
        .find((item) => item.startsWith('data: '));

      if (!line || line === 'data: [DONE]') continue;

      const event = JSON.parse(line.slice(6));
      const content = event.choices?.[0]?.delta?.content;
      if (!content) continue;

      bytes += Buffer.byteLength(content);
      if (bytes > maxBytes) {
        throw new Error('LLM output limit exceeded');
      }

      yield content;
    }

    if (done) return;
  }
}

async function* extractiveFallback(fallback, question) {
  for await (const event of fallback(question)) {
    if (event.type === 'done') {
      yield { ...event, fallback: true };
      continue;
    }

    yield event;
  }
}

export function createLlmAnswerer(
  documents,
  {
    baseUrl,
    apiKey,
    model,
    fetchImpl = fetch,
    timeoutMs = 90000,
    maxBytes = 8192,
  } = {},
) {
  const index = buildIndex(documents);
  const fallback = createAnswerer(documents);
  const apiUrl = `${baseUrl?.replace(/\/$/, '')}/chat/completions`;

  return async function* answerQuestion(question) {
    const passages = searchIndex(index, question, 3);
    const canUseLlm =
      passages.length &&
      baseUrl &&
      apiKey &&
      model &&
      passages[0].sourceType === 'official' &&
      !containsSensitiveIdentifier(question);

    if (!canUseLlm) {
      yield* fallback(question);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let hasContent = false;

    try {
      const response = await fetchImpl(apiUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: requestBody(model, question, passages),
        signal: controller.signal,
      });

      for await (const value of streamContent(response, maxBytes)) {
        hasContent = true;
        yield { type: 'token', value };
      }

      if (!hasContent) throw new Error('LLM returned no final content');

      yield {
        type: 'done',
        status: 'official',
        sources: uniqueSources(passages),
        model,
      };
    } catch {
      yield* extractiveFallback(fallback, question);
    } finally {
      clearTimeout(timeout);
    }
  };
}
