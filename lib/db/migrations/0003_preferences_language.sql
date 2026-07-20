-- 0003_preferences_language.sql
--
-- Arabic support: adds the per-user language preference.
--   * preferences.language  text  NOT NULL DEFAULT 'en' — UI + AI coach
--     language: 'en' (default) or 'ar' (Arabic, RTL layouts)
--
-- The default backfills every existing row to English, so no data migration
-- is needed and pre-language clients keep working unchanged.
--
-- DEPLOYMENT ORDER (production): apply this file to the prod DB first, then
-- publish the new server build. New code refuses to boot until the column
-- exists (see api-server src/lib/schemaCheck.ts).
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS only; one transaction; no data is
-- modified, dropped, or reset.

BEGIN;

ALTER TABLE preferences ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Guard rail: only supported languages at the database layer too.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'preferences_language_supported'
      AND connamespace = current_schema()::regnamespace
  ) THEN
    ALTER TABLE preferences ADD CONSTRAINT preferences_language_supported
      CHECK (language IN ('en', 'ar'));
  END IF;
END
$do$;

COMMIT;
