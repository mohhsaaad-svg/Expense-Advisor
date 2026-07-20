---
name: Arabic/RTL conventions
description: Decisions made when adding Arabic + RTL to Ember (web, mobile, advisor) — follow for consistency.
---

- **Digits:** Western/Latin digits for all numbers even in Arabic, via Intl locale `ar-u-nu-latn`. Arabic month/day names OK. The advisor system prompt also instructs Latin digits and forbids recalculating server numbers.
  **Why:** finance app — transparent, verifiable numbers matter more than full localization; mixed-digit money strings caused ambiguity.
- **Language preference** lives in the per-user `preferences` row (`language: "en" | "ar"`, default `en`), optional in the PUT body so old clients keep working.
- **Web RTL:** i18n is a hand-rolled dictionary provider (no i18next); direction flips by setting `document.documentElement.dir`; use logical Tailwind utilities (ms/me/ps/pe/start/end/text-start). Charts stay LTR internally; message bubbles use `dir="auto"`.
- **Mobile RTL:** never use `I18nManager.forceRTL` (needs reload, breaks Expo web dev). Use an explicit `isRTL` flag from the i18n provider: `row-reverse`, `writingDirection`, mirrored chevrons. Known limit: native tab bar order stays LTR.
- **Sandbox quirk:** `waitForJob` timeout parameter maxes at 600 seconds; loop on it for long subagent jobs.
