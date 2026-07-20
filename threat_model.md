# Threat Model

## Project Overview

Ember is a multi-user daily expense tracker. An Express 5 API server (`artifacts/api-server`) persists each user's expenses, budgets, preferences, recurring rules, savings goals, no-spend challenges, and AI-coach conversations in PostgreSQL via Drizzle ORM. A React/Vite web app and an Expo mobile app consume the same API. Input is validated with Zod schemas generated from an OpenAPI spec.

**Tech stack:** Node.js 24 / TypeScript 5.9, Express 5, PostgreSQL + Drizzle ORM, Zod, esbuild.

**Users:** Multi-tenant. Every account authenticates through Replit Auth (OIDC) and sees only its own data. There is no admin/superuser role — all authenticated principals have identical, self-scoped privileges.

## Assets

- **Per-user financial records** — expenses, budgets, recurring rules, goals, challenges (amounts, categories, descriptions, dates). Disclosure or modification across users is the primary privacy risk this model defends against.
- **AI-coach conversations & messages** — free-text chat history grounded in the user's finances; must never leak across users.
- **Sessions** — the `sessions` table holds OIDC session state (access/refresh tokens). Theft of a session id (`sid`) impersonates the user.
- **Database connection** — `DATABASE_URL`. Compromise gives full cross-user database access.

## Trust Boundaries

- **Browser/mobile → API** — All client requests cross this boundary. `authMiddleware` resolves a session from the `sid` (cookie or `Authorization: Bearer`); `requireAuth` rejects anonymous callers with 401 before any data route runs.
- **Authenticated user → another user's data** — The core boundary of this app. Enforced in every data query by an owner predicate (`user_id = <caller>`); it is never derived from client input.
- **API → PostgreSQL** — Drizzle ORM with parameterized queries; ownership FKs (`ON DELETE CASCADE`) keep orphaned rows from outliving their owner.

## Scan Anchors

- **Production entry point:** `artifacts/api-server/src/app.ts` → `artifacts/api-server/src/routes/`
- **AuthN/AuthZ:** `artifacts/api-server/src/middlewares/authMiddleware.ts` (session resolution), `middlewares/requireAuth.ts` (401 gate), `src/lib/auth.ts` (session store), `src/lib/user.ts` (`userId(req)` — the single source of the caller's id)
- **Ownership-scoped routes:** every file in `artifacts/api-server/src/routes/` except `health.ts` — each read/write filters by `userId`
- **DB layer:** `lib/db/src/index.ts`, `lib/db/src/schema/` — every domain table carries `user_id` NOT NULL → `users.id`
- **Money math:** `artifacts/api-server/src/lib/money.ts` — integer-cent aggregation
- **Frontend (dev/canvas):** `artifacts/expense-tracker/`, `artifacts/mobile/`, `artifacts/mockup-sandbox/` — clients only; no authority over ownership

## Threat Categories

### Spoofing / Authentication

`requireAuth` is mounted ahead of all data routers, so every endpoint under `/api` (except health) returns 401 without a valid session. Sessions are looked up server-side by `sid`; expired sessions are deleted and rejected. Session ids are 256-bit random values. There is no unauthenticated data path.

**Guarantee:** No expense, budget, insight, goal, challenge, or conversation data is served without an authenticated session.

### Tampering / Authorization (primary risk)

Every query is scoped to the authenticated owner via `user_id = userId(req)` in the `WHERE` clause; `userId` comes only from the server-resolved session, never from a request body, param, or header. Object-level access to another user's row (read, update, delete, goal contribution, challenge deletion, conversation message) returns **404 Not Found** — indistinguishable from a row that does not exist, so the API does not confirm the existence of other users' records. Cross-user writes therefore cannot target another user's row id.

The earlier `PUT /api/budget` defect (an `UPDATE` with no `WHERE`, which rewrote every row) is resolved: budget and preferences are per-user get-or-create rows (unique index on `user_id`, `onConflictDoNothing` + re-read to stay race-safe) and every mutation is scoped to the caller's own row.

### Information Disclosure

List endpoints return only the caller's rows. Insight aggregates (daily/weekly/stats/tips) are computed exclusively over the caller's expenses. Error responses for foreign objects are 404, avoiding an oracle that would reveal other users' record ids. Auth headers/cookies are redacted in logs.

### Denial of Service

`express-rate-limit` caps requests at 100/min/IP globally and the AI-coach message route at 10/min (the only route that triggers an outbound model call). List/aggregate queries are index-backed (`(user_id, date)` and per-owner indexes). The coach route also enforces a per-message character cap and a bounded history budget before calling the model.

### Elevation of Privilege

No roles exist; every authenticated user is confined to their own data and no endpoint grants cross-user or administrative reach. There is no code path that widens a caller's scope beyond `userId(req)`.

## Residual Risks & Assumptions

- **Session-id theft** (XSS, token exfiltration) impersonates a user. Mitigations: same-origin CORS with credentials, auth headers redacted from logs, short-lived OIDC access tokens with server-side refresh. Client-side XSS hardening is out of scope for this model.
- **`DATABASE_URL` compromise** bypasses all application-layer isolation. Treated as an infrastructure/secret-management concern.
- **Shared-IP rate limiting** — behind the Replit proxy, `trust proxy` is set to one hop; many users behind one NATed IP share the global bucket. Acceptable for current scale.
- **New tables/routes must opt in** — isolation is enforced per query, not by a global filter. Any future domain table must add a `user_id` FK and every new query must include the owner predicate; the test suite in `src/test/` is the regression guard for this.
