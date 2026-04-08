import fs from "fs/promises";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { reports } from "@shared/schema";

const DEFAULT_AUDIT_LIMIT = 20;
const DEFAULT_RESEARCH_LIMIT = 5;
const DEFAULT_SITE_URL = "https://www.medicaidintelligence.com";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");
const RESEARCH_REPORTS_DIR = path.resolve(ROOT_DIR, "reports");
const PUBLIC_DIR = path.resolve(ROOT_DIR, "client", "public");
const LLMS_INDEX_PATH = path.resolve(PUBLIC_DIR, "llms.txt");
const LLMS_FULL_PATH = path.resolve(PUBLIC_DIR, "llms-full.txt");

const researchMetadataSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  publishedDate: z.string().optional(),
  updatedDate: z.string().optional(),
});

type AuditReportRow = {
  id: number;
  reportTitle: string;
  auditOrganization: string;
  state: string;
  potentialObjectiveSummary: string | null;
  overallConclusion: string | null;
  llmInsight: string | null;
  originalReportSourceUrl: string | null;
  publicationYear: number;
  publicationMonth: number | null;
  publicationDay: number | null;
};

type ResearchReportEntry = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedDate?: string;
  updatedDate?: string;
  executiveSummary: string;
};

function getPositiveIntEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `Invalid ${name}="${value}". Falling back to ${fallback}.`,
    );
    return fallback;
  }

  return parsed;
}

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_SITE_URL;
  }

  return trimmed.replace(/\/+$/, "");
}

