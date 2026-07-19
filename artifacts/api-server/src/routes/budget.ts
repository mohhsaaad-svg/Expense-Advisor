import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, budgetTable } from "@workspace/db";
import { UpdateBudgetBody } from "@workspace/api-zod";

const router = Router();

async function getOrCreateBudget() {
  const [existing] = await db.select().from(budgetTable).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(budgetTable)
    .values({ dailyLimit: "100", monthlyLimit: "2000" })
    .returning();
  return created;
}

// GET /budget
router.get("/budget", async (req, res): Promise<void> => {
  const budget = await getOrCreateBudget();
  res.json({
    id: budget.id,
    dailyLimit: parseFloat(budget.dailyLimit),
    monthlyLimit: parseFloat(budget.monthlyLimit),
    updatedAt: budget.updatedAt.toISOString(),
  });
});

// PUT /budget
router.put("/budget", async (req, res): Promise<void> => {
  const body = UpdateBudgetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await getOrCreateBudget();

  const [updated] = await db
    .update(budgetTable)
    .set({
      dailyLimit: body.data.dailyLimit.toString(),
      monthlyLimit: body.data.monthlyLimit.toString(),
      updatedAt: new Date(),
    })
    .where(eq(budgetTable.id, existing.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }

  res.json({
    id: updated.id,
    dailyLimit: parseFloat(updated.dailyLimit),
    monthlyLimit: parseFloat(updated.monthlyLimit),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
