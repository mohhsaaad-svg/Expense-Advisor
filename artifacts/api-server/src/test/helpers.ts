import crypto from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";

export interface TestUser {
  id: string;
  email: string;
  sid: string;
  /** Ready-to-spread supertest header that authenticates as this user. */
  auth: { Authorization: string };
}

/**
 * Create a real user + session so requests authenticate exactly like the app
 * does in production: authMiddleware reads the `sess` JSON out of the sessions
 * table via the Bearer token and populates req.user. No session with an
 * `expires_at` is written, so the OIDC refresh path is never touched.
 *
 * `label` only makes ids readable in the DB during a run; a random suffix
 * keeps parallel test files from colliding.
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const id = `test-${label}-${crypto.randomUUID()}`;
  const email = `${id}@example.com`;
  await db.insert(usersTable).values({ id, email });

  const sid = crypto.randomBytes(24).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: { user: { id, email }, access_token: "test-token" } as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return { id, email, sid, auth: { Authorization: `Bearer ${sid}` } };
}

/**
 * Tear down test users. Deleting the user row cascades (ON DELETE CASCADE) to
 * every owned record across all tables — expenses, budget, preferences,
 * recurring rules, goals, challenges, and conversations (which cascade to
 * messages). Sessions are Replit's auth store with no FK to users, so they
 * are removed explicitly.
 */
export async function destroyTestUsers(...users: TestUser[]): Promise<void> {
  if (users.length === 0) return;
  const ids = users.map((u) => u.id);
  const sids = users.map((u) => u.sid);
  await db.delete(sessionsTable).where(inArray(sessionsTable.sid, sids));
  await db.delete(usersTable).where(inArray(usersTable.id, ids));
}
