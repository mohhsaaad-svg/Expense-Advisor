/**
 * BASIRA — Forecast Engine REFERENCE IMPLEMENTATION (v1)
 * =====================================================
 * Golden reference for WP4, written by Sadiq/Bani per Technical Spec §14–15.
 * The Replit Agent should port/verify against this, keeping behavior identical.
 *
 * Rules encoded:
 *  - All money in integer MINOR UNITS (bigint). No floats anywhere.
 *  - Deterministic: same inputs + same version => same outputs.
 *  - Never clamp intermediate negatives; clamp ONLY final safeToSpend display.
 *  - Probability weights: HIGH=0.85, MEDIUM=0.60, LOW=0.30 (basis-point math).
 *  - Overdue essential commitments count at 1.00 until resolved.
 *  - Confidence scoring per spec §15.
 */

export type Probability = "CONFIRMED" | "HIGH" | "MEDIUM" | "LOW";
export type ForecastStatus = "OK" | "BLOCKED_NO_INCOME";
export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

// basis points to avoid floats (0.85 => 8500)
const PROB_BP: Record<Probability, bigint> = {
  CONFIRMED: 10000n,
  HIGH: 8500n,
  MEDIUM: 6000n,
  LOW: 3000n,
};

export interface AccountInput {
  id: string;
  balanceMinor: bigint;      // latest snapshot, base currency
  balanceAgeDays: number;    // for confidence
  archived: boolean;
  isCredit: boolean;         // credit limits excluded from availableCash
}

export interface CommitmentOccurrenceInput {
  id: string;
  amountMinor: bigint;       // positive = cash out
  dueDate: string;           // YYYY-MM-DD local
  probability: Probability;  // CONFIRMED for confirmed occurrences
  essential: boolean;
  overdue: boolean;          // due before today and unresolved
}

export interface ForecastInputs {
  todayLocal: string;            // YYYY-MM-DD
  nextConfirmedIncomeDate: string | null; // YYYY-MM-DD or null
  incomeDateEstimated: boolean;
  accounts: AccountInput[];
  occurrences: CommitmentOccurrenceInput[];
  goalReserveMinor: bigint;
  safetyBufferMinor: bigint;
  eligibleRemainingDays: number; // caller computes weekend prefs
  fxAgeDaysOverLimit: boolean;
  importUnresolvedWarnings: boolean;
  anyCommitmentConfirmed: boolean;
  horizonDays: number;           // derived; cap 62 interactive
}

export interface ForecastOutput {
  status: ForecastStatus;
  availableCashMinor: bigint;
  committedWeightedMinor: bigint;
  committedGrossMinor: bigint;
  expectedEndBalanceMinor: bigint;  // may be negative — never clamped
  safeToSpendMinor: bigint;         // clamped at 0 for display
  dailyAllowanceMinor: bigint | null;
  confidenceScore: number;          // 0..100
  confidenceBand: ConfidenceBand;
  reasons: string[];
}

function daysBetween(a: string, b: string): number {
  const A = new Date(a + "T00:00:00Z").getTime();
  const B = new Date(b + "T00:00:00Z").getTime();
  return Math.round((B - A) / 86400000);
}

