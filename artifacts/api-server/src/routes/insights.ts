import { Router } from "express";
import { gte, lte, and, eq, sql } from "drizzle-orm";
import { db, expensesTable, recurringExpensesTable } from "@workspace/db";
import {
  GetDailySummaryQueryParams,
  GetSpendingStatsQueryParams,
  GetSafeToSpendQueryParams,
  GetSpendingTipsQueryParams,
  GetWeeklySummaryQueryParams,
} from "@workspace/api-zod";
import {
  addDays,
  materializeDueRecurring,
  monthlyEquivalent,
  toDateString,
  type Frequency,
} from "../lib/recurrence";
import { computeCycle } from "../lib/cycle";
import { occurrencesBetween } from "../lib/recurrence";
import { getOrCreatePreferences } from "./preferences";
import { getOrCreateBudget } from "./budget";
import { userId } from "../lib/user";
import { toMills, sumMills, millsToNumber, formatMoney } from "../lib/money";
import { computeSafeToSpend } from "../lib/safe-to-spend";

const router = Router();

/** Monday-to-Sunday range of the week containing `anchor` (YYYY-MM-DD). */
function getWeekRange(anchor: string) {
  const dt = new Date(anchor + "T00:00:00Z");
  const day = dt.getUTCDay(); // 0=Sun
  const monday = new Date(dt);
  monday.setUTCDate(dt.getUTCDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: toDateString(monday), end: toDateString(sunday) };
}

/** Owner-scoped inclusive date window — the only way expenses are read here. */
function ownedBetween(uid: string, start: string, end: string) {
  return and(
    eq(expensesTable.userId, uid),
    gte(expensesTable.date, start),
    lte(expensesTable.date, end),
  );
}

type ReqLog = { error: (obj: unknown, msg?: string) => void };

async function materializeSafe(uid: string, upTo: string, log: ReqLog): Promise<void> {
  try {
    await materializeDueRecurring(uid, upTo);
  } catch (err) {
    log.error({ err }, "recurring materialization failed");
  }
}

// GET /expenses/summary/daily
router.get("/expenses/summary/daily", async (req, res): Promise<void> => {
  const uid = userId(req);
  const qp = GetDailySummaryQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const date = qp.data.date ?? toDateString(new Date());
  await materializeSafe(uid, date, req.log);
  const budget = await getOrCreateBudget(uid);
  const dailyLimitMills = toMills(budget.dailyLimit);

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, date, date));

  const totalMills = sumMills(expenses.map((e) => e.amount));
  const remainingMills = Math.max(0, dailyLimitMills - totalMills);
  const percentUsed = dailyLimitMills > 0 ? Math.round((totalMills / dailyLimitMills) * 100) : 0;

  // Category breakdown (integer mills; converted only at the JSON boundary)
  const categoryMap: Record<string, { mills: number; count: number }> = {};
  for (const e of expenses) {
    const cat = e.category;
    if (!categoryMap[cat]) categoryMap[cat] = { mills: 0, count: 0 };
    categoryMap[cat].mills += toMills(e.amount);
    categoryMap[cat].count += 1;
  }

  const categories = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    total: millsToNumber(data.mills),
    count: data.count,
    percentage: totalMills > 0 ? parseFloat(((data.mills / totalMills) * 100).toFixed(1)) : 0,
  }));

  res.json({
    date,
    totalSpent: millsToNumber(totalMills),
    dailyLimit: millsToNumber(dailyLimitMills),
    remaining: millsToNumber(remainingMills),
    percentUsed,
    expenseCount: expenses.length,
    categories,
  });
});

