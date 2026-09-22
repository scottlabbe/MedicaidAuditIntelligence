import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull, sql } from "drizzle-orm";
import { parseArgs, getArg, toProjectPath, writeJsonFile } from "./io.ts";

export interface CorpusReportRow {
  id: number;
  title: string;
  agency: string;
  state: string;
  publicationYear: number;
  publicationMonth: number | null;
  publicationDay: number | null;
  overallConclusion: string | null;
  llmInsight: string | null;
  potentialObjectiveSummary: string | null;
  auditScope: string | null;
  sourceUrl: string | null;
  updatedAt: Date | string | null;
}

interface CountRow {
  reportId: number;
  count: number;
}

interface TopicRow {
  reportId: number;
  slug: string;
  name: string;
}

export interface ResearchBriefFact {
  slug: string;
  title: string;
  updatedDate: string | null;
  citedReportIds: number[];
}

interface QueueRow {
  id: number;
  url: string;
  title: string;
  status: string | null;
  retry_count: number | null;
  created_at: Date | string | null;
  completed_at: Date | string | null;
  error_message: string | null;
  report_id: number | null;
  observatory_metadata: unknown;
}

interface ObservatoryRunRow {
  id: number;
  search_params: unknown;
  results_count: number | null;
  created_at: Date | string | null;
}

export interface OperationsInventory {
  generatedAt: string;
  totalQueueItems: number;
  countsByStatus: Array<{ value: string; count: number }>;
  pendingReviewCount: number;
  oldestPendingReviewAt: string | null;
  failedCount: number;
  linkedReportCount: number;
  averageCompletionHours: number | null;
  unresolvedItems: Array<{
    id: number;
    url: string;
    title: string;
    status: string;
    retryCount: number;
    createdAt: string | null;
    errorMessage: string | null;
    reportId: number | null;
    observatoryMetadata: Record<string, unknown>;
  }>;
  observatoryRuns: Array<{
    id: number;
    createdAt: string | null;
    resultsCount: number;
    manifest: Record<string, unknown>;
  }>;
}

export interface CorpusInventory {
  generatedAt: string;
  totalVisibleReports: number;
  totalFindings: number;
  totalRecommendations: number;
  reportsMissingSourceUrl: number;
  latestCorpusUpdate: string | null;
  countsByState: Array<{ value: string; count: number }>;
  countsByAgency: Array<{ value: string; count: number }>;
  countsByPublicationYear: Array<{ value: string; count: number }>;
  topics: Array<{ slug: string; name: string; reportCount: number }>;
  researchBriefs: ResearchBriefFact[];
  qualityIssues: Array<{
    reportId: number;
    issue: "missing_summary" | "placeholder_overall_conclusion";
    detail: string;
  }>;
  reportIndex: Array<{
    id: number;
    title: string;
    agency: string;
    state: string;
    publicationYear: number;
    publicationMonth: number | null;
    publicationDay: number | null;
    sourceUrl: string | null;
    findingCount: number;
    recommendationCount: number;
    topics: string[];
  }>;
}

const PLACEHOLDER_SUMMARIES = new Set([
  "n a",
  "none",
  "not available",
  "not sufficient",
  "unknown",
]);

