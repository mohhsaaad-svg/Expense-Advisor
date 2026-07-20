import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, budgetTable } from "@workspace/db";
import { UpdateBudgetBody } from "@workspace/api-zod";
import { userId } from "../lib/user";

const router = Router();

/**
 * Fetch the user's budget row, creating the default one on first touch.
 * Race-safe: concurrent first requests both try the insert, the loser hits
 * the per-user unique index (ON CONFLICT DO NOTHING) and re-reads the
 * winner's row — the old select-then-insert race that produced duplicate
 * budget rows can no longer happen.
 */
export async function getOrCreateBudget(uid: string) {
  const [existing] = await db
    .select()
    .from(budgetTable)
    .where(eq(budgetTable.userId, uid))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(budgetTable)
    .values({ userId: uid, dailyLimit: "100", monthlyLimit: "2000" })
    .onConflictDoNothing({ target: budgetTable.userId })
    .returning();
  if (created) return created;

  const [winner] = await db
    .select()
    .from(budgetTable)
    .where(eq(budgetTable.userId, uid))
    .limit(1);
  if (!winner) throw new Error("budget row vanished during get-or-create");
  return winner;
}

function serialize(budget: Awaited<ReturnType<typeof getOrCreateBudget>>) {
  return {
    id: budget.id,
    dailyLimit: parseFloat(budget.dailyLimit),
    monthlyLimit: parseFloat(budget.monthlyLimit),
    salaryAmount: budget.salaryAmount === null ? null : parseFloat(budget.salaryAmount),
    salaryDay: budget.salaryDay,
    updatedAt: budget.updatedAt.toISOString(),
  };
}

// GET /budget
router.get("/budget", async (req, res): Promise<void> => {
  const budget = await getOrCreateBudget(userId(req));
  res.json(serialize(budget));
});

// PUT /budget
router.put("/budget", async (req, res): Promise<void> => {
  const uid = userId(req);
  const body = UpdateBudgetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await getOrCreateBudget(uid);

  const [updated] = await db
    .update(budgetTable)
    .set({
      dailyLimit: body.data.dailyLimit.toString(),
      monthlyLimit: body.data.monthlyLimit.toString(),
      // Only touch salary fields when the client sends them: omitted keys
      // leave stored values alone; explicit nulls clear them.
      ...(body.data.salaryAmount !== undefined && {
        salaryAmount: body.data.salaryAmount === null ? null : body.data.salaryAmount.toString(),
      }),
      ...(body.data.salaryDay !== undefined && { salaryDay: body.data.salaryDay }),
      updatedAt: new Date(),
    })
    .where(and(eq(budgetTable.id, existing.id), eq(budgetTable.userId, uid)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }

  res.json(serialize(updated));
});

export default router;
