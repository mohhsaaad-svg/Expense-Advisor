---
name: Expo static build ports & non-interactivity
description: The mobile artifact's static Expo Go build must pick a free Metro port dynamically; hardcoded 8081 collides and prompts interactively, killing non-interactive builds.
---

**Rule:** The mobile static-build script starts its own Metro; it must acquire a free port (net listen(0)) and thread it through every `localhost:<port>` URL (status, bundle, manifest, asset rewriting). Never assume 8081.

**Why:** In this workspace 8081+ are held by dev servers, so `expo start` asked "Use port X instead?" — in non-interactive mode (CI=1 or piped) that's a hard fail ("Input is required"). Also: the Metro-timeout exit path must kill the spawned Metro (use the shared error-exit helper), or failed builds leak orphan Metro processes that hold ports for the next run.

**How to apply:** Runs on Replit only in practice — the script requires a deployment domain env (REPLIT_INTERNAL_APP_DOMAIN/REPLIT_DEV_DOMAIN/EXPO_PUBLIC_DOMAIN) and exits 1 without one, so a bare laptop `pnpm run build` legitimately can't include the mobile static build unless EXPO_PUBLIC_DOMAIN is exported. Full-workspace builds also exceed a single 300s shell call because of Metro bundling — run detached (`setsid nohup ... &`) and poll the log.
