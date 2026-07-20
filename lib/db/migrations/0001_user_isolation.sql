-- 0001_user_isolation.sql
--
-- Adds per-user ownership (user_id -> users.id, ON DELETE CASCADE) to all
-- domain tables, backfills pre-isolation rows to a resolved owner account,
-- then enforces NOT NULL + foreign keys + per-user indexes.
--
-- ENVIRONMENT-SAFE OWNER RESOLUTION (step 2 below):
--   * No legacy rows (fresh/staging DB, or an already-migrated DB): no owner
--     is needed; the migration completes without touching data.
--   * Legacy rows exist: the backfill owner is resolved as
--       1. the explicit override, when set in the SAME psql session:
--            psql "$DATABASE_URL" \
--              -c "SET ember.migration_owner = '<users.id>'" \
--              -f lib/db/migrations/0001_user_isolation.sql
--       2. else the sole row in users, when exactly one user exists;
--       3. else it FAILS FAST with instructions — it never guesses between
--          multiple accounts.
--     The resolved owner must exist in users (verified before any write).
--
-- DEPLOYMENT ORDER (production): apply this file to the prod DB first, then
-- publish the new server build immediately after. Old code's INSERTs fail
-- once NOT NULL lands; new code refuses to boot until the columns exist
-- (see api-server src/lib/schemaCheck.ts). Keep the window tight.
--
-- Safe to re-run: every step is idempotent (IF NOT EXISTS / IS NULL guards)
-- and the whole file is one transaction — any error rolls everything back.
-- No table is dropped, truncated, or reset.
--
-- History: dev was migrated 2026-07-20; its legacy rows were backfilled to
-- the sole real account (other dev users are @example.com test accounts).

BEGIN;

-- 1) Add ownership columns (nullable first so existing rows survive).
ALTER TABLE expenses           ADD COLUMN IF NOT EXISTS user_id varchar;
ALTER TABLE budget             ADD COLUMN IF NOT EXISTS user_id varchar;
ALTER TABLE preferences        ADD COLUMN IF NOT EXISTS user_id varchar;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS user_id varchar;
ALTER TABLE goals              ADD COLUMN IF NOT EXISTS user_id varchar;
ALTER TABLE challenges         ADD COLUMN IF NOT EXISTS user_id varchar;
ALTER TABLE conversations      ADD COLUMN IF NOT EXISTS user_id varchar;

-- 2) Resolve the backfill owner and adopt pre-isolation rows. Skipped
--    entirely when there is nothing to backfill.
DO $mig$
DECLARE
  orphan_count   bigint;
  user_count     bigint;
  resolved_owner varchar;
BEGIN
  SELECT (SELECT count(*) FROM expenses           WHERE user_id IS NULL)
       + (SELECT count(*) FROM budget             WHERE user_id IS NULL)
       + (SELECT count(*) FROM preferences        WHERE user_id IS NULL)
       + (SELECT count(*) FROM recurring_expenses WHERE user_id IS NULL)
       + (SELECT count(*) FROM goals              WHERE user_id IS NULL)
       + (SELECT count(*) FROM challenges         WHERE user_id IS NULL)
       + (SELECT count(*) FROM conversations      WHERE user_id IS NULL)
    INTO orphan_count;

  IF orphan_count = 0 THEN
    RAISE NOTICE 'user_isolation: no pre-isolation rows to backfill; skipping';
    RETURN;
  END IF;

  resolved_owner := NULLIF(current_setting('ember.migration_owner', true), '');

  IF resolved_owner IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = resolved_owner) THEN
      RAISE EXCEPTION 'user_isolation: ember.migration_owner=''%'' does not exist in users — set it to an existing users.id', resolved_owner;
    END IF;
  ELSE
    SELECT count(*) INTO user_count FROM users;
    IF user_count = 1 THEN
      SELECT id INTO resolved_owner FROM users;
    ELSIF user_count = 0 THEN
      RAISE EXCEPTION 'user_isolation: % pre-isolation rows exist but the users table is empty — sign the owner in once first, or SET ember.migration_owner to the intended users.id', orphan_count;
    ELSE
      RAISE EXCEPTION 'user_isolation: % pre-isolation rows and % users — ambiguous owner. Re-run with SET ember.migration_owner = ''<users.id>'' in the same session', orphan_count, user_count;
    END IF;
  END IF;

  RAISE NOTICE 'user_isolation: backfilling % rows to owner %', orphan_count, resolved_owner;

  -- Single-row settings tables may hold duplicates from the old global
  -- get-or-create race; keep the most recently updated row. Guarded so this
  -- can never delete rows that already belong to a user.
  IF NOT EXISTS (SELECT 1 FROM budget WHERE user_id IS NOT NULL) THEN
    DELETE FROM budget
      WHERE id NOT IN (SELECT id FROM budget ORDER BY updated_at DESC, id DESC LIMIT 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM preferences WHERE user_id IS NOT NULL) THEN
    DELETE FROM preferences
      WHERE id NOT IN (SELECT id FROM preferences ORDER BY updated_at DESC, id DESC LIMIT 1);
  END IF;

  UPDATE expenses           SET user_id = resolved_owner WHERE user_id IS NULL;
  UPDATE budget             SET user_id = resolved_owner WHERE user_id IS NULL;
  UPDATE preferences        SET user_id = resolved_owner WHERE user_id IS NULL;
  UPDATE recurring_expenses SET user_id = resolved_owner WHERE user_id IS NULL;
  UPDATE goals              SET user_id = resolved_owner WHERE user_id IS NULL;
  UPDATE challenges         SET user_id = resolved_owner WHERE user_id IS NULL;
  UPDATE conversations      SET user_id = resolved_owner WHERE user_id IS NULL;
END
$mig$;

-- 3) Enforce ownership from here on.
ALTER TABLE expenses           ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE budget             ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE preferences        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE goals              ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE challenges         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE conversations      ALTER COLUMN user_id SET NOT NULL;

-- 4) Foreign keys: deleting a user cascades to all of their data.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_user_id_users_id_fk' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_user_id_users_id_fk' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE budget ADD CONSTRAINT budget_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'preferences_user_id_users_id_fk' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE preferences ADD CONSTRAINT preferences_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_expenses_user_id_users_id_fk' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_user_id_users_id_fk' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE goals ADD CONSTRAINT goals_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'challenges_user_id_users_id_fk' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE challenges ADD CONSTRAINT challenges_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_user_id_users_id_fk' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END
$do$;

-- 5) Per-user uniqueness for single-row-per-user tables + query indexes.
CREATE UNIQUE INDEX IF NOT EXISTS budget_user_uq      ON budget (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS preferences_user_uq ON preferences (user_id);
CREATE INDEX IF NOT EXISTS expenses_user_date_idx     ON expenses (user_id, date);
CREATE INDEX IF NOT EXISTS recurring_user_idx         ON recurring_expenses (user_id);
CREATE INDEX IF NOT EXISTS goals_user_idx             ON goals (user_id);
CREATE INDEX IF NOT EXISTS challenges_user_idx        ON challenges (user_id);
CREATE INDEX IF NOT EXISTS conversations_user_idx     ON conversations (user_id);

COMMIT;
