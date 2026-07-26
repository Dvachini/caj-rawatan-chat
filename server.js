import express from 'express';
import path from 'node:path';

import { createApp } from './server/app.js';
import { createAuthStore } from './server/auth-store.js';
import { loadCorpus } from './server/corpus.js';
import { createDatabase, migrate } from './server/db.js';
import { createHistoryStore } from './server/history-store.js';
import { createLlmAnswerer } from './server/llm.js';

const corpusPath = process.env.CORPUS_PATH || path.join(process.cwd(), '..', 'caj_rawatan');
const documents = loadCorpus(corpusPath);
const db = createDatabase(process.env.DATABASE_URL);
await migrate(db);
const app = createApp({
  ask: createLlmAnswerer(documents, {
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
  }),
  auth: createAuthStore(db),
  history: createHistoryStore(db),
  secureCookies: process.env.COOKIE_SECURE === 'true',
});
const port = Number(process.env.PORT) || 5000;

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(process.cwd(), 'dist');
  app.use(express.static(dist, { index: false }));
  app.get('*splat', (request, response) => response.sendFile(path.join(dist, 'index.html')));
}

app.listen(port, () => console.log(`[app] caj-rawatan-chat listening on ${port}`));
