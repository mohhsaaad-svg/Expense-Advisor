import { pool } from "@workspace/db";

/**
 * Tables that must carry a user_id ownership column for this build to run.
 * Keep in sync with lib/db/src/schema/ and the user-isolation migration.
 */
const OWNED_TABLES = [
  "expenses",
  "budget",
  "preferences",
  "recurring_expenses",
  "goals",
  "challenges",
  "conversations",
] as const;

/**
 * Fails fast at boot when the database predates the user-isolation schema.
 *
 * Without this, deploying the isolation-aware build against an un-migrated
 * database turns into a mystery 500 on every request. Refusing to start with
 * a pointer to the migration makes the rollout order (migrate, then deploy)
 * self-enforcing.
 */
export async function assertSchemaReady(): Promise<void> {
  const { rows } = await pool.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND column_name = 'user_id'
        AND table_name = ANY($1::text[])`,
    [[...OWNED_TABLES]],
  );
  const present = new Set(rows.map((r) => r.table_name));
  const missing = OWNED_TABLES.filter((t) => !present.has(t));

  if (missing.length > 0) {
    throw new Error(
      `Database schema is missing the user_id column on: ${missing.join(", ")}. ` +
        `Apply lib/db/migrations/0001_user_isolation.sql to this database before ` +
        `starting the server (the file header documents owner resolution and rollout order).`,
    );
  }
}