export function runForecast(inp: ForecastInputs): ForecastOutput {
  const reasons: string[] = [];

  if (!inp.nextConfirmedIncomeDate) {
    return {
      status: "BLOCKED_NO_INCOME",
      availableCashMinor: 0n, committedWeightedMinor: 0n, committedGrossMinor: 0n,
      expectedEndBalanceMinor: 0n, safeToSpendMinor: 0n, dailyAllowanceMinor: null,
      confidenceScore: 0, confidenceBand: "LOW", reasons: ["NO_INCOME_DATE"],
    };
  }

  // availableCash: latest included balances; exclude credit + archived
  let availableCash = 0n;
  let oldestBalanceAge = 0;
  for (const a of inp.accounts) {
    if (a.archived || a.isCredit) continue;
    availableCash += a.balanceMinor;
    if (a.balanceAgeDays > oldestBalanceAge) oldestBalanceAge = a.balanceAgeDays;
  }

  // committedCash within horizon (occurrences due <= horizon end)
  let weighted = 0n;
  let gross = 0n;
  for (const c of inp.occurrences) {
    const inHorizon = daysBetween(inp.todayLocal, c.dueDate) <= inp.horizonDays;
    if (!inHorizon && !c.overdue) continue;
    gross += c.amountMinor;
    if (c.overdue && c.essential) {
      weighted += c.amountMinor; // full 1.00 until resolved — spec rule
    } else {
      weighted += (c.amountMinor * PROB_BP[c.probability]) / 10000n;
    }
  }

  const expectedEnd = availableCash - weighted; // incomeBeforeHorizon normally 0 salary-to-salary
  let safeToSpend = expectedEnd - inp.goalReserveMinor - inp.safetyBufferMinor;
  const safeToSpendDisplay = safeToSpend > 0n ? safeToSpend : 0n; // clamp ONLY display

  const dailyAllowance =
    inp.eligibleRemainingDays > 0
      ? safeToSpendDisplay / BigInt(inp.eligibleRemainingDays)
      : null; // never divide by zero — spec rule

  // Confidence per spec §15
  let score = 100;
  if (oldestBalanceAge > 7) { score -= 20; reasons.push("BALANCE_STALE"); }
  if (inp.incomeDateEstimated) { score -= 20; reasons.push("INCOME_DATE_ESTIMATED"); }
  if (!inp.anyCommitmentConfirmed) { score -= 25; reasons.push("NO_CONFIRMED_COMMITMENTS"); }
  const estimated = gross - inp.occurrences
    .filter(c => c.probability === "CONFIRMED")
    .reduce((s, c) => s + c.amountMinor, 0n);
  if (availableCash > 0n && estimated * 10n > availableCash * 3n) { // >30%
    score -= 10; reasons.push("ESTIMATES_EXCEED_30PCT");
  }
  if (inp.fxAgeDaysOverLimit) { score -= 15; reasons.push("FX_STALE"); }
  if (inp.importUnresolvedWarnings) { score -= 10; reasons.push("IMPORT_WARNINGS"); }
  if (inp.horizonDays > 35) { score -= 5; reasons.push("LONG_HORIZON"); }
  if (score < 0) score = 0;
  const band: ConfidenceBand = score >= 80 ? "HIGH" : score >= 55 ? "MEDIUM" : "LOW";

  return {
    status: "OK",
    availableCashMinor: availableCash,
    committedWeightedMinor: weighted,
    committedGrossMinor: gross,
    expectedEndBalanceMinor: expectedEnd,
    safeToSpendMinor: safeToSpendDisplay,
    dailyAllowanceMinor: dailyAllowance,
    confidenceScore: score,
    confidenceBand: band,
    reasons,
  };
}

/* ============================== FIXTURES ==============================
 * Golden test cases — the agent must reproduce these EXACTLY.
 * Currency: JOD (3 decimals). 1 JOD = 1000 minor units.
 */
