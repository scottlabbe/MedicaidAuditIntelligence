-- Additive preparation for descriptive public report URLs.
-- Slugs remain nullable until the generated CSV has been manually reviewed and
-- a later migration applies the approved values and NOT NULL constraint.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS slug VARCHAR(120);

DO $$ BEGIN
  ALTER TABLE reports ADD CONSTRAINT ck_reports_slug_format
    CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_slug
  ON reports(slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS report_slug_aliases (
  alias_slug VARCHAR(120) PRIMARY KEY
    CHECK (alias_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  redirect_status INTEGER NOT NULL DEFAULT 301
    CHECK (redirect_status IN (301, 308)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_report_slug_alias_report_active
  ON report_slug_aliases(report_id)
  WHERE retired_at IS NULL;