function normalizeSummary(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isoDate(value: Date | string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function aggregate(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

export function summarizeCorpus(
  reports: CorpusReportRow[],
  findingCounts: CountRow[],
  recommendationCounts: CountRow[],
  topicRows: TopicRow[],
  researchBriefs: ResearchBriefFact[],
  generatedAt = new Date().toISOString(),
): CorpusInventory {
  const findingsByReport = new Map(findingCounts.map((row) => [row.reportId, Number(row.count)]));
  const recommendationsByReport = new Map(
    recommendationCounts.map((row) => [row.reportId, Number(row.count)]),
  );
  const topicsByReport = new Map<number, Set<string>>();
  const topicFacts = new Map<string, { name: string; reportIds: Set<number> }>();

  for (const row of topicRows) {
    const reportTopics = topicsByReport.get(row.reportId) ?? new Set<string>();
    reportTopics.add(row.slug);
    topicsByReport.set(row.reportId, reportTopics);

    const fact = topicFacts.get(row.slug) ?? { name: row.name, reportIds: new Set<number>() };
    fact.reportIds.add(row.reportId);
    topicFacts.set(row.slug, fact);
  }

  const updateTimes = reports
    .map((report) => report.updatedAt ? new Date(report.updatedAt).getTime() : Number.NaN)
    .filter(Number.isFinite);
  const qualityIssues = reports.flatMap<CorpusInventory["qualityIssues"][number]>((report) => {
    const summaries = [
      report.overallConclusion,
      report.llmInsight,
      report.potentialObjectiveSummary,
      report.auditScope,
    ].filter((value): value is string => Boolean(value?.trim()));
    if (!summaries.length) {
      return [{
        reportId: report.id,
        issue: "missing_summary",
        detail: "No conclusion, insight, objective summary, or audit scope is available.",
      }];
    }
    if (
      report.overallConclusion
      && PLACEHOLDER_SUMMARIES.has(normalizeSummary(report.overallConclusion))
    ) {
      return [{
        reportId: report.id,
        issue: "placeholder_overall_conclusion",
        detail: `Overall conclusion is ${JSON.stringify(report.overallConclusion.trim())}.`,
      }];
    }
    return [];
  }).sort((left, right) => left.reportId - right.reportId);

  return {
    generatedAt,
    totalVisibleReports: reports.length,
    totalFindings: findingCounts.reduce((total, row) => total + Number(row.count), 0),
    totalRecommendations: recommendationCounts.reduce((total, row) => total + Number(row.count), 0),
    reportsMissingSourceUrl: reports.filter((report) => !report.sourceUrl?.trim()).length,
    latestCorpusUpdate: updateTimes.length
      ? new Date(Math.max(...updateTimes)).toISOString()
      : null,
    countsByState: aggregate(reports.map((report) => report.state)),
    countsByAgency: aggregate(reports.map((report) => report.agency)),
    countsByPublicationYear: aggregate(reports.map((report) => String(report.publicationYear))),
    topics: Array.from(topicFacts.entries())
      .map(([slug, fact]) => ({ slug, name: fact.name, reportCount: fact.reportIds.size }))
      .sort((left, right) => right.reportCount - left.reportCount || left.slug.localeCompare(right.slug)),
    researchBriefs: [...researchBriefs].sort((left, right) => left.slug.localeCompare(right.slug)),
    qualityIssues,
    reportIndex: reports
      .map((report) => ({
        id: report.id,
        title: report.title,
        agency: report.agency,
        state: report.state,
        publicationYear: report.publicationYear,
        publicationMonth: report.publicationMonth,
        publicationDay: report.publicationDay,
        sourceUrl: report.sourceUrl,
        findingCount: findingsByReport.get(report.id) ?? 0,
        recommendationCount: recommendationsByReport.get(report.id) ?? 0,
        topics: Array.from(topicsByReport.get(report.id) ?? []).sort(),
      }))
      .sort((left, right) => right.publicationYear - left.publicationYear || left.id - right.id),
  };
}

export function extractResearchBriefReportIds(markdown: string): number[] {
  const ids = [
    ...Array.from(markdown.matchAll(/\/reports\/(\d+)/gi)).map((match) => Number(match[1])),
    ...Array.from(markdown.matchAll(/\[report\s+(\d+)\]/gi)).map((match) => Number(match[1])),
  ];
  return Array.from(new Set(ids)).sort((left, right) => left - right);
}

async function readResearchBriefs(root: string): Promise<ResearchBriefFact[]> {
  const reportsRoot = path.join(root, "reports");
  const entries = await fs.readdir(reportsRoot, { withFileTypes: true }).catch(() => []);
  const briefs: ResearchBriefFact[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-z0-9-]+$/.test(entry.name)) {
      continue;
    }
    const directory = path.join(reportsRoot, entry.name);
    const [metadataRaw, markdown] = await Promise.all([
      fs.readFile(path.join(directory, "metadata.json"), "utf8"),
      fs.readFile(path.join(directory, "report.md"), "utf8"),
    ]);
    const metadata = JSON.parse(metadataRaw) as { title?: unknown; updatedDate?: unknown };
    briefs.push({
      slug: entry.name,
      title: typeof metadata.title === "string" ? metadata.title : entry.name,
      updatedDate: typeof metadata.updatedDate === "string" ? metadata.updatedDate : null,
      citedReportIds: extractResearchBriefReportIds(markdown),
    });
  }
  return briefs;
}

export function summarizeOperations(
  rows: QueueRow[],
  runRows: ObservatoryRunRow[],
  generatedAt = new Date().toISOString(),
): OperationsInventory {
  const unresolvedStatuses = new Set(["pending_review", "pending", "downloading", "processing", "failed"]);
  const pendingReviewDates = rows
    .filter((row) => row.status === "pending_review")
    .map((row) => row.created_at ? new Date(row.created_at).getTime() : Number.NaN)
    .filter(Number.isFinite);
  const completionHours = rows.flatMap((row) => {
    if (!row.created_at || !row.completed_at) return [];
    const elapsed = new Date(row.completed_at).getTime() - new Date(row.created_at).getTime();
    return Number.isFinite(elapsed) && elapsed >= 0 ? [elapsed / 3_600_000] : [];
  });

  return {
    generatedAt,
    totalQueueItems: rows.length,
    countsByStatus: aggregate(rows.map((row) => row.status ?? "unknown")),
    pendingReviewCount: rows.filter((row) => row.status === "pending_review").length,
    oldestPendingReviewAt: pendingReviewDates.length
      ? new Date(Math.min(...pendingReviewDates)).toISOString()
      : null,
    failedCount: rows.filter((row) => row.status === "failed").length,
    linkedReportCount: rows.filter((row) => row.report_id !== null).length,
    averageCompletionHours: completionHours.length
      ? completionHours.reduce((total, value) => total + value, 0) / completionHours.length
      : null,
    unresolvedItems: rows
      .filter((row) => unresolvedStatuses.has(row.status ?? "unknown"))
      .map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        status: row.status ?? "unknown",
        retryCount: row.retry_count ?? 0,
        createdAt: isoDate(row.created_at),
        errorMessage: row.error_message,
        reportId: row.report_id,
        observatoryMetadata: objectValue(row.observatory_metadata),
      }))
      .sort((left, right) => left.id - right.id),
    observatoryRuns: runRows.map((row) => ({
      id: row.id,
      createdAt: isoDate(row.created_at),
      resultsCount: row.results_count ?? 0,
      manifest: objectValue(row.search_params),
    })),
  };
}

