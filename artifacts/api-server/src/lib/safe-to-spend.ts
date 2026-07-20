/**
 * Safe-to-spend engine.
 *
 * Deterministic, server-computed "safe to spend until next salary" figure:
 *
 *   safeToSpend = salary
 *               − spent so far this pay cycle
 *               − committed recurring charges due before payday
 *               − goal buffers reserved for deadline-driven savings goals
 *
 * Code calculates, AI explains: this module is the single source of truth
 * that both the /insights/safe-to-spend endpoint and the Ember advisor
 * grounding use. All arithmetic is in integer mills; every output figure is
 * traceable to its inputs via the breakdown lists.
 */
import { and, eq, gte, lte } from "drizzle-orm";
import { db, expensesTable, goalsTable, recurringExpensesTable } from "@workspace/db";
import { addDays, occurrencesBetween, toDateString, type Frequency } from "./recurrence";
import { getOrCreateBudget } from "../routes/budget";
import { sumMills, toMills, millsToNumber } from "./money";

export type SafeToSpendBreakdown = {
  date: string;
  configured: boolean;
  salaryDay: number | null;
  cycleStart: string | null;
  nextPayday: string | null;
  daysUntilPayday: number | null;
  salary: number | null;
  spentThisCycle: number;
  upcomingCommitments: Array<{ description: string; amount: number; dueDate: string }>;
  upcomingCommitmentsTotal: number;
  goalBuffers: Array<{ name: string; amount: number; deadline: string | null }>;
  goalBuffersTotal: number;
  safeToSpend: number | null;
  safePerDay: number | null;
};

function daysInMonthOf(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** The salary date within a given year-month, clamping day to month length. */
function salaryDateIn(year: number, month1: number, salaryDay: number): string {
  const day = Math.min(salaryDay, daysInMonthOf(year, month1));
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Pay cycle containing `date`: cycleStart is the most recent salary date
 * <= date; nextPayday is the following salary date (exclusive end of cycle).
 */
export function payCycleFor(date: string, salaryDay: number): { cycleStart: string; nextPayday: string } {
  const [y, m] = date.split("-").map((p) => parseInt(p, 10));
  const thisMonth = salaryDateIn(y, m, salaryDay);
  if (thisMonth <= date) {
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    return { cycleStart: thisMonth, nextPayday: salaryDateIn(ny, nm, salaryDay) };
  }
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return { cycleStart: salaryDateIn(py, pm, salaryDay), nextPayday: thisMonth };
}

/** Whole days from `from` (exclusive today) to `to` — how many days the money must last. */
function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Whole pay cycles from `date` until `deadline` (>= 1 so a due goal still gets one buffer). */
function cyclesUntil(date: string, deadline: string): number {
  const [y1, m1] = date.split("-").map((p) => parseInt(p, 10));
  const [y2, m2] = deadline.split("-").map((p) => parseInt(p, 10));
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1));
}

export async function computeSafeToSpend(uid: string, date?: string): Promise<SafeToSpendBreakdown> {
  const today = date ?? toDateString(new Date());
  const budget = await getOrCreateBudget(uid);

  const empty: SafeToSpendBreakdown = {
    date: today,
    configured: false,
    salaryDay: null,
    cycleStart: null,
    nextPayday: null,
    daysUntilPayday: null,
    salary: null,
    spentThisCycle: 0,
    upcomingCommitments: [],
    upcomingCommitmentsTotal: 0,
    goalBuffers: [],
    goalBuffersTotal: 0,
    safeToSpend: null,
    safePerDay: null,
  };

  if (budget.salaryAmount == null || budget.salaryDay == null) return empty;

  const salaryDay = budget.salaryDay;
  const salaryMills = toMills(budget.salaryAmount);
  const { cycleStart, nextPayday } = payCycleFor(today, salaryDay);
  const daysUntilPayday = daysBetween(today, nextPayday);

  const [cycleExpenses, activeRules, goals] = await Promise.all([
    db
      .select()
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.userId, uid),
          gte(expensesTable.date, cycleStart),
          lte(expensesTable.date, today),
        ),
      ),
    db
      .select()
      .from(recurringExpensesTable)
      .where(and(eq(recurringExpensesTable.userId, uid), eq(recurringExpensesTable.active, true))),
    db.select().from(goalsTable).where(eq(goalsTable.userId, uid)),
  ]);

  const spentMills = sumMills(cycleExpenses.map((e) => e.amount));

  // Committed charges still to come this cycle: every occurrence of an active
  // recurring rule strictly after today and before the next payday.
  const upcoming: Array<{ description: string; amountMills: number; dueDate: string }> = [];
  const lastDayOfCycle = addDays(nextPayday, -1);
  for (const r of activeRules) {
    const dates = occurrencesBetween(r.frequency as Frequency, r.startDate, today, lastDayOfCycle);
    for (const d of dates) {
      upcoming.push({ description: r.description, amountMills: toMills(r.amount), dueDate: d });
    }
  }
  upcoming.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  const upcomingMills = upcoming.reduce((acc, u) => acc + u.amountMills, 0);

  // Goal buffers: a goal reserves money this cycle when it either has a
  // deadline (remaining ÷ cycles left) or an explicit per-payday amount the
  // user chose to set aside. When both exist, the larger reservation wins so
  // the goal still lands on time. Fully-funded goals reserve nothing.
  const buffers: Array<{ name: string; amountMills: number; deadline: string | null }> = [];
  for (const g of goals) {
    const remaining = Math.max(0, toMills(g.targetAmount) - toMills(g.savedAmount));
    if (remaining <= 0) continue;
    const deadlineMills = g.deadline ? Math.ceil(remaining / cyclesUntil(today, g.deadline)) : 0;
    const perPaydayMills = g.perPaydayAmount ? Math.min(remaining, toMills(g.perPaydayAmount)) : 0;
    const amountMills = Math.max(deadlineMills, perPaydayMills);
    if (amountMills <= 0) continue;
    buffers.push({ name: g.name, amountMills, deadline: g.deadline });
  }
  const buffersMills = buffers.reduce((acc, b) => acc + b.amountMills, 0);

  const safeMills = salaryMills - spentMills - upcomingMills - buffersMills;
  const safePerDayMills =
    daysUntilPayday > 0 ? Math.floor(Math.max(0, safeMills) / daysUntilPayday) : Math.max(0, safeMills);

  return {
    date: today,
    configured: true,
    salaryDay,
    cycleStart,
    nextPayday,
    daysUntilPayday,
    salary: millsToNumber(salaryMills),
    spentThisCycle: millsToNumber(spentMills),
    upcomingCommitments: upcoming.map((u) => ({
      description: u.description,
      amount: millsToNumber(u.amountMills),
      dueDate: u.dueDate,
    })),
    upcomingCommitmentsTotal: millsToNumber(upcomingMills),
    goalBuffers: buffers.map((b) => ({
      name: b.name,
      amount: millsToNumber(b.amountMills),
      deadline: b.deadline,
    })),
    goalBuffersTotal: millsToNumber(buffersMills),
    safeToSpend: millsToNumber(safeMills),
    safePerDay: millsToNumber(safePerDayMills),
  };
}
