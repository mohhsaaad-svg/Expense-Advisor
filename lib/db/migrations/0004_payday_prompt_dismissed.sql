-- 0004_payday_prompt_dismissed.sql
--
-- Cross-device payday-prompt dismissal: adds the dismissal flag to the
-- preferences table.
--   * preferences.payday_prompt_dismissed  boolean  NOT NULL DEFAULT false
--
-- Default false means every existing account keeps seeing the prompt until
-- it dismisses it once — no backfill needed.
--
-- DEPLOYMENT ORDER (production): apply this file to the prod DB first, then
-- publish the new server build. New code refuses to boot until the column
-- exists (see api-server src/lib/schemaCheck.ts).
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS only; one transaction; no data is
-- modified, dropped, or reset.

BEGIN;

ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS payday_prompt_dismissed boolean NOT NULL DEFAULT false;

COMMIT;