export async function inventoryOperations(): Promise<OperationsInventory> {
  const { sqlClient } = await import("../../server/database.ts");
  const [queueRows, runRows] = await Promise.all([
    sqlClient`
      SELECT id, url, title, status, retry_count, created_at, completed_at,
             error_message, report_id,
             document_metadata -> 'observatory' AS observatory_metadata
      FROM scraping_queue
      ORDER BY id
    `,
    sqlClient`
      SELECT id, search_params, results_count, created_at
      FROM search_history
      WHERE search_params ->> 'source' = 'opportunity-observatory'
      ORDER BY created_at DESC, id DESC
    `,
  ]) as [QueueRow[], ObservatoryRunRow[]];
  return summarizeOperations(queueRows, runRows);
}

export async function inventoryCorpus(root = process.cwd()): Promise<CorpusInventory> {
  const [{ db }, schema] = await Promise.all([
    import("../../server/database.ts"),
    import("../../shared/schema.ts"),
  ]);

  const [reportRows, findingCounts, recommendationCounts, topicRows, researchBriefs] =
    await Promise.all([
      db.select({
        id: schema.reports.id,
        title: schema.reports.reportTitle,
        agency: schema.reports.auditOrganization,
        state: schema.reports.state,
        publicationYear: schema.reports.publicationYear,
        publicationMonth: schema.reports.publicationMonth,
        publicationDay: schema.reports.publicationDay,
        overallConclusion: schema.reports.overallConclusion,
        llmInsight: schema.reports.llmInsight,
        potentialObjectiveSummary: schema.reports.potentialObjectiveSummary,
        auditScope: schema.reports.auditScope,
        sourceUrl: schema.reports.originalReportSourceUrl,
        updatedAt: schema.reports.updatedAt,
      }).from(schema.reports).where(eq(schema.reports.hidden, false)),
      db.select({
        reportId: schema.findings.reportId,
        count: sql<number>`count(*)::int`,
      }).from(schema.findings).groupBy(schema.findings.reportId),
      db.select({
        reportId: schema.recommendations.reportId,
        count: sql<number>`count(*)::int`,
      }).from(schema.recommendations).groupBy(schema.recommendations.reportId),
      db.select({
        reportId: schema.reportTopicAssignments.reportId,
        slug: schema.publicTopicDefinitions.slug,
        name: schema.publicTopicDefinitions.name,
      })
        .from(schema.reportTopicAssignments)
        .innerJoin(
          schema.publicTopics,
          eq(schema.publicTopics.id, schema.reportTopicAssignments.topicId),
        )
        .innerJoin(
          schema.publicTopicDefinitions,
          eq(schema.publicTopicDefinitions.topicId, schema.publicTopics.id),
        )
        .innerJoin(
          schema.topicTaxonomyRevisions,
          eq(schema.topicTaxonomyRevisions.id, schema.publicTopicDefinitions.taxonomyRevisionId),
        )
        .where(and(
          eq(schema.topicTaxonomyRevisions.status, "active"),
          isNull(schema.publicTopics.retiredAt),
          isNull(schema.reportTopicAssignments.retiredAt),
        )),
      readResearchBriefs(root),
    ]);

  return summarizeCorpus(reportRows, findingCounts, recommendationCounts, topicRows, researchBriefs);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inventory = await inventoryCorpus(process.cwd());
  const output = getArg(args, "output");
  if (output) {
    await writeJsonFile(toProjectPath(output), inventory);
  } else {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(`Corpus inventory failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
