# Ember — Daily Expense Tracker

Ember is a personal daily expense tracker: log what you spend, set daily/monthly budget limits, and get automatic heads-up alerts and saving tips based on your spending patterns.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080 via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — auth session signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server), Replit Auth (OIDC) with session cookies, express-rate-limit (100 req/min/IP)
- Frontend: React + Vite + wouter + shadcn/ui + TanStack Query (artifacts/expense-tracker, served at `/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- API contract (source of truth): `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/` (expenses, budget, users/sessions for auth)
- API routes: `artifacts/api-server/src/routes/` (expenses, budget, insights, auth, health)
- Auth middleware: `artifacts/api-server/src/middlewares/`; frontend hook: `lib/replit-auth-web` (`useAuth`)
- Frontend pages: `artifacts/expense-tracker/src/pages/` (Dashboard `/`, Expenses `/expenses`, Budget `/budget`)

## Architecture decisions

- All expense/budget/insights endpoints require a Replit Auth session; CORS restricted to app origins with credentials
- Budget is a single-row table (get-or-create pattern); PUT scoped to the fetched row id
- Tips/alerts are computed server-side in `insights.ts` from actual spending vs budget (80%/100% daily thresholds, 90% monthly)
- Amounts stored as `numeric(10,2)` strings in Postgres, parsed to numbers at the API boundary

## Product

- Dashboard: today's spend vs daily limit, category breakdown, weekly overview, automatic alerts/tips
- Expense log with date/category filters and add/edit/delete
- Budget settings for daily and monthly limits
- Login required (Replit Auth); user identity + logout in the app shell

## User preferences

- App name should be non-obvious and evocative — user rejected "SpendWise" as too obvious; current name: **Ember**
- User wants organized, scannable UI/UX — prioritize clear hierarchy and grouping in any UI changes

## Gotchas

- Google Fonts `@import` must be the FIRST line of `src/index.css` (before `@import 'tailwindcss'`) or PostCSS fails
- Re-run codegen after every OpenAPI spec change; body schemas must use entity-shaped names (`ExpenseInput`, not `CreateExpenseBody`)
- Express 5: parse `req.params.id` (may be `string | string[]`), annotate async handlers `Promise<void>`
- Never use `console.log` in server code — use `req.log` / `logger` (pino)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
