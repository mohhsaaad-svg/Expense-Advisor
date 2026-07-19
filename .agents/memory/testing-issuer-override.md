---
name: Testing Replit Auth ISSUER override
description: How the Playwright testing subagent's OIDC login override interacts with api-server restarts
---

The testing subagent logs into Replit Auth apps via an ISSUER_URL env override applied to the api-server workflow.

**Rule:** Do not restart the api-server workflow between test rounds of the same testing session — it clears the override and the tester lands on the real Replit consent page (verdict "unable").

**Why:** Learned when a mid-session restart (deploying a backend fix) silently broke the next test round.

**How to apply:**
- If a backend change is needed mid-session, make the change, then tell the tester to re-apply the override itself: it can restart workflows with env overrides ("restart the api-server workflow with the testing ISSUER_URL override, then re-run...").
- After ALL testing is done, restart the api-server workflow once to clear the override for normal use.
- When diagnosing test failures, prefer api-server request logs over the tester's request-count claims — the tester's network observations can miss requests that the server logged.
