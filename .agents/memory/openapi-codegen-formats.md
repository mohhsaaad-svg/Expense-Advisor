---
name: OpenAPI codegen format quirks
description: Orval + zod v3 breaks on `format: uri`/`format: email` in openapi.yaml
---
Rule: avoid `format: uri` and `format: email` in `lib/api-spec/openapi.yaml` schema/parameter definitions.

**Why:** Orval emits zod v4-style top-level validators (`zod.url()`, `zod.email()`) for these formats, but the workspace pins zod v3, so `pnpm --filter @workspace/api-spec run codegen` fails typecheck.

**How to apply:** When adding spec entries (including ones copied from skill references), strip those `format:` lines and rely on plain `type: string` (+ minLength) instead.
