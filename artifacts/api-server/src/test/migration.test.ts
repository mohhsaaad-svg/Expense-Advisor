import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { pool, type PoolClient } from "@workspace/db";

/**
 * Validates lib/db/migrations/0001_user_isolation.sql against every kind of
 * environment it can meet: fresh DBs, a single-owner legacy DB, explicit
 * owner override, ambiguous owners, and a bad override. Each scenario runs in
 * a throwaway schema (the migration uses unqualified names, so search_path
 * points it at scratch copies of the pre-isolation tables) — the real
 * database is never touched.
 */
const MIGRATION = fs.readFileSync(
  fileURLToPath(new URL("../../../../lib/db/migrations/0001_user_isolation.sql", import.meta.url)),
  "utf8",
);

/** Pre-isolation shape: only the columns the migration itself references. */
const PRE_ISOLATION_DDL = `
  CREATE TABLE users (id varchar PRIMARY KEY);
  CREATE TABLE expenses (id serial PRIMARY KEY, date date);
  CREATE TABLE budget (id serial PRIMARY KEY, updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE preferences (id serial PRIMARY KEY, updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE recurring_expenses (id serial PRIMARY KEY);
  CREATE TABLE goals (id serial PRIMARY KEY);
  CREATE TABLE challenges (id serial PRIMARY KEY);
  CREATE TABLE conversations (id serial PRIMARY KEY);
`;

type Client = PoolClient;

async function withScratchSchema(fn: (client: Client, schema: string) => Promise<void>) {
  const schema = `mig_test_${crypto.randomBytes(4).toString("hex")}`;
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    await client.query(PRE_ISOLATION_DDL);
    await fn(client, schema);
  } finally {
    // A failed migration leaves the connection in an aborted transaction.
    await client.query("ROLLBACK").catch(() => {});
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => {});
    // Destroy the connection instead of returning it: its search_path and
    // session GUCs were mutated and must never leak back into the pool.
    client.release(true);
  }
}

async function userIdColumns(client: Client, schema: string): Promise<Map<string, string>> {
  const res = await client.query(
    `SELECT table_name, is_nullable FROM information_schema.columns
      WHERE table_schema = $1 AND column_name = 'user_id'`,
    [schema],
  );
  return new Map(res.rows.map((r: { table_name: string; is_nullable: string }) => [r.table_name, r.is_nullable]));
}

describe("0001_user_isolation migration", () => {
  it("runs clean on a fresh, empty environment and is re-runnable", async () => {
    await withScratchSchema(async (client, schema) => {
      await client.query(MIGRATION);
      await client.query(MIGRATION); // idempotent

      const cols = await userIdColumns(client, schema);
      for (const table of [
        "expenses",
        "budget",
        "preferences",
        "recurring_expenses",
        "goals",
        "challenges",
        "conversations",
      ]) {
        expect(cols.get(table), `${table}.user_id`).toBe("NO"); // present + NOT NULL
      }
    });
  });

  it("backfills legacy rows to the sole existing user and dedupes settings", async () => {
    await withScratchSchema(async (client, schema) => {
      await client.query(`INSERT INTO users (id) VALUES ('only-user')`);
      await client.query(`INSERT INTO expenses (date) VALUES ('2026-01-01'), ('2026-01-02')`);
      await client.query(
        `INSERT INTO budget (updated_at) VALUES (now() - interval '1 day'), (now())`,
      );
      await client.query(`INSERT INTO preferences DEFAULT VALUES`);
      await client.query(`INSERT INTO goals DEFAULT VALUES`);

      await client.query(MIGRATION);

      const owned = await client.query(
        `SELECT (SELECT count(*) FROM expenses WHERE user_id = 'only-user')::int AS expenses,
                (SELECT count(*) FROM budget)::int AS budget_rows,
                (SELECT count(*) FROM budget WHERE user_id = 'only-user')::int AS budget_owned,
                (SELECT count(*) FROM goals WHERE user_id = 'only-user')::int AS goals`,
      );
      expect(owned.rows[0]).toEqual({ expenses: 2, budget_rows: 1, budget_owned: 1, goals: 1 });

      // FK exists in this schema and actually cascades.
      const fk = await client.query(
        `SELECT count(*)::int AS n FROM pg_constraint
          WHERE conname = 'expenses_user_id_users_id_fk' AND connamespace = $1::regnamespace`,
        [schema],
      );
      expect(fk.rows[0].n).toBe(1);
      await client.query(`DELETE FROM users WHERE id = 'only-user'`);
      const after = await client.query(`SELECT count(*)::int AS n FROM expenses`);
      expect(after.rows[0].n).toBe(0);
    });
  });

  it("honors an explicit ember.migration_owner override", async () => {
    await withScratchSchema(async (client) => {
      await client.query(`INSERT INTO users (id) VALUES ('u1'), ('u2')`);
      await client.query(`INSERT INTO expenses (date) VALUES ('2026-01-01')`);
      await client.query(`SET ember.migration_owner = 'u1'`);

      await client.query(MIGRATION);

      const res = await client.query(`SELECT count(*)::int AS n FROM expenses WHERE user_id = 'u1'`);
      expect(res.rows[0].n).toBe(1);
    });
  });

  it("fails fast (and rolls back completely) when the owner is ambiguous", async () => {
    await withScratchSchema(async (client, schema) => {
      await client.query(`INSERT INTO users (id) VALUES ('u1'), ('u2')`);
      await client.query(`INSERT INTO expenses (date) VALUES ('2026-01-01')`);

      await expect(client.query(MIGRATION)).rejects.toThrow(/ambiguous owner/i);
      await client.query("ROLLBACK").catch(() => {});

      // The transaction rolled back in full: no user_id columns were left behind.
      const cols = await userIdColumns(client, schema);
      expect(cols.size).toBe(0);
    });
  });

  it("fails fast when the override points at a user that does not exist", async () => {
    await withScratchSchema(async (client, schema) => {
      await client.query(`INSERT INTO users (id) VALUES ('real-user')`);
      await client.query(`INSERT INTO expenses (date) VALUES ('2026-01-01')`);
      await client.query(`SET ember.migration_owner = 'ghost'`);

      await expect(client.query(MIGRATION)).rejects.toThrow(/does not exist in users/i);
      await client.query("ROLLBACK").catch(() => {});

      const cols = await userIdColumns(client, schema);
      expect(cols.size).toBe(0);
    });
  });
});

