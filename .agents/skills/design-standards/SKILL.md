---
name: design-standards
description: Product Lab's cross-product design standards — a distinct visual identity per product on a shared craft bar. Use when designing, building, or reviewing any UI for a Product Lab product (web or mobile), choosing a visual direction, or naming features.
---

# Product Lab Design Standards

Every Product Lab product looks and feels like its own thing — but all of them meet the same craft bar. Read this before designing or building any UI for a studio product.

## A distinct identity per product

- Each product gets its own **creative concept**: a short concept name plus a one-sentence visual metaphor that drives palette, typography, hero device, and micro-interactions. Ember's is warmth and embers — a flame mark, warm off-white "paper", Playfair Display headlines over Outfit body text.
- **Don't reuse one product's palette or type for the next.** A new product means a fresh direction that fits its own audience.
- Commit to the concept everywhere — hero to footer — and express it in functional surfaces (tables, forms, empty states), not just decoration. If the concept could be removed without changing anything, it isn't doing its job.

## The shared craft bar (every product, every screen)

- **Organized, scannable hierarchy** (studio preference). Group related things; make the primary action and the single most important number obvious. Prefer clear sections over dense walls of content.
- **Evocative feature naming** (studio preference). Name features for what they mean to the user — "Rituals", "Ask Ember" — not literal function labels like "Recurring" or "Chatbot".
- **Polished non-happy states.** Every data view needs designed loading, empty, and error states. Loading uses shaped **skeleton placeholders**, never a bare centered spinner. Empty states explain what belongs there and offer the action to create it. Errors are recoverable (a retry affordance).
- **Responsive.** Layouts work from small mobile widths upward; check the viewports that matter for the surface.
- **Reduced-motion support.** Respect the OS "reduce motion" setting — gate non-essential animation behind it.
- **Accessible contrast and touch targets.** Legible text contrast and comfortable tap sizes, especially on mobile.

## Design tokens & consistency

- Drive color, spacing, radius, and type from **shared tokens**, not per-screen literals, so a product stays consistent and re-themeable (and dark mode stays feasible). Ember keeps tokens in web `src/index.css` and mirrors them in mobile `constants/colors.ts` — when a token changes on one surface, sync the other.
- Keep any duplicated cross-client constants (e.g. category lists) in sync; drift causes real bugs.

## How to work

- For fullstack UI, side-by-side variant exploration, or canvas mockups, delegate to the **`design` subagent** (see the `design` skill). For open-ended exploration ("show me options"), use `design-exploration` to write a brief first.
- Verify visual work with screenshots across the relevant viewports before calling it done.

## Reference

- Build & launch process: the `product-playbook` skill.
- Studio identity and user preferences: `replit.md`.
