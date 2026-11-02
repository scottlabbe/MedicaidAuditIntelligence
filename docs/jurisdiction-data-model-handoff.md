# Jurisdiction Data Model and Federal Report Backfill Handoff

Date: October 27, 2026  
Status: Proposed backend implementation handoff  
Primary audience: Backend and ingestion agents  

## Objective

Correct the report jurisdiction model so the application can answer two
different questions without conflating them:

1. Which jurisdictional authority published or commissioned the report?
2. Which Medicaid jurisdiction or jurisdictions does the report examine?

The intended public behavior is:

- a federal report appears on the Federal jurisdiction page;
- the same report also appears on a state page when that state is an explicit,
  substantive subject of the audit;
- a state report appears on its subject-state page;
- multi-state reports may appear on several state pages when the source
  explicitly includes those states;
- national reports are not automatically copied onto every state page;
- every report remains a single canonical report record and URL.

This is an additive data-model and ingestion change. Do not drop or reinterpret
the existing `reports.state` column during the first migration.

## Why This Change Is Required

`reports.state` is currently a required two-character string, but it has mixed
semantics across the corpus.

Examples from the public corpus:

- Report 159, *Medicaid Managed Care Behavioral Health Services Denials in
  Louisiana*, was published by HHS OIG and is coded `US`, despite Louisiana
  being the clear audit subject.
- Report 167, *Mississippi Did Not Report and Return All Medicaid Overpayments
  for the State's Medicaid Fraud Control Unit Cases*, was also published by HHS
  OIG but is coded `MS`.
- Report 46, *Wisconsin's Fee-for-Service Medicaid Payments for Applied
  Behavior Analysis*, was published by HHS OIG, is explicitly about Wisconsin,
  and is coded `US`.

The same field therefore sometimes represents source authority and sometimes
represents report subject. Page logic cannot resolve that inconsistency
reliably.

The current application also filters the states index through a hard-coded
50-states-plus-DC lookup. This silently removes `US` from the states page even
though federal reports are public and independently searchable.

The existing project documentation already records the underlying limitation:
the report model does not contain reviewed affected jurisdictions and must not
treat `reports.state` as affected-state coverage. See
`docs/topic-evidence-handoff.md`.

### Current public snapshot

The following numbers were observed from the public API on October 27, 2026 and
are context, not migration acceptance constants:

- 188 visible reports;
- 43 reports currently coded `US`;
- 36 state codes represented by the remaining visible reports;
- at least 20 of the 43 `US`-coded reports name one state directly in the
  report title;
- other `US`-coded reports are multi-state, selected-state, national, or need
  source review before assignment.

Recompute all counts against the target database during implementation.

## Required Semantic Definitions

### Source jurisdiction

The jurisdictional authority responsible for publishing or commissioning the
oversight report.

Examples:

- HHS OIG, CMS, and GAO reports: `US`;
- a state auditor report: that state's code;
- a private audit firm working under a state oversight engagement: the state
  authority responsible for the report, not the firm's corporate domicile.

The exact publisher name remains in `reports.audit_organization`. Source
jurisdiction is a separate normalized attribute.

### Subject jurisdiction

A Medicaid jurisdiction substantively examined by the report. A subject
assignment requires evidence in the report title, stated objective, audit
scope, source metadata, or source document.

A state is not a subject merely because it is mentioned in background text, an
illustration, a recommendation, or a list of all Medicaid programs.

### Scope type

Classify each report as one of:

- `single_jurisdiction`: one primary subject jurisdiction;
- `multi_jurisdiction`: two or more substantively included jurisdictions;
- `national`: nationwide policy, administration, or oversight without a
  bounded set of state subjects;
- `unknown`: not yet reviewed or insufficient evidence.

Do not materialize 50 or more subject rows for a national report. `national`
is a report-level scope classification, not shorthand for assigning every
state.

### Subject relationship

Use one of:

- `primary_subject`: the report is principally about this jurisdiction;
- `included_in_scope`: the jurisdiction is explicitly part of a multi-state
  audit population, sample, or analysis;
- `case_study`: the jurisdiction is substantively discussed as a bounded case
  study but is not part of the primary audit population.

Only `primary_subject` and `included_in_scope` should enter the main state-page
evidence register by default. `case_study` may be exposed later as a secondary
section or optional filter.

## Recommended Database Model