// GET /expenses/summary/weekly
router.get("/expenses/summary/weekly", async (req, res): Promise<void> => {
  const uid = userId(req);
  const qp = GetWeeklySummaryQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const anchor = qp.data.date ?? toDateString(new Date());
  const { start, end } = getWeekRange(anchor);
  await materializeSafe(uid, anchor, req.log);

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, start, end));

  const weekMills = sumMills(expenses.map((e) => e.amount));

  // Build day map for the full week
  const dayMap: Record<string, { mills: number; count: number }> = {};
  const startDate = new Date(start + "T00:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const ds = toDateString(d);
    dayMap[ds] = { mills: 0, count: 0 };
  }

  for (const e of expenses) {
    if (dayMap[e.date]) {
      dayMap[e.date].mills += toMills(e.amount);
      dayMap[e.date].count += 1;
    }
  }

  // Top category
  const catMap: Record<string, number> = {};
  for (const e of expenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + toMills(e.amount);
  }
  const topCategory =
    Object.keys(catMap).length > 0
      ? Object.entries(catMap).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  // Calendar average: week total spread across all 7 days of the week,
  // zero-spend days included — "what does a day of this week cost me on
  // average". (Not an average over only the days with logged spending;
  // that version overstated daily cost for anyone who doesn't spend daily.)
  const dailyAverageMills = Math.round(weekMills / 7);

  res.json({
    weekTotal: millsToNumber(weekMills),
    dailyAverage: millsToNumber(dailyAverageMills),
    topCategory,
    days: Object.entries(dayMap).map(([date, data]) => ({
      date,
      total: millsToNumber(data.mills),
      count: data.count,
    })),
  });
});

// GET /insights/stats — automated counters for dashboards
router.get("/insights/stats", async (req, res): Promise<void> => {
  const uid = userId(req);
  const qp = GetSpendingStatsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const date = qp.data.date ?? toDateString(new Date());
  await materializeSafe(uid, date, req.log);

  const budget = await getOrCreateBudget(uid);
  const dailyLimitMills = toMills(budget.dailyLimit);
  const monthlyLimitMills = toMills(budget.monthlyLimit);

  // Salary-cycle window: payday -> day before next payday when a salary day
  // is set; calendar month otherwise.
  const cycle = computeCycle(budget.salaryDay, date);
  const daysInCycle = cycle.days;
  const daysElapsed =
    Math.round(
      (new Date(date + "T00:00:00Z").getTime() - new Date(cycle.start + "T00:00:00Z").getTime()) /
        86_400_000,
    ) + 1;
  const daysUntilPayday = cycle.nextPayday
    ? Math.round(
        (new Date(cycle.nextPayday + "T00:00:00Z").getTime() -
          new Date(date + "T00:00:00Z").getTime()) /
          86_400_000,
      )
    : null;

  // Cycle-to-date is bounded on BOTH ends so future-dated entries never count.
  const monthExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, cycle.start, date));

  const monthMills = sumMills(monthExpenses.map((e) => e.amount));
  const avgPerDayMills = daysElapsed > 0 ? Math.round(monthMills / daysElapsed) : 0;
  const projectedMills = daysElapsed > 0 ? Math.round((monthMills / daysElapsed) * daysInCycle) : 0;
  const monthPercentUsed =
    monthlyLimitMills > 0 ? Math.round((monthMills / monthlyLimitMills) * 100) : 0;

  // Under-budget streak: consecutive days ending at `date` where the user
  // LOGGED spending and stayed within the daily limit. A day with nothing
  // logged breaks the streak — only verified on-budget days count, so an
  // untouched tracker can't quietly accumulate an impressive streak.
  const lookbackStart = addDays(date, -364);
  const recent = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, lookbackStart, date));
  const byDayMills: Record<string, number> = {};
  for (const e of recent) {
    byDayMills[e.date] = (byDayMills[e.date] ?? 0) + toMills(e.amount);
  }
  let underBudgetStreak = 0;
  let cursor = date;
  while (cursor >= lookbackStart) {
    const total = byDayMills[cursor];
    if (total === undefined || total > dailyLimitMills) break;
    underBudgetStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const [{ count: totalExpenseCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expensesTable)
    .where(eq(expensesTable.userId, uid));

  const activeRules = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.userId, uid), eq(recurringExpensesTable.active, true)));
  let recurringMonthlyMills = 0;
  for (const r of activeRules) {
    recurringMonthlyMills += monthlyEquivalent(r.frequency as Frequency, toMills(r.amount));
  }

  // Committed obligations mapped into this cycle: every occurrence of every
  // active rule that falls between cycle start and cycle end.
  let committedTotalMills = 0;
  let committedRemainingMills = 0;
  const upcomingObligations: Array<{
    recurringId: number;
    description: string;
    category: string;
    amount: number;
    date: string;
    frequency: string;
  }> = [];
  for (const r of activeRules) {
    const occ = occurrencesBetween(
      r.frequency as Frequency,
      r.startDate,
      addDays(cycle.start, -1),
      cycle.end,
    );
    const mills = toMills(r.amount);
    for (const day of occ) {
      committedTotalMills += mills;
      if (day > date) {
        committedRemainingMills += mills;
        upcomingObligations.push({
          recurringId: r.id,
          description: r.description,
          category: r.category,
          amount: millsToNumber(mills),
          date: day,
          frequency: r.frequency,
        });
      }
    }
  }
  upcomingObligations.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  res.json({
    date,
    monthToDate: millsToNumber(monthMills),
    projectedMonthEnd: millsToNumber(projectedMills),
    monthlyLimit: millsToNumber(monthlyLimitMills),
    monthPercentUsed,
    avgPerDay: millsToNumber(avgPerDayMills),
    daysElapsed,
    daysInMonth: daysInCycle,
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    cycleAnchored: cycle.anchored,
    nextPayday: cycle.nextPayday,
    daysUntilPayday,
    salaryAmount: budget.salaryAmount === null ? null : parseFloat(budget.salaryAmount),
    committedTotal: millsToNumber(committedTotalMills),
    committedRemaining: millsToNumber(committedRemainingMills),
    upcomingObligations: upcomingObligations.slice(0, 10),
    underBudgetStreak,
    totalExpenseCount,
    activeRecurringCount: activeRules.length,
    recurringMonthlyTotal: millsToNumber(recurringMonthlyMills),
  });
});

