# Basira — Audit of Claude Brand Kit and Today-Screen Mockup

Reviewed: 2026-07-20  
Inputs: `Basira_Brand_Kit.md` and `basira_app_mockup.html`

## Decision

**Keep the product concept and redesign the execution.**

Claude found a strong core for Basira: one dominant safe-to-spend number, an explainable calculation, a timeline to payday, one prioritized action, calm language, and equal Arabic/English intent. This is meaningfully closer to Basira's strategy than a conventional expense dashboard.

It is not yet a production-ready brand or UX system. It is one attractive static Today-screen concept with an early brand direction. We should treat it as **Direction A**, preserve its best ideas, and develop alternatives before locking the identity.

## What should be preserved

### 1. The Hero Number

Making “safe to spend until payday” the visual center is strategically correct. It expresses Basira's differentiation immediately and avoids a dashboard crowded with historical charts.

### 2. The Why Sheet

“Why this number?” is essential, not optional. It establishes the trust ritual Basira needs: every result must reveal its balance, commitments, buffer, assumptions, freshness, and confidence.

### 3. The Commitments River

A forward timeline from today to payday is more relevant than a generic monthly chart. Keep the concept, but test whether a horizontal carousel is the clearest and most accessible implementation.

### 4. One Action

One calm, contextual recommendation is stronger than an endless insight feed. It suits a solo-founder MVP and reduces cognitive load.

### 5. Calm regional character

Deep teal, warm sand, restrained status colors, non-shaming language, salary-cycle thinking, family commitments, and three-decimal currency support fit the product direction.

### 6. Arabic/English parity as an explicit rule

The equal-prominence rule is correct. Arabic must remain a first-class design language throughout research, writing, prototyping, implementation, and QA.

## What needs revision before adoption

### 1. The eye identity is too expected

An eye is the literal symbol for “Basira,” but that also makes it predictable and difficult to own. The current CSS circle-and-iris mark is a placeholder, not a defensible logo. It may also drift toward surveillance or biometric associations—unhelpful for a financial privacy product.

Develop at least three identity routes:

- **Foresight:** horizon, aperture, or forward-revealing form without a literal eye
- **Balance through time:** salary-cycle rhythm, measured arc, or before/after-payday structure
- **Arabic intelligence:** a distinctive form derived from the Arabic word or letter construction without becoming calligraphic decoration

Test all routes at app-icon size, monochrome, Arabic-only, English-only, and bilingual lockups.

### 2. Dark mode should not be the untested default

The dark teal direction feels premium, but “regional OLED preference” is an assumption, not validated evidence. Financial setup, forms, transaction review, and long Arabic text may be easier in a light theme. Design both themes and validate the default with users.

### 3. Status cannot depend on number color

The brand kit says the safe-to-spend number owns green, amber, or red. Color can reinforce the state but must not be the only signal. Add a plain-language status, icon/shape, confidence label, and explanation. Red/green meanings must be tested for accessibility and cultural clarity.

Contrast calculations from the supplied palette show:

- Muted text `#7C9694` on ink `#0F2E2E`: approximately **4.58:1**, acceptable for normal text at AA but with little margin.
- Muted text on card `#16403E`: approximately **3.62:1**, insufficient for normal-size text at WCAG AA.
- Accent `#17B8A6` on ink: approximately **5.82:1**.
- Accent on card: approximately **4.60:1**.
- Primary light text on ink: approximately **13.34:1**.

The muted/card pairing must be changed or restricted to large/nonessential content.

### 4. Arabic voice needs a GCC/Jordan content system

The mockup mixes conversational Jordanian phrases such as “ليش” and “مش هلأ.” That can feel human in Jordan but may not be the best shared default across GCC markets. Establish:

- Clear modern standard Arabic as the cross-market base
- A warmth guide that avoids bureaucratic language
- Approved country-specific variants where research supports them
- A glossary for salary, commitments, buffer, available/safe-to-spend, confidence, reserve, and forecast terms
- Human review for all high-impact financial and consent language

