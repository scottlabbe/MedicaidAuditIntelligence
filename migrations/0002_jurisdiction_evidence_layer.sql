-- Additive source/subject jurisdiction model.
-- This migration is idempotent because the ingestion application may apply the
-- same contract before the public application is deployed.

CREATE TABLE IF NOT EXISTS jurisdictions (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  kind VARCHAR(20) NOT NULL
    CHECK (kind IN ('federal', 'state', 'district', 'territory')),
  is_medicaid_jurisdiction BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO jurisdictions (code, name, slug, kind) VALUES
  ('US', 'Federal', 'federal', 'federal'),
  ('AL', 'Alabama', 'alabama', 'state'), ('AK', 'Alaska', 'alaska', 'state'),
  ('AZ', 'Arizona', 'arizona', 'state'), ('AR', 'Arkansas', 'arkansas', 'state'),
  ('CA', 'California', 'california', 'state'), ('CO', 'Colorado', 'colorado', 'state'),
  ('CT', 'Connecticut', 'connecticut', 'state'), ('DE', 'Delaware', 'delaware', 'state'),
  ('FL', 'Florida', 'florida', 'state'), ('GA', 'Georgia', 'georgia', 'state'),
  ('HI', 'Hawaii', 'hawaii', 'state'), ('ID', 'Idaho', 'idaho', 'state'),
  ('IL', 'Illinois', 'illinois', 'state'), ('IN', 'Indiana', 'indiana', 'state'),
  ('IA', 'Iowa', 'iowa', 'state'), ('KS', 'Kansas', 'kansas', 'state'),
  ('KY', 'Kentucky', 'kentucky', 'state'), ('LA', 'Louisiana', 'louisiana', 'state'),
  ('ME', 'Maine', 'maine', 'state'), ('MD', 'Maryland', 'maryland', 'state'),
  ('MA', 'Massachusetts', 'massachusetts', 'state'), ('MI', 'Michigan', 'michigan', 'state'),
  ('MN', 'Minnesota', 'minnesota', 'state'), ('MS', 'Mississippi', 'mississippi', 'state'),
  ('MO', 'Missouri', 'missouri', 'state'), ('MT', 'Montana', 'montana', 'state'),
  ('NE', 'Nebraska', 'nebraska', 'state'), ('NV', 'Nevada', 'nevada', 'state'),
  ('NH', 'New Hampshire', 'new-hampshire', 'state'), ('NJ', 'New Jersey', 'new-jersey', 'state'),
  ('NM', 'New Mexico', 'new-mexico', 'state'), ('NY', 'New York', 'new-york', 'state'),
  ('NC', 'North Carolina', 'north-carolina', 'state'), ('ND', 'North Dakota', 'north-dakota', 'state'),
  ('OH', 'Ohio', 'ohio', 'state'), ('OK', 'Oklahoma', 'oklahoma', 'state'),
  ('OR', 'Oregon', 'oregon', 'state'), ('PA', 'Pennsylvania', 'pennsylvania', 'state'),
  ('RI', 'Rhode Island', 'rhode-island', 'state'), ('SC', 'South Carolina', 'south-carolina', 'state'),
  ('SD', 'South Dakota', 'south-dakota', 'state'), ('TN', 'Tennessee', 'tennessee', 'state'),
  ('TX', 'Texas', 'texas', 'state'), ('UT', 'Utah', 'utah', 'state'),
  ('VT', 'Vermont', 'vermont', 'state'), ('VA', 'Virginia', 'virginia', 'state'),
  ('WA', 'Washington', 'washington', 'state'), ('WV', 'West Virginia', 'west-virginia', 'state'),
  ('WI', 'Wisconsin', 'wisconsin', 'state'), ('WY', 'Wyoming', 'wyoming', 'state'),
  ('DC', 'District of Columbia', 'district-of-columbia', 'district'),
  ('AS', 'American Samoa', 'american-samoa', 'territory'),
  ('GU', 'Guam', 'guam', 'territory'),
  ('MP', 'Northern Mariana Islands', 'northern-mariana-islands', 'territory'),
  ('PR', 'Puerto Rico', 'puerto-rico', 'territory'),
  ('VI', 'U.S. Virgin Islands', 'us-virgin-islands', 'territory')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS jurisdiction_contract_version VARCHAR(40);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_jurisdiction_code VARCHAR(2);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_jurisdiction_method VARCHAR(40);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_jurisdiction_evidence TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_jurisdiction_review_status VARCHAR(20) NOT NULL DEFAULT 'unresolved';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_jurisdiction_reviewed_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_jurisdiction_reviewed_by VARCHAR(120);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS jurisdiction_scope_type VARCHAR(24) NOT NULL DEFAULT 'unknown';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS jurisdiction_review_status VARCHAR(24) NOT NULL DEFAULT 'unresolved';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS jurisdiction_revalidation_payload JSONB;

DO $$ BEGIN
  ALTER TABLE reports ADD CONSTRAINT fk_reports_source_jurisdiction
    FOREIGN KEY (source_jurisdiction_code) REFERENCES jurisdictions(code) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reports ADD CONSTRAINT ck_reports_jurisdiction_scope_type
    CHECK (jurisdiction_scope_type IN ('single_jurisdiction', 'multi_jurisdiction', 'national', 'unknown'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reports ADD CONSTRAINT ck_reports_source_jurisdiction_review_status
    CHECK (source_jurisdiction_review_status IN ('unresolved', 'provisional', 'reviewed', 'needs_revalidation'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reports ADD CONSTRAINT ck_reports_jurisdiction_review_status
    CHECK (jurisdiction_review_status IN ('unresolved', 'provisional', 'reviewed', 'needs_revalidation'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS report_jurisdiction_assignments (
  id UUID PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  jurisdiction_code VARCHAR(2) NOT NULL REFERENCES jurisdictions(code) ON DELETE RESTRICT,
  relationship VARCHAR(24) NOT NULL
    CHECK (relationship IN ('primary_subject', 'included_in_scope', 'case_study')),
  evidence_source VARCHAR(24) NOT NULL
    CHECK (evidence_source IN ('report_title', 'audit_objective', 'audit_scope', 'source_metadata', 'source_document')),
  evidence_snapshot TEXT NOT NULL CHECK (btrim(evidence_snapshot) <> ''),
  evidence_sha256 VARCHAR(64) NOT NULL,
  assignment_method VARCHAR(24) NOT NULL CHECK (assignment_method IN ('manual', 'ingestion', 'backfill')),
  review_status VARCHAR(20) NOT NULL DEFAULT 'provisional'
    CHECK (review_status IN ('provisional', 'reviewed', 'rejected')),
  source_assignment_uid UUID,
  source_content_sha256 VARCHAR(64),
  rule_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(120),
  retired_at TIMESTAMPTZ,
  retirement_reason TEXT,
  replaced_by_assignment_id UUID REFERENCES report_jurisdiction_assignments(id) ON DELETE RESTRICT,
  CONSTRAINT ck_report_jurisdiction_assignments_review_lifecycle CHECK (
    (review_status = 'reviewed' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    OR (review_status <> 'reviewed' AND reviewed_at IS NULL)
  ),
  CONSTRAINT ck_report_jurisdiction_assignments_retirement_reason CHECK (
    retired_at IS NULL OR btrim(retirement_reason) <> ''
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_jurisdiction_assignment_active
  ON report_jurisdiction_assignments(report_id, jurisdiction_code)
  WHERE retired_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_one_active_primary_subject
  ON report_jurisdiction_assignments(report_id)
  WHERE retired_at IS NULL AND relationship = 'primary_subject' AND review_status <> 'rejected';
CREATE INDEX IF NOT EXISTS ix_report_jurisdiction_code_reviewed
  ON report_jurisdiction_assignments(jurisdiction_code, report_id)
  WHERE retired_at IS NULL AND review_status = 'reviewed';
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_jurisdiction_source_assignment_uid
  ON report_jurisdiction_assignments(source_assignment_uid)
  WHERE source_assignment_uid IS NOT NULL;

CREATE OR REPLACE VIEW published_report_jurisdiction_assignments AS
SELECT assignment.*
FROM report_jurisdiction_assignments assignment
JOIN reports ON reports.id = assignment.report_id
WHERE assignment.review_status = 'reviewed'
  AND assignment.retired_at IS NULL
  AND assignment.relationship IN ('primary_subject', 'included_in_scope')
  AND reports.jurisdiction_contract_version = 'jurisdiction-v1'
  AND reports.source_jurisdiction_code IS NOT NULL
  AND reports.source_jurisdiction_review_status = 'reviewed'
  AND reports.jurisdiction_review_status = 'reviewed'
  AND reports.jurisdiction_scope_type <> 'unknown'
  AND COALESCE(reports.hidden, FALSE) = FALSE;
