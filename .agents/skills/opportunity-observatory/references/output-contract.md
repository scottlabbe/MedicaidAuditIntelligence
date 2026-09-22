# Observatory output contract

Return exactly these sections.

## Weekly verdict

Use no more than 150 words. State what matters most, summarize the review scope, and explicitly say when no next move is strong enough to recommend.

## Report intake and inventory

Return a Markdown table containing every qualified report found within the disclosed source and date scope. Do not impose a minimum or maximum row count, and do not add weak rows to fill space. For each include:

- durable lowercase `report_key`
- publisher, report title, report number when available, and publication date
- authoritative report link and access date
- why it is relevant to this site
- corpus status: absent, possible duplicate, present, or unknown
- queue outcome: queued, already queued, already in corpus, or queue failed
- queue ID and status when available
- related corpus report IDs
- suggested use: add report, update existing page, cross-report synthesis, or monitor only
- missing evidence or uncertainty

Do not include a report that is already present when no action is proposed. Summarize how many candidates were confirmed present in the review scope instead.

If none qualify, say `None found in the reviewed scope.`

## Site findings and ideas

Return a Markdown table containing every qualified new or materially changed site finding discovered from corpus comparison, the rotating site-family review, or technical checks. Do not impose a minimum or maximum row count. Include:

- durable lowercase `finding_key`
- category: existing-page improvement, cross-report synthesis, coverage gap, internal linking/navigation, search mismatch, thin/stale content, new feature, or technical
- finding or idea
- affected page(s) or page family
- evidence and relevant source/report links
- expected reader or maintainer benefit
- effort: small, medium, or large
- confidence: high, medium, or low
- important caveat or next verification

Routine report additions belong in the report inventory; include one here only when it also supports a broader site improvement. If none qualify, say `None found in the reviewed scope.`

## Operating health

Report only decision-relevant changes and actionable problems across:

- registered sources attempted, succeeded, failed, and coverage completeness;
- queue counts, oldest pending-review item, failures, and candidate-to-report linkage;
- corpus growth and material data-quality defects;
- changed-page, technical, search, and available SEO evidence; and
- a missing final artifact, queue handoff failure, or unavailable required input.

Do not enumerate routine passing checks. Do not impose a top-N limit; group repetitive evidence when it supports the same action.

## Best next move

Recommend zero or one item drawn from either inventory. If none is strong enough, say `None this run.` Otherwise include:

- referenced `report_key` or `finding_key`
- recommendation and why it outranks the other qualified findings now
- bounded scope and likely affected page(s)
- evidence to reverify before editing
- concrete implementation steps for a separate task
- risks and reasons to defer
- completion checks

## Sources and limitations

List the source/date window, every registry source attempted and its outcome, rotating site family and pages actually reviewed, queue handoff result, and unavailable inputs. Link primary sources, distinguish verified facts from inference, and disclose unavailable database, source, live-site, or SEO data.

Do not include implementation diffs or a weighted score. The inventory is uncapped within the disclosed scope, not an instruction to search indefinitely or enumerate unqualified material.
