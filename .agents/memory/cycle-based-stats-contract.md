---
name: Cycle-based stats contract
description: Spending stats reuse legacy "month" field names but mean salary-cycle values; migration + copy rules
---

The spending-stats API deliberately kept its legacy "month"-named required fields but computes them over the salary cycle (payday → day before next payday) whenever a salary day is set; otherwise it falls back to the calendar month and reports itself as unanchored.

**Why:** Renaming required contract fields would break every generated client at once; reinterpretation plus additive cycle fields let web + mobile migrate without a breaking change.

**How to apply:** UI copy reading these stats must check the anchored flag before saying "month" — say "cycle"/"payday" when anchored. Paydays on day 29–31 clamp into short months. New nullable budget columns shipped with a standalone SQL migration plus a boot-time schema guard (the project's established pattern: migrate prod first, then deploy; the server refuses to boot on a missing column).