Use an additive migration with a canonical jurisdiction table, a normalized
source-jurisdiction field on reports, and an auditable many-to-many subject
assignment table.

### `jurisdictions`

Recommended columns:

| Column | Type | Requirements |
| --- | --- | --- |
| `code` | `VARCHAR(2)` | Primary key; uppercase canonical code |
| `name` | `VARCHAR(120)` | Required, unique display name |
| `slug` | `VARCHAR(140)` | Required, unique stable public slug |
| `kind` | `VARCHAR(20)` | `federal`, `state`, `district`, or `territory` |
| `is_medicaid_jurisdiction` | `BOOLEAN` | Required, default `TRUE` |
| `active` | `BOOLEAN` | Required, default `TRUE` |
| `created_at` | `TIMESTAMPTZ` | Required, default current timestamp |
| `updated_at` | `TIMESTAMPTZ` | Required, default current timestamp |

Seed at minimum:

- `US` / Federal / `federal`;
- the 50 states;
- `DC` / District of Columbia / `district`.

Prefer also seeding the five U.S. territories using their postal codes (`AS`,
`GU`, `MP`, `PR`, and `VI`) so the canonical model does not need another schema
change when territory reports are ingested. Seeding a jurisdiction does not
claim that the current corpus has evidence for it.

Do not reuse `shared/states.ts` as the only database integrity control. The
shared file can remain a frontend convenience during the transition, but
database foreign keys must enforce canonical jurisdiction codes.

### Additions to `reports`

Recommended columns:

| Column | Type | Requirements |
| --- | --- | --- |
| `source_jurisdiction_code` | `VARCHAR(2)` | Nullable during backfill; FK to `jurisdictions.code` |
| `jurisdiction_scope_type` | `VARCHAR(24)` | Required after cutover; initially default `unknown` |

Recommended checks:

```sql
CHECK (
  jurisdiction_scope_type IN (
    'single_jurisdiction',
    'multi_jurisdiction',
    'national',
    'unknown'
  )
)
```

`source_jurisdiction_code` is intentionally named for the source authority,
not the report subject. `audit_organization` continues to preserve the exact
publisher identity.

### `report_jurisdiction_assignments`

Recommended additive, revision-safe shape:

| Column | Type | Requirements |
| --- | --- | --- |
| `id` | `UUID` | Primary key |
| `report_id` | `INTEGER` | FK to `reports.id`, `ON DELETE RESTRICT` |
| `jurisdiction_code` | `VARCHAR(2)` | FK to `jurisdictions.code` |
| `relationship` | `VARCHAR(24)` | Required; approved values below |
| `evidence_source` | `VARCHAR(24)` | Required; approved values below |
| `evidence_snapshot` | `TEXT` | Required reviewed text supporting the assignment |
| `assignment_method` | `VARCHAR(24)` | `manual`, `ingestion`, or `backfill` |
| `review_status` | `VARCHAR(20)` | `provisional`, `reviewed`, or `rejected` |
| `source_assignment_uid` | `UUID` | Optional initially; unique when supplied by an upstream producer |
| `created_at` | `TIMESTAMPTZ` | Required, default current timestamp |
| `reviewed_at` | `TIMESTAMPTZ` | Required when status becomes `reviewed` |
| `retired_at` | `TIMESTAMPTZ` | Null for active assignments |
| `retirement_reason` | `TEXT` | Required when retired |
| `replaced_by_assignment_id` | `UUID` | Self-reference, nullable |

Approved `relationship` values:

```text
primary_subject
included_in_scope
case_study
```

Approved `evidence_source` values:

```text
report_title
audit_objective
audit_scope
source_metadata
source_document
```

Required indexes and constraints:

```sql
CREATE UNIQUE INDEX uq_report_jurisdiction_assignment_active
  ON report_jurisdiction_assignments(report_id, jurisdiction_code)
  WHERE retired_at IS NULL;

CREATE INDEX ix_report_jurisdiction_code_reviewed
  ON report_jurisdiction_assignments(jurisdiction_code, report_id)
  WHERE retired_at IS NULL AND review_status = 'reviewed';

CREATE UNIQUE INDEX uq_report_jurisdiction_source_assignment_uid
  ON report_jurisdiction_assignments(source_assignment_uid)
  WHERE source_assignment_uid IS NOT NULL;
```

Use check constraints for all controlled values and for lifecycle consistency,
including:

