# Threat Model

## Project Overview

A Node.js/Express 5 daily expense tracker API with a React frontend. The backend stores expenses and budget limits in PostgreSQL via Drizzle ORM. Input is validated with Zod schemas generated from an OpenAPI spec. The project is not yet deployed but the API server is production-capable.

**Tech stack:** Node.js 24 / TypeScript 5.9, Express 5, PostgreSQL + Drizzle ORM, Zod v4, esbuild.

**Users:** Single-user personal finance app (no multi-tenancy evident in the schema).

## Assets

- **Expense records** — amounts, categories, descriptions, and dates stored in PostgreSQL. Disclosure or modification affects personal financial privacy.
- **Budget configuration** — daily and monthly spending limits. Tampering can silently neutralize budget controls.
- **Database connection** — `DATABASE_URL` environment variable. Compromise gives full database access.

## Trust Boundaries

- **Browser → API** — All client requests cross this boundary. Currently no authentication is enforced at the API layer; every endpoint is publicly reachable.
- **API → PostgreSQL** — Drizzle ORM with parameterized queries; the DB connection string is held in the environment.
- **Public / Authenticated** — No boundary currently exists. All routes under `/api` are unauthenticated.

## Scan Anchors

- **Production entry point:** `artifacts/api-server/src/app.ts` → `artifacts/api-server/src/routes/`
- **Highest-risk routes:** `artifacts/api-server/src/routes/expenses.ts`, `artifacts/api-server/src/routes/budget.ts`
- **DB layer:** `lib/db/src/index.ts`, `lib/db/src/schema/`
- **Frontend (dev/canvas):** `artifacts/expense-tracker/`, `artifacts/mockup-sandbox/` — UI only; no server-side logic
- **All API routes are public** — no authentication middleware exists anywhere

## Threat Categories

### Spoofing / Authentication

No authentication middleware is present in the Express application (`app.ts`). Every endpoint under `/api/expenses`, `/api/budget`, and `/api/insights` is reachable without credentials. Any party who can reach the server can read all expenses, modify budget limits, or delete all records.

**Required guarantee:** All mutating and data-reading endpoints MUST require a valid authentication token before serving data.

### Tampering

CORS is configured with `cors()` and no options, which defaults to `Access-Control-Allow-Origin: *`. Any origin on the internet can issue cross-origin requests to the API. Without CSRF-resistant authentication (e.g., token in Authorization header), browser requests from malicious pages could reach the API using the user's browser context.

The `PUT /api/budget` handler calls `db.update(budgetTable).set({...})` with no `.where()` clause, meaning every budget row in the table is updated on each write (a logic bug with data-integrity implications).

### Information Disclosure

All expense data (amounts, categories, descriptions) is returned to any caller with no authorization check. For a personal finance app this constitutes a privacy violation if the server is internet-reachable.

### Denial of Service

No rate limiting exists on any endpoint. The `GET /expenses` route performs a full table scan with optional filters; an attacker can issue an unbounded number of requests, stressing both the Express process and the PostgreSQL connection pool.

### Elevation of Privilege

No role or permission model is defined. With no authentication, elevation is moot — every caller already has full access.