// GET /insights/safe-to-spend — deterministic "safe to spend before payday"
// figure with a full breakdown. Code calculates, AI explains: this endpoint
// (via computeSafeToSpend) is the single source of truth for the number.
router.get("/insights/safe-to-spend", async (req, res): Promise<void> => {
  const uid = userId(req);
  const qp = GetSafeToSpendQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const date = qp.data.date ?? toDateString(new Date());
  await materializeSafe(uid, date, req.log);
  res.json(await computeSafeToSpend(uid, date));
});

// GET /insights/tips
router.get("/insights/tips", async (req, res): Promise<void> => {
  const uid = userId(req);
  const qp = GetSpendingTipsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const today = qp.data.date ?? toDateString(new Date());
  await materializeSafe(uid, today, req.log);
  const [budget, prefs] = await Promise.all([getOrCreateBudget(uid), getOrCreatePreferences(uid)]);
  const cur = prefs.currency;
  const alertThreshold = prefs.alertThreshold;
  const dailyLimitMills = toMills(budget.dailyLimit);
  const monthlyLimitMills = toMills(budget.monthlyLimit);

  const todayExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, today, today));

  const { start: weekStart, end: weekEnd } = getWeekRange(today);
  const weekExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, weekStart, weekEnd));

  // Cycle-to-date is bounded on BOTH ends: without the upper bound, a
  // future-dated entry (say, rent logged ahead) inflates "spent so far" and
  // fires bogus over-budget alerts.
  const cycle = computeCycle(budget.salaryDay, today);
  const monthExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, cycle.start, today));

  const todayMills = sumMills(todayExpenses.map((e) => e.amount));
  const monthMills = sumMills(monthExpenses.map((e) => e.amount));

  // Category totals for the week (mills)
  const catMap: Record<string, number> = {};
  for (const e of weekExpenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + toMills(e.amount);
  }

  const tips: Array<{ id: string; type: string; title: string; message: string }> = [];
  const alerts: Array<{ id: string; type: string; title: string; message: string }> = [];

  const percentUsed = dailyLimitMills > 0 ? (todayMills / dailyLimitMills) * 100 : 0;

  // Budget alerts (warning threshold is user-configurable). Message amounts
  // are formatted in the user's chosen currency, not hardcoded dollars.
  if (percentUsed >= 100) {
    alerts.push({
      id: "daily-over",
      type: "alert",
      title: "Daily budget exceeded",
      message: `You have spent ${formatMoney(todayMills, cur)} today, which is ${formatMoney(todayMills - dailyLimitMills, cur)} over your ${formatMoney(dailyLimitMills, cur)} daily limit.`,
    });
  } else if (percentUsed >= alertThreshold) {
    alerts.push({
      id: "daily-warning",
      type: "warning",
      title: "Approaching daily limit",
      message: `You have used ${Math.round(percentUsed)}% of your daily budget. Only ${formatMoney(dailyLimitMills - todayMills, cur)} left for today.`,
    });
  }

  const monthPercent = monthlyLimitMills > 0 ? (monthMills / monthlyLimitMills) * 100 : 0;
  if (monthPercent >= 90) {
    alerts.push({
      id: "monthly-warning",
      type: "warning",
      title: cycle.anchored ? "Cycle budget nearly full" : "Monthly budget nearly full",
      message: cycle.anchored
        ? `You have used ${Math.round(monthPercent)}% of this salary cycle's budget with ${formatMoney(monthlyLimitMills - monthMills, cur)} remaining until payday.`
        : `You have used ${Math.round(monthPercent)}% of your monthly budget with ${formatMoney(monthlyLimitMills - monthMills, cur)} remaining.`,
    });
  }

  // Payday-aware pacing: with a salary anchor, warn when spend is outpacing
  // the days left before the next salary lands.
  if (cycle.anchored && cycle.nextPayday) {
    const daysLeft = Math.round(
      (new Date(cycle.nextPayday + "T00:00:00Z").getTime() -
        new Date(today + "T00:00:00Z").getTime()) /
        86_400_000,
    );
    const daysGone = cycle.days - daysLeft;
    if (
      daysLeft > 0 &&
      daysGone > 0 &&
      monthlyLimitMills > 0 &&
      monthPercent > (daysGone / cycle.days) * 100 + 15
    ) {
      alerts.push({
        id: "payday-pace",
        type: "warning",
        title: "Spending ahead of your salary cycle",
        message: `${daysLeft} day${daysLeft === 1 ? "" : "s"} to payday, but you've already used ${Math.round(monthPercent)}% of this cycle's budget. Slowing down now keeps the last stretch comfortable.`,
      });
    }
  }

  // Recurring cost awareness
  const activeRules = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.userId, uid), eq(recurringExpensesTable.active, true)));
  let recurringMonthlyMills = 0;
  for (const r of activeRules) {
    recurringMonthlyMills += monthlyEquivalent(r.frequency as Frequency, toMills(r.amount));
  }
  if (monthlyLimitMills > 0 && recurringMonthlyMills >= monthlyLimitMills * 0.4) {
    tips.push({
      id: "recurring-heavy",
      type: "tip",
      title: "Recurring costs are significant",
      message: `Your recurring expenses add up to about ${formatMoney(recurringMonthlyMills, cur)} a month — ${Math.round((recurringMonthlyMills / monthlyLimitMills) * 100)}% of your monthly budget. Reviewing subscriptions is the fastest way to free up room.`,
    });
  }

  // Positive reinforcement
  if (percentUsed < 50 && todayMills > 0) {
    tips.push({
      id: "on-track",
      type: "positive",
      title: "Great spending today",
      message: `You are well within your daily budget, with ${Math.round(100 - percentUsed)}% remaining. Keep it up!`,
    });
  }

  if (todayMills === 0) {
    tips.push({
      id: "zero-spend",
      type: "positive",
      title: "Zero-spend day",
      message: "You have not logged any expenses today. Great for your savings!",
    });
  }

  // Category tips
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] > dailyLimitMills * 0.4 * 7) {
    tips.push({
      id: "top-category",
      type: "tip",
      title: `High spending on ${topCat[0]}`,
      message: `${topCat[0]} is your biggest expense category this week at ${formatMoney(topCat[1], cur)}. Consider setting a sub-budget for it.`,
    });
  }

  // Generic tips when no other tips
  if (tips.length === 0 && alerts.length === 0) {
    tips.push({
      id: "track-tip",
      type: "tip",
      title: "Log expenses as you go",
      message: "Adding expenses right after you spend keeps your data accurate and helps you spot patterns faster.",
    });
  }

  tips.push({
    id: "review-weekly",
    type: "tip",
    title: "Review your week on Sundays",
    message: "A quick weekly review helps you plan next week's spending and spot any categories creeping up.",
  });

  res.json({ tips, alerts });
});

export default router;
