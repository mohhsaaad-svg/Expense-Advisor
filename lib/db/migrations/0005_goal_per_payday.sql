-- 0005_goal_per_payday.sql
--
-- Per-payday goal reservations: lets any goal (deadline or open-ended)
-- reserve a fixed amount from safe-to-spend each pay cycle.
--   * goals.per_payday_amount  numeric(12,3)  NULL
--
-- Nullable with no default: existing goals reserve nothing extra until the
-- user opts in — no backfill needed.
--
-- DEPLOYMENT ORDER (production): apply this file to the prod DB first, then
-- publish the new server build. New code refuses to boot until the column
-- exists (see api-server src/lib/schemaCheck.ts).
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS only; one transaction; no data is
-- modified, dropped, or reset.

BEGIN;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS per_payday_amount numeric(12,3);

COMMIT;
