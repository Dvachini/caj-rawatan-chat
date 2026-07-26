import path from 'node:path';

import { createAnswerer } from './answer.js';
import { containsSensitiveIdentifier, redactForExternalLlm } from './privacy.js';
import { buildIndex, searchIndex } from './retrieval.js';

const systemPrompt = `Anda pembantu caj rawatan KKM.
Jawab ringkas dalam Bahasa Melayu hanya berdasarkan PETIKAN.
Jangan tambah kadar, syarat, atau fakta yang tiada dalam PETIKAN.
Jika bukti tidak cukup, jawab "Belum dapat disahkan daripada sumber tersedia."
Bezakan dokumen rasmi daripada pengalaman kes terdahulu.
Jangan sebut platform komunikasi, identiti individu, atau proses pemikiran.
Untuk pergigian, jangan samakan prosedur dengan prosedur lain.`;

function sourceFor({ source, sourceType, page }) {
  return {
    label: sourceType === 'experiential' ? 'Pengalaman kes terdahulu' : path.basename(source),
    sourceType,
    ...(page ? { page } : {}),
  };
}

async function* parseSse(response, maxBytes) {
  if (!response.ok || !response.body) throw new Error(`LLM HTTP ${response.status}`);

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
      const line = block.split('\n').find((item) => item.startsWith('data: '));
      if (!line || line === 'data: [DONE]') continue;
      const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta;
      const content = delta?.content;
      if (!content) continue;
      bytes += Buffer.byteLength(content);
      if (bytes > maxBytes) throw new Error('LLM output limit exceeded');
      yield content;
    }

    if (done) break;
  }
}

export function createLlmAnswerer(documents, {
  baseUrl,
  apiKey,
  model,
  fetchImpl = fetch,
  timeoutMs = 90000,
  maxBytes = 8192,
} = {}) {
  const index = buildIndex(documents);
  const fallback = createAnswerer(documents);

  return async function* ask(question) {
    const passages = searchIndex(index, question, 3);
    if (!passages.length || !baseUrl || !apiKey || !model) {
      yield* fallback(question);
      return;
    }

    const passage = passages[0];
    if (passage.sourceType !== 'official') {
      yield* fallback(question);
      return;
    }
    if (containsSensitiveIdentifier(question)) {
      yield* fallback(question);
      return;
    }
    const safeQuestion = redactForExternalLlm(question);
    const evidence = passages.map(({ text }, index) => `PETIKAN ${index + 1}:\n${text}`).join('\n\n');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let emitted = false;

    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `SOALAN:\n${safeQuestion}\n\nJENIS SUMBER: Dokumen rasmi\n\n${redactForExternalLlm(evidence)}`,
            },
          ],
        }),
        signal: controller.signal,
      });

      for await (const value of parseSse(response, maxBytes)) {
        emitted = true;
        yield { type: 'token', value };
      }

      if (!emitted) throw new Error('LLM returned no final content');
      const sources = [...new Map(passages.map((item) => {
        const source = sourceFor(item);
        return [`${source.label}:${source.page ?? ''}`, source];
      })).values()];
      yield {
        type: 'done',
        status: passage.sourceType,
        sources,
        model,
      };
    } catch {
      const events = fallback(question);
      for await (const event of events) {
        yield event.type === 'done' ? { ...event, fallback: true } : event;
      }
    } finally {
      clearTimeout(timeout);
    }
  };
}
