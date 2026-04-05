# Report Ingestion Implementation Plan

Date: March 21, 2026
Status: Proposed
Goal: Explain exactly what needs to change in the current codebase to produce markdown reports that can be ingested into the Medicaid Intelligence website and linked to report detail pages.

## Executive Summary

The smallest reliable implementation is:

1. keep `report.md` as the primary output
2. standardize citations to report-ID tokens such as `[Report 53]` and `[Reports 53, 54]`
3. add a deterministic post-processing step in this project that normalizes the report into that syntax
4. update runtime validation to validate those report-ID citations instead of inferring citations from italicized titles
5. let the Medicaid Intelligence website ingestion process parse those report IDs and convert them into internal links

This requires only modest changes to the current code.

The key idea is:

- the writer still writes a normal report
- the runtime makes the report publication-safe
- the website project makes the report linkable

## What Stays The Same

The following parts of the current system stay mostly unchanged:

- planner flow
- SQL retrieval flow
- analyst flow
- `report.md` as the main output artifact
- the existing section structure of the report
- the website ingestion model of "ingest markdown, publish page"

We are not introducing a large new report JSON schema as the main publishing format.

## Target Output Contract

The final `report.md` that leaves this project should contain:

- normal prose
- inline citation tokens:
  - `[Report 53]`
  - `[Reports 53, 54]`
- a `Sources Referenced` section with one bullet per cited report:
  - `- [Report 53] Medicaid Program: Claims Processing Activity October 1, 2023 Through March 31, 2024 (NY, Office of the New York State Comptroller, 2024)`

The writer does not need to generate URLs.

The website ingestion process will later turn those `report_id` tokens into internal links.

## Implementation Overview

### In This Project

We need to change five areas:

1. report-writing instructions
2. research bundle contents
3. report normalization after generation
4. citation validation
5. tests

### In The Website Project

We need to add:

1. markdown citation parsing
2. `report_id` to detail-page lookup
3. rendering of inline/source citations as internal links
4. ingestion-time validation

## Detailed Plan

## Phase 1: Make The Runtime Capable Of Producing Stable Citation Tokens

This is the most important phase.

### Step 1. Update the report writer prompt

File:

- [report_writer/prompt.md](/Users/scottlabbe/Projects/SQLagent/report_writer/prompt.md)

Change:

- revise citation instructions so the writer is told to cite using report-ID tokens
- stop telling the writer to rely only on italicized report-title citations
- instruct the writer to keep prose readable but end evidentiary claims with `[Report N]` or `[Reports N, M]`
- instruct the writer to build `Sources Referenced` using the same report-ID token format

What to add:

- "Inline citations must use report ID tokens in this format: `[Report 53]` or `[Reports 53, 54]`."
- "In `Sources Referenced`, each bullet must begin with `[Report N]`."

Why:

- prompt alignment reduces model drift
- it makes the target format explicit

### Step 2. Ensure the report writer has canonical report metadata

Current issue:

- the report writer currently receives an evidence bundle, but not all metadata is guaranteed to be present in the most useful form
- `run_009` showed the writer and analyst acting as if metadata was missing even though it had already been retrieved

Files:

- [planner/agent.py](/Users/scottlabbe/Projects/SQLagent/planner/agent.py)

Relevant function:

- `_build_research_bundle()`

Required change:

- explicitly include report metadata from the Task 2 artifact in the research bundle
- ensure the bundle exposes a simple report lookup structure keyed by `report_id`

Recommended bundle addition:

```json
"report_catalog": {
  "53": {
    "report_id": 53,
    "title": "...",
    "state": "NY",
    "audit_organization": "...",
    "publication_year": 2024
  }
}
```

Why:

- the writer needs reliable source-list fields
- the normalizer will also need canonical metadata to reconstruct source bullets

### Step 3. Fix aggregate artifact inclusion while touching the bundle code

Current issue:

- `_build_research_bundle()` currently looks for aggregate artifacts using a schema that `run_009` did not emit

Files:

- [planner/agent.py](/Users/scottlabbe/Projects/SQLagent/planner/agent.py)

Required change:

- stop depending on a fragile column test like `{"metric", "data"}`
- instead explicitly include:
  - corpus scope artifact
  - metadata artifact
  - findings artifact
  - recommendations artifact
  - aggregate artifact from Task 5, if present

Why:

- even though this is not strictly required for website linking, this is the right time to fix a known downstream input gap

## Phase 2: Add Deterministic Report Normalization

This is the most important engineering control.

### Step 4. Add a report citation normalizer

Create a new helper in runtime code.

Suggested file:

- `runtime/report_normalization.py`

Suggested responsibilities:

