import { Router } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, goalsTable, type GoalRow } from "@workspace/db";
import {
  CreateGoalBody,
  UpdateGoalBody,
  UpdateGoalParams,
  DeleteGoalParams,
  ContributeToGoalBody,
  ContributeToGoalParams,
} from "@workspace/api-zod";
import { userId } from "../lib/user";

const router = Router();

function serializeGoal(g: GoalRow) {
  return {
    id: g.id,
    name: g.name,
    targetAmount: Number(g.targetAmount),
    savedAmount: Number(g.savedAmount),
    deadline: g.deadline ?? null,
    createdAt: g.createdAt.toISOString(),
  };
}

export async function listGoalsSerialized(uid: string) {
  const rows = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.userId, uid))
    .orderBy(asc(goalsTable.createdAt), asc(goalsTable.id));
  return rows.map(serializeGoal);
}

// GET /goals
router.get("/goals", async (req, res): Promise<void> => {
  res.json(await listGoalsSerialized(userId(req)));
});

// POST /goals
router.post("/goals", async (req, res): Promise<void> => {
  const body = CreateGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(body.data.deadline)) {
    res.status(400).json({ error: "deadline must be a YYYY-MM-DD date string" });
    return;
  }

  const [created] = await db
    .insert(goalsTable)
    .values({
      userId: userId(req),
      name: body.data.name,
      targetAmount: String(body.data.targetAmount),
      deadline: body.data.deadline ?? null,
    })
    .returning();
  res.status(201).json(serializeGoal(created));
});

// PATCH /goals/:id
router.patch("/goals/:id", async (req, res): Promise<void> => {
  const uid = userId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateGoalParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid goal id" });
    return;
  }
  const body = UpdateGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(body.data.deadline)) {
    res.status(400).json({ error: "deadline must be a YYYY-MM-DD date string" });
    return;
  }

  const [existing] = await db
    .select()
    .from(goalsTable)
    .where(and(eq(goalsTable.id, params.data.id), eq(goalsTable.userId, uid)));
  if (!existing) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  const set: Partial<{ name: string; targetAmount: string; deadline: string | null }> = {};
  if (body.data.name !== undefined) set.name = body.data.name;
  if (body.data.targetAmount !== undefined) set.targetAmount = String(body.data.targetAmount);
  if (body.data.deadline !== undefined) set.deadline = body.data.deadline;

  if (Object.keys(set).length === 0) {
    res.json(serializeGoal(existing));
    return;
  }

  const [updated] = await db
    .update(goalsTable)
    .set(set)
    .where(and(eq(goalsTable.id, params.data.id), eq(goalsTable.userId, uid)))
    .returning();
  res.json(serializeGoal(updated));
});

// DELETE /goals/:id
router.delete("/goals/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteGoalParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid goal id" });
    return;
  }
  const deleted = await db
    .delete(goalsTable)
    .where(and(eq(goalsTable.id, params.data.id), eq(goalsTable.userId, userId(req))))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.status(204).end();
});

// POST /goals/:id/contribute
router.post("/goals/:id/contribute", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ContributeToGoalParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid goal id" });
    return;
  }
  const body = ContributeToGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.amount === 0) {
    res.status(400).json({ error: "Contribution amount cannot be zero" });
    return;
  }

  // Atomic in SQL: a read-modify-write here would lose concurrent contributions
  const [updated] = await db
    .update(goalsTable)
    .set({
      savedAmount: sql`GREATEST(0, ${goalsTable.savedAmount} + ${body.data.amount.toFixed(2)}::numeric)`,
    })
    .where(and(eq(goalsTable.id, params.data.id), eq(goalsTable.userId, userId(req))))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json(serializeGoal(updated));
});

export default router;
