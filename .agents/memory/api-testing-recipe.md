---
name: API integration testing principles
description: Durable rules for testing the Express API in this workspace
---

A working harness exists in `artifacts/api-server/src/test/` — extend it rather than building a new one. Durable rules behind it:

- Authenticate by minting real DB sessions (users + sessions rows, Bearer sid) — never mock the auth middleware and never touch OIDC/network.
- Model-backed routes: tests may only exercise pre-model paths (validation 400s, ownership 404s) so no real Anthropic calls ever fire.
- `NODE_ENV=test` is load-bearing: rate limiters and the pino-pretty worker are gated on it (the suite shares one loopback IP; the worker thread blocks vitest exit).
- Tests share the real dev DB: keep files sequential, use random per-run ids, and clean up by deleting test users (FK cascade) + their sessions.
