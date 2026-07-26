# Caj Rawatan Chat

Secure, source-grounded chatbot foundation for Malaysian treatment-fee references.

## Current scope

- Responsive React chat UI with cancellable live token rendering
- NDJSON streaming Express API with Helmet, compression, and strict body validation
- Local indexing of official extracts, summaries, and sanitized experiential material
- Official evidence preferred over experiential evidence
- Experiential evidence exposed only as `Pengalaman kes terdahulu`
- Private contact details and source directories excluded from public output
- Filtered OpenAI-compatible LLM streaming with hidden reasoning discarded
- 90-second provider timeout and 8 KB final-answer limit
- Automatic cited extractive fallback when model fails, times out, or returns no final content
- No fee invented outside retrieved evidence
- Tests for retrieval, privacy, source policy, LLM filtering/fallback, and HTTP streaming

Not implemented yet: PostgreSQL users/sessions, authentication, distributed rate limiting, or deployment. `mrld-gpt-5.6-sol` is configured; slow provider responses fall back safely to source excerpts.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

Production:

```bash
npm run build
npm start
```

Open `http://127.0.0.1:5000`.

## Verify

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

## Source policy

1. Official documents win when matching evidence exists.
2. Experiential material is considered only when official material is silent.
3. Private platform and participant identities are never exposed.
4. Dental procedures must match exact official procedure; no similar-procedure charge mapping.
5. Registration charge is assessed separately.

## Project structure

```text
src/                  React UI
server/app.js         HTTP API
server/policy.js      Source authority policy
server/*.test.js      Node test runner tests
server.js             Production entry point
```
