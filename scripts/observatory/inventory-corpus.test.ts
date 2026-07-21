import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCorpus } from "./inventory-corpus.ts";

test("summarizeCorpus builds deterministic counts and report facts", () => {
  const summary = summarizeCorpus(
    [
      { id: 2, title: "Second", agency: "Agency B", state: "TX", publicationYear: 2025, sourceUrl: null, updatedAt: "2026-01-02T00:00:00Z" },
      { id: 1, title: "First", agency: "Agency A", state: "NY", publicationYear: 2026, sourceUrl: "https://example.gov/1", updatedAt: "2026-02-03T00:00:00Z" },
    ],
    [{ reportId: 1, count: 3 }, { reportId: 2, count: 2 }],
    [{ reportId: 1, count: 1 }],
    [
      { reportId: 1, slug: "managed-care", name: "Managed Care" },
      { reportId: 2, slug: "managed-care", name: "Managed Care" },
    ],
    [{ slug: "managed-care", title: "Managed Care", updatedDate: null, citedReportIds: [1] }],
    "2026-07-18T12:00:00.000Z",
  );

  assert.equal(summary.totalVisibleReports, 2);
  assert.equal(summary.totalFindings, 5);
  assert.equal(summary.totalRecommendations, 1);
  assert.equal(summary.reportsMissingSourceUrl, 1);
  assert.equal(summary.topics[0].reportCount, 2);
  assert.equal(summary.reportIndex[0].id, 1);
  assert.deepEqual(summary.reportIndex[0].topics, ["managed-care"]);
});
