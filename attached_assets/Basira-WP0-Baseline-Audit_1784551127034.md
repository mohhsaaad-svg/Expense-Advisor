# Project Basira - Work Package 0 Baseline Audit

Date: 20 July 2026  
Repository inspected: `/Users/mohhsaad/Documents/GitHub/Expense-Advisor Clone/Expense-Advisor`  
Commit: `54c47cb` - Enhance expense tracker with advanced insights, budget analysis, and improved utility functions

## Executive result

**Status: NOT READY FOR FEATURE DEVELOPMENT**

The TypeScript baseline passes, but the production build is blocked by a missing platform-specific Rollup package. More importantly, the application authenticates requests without isolating financial records by user. This is a release-blocking privacy defect and must be corrected before Basira features are added.

## Baseline verification

| Check | Result | Evidence |
|---|---|---|
| Locked dependency installation | Pass with environment setup | 1,099 packages installed from `pnpm-lock.yaml`; esbuild postinstall required explicit approval and bundled Node in `PATH` |
| TypeScript typecheck | Pass | Libraries, API server, web app, mobile app, mockup sandbox and scripts completed without TypeScript errors |
| Full workspace build | Fail | `@workspace/mockup-sandbox` cannot load `@rollup/rollup-darwin-arm64` on Apple Silicon |
| Git working tree | Needs cleanup | Three untracked nested repositories/directories: `Expense-Advisor.2/`, `Expense-Advisor/`, and `Untitled/` |
| Visible feature changes | None | No product feature files changed during WP0 inspection |

## Release blocker: authenticated but not multi-tenant

Authentication middleware and `requireAuth` are mounted before application data routes. However, authentication is not connected to data ownership:

- `expenses`, `recurring_expenses`, `budget`, and `preferences` have no `user_id` column.
- Expense list/get/update/delete queries are filtered by record ID or date/category only.
- Budget and preferences use a global single-row `limit(1)` pattern.
- Recurring rules and materialized expenses are global.
- Insight queries aggregate every expense and recurring rule in the database.
- A logged-in user could therefore read or modify another logged-in user's financial data.

Required first implementation: add owner references and owner-aware constraints, migrate existing records to an explicitly selected owner, then scope every read/write/materialization/aggregation to `req.user.id`. Non-owned record IDs must return 404.

## Build blocker

The repository lockfile/dependency state does not supply Rollup's native Apple Silicon package. Typecheck succeeds, but `pnpm run build` stops in `artifacts/mockup-sandbox` before other builds finish.

Required correction: repair the locked optional dependency configuration in Replit or regenerate the lockfile consistently for supported development platforms, then verify the full workspace build on macOS and Replit Linux.

## Repository cleanup risk

The main checkout contains three untracked directories, each appearing to contain another project or Git repository. Do not delete them automatically because they may contain user work. Resolve which directory is authoritative, compare commits/uncommitted files, back up anything unique, and only then remove or archive duplicates.

## Documentation drift

`threat_model.md` is stale. It says authentication and rate limiting are absent and that budget updates lack a `WHERE` clause. Current code includes authentication, global rate limiting, restricted CORS, and a budget row filter. The document does not identify the current, more serious user-isolation failure.

Required correction: replace the threat model after ownership isolation is designed and tested.

## Production environment baseline

Observed server/runtime configuration includes:

- Required: `DATABASE_URL`, `REPL_ID`
- OIDC/defaultable: `ISSUER_URL`
- Deployment/origin: `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, `ALLOWED_ORIGIN`, `REPLIT_INTERNAL_APP_DOMAIN`
- Runtime: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `BASE_PATH`
- Mobile public configuration: `EXPO_PUBLIC_DOMAIN`, `EXPO_PUBLIC_ISSUER_URL`, `EXPO_PUBLIC_REPL_ID`

Before deployment, document required/optional status, owners, rotation/recovery procedures, allowed production origins, database backup/restore, session revocation, and mobile release environment values. Never commit real secrets.

## Required WP0 completion order

1. Identify and preserve the authoritative repository; reconcile the three untracked duplicates.
2. Repair cross-platform locked build dependencies and obtain a clean full build.
3. Design and apply additive `user_id` ownership migration with an explicit legacy-data owner decision.
4. Scope every route, helper, recurring-materialization operation, budget/preference lookup, and insight query by authenticated user.
5. Add automated two-user isolation tests for list, get, create, update, delete, materialization and aggregation paths.
6. Refresh the threat model and production environment/runbook documentation.
7. Re-run typecheck, full build and security tests before beginning Basira Work Package 1.

## Stop/go gate

**STOP:** Do not build salary-cycle, forecasting, import, advisor or portfolio features on the current global-data schema.

**GO to Work Package 1 only when:** the authoritative repository is clean, full build passes on supported environments, existing financial records have a safe ownership migration plan, and automated cross-user isolation tests pass.
