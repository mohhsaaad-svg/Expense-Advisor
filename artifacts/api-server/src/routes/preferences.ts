import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, preferencesTable } from "@workspace/db";
import { UpdatePreferencesBody } from "@workspace/api-zod";

const router = Router();

export async function getOrCreatePreferences() {
  const [existing] = await db.select().from(preferencesTable).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(preferencesTable)
    .values({ currency: "USD", alertThreshold: 80 })
    .returning();
  return created;
}

// GET /preferences
router.get("/preferences", async (req, res): Promise<void> => {
  const prefs = await getOrCreatePreferences();
  res.json({
    id: prefs.id,
    currency: prefs.currency,
    alertThreshold: prefs.alertThreshold,
    updatedAt: prefs.updatedAt.toISOString(),
  });
});

// PUT /preferences
router.put("/preferences", async (req, res): Promise<void> => {
  const body = UpdatePreferencesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await getOrCreatePreferences();

  const [updated] = await db
    .update(preferencesTable)
    .set({
      currency: body.data.currency,
      alertThreshold: body.data.alertThreshold,
      updatedAt: new Date(),
    })
    .where(eq(preferencesTable.id, existing.id))
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
