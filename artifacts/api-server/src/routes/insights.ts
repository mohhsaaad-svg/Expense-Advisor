import { Router } from "express";
import { gte, lte, and, eq, sql } from "drizzle-orm";
import { db, expensesTable, recurringExpensesTable } from "@workspace/db";
import {
  GetDailySummaryQueryParams,
  GetSpendingStatsQueryParams,
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
import { getOrCreatePreferences } from "./preferences";
import { getOrCreateBudget } from "./budget";
import { userId } from "../lib/user";
import { toCents, sumCents, centsToNumber, formatMoney } from "../lib/money";

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
  const dailyLimitCents = toCents(budget.dailyLimit);

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, date, date));

  const totalCents = sumCents(expenses.map((e) => e.amount));
  const remainingCents = Math.max(0, dailyLimitCents - totalCents);
  const percentUsed = dailyLimitCents > 0 ? Math.round((totalCents / dailyLimitCents) * 100) : 0;

  // Category breakdown (integer cents; converted only at the JSON boundary)
  const categoryMap: Record<string, { cents: number; count: number }> = {};
  for (const e of expenses) {
    const cat = e.category;
    if (!categoryMap[cat]) categoryMap[cat] = { cents: 0, count: 0 };
    categoryMap[cat].cents += toCents(e.amount);
    categoryMap[cat].count += 1;
  }

  const categories = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    total: centsToNumber(data.cents),
    count: data.count,
    percentage: totalCents > 0 ? parseFloat(((data.cents / totalCents) * 100).toFixed(1)) : 0,
  }));

  res.json({
    date,
    totalSpent: centsToNumber(totalCents),
    dailyLimit: centsToNumber(dailyLimitCents),
    remaining: centsToNumber(remainingCents),
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

  const weekCents = sumCents(expenses.map((e) => e.amount));

  // Build day map for the full week
  const dayMap: Record<string, { cents: number; count: number }> = {};
  const startDate = new Date(start + "T00:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const ds = toDateString(d);
    dayMap[ds] = { cents: 0, count: 0 };
  }

  for (const e of expenses) {
    if (dayMap[e.date]) {
      dayMap[e.date].cents += toCents(e.amount);
      dayMap[e.date].count += 1;
    }
  }

  // Top category
  const catMap: Record<string, number> = {};
  for (const e of expenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + toCents(e.amount);
  }
  const topCategory =
    Object.keys(catMap).length > 0
      ? Object.entries(catMap).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  // Calendar average: week total spread across all 7 days of the week,
  // zero-spend days included — "what does a day of this week cost me on
  // average". (Not an average over only the days with logged spending;
  // that version overstated daily cost for anyone who doesn't spend daily.)
  const dailyAverageCents = Math.round(weekCents / 7);

  res.json({
    weekTotal: centsToNumber(weekCents),
    dailyAverage: centsToNumber(dailyAverageCents),
    topCategory,
    days: Object.entries(dayMap).map(([date, data]) => ({
      date,
      total: centsToNumber(data.cents),
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
  const dailyLimitCents = toCents(budget.dailyLimit);
  const monthlyLimitCents = toCents(budget.monthlyLimit);

  const [y, m, d] = date.split("-").map((p) => parseInt(p, 10));
  const monthStart = `${date.slice(0, 7)}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daysElapsed = d;

  // Month-to-date is bounded on BOTH ends so future-dated entries never count.
  const monthExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, monthStart, date));

  const monthCents = sumCents(monthExpenses.map((e) => e.amount));
  const avgPerDayCents = daysElapsed > 0 ? Math.round(monthCents / daysElapsed) : 0;
  const projectedCents = daysElapsed > 0 ? Math.round((monthCents / daysElapsed) * daysInMonth) : 0;
  const monthPercentUsed =
    monthlyLimitCents > 0 ? Math.round((monthCents / monthlyLimitCents) * 100) : 0;

  // Under-budget streak: consecutive days ending at `date` where the user
  // LOGGED spending and stayed within the daily limit. A day with nothing
  // logged breaks the streak — only verified on-budget days count, so an
  // untouched tracker can't quietly accumulate an impressive streak.
  const lookbackStart = addDays(date, -364);
  const recent = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, lookbackStart, date));
  const byDayCents: Record<string, number> = {};
  for (const e of recent) {
    byDayCents[e.date] = (byDayCents[e.date] ?? 0) + toCents(e.amount);
  }
  let underBudgetStreak = 0;
  let cursor = date;
  while (cursor >= lookbackStart) {
    const total = byDayCents[cursor];
    if (total === undefined || total > dailyLimitCents) break;
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
  let recurringMonthlyCents = 0;
  for (const r of activeRules) {
    recurringMonthlyCents += monthlyEquivalent(r.frequency as Frequency, toCents(r.amount));
  }

  res.json({
    date,
    monthToDate: centsToNumber(monthCents),
    projectedMonthEnd: centsToNumber(projectedCents),
    monthlyLimit: centsToNumber(monthlyLimitCents),
    monthPercentUsed,
    avgPerDay: centsToNumber(avgPerDayCents),
    daysElapsed,
    daysInMonth,
    underBudgetStreak,
    totalExpenseCount,
    activeRecurringCount: activeRules.length,
    recurringMonthlyTotal: centsToNumber(recurringMonthlyCents),
  });
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
  const dailyLimitCents = toCents(budget.dailyLimit);
  const monthlyLimitCents = toCents(budget.monthlyLimit);

  const todayExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, today, today));

  const { start: weekStart, end: weekEnd } = getWeekRange(today);
  const weekExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, weekStart, weekEnd));

  // Month-to-date is bounded on BOTH ends: without the upper bound, a
  // future-dated entry (say, rent logged ahead) inflates "spent so far" and
  // fires bogus over-budget alerts.
  const monthStart = today.slice(0, 7) + "-01";
  const monthExpenses = await db
    .select()
    .from(expensesTable)
    .where(ownedBetween(uid, monthStart, today));

  const todayCents = sumCents(todayExpenses.map((e) => e.amount));
  const monthCents = sumCents(monthExpenses.map((e) => e.amount));

  // Category totals for the week (cents)
  const catMap: Record<string, number> = {};
  for (const e of weekExpenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + toCents(e.amount);
  }

  const tips: Array<{ id: string; type: string; title: string; message: string }> = [];
  const alerts: Array<{ id: string; type: string; title: string; message: string }> = [];

  const percentUsed = dailyLimitCents > 0 ? (todayCents / dailyLimitCents) * 100 : 0;

  // Budget alerts (warning threshold is user-configurable). Message amounts
  // are formatted in the user's chosen currency, not hardcoded dollars.
  if (percentUsed >= 100) {
    alerts.push({
      id: "daily-over",
      type: "alert",
      title: "Daily budget exceeded",
      message: `You have spent ${formatMoney(todayCents, cur)} today, which is ${formatMoney(todayCents - dailyLimitCents, cur)} over your ${formatMoney(dailyLimitCents, cur)} daily limit.`,
    });
  } else if (percentUsed >= alertThreshold) {
    alerts.push({
      id: "daily-warning",
      type: "warning",
      title: "Approaching daily limit",
      message: `You have used ${Math.round(percentUsed)}% of your daily budget. Only ${formatMoney(dailyLimitCents - todayCents, cur)} left for today.`,
    });
  }

  const monthPercent = monthlyLimitCents > 0 ? (monthCents / monthlyLimitCents) * 100 : 0;
  if (monthPercent >= 90) {
    alerts.push({
      id: "monthly-warning",
      type: "warning",
      title: "Monthly budget nearly full",
      message: `You have used ${Math.round(monthPercent)}% of your monthly budget with ${formatMoney(monthlyLimitCents - monthCents, cur)} remaining.`,
    });
  }

  // Recurring cost awareness
  const activeRules = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.userId, uid), eq(recurringExpensesTable.active, true)));
  let recurringMonthlyCents = 0;
  for (const r of activeRules) {
    recurringMonthlyCents += monthlyEquivalent(r.frequency as Frequency, toCents(r.amount));
  }
  if (monthlyLimitCents > 0 && recurringMonthlyCents >= monthlyLimitCents * 0.4) {
    tips.push({
      id: "recurring-heavy",
      type: "tip",
      title: "Recurring costs are significant",
      message: `Your recurring expenses add up to about ${formatMoney(recurringMonthlyCents, cur)} a month — ${Math.round((recurringMonthlyCents / monthlyLimitCents) * 100)}% of your monthly budget. Reviewing subscriptions is the fastest way to free up room.`,
    });
  }

  // Positive reinforcement
  if (percentUsed < 50 && todayCents > 0) {
    tips.push({
      id: "on-track",
      type: "positive",
      title: "Great spending today",
      message: `You are well within your daily budget, with ${Math.round(100 - percentUsed)}% remaining. Keep it up!`,
    });
  }

  if (todayCents === 0) {
    tips.push({
      id: "zero-spend",
      type: "positive",
      title: "Zero-spend day",
      message: "You have not logged any expenses today. Great for your savings!",
    });
  }

  // Category tips
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] > dailyLimitCents * 0.4 * 7) {
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
