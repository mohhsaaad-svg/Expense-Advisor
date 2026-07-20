---
name: Vite config env gating
description: PORT/BASE_PATH in artifact vite configs must be required only when serving, never for `vite build`; plus the defineConfig typing trap with custom plugins.
---

**Rule:** Artifact `vite.config.ts` files must not throw on missing PORT/BASE_PATH at module top level. Gate PORT behind `defineConfig(async ({ command }) => ...)` with `command === 'serve'`; give BASE_PATH a canonical-preview-path fallback (platform env always overrides when serving/deploying).

**Why:** Top-level throws made `pnpm run build` fail on any machine without platform-injected env (fresh laptop, CI, the WP0 baseline gate on macOS). A build never binds a port; only dev/preview do. `vite preview` also resolves with command `'serve'`, so the PORT requirement still protects it.

**How to apply:** When scaffolding a new artifact (product-scaffold copies these configs), keep the `resolvePort()` + `command === 'serve'` pattern. Typing trap: if the plugins array contains a locally defined plugin (e.g. mockup-sandbox's preview plugin), TS fails overload resolution on the async-function form with a misleading TS2769 on `allowedHosts`/etc. Fix by annotating the function `: Promise<UserConfig>` and casting the local plugin `as PluginOption` — don't chase the phantom property errors.