- `reviewed_at` must be present when `review_status = 'reviewed'`;
- `retirement_reason` must be present when `retired_at` is present;
- an active report/jurisdiction pair must be unique.

The assignment table should follow the same additive and retirement-oriented
principles already used by reviewed topic assignments. Do not hard-delete a
reviewed assignment merely because a later review changes it.

## Required Invariants

Enforce these in validation code even where a SQL constraint would be awkward:

1. Every public report must have a non-null canonical
   `source_jurisdiction_code` after cutover.
2. A `single_jurisdiction` report must have exactly one active reviewed
   `primary_subject` assignment.
3. A `multi_jurisdiction` report must have at least two active reviewed subject
   assignments across `primary_subject` and `included_in_scope`.
4. A `national` report must not receive automatic state assignments merely to
   represent nationwide applicability.
5. A report may have at most one active `primary_subject` assignment.
   A multi-jurisdiction report may use one primary subject plus additional
   `included_in_scope` assignments, or use only `included_in_scope` when the
   source does not establish a single lead jurisdiction.
6. Every assignment must contain a non-empty evidence snapshot from an
   approved evidence source.
7. Provisional assignments must not affect public state counts or state-page
   membership.
8. Hidden reports remain excluded from public counts and pages regardless of
   assignment status.
9. Public report lists must be distinct by `report_id`; a report with multiple
   assignment records must never appear twice in the same result set.
10. Federal source jurisdiction does not imply national scope, and national
    scope does not imply federal source jurisdiction.

## Existing Data Backfill

Backfill must be deterministic, reviewable, and resumable. Do not perform a
single opaque update based only on title keywords.

### Phase 1: Inventory and reconciliation

Produce an inspectable inventory containing at least:

- report ID and source UID;
- current `reports.state` value;
- exact audit organization;
- inferred source jurisdiction and the rule that inferred it;
- proposed scope type;
- proposed subject assignments;
- evidence text and evidence source for each assignment;
- review status;
- unresolved reason, if any.

Run and preserve queries equivalent to:

```sql
SELECT state, COUNT(*)
FROM reports
GROUP BY state
ORDER BY state;

SELECT audit_organization, state, COUNT(*)
FROM reports
GROUP BY audit_organization, state
ORDER BY audit_organization, state;
```

Also reconcile hidden and visible reports separately.

Agency names contain historical aliases. Do not infer federal status from one
exact spelling. Reuse or extend the canonicalization knowledge represented by
`server/agencyAliases.ts` and `scripts/normalize-agency-names.ts`, or introduce
a maintained source-authority mapping.

### Phase 2: Backfill source jurisdiction

High-confidence rules:

- HHS OIG, CMS, and GAO source authorities map to `US`, regardless of current
  `reports.state`;
- known state oversight authorities map to their state code;
- state-commissioned independent auditors map to the commissioning state when
  supported by source metadata;
- unresolved publishers remain null and block cutover rather than being
  guessed.

Record the mapping rule or source used. Do not use organization-name substring
matching as the permanent production authority model.

### Phase 3: Backfill subject jurisdictions

Use the following review order:

1. existing non-`US` code;
2. report title;
3. stated objective;
4. audit scope;
5. original source document when the structured metadata is insufficient.

Rules by cohort:

#### Federal-source reports currently carrying a state code

Treat the current code as a strong subject candidate, not unquestioned truth.
Verify it against title, objective, or scope. On verification:

- set `source_jurisdiction_code = 'US'`;
- add the state as `primary_subject` or `included_in_scope`;
- assign the correct scope type.

Report 167 is a representative acceptance record: Federal source, Mississippi
primary subject.

#### `US`-coded reports explicitly naming one state

Create backfill candidates automatically, but require review before public
publication. On verification:

- preserve Federal source jurisdiction;
- add the named state as `primary_subject`;
- set scope type to `single_jurisdiction` unless the source reveals a broader
  scope.

Reports 159 and 46 are representative acceptance records.

#### Multi-state or selected-state reports

Do not assign a state based only on incidental mentions. Read the audit scope
or source document and add only jurisdictions that were explicitly part of the
audit population, sample, or analysis.

Report 44, *Twelve Selected States Did Not Accurately Calculate the Federal
Share...*, is a representative manual-review record. It must not be published
to state pages until the twelve states are identified from authoritative
source evidence.

#### National reports

