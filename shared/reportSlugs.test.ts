import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReportSlugCandidates,
  buildReportSlugProposals,
  isValidReportSlug,
  reportPath,
  REPORT_SLUG_MAX_LENGTH,
} from "./reportSlugs.ts";

test("buildReportSlugProposals removes leading boilerplate and appends the publication year", () => {
  const [proposal] = buildReportSlugProposals([
    {
      id: 1,
      title: "Audit of Selected Medicaid Managed Care Encounter Data in Illinois",
      publicationYear: 2024,
      state: "IL",
      sourceUid: "11111111-1111-1111-1111-111111111111",
    },
  ]);

  assert.equal(
    proposal.proposedSlug,
    "selected-medicaid-managed-care-encounter-data-in-illinois-2024",
  );
  assert.equal(proposal.needsAttention, false);
});

test("buildReportSlugProposals preserves a publication year already in the title", () => {
  const [proposal] = buildReportSlugProposals([
    {
      id: 2,
      title: "2025 Medicaid Eligibility Controls",
      publicationYear: 2025,
      state: "TX",
      sourceUid: "22222222-2222-2222-2222-222222222222",
    },
  ]);

  assert.equal(proposal.proposedSlug, "2025-medicaid-eligibility-controls");
});

test("buildReportSlugProposals uses state codes for duplicate title/year pairs", () => {
  const proposals = buildReportSlugProposals([
    {
      id: 3,
      title: "Medicaid Managed Care Oversight",
      publicationYear: 2024,
      state: "TX",
      sourceUid: "33333333-3333-3333-3333-333333333333",
    },
    {
      id: 4,
      title: "Medicaid Managed Care Oversight",
      publicationYear: 2024,
      state: "IL",
      sourceUid: "44444444-4444-4444-4444-444444444444",
    },
  ]);

  assert.deepEqual(
    proposals.map((proposal) => proposal.proposedSlug),
    [
      "medicaid-managed-care-oversight-2024-tx",
      "medicaid-managed-care-oversight-2024-il",
    ],
  );
  assert.ok(proposals.every((proposal) => proposal.needsAttention));
});

test("buildReportSlugProposals uses stable source suffixes when state cannot resolve a collision", () => {
  const proposals = buildReportSlugProposals([
    {
      id: 5,
      title: "Medicaid Program Integrity",
      publicationYear: 2024,
      state: "US",
      sourceUid: "abcdef12-3333-3333-3333-333333333333",
    },
    {
      id: 6,
      title: "Medicaid Program Integrity",
      publicationYear: 2024,
      state: "US",
      sourceUid: "98765432-4444-4444-4444-444444444444",
    },
  ]);

  assert.deepEqual(
    proposals.map((proposal) => proposal.proposedSlug),
    [
      "medicaid-program-integrity-2024-abcdef12",
      "medicaid-program-integrity-2024-98765432",
    ],
  );
});

test("generated slugs stay within the database limit and remain valid", () => {
  const [proposal] = buildReportSlugProposals([
    {
      id: 7,
      title: `Review of ${"Very Detailed Medicaid Audit Language ".repeat(8)}`,
      publicationYear: 2026,
      state: "CA",
      sourceUid: "77777777-7777-7777-7777-777777777777",
    },
  ]);

  assert.ok(proposal.proposedSlug.length <= REPORT_SLUG_MAX_LENGTH);
  assert.ok(proposal.proposedSlug.endsWith("-2026"));
  assert.equal(isValidReportSlug(proposal.proposedSlug), true);
  assert.equal(proposal.needsAttention, true);
});

test("reserved and numeric-only title slugs are prefixed", () => {
  const proposals = buildReportSlugProposals([
    {
      id: 8,
      title: "Page",
      publicationYear: 2026,
      state: "CA",
      sourceUid: "88888888-8888-8888-8888-888888888888",
    },
    {
      id: 9,
      title: "1234",
      publicationYear: 2026,
      state: "CA",
      sourceUid: "99999999-9999-9999-9999-999999999999",
    },
  ]);

  assert.equal(proposals[0].proposedSlug, "report-page-2026");
  assert.equal(proposals[1].proposedSlug, "report-1234-2026");
});

test("buildReportSlugCandidates provides stable collision fallbacks", () => {
  assert.deepEqual(
    buildReportSlugCandidates({
      id: 10,
      title: "Medicaid Oversight",
      publicationYear: 2026,
      state: "TX",
      sourceUid: "abcdef12-1111-1111-1111-111111111111",
    }),
    [
      "medicaid-oversight-2026",
      "medicaid-oversight-2026-tx",
      "medicaid-oversight-2026-abcdef12",
    ],
  );
});

test("reportPath prefers the public slug and safely falls back during migration", () => {
  assert.equal(reportPath({ id: 42, slug: "medicaid-oversight-2026" }), "/reports/medicaid-oversight-2026");
  assert.equal(reportPath({ id: 42, slug: null }), "/reports/42");
});
