---
name: Money precision convention
description: All money math is integer mills (×1000); DB is numeric(12,3); safe-to-spend is the single source of truth
---

The rule: every server-side money aggregation uses the mills helpers in the api-server money lib (toMills/sumMills/millsToNumber). DB money columns are numeric(12,3). JOD/KWD/BHD (also OMR/TND) are 3-decimal currencies; JPY/KRW 0; others 2.

**Why:** the Basira strategy targets Gulf/Levant currencies with 3 minor-unit digits; a cents (×100) path silently truncated the third decimal. Also "code calculates, AI explains": the safe-to-spend engine (api-server lib) is the only source of the safe-to-spend figure — the insights endpoint and the Ember advisor prompt both consume it verbatim.

**How to apply:** never add new money math in cents or floats; extend the mills helpers. Never let UI or the advisor recompute safe-to-spend — surface the server breakdown. When publishing, the prod DB needs the numeric(12,3) + budget monthly_salary/salary_day changes pushed first.
