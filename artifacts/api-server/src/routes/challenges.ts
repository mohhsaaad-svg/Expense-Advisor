import { Router } from "express";
import { and, asc, count, eq, gte, lte } from "drizzle-orm";
import { db, challengesTable, expensesTable, type ChallengeRow } from "@workspace/db";
import { CreateChallengeBody, DeleteChallengeParams } from "@workspace/api-zod";

const router = Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

async function countViolations(row: ChallengeRow, today: string): Promise<number> {
  const endDate = addDays(row.startDate, row.durationDays - 1);
  const windowEnd = today < endDate ? today : endDate;
  if (windowEnd < row.startDate) return 0;

  const conditions = [gte(expensesTable.date, row.startDate), lte(expensesTable.date, windowEnd)];
  if (row.category !== null) conditions.push(eq(expensesTable.category, row.category));
  const [result] = await db
    .select({ violations: count() })
    .from(expensesTable)
    .where(and(...conditions));
  return result?.violations ?? 0;
}

async function serializeChallenge(row: ChallengeRow, today: string) {
  const endDate = addDays(row.startDate, row.durationDays - 1);
  const violations = await countViolations(row, today);
  const daysElapsed = Math.max(0, Math.min(row.durationDays, diffDays(today, row.startDate) + 1));
  const status: "active" | "completed" | "failed" =
    violations > 0 ? "failed" : today > endDate ? "completed" : "active";
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? null,
    startDate: row.startDate,
    durationDays: row.durationDays,
    endDate,
    status,
    daysElapsed,
    violations,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listChallengesComputed(today: string) {
  const rows = await db
    .select()
    .from(challengesTable)
    .orderBy(asc(challengesTable.startDate), asc(challengesTable.id));
  return Promise.all(rows.map((row) => serializeChallenge(row, today)));
}

// GET /challenges?today=YYYY-MM-DD
router.get("/challenges", async (req, res): Promise<void> => {
  const q = req.query.today;
  const today = typeof q === "string" && ISO_DATE.test(q) ? q : todayIso();
  res.json(await listChallengesComputed(today));
});

// POST /challenges
router.post("/challenges", async (req, res): Promise<void> => {
  const body = CreateChallengeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.startDate && !ISO_DATE.test(body.data.startDate)) {
    res.status(400).json({ error: "startDate must be a YYYY-MM-DD date string" });
    return;
  }

  const [created] = await db
    .insert(challengesTable)
    .values({
      name: body.data.name,
      category: body.data.category ?? null,
      startDate: body.data.startDate ?? todayIso(),
      durationDays: body.data.durationDays,
    })
    .returning();
  res.status(201).json(await serializeChallenge(created, todayIso()));
});

// DELETE /challenges/:id
router.delete("/challenges/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteChallengeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid challenge id" });
    return;
  }
  const deleted = await db.delete(challengesTable).where(eq(challengesTable.id, params.data.id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }
  res.status(204).end();
});

export default router;
