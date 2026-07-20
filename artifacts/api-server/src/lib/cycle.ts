import { addDays } from "./recurrence";

/**
 * Salary-cycle window resolution.
 *
 * When the user has set a salary day, budgeting runs payday -> day before
 * next payday ("the cycle"). Without one we fall back to the calendar month
 * so the app keeps working before onboarding is complete.
 */
export type Cycle = {
  /** First day of the cycle (payday), inclusive. */
  start: string;
  /** Last day of the cycle (day before next payday), inclusive. */
  end: string;
  /** True when anchored to a salary day, false for the calendar-month fallback. */
  anchored: boolean;
  /** Next payday (YYYY-MM-DD) when anchored, null otherwise. */
  nextPayday: string | null;
  /** Total days in the cycle. */
  days: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonthOf(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Payday for a given (year, month0), clamping day 29-31 into short months. */
function paydayOf(year: number, month0: number, salaryDay: number): string {
  const day = Math.min(salaryDay, daysInMonthOf(year, month0));
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

function diffDaysInclusive(start: string, end: string): number {
  const a = new Date(start + "T00:00:00Z").getTime();
  const b = new Date(end + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

/**
 * Resolve the cycle containing `today` (YYYY-MM-DD).
 * `salaryDay` is the day-of-month the salary lands (1-31, clamped), or null.
 */
export function computeCycle(salaryDay: number | null, today: string): Cycle {
  const [y, m] = today.split("-").map((p) => parseInt(p, 10));
  const month0 = m - 1;

  if (!salaryDay || salaryDay < 1 || salaryDay > 31) {
    const start = `${today.slice(0, 7)}-01`;
    const end = `${today.slice(0, 7)}-${pad(daysInMonthOf(y, month0))}`;
    return { start, end, anchored: false, nextPayday: null, days: diffDaysInclusive(start, end) };
  }

  const payThisMonth = paydayOf(y, month0, salaryDay);
  let start: string;
  let nextPayday: string;
  if (today >= payThisMonth) {
    start = payThisMonth;
    nextPayday = paydayOf(month0 === 11 ? y + 1 : y, (month0 + 1) % 12, salaryDay);
  } else {
    start = paydayOf(month0 === 0 ? y - 1 : y, (month0 + 11) % 12, salaryDay);
    nextPayday = payThisMonth;
  }
  const end = addDays(nextPayday, -1);
  return { start, end, anchored: true, nextPayday, days: diffDaysInclusive(start, end) };
}