### 5. RTL implementation is partial

The HTML applies RTL selectively to headers, sections, the timeline, and an action card. The complete document and navigation do not use a robust `dir="rtl"` architecture. The Arabic bottom navigation remains structurally LTR, and mirroring behavior is not defined for arrows, timelines, charts, gestures, or directional icons.

Production design must specify logical spacing properties, mirrored/non-mirrored icon rules, chart direction, numeric runs, currency placement, mixed Arabic/Latin strings, and screen-reader order.

### 6. The prototype is static, not an interaction model

“See the math,” “Plan,” “Reserve it,” and “Not now” do not implement behavior. There is no validation of:

- Calculation breakdown and assumptions
- Stale or incomplete data
- Low-confidence forecasts
- Editing a commitment
- Accepting, undoing, or declining a recommendation
- Loading, error, offline, and empty states
- Long Arabic strings and large text
- Keyboard/screen-reader operation

These flows must be prototyped before visual approval.

### 7. Accessibility semantics are missing

Navigation tabs are generic `div` elements, icons are emoji or text glyphs, links use `href="#"`, and there are no accessible labels, landmarks, selected states, or focus styles. Emoji rendering will differ by platform and does not form a coherent icon system.

The implementation needs semantic navigation and buttons, accessible names, selected/current states, focus behavior, screen-reader summaries for financial numbers, reduced-motion handling, and a designed icon set.

### 8. Information architecture is incomplete

The mockup contains Today, Plan, Activity, and Settings. The approved product also needs bounded Advisor access, imports, accounts, scenarios, privacy, and profile controls. Settings probably should not consume a primary tab if Advisor is central, but this must be tested rather than assumed.

Recommended candidate navigation for testing:

- Today
- Plan
- Activity
- Advisor
- Profile

Imports and settings can live within Activity/Profile when appropriate.

### 9. Several “unique signatures” need validation

- **Hijri-aware planning:** promising, but dates for Ramadan/Eid vary by jurisdiction and observation. Show uncertainty and allow correction.
- **Salary Day state:** worth prototyping; keep it subtle and accessible.
- **Sadaqah/zakat:** culturally relevant but legally and religiously sensitive. Separate voluntary giving from formal zakat calculation unless qualified review approves the latter.
- **Coffee math:** may trivialize different incomes and spending categories. Test as optional and locally configurable, not a core feature.
- **The Blink:** memorable but a literal blinking eye may feel gimmicky or unsettling. Recalculation also needs a freshness timestamp and deterministic feedback, not only animation.
- **Arabic numeral toggle:** useful preference; verify behavior with decimals, dates, currencies, and mixed-script content.

## Recommended design direction

Use Claude's concept as the foundation of the **Today experience**, not as the finished app or brand.

The refined experience should show:

1. Safe to spend until payday
2. Status and confidence in words as well as color
3. Data freshness and last calculation time
4. The next commitment and lowest forecast balance
5. One prioritized action
6. A clear path to the full calculation and assumptions

The page should reveal complexity progressively. The first glance stays calm; detailed commitments, forecasts, scenarios, and advisor explanations remain one action away.

## Next design deliverables

1. Audit the actual Ember screens and workflows.
2. Create three Basira identity directions, including at least two without a literal eye.
3. Produce light and dark tokens with verified contrast.
4. Define the bilingual content glossary and voice rules.
5. Redesign Today in safe, caution, risk, incomplete-data, and first-use states.
6. Prototype the Why Sheet and accepting/undoing One Action.
7. Design complete LTR/RTL navigation and component behavior.
8. Test the core flow with Jordan and GCC users before implementation.

## Verification limitation

The files were fully inspected at source level. The desktop browser security policy did not allow opening the Claude session's local HTML path, so pixel-level rendering, font loading, device breakpoints, scrolling, and interaction behavior have not yet been visually verified in the browser. That visual QA should occur after the mockup is placed in the Basira project workspace or implemented in the authoritative repository.