1. parse body citations
2. normalize legacy patterns
3. standardize `Sources Referenced`
4. emit a normalized citation artifact

Recommended function:

```python
def normalize_report_for_publication(report_markdown: str, research_bundle: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    ...
```

#### Normalizer behavior

Input:

- raw model output markdown
- research bundle with canonical report metadata

Output:

- normalized markdown
- metadata artifact such as:

```json
{
  "artifact_type": "normalized_report_citations",
  "cited_report_ids": [7, 23, 53, 54, 95],
  "source_report_ids": [7, 23, 53, 54, 95],
  "normalization_actions": [
    "converted legacy '(Report 53)' to '[Report 53]'"
  ]
}
```

#### What patterns to support

At minimum:

- `(Report 53)` -> `[Report 53]`
- `(Report 53; Report 54)` -> `[Reports 53, 54]`
- `(Reports 53, 54)` -> `[Reports 53, 54]`

Optional but useful:

- rewrite malformed source-list bullets into canonical bullets using bundle metadata

Example:

Input:

```md
- Medicaid Program: Claims Processing Activity... (Report 53)
```

Output:

```md
- [Report 53] Medicaid Program: Claims Processing Activity October 1, 2023 Through March 31, 2024 (NY, Office of the New York State Comptroller, 2024)
```

Why normalization is important:

- prompt compliance alone is not enough
- deterministic normalization gives a stable ingestion contract even if the writer is slightly inconsistent

### Step 5. Run normalization inside `execute_report_task()`

File:

- [planner/agent.py](/Users/scottlabbe/Projects/SQLagent/planner/agent.py)

Current behavior:

- writes raw model output directly to `report.md`
- then validates it

Required change:

- generate raw report
- normalize report
- save normalized report to `report.md`
- save normalization artifact
- validate the normalized report, not the raw output

Recommended flow:

1. `result = await Runner.run(report_writer, full_input)`
2. `raw_output = result.final_output`
3. `normalized_output, normalization_artifact = normalize_report_for_publication(raw_output, research_bundle)`
4. write `normalized_output` to `report.md`
5. validate `normalized_output`

Why:

- the published artifact should be the ingestion-ready artifact
- validation should match what downstream systems will actually ingest

## Phase 3: Replace Title-Inference Citation Validation With Report-ID Validation

This is required if we adopt report-ID citation tokens.

### Step 6. Replace `extract_report_citations()` logic

File:

- [runtime/validation.py](/Users/scottlabbe/Projects/SQLagent/runtime/validation.py)

Current behavior:

- tries to infer citations from italicized titles like `*Report Title* (...)`

Required behavior:

- parse explicit report-ID tokens from body and source list

Recommended parsing rules:

- body:
  - `\[Report (\d+)\]`
  - `\[Reports ([0-9,\s]+)\]`
- source list:
  - bullet lines starting with `- [Report N]`

Suggested replacement data structure:

```json
{
  "body_report_ids": [53, 54, 95],
  "source_report_ids": [53, 54, 95]
}
```

Validation checks should become:

- body citations present
- sources list present
- every body report ID exists in source list
- every source-list report ID appears in body

Optional additional check:

- every cited report ID exists in the research bundle report catalog

### Step 7. Update `citations.json` artifact shape

File:

- [runtime/validation.py](/Users/scottlabbe/Projects/SQLagent/runtime/validation.py)

Current artifact is title-based.

New recommended artifact:

```json
{
  "artifact_type": "citation_map",
  "body_report_ids": [53, 54, 95],
  "source_report_ids": [53, 54, 95],
  "unmatched_body_report_ids": [],
  "unmatched_source_report_ids": []
}
```

Why:

- this artifact can be reused later by ingestion or downstream review tooling

## Phase 4: Improve Failure Handling While We Are Here

This is not strictly required for website linking, but it addresses the failure mode seen in `run_009`.

### Step 8. Add deterministic failure signatures for report citation failures

Files:

- [planner/agent.py](/Users/scottlabbe/Projects/SQLagent/planner/agent.py)
- possibly [runtime/validation.py](/Users/scottlabbe/Projects/SQLagent/runtime/validation.py)

Change:

- when citation validation fails, pass a stable `failure_signature` into `fail_task()`

Example:

```python
failure_signature = f"report_citation_validation:{hash_of_validation_details}"
```

Why:

- repeated deterministic failures should not consume the full iteration budget

### Step 9. Optional: materialize follow-up tasks instead of infinite retries

Files:

- [runtime/replanning.py](/Users/scottlabbe/Projects/SQLagent/runtime/replanning.py)
- [main.py](/Users/scottlabbe/Projects/SQLagent/main.py)
- [runtime/scheduler.py](/Users/scottlabbe/Projects/SQLagent/runtime/scheduler.py)

