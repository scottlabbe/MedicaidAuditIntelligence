-- Additive migration for reviewed public topic assignments.
-- Prerequisite: run MedicaidReportAIMiner/migrations/add_source_uids.py first.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'reports'
      AND column_name = 'source_uid'
  ) THEN
    RAISE EXCEPTION 'reports.source_uid is required; run add_source_uids.py first';
  END IF;
END
$$;

CREATE TABLE public_topic_taxonomy_revisions (
  id UUID PRIMARY KEY,
  version VARCHAR(80) NOT NULL UNIQUE,
  schema_version VARCHAR(80) NOT NULL,
  definition_sha256 VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_public_topic_taxonomy_active
  ON public_topic_taxonomy_revisions(status)
  WHERE status = 'active';

CREATE TABLE public_topics (
  id UUID PRIMARY KEY,
  topic_key VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at TIMESTAMPTZ
);

CREATE TABLE public_topic_definitions (
  id UUID PRIMARY KEY,
  taxonomy_revision_id UUID NOT NULL
    REFERENCES public_topic_taxonomy_revisions(id) ON DELETE RESTRICT,
  topic_id UUID NOT NULL REFERENCES public_topics(id) ON DELETE RESTRICT,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  short_description TEXT NOT NULL,
  scope TEXT NOT NULL,
  sort_order INTEGER NOT NULL CHECK (sort_order > 0),
  CONSTRAINT uq_public_topic_definition_revision_topic
    UNIQUE (taxonomy_revision_id, topic_id),
  CONSTRAINT uq_public_topic_definition_revision_slug
    UNIQUE (taxonomy_revision_id, slug)
);

CREATE TABLE public_topic_slug_aliases (
  alias_slug VARCHAR(120) PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public_topics(id) ON DELETE RESTRICT,
  redirect_status INTEGER NOT NULL DEFAULT 301
    CHECK (redirect_status IN (301, 308)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at TIMESTAMPTZ
);

CREATE TABLE topic_import_runs (
  id UUID PRIMARY KEY,
  bundle_id UUID NOT NULL UNIQUE,
  payload_sha256 VARCHAR(64) NOT NULL UNIQUE,
  schema_version VARCHAR(80) NOT NULL,
  taxonomy_revision_id UUID NOT NULL
    REFERENCES public_topic_taxonomy_revisions(id) ON DELETE RESTRICT,
  signature_key_id VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL
    CHECK (status IN (
      'previewed', 'publishing', 'published', 'rejected', 'rolled_back'
    )),
  actor VARCHAR(120) NOT NULL,
  validation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_details TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

CREATE INDEX ix_topic_import_runs_status_received
  ON topic_import_runs(status, received_at);

CREATE TABLE topic_import_report_items (
  id UUID PRIMARY KEY,
  import_run_id UUID NOT NULL REFERENCES topic_import_runs(id) ON DELETE CASCADE,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  report_source_uid UUID NOT NULL,
  source_content_sha256 VARCHAR(64) NOT NULL,
  classifier_input_sha256 VARCHAR(64) NOT NULL,
  replacement_mode VARCHAR(60) NOT NULL
    CHECK (replacement_mode = 'replace-all-reviewed-topics'),
  before_assignment_set_sha256 VARCHAR(64),
  after_assignment_set_sha256 VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('valid', 'invalid', 'published', 'rolled_back')),
  diff JSONB NOT NULL,
  CONSTRAINT uq_topic_import_report_item UNIQUE (import_run_id, report_id)
);

CREATE TABLE report_topic_assignments (
  id UUID PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  topic_id UUID NOT NULL REFERENCES public_topics(id) ON DELETE RESTRICT,
  import_run_id UUID NOT NULL REFERENCES topic_import_runs(id) ON DELETE RESTRICT,
  source_assignment_uid UUID NOT NULL UNIQUE,
  source_review_uid UUID NOT NULL,
  source_report_digest VARCHAR(64) NOT NULL,
  rationale TEXT NOT NULL,
  model_confidence DOUBLE PRECISION
    CHECK (
      model_confidence IS NULL
      OR (model_confidence >= 0 AND model_confidence <= 1)
    ),
  confidence_calibrated BOOLEAN NOT NULL DEFAULT FALSE
    CHECK (confidence_calibrated = FALSE),
  published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at TIMESTAMPTZ,
  retirement_reason TEXT,
  replaced_by_assignment_id UUID
    REFERENCES report_topic_assignments(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_report_topic_assignment_active
  ON report_topic_assignments(report_id, topic_id)
  WHERE retired_at IS NULL;

CREATE INDEX ix_report_topic_assignment_topic_active
  ON report_topic_assignments(topic_id, report_id)
  WHERE retired_at IS NULL;

CREATE TABLE report_topic_finding_evidence (
  assignment_id UUID NOT NULL
    REFERENCES report_topic_assignments(id) ON DELETE CASCADE,
  finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE RESTRICT,
  finding_source_uid UUID NOT NULL,
  text_sha256 VARCHAR(64) NOT NULL,
  snapshot TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  PRIMARY KEY (assignment_id, finding_id)
);

CREATE TABLE report_topic_recommendation_evidence (
  assignment_id UUID NOT NULL
    REFERENCES report_topic_assignments(id) ON DELETE CASCADE,
  recommendation_id INTEGER NOT NULL
    REFERENCES recommendations(id) ON DELETE RESTRICT,
  recommendation_source_uid UUID NOT NULL,
  text_sha256 VARCHAR(64) NOT NULL,
  snapshot TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  PRIMARY KEY (assignment_id, recommendation_id)
);

CREATE TABLE report_topic_metadata_evidence (
  assignment_id UUID NOT NULL
    REFERENCES report_topic_assignments(id) ON DELETE CASCADE,
  field_name VARCHAR(80) NOT NULL
    CHECK (field_name IN (
      'report_title',
      'audit_organization',
      'audit_scope',
      'overall_conclusion',
      'potential_objective_summary'
    )),
  value_sha256 VARCHAR(64) NOT NULL,
  snapshot TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  PRIMARY KEY (assignment_id, field_name)
);

-- Draft taxonomy seed. Activation remains an explicit publication decision.
INSERT INTO public_topic_taxonomy_revisions (
  id, version, schema_version, definition_sha256, status
) VALUES (
  '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
  '2026-07-03-draft',
  'topic-taxonomy/1',
  'c777901704bf0cc20ad9979a3cc6450d7b05bfce3e41ffec5692ff0bc1c88efa',
  'draft'
);

INSERT INTO public_topics (id, topic_key) VALUES
  ('d1678a00-d74c-47ac-ab42-cc9eb80cf64b', 'managed-care'),
  ('167c496b-ed65-44d0-8e4b-38fb50c02de6', 'eligibility-enrollment'),
  ('3e1f3dc7-6063-49ee-bca2-0b37346ca957', 'capitation-payments'),
  ('dc6ff077-875f-455e-a282-e05102bffd55', 'pharmacy-benefit-managers'),
  ('5a9adad0-0de4-48de-8724-d20f5fb4d8ca', 'data-quality-reporting'),
  ('6819a51d-31da-43be-944e-fb5b30902cb9', 'program-oversight'),
  ('cff34bf7-1f1b-42af-bec2-dd78e9b8a469', 'rebates');

INSERT INTO public_topic_definitions (
  id,
  taxonomy_revision_id,
  topic_id,
  slug,
  name,
  short_description,
  scope,
  sort_order
) VALUES
  (
    '67b2dcfb-dcb8-4645-b5ee-5fc306b9d559',
    '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
    'd1678a00-d74c-47ac-ab42-cc9eb80cf64b',
    'managed-care',
    'Managed Care',
    'Reviewed audit evidence involving Medicaid managed care.',
    'MCO oversight, contracts, network adequacy, encounter data, medical loss ratio reporting, and quality monitoring.',
    1
  ),
  (
    '6bb5c7d8-ab09-42c2-9a1c-0bb645232faf',
    '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
    '167c496b-ed65-44d0-8e4b-38fb50c02de6',
    'eligibility-enrollment',
    'Eligibility and Enrollment',
    'Reviewed evidence involving Medicaid eligibility and enrollment.',
    'Eligibility determinations, redeterminations, residency, concurrent enrollment, terminations, and ineligible beneficiaries.',
    2
  ),
  (
    'd0d23ff5-b39e-4409-9fb4-0b79c529fa39',
    '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
    '3e1f3dc7-6063-49ee-bca2-0b37346ca957',
    'capitation-payments',
    'Capitation Payments',
    'Reviewed evidence involving Medicaid capitation payments.',
    'Rate setting, premiums, duplicate or incorrect capitation payments, reconciliation, and recovery.',
    3
  ),
  (
    '4476343f-ad63-4085-85bc-0941bf307026',
    '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
    'dc6ff077-875f-455e-a282-e05102bffd55',
    'pharmacy-benefit-managers',
    'Pharmacy and PBMs',
    'Reviewed evidence involving pharmacy benefits and PBM oversight.',
    'PBM contracting, spread or effective-rate pricing, pharmacy claims, transparency, and vendor oversight.',
    4
  ),
  (
    'c1cadc4f-4cfe-4650-8e5d-93482212f6c0',
    '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
    '5a9adad0-0de4-48de-8724-d20f5fb4d8ca',
    'data-quality-reporting',
    'Data Quality and Reporting',
    'Reviewed evidence involving Medicaid data quality and reporting.',
    'T-MSIS, encounters, financial reports, incomplete or inaccurate submissions, coding, and reconciliation.',
    5
  ),
  (
    '26bbf38d-ee63-4fc8-a263-435e4fc394a7',
    '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
    '6819a51d-31da-43be-944e-fb5b30902cb9',
    'program-oversight',
    'Program Oversight',
    'Reviewed evidence involving Medicaid governance and oversight.',
    'Governance, internal controls, contractor monitoring, audit follow-up, corrective actions, and enforcement.',
    6
  ),
  (
    '37105748-08cc-4132-95f2-a0b343d9cc38',
    '0aa32c39-a61e-4b81-b8eb-b9cd7f7b5728',
    'cff34bf7-1f1b-42af-bec2-dd78e9b8a469',
    'rebates',
    'Rebates',
    'Reviewed evidence involving Medicaid drug rebates.',
    'Federal and supplemental drug rebates, invoicing, collection, reconciliation, and manufacturer disputes.',
    7
  );

INSERT INTO public_topic_slug_aliases (alias_slug, topic_id, redirect_status)
VALUES (
  'program-integrity',
  '6819a51d-31da-43be-944e-fb5b30902cb9',
  301
);