function toAbsoluteUrl(siteUrl: string, routePath: string): string {
  return `${siteUrl}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  return String(value);
}

function readExecutiveSummary(markdown: string): string | undefined {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headingIndex = lines.findIndex((line) =>
    /^#{1,2}\s+Executive Summary\s*$/i.test(line.trim()),
  );

  if (headingIndex < 0) {
    return undefined;
  }

  let endIndex = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const section = lines.slice(headingIndex + 1, endIndex).join("\n").trim();
  return section || undefined;
}

async function getLatestAuditReports(limit: number): Promise<AuditReportRow[]> {
  return db
    .select({
      id: reports.id,
      reportTitle: reports.reportTitle,
      auditOrganization: reports.auditOrganization,
      state: reports.state,
      potentialObjectiveSummary: reports.potentialObjectiveSummary,
      overallConclusion: reports.overallConclusion,
      llmInsight: reports.llmInsight,
      originalReportSourceUrl: reports.originalReportSourceUrl,
      publicationYear: reports.publicationYear,
      publicationMonth: reports.publicationMonth,
      publicationDay: reports.publicationDay,
    })
    .from(reports)
    .where(eq(reports.hidden, false))
    .orderBy(
      desc(reports.publicationYear),
      desc(reports.publicationMonth),
      desc(reports.publicationDay),
      desc(reports.id),
    )
    .limit(limit);
}

async function getLatestResearchReports(
  limit: number,
): Promise<ResearchReportEntry[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>> = [];
  try {
    entries = await fs.readdir(RESEARCH_REPORTS_DIR, { withFileTypes: true });
  } catch (error) {
    console.warn("Unable to read research reports directory:", error);
    return [];
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const loaded: Array<ResearchReportEntry | null> = await Promise.all(
    directories.map(async (directoryName): Promise<ResearchReportEntry | null> => {
      const metadataPath = path.resolve(
        RESEARCH_REPORTS_DIR,
        directoryName,
        "metadata.json",
      );
      const reportPath = path.resolve(
        RESEARCH_REPORTS_DIR,
        directoryName,
        "report.md",
      );

      let metadataRaw: string;
      try {
        metadataRaw = await fs.readFile(metadataPath, "utf-8");
      } catch {
        console.warn(`Skipping ${directoryName}: missing metadata.json`);
        return null;
      }

      let reportRaw = "";
      try {
        reportRaw = await fs.readFile(reportPath, "utf-8");
      } catch {
        console.warn(`Skipping ${directoryName}: missing report.md`);
      }

      let parsedMetadata: unknown;
      try {
        parsedMetadata = JSON.parse(metadataRaw);
      } catch {
        console.warn(`Skipping ${directoryName}: metadata.json is invalid JSON`);
        return null;
      }

      const metadata = researchMetadataSchema.safeParse(parsedMetadata);
      if (!metadata.success) {
        console.warn(
          `Skipping ${directoryName}: metadata.json failed validation`,
        );
        return null;
      }

      const executiveSummary =
        readExecutiveSummary(reportRaw) || metadata.data.description;

      const entry: ResearchReportEntry = {
        slug: metadata.data.slug,
        title: metadata.data.title,
        description: metadata.data.description,
        category: metadata.data.category,
        executiveSummary,
      };

      if (metadata.data.publishedDate) {
        entry.publishedDate = metadata.data.publishedDate;
      }

      if (metadata.data.updatedDate) {
        entry.updatedDate = metadata.data.updatedDate;
      }

      return entry;
    }),
  );

  return loaded
    .filter((entry): entry is ResearchReportEntry => entry !== null)
    .sort((a, b) => {
      const aDate = a.updatedDate || a.publishedDate || "";
      const bDate = b.updatedDate || b.publishedDate || "";
      if (aDate !== bDate) {
        return bDate.localeCompare(aDate);
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

function buildLlmsIndex(args: { siteUrl: string; generatedAt: string }): string {
  const { siteUrl, generatedAt } = args;
  const fullPath = "/llms-full.txt";
  const fullUrl = toAbsoluteUrl(siteUrl, fullPath);

  return [
    "# Medicaid Audit Intelligence",
    "",
    "> Structured, evidence-focused information about Medicaid audit issues, including audit summaries and long-form research reports.",
    "",
    "This file is a lightweight guide for AI tools and retrieval systems.",
    "For full report-level context, use:",
    `- ${fullPath}`,
    `- ${fullUrl}`,
    "",
    "## Scope",
    "- Informational content only (not legal advice).",
    "- Summaries are derived from source audit reports and research artifacts available on this site.",
    "",
    "## Canonical Navigation",
    `- Home: ${toAbsoluteUrl(siteUrl, "/")}`,
    `- Explore audits: ${toAbsoluteUrl(siteUrl, "/explore")}`,
    `- Research index: ${toAbsoluteUrl(siteUrl, "/research")}`,
    `- About methodology: ${toAbsoluteUrl(siteUrl, "/about")}`,
    "",
    `last_generated: ${generatedAt}`,
    "",
  ].join("\n");
}

function buildLlmsFull(args: {
  siteUrl: string;
  generatedAt: string;
  auditLimit: number;
  researchLimit: number;
  auditReports: AuditReportRow[];
  researchReports: ResearchReportEntry[];
}): string {
  const {
    siteUrl,
    generatedAt,
    auditLimit,
    researchLimit,
    auditReports,
    researchReports,
  } = args;

  const lines: string[] = [];
  lines.push("# Medicaid Audit Intelligence - Full LLM Context");
  lines.push("");
  lines.push(`last_generated: ${generatedAt}`);
  lines.push(`site_url: ${siteUrl}`);
  lines.push(`audit_limit: ${auditLimit}`);
  lines.push(`research_limit: ${researchLimit}`);
  lines.push("");
  lines.push("## Latest Audit Reports");
  lines.push("");

  if (!auditReports.length) {
    lines.push("No audit reports found.");
    lines.push("");
  } else {
    for (let index = 0; index < auditReports.length; index += 1) {
      const report = auditReports[index];
      const canonicalUrl = toAbsoluteUrl(siteUrl, `/reports/${report.id}`);
      lines.push(`### ${index + 1}. ${report.reportTitle}`);
      lines.push(`- id: ${report.id}`);
      lines.push(`- canonical_url: ${canonicalUrl}`);
      lines.push(
        `- original_report_source_url: ${formatValue(report.originalReportSourceUrl)}`,
      );
      lines.push(`- audit_organization: ${formatValue(report.auditOrganization)}`);
      lines.push(`- state: ${formatValue(report.state)}`);
      lines.push(`- publication_year: ${formatValue(report.publicationYear)}`);
      lines.push(`- publication_month: ${formatValue(report.publicationMonth)}`);
      lines.push(`- publication_day: ${formatValue(report.publicationDay)}`);
      lines.push("");
      lines.push("#### objective (potential_objective_summary)");
      lines.push(formatValue(report.potentialObjectiveSummary));
      lines.push("");
      lines.push("#### executive_summary (overall_conclusion)");
      lines.push(formatValue(report.overallConclusion));
      lines.push("");
      lines.push("#### llm_insight");
      lines.push(formatValue(report.llmInsight));
      lines.push("");
    }
  }

  lines.push("## Latest Research Reports");
  lines.push("");

  if (!researchReports.length) {
    lines.push("No research reports found.");
    lines.push("");
  } else {
    for (let index = 0; index < researchReports.length; index += 1) {
      const report = researchReports[index];
      const canonicalUrl = toAbsoluteUrl(siteUrl, `/research/${report.slug}`);
      lines.push(`### ${index + 1}. ${report.title}`);
      lines.push(`- slug: ${report.slug}`);
      lines.push(`- category: ${report.category}`);
      lines.push(`- canonical_url: ${canonicalUrl}`);
      lines.push(`- published_date: ${formatValue(report.publishedDate)}`);
      lines.push(`- updated_date: ${formatValue(report.updatedDate)}`);
      lines.push("");
      lines.push("#### description");
      lines.push(report.description);
      lines.push("");
      lines.push("#### executive_summary");
      lines.push(report.executiveSummary);
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function writeLlmsFiles(): Promise<void> {
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL || DEFAULT_SITE_URL);
  const auditLimit = getPositiveIntEnv("LLMS_AUDIT_LIMIT", DEFAULT_AUDIT_LIMIT);
  const researchLimit = getPositiveIntEnv(
    "LLMS_RESEARCH_LIMIT",
    DEFAULT_RESEARCH_LIMIT,
  );
  const generatedAt = new Date().toISOString();

  const [auditReports, researchReports] = await Promise.all([
    getLatestAuditReports(auditLimit),
    getLatestResearchReports(researchLimit),
  ]);

  const llmsIndex = buildLlmsIndex({ siteUrl, generatedAt });
  const llmsFull = buildLlmsFull({
    siteUrl,
    generatedAt,
    auditLimit,
    researchLimit,
    auditReports,
    researchReports,
  });

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(LLMS_INDEX_PATH, llmsIndex, "utf-8"),
    fs.writeFile(LLMS_FULL_PATH, llmsFull, "utf-8"),
  ]);

  console.log(`Generated ${LLMS_INDEX_PATH}`);
  console.log(`Generated ${LLMS_FULL_PATH}`);
  console.log(
    `Included ${auditReports.length} audit reports and ${researchReports.length} research reports.`,
  );
}

writeLlmsFiles().catch((error) => {
  console.error("Failed to generate llms files:", error);
  process.exit(1);
});
