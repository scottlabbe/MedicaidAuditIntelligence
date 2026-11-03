import type {
  ReportListItem,
  ResearchReportListItem,
} from "../../client/src/lib/types";
import { reportPath } from "@shared/reportSlugs";
import { normalizePublicSourceUrl } from "@shared/sourceUrls";
import { listResearchReports, validateResearchReports } from "../researchReports";
import { storage } from "../storage";

const DEFAULT_SITE_URL = "https://www.medicaidintelligence.com";
const PAGE_SIZE = 500;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedFiles: { expiresAt: number; value: AgentFiles } | undefined;
let pendingBuild: Promise<AgentFiles> | undefined;

export type AgentFiles = {
  index: string;
  full: string;
  reportCount: number;
  researchCount: number;
};

function normalizeSiteUrl(value?: string): string {
  return (value?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

function absoluteUrl(siteUrl: string, pathname: string): string {
  return `${siteUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function compact(value?: string | null, maxLength = 480): string {
  const normalized = value?.replace(/\s+/g, " ").trim() || "not_available";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
}

function publicationDate(report: ReportListItem): string {
  const month = report.publicationMonth
    ? `-${String(report.publicationMonth).padStart(2, "0")}`
    : "";
  const day = report.publicationDay
    ? `-${String(report.publicationDay).padStart(2, "0")}`
    : "";
  return `${report.publicationYear}${month}${day}`;
}

async function getAllAuditReports(): Promise<ReportListItem[]> {
  const first = await storage.getReports({ sortBy: "date_desc" }, 1, PAGE_SIZE);
  const pageCount = Math.ceil(first.total / PAGE_SIZE);
  if (pageCount <= 1) {
    return first.items;
  }

  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      storage.getReports({ sortBy: "date_desc" }, index + 2, PAGE_SIZE),
    ),
  );
  return [first, ...remaining].flatMap((page) => page.items);
}

function buildIndex(args: {
  siteUrl: string;
  generatedAt: string;
  reportCount: number;
  researchCount: number;
}): string {
  const { siteUrl, generatedAt, reportCount, researchCount } = args;
  return [
    "# Medicaid Audit Intelligence",
    "",
    "> Citation-ready Medicaid audit summaries and evidence-backed research for auditors, oversight staff, and retrieval agents.",
    "",
    "Use canonical HTML pages for facts and citations. This file is a navigation guide; /llms-full.txt is the complete compact catalog.",
    "",
    "## Canonical navigation",
    `- Audit reports: ${absoluteUrl(siteUrl, "/reports")}`,
    `- Research reports: ${absoluteUrl(siteUrl, "/research")}`,
    `- Topics: ${absoluteUrl(siteUrl, "/topics")}`,
    `- Jurisdictions: ${absoluteUrl(siteUrl, "/states")}`,
    `- Methodology: ${absoluteUrl(siteUrl, "/about")}`,
    `- Complete agent catalog: ${absoluteUrl(siteUrl, "/llms-full.txt")}`,
    "",
    "## Citation guidance",
    "- Cite the canonical page URL and the named publisher.",
    "- Prefer anchored finding or recommendation URLs when available on a report page.",
    "- Treat summaries as informational analysis, not legal advice or a substitute for the original audit.",
    "",
    `audit_report_count: ${reportCount}`,
    `research_report_count: ${researchCount}`,
    `generated_at: ${generatedAt}`,
    "",
  ].join("\n");
}

function appendAuditReport(
  lines: string[],
  report: ReportListItem,
  siteUrl: string,
): void {
  const sourceUrl = normalizePublicSourceUrl(report.originalReportSourceUrl);
  lines.push(`### ${compact(report.reportTitle, 240)}`);
  lines.push(`- stable_id: audit-report-${report.id}`);
  lines.push(`- canonical_url: ${absoluteUrl(siteUrl, reportPath(report))}`);
  lines.push(
    `- publisher: ${compact(report.publisherName || report.auditOrganization, 160)}`,
  );
  lines.push(`- publication_date: ${publicationDate(report)}`);
  lines.push(`- source_jurisdiction: ${compact(report.sourceJurisdiction?.name, 80)}`);
  lines.push(
    `- subject_jurisdictions: ${compact(report.subjectJurisdictions.map((item) => item.name).join(", ") || "none", 200)}`,
  );
  lines.push(`- jurisdiction_scope: ${report.jurisdictionScopeType}`);
  lines.push(`- finding_count: ${report.findingCount ?? 0}`);
  lines.push(`- recommendation_count: ${report.recommendationCount ?? 0}`);
  if (sourceUrl) {
    lines.push(`- original_source_url: ${sourceUrl}`);
  } else {
    lines.push("- original_source_status: library_record_only");
  }
  lines.push(
    `- summary: ${compact(report.overallConclusion || report.conclusionExcerpt)}`,
  );
  lines.push("");
}

function appendResearchReport(
  lines: string[],
  report: ResearchReportListItem,
  siteUrl: string,
): void {
  lines.push(`### ${compact(report.title, 240)}`);
  lines.push(`- stable_id: research-${report.slug}`);
  lines.push(`- canonical_url: ${absoluteUrl(siteUrl, `/research/${report.slug}`)}`);
  lines.push(`- category: ${compact(report.category, 120)}`);
  lines.push(`- published_date: ${report.publishedDate || "not_available"}`);
  lines.push(`- updated_date: ${report.updatedDate || "not_available"}`);
  lines.push(`- cited_source_count: ${report.sourceCount ?? 0}`);
  lines.push(`- summary: ${compact(report.description)}`);
  lines.push("");
}

function buildFull(args: {
  siteUrl: string;
  generatedAt: string;
  auditReports: ReportListItem[];
  researchReports: ResearchReportListItem[];
}): string {
  const { siteUrl, generatedAt, auditReports, researchReports } = args;
  const lines = [
    "# Medicaid Audit Intelligence — Complete Agent Catalog",
    "",
    "This catalog lists every public audit and validated research report. Canonical HTML pages remain the source of truth.",
    "",
    `site_url: ${siteUrl}`,
    `generated_at: ${generatedAt}`,
    `audit_report_count: ${auditReports.length}`,
    `research_report_count: ${researchReports.length}`,
    "",
    "## Audit reports",
    "",
  ];

  for (const report of auditReports) {
    appendAuditReport(lines, report, siteUrl);
  }

  lines.push("## Research reports", "");
  for (const report of researchReports) {
    appendResearchReport(lines, report, siteUrl);
  }

  return `${lines.join("\n")}\n`;
}

export async function buildAgentFiles(options?: {
  siteUrl?: string;
  generatedAt?: string;
}): Promise<AgentFiles> {
  const siteUrl = normalizeSiteUrl(options?.siteUrl || process.env.SITE_URL);
  const generatedAt = options?.generatedAt || new Date().toISOString();

  await validateResearchReports();
  const [auditReports, researchReports] = await Promise.all([
    getAllAuditReports(),
    listResearchReports(),
  ]);

  return {
    index: buildIndex({
      siteUrl,
      generatedAt,
      reportCount: auditReports.length,
      researchCount: researchReports.length,
    }),
    full: buildFull({ siteUrl, generatedAt, auditReports, researchReports }),
    reportCount: auditReports.length,
    researchCount: researchReports.length,
  };
}

export async function getAgentFiles(): Promise<AgentFiles> {
  const now = Date.now();
  if (cachedFiles && cachedFiles.expiresAt > now) {
    return cachedFiles.value;
  }
  if (pendingBuild) {
    return pendingBuild;
  }

  pendingBuild = buildAgentFiles();
  try {
    const value = await pendingBuild;
    cachedFiles = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } finally {
    pendingBuild = undefined;
  }
}
