---
name: Monorepo type visibility after lib edits
description: Rule of thumb for stale types after editing lib/* packages
---

**Rule:** after editing source in `lib/*`, run root `pnpm run typecheck` before trusting any package-local `tsc --noEmit`.

**Why:** artifacts consume libs as composite project references, so package-local tsc reads the lib's *last-built* declarations — fresh edits look like `Property 'x' does not exist` even when the source is right.