Set `jurisdiction_scope_type = 'national'`. Do not create 50-state assignments.
GAO or CMS policy and oversight reports often belong in this cohort.

#### Ambiguous or inconsistent records

Set scope type to `unknown`, leave assignments provisional or absent, and send
the record to review. Unknown is preferable to a false state attribution.

### Phase 4: Review and publish

The backfill tool should support:

- dry-run output;
- deterministic reruns;
- per-report validation failures;
- an explicit apply step;
- before/after counts;
- a retained review artifact keyed by report source UID;
- retirement and replacement of a reviewed assignment rather than destructive
  overwrite.

Do not make title-derived assignments public until review status is
`reviewed`.

## Future Ingestion Contract

Every newly processed report must provide or resolve the following fields:

```json
{
  "sourceJurisdictionCode": "US",
  "jurisdictionScopeType": "single_jurisdiction",
  "subjectJurisdictions": [
    {
      "code": "LA",
      "relationship": "primary_subject",
      "evidenceSource": "report_title",
      "evidenceSnapshot": "Medicaid Managed Care Behavioral Health Services Denials in Louisiana",
      "reviewStatus": "provisional"
    }
  ]
}
```

### Ingestion validation

Reject or quarantine a payload when:

- a jurisdiction code is not canonical;
- scope type and assignment cardinality conflict;
- evidence text is empty;
- the evidence source is not approved;
- two active assignments target the same report/jurisdiction pair;
- more than one primary subject is supplied;
- an upstream source attempts to mark an unreviewed inference as reviewed;
- a national report is expanded to every state without explicit state-level
  source evidence.

If the upstream report-processing system can only propose jurisdictions, store
those assignments as `provisional`. Publication into state pages remains a
reviewed-data action. A trusted reviewed bundle may send `reviewed` only when
its review provenance satisfies the website's publication contract.

### Idempotency and provenance

Use stable report source UIDs and stable assignment UIDs where the producer can
supply them. Reprocessing the same unchanged report must not create duplicate
active assignments.

If title, objective, scope, or source content changes after an assignment was
reviewed, require revalidation before replacing the active assignment. Preserve
the earlier reviewed assignment as retired history.

## Query and API Semantics

### Federal jurisdiction page

Membership rule:

```sql
reports.source_jurisdiction_code = 'US'
```

This page includes all federal-source reports, including those also assigned
to one or more states.

### State jurisdiction page

Membership rule:

```sql
EXISTS (
  SELECT 1
  FROM report_jurisdiction_assignments rja
  WHERE rja.report_id = reports.id
    AND rja.jurisdiction_code = :state_code
    AND rja.review_status = 'reviewed'
    AND rja.retired_at IS NULL
    AND rja.relationship IN ('primary_subject', 'included_in_scope')
)
```

Return each report once. Include source-jurisdiction metadata so the client can
label or group state-authority and federal-authority reports.

### Search filters

Do not continue overloading one `state` query parameter indefinitely. Define
separate semantics:

- `jurisdiction`: reviewed subject jurisdiction;
- `sourceJurisdiction`: publishing or commissioning authority jurisdiction.

Maintain a temporary compatibility translation for existing `state=XX` links.
Document whether legacy `state` maps to subject jurisdiction after cutover; it
must not remain ambiguous.

### Counts

Define and return separate metrics:

- `statesWithSubjectCoverage`: distinct state or district subject codes with at
  least one visible reviewed assignment;
- `jurisdictionsWithSubjectCoverage`: same count including territories when
  present, but excluding Federal as a subject-page coverage shortcut;
- `federalSourceReportCount`: visible reports with source jurisdiction `US`;
- optional `stateSourceReportCount`: visible reports whose source jurisdiction
  kind is state or district.

Do not label a count that includes `US` as "States Covered."

### Topic metrics

Any future "states represented" topic metric should count distinct reviewed
subject assignments, not `reports.state`. Federal-source presence should be
derived independently from `source_jurisdiction_code = 'US'`.

## Application Cutover Plan

1. Add tables, columns, constraints, and jurisdiction seed data.
2. Deploy code that can read the new model while falling back to legacy
   `reports.state` only where explicitly documented.
3. Run source-jurisdiction and subject-assignment inventory in dry-run mode.
4. Review and apply the existing-data backfill.
5. Reconcile public counts and representative reports.
6. Switch state pages, Federal page, search filters, topic metrics, dashboard
   counts, sitemap generation, and SSR loaders to the new semantics.
