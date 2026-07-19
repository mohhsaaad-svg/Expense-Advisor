import { Router } from "express";
import { gte, lte, and, eq, sql } from "drizzle-orm";
import { db, expensesTable, budgetTable, recurringExpensesTable } from "@workspace/db";
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

async function getOrCreateBudget() {
  const [existing] = await db.select().from(budgetTable).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(budgetTable)
    .values({ dailyLimit: "100", monthlyLimit: "2000" })
    .returning();
  return created;
}

function eq_date(date: string) {
  return and(gte(expensesTable.date, date), lte(expensesTable.date, date));
}

type ReqLog = { error: (obj: unknown, msg?: string) => void };

async function materializeSafe(upTo: string, log: ReqLog): Promise<void> {
  try {
    await materializeDueRecurring(upTo);
  } catch (err) {
    log.error({ err }, "recurring materialization failed");
  }
}

// GET /expenses/summary/daily
router.get("/expenses/summary/daily", async (req, res): Promise<void> => {
  const qp = GetDailySummaryQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const date = qp.data.date ?? toDateString(new Date());
  await materializeSafe(date, req.log);
  const budget = await getOrCreateBudget();
  const dailyLimit = parseFloat(budget.dailyLimit);

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq_date(date));

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const remaining = Math.max(0, dailyLimit - totalSpent);
  const percentUsed = dailyLimit > 0 ? Math.round((totalSpent / dailyLimit) * 100) : 0;

  // Category breakdown
  const categoryMap: Record<string, { total: number; count: number }> = {};
  for (const e of expenses) {
    const cat = e.category;
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += parseFloat(e.amount);
    categoryMap[cat].count += 1;
  }

  const categories = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    total: parseFloat(data.total.toFixed(2)),
    count: data.count,
    percentage: totalSpent > 0 ? parseFloat(((data.total / totalSpent) * 100).toFixed(1)) : 0,
  }));

  res.json({
    date,
    totalSpent: parseFloat(totalSpent.toFixed(2)),
    dailyLimit,
    remaining: parseFloat(remaining.toFixed(2)),
    percentUsed,
    expenseCount: expenses.length,
    categories,
  });
});

// GET /expenses/summary/weekly
router.get("/expenses/summary/weekly", async (req, res): Promise<void> => {
  const qp = GetWeeklySummaryQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const anchor = qp.data.date ?? toDateString(new Date());
  const { start, end } = getWeekRange(anchor);
  await materializeSafe(anchor, req.log);

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(and(gte(expensesTable.date, start), lte(expensesTable.date, end)));

  const weekTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Build day map for the full week
  const dayMap: Record<string, { total: number; count: number }> = {};
  const startDate = new Date(start + "T00:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const ds = toDateString(d);
    dayMap[ds] = { total: 0, count: 0 };
  }

  for (const e of expenses) {
    if (dayMap[e.date]) {
      dayMap[e.date].total += parseFloat(e.amount);
      dayMap[e.date].count += 1;
    }
  }

  // Top category
  const catMap: Record<string, number> = {};
  for (const e of expenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + parseFloat(e.amount);
  }
  const topCategory =
    Object.keys(catMap).length > 0
      ? Object.entries(catMap).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  const daysWithData = Object.values(dayMap).filter((d) => d.total > 0).length;
  const dailyAverage = daysWithData > 0 ? weekTotal / daysWithData : 0;

  res.json({
    weekTotal: parseFloat(weekTotal.toFixed(2)),
    dailyAverage: parseFloat(dailyAverage.toFixed(2)),
    topCategory,
    days: Object.entries(dayMap).map(([date, data]) => ({
      date,
      total: parseFloat(data.total.toFixed(2)),
      count: data.count,
    })),
  });
});

