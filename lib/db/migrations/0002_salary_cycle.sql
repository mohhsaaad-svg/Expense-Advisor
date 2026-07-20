-- 0002_salary_cycle.sql
--
-- Payday-to-payday budgeting: adds the salary anchor to the budget table.
--   * budget.salary_amount  numeric  NULL — net salary landing each payday
--   * budget.salary_day     integer  NULL — day of month the salary lands
--     (1–31; days 29–31 are clamped into short months by the application)
--
-- Both columns are nullable ON PURPOSE: NULL salary_day means the account
-- keeps calendar-month budgeting, so no backfill is needed and existing rows
-- are valid as-is.
--
-- DEPLOYMENT ORDER (production): apply this file to the prod DB first, then
-- publish the new server build. New code refuses to boot until the columns
-- exist (see api-server src/lib/schemaCheck.ts).
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS only; one transaction; no data is
-- modified, dropped, or reset.

BEGIN;

ALTER TABLE budget ADD COLUMN IF NOT EXISTS salary_amount numeric;
ALTER TABLE budget ADD COLUMN IF NOT EXISTS salary_day integer;

-- Guard rail: reject impossible paydays at the database layer too.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budget_salary_day_range'
      AND connamespace = current_schema()::regnamespace
  ) THEN
    ALTER TABLE budget ADD CONSTRAINT budget_salary_day_range
      CHECK (salary_day IS NULL OR (salary_day >= 1 AND salary_day <= 31));
  END IF;
END
$do$;

COMMIT;
