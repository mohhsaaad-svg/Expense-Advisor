# Basira — Brand and UX Direction

Status: Approved product requirement  
Recorded: 2026-07-20

## Objective

Redesign Ember into a clear, trustworthy, modern Basira experience for Jordan and GCC users. The new identity must make financial planning feel calm and understandable without looking like a bank, trading platform, generic expense tracker, or playful game.

The redesign is part of the product architecture. It begins after Work Package 0's security and repository baseline and before new feature screens are implemented.

## Brand foundation

### Working promise

> Basira helps you understand your money today and make wiser decisions for tomorrow.

Working tagline:

> Clarity for your money, confidence for what comes next.

### Desired personality

- Insightful, calm, and dependable
- Modern and regionally aware
- Human rather than institutional
- Premium without becoming exclusive or intimidating
- Encouraging without using guilt, fear, or childish gamification
- Equally natural in Arabic and English

### Identity requirements

- A distinctive Basira wordmark and symbol that work in Arabic and English
- Primary, compact, monochrome, app-icon, and small-size variants
- A palette designed for financial clarity, accessibility, light mode, and dark mode
- Arabic and Latin typefaces with compatible proportions and complete numeric support
- Consistent iconography, illustration, chart, and motion principles
- Brand voice and financial-language rules for both languages
- Trademark, linguistic, domain, social-handle, and app-store checks before public approval

The existing name and identity remain provisional until clearance. Logo exploration must avoid obvious eyes, coins, flames, generic charts, and copied fintech gradients unless a concept earns them through a distinctive execution.

## UX principles

1. **Answer first.** The home screen should immediately answer: How am I doing, what is safe to spend, and what needs attention?
2. **Forecast, not bookkeeping.** Emphasize the period until the next salary rather than a calendar-month expense dashboard.
3. **Explain every number.** Users must be able to see what changed a forecast, what is assumed, and what remains uncertain.
4. **Progressive setup.** Ask for the minimum information needed to generate the first useful forecast, then improve accuracy over time.
5. **Calm hierarchy.** Use color for meaning and action, not decoration. Avoid dense cards and competing dashboard widgets.
6. **Bilingual parity.** Arabic is not a translation layer. Navigation, hierarchy, charts, inputs, validation, and help must work naturally in both directions.
7. **Trust by design.** Clearly distinguish recorded data, calculated outputs, estimates, and AI explanations.
8. **Accessible by default.** Support scalable text, strong contrast, screen readers, touch targets, reduced motion, and non-color status cues.

## Proposed mobile information architecture

- **Today:** safe to spend, days until payday, upcoming commitments, forecast warnings, and one next action
- **Plan:** salary cycle, cash-flow forecast, goals, and affordability scenarios
- **Activity:** transactions, commitments, accounts, and imports
- **Advisor:** explanations grounded in verified data and deterministic calculations
- **Profile:** country, currency, language, privacy, consent, security, and data controls

Final navigation should be validated with users rather than accepted from the brief without testing.

## Priority flows to redesign

1. First launch, language, country, and currency
2. Salary-cycle and income setup
3. Recurring commitments and essential expenses
4. First safe-to-spend forecast
5. Daily home experience
6. “Can I afford it?” scenario
7. CSV import, review, correction, and rollback
8. Forecast explanation and uncertainty
9. Bounded advisor question and answer
10. Security, privacy, and data deletion/export controls

## Required component system

- Navigation, headers, sheets, dialogs, and tabs
- Buttons, fields, selectors, date controls, currency inputs, and validation
- Financial summary cards and comparison rows
- Forecast charts, timelines, and confidence indicators
- Commitment, transaction, and account patterns
- Empty, loading, offline, stale-data, partial-data, and error states
- Consent, warning, education, and high-risk language patterns
- Bidirectional layouts and mirrored icon behavior
- Design tokens shared between design files and implementation

## Design sequence

1. Audit the existing Ember screens and identify what to preserve, simplify, or replace.
2. Confirm the brand strategy, user promise, and naming constraints.
3. Develop two or three clearly different identity directions.
4. Select and refine one direction in Arabic and English.
5. Build the design tokens and core mobile component library.
6. Prototype the first-use journey and daily home/forecast experience.
7. Test with Jordan and GCC users in both languages.
8. Revise before engineering the full feature set.
9. Implement components before individual screens.
10. Verify visual consistency, RTL behavior, accessibility, and usability before release.

## Acceptance criteria

- The brand is recognizable without relying on generic fintech imagery.
- Arabic and English identities feel like one brand.
- Users can reach a useful first forecast with minimal setup.
- The home screen communicates safe-to-spend, payday timing, and urgent commitments at a glance.
- Every financial number can be explained.
- RTL behavior is functionally equivalent, not merely mirrored text.
- Designs cover loading, empty, error, offline, uncertainty, and privacy states.
- Components meet accessibility and touch-target requirements.
- User testing demonstrates comprehension before full implementation.

## Explicitly deferred

- Final public naming approval and trademark clearance
- Large marketing website and campaign system
- Extensive illustration library
- Cosmetic gamification
- Premium wealth-management styling before the core consumer experience is validated
