# Project Basira — Current State and Roadmap

Last consolidated: 2026-07-20  
Source: `Empire-Source-of-Truth.md`

## Executive status

Basira is the founder portfolio's only active software build and highest priority. It is an upgrade of the existing Ember codebase, not a ground-up rewrite. The podcast is documented and paused; the other ideas remain queued, vaulted, parked, or killed.

The immediate phase is **Work Package 0 (foundation and safety)**. No visible Basira features should be added until the build, repository, authentication, ownership controls, database migration baseline, and production documentation are verified.

## Latest verified findings

- TypeScript checks pass.
- The complete macOS build is blocked by a missing Rollup binary/dependency associated with the Replit-generated lockfile.
- The main checkout contains three untracked duplicate repository folders; the authoritative copy must be identified before any cleanup.
- Authentication exists, but financial tables such as expenses, budgets, recurring records, preferences, and insights lack user ownership.
- As a result, authenticated accounts can share global financial data. This is a release-blocking privacy and security defect.
- No visible product features were changed during the baseline audit.

## Product direction

### Market and platform

- Mobile-first product for Jordan and the GCC: Jordan, Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, and Oman.
- Arabic and English ship together from the first release.
- Full RTL mirroring, locale-aware dates and numbers, Arabic content governance, and accessibility are required.
- Web remains operational but does not receive initial mobile feature parity.
- Basira is the leading working name, not a cleared public name. Trademark, domain, linguistic, social-handle, app-store, and user checks remain required.

### Core promise

Basira should provide culturally and financially accurate salary-cycle guidance for Arab users:

> Clarity for your money, confidence for what comes next.

Its defensible focus is not a generic AI coach or gamification. It is salary-to-salary forecasting, regional financial behavior, accurate multicurrency support, explainable recommendations, and privacy.

### Solo-founder MVP

1. Income and salary-cycle setup
2. Expenses and recurring commitments
3. Guided manual setup and CSV import
4. Safe-to-spend calculation
5. Payday cash-flow forecast
6. “Can I afford it?” scenarios
7. One useful daily recommendation
8. Arabic and English parity

The product must understand regional obligations such as non-monthly rent, installments, remittances, family support, Ramadan/Eid costs, school fees, and travel.

## Technical principles already approved

- Preserve useful Expo, Express, PostgreSQL, Drizzle, OpenAPI, authentication, expense, recurring-payment, budget, insight, generated-client, and mobile-shell components where appropriate.
- Use server-side deterministic calculations as the sole financial source of truth.
- AI can explain verified calculations and suggest bounded budgeting actions; it cannot invent balances, modify calculated outputs, move money, or provide regulated investment recommendations.
- Use currency-safe decimal storage and formatting, including three-decimal JOD, KWD, and BHD.
- Imported raw data must be preserved, reviewed before commit, duplicate-checked, and reversible.
- Receipt/statement parsing and licensed read-only bank connections are later, country-gated phases.
- Personalized investment recommendations, bank money movement, securities transactions, and family collaboration are outside the first MVP.

## Delivery roadmap

### Work Package 0 — Foundation and safety (current)

1. Identify the authoritative repository copy.
2. Reconcile and safely archive/remove duplicate repositories only after confirmation.
3. Repair the macOS full-build dependency and verify a clean install.
4. Design and execute an ownership migration that preserves existing records.
5. Add `userId` ownership to every financial and user-specific record.
6. Scope every read, create, update, and delete operation to the authenticated user.
7. Add two-user isolation tests proving User A cannot access or modify User B's data.
8. Update the threat model.
9. Document production configuration, authentication, backups, recovery, and migration rollback.
10. Verify the complete build and database baseline.

**WP0 exit gate:** the full project builds; the repository is unambiguous; existing data is preserved; every financial record belongs to exactly one user; and cross-user isolation tests pass.

### Work Package 1 — Regional foundations

- Currency-safe money representation
- Country-profile configuration
- New Basira brand identity: positioning, visual direction, logo system, color palette, typography, iconography, voice, and Arabic/English usage rules
- Bilingual UX architecture and a reusable mobile component library before feature-screen implementation
- Arabic/English design-system foundations
- Complete RTL behavior
- Salary-cycle and income-cycle data models
- Accounts and recurring commitments

### Work Package 2 — Deterministic financial engine

- Expected-balance forecast
- Committed-cash calculation
- Safety buffer
- Safe-to-spend until payday
- Daily allowance
- Forecast confidence
- Overdue and uncertain commitments
- Versioned formulas and deterministic fixtures

### Work Package 3 — Core mobile experience

- Onboarding and country/language setup
- Salary-cycle setup
- Commitments and transactions
- Forecast and safe-to-spend screens
- “Can I afford it?” scenarios
- Explainable forecast changes and failure states
- Usability testing of the redesigned bilingual experience before expanding the feature set

### Work Package 4 — Data entry and imports

- Guided manual setup
- CSV upload, mapping, validation, review, duplicate detection, commit, and rollback
- Import analytics and correction flows

### Work Package 5 — Bounded advisor and portfolio education

- Bilingual budgeting explainer grounded only in verified user data and calculated outputs
- Weekly explainable advisor report and optional daily recommendation
- Portfolio summaries, concentration flags, diversification education, and hypothetical scenarios
- Prompt-injection defenses, output logging, rate limits, uncertainty notices, and high-risk escalation language

### Work Package 6 — Validation and release preparation

- Unit, API, database-isolation, migration, precision, RTL, import, AI-safety, accessibility, failure-state, and end-to-end tests
- Validate with 10–20 Jordan/GCC users
- Measure setup completion, first forecast, weekly forecast views, corrections, retention, import success, advisor usefulness, and paid intent
- Prepare security, legal/regulatory, app-store, privacy, support, backup, and recovery readiness

## Current next action

Continue Work Package 0. The first implementation decision is selecting the authoritative Ember/Basira repository. After that, repair the build baseline and implement user ownership before salary-cycle or AI work begins.

## Existing deliverables referenced by the Empire history

- `Project-Basira-Mobile-Technical-Specification.pdf` — visually verified, 24-page build specification
- `Project-Basira-Competitive-Analysis-Revised.pdf` — corrected positioning and competitive analysis
- `Basira-WP0-Baseline-Audit.md` — build, repository, and security baseline
- `Founder-Project-Portfolio.md` — portfolio priorities and statuses

These artifacts remain in the original Empire task directory; this roadmap records their decisions so work can continue from this workspace.
