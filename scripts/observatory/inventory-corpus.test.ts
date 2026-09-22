import assert from "node:assert/strict";
import test from "node:test";
import { sourceRegistrySchema } from "./contracts.ts";
import {
  extractResearchBriefReportIds,
  summarizeCorpus,
  summarizeOperations,
} from "./inventory-corpus.ts";
import {
  assertRegisteredSourceCoverage,
  normalizeCandidateUrl,
  observatoryQueueInputSchema,
} from "./queue-candidates.ts";
import { summarizeSourceCoverage } from "./source-registry.ts";

test("summarizeCorpus builds deterministic counts and report facts", () => {
  const summary = summarizeCorpus(
    [
      {
        id: 2,
        title: "Second",
        agency: "Agency B",
        state: "TX",
        publicationYear: 2025,
        publicationMonth: null,
        publicationDay: null,
        overallConclusion: "Not sufficient.",
        llmInsight: null,
        potentialObjectiveSummary: null,
        auditScope: null,
        sourceUrl: null,
        updatedAt: "2026-01-02T00:00:00Z",
      },
      {
        id: 1,
        title: "First",
        agency: "Agency A",
        state: "NY",
        publicationYear: 2026,
        publicationMonth: 2,
        publicationDay: 1,
        overallConclusion: "A useful conclusion.",
        llmInsight: null,
        potentialObjectiveSummary: null,
        auditScope: null,
        sourceUrl: "https://example.gov/1",
        updatedAt: "2026-02-03T00:00:00Z",
      },
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
  assert.equal(summary.reportIndex[0].publicationMonth, 2);
  assert.deepEqual(summary.reportIndex[0].topics, ["managed-care"]);
  assert.deepEqual(summary.qualityIssues, [{
    reportId: 2,
    issue: "placeholder_overall_conclusion",
    detail: 'Overall conclusion is "Not sufficient.".',
  }]);
});

test("extractResearchBriefReportIds recognizes public links and brief citation tokens", () => {
  assert.deepEqual(
    extractResearchBriefReportIds("See [Report 55], [report 12], and /reports/55 for evidence."),
    [12, 55],
  );
});

test("summarizeOperations preserves every unresolved item and Observatory run", () => {
  const summary = summarizeOperations(
    [
      {
        id: 1,
        url: "https://example.gov/a",
        title: "Pending",
        status: "pending_review",
        retry_count: 0,
        created_at: "2026-08-20T00:00:00Z",
        completed_at: null,
        error_message: null,
        report_id: null,
        observatory_metadata: { report_key: "pending-report" },
      },
      {
        id: 2,
        url: "https://example.gov/b",
        title: "Failed",
        status: "failed",
        retry_count: 3,
        created_at: "2026-08-21T00:00:00Z",
        completed_at: null,
        error_message: "OCR required",
        report_id: null,
        observatory_metadata: null,
      },
      {
        id: 3,
        url: "https://example.gov/c",
        title: "Completed",
        status: "completed",
        retry_count: 0,
        created_at: "2026-08-21T00:00:00Z",
        completed_at: "2026-08-21T06:00:00Z",
        error_message: null,
        report_id: 90,
        observatory_metadata: null,
      },
    ],
    [{
      id: 8,
      search_params: { source: "opportunity-observatory", runId: "2026-w34" },
      results_count: 2,
      created_at: "2026-08-24T00:00:00Z",
    }],
    "2026-08-25T00:00:00Z",
  );

  assert.equal(summary.pendingReviewCount, 1);
  assert.equal(summary.failedCount, 1);
  assert.equal(summary.linkedReportCount, 1);
  assert.equal(summary.averageCompletionHours, 6);
  assert.deepEqual(summary.unresolvedItems.map((item) => item.id), [1, 2]);
  assert.equal(summary.observatoryRuns.length, 1);
});

test("source and candidate schemas do not impose internal count limits", () => {
  const sources = Array.from({ length: 75 }, (_, index) => ({
    id: `source-${index + 1}`,
    organization: `Organization ${index + 1}`,
    jurisdiction: `Jurisdiction ${index + 1}`,
    landingPage: `https://example.gov/sources/${index + 1}`,
    sourceType: "report-index" as const,
    knownAccessLimitations: "",
    lastHumanVerificationDate: "2026-08-25",
    includeTerms: ["medicaid"],
  }));
  assert.equal(sourceRegistrySchema.parse({ schemaVersion: 1, sources }).sources.length, 75);
  const coverage = summarizeSourceCoverage(sourceRegistrySchema.parse({ schemaVersion: 1, sources }));
  assert.equal(coverage.registeredSourceCount, 75);
  assert.ok(coverage.uncoveredStates.includes("Alabama"));

  const sourceIds = sources.map((source) => source.id);
  const candidates = Array.from({ length: 75 }, (_, index) => ({
    reportKey: `report-${index + 1}`,
    publisher: "Publisher",
    title: `Report ${index + 1}`,
    reportNumber: `R-${index + 1}`,
    publicationDate: "2026-08-20",
    landingUrl: `https://example.gov/reports/${index + 1}`,
    pdfUrl: null,
    jurisdiction: "United States",
    auditPeriod: null,
    accessedAt: "2026-08-25",
    discoverySourceIds: [sourceIds[index]],
    medicaidRelevance: "The report directly audits Medicaid.",
    suggestedUse: "add-report" as const,
    relatedReportIds: [],
    possibleDuplicateIds: [],
    uncertainty: "",
  }));
  const parsed = observatoryQueueInputSchema.parse({
    schemaVersion: 1,
    run: {
      runId: "2026-w35",
      generatedAt: "2026-08-25T12:00:00Z",
      windowStart: "2026-07-27",
      windowEnd: "2026-08-25",
      rotatingSiteFamily: "research",
      sourcesAttempted: sourceIds,
      sourcesSucceeded: sourceIds,
      sourceFailures: [],
      coverageComplete: true,
    },
    candidates,
  });
  assert.equal(parsed.candidates.length, 75);
  assert.doesNotThrow(() => assertRegisteredSourceCoverage(parsed, sourceIds));
  assert.throws(
    () => assertRegisteredSourceCoverage(parsed, [...sourceIds, "missing-source"]),
    /missing registered sources: missing-source/,
  );
});

test("normalizeCandidateUrl removes tracking and normalizes ordering without changing identity", () => {
  assert.equal(
    normalizeCandidateUrl("https://EXAMPLE.gov/report/?utm_source=test&b=2&a=1#section"),
    "https://example.gov/report?a=1&b=2",
  );
});
