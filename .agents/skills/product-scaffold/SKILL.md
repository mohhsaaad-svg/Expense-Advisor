---
name: product-scaffold
description: Copyable starter for a new Product Lab product, captured from Ember's proven setup. Use when bootstrapping a new product artifact — monorepo wiring, Replit Auth, OpenAPI codegen, per-user data isolation, money handling, and design tokens — so the new app reaches "authenticated app with one isolated data table" without re-deriving conventions.
---

# Product Scaffold (Ember-proven starter)

This is the mechanical companion to the `product-playbook` skill. The playbook says *what* the process is; this says *exactly what to copy and wire* so a new product starts from Ember's working foundation. Follow the steps in order; each names its reference files in the repo.

**Target state:** a new artifact where a user can sign in with Replit Auth and CRUD one domain table that is fully isolated per user, with client hooks generated from the OpenAPI spec.

## 0. What already exists and is SHARED — do not duplicate

These `lib/*` packages serve all products; a new product consumes them, it never forks them:

| Package | Purpose |
|---|---|
| `@workspace/api-spec` (`lib/api-spec`) | `openapi.yaml` (contract source of truth) + `orval.config.ts`; `pnpm run codegen` |
| `@workspace/api-zod` (`lib/api-zod`) | Generated Zod schemas + TS types (server-side validation) |
| `@workspace/api-client-react` (`lib/api-client-react`) | Generated React Query hooks + `custom-fetch.ts` mutator |
| `@workspace/db` (`lib/db`) | Drizzle ORM (Postgres), schema files in `src/schema/`, migrations, `drizzle.config.ts` |
| `@workspace/replit-auth-web` (`lib/replit-auth-web`) | React `useAuth` hook for web frontends |
| `@workspace/integrations-*` | External API/AI connectors |

The API server (`artifacts/api-server`) is likewise shared infrastructure: a new product usually adds **routes** to it rather than standing up a second server. Only create a separate API artifact if the product must be deployable independently.

## 1. Monorepo wiring for a new package

- `pnpm-workspace.yaml` already globs `artifacts/*` and `lib/*` — a new directory there is picked up automatically after `pnpm install`.
- Depend on siblings with `"@workspace/<name>": "workspace:*"`; pin common deps with `"catalog:"` versions (see the `catalog:` block in `pnpm-workspace.yaml`; react/react-dom are pinned for Expo compatibility).
- Every package needs a `typecheck` script; the root `pnpm run typecheck` runs `tsc --build` across project references. After editing `lib/*` sources always typecheck from the **root** (package-local tsc can resolve stale composite declarations).
- Register the new app with the `artifacts` skill (never hand-edit `artifact.toml`). `createArtifact` with the react-vite type already produces a correct `vite.config.ts` (binds `0.0.0.0:$PORT`, `base: process.env.BASE_PATH`, `allowedHosts: true`) and a scaffold that matches Ember's conventions — don't re-copy those files by hand.
- The react-vite scaffold depends on `@workspace/api-client-react` out of the box but **not** on `@workspace/replit-auth-web`. To put the app behind auth, add `"@workspace/replit-auth-web": "workspace:*"` to the new package's deps **and** add `{ "path": "../../lib/replit-auth-web" }` to its `tsconfig.json` `references` (missing references break root `tsc --build`). Run `pnpm install` after editing deps.
- In app code, build URLs from the base path (`import.meta.env.BASE_URL`), never root-relative `/api/...`.

## 2. Replit Auth

Web: session cookie (`sid`). Mobile: `Authorization: Bearer <sid>` from `expo-secure-store`, obtained via `expo-auth-session` + the `/api/mobile-auth/token-exchange` route. Both resolve to the same server-side session.

Reference files (reuse as-is when extending the shared api-server):
- `artifacts/api-server/src/lib/auth.ts` — `getSessionId(req)` reads cookie **or** Bearer header; `authMiddleware` loads the session and sets `req.user`; `requireAuth` gates data routes.
- `artifacts/api-server/src/routes/auth.ts` — OIDC login/callback/logout (`openid-client`).
- Web frontend: `useAuth` from `@workspace/replit-auth-web` (see usage in `artifacts/expense-tracker/src/App.tsx`).
- Mobile: `artifacts/mobile/lib/auth.tsx` — `getApiBaseUrl()` from `EXPO_PUBLIC_DOMAIN`, token storage, `fetchUser`.

Sessions live in the DB (`lib/db/src/schema/auth.ts`). `SESSION_SECRET` is already provisioned. For new setups or details, follow the `replit-auth` skill.

## 3. OpenAPI → codegen pipeline

