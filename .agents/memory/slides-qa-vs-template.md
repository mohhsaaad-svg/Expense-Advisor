---
name: Slides QA floor vs template chrome
description: Reconciling the slides visual-QA text-size floor with skill templates whose furniture is smaller
---

Rule: hold authored deck content to the visual-QA floors (body ≥2vw; labels/captions ≥1.5vw; nothing authored below 1.5vw), but leave a skill template's own repeated furniture (header brand block, similar chrome) at the template's shipped sizes.

**Why:** The slides skill's QA doc and its shipped templates conflict — e.g. corporate-grid's header chrome is 0.8–1vw by design, and the user approves the template from a preview showing that chrome. Resizing it breaks template fidelity; leaving authored copy that small fails export readability.

**How to apply:** After building a deck from a template, grep all `text-[...vw]` / fontSize values; raise every authored size below floor (deck copy at 1–1.4vw is the usual offender), tighten spacing or cut items to keep slides ≤100vh, and keep only the template's furniture tier small.

Related: "real product screens" for decks can only be captured from unauthenticated surfaces (login/landing) — authed Ember screens aren't reachable by the screenshot tool.
