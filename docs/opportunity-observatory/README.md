# Opportunity Observatory operations

The Opportunity Observatory is a read-only research loop. It may recommend work; it does not edit or publish the site. The operating design is in [`../opportunity-observatory-implementation-plan.md`](../opportunity-observatory-implementation-plan.md).

## Routine commands

Build a complete local context file:

```bash
npm run observatory:context -- --output .observatory/context.json
```

This reads the corpus through `DATABASE_URL`, checks the configured public site and source registry when network access is available, and includes the newest GSC summary under `.observatory/gsc/` when present. Input failures are recorded in the context instead of being hidden.

Import one or more Search Console CSV exports:

```bash
npm run observatory:gsc -- --input /path/to/Queries.csv --input /path/to/Pages.csv
```

The importer accepts query, page, or combined query-and-page CSVs. It records totals separately for each input so query and page exports from the same period are not incorrectly added together. It writes an aggregated JSON snapshot under `.observatory/gsc/`; raw exports and generated summaries are intentionally ignored by Git.

Validate committed operating data:

```bash
npm run observatory:validate
```

Run deterministic tests:

```bash
npm run observatory:test
```

## Weekly review

1. Scan the relevant-report and site-findings tables; their length reflects qualified findings in the disclosed scope, not a quota.
2. Review the single best next move, if present, and verify its primary sources and corpus report IDs.
3. Choose accept, clarify, defer, reject, or complete.
4. Record the rationale in `backlog.md` so later runs do not repeat unchanged ideas.
5. Start a separate implementation task only for accepted work.

Keep only one observatory-sourced implementation active at a time. A useful weekly result may be “no strong opportunity.”

The source registry is ordered by monitoring value. Start with the highest-priority sources and use a disclosed date window; a registry entry does not create an obligation to manually review every site every week. Lower-priority state sources are rotating authoritative discovery and verification sources, not a 32-item human checklist.

Each weekly run also reviews one rotating page family (`reports`, `topics`, `states`, `agencies`, or `research`) for improvements beyond newly published reports. The output must list which sources and site pages it actually reviewed.

## Inputs that require the maintainer

- Export GSC data manually until repeated use justifies an API integration.
- Recheck source-registry URLs when a reachability alert or redirect appears; the current registry records the latest approved editorial verification date.
- The project-local rule at `.codex/rules/observatory.rules` allows unattended execution of only `npm run observatory:context -- --output .observatory/context.json`. Restart Codex after adding or changing the rule so it is loaded. Do not grant the scheduled task full access.
- Review and approve every new source-registry entry.
- Decide whether to accept, defer, or reject an opportunity.
- Authorize implementation and publication in a separate task.
- Keep the computer on and the ChatGPT desktop app running for scheduled runs that use this local project.
