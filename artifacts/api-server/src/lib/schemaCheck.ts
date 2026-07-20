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

  // Salary-cycle columns (payday-to-payday budgeting).
  const salary = await pool.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'budget'
        AND column_name IN ('salary_amount', 'salary_day')`,
  );
  const salaryPresent = new Set(salary.rows.map((r) => r.column_name));
  const salaryMissing = ["salary_amount", "salary_day"].filter((c) => !salaryPresent.has(c));
  if (salaryMissing.length > 0) {
    throw new Error(
      `Database schema is missing budget column(s): ${salaryMissing.join(", ")}. ` +
        `Apply lib/db/migrations/0002_salary_cycle.sql to this database before ` +
        `starting the server.`,
    );
  }

  // Language preference column (Arabic/RTL support).
  const language = await pool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'preferences'
        AND column_name = 'language'`,
  );
  if (language.rows.length === 0) {
    throw new Error(
      `Database schema is missing the preferences.language column. ` +
        `Apply lib/db/migrations/0003_preferences_language.sql to this database ` +
        `before starting the server.`,
    );
  }
}
