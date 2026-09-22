# Opportunity Observatory operations

The Opportunity Observatory is a weekly research, candidate-intake, and site-review loop. The project-local skill and policy references define its research scope, evidence standards, safe write boundary, and report contract.

## Routine commands

Build the ignored deterministic context file:

```bash
npm run observatory:context -- --output .observatory/context.json
```

Validate the source registry and run deterministic tests:

```bash
npm run observatory:validate
npm run observatory:test
```

The candidate command reads one validated JSON payload from standard input. It is a dry run unless `--apply` is present:

```bash
npm run observatory:queue
npm run observatory:queue -- --apply
```

The apply form may only insert qualified candidates as `pending_review`, refresh Observatory discovery metadata on an existing queue row, and add one `search_history` run manifest. It cannot approve, process, publish, delete, migrate, or change a queue status.

## Weekly process

1. Build deterministic corpus, queue, run-history, and live-site context.
2. Attempt every registered authoritative source for the rolling 30-day window and exhaust available pagination.
3. Revisit every unresolved queue candidate regardless of age.
4. Reconcile candidates against the complete corpus and queue.
5. Queue every qualified absent or possible-duplicate report for human review.
6. Review every changed page and one deterministic family sample of unchanged pages.
7. Return the exact six-section management report and recommend zero or one site implementation.
8. Review report candidates in the Miner; any number of verified reports may proceed through ordinary ingestion.
9. Record only accepted, clarified, deferred, rejected, or completed site/product decisions in `backlog.md`.

## Deliberate bounds

There is no internal maximum for registered sources, paginated source results, qualified candidates, queue rows, corpus comparisons, or report-inventory rows. The 30-day window bounds new-publication research, while unresolved candidates remain in scope until disposition.

Timeouts, concurrency, retries, and sampling unchanged site pages are operational controls, not content quotas. A source that cannot be completed must be disclosed and makes the run partial.

## Files and state

- `.observatory/context.json` is the only routine generated file and is overwritten each run.
- `scraping_queue` is the durable report-candidate record.
- `search_history` stores one compact Observatory run manifest.
- `backlog.md` stores site/product decisions only.
- Codex Scheduled stores the weekly management report; do not commit dated run artifacts.

The unattended allowlist should contain only the exact context-builder and candidate-queue apply commands. Restart Codex after changing `.codex/rules/observatory.rules`.