const SALARY_MIGRATION = fs.readFileSync(
  fileURLToPath(new URL("../../../../lib/db/migrations/0002_salary_cycle.sql", import.meta.url)),
  "utf8",
);

describe("0002_salary_cycle migration", () => {
  it("adds nullable salary columns without touching existing rows, and is re-runnable", async () => {
    await withScratchSchema(async (client, schema) => {
      await client.query(`INSERT INTO users (id) VALUES ('only-user')`);
      await client.query(`INSERT INTO budget (updated_at) VALUES (now())`);
      await client.query(MIGRATION); // 0001 first, mirroring the rollout order

      await client.query(SALARY_MIGRATION);
      await client.query(SALARY_MIGRATION); // idempotent

      const cols = await client.query(
        `SELECT column_name, is_nullable FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = 'budget'
            AND column_name IN ('salary_amount', 'salary_day')`,
        [schema],
      );
      expect(new Map(cols.rows.map((r: { column_name: string; is_nullable: string }) => [r.column_name, r.is_nullable])))
        .toEqual(new Map([["salary_amount", "YES"], ["salary_day", "YES"]]));

      // Existing row survived with NULL salary fields (calendar fallback).
      const row = await client.query(
        `SELECT count(*)::int AS n FROM budget WHERE salary_amount IS NULL AND salary_day IS NULL`,
      );
      expect(row.rows[0].n).toBe(1);

      // Range check rejects impossible paydays.
      await expect(
        client.query(`UPDATE budget SET salary_day = 42`),
      ).rejects.toThrow(/budget_salary_day_range/);
    });
  });
});

const LANGUAGE_MIGRATION = fs.readFileSync(
  fileURLToPath(new URL("../../../../lib/db/migrations/0003_preferences_language.sql", import.meta.url)),
  "utf8",
);

describe("0003_preferences_language migration", () => {
  it("backfills legacy rows to 'en', enforces supported languages, and is re-runnable", async () => {
    await withScratchSchema(async (client) => {
      await client.query(`INSERT INTO users (id) VALUES ('only-user')`);
      // A legacy preferences row that predates the language column entirely.
      await client.query(`INSERT INTO preferences DEFAULT VALUES`);
      await client.query(MIGRATION); // 0001 first, mirroring the rollout order

      await client.query(LANGUAGE_MIGRATION);
      await client.query(LANGUAGE_MIGRATION); // idempotent

      // Legacy row resolved to English without any explicit backfill step.
      const row = await client.query(
        `SELECT count(*)::int AS n FROM preferences WHERE language = 'en'`,
      );
      expect(row.rows[0].n).toBe(1);

      // Updates to a supported language work; unsupported values are rejected.
      await client.query(`UPDATE preferences SET language = 'ar'`);
      const ar = await client.query(`SELECT count(*)::int AS n FROM preferences WHERE language = 'ar'`);
      expect(ar.rows[0].n).toBe(1);
      await expect(
        client.query(`UPDATE preferences SET language = 'fr'`),
      ).rejects.toThrow(/preferences_language_supported/);
    });
  });
});
