import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, recurringExpensesTable } from "@workspace/db";
import {
  CreateRecurringExpenseBody,
  UpdateRecurringExpenseBody,
  UpdateRecurringExpenseParams,
  DeleteRecurringExpenseParams,
} from "@workspace/api-zod";
import { addDays, materializeDueRecurring, toDateString } from "../lib/recurrence";
import { userId } from "../lib/user";

const router = Router();

type RecurringRow = typeof recurringExpensesTable.$inferSelect;

function serialize(r: RecurringRow) {
  return {
    id: r.id,
    description: r.description,
    amount: parseFloat(r.amount),
    category: r.category,
    frequency: r.frequency,
    startDate: r.startDate,
    active: r.active,
    lastMaterializedDate: r.lastMaterializedDate,
    createdAt: r.createdAt.toISOString(),
  };
}

// GET /recurring
router.get("/recurring", async (req, res): Promise<void> => {
  const rules = await db
    .select()
    .from(recurringExpensesTable)
    .where(eq(recurringExpensesTable.userId, userId(req)))
    .orderBy(recurringExpensesTable.createdAt);
  res.json(rules.map(serialize));
});

// POST /recurring
router.post("/recurring", async (req, res): Promise<void> => {
  const uid = userId(req);
  const body = CreateRecurringExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [created] = await db
    .insert(recurringExpensesTable)
    .values({
      userId: uid,
      description: body.data.description,
      amount: body.data.amount.toString(),
      category: body.data.category,
      frequency: body.data.frequency,
      startDate: body.data.startDate,
      active: body.data.active ?? true,
    })
    .returning();

  // Backfill occurrences from startDate through today right away so the
  // ledger and counters update without waiting for the next read.
  try {
    await materializeDueRecurring(uid, toDateString(new Date()));
  } catch (err) {
    req.log.error({ err }, "materialization after create failed");
  }

  const [fresh] = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, created.id), eq(recurringExpensesTable.userId, uid)));

  res.status(201).json(serialize(fresh ?? created));
});

// PATCH /recurring/:id
router.patch("/recurring/:id", async (req, res): Promise<void> => {
  const uid = userId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateRecurringExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateRecurringExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, params.data.id), eq(recurringExpensesTable.userId, uid)));
  if (!existing) {
    res.status(404).json({ error: "Recurring expense not found" });
    return;
  }

  const updates: Partial<typeof recurringExpensesTable.$inferInsert> = {};
  if (body.data.description !== undefined) updates.description = body.data.description;
  if (body.data.amount !== undefined) updates.amount = body.data.amount.toString();
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.frequency !== undefined) updates.frequency = body.data.frequency;
  if (body.data.startDate !== undefined) updates.startDate = body.data.startDate;
  if (body.data.active !== undefined) updates.active = body.data.active;

  // Avoid surprise backfills: reactivating a paused rule, or re-anchoring an
  // active one, resumes from today instead of catching up the gap.
  const reactivated = body.data.active === true && !existing.active;
  const reanchored =
    body.data.startDate !== undefined || body.data.frequency !== undefined;
  if (reactivated || reanchored) {
    updates.lastMaterializedDate = addDays(toDateString(new Date()), -1);
  }

  const [updated] = await db
    .update(recurringExpensesTable)
    .set(updates)
    .where(and(eq(recurringExpensesTable.id, params.data.id), eq(recurringExpensesTable.userId, uid)))
    .returning();

  try {
    await materializeDueRecurring(uid, toDateString(new Date()));
  } catch (err) {
    req.log.error({ err }, "materialization after update failed");
  }

  const [fresh] = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, updated.id), eq(recurringExpensesTable.userId, uid)));

  res.json(serialize(fresh ?? updated));
});

// DELETE /recurring/:id
router.delete("/recurring/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteRecurringExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, params.data.id), eq(recurringExpensesTable.userId, userId(req))))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Recurring expense not found" });
    return;
  }

  // Already-logged expenses keep their history (recurring_id becomes NULL
  // via ON DELETE SET NULL).
  res.status(204).send();
});

export default router;
