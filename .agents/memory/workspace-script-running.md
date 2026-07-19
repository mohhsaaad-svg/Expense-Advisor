---
name: Running one-off TS scripts in this workspace
description: No tsx/ts-node available; how to execute throwaway TypeScript scripts
---

This pnpm workspace has no `tsx` or `ts-node`. To run a one-off TypeScript script (e.g. a verification harness against workspace packages):

1. Bundle it with the package-local esbuild: `pnpm --filter <pkg> exec esbuild script.mts --bundle --platform=node --format=esm --outfile=/tmp/script.mjs --packages=external`
2. Run with plain `node /tmp/script.mjs`.

**Why:** Direct `node --loader` tricks and global tsx are unavailable; esbuild is already a dependency of server packages, so this needs no new installs.

**How to apply:** Any time a quick script must import workspace TS modules (db, libs). Delete throwaway scripts before finishing the task.