// GET /insights/stats — automated counters for dashboards
router.get("/insights/stats", async (req, res): Promise<void> => {
  const qp = GetSpendingStatsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const date = qp.data.date ?? toDateString(new Date());
  await materializeSafe(date, req.log);

  const budget = await getOrCreateBudget();
  const dailyLimit = parseFloat(budget.dailyLimit);
  const monthlyLimit = parseFloat(budget.monthlyLimit);

  const [y, m, d] = date.split("-").map((p) => parseInt(p, 10));
  const monthStart = `${date.slice(0, 7)}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daysElapsed = d;

  const monthExpenses = await db
    .select()
    .from(expensesTable)
    .where(and(gte(expensesTable.date, monthStart), lte(expensesTable.date, date)));

  const monthToDate = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const avgPerDay = daysElapsed > 0 ? monthToDate / daysElapsed : 0;
  const projectedMonthEnd = daysElapsed > 0 ? (monthToDate / daysElapsed) * daysInMonth : 0;
  const monthPercentUsed = monthlyLimit > 0 ? Math.round((monthToDate / monthlyLimit) * 100) : 0;

  // Under-budget streak: consecutive days (ending at `date`) with day total <= dailyLimit.
  const lookbackStart = addDays(date, -364);
  const recent = await db
    .select()
    .from(expensesTable)
    .where(and(gte(expensesTable.date, lookbackStart), lte(expensesTable.date, date)));
  const byDay: Record<string, number> = {};
  for (const e of recent) {
    byDay[e.date] = (byDay[e.date] ?? 0) + parseFloat(e.amount);
  }
  let underBudgetStreak = 0;
  let cursor = date;
  while (cursor >= lookbackStart) {
    const total = byDay[cursor] ?? 0;
    if (total > dailyLimit) break;
    underBudgetStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const [{ count: totalExpenseCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expensesTable);

  const activeRules = await db
    .select()
    .from(recurringExpensesTable)
    .where(eq(recurringExpensesTable.active, true));
  const recurringMonthlyTotal = activeRules.reduce(
    (s, r) => s + monthlyEquivalent(r.frequency as Frequency, parseFloat(r.amount)),
    0,
  );

  res.json({
    date,
    monthToDate: parseFloat(monthToDate.toFixed(2)),
    projectedMonthEnd: parseFloat(projectedMonthEnd.toFixed(2)),
    monthlyLimit,
    monthPercentUsed,
    avgPerDay: parseFloat(avgPerDay.toFixed(2)),
    daysElapsed,
    daysInMonth,
    underBudgetStreak,
    totalExpenseCount,
    activeRecurringCount: activeRules.length,
    recurringMonthlyTotal: parseFloat(recurringMonthlyTotal.toFixed(2)),
  });
});

// GET /insights/tips
router.get("/insights/tips", async (req, res): Promise<void> => {
  const qp = GetSpendingTipsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const today = qp.data.date ?? toDateString(new Date());
  await materializeSafe(today, req.log);
  const budget = await getOrCreateBudget();
  const prefs = await getOrCreatePreferences();
  const alertThreshold = prefs.alertThreshold;
  const dailyLimit = parseFloat(budget.dailyLimit);
  const monthlyLimit = parseFloat(budget.monthlyLimit);

  const todayExpenses = await db
    .select()
    .from(expensesTable)
    .where(eq_date(today));

  const { start: weekStart, end: weekEnd } = getWeekRange(today);
  const weekExpenses = await db
    .select()
    .from(expensesTable)
    .where(and(gte(expensesTable.date, weekStart), lte(expensesTable.date, weekEnd)));

  const monthStart = today.slice(0, 7) + "-01";
  const monthExpenses = await db
    .select()
    .from(expensesTable)
    .where(gte(expensesTable.date, monthStart));

  const todayTotal = todayExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const monthTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Category counts for the week
  const catMap: Record<string, number> = {};
  for (const e of weekExpenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + parseFloat(e.amount);
  }

  const tips: Array<{ id: string; type: string; title: string; message: string }> = [];
  const alerts: Array<{ id: string; type: string; title: string; message: string }> = [];

  const percentUsed = dailyLimit > 0 ? (todayTotal / dailyLimit) * 100 : 0;

  // Budget alerts (warning threshold is user-configurable)
  if (percentUsed >= 100) {
    alerts.push({
      id: "daily-over",
      type: "alert",
      title: "Daily budget exceeded",
      message: `You have spent $${todayTotal.toFixed(2)} today, which is $${(todayTotal - dailyLimit).toFixed(2)} over your $${dailyLimit} daily limit.`,
    });
  } else if (percentUsed >= alertThreshold) {
    alerts.push({
      id: "daily-warning",
      type: "warning",
      title: "Approaching daily limit",
      message: `You have used ${Math.round(percentUsed)}% of your daily budget. Only $${(dailyLimit - todayTotal).toFixed(2)} left for today.`,
    });
  }

  const monthPercent = monthlyLimit > 0 ? (monthTotal / monthlyLimit) * 100 : 0;
  if (monthPercent >= 90) {
    alerts.push({
      id: "monthly-warning",
      type: "warning",
      title: "Monthly budget nearly full",
      message: `You have used ${Math.round(monthPercent)}% of your monthly budget with $${(monthlyLimit - monthTotal).toFixed(2)} remaining.`,
    });
  }

  // Recurring cost awareness
  const activeRules = await db
    .select()
    .from(recurringExpensesTable)
    .where(eq(recurringExpensesTable.active, true));
  const recurringMonthly = activeRules.reduce(
    (s, r) => s + monthlyEquivalent(r.frequency as Frequency, parseFloat(r.amount)),
    0,
  );
  if (monthlyLimit > 0 && recurringMonthly >= monthlyLimit * 0.4) {
    tips.push({
      id: "recurring-heavy",
      type: "tip",
      title: "Recurring costs are significant",
      message: `Your recurring expenses add up to about $${recurringMonthly.toFixed(2)} a month — ${Math.round((recurringMonthly / monthlyLimit) * 100)}% of your monthly budget. Reviewing subscriptions is the fastest way to free up room.`,
    });
  }

  // Positive reinforcement
  if (percentUsed < 50 && todayTotal > 0) {
    tips.push({
      id: "on-track",
      type: "positive",
      title: "Great spending today",
      message: `You are well within your daily budget, with ${Math.round(100 - percentUsed)}% remaining. Keep it up!`,
    });
  }

  if (todayTotal === 0) {
    tips.push({
      id: "zero-spend",
      type: "positive",
      title: "Zero-spend day",
      message: "You have not logged any expenses today. Great for your savings!",
    });
  }

  // Category tips
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] > dailyLimit * 0.4 * 7) {
    tips.push({
      id: "top-category",
      type: "tip",
      title: `High spending on ${topCat[0]}`,
      message: `${topCat[0]} is your biggest expense category this week at $${topCat[1].toFixed(2)}. Consider setting a sub-budget for it.`,
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
