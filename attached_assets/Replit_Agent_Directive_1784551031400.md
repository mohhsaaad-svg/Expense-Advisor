# PASTE THIS TO THE REPLIT AGENT (controlling directive)

Board-approved build directive for Project Basira (working title), per the Mobile Technical Specification v1.0 with three amendments. You are authorized to execute ONLY Work Packages 0, 1, and 2 now. Do not start any UI work packages until explicitly told the validation gate passed.

SCOPE AUTHORIZED NOW:
- WP0 — Baseline + security audit: branch off main; capture clean build/typecheck/test results; document schema backup/restore; audit EVERY existing query for authenticated owner scope; add negative cross-user tests (sequential + random IDs) for all existing resources. Fix any ownership gap found.
- WP1 — Money + country foundation: introduce a Money module using integer minor units (bigint in DB, decimal-string over API); remove JS Number from all new financial domain code; currency registry with minorUnitDigits (JOD/KWD/BHD/OMR=3, SAR/AED/QAR=2, USD=2); CountryProfile module per spec section 04; i18n translation-key + RTL-aware shell primitives; deterministic fixtures for money formatting/rounding pass.
- WP2 — Additive schema migration: new tables per spec sections 11–12 (user_finance_profiles, accounts, account_balance_snapshots, transactions, income_cycles, commitments, commitment_occurrences, goals, calculation_versions, forecast_snapshots, forecast_input_refs, scenarios, import_batches, import_rows, consent_records). Additive only; legacy expenses/recurring stay dual-readable; rollback tested; legacy-data mapping verification report produced.

AMENDMENTS (override the spec where they conflict):
1. Portfolio screens/tables (portfolios, holdings) are REMOVED from MVP scope. Do not build them.
2. Advisor is feature-flagged OFF and not implemented in this phase.
3. No UI work packages (WP5+) until the founder confirms the validation gate passed.

STOP RULES (halt and report before): destructive migration, auth changes, production DB mutation, enabling any bank provider, autonomous financial actions, changing the public product name, or anything resembling investment recommendations.

QUALITY BAR: every PR leaves the product deployable; migrations reviewed before generated output; update replit.md after each package with commands, env vars, decisions and gotchas.

Also: fix the currently failing "expense-tracker: web" workflow as part of WP0 baseline.
