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
- Mobile: Expo SDK 54 + expo-router (artifacts/mobile, preview at `/mobile/`), same API via `@workspace/api-client-react` with Bearer-token sessions (expo-auth-session PKCE → `/api/mobile-auth/token-exchange`, token in SecureStore)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- API contract (source of truth): `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/` (expenses, budget, recurring_expenses, preferences, users/sessions for auth)
- API routes: `artifacts/api-server/src/routes/` (expenses, budget, recurring, preferences, insights, advisor, goals, challenges, auth, health); recurrence date math in `src/lib/recurrence.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/`; frontend hook: `lib/replit-auth-web` (`useAuth`)
- Frontend pages: `artifacts/expense-tracker/src/pages/` (Dashboard `/`, Expenses `/expenses`, Rituals `/recurring`, Budget `/budget`, Goals `/goals`, Coach `/coach`)
- Mobile screens: `artifacts/mobile/app/` (login, tabs: Today/Expenses/Coach/Goals/Budget, expense-form + recurring-form modals); shared UI in `components/ember/`; design tokens in `constants/colors.ts` (synced from web `index.css`, Outfit + Playfair Display fonts); SSE streaming helper in `lib/sse.ts` (expo/fetch on native — RN fetch can't stream)

## Architecture decisions

- All expense/budget/insights endpoints require a Replit Auth session; CORS restricted to app origins with credentials
- Budget is a single-row table (get-or-create pattern); PUT scoped to the fetched row id
- Tips/alerts are computed server-side in `insights.ts` from actual spending vs budget (80%/100% daily thresholds, 90% monthly)
- Amounts stored as `numeric(10,2)` strings in Postgres, parsed to numbers at the API boundary
- Recurring expenses ("Rituals") materialize lazily: expense/summary/stats/tips reads first log any due occurrences; a unique index on `(recurring_id, date)` makes that idempotent. POST backfills from `startDate`; reactivating resumes from today (lastMaterializedDate set to yesterday); deleting a rule keeps its logged expenses (FK SET NULL). Backfills longer than 366 occurrences chunk across reads: the high-water mark only advances to the last date actually generated, and its UPDATE is monotonic (guarded WHERE) so concurrent reads with older dates can't regress it
- All insight endpoints (daily, weekly, stats, tips) accept an optional `?date=` — clients pass the device-local date so every dashboard number reflects the same logical day regardless of server timezone
- Preferences are a single get-or-create row (currency, alertThreshold 50–100); alertThreshold drives insight warnings, currency drives all client money formatting (JPY renders without decimals)
- `GET /insights/stats` powers the month counters: month-to-date, projected month-end (avg/day × days), under-budget streak, avg/day, active ritual count + committed monthly total
- AI Coach ("Ask Ember"): `POST /anthropic/conversations/{id}/messages` streams SSE (`data: {content}` frames, then `{done:true}` or `{error}`); server grounds claude-sonnet-4-6 with a system prompt built from live budget/expense/goal/challenge data; conversations auto-title from the first message (when title is empty or a "New chat"/"New Conversation" placeholder). Guardrails: 4000-char message cap, ~60k-char history budget (newest-first) with same-role runs merged before the model call, 10 req/min rate limit on the message route
- Goals: CRUD + `POST /goals/{id}/contribute` — atomic SQL update (`GREATEST(0, saved + delta)`), safe under concurrent add/withdraw. Challenges (no-spend): status computed at read time from expenses in the window — clients pass `?today=` (device-local date); failed iff violations > 0
- Expense categories are duplicated per client (web `src/lib/categories.ts`, mobile `constants/categories.ts`) and must stay in sync — challenge violations match category by exact string equality
- AuthGate clears the query cache only on a real identity change *after* auth resolves — recording identity while auth is still loading made every boot look like a user switch and wiped in-flight queries (Coach page hung blank); don't "simplify" the isLoading guard away
- Web Coach page resumes the most recent conversation on first list load; its list query sets `retry: 2, refetchOnMount: "always"` as defense against interrupted boot fetches (global default is `retry: false`)

## Product

- Dashboard: today's spend vs daily limit with animated counters, month stat cards (spent / projected / streak / avg per day), category breakdown, weekly overview, automatic alerts/tips (auto-refresh every 60s)
- Rituals: recurring expenses (daily/weekly/monthly) that auto-log on schedule, with pause/resume, backfill from start date, and "Auto" badges on generated entries
- Expense log with date/category filters and add/edit/delete
- Budget settings for daily and monthly limits; preferences for display currency (7 codes) and alert threshold
- Ask Ember (web `/coach`, mobile Coach tab): streaming AI money coach grounded in the user's actual budget, spending, goals, and challenges; conversation history with delete + auto-titles
- Goals & Challenges (web `/goals`, mobile Goals tab): savings goals with progress and add/withdraw contributions (optional deadlines); no-spend challenges per category (7/14/21/30 days) with server-computed active/completed/failed status
- Login required (Replit Auth); user identity + logout in the app shell

## User preferences

- App name should be non-obvious and evocative — user rejected "SpendWise" as too obvious; current name: **Ember**
- User wants organized, scannable UI/UX — prioritize clear hierarchy and grouping in any UI changes

## Gotchas

- Google Fonts `@import` must be the FIRST line of `src/index.css` (before `@import 'tailwindcss'`) or PostCSS fails
- Re-run codegen after every OpenAPI spec change; body schemas must use entity-shaped names (`ExpenseInput`, not `CreateExpenseBody`)
- Express 5: parse `req.params.id` (may be `string | string[]`), annotate async handlers `Promise<void>`
- Never use `console.log` in server code — use `req.log` / `logger` (pino)
- OAuth sign-in cannot complete inside the preview iframe (CSP `frame-ancestors` + Google refusing iframes) — `lib/replit-auth-web` opens login in a new top-level tab when embedded and re-fetches the session on focus; don't "simplify" that away

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
