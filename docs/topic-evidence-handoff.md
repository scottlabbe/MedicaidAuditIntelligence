# Topic evidence handoff

Status: current as of 2026-07-04

Audience: maintainers of `MedicaidReportAIMiner` and
`MedicaidAuditIntelligence`

## Purpose

This document records the shared database and bundle contract used to publish
additional classified reports into the public topic guides. The extraction
repository remains responsible for classification, human review, evidence
selection, and signed export. This repository validates, publishes, and
displays that material.

## Current shared database state

The following state was verified with read-only queries:

- Active taxonomy version: `2026-07-03-draft`
- Taxonomy schema: `topic-taxonomy/1`
- Definition SHA-256:
  `c777901704bf0cc20ad9979a3cc6450d7b05bfce3e41ffec5692ff0bc1c88efa`
- Active canonical topics: 7
- Active report-topic assignments: 61
- Topic evidence records: 162
- Published import runs: 1
- Published pilot bundle:
  `40ffa8c4-ecaa-4f80-abf1-917d5f5c3ebc`

The pilot was already published before the public website integration work
began. During the website work, no migration, taxonomy activation, bundle
publication, rollback, or direct database update was executed. Database access
was limited to read-only queries and integration tests.

## Database contract now used by the website

The current branch includes the additive topic-evidence schema and importer.
Some of this work was already uncommitted when the public website integration
began, but it must ship with the website because the public queries depend on
it.

Stable source identities are required on:

- `reports.source_uid`
- `objectives.source_uid`
- `findings.source_uid`
- `recommendations.source_uid`

The topic layer uses:

- `public_topic_taxonomy_revisions`
- `public_topics`
- `public_topic_definitions`
- `public_topic_slug_aliases`
- `report_topic_assignments`
- `report_topic_finding_evidence`
- `report_topic_recommendation_evidence`
- `report_topic_metadata_evidence`
- `topic_import_runs`
- `topic_import_report_items`

The migration file that must be committed with this branch is
`migrations/0001_topic_evidence_layer.sql`. Its prerequisite is the extraction
repository's `migrations/add_source_uids.py`.

## Contract for additional extraction bundles

Additional reports must use the existing
`topic-evidence-bundle/1` contract. The authoritative JSON Schema is:

`shared/contracts/topic-evidence-bundle-v1.schema.json`

Important producer requirements:

1. Use a new `bundleId` for a new payload. Republishing an identical signed
   bundle is idempotent.
2. Use bundle kind `reviewed-report-snapshot-delta`.
3. Reference the active taxonomy version and exact definition SHA-256 shown
   above. Do not activate a new taxonomy merely to add reports.
4. Include at most 100 reports per bundle. Larger batches must be split into
   separately signed bundles.
5. Every included report must have:
   - a stable `sourceIdentity.reportUid`;
   - a valid `review.reviewId` and `review.reviewerId`;
   - a current `sourceContentSha256`;
   - a current `classifierInputSha256`;
   - `review.state` equal to `complete`;
   - replacement mode `replace-all-reviewed-topics`;
   - validation status `valid`.
   `websiteIdentity.reportId` is optional, but when supplied it must match the
   report resolved from `sourceIdentity.reportUid`.
6. Topic assignments must use one of the seven current `topicKey` values:
   - `managed-care`
   - `eligibility-enrollment`
   - `capitation-payments`
   - `pharmacy-benefit-managers`
   - `data-quality-reporting`
   - `program-oversight`
   - `rebates`
7. Assignment evidence must point to current source identities and exact text
   hashes. Supported evidence types are:
   - finding;
   - recommendation;
   - report metadata.
   Report metadata evidence is limited to `report_title`,
   `audit_organization`, `audit_scope`, `overall_conclusion`, and
   `potential_objective_summary`.
8. Evidence ranks must be unique within an assignment. Rank represents
   evidence order within that report-topic assignment; it is not a global
   severity score.
