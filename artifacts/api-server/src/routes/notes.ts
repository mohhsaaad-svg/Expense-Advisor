import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";
import {
  CreateNoteBody,
  GetNoteParams,
  UpdateNoteBody,
  UpdateNoteParams,
  DeleteNoteParams,
} from "@workspace/api-zod";
import { userId } from "../lib/user";

const router = Router();

type NoteRow = typeof notesTable.$inferSelect;

function serialize(n: NoteRow) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

// GET /notes
router.get("/notes", async (req, res): Promise<void> => {
  const notes = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.userId, userId(req)))
    .orderBy(desc(notesTable.updatedAt));

  res.json(notes.map(serialize));
});

// POST /notes
router.post("/notes", async (req, res): Promise<void> => {
  const body = CreateNoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [created] = await db
    .insert(notesTable)
    .values({
      userId: userId(req),
      title: body.data.title,
      body: body.data.body ?? "",
    })
    .returning();

  res.status(201).json(serialize(created));
});

// GET /notes/:id — someone else's note is indistinguishable from a missing
// one (404), so ids can't be probed across accounts.
router.get("/notes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetNoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [note] = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, userId(req))));

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json(serialize(note));
});

// PATCH /notes/:id
router.patch("/notes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateNoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateNoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof notesTable.$inferInsert> = { updatedAt: new Date() };
  if (body.data.title !== undefined) updates.title = body.data.title;
  if (body.data.body !== undefined) updates.body = body.data.body;

  const [updated] = await db
    .update(notesTable)
    .set(updates)
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, userId(req))))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json(serialize(updated));
});

// DELETE /notes/:id
router.delete("/notes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteNoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(notesTable)
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, userId(req))))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.status(204).send();
});

export default router;
