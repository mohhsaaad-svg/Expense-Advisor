---
name: Testing Replit Auth ISSUER override
description: How the Playwright testing subagent's OIDC login override interacts with api-server restarts
---

The testing subagent logs into Replit Auth apps via an ISSUER_URL env override applied to the api-server workflow.

**Rule:** Do not restart the api-server workflow between test rounds of the same testing session — it clears the override and the tester lands on the real Replit consent page (verdict "unable").

**Why:** Learned when a mid-session restart (deploying a backend fix) silently broke the next test round.

**How to apply:**
- If a backend change is needed mid-session, make the change, then tell the tester to re-apply the override itself: it can restart workflows with env overrides ("restart the api-server workflow with the testing ISSUER_URL override, then re-run...").
- After ALL testing is done, restart the api-server workflow once to clear the override for normal use. The tester may also leave a temp `.env` file in the workspace root and set `EXPO_PUBLIC_ISSUER_URL` on the mobile workflow — remove the file and restart the mobile workflow too.

## Expo WEB builds can't be e2e-tested through the mock OIDC issuer

**Blocker:** The mobile app's Expo **web** build authenticates via `expo-auth-session`, which performs OIDC discovery *client-side* (fetches `<ISSUER>/.well-known/openid-configuration` from the browser). The testing mock issuer (e.g. `test-mock-oidc.replit.app`) does not send `Access-Control-Allow-Origin`, so discovery fails with a CORS "Failed to fetch" and login never completes — the tester cannot reach any authenticated screen. Restarting workflows with the override does NOT fix this (real Replit OIDC works only because `replit.com/oidc` serves CORS).

**Why:** Server-side ISSUER override is enough for Express/web apps that redirect through the server, but not for a browser-side discovery flow.

**How to apply:** Don't burn tester round-trips trying to e2e authenticated **Expo web** screens under Replit Auth. Verify those via typecheck + static review + screenshots of unauthenticated routes (login, +not-found), and propose a follow-up to verify signed-in screens by another route (native build, a CORS-enabled mock, or manual login).

- When diagnosing test failures, prefer api-server request logs over the tester's request-count claims — the tester's network observations can miss requests that the server logged.
