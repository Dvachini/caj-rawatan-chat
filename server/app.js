import compression from 'compression';
import express from 'express';
import helmet from 'helmet';

import { addAuthRoutes, requireUser } from './auth-routes.js';
import { createRateLimiter } from './rate-limit.js';

async function* unavailableAnswer() {
  yield {
    type: 'token',
    value: 'Sumber caj rawatan belum diindeks. Sistem tidak akan mereka jawapan atau kadar.',
  };
  yield { type: 'done', status: 'requires-index', sources: [] };
}

function streamHeaders(response) {
  response.status(200);
  response.set({
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  response.flushHeaders();
}

function sendEvent(response, event) {
  response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  response.flush?.();
}

function addHistoryRoutes(app, auth, history) {
  app.get('/api/conversations', requireUser(auth), async (request, response) => {
    const conversations = await history.list(request.user.id);
    response.json({ conversations });
  });

  app.get(
    '/api/conversations/:id',
    requireUser(auth),
    async (request, response) => {
      const conversation = await history.get(
        request.user.id,
        request.params.id,
      );

      if (!conversation) {
        return response.status(404).json({
          error: 'Perbualan tidak ditemui.',
        });
      }

      return response.json({ conversation });
    },
  );
}

export function createApp({
  ask = unavailableAnswer,
  auth,
  history,
  secureCookies = false,
} = {}) {
  const app = express();
  const allowChat = createRateLimiter();
  const protectChat = auth
    ? requireUser(auth)
    : (request, response, next) => next();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: null },
      },
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' });
  });

  if (auth) addAuthRoutes(app, auth, { secureCookies });
  if (auth && history) addHistoryRoutes(app, auth, history);

  app.post('/api/chat', protectChat, async (request, response) => {
    const message = request.body?.message;
    const validMessage =
      typeof message === 'string' &&
      message.trim() &&
      message.length <= 2000;

    if (!validMessage) {
      return response.status(400).json({
        error: 'Soalan mesti antara 1 hingga 2000 aksara.',
      });
    }

    if (auth && !allowChat(request.user.id)) {
      return response.status(429).json({
        error: 'Terlalu banyak soalan. Cuba lagi sebentar.',
      });
    }

    const question = message.trim();
    let conversationId = request.body?.conversationId;

    if (history && request.user && !conversationId) {
      const conversation = await history.create(request.user.id, question);
      conversationId = conversation.id;
    }

    streamHeaders(response);

    let answer = '';
    let sources = [];

    try {
      for await (const event of ask(question, { signal: request.signal })) {
        if (response.destroyed) break;
        if (event.type === 'token') answer += event.value;
        if (event.type === 'done') sources = event.sources || [];

        sendEvent(response, event);
      }
    } catch (error) {
      if (!response.destroyed) {
        sendEvent(response, {
          type: 'error',
          value: 'Jawapan tidak dapat dijana.',
        });
        console.error('[chat]', error.message);
      }
    }

    if (history && request.user && conversationId && answer) {
      await history.save(
        conversationId,
        request.user.id,
        question,
        answer,
        sources,
      );
    }

    return response.end();
  });

  return app;
}
