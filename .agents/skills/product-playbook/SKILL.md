---
name: product-playbook
description: Product Lab's idea-to-launch process for building a new product in this studio. Use when starting a new product or app idea, scoping a build, setting up a new artifact, or taking a product from concept through the quality gates to publish.
---

# Product Lab Playbook

Product Lab is a multi-product studio (see `replit.md`). Every product travels the same path from idea to launch, using the conventions proven on Ember (product #1). Read this before scoping or building a new product, and follow it so each build meets the same bar.

## 1. Intake — scope the idea before building

Ask the user (use the question tool; one focused question at a time) enough to define:

- **Problem & user** — what pain does this remove, and for whom? What is the core loop the user repeats?
- **Name** — evocative and non-obvious, never literal (studio preference). Ember, not "SpendWise"; "Rituals", not "Recurring". Offer 2-3 options.
- **Surfaces** — web, mobile, or both? (Ember ships web + mobile against one API.)
- **Data & sensitivity** — does it store personal or financial data? If yes, a threat model is a required gate (§4).
- **v1 scope** — the smallest thing that delivers the core loop. Defer the rest to follow-up tasks.

Don't over-interview: ask what changes the build, infer the rest.

## 2. Artifact & naming conventions

- **One artifact per product.** A new product is a NEW artifact, never bolted onto an existing one. Extend an existing artifact only when it is genuinely the same product (same domain, branding, purpose).
- Use the `artifacts` skill to create and register. Give the artifact a **matching `slug` and `previewPath`** (e.g. slug `mobile` → previewPath `/mobile`).
- Follow the `pnpm-workspace` skill: packages are `@workspace/*`, shared code lives in `lib/*`, apps in `artifacts/*`.
- **Bootstrap from the `product-scaffold` skill** — it is the copyable starter captured from Ember (monorepo wiring, Replit Auth, OpenAPI codegen, per-user isolation, money, design tokens). Don't re-derive that wiring by hand.
- Document the product in `replit.md` under its own section and add it to the Products roster.

## 3. Build conventions (proven on Ember)

- **The API contract is the source of truth.** Define endpoints in the OpenAPI spec (`lib/api-spec/openapi.yaml`) and regenerate client hooks/types after every change — never hand-write them. (Memory: strip `format: uri`/`email`; use entity-shaped body names like `ExpenseInput`.)
- **Per-user data isolation is non-negotiable** for multi-user apps: every domain table carries a `user_id` NOT NULL FK; every query is scoped to the server-resolved `userId(req)` (never client input); cross-user reads/writes return **404**, not 403, so the API never confirms another user's record exists. This same discipline keeps one user's data out of another's views — and out of the AI features' context.
- **Money in integer cents** server-side; cross the API boundary as decimal strings.
- **Validate at the boundary with Zod** (`zod/v4`); use `drizzle-zod` for DB-derived shapes.
- **Auth**: Replit Auth (OIDC) — session cookies on web, Bearer-token sessions on mobile. Use the `replit-auth` skill.
- **Server logging** via `req.log` / `logger` (pino); never `console.log` in server code.

## 4. Quality gates — a product isn't "done" until these pass

Run in order; fix before moving on:

1. **Typecheck** — root `pnpm run typecheck` (tsc --build across packages; a package-local tsc can resolve stale composite declarations).
2. **API tests** — vitest + supertest, including a per-user isolation matrix for any multi-user data (see `artifacts/api-server/src/test/` and memory `api-testing-recipe`).
3. **End-to-end tests** — use the `testing` skill (Playwright subagent) for real user flows. For Replit Auth apps, read `testing/replit-auth.md` first. (Memory: Expo **web** builds can't reach authed screens through the mock OIDC due to CORS — verify those another way.)
4. **Code-review round** — spawn the architect via the `code-review` skill with the git diff; fix severe findings.
5. **Threat model** — for any product handling personal or financial data, run the `threat-modeling` skill and address critical findings before publishing.

## 5. Launch

- **Migrate production before publishing.** Apply pending DB migrations to the target database before deploying — the API server refuses to boot when expected columns are missing, so a publish against an un-migrated DB breaks the app. Use the `database` and `deployment` skills.
- Publish via the `deployment` skill; obtain the production URL from it (never construct it from the repl name or env vars).
- After an MVP or a major feature ships and runs, suggest publishing.

## Reference

- Design conventions: the `design-standards` skill.
- Studio identity, product roster, and user preferences: `replit.md`.
