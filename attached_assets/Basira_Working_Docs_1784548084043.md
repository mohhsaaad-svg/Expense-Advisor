# BASIRA بصيرة — Team Working Docs v1
### Saad Ventures · All departments · 2026-07-20
*The revised master pack after the competitive analysis. Each section = one department's deliverable.*

---

## 🧪 FIKRI — Product One-Pager

**Promise:** Know what you can safely spend before your next salary — and why.
**User:** Salaried, Jordan/GCC, 23–40, feels the payday squeeze.
**Hero number:** SAFE-TO-SPEND — one figure, recalculated daily, fully explainable.

**MVP features (build order):**
1. Salary-cycle setup — payday date, income, current cash, fixed commitments (5-minute onboarding)
2. Safe-to-spend forecast — lowest projected balance until payday → daily allowance
3. Commitments calendar — rent (incl. quarterly!), installments, remittances, school fees, subscriptions
4. "Can I afford it?" — type a purchase, see the impact BEFORE buying (sandbox, doesn't touch the plan)
5. Weekly report — one insight + one action, verified numbers only
6. Arabic/English, RTL-native, JOD/KWD/BHD 3-decimal precision

**Feature ideas backlog (post-validation):**
- Ramadan/Eid mode — seasonal budget that auto-plans for the month
- School-fees planner — split annual fees into monthly reserves
- Remittance planner — recurring family transfers as first-class commitments
- Salary-delay stress test — "what if salary is 10 days late?"
- The PDF Financial Statement (Pro) — clean doc for banks/visas/loans
- Paid Financial Check-Up ($19–39 one-time) — willingness-to-pay test
- Family plan — shared commitments (much later)

---

## 🎨 JAMIL — UX Direction

**Design principle:** ONE number on the home screen. Everything else is supporting cast.
- Home = Safe-to-spend (big, green/amber/red) + days to payday + next 3 commitments
- Tap the number → the full "why" breakdown (every input visible — trust through transparency)
- Onboarding = 4 screens max: payday → income → cash now → commitments (smart defaults per country)
- Tone: calm, respectful, zero shame language (never "you overspent!" — instead "here's the new safe number")
- RTL designed FIRST, LTR mirrored (opposite of everyone else — regional credibility)

---

## 🏗️ BANI — Engineering Architecture

- **Stack:** web app first (works everywhere incl. phones, no app-store wait) → Replit hosted; native later
- **Deterministic core:** all money math in tested code (dates, currencies, commitments engine). 3-decimal currency handling from day 1
- **AI layer:** explains the computed numbers in AR/EN, asks clarifying questions. NEVER calculates. Bounded usage, cached explanations
- **Security P0:** owner-scoped records, auth, isolation tests BEFORE any user data
- **No integrations in MVP:** manual + CSV only (regulatory wall stays untouched)
- **Existing build:** CEO to show current Replit code → I audit before we extend it

---

## 📣 MUNADI — Go-to-Market Sketch

- **Beachhead:** Amman first (CEO's network), then UAE
- **Channel 1:** the validation interviews themselves = first 15 evangelists
- **Channel 2:** Arabic content — "the payday squeeze" TikToks/Reels (the problem is viscerally relatable)
- **Channel 3:** shareable "safe-to-spend" cards (amounts hidden) — referral loop
- **Positioning guard:** never say tracker/AI-coach/free-forever — we own "the honest number between paydays"

---

## 💰 HASIB — Numbers to Watch

- Validation cost target: ~$0 (landing page + interviews)
- MVP infra: <$50/mo (Replit + domain + email)
- First revenue test: Financial Check-Up one-time purchase BEFORE subscriptions
- Break-even on infra: ~10 Pro subs. First real milestone: 3 strangers paying

---

## ⚖️ ADEL — Legal Checklist

- [ ] Name clearance: "Basira" — trademark search (Jordan/UAE/KSA), domain, app-store collision check
- [ ] Disclaimers: educational tool, not financial advice — in-app + terms
- [ ] Privacy policy: manual data only, no bank credentials, clear consent, deletion rights
- [ ] NO product recommendations (UAE Open Finance wall) — copy review before launch

---

## 🗂️ NIZAM — Sprint Board (this week)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Landing page v2 (salary-cycle promise) | Sadiq/Jamil | ✅ DONE |
| 2 | Interview script v2 (15 interviews, unprompted gate) | Sadiq/Fikri | ✅ DONE |
| 3 | Working docs pack | All | ✅ DONE (this file) |
| 4 | Deploy landing on Replit | CEO + Bani | ⏳ next |
| 5 | Show existing Replit build to Bani | CEO | ⏳ next |
| 6 | Run 15 interviews | CEO | ⏳ this week |
| 7 | Name clearance checklist | CEO + Adel | ⏳ this week |
| 8 | Compile results → GATE decision | Sadiq | after 6 |