1. Define/extend endpoints in `lib/api-spec/openapi.yaml`. Conventions:
   - Entity-shaped request body names (`ExpenseInput`, not `PostExpensesBody`).
   - **Never** use `format: uri` / `format: email` — orval emits zod v4 calls that break the pinned zod v3.
2. Run `pnpm --filter @workspace/api-spec run codegen` (runs orval, then root lib typecheck).
   - After codegen, grep for the exact generated names instead of guessing — Zod names derive from the `operationId` and parameter location (e.g. `createNote` → `CreateNoteBody`, `GetNoteParams`, `ListNotesQueryParams` only when query params exist): `grep "^export const" lib/api-zod/src/generated/api.ts` and `grep "export function use" lib/api-client-react/src/generated/api.ts`.
3. Generated output (never hand-edit, never hand-write hooks):
   - `lib/api-zod/src/generated` — Zod schemas + types; the server validates every boundary with these (`SomethingQueryParams.safeParse(req.query)` → 400 on failure).
   - `lib/api-client-react/src/generated` — React Query hooks; web imports them directly, mobile injects its Bearer token through `custom-fetch.ts`.

## 4. Per-user data isolation (non-negotiable)

Three rules, applied to every domain table and route:

1. **Schema** — every domain table carries an owner FK (see `lib/db/src/schema/expenses.ts`):
   ```ts
   userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
   ```
2. **Scoping** — ownership comes only from the server-resolved session, via `userId(req)` (`artifacts/api-server/src/lib/user.ts`; throws loudly if `requireAuth` is missing). Every query includes it in the WHERE clause:
   ```ts
   .where(and(eq(table.id, params.data.id), eq(table.userId, userId(req))))
   ```
   Never accept a user id from the client. Writes/updates/deletes use `.returning()` and check the row came back.
3. **404, not 403** — a cross-user (or missing) record returns `404 Not Found`, identical to a nonexistent id, so ids can't be probed across accounts. Full CRUD reference: `artifacts/api-server/src/routes/expenses.ts`.

Add a per-user isolation test matrix for each new table (two users; each op against the other's row must 404) — recipe in `artifacts/api-server/src/test/` and memory `api-testing-recipe`.

## 5. Money handling

- Store as `numeric(10, 2)` in Postgres (Drizzle returns strings).
- All server-side arithmetic in **integer cents** via `artifacts/api-server/src/lib/money.ts` (`toCents`, `sumCents`, `centsToNumber`, `formatMoney`); never add floats.
- Cross the JSON boundary as two-decimal numbers/strings; convert only at the edge.

## 6. Shared design tokens

- Web: CSS variables in `<app>/src/index.css` consumed via Tailwind semantic classes (`bg-background`, `text-primary`, …). The react-vite scaffold already ships the full token structure with `red; /*replace with H S L */` placeholders in both `:root` and `.dark` — fill in the new product's palette there (per the `design-standards` skill — each product gets its own identity on the shared craft bar); don't copy Ember's file wholesale.
- Mobile: mirror the web HSL variables as hex in `constants/colors.ts`, consumed through a `useColors` hook (see `artifacts/mobile/`).
- Keep radius consistent per product (Ember: web `1rem` / mobile `16`).

## 7. Server conventions checklist (copy from `artifacts/api-server`)

- Express 5, built with esbuild (`build.mjs`), `dev = build + start` reading `$PORT`.
- Logging: pino + pino-http (`src/lib/logger.ts`) with header/cookie redaction; use `req.log`/`logger`, never `console.log`.
- `express-rate-limit` on auth-sensitive routes; `NODE_ENV=test` skips limiters and pretty logging.
- Boot-time schema check (`src/lib/schemaCheck.ts`): refuse to start against an un-migrated DB — this is what makes "migrate prod before publish" fail loudly instead of corrupting.
- Migrations: add schema in `lib/db/src/schema/`, export it from `src/schema/index.ts`, then apply to the dev DB with `pnpm --filter @workspace/db run push`. Production schema is applied by Replit's Publish flow — never script prod migrations (see the `database` skill).

## Definition of done for a scaffold

A new product's scaffold is complete when: the artifact renders behind auth, one domain table exists with the `user_id` FK, its CRUD routes pass the isolation test matrix, client hooks are generated (not hand-written), and root `pnpm run typecheck` passes.

This recipe was validated end-to-end by bootstrapping the Alcove skeleton (`artifacts/alcove` + `notes` table + `artifacts/api-server/src/routes/notes.ts` + `src/test/notes-isolation.test.ts`) — use those files as a minimal worked example.