export const FIXTURES = [
  {
    name: "F1 normal salary month (Jordan)",
    inputs: {
      todayLocal: "2026-07-20",
      nextConfirmedIncomeDate: "2026-08-01",
      incomeDateEstimated: false,
      accounts: [{ id: "a1", balanceMinor: 850_000n /* 850 JOD */, balanceAgeDays: 1, archived: false, isCredit: false }],
      occurrences: [
        { id: "c1", amountMinor: 300_000n, dueDate: "2026-07-25", probability: "CONFIRMED" as Probability, essential: true, overdue: false },  // rent share
        { id: "c2", amountMinor: 100_000n, dueDate: "2026-07-28", probability: "MEDIUM" as Probability, essential: false, overdue: false },    // estimated bill
      ],
      goalReserveMinor: 50_000n,
      safetyBufferMinor: 100_000n,
      eligibleRemainingDays: 12,
      fxAgeDaysOverLimit: false,
      importUnresolvedWarnings: false,
      anyCommitmentConfirmed: true,
      horizonDays: 12,
    },
    expect: {
      committedWeightedMinor: 360_000n,       // 300000 + 100000*0.60
      expectedEndBalanceMinor: 490_000n,      // 850000-360000
      safeToSpendMinor: 340_000n,             // 490000-50000-100000
      dailyAllowanceMinor: 28_333n,           // floor(340000/12)
      confidenceScore: 100, confidenceBand: "HIGH",
    },
  },
  {
    name: "F2 negative cash now",
    inputs: {
      todayLocal: "2026-07-20",
      nextConfirmedIncomeDate: "2026-08-01",
      incomeDateEstimated: false,
      accounts: [{ id: "a1", balanceMinor: -50_000n, balanceAgeDays: 0, archived: false, isCredit: false }],
      occurrences: [],
      goalReserveMinor: 0n, safetyBufferMinor: 0n,
      eligibleRemainingDays: 12,
      fxAgeDaysOverLimit: false, importUnresolvedWarnings: false,
      anyCommitmentConfirmed: false, horizonDays: 12,
    },
    expect: {
      expectedEndBalanceMinor: -50_000n,      // preserved, NOT clamped
      safeToSpendMinor: 0n,                   // display clamped
      confidenceScore: 75, confidenceBand: "MEDIUM", // -25 no confirmed commitments
    },
  },
  {
    name: "F3 overdue essential counts full",
    inputs: {
      todayLocal: "2026-07-20",
      nextConfirmedIncomeDate: "2026-08-01",
      incomeDateEstimated: false,
      accounts: [{ id: "a1", balanceMinor: 500_000n, balanceAgeDays: 2, archived: false, isCredit: false }],
      occurrences: [
        { id: "c1", amountMinor: 200_000n, dueDate: "2026-07-15", probability: "LOW" as Probability, essential: true, overdue: true },
      ],
      goalReserveMinor: 0n, safetyBufferMinor: 50_000n,
      eligibleRemainingDays: 12,
      fxAgeDaysOverLimit: false, importUnresolvedWarnings: false,
      anyCommitmentConfirmed: true, horizonDays: 12,
    },
    expect: {
      committedWeightedMinor: 200_000n,       // overdue essential at 1.00 despite LOW
      safeToSpendMinor: 250_000n,             // 500000-200000-50000
    },
  },
  {
    name: "F4 no income date blocks",
    inputs: {
      todayLocal: "2026-07-20", nextConfirmedIncomeDate: null, incomeDateEstimated: false,
      accounts: [], occurrences: [], goalReserveMinor: 0n, safetyBufferMinor: 0n,
      eligibleRemainingDays: 0, fxAgeDaysOverLimit: false, importUnresolvedWarnings: false,
      anyCommitmentConfirmed: false, horizonDays: 0,
    },
    expect: { status: "BLOCKED_NO_INCOME" as ForecastStatus },
  },
];

// Minimal runner: `npx tsx forecast-engine-reference.ts`
if (typeof require !== "undefined" && require.main === module) {
  let pass = 0, fail = 0;
  for (const f of FIXTURES) {
    const out = runForecast(f.inputs as ForecastInputs);
    const bad: string[] = [];
    for (const [k, v] of Object.entries(f.expect)) {
      const got = (out as any)[k];
      if (typeof v === "bigint" ? got !== v : got !== v) bad.push(`${k}: expected ${v}, got ${got}`);
    }
    if (bad.length) { fail++; console.log(`❌ ${f.name}\n   ${bad.join("\n   ")}`); }
    else { pass++; console.log(`✅ ${f.name}`); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
}
