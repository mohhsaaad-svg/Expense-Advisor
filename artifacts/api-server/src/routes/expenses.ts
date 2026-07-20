import { Router } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import {
  ListExpensesQueryParams,
  CreateExpenseBody,
  GetExpenseParams,
  UpdateExpenseBody,
  UpdateExpenseParams,
  DeleteExpenseParams,
} from "@workspace/api-zod";
import { materializeDueRecurring, toDateString } from "../lib/recurrence";
import { userId } from "../lib/user";

const router = Router();

type ExpenseRow = typeof expensesTable.$inferSelect;

function serialize(e: ExpenseRow) {
  return {
    id: e.id,
    amount: parseFloat(e.amount),
    category: e.category,
    description: e.description,
    date: e.date,
    recurringId: e.recurringId,
    createdAt: e.createdAt.toISOString(),
  };
}

// GET /expenses
router.get("/expenses", async (req, res): Promise<void> => {
  const uid = userId(req);
  const query = ListExpensesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  // Auto-log this user's recurring expenses that have come due before listing.
  try {
    await materializeDueRecurring(uid, toDateString(new Date()));
  } catch (err) {
    req.log.error({ err }, "recurring materialization failed");
  }

  const { startDate, endDate, category } = query.data;

  const conditions = [eq(expensesTable.userId, uid)];
  if (startDate) conditions.push(gte(expensesTable.date, startDate));
  if (endDate) conditions.push(lte(expensesTable.date, endDate));
  if (category) conditions.push(eq(expensesTable.category, category));

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(and(...conditions))
    .orderBy(expensesTable.date);

  res.json(expenses.map(serialize));
});

// POST /expenses
router.post("/expenses", async (req, res): Promise<void> => {
  const body = CreateExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [created] = await db
    .insert(expensesTable)
    .values({
      userId: userId(req),
      amount: body.data.amount.toString(),
      category: body.data.category,
      description: body.data.description,
      date: body.data.date,
    })
    .returning();

  res.status(201).json(serialize(created));
});

// GET /expenses/:id — someone else's expense is indistinguishable from a
// missing one (404), so ids can't be probed across accounts.
router.get("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId(req))));

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(serialize(expense));
});

// PATCH /expenses/:id
router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof expensesTable.$inferInsert> = {};
  if (body.data.amount !== undefined) updates.amount = body.data.amount.toString();
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.description !== undefined) updates.description = body.data.description;
  if (body.data.date !== undefined) updates.date = body.data.date;

  const [updated] = await db
    .update(expensesTable)
    .set(updates)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId(req))))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(serialize(updated));
});

// DELETE /expenses/:id
router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId(req))))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.status(204).send();
});

export default router;
