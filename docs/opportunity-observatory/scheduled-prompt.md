Use `$opportunity-observatory` for this week's Medicaid Audit Intelligence run.

Build deterministic context with `npm run observatory:context -- --output .observatory/context.json`. Follow the skill's evidence rules, safe queue-write boundary, and exact output contract. Do not edit repository files, change queue decisions, approve processing, ingest or publish reports, change Git or deployment state, or request broader unattended permissions.

Treat the date window and rotating site family as stateless and deterministic. Use the fixed rolling 30-day publication window, then revisit every unresolved queue candidate regardless of age. Do not use automation memory as the candidate system of record.

Attempt every source in the committed registry. Follow all available pagination until the source is exhausted or results predate the window. There is no internal maximum for sources, pages, candidates, queue rows, corpus comparisons, or inventory rows. If a source is unavailable or externally truncated, record it as failed, mark coverage partial, and continue without silently narrowing the scope.

Delegate independent read-heavy lanes to subagents when available: federal and FAC sources; state sources A–M; state sources N–Z and DC; and corpus, product, technical, and SEO health. Wait for all lanes, reconcile their candidates, and do not let the number of available agents reduce the source scope.

Check every candidate against the complete corpus and unresolved queue. Pass one schema-version-1 JSON payload containing the run manifest and every qualified absent or possible-duplicate candidate to `npm run observatory:queue -- --apply` over standard input. This exact command is the only permitted write. If it fails, report the failure and preserve the candidates in the report; do not use another database command.

Review every newly published or materially changed site page plus the deterministic sample from the rotating site family. Use fresh direct page loads to verify technical problems.

Return exactly: Weekly verdict; Report intake and inventory; Site findings and ideas; Operating health; Best next move; Sources and limitations. Surface every qualified result, but recommend no more than one site implementation. Routine report review and ingestion do not count against that work-in-progress limit.