9. `modelConfidence` may be null or between zero and one, but
   `confidenceCalibrated` must remain `false`.
10. The detached signature must use Ed25519 over the RFC 8785 canonicalized
    payload.

An incremental bundle may contain only newly processed reports. Publication
replaces assignments only for reports included in that bundle. It does not
retire assignments for reports omitted from the bundle.

An included report with an empty assignment array and the required replacement
metadata will retire that report's existing active topic assignments. Use this
only as an intentional reviewed decision.

`replacement.previousAssignmentSetSha256` is the optimistic-concurrency guard.
It must describe the assignment set the reviewer saw; publication rejects a
bundle when the website's current assignment set has changed.

## Website publication procedure

Preview the signed artifact first:

```bash
npm run topic:import -- preview \
  --bundle /path/to/topic-evidence.json \
  --public-key /path/to/topic-evidence-public.pem \
  --key-id "expected-key-id" \
  --actor "$USER"
```

Review the report count and added, changed, and removed assignment totals. If
the bundle references the current active taxonomy, do not run
`activate-taxonomy`.

Publish the exact artifact that was previewed:

```bash
npm run topic:import -- publish \
  --bundle /path/to/topic-evidence.json \
  --public-key /path/to/topic-evidence-public.pem \
  --key-id "expected-key-id"
```

Publication revalidates identities, ownership, hashes, taxonomy state, and the
expected previous assignment set. It publishes the bundle in one serializable
database transaction.

After publication, run:

```bash
npm run topic:public:test
npm run check
npm run build
```

Then inspect `/topics`, the affected guide pages, and an affected
`/reports?theme=<canonical-slug>` filter locally.

## Public website behavior the producer should know

- Topic membership is determined only by active assignments. The website does
  not infer membership with keyword or text searches.
- Hidden reports, retired assignments, retired topics, and inactive taxonomy
  definitions are excluded from every public topic query.
- A report may appear in multiple topic guides.
- Finding and recommendation sections display stored evidence snapshots
  verbatim and link to the source report.
- Report metadata evidence is retained and validated, but the current guide
  does not render it as a standalone public section.
- Each section initially displays three evidence records. Additional records
  expand in place.
- Evidence is ordered by assignment rank, then report publication date. The
  website does not claim that the first entries are the most severe.
- "States represented" counts report jurisdictions. It is not an affected-state
  model. Federal reports are reported separately from state counts.
- Model confidence, reviewer identity, hashes, UUIDs, bundle IDs, and import
  metadata are never exposed publicly.
- The `program-integrity` slug permanently redirects to `program-oversight`.

## Website-only guide content

Definitions and "Why auditors care" copy live in
`shared/topicGuides.ts`. They are editorial website content and are not part of
`topic-evidence-bundle/1`.

Processing more reports under the existing seven topics requires no guide-copy
change. Adding or renaming a canonical topic requires coordinated changes to:

1. the taxonomy definition and signed taxonomy artifact;
2. the active database taxonomy revision;
3. `shared/topicGuides.ts`;
4. redirect aliases when an existing public slug changes.

The public topic API adds guide metrics and editorial fields to the database
evidence:

- `definition`
- `whyAuditorsCare`
- `stateCount`
- `hasFederalReports`
- `agencyCount`
- `publicationYearStart`
- `publicationYearEnd`

These fields are website response fields and must not be added to the extraction
bundle.

## Known limitations and future coordination

- The current evidence model does not contain a reviewed severity field. If the
  product needs "most severe findings," add an explicit reviewed severity or
  featured-evidence contract rather than deriving severity from rank or text.
- The current report model does not contain affected jurisdictions. If the
  product needs "states affected," add reviewed structured jurisdiction data
  rather than treating `reports.state` as affected-state coverage.
- Topic-level recommendation themes are not generated. Recommendations remain
  direct source excerpts.
- A future bundle-schema version must be introduced deliberately and supported
  in both repositories before export. Do not add undeclared fields to the
  strict `topic-evidence-bundle/1` payload.
