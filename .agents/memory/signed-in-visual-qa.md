---
name: Signed-in visual QA recipe
description: How to screenshot authenticated web + Expo-web screens when no testing subagent exists
---

The testing subagent kind is not available in this workspace; screenshot-based QA of authed screens needs temporary scaffolding.

**Recipe (web):** add a dev-only `GET /api/test-login?sub=&to=` route in the api-server auth routes (gate on `NODE_ENV !== 'production'`) that upserts a user, mints a session, sets the sid cookie, and redirects; the Screenshot tool follows it authenticated. Seed data via `psql "$DATABASE_URL"`. Remove the route + seeded users when done.

**Recipe (Expo web):** expo-secure-store is a no-op stub on web (`ExpoSecureStore.web.ts` exports `{}`), so mobile web builds can't hold a token normally. For QA, temporarily read a `?qaToken=` URL param into `localStorage` in both `lib/auth.tsx` fetchUser and the `setAuthTokenGetter` in `app/_layout.tsx`. Also requires CORS: the api-server allowlists `https://$REPLIT_EXPO_DEV_DOMAIN` in development (kept permanently, dev-gated) since the Expo web origin differs from the API origin.

**Why:** auth walls otherwise block all signed-in screenshots; the mock-OIDC login flow can't complete in the screenshot browser (CORS on discovery).

**Gotchas:** card headline numbers use CountUp animations — screenshots catch them mid-flight; verify amounts via static rows, not headlines. Prefs-driven UI (currency chips) can render a pre-load default in an early frame.
