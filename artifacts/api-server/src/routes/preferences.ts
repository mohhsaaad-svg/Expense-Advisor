import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, preferencesTable } from "@workspace/db";
import { UpdatePreferencesBody } from "@workspace/api-zod";
import { userId } from "../lib/user";

const router = Router();

/**
 * Fetch the user's preferences row, creating defaults on first touch.
 * Race-safe via the per-user unique index (see getOrCreateBudget).
 */
export async function getOrCreatePreferences(uid: string) {
  const [existing] = await db
    .select()
    .from(preferencesTable)
    .where(eq(preferencesTable.userId, uid))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(preferencesTable)
    .values({ userId: uid, currency: "USD", alertThreshold: 80 })
    .onConflictDoNothing({ target: preferencesTable.userId })
    .returning();
  if (created) return created;

  const [winner] = await db
    .select()
    .from(preferencesTable)
    .where(eq(preferencesTable.userId, uid))
    .limit(1);
  if (!winner) throw new Error("preferences row vanished during get-or-create");
  return winner;
}

// GET /preferences
router.get("/preferences", async (req, res): Promise<void> => {
  const prefs = await getOrCreatePreferences(userId(req));
  res.json({
    id: prefs.id,
    currency: prefs.currency,
    alertThreshold: prefs.alertThreshold,
    updatedAt: prefs.updatedAt.toISOString(),
  });
});

// PUT /preferences
router.put("/preferences", async (req, res): Promise<void> => {
  const uid = userId(req);
  const body = UpdatePreferencesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await getOrCreatePreferences(uid);

  const [updated] = await db
    .update(preferencesTable)
    .set({
      currency: body.data.currency,
      alertThreshold: body.data.alertThreshold,
      updatedAt: new Date(),
    })
    .where(and(eq(preferencesTable.id, existing.id), eq(preferencesTable.userId, uid)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Preferences not found" });
    return;
  }

  res.json({
    id: updated.id,
    currency: updated.currency,
    alertThreshold: updated.alertThreshold,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
