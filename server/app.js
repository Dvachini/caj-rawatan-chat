import compression from 'compression';
import express from 'express';
import helmet from 'helmet';

import { addAuthRoutes, requireUser } from './auth-routes.js';
import { createRateLimiter } from './rate-limit.js';

async function* unavailableAnswer() {
  yield { type: 'token', value: 'Sumber caj rawatan belum diindeks. Sistem tidak akan mereka jawapan atau kadar.' };
  yield { type: 'done', status: 'requires-index', sources: [] };
}

export function createApp({ ask = unavailableAnswer, auth, history, secureCookies = false } = {}) {
  const app = express();
  const allowChat = createRateLimiter();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: null },
    },
  }));
  app.use(compression());
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' });
  });

  if (auth) addAuthRoutes(app, auth, { secureCookies });

  if (auth && history) {
    app.get('/api/conversations', requireUser(auth), async (request, response) => {
      response.json({ conversations: await history.list(request.user.id) });
    });
    app.get('/api/conversations/:id', requireUser(auth), async (request, response) => {
      const conversation = await history.get(request.user.id, request.params.id);
      return conversation ? response.json({ conversation }) : response.status(404).json({ error: 'Perbualan tidak ditemui.' });
    });
  }

  app.post('/api/chat', ...(auth ? [requireUser(auth)] : []), async (request, response) => {
    const message = request.body?.message;

    if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
      return response.status(400).json({ error: 'Soalan mesti antara 1 hingga 2000 aksara.' });
    }
    if (auth && !allowChat(request.user.id)) return response.status(429).json({ error: 'Terlalu banyak soalan. Cuba lagi sebentar.' });

    let conversationId = request.body?.conversationId;
    if (history && request.user && !conversationId) {
      conversationId = (await history.create(request.user.id, message.trim())).id;
    }

    response.status(200);
    response.set({
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      'x-accel-buffering': 'no',
    });
    response.flushHeaders();

    let answer = '';
    let sources = [];
    try {
      for await (const event of ask(message.trim(), { signal: request.signal })) {
        if (response.destroyed) break;
        if (event.type === 'token') answer += event.value;
        if (event.type === 'done') sources = event.sources || [];
        response.write(`${JSON.stringify(event)}\n`);
        response.flush?.();
      }
    } catch (error) {
      if (!response.destroyed) {
        response.write(`${JSON.stringify({ type: 'error', value: 'Jawapan tidak dapat dijana.' })}\n`);
        console.error('[chat]', error.message);
      }
    }

    if (history && request.user && conversationId && answer) {
      await history.save(conversationId, request.user.id, message.trim(), answer, sources);
    }

    return response.end();
  });

  return app;
}