7. Enable dual-write ingestion for legacy and new fields.
8. After all producers and consumers have cut over, stop writing semantic data
   to `reports.state` and schedule its removal in a separate migration.

Do not combine initial schema creation, destructive legacy-column removal, and
public query cutover into one irreversible deployment.

## Required Tests

### Schema and validation

- rejects unknown jurisdiction codes;
- rejects invalid kinds, scope types, relationships, evidence sources, and
  review statuses;
- prevents duplicate active report/jurisdiction assignments;
- prevents two active primary subjects;
- enforces reviewed and retirement lifecycle fields;
- preserves assignment history when replacing reviewed data.

### Backfill

- dry run does not mutate data;
- rerunning an applied backfill is idempotent;
- federal agency aliases map to `US`;
- known state authorities map to their canonical state;
- ambiguous publishers remain unresolved;
- title matching creates provisional candidates only;
- multi-state records require explicit reviewed state lists;
- national reports do not receive blanket state assignments;
- hidden and visible populations reconcile separately.

### Query behavior

- report 159 appears on Federal and Louisiana pages exactly once per page;
- report 167 appears on Federal and Mississippi pages exactly once per page;
- report 46 appears on Federal and Wisconsin pages exactly once per page;
- a reviewed multi-state report appears on every explicitly assigned state page
  and once on Federal when federally sourced;
- a national federal report appears on Federal but not on every state page;
- provisional and retired assignments do not affect public pages or counts;
- a state page can contain both state-source and federal-source records;
- pagination totals count distinct reports;
- legacy `state=XX` links resolve to the documented compatibility behavior;
- dashboard state counts exclude Federal;
- sitemap and server-rendered routes agree with client API membership.

### Ingestion

- unchanged reprocessing does not duplicate assignments;
- changed jurisdiction evidence triggers review or a revision;
- malformed scope/assignment combinations are rejected;
- unreviewed model output cannot become public reviewed data automatically.

## Acceptance Criteria

The implementation is complete when:

1. Source jurisdiction and subject jurisdiction are separately represented in
   the database.
2. Every visible report has a canonical source jurisdiction or is explicitly
   quarantined from cutover as unresolved.
3. Every public state-page assignment is reviewed and supported by retained
   evidence.
4. Federal reports can appear on both Federal and applicable state pages
   without duplicating report records.
5. National federal reports do not automatically appear on all state pages.
6. Existing federal/state inconsistencies represented by reports 159, 167, and
   46 are corrected under one consistent rule.
7. Future ingestion writes or proposes both source and subject jurisdiction
   data with validation and provenance.
8. Public counts and labels distinguish states, subject jurisdictions, and
   federal-source reports accurately.
9. Existing report URLs remain stable.
10. `npm run check` and relevant backend tests pass; page and routing changes
    also pass `npm run build`.

## Explicit Non-Goals for the First Migration

- Do not infer that a report affects a state merely because it mentions the
  state.
- Do not assign national reports to every state.
- Do not merge or duplicate canonical report records.
- Do not expose reviewer identity, internal assignment UIDs, or evidence
  snapshots in public API responses unless a separate product decision calls
  for it.
- Do not remove `reports.state` in the additive migration.
- Do not solve agency-name normalization by changing exact publisher display
  names without a separate editorial/data migration.

## Backend Deliverables

The backend agent should return:

1. additive SQL and Drizzle schema migrations;
2. seeded canonical jurisdictions;
3. a dry-run/apply backfill utility with inspectable output;
4. a reviewed backfill artifact or queue for unresolved reports;
5. updated ingestion schemas and validation;
6. updated storage/API queries with compatibility behavior;
7. reconciliation results before and after cutover;
8. automated tests covering the invariants and representative reports above;
9. a short note identifying any records that remain `unknown` and why.

## Files Likely to Change

This list is directional; the backend agent should confirm actual ownership
before editing:

- `shared/schema.ts`
- a new migration under `migrations/`
- `server/storage.ts`
- `server/routes.ts`
- `server/seo.ts`
- `client/src/lib/types.ts`
- ingestion contracts and validation in the upstream report-processing system
- a new backfill script under `scripts/`
- backend and integrity tests
- eventually, state/jurisdiction page consumers and filters

The data migration and ingestion contract should be reviewed before the public
page is changed. Otherwise the frontend will only reproduce the current mixed
semantics through a different query.
