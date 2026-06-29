# Design brief

Status: working direction approved for exploration

## Subject

Medicaid Audit Intelligence is a public evidence library for Medicaid oversight. It organizes audit reports, findings, recommendations, financial impacts, and source documents across states and oversight agencies.

## Audience

Primary:

- Medicaid program-integrity staff
- State and federal auditors
- Policy analysts

Secondary:

- Legislative staff
- Researchers
- Journalists
- Members of the public investigating Medicaid oversight

## Primary job

Help a person find authoritative Medicaid audit evidence quickly and verify it against its original source.

The homepage must make search and evidence discovery unmistakably primary. It is not a marketing landing page.

## Design character

- Institutional without imitating a government agency
- Calm, direct, and evidence-first
- Legible under sustained professional use
- Understandable to an occasional visitor
- Precise rather than luxurious
- Distinctive through information structure, not decoration

## Direction: The Public Audit Ledger

The visual world comes from audit work: report covers, finding schedules, docket metadata, source citations, ruled annotations, and financial tables.

Dark green provides the institutional anchor. White remains the dominant reading surface. Typography, rules, and metadata create hierarchy.

## Signature

The signature element is the **evidence docket**: a repeatable report treatment that exposes jurisdiction, agency, publication date, finding type, financial impact, recommendation count, and source status before decorative information.

The docket must work consistently in search results, report detail pages, state pages, research citations, and homepage report entries.

## Principles

1. Start with the task. Every page must have one clearly dominant user job.
2. Show provenance. Make agency, date, report identity, and source links easy to find.
3. Use structure as information. Rules, labels, and grouping must encode real relationships.
4. Prefer plain language. Controls say exactly what they do.
5. Spend boldness once. The evidence docket is the memorable element; surrounding UI stays disciplined.
6. Accessibility is part of the visual direction, not a final compliance pass.

## Non-goals

- Do not resemble a generic SaaS analytics dashboard.
- Do not use green gradients, glass effects, floating cards, decorative pills, or gratuitous animation.
- Do not lead with vanity statistics when search or current evidence is more useful.
- Do not use promotional phrases such as "unlock insights" or "transform your workflow."

## Initial vertical slice

Design and validate these together before migrating the full application:

1. Site header
2. Homepage and primary search
3. Search results with filters
4. One report detail page

This slice contains the core navigation, typography, form controls, metadata, evidence docket, and long-form reading patterns needed by the rest of the site.