Recommended scope:

- not required for the initial ingestion-linking project
- should be treated as a separate reliability improvement

Why it is optional here:

- it is useful, but not necessary to get website-linked markdown out of the system

## Phase 5: Add Tests

This phase is required.

### Step 10. Add validation tests for report-ID citations

File:

- [tests/test_runtime_regressions.py](/Users/scottlabbe/Projects/SQLagent/tests/test_runtime_regressions.py)

Add tests for:

- `[Report 53]` in body is detected
- `[Reports 53, 54]` in body is detected as two IDs
- source-list bullets with `[Report N]` are detected
- body/source ID mismatches fail validation
- unknown `report_id` fails if catalog check is enabled

### Step 11. Add normalization tests

Suggested new file:

- `tests/test_report_normalization.py`

Test cases:

- `(Report 53)` converts to `[Report 53]`
- `(Report 53; Report 54)` converts to `[Reports 53, 54]`
- source bullets are canonicalized from report metadata
- already-normalized citations are left unchanged

### Step 12. Add an end-to-end report publishing test

Suggested scope:

- build a tiny fake research bundle
- run normalization
- run citation validation
- verify output report is ingestion-ready

## Website Project Implementation Plan

This is the second half of the solution.

## Phase 6: Ingestion Parser

### Step 13. Add citation parser in the Medicaid Intelligence project

Responsibilities:

- parse `report.md`
- detect `[Report N]` and `[Reports N, M]`
- extract all cited `report_id` values

Recommended parser output:

```json
{
  "inline_citations": [
    {"report_ids": [53, 54], "raw": "[Reports 53, 54]"}
  ],
  "sources": [53, 54, 95]
}
```

### Step 14. Resolve `report_id` to detail page URL

Use the website project's own report catalog or database.

Required behavior:

- `53` resolves to the canonical detail page route for report 53

The SQLagent project should not own URL generation.

### Step 15. Render citations as links

Inline render example:

- `Eligibility failures ... [Reports 53, 54]`

becomes something like:

- `Eligibility failures ... [Report 53] [Report 54]`

where each label links internally

Source list render example:

- each source bullet becomes a link to the detail page

### Step 16. Add ingestion validation

Hard fail:

- malformed citation token
- cited report ID not found in website catalog

Soft warning:

- source present but not cited in body
- body citation missing from source list

## Recommended Delivery Sequence

This is the order I would implement it.

### Milestone 1: Stable citation contract in this project

Deliver:

- prompt update
- bundle metadata fix
- normalization helper
- report saved in normalized form
- ID-based citation validation

Outcome:

- `report.md` becomes ingestion-ready

### Milestone 2: Website ingestion support

Deliver:

- parser for `[Report N]`
- link resolution from `report_id`
- rendering to internal links

Outcome:

- ingested markdown becomes a linked website page

### Milestone 3: Reliability hardening

Deliver:

- better report failure signatures
- optional follow-up task materialization
- more regression tests

Outcome:

- fewer wasted retries, more predictable runs

## Acceptance Criteria

The implementation is complete when all of these are true:

1. The report writer can still produce a readable markdown report.
2. The final saved `report.md` contains only stable citation tokens using report IDs.
3. The `Sources Referenced` section begins each source bullet with `[Report N]`.
4. Runtime validation passes using report-ID citation matching.
5. A website ingestion parser can extract cited report IDs without title matching.
6. The website can render those citations as links to internal report detail pages.
7. The system does not require the writer to know website URLs.

## Summary Of Exact Code Changes

### SQLagent project

Modify:

- [report_writer/prompt.md](/Users/scottlabbe/Projects/SQLagent/report_writer/prompt.md)
- [planner/agent.py](/Users/scottlabbe/Projects/SQLagent/planner/agent.py)
- [runtime/validation.py](/Users/scottlabbe/Projects/SQLagent/runtime/validation.py)
- [tests/test_runtime_regressions.py](/Users/scottlabbe/Projects/SQLagent/tests/test_runtime_regressions.py)

Add:

- `runtime/report_normalization.py`
- `tests/test_report_normalization.py`

### Medicaid Intelligence website project

Add or modify:

- markdown ingestion parser
- citation token parser
- report ID lookup
- linked citation renderer
- ingestion validation

## Final Recommendation

If the goal is to balance simplicity and ease of implementation, this is the right plan:

- do not redesign reports into a new structured schema
- do not put URL generation in the agent
- do not depend on fuzzy title matching

Instead:

- standardize report-ID citation tokens
- normalize them in deterministic code
- validate them in this project
- link them during ingestion in the website project

That is the smallest change set that gives you a durable publishing workflow.
