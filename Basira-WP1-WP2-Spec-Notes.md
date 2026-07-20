# Basira — WP1/WP2 Spec Notes (consolidated inputs for task planning)

Compiled: 2026-07-20. Sources: board directive (controlling), Basira-Current-Roadmap, Basira-Brand-and-UX-Brief, Basira_Brand_Kit v1 (Jamil), basira_app_mockup.html, Claude-Basira-Design-Audit.
Purpose: single reference for the WP1/WP2 task descriptions and any agent implementing them. UI/brand execution stays out of scope (directive amendments); this file captures only what must be baked into foundations now because it is cheap now and expensive to retrofit.

## WP1 — Money + country foundation

- **Money representation:** all financial code moves to **bigint minor units**. No JS `Number` anywhere in financial math (directive). Amounts cross the API boundary as strings/ints of minor units, never floats. Consider a lint/CI guard for `Number(`/`parseFloat` in money paths.
- **Currency registry:** per-currency `{ code, minorUnits, displayDecimals }`. JOD/KWD/BHD/OMR = 3 minor-unit decimals (directive adds OMR). Storage decimals ≠ display decimals: mockup renders "218 JOD", not "218.000" — registry carries both.
- **CountryProfile:** country-level config (currency, salary norms, obligations) per roadmap WP1.
- **i18n + RTL primitives** (primitives only — no screens):
  - RTL layout foundation (logical properties; mirrored/non-mirrored icon rules come later in design phase).
  - **Numeral-system formatting is a user preference, not a locale side effect** (audit): Arabic-Indic ٠–٩ vs Latin digits, with correct separators (١٬٤٥٠), verified against decimals, dates, currency symbols, and mixed-script strings.
  - Locale-aware date/month formatting incl. Arabic month names.
- Existing Arabic work: task #18 merges i18n groundwork — audit its primitives and formalize rather than duplicate.

## WP2 — Additive schema migration + engine foundations

- **Migration rules (directive):** additive only (new tables/columns); legacy `numeric(10,2)` stays **dual-readable** during transition; **rollback tested** before any publish; prod DB mutation is stop-and-ask.
- **Forecast/engine rows must carry from day one** (brief "explain every number" + audit):
  - inputs snapshot / assumptions — the "Balances − commitments − buffer" explanation payload, line by line;
  - **confidence** (enum + display label — words, never color-only);
  - **status** enum (safe / caution / risk) as data, not derived color;
  - **computed_at freshness timestamp** (audit: recalculation needs deterministic feedback + last-calculated time);
  - **versioned formula id** (roadmap WP2: versioned formulas + deterministic fixtures).
- **Commitments:** non-monthly schedules are first-class (quarterly rent, school fees, installments, remittances, family support, Ramadan/Eid). Hijri-aware scheduling is an **open question** — audit says validate (dates vary by jurisdiction/observation) before adding schema for it; do not bake yet.
- **Golden reference:** advisors' fixture set is the source of truth for the deterministic engine. The already-merged safe-to-spend feature (#17) must be **re-verified against the golden fixtures** once WP1 money types land; fold into WP2 acceptance.

## Standing constraints (board directive, controlling)

- Portfolio screens/tables removed from MVP entirely. Advisor ships feature-flag OFF, unimplemented this phase. No UI work packages (WP5+) until founder confirms the validation gate.
- Stop-and-ask: destructive migrations, auth changes, prod DB mutation, bank providers, autonomous money actions, public name changes ("Basira" uncleared working title).
- Every merge leaves the product deployable. Update replit.md after each work package.

## Open questions parked for the founder (not blocking WP1/WP2)

1. Hijri date representation in commitments (validate first).
2. Arabic register: MSA base vs dialect per surface (audit §4 content system) — affects copy only.
3. Light vs dark default, identity routes (2+ non-eye), contrast fixes (muted #7C9694 on card #16403E ≈ 3.62:1, fails AA) — all design-phase.
