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
  reportIndex: Array<{
    id: number;
    title: string;
    agency: string;
    state: string;
    publicationYear: number;
    sourceUrl: string | null;
    findingCount: number;
    recommendationCount: number;
    topics: string[];
  }>;
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
    reportIndex: reports
      .map((report) => ({
        id: report.id,
        title: report.title,
        agency: report.agency,
        state: report.state,
        publicationYear: report.publicationYear,
        sourceUrl: report.sourceUrl,
        findingCount: findingsByReport.get(report.id) ?? 0,
        recommendationCount: recommendationsByReport.get(report.id) ?? 0,
        topics: Array.from(topicsByReport.get(report.id) ?? []).sort(),
      }))
      .sort((left, right) => right.publicationYear - left.publicationYear || left.id - right.id),
  };
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
    const ids = Array.from(markdown.matchAll(/\/reports\/(\d+)/g)).map((match) => Number(match[1]));
    briefs.push({
      slug: entry.name,
      title: typeof metadata.title === "string" ? metadata.title : entry.name,
      updatedDate: typeof metadata.updatedDate === "string" ? metadata.updatedDate : null,
      citedReportIds: Array.from(new Set(ids)).sort((left, right) => left - right),
    });
  }
  return briefs;
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
