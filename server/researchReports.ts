import fs from "fs/promises";
import path from "path";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "./database";
import { reports } from "@shared/schema";
import type {
  ResearchReportListItem,
  ResearchReportPageData,
  ResearchReportSection,
  ResearchReportSource,
} from "../client/src/lib/types";

const REPORTS_ROOT = path.resolve(import.meta.dirname, "..", "reports");

const researchReportMetadataSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  publishedDate: z.string().optional(),
  updatedDate: z.string().optional(),
  featured: z.boolean().optional(),
});

type ResearchReportMetadata = z.infer<typeof researchReportMetadataSchema>;

type RawSectionNode = {
  id: string;
  title: string;
  level: number;
  defaultExpanded: boolean;
  contentHtml: string;
  children: RawSectionNode[];
  rawContentLines: string[];
};

type HeadingMatch = {
  lineIndex: number;
  title: string;
  originalLevel: number;
  level: number;
  id: string;
};

type ResearchReportPaths = {
  slug: string;
  reportPath: string;
  metadataPath: string;
};

export class ResearchReportNotFoundError extends Error {
  constructor(slug: string) {
    super(`Research report "${slug}" was not found`);
    this.name = "ResearchReportNotFoundError";
  }
}

export class ResearchReportValidationError extends Error {
  details?: string[];

  constructor(slug: string, message: string, details?: string[]) {
    super(`Research report "${slug}" is invalid: ${message}`);
    this.name = "ResearchReportValidationError";
    this.details = details;
  }
}

export async function listResearchReportSlugs(): Promise<string[]> {
  const entries = await readResearchDirectories();
  return entries.map((entry) => entry.slug);
}

export async function listResearchReports(): Promise<ResearchReportListItem[]> {
  const entries = await readResearchDirectories();
  const reports = await Promise.all(
    entries.map(async (entry) => {
      try {
        const page = await getResearchReportBySlug(entry.slug);
        return toListItem(page);
      } catch (error) {
        if (
          error instanceof ResearchReportNotFoundError ||
          error instanceof ResearchReportValidationError
        ) {
          return null;
        }
        throw error;
      }
    }),
  );

  return reports
    .filter((report): report is ResearchReportListItem => report !== null)
    .sort(compareResearchReports);
}

export async function getResearchReportBySlug(
  slug: string,
): Promise<ResearchReportPageData> {
  const safeSlug = normalizeSlug(slug);
  const paths = getResearchReportPaths(safeSlug);
  const [markdown, stats, metadata] = await Promise.all([
    fs.readFile(paths.reportPath, "utf-8").catch(() => {
      throw new ResearchReportNotFoundError(safeSlug);
    }),
    fs.stat(paths.reportPath).catch(() => {
      throw new ResearchReportNotFoundError(safeSlug);
    }),
    readMetadata(paths),
  ]);

  const page = parseResearchReportMarkdown(metadata, markdown);
  const missingReportIds = await getMissingReportIds(page.citedReportIds);

  if (missingReportIds.length) {
    throw new ResearchReportValidationError(
      safeSlug,
      `unknown report IDs: ${missingReportIds.join(", ")}`,
    );
  }

  const derivedUpdatedAt = metadata.updatedDate || stats.mtime.toISOString();

  return {
    ...page,
    updatedAt: derivedUpdatedAt,
  };
}

async function readResearchDirectories(): Promise<ResearchReportPaths[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(REPORTS_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const slugs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => /^[a-z0-9-]+$/.test(slug))
    .sort();

  return slugs.map(getResearchReportPaths);
}

function getResearchReportPaths(slug: string): ResearchReportPaths {
  const reportPath = path.resolve(REPORTS_ROOT, slug, "report.md");
  const metadataPath = path.resolve(REPORTS_ROOT, slug, "metadata.json");

  for (const candidate of [reportPath, metadataPath]) {
    if (!candidate.startsWith(`${REPORTS_ROOT}${path.sep}`)) {
      throw new ResearchReportNotFoundError(slug);
    }
  }

  return {
    slug,
    reportPath,
    metadataPath,
  };
}

async function readMetadata(
  paths: ResearchReportPaths,
): Promise<ResearchReportMetadata> {
  let raw: string;
  try {
    raw = await fs.readFile(paths.metadataPath, "utf-8");
  } catch {
    throw new ResearchReportValidationError(
      paths.slug,
      "missing required metadata.json",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ResearchReportValidationError(
      paths.slug,
      "metadata.json is not valid JSON",
    );
  }

  const metadata = researchReportMetadataSchema.safeParse(parsed);
  if (!metadata.success) {
    throw new ResearchReportValidationError(
      paths.slug,
      "metadata.json failed validation",
      metadata.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  if (metadata.data.slug !== paths.slug) {
    throw new ResearchReportValidationError(
      paths.slug,
      `metadata slug "${metadata.data.slug}" does not match folder name`,
    );
  }

  return metadata.data;
}

function normalizeSlug(slug: string): string {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ResearchReportNotFoundError(slug);
  }

  return slug;
}

async function getMissingReportIds(reportIds: number[]): Promise<number[]> {
  const uniqueIds = Array.from(new Set(reportIds)).sort((a, b) => a - b);
  if (!uniqueIds.length) {
    return [];
  }

  const rows = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(inArray(reports.id, uniqueIds), eq(reports.hidden, false)));

  const existingIds = new Set(rows.map((row) => row.id));
  return uniqueIds.filter((id) => !existingIds.has(id));
}

function parseResearchReportMarkdown(
  metadata: ResearchReportMetadata,
  markdown: string,
): ResearchReportPageData {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headings = collectHeadings(lines);
  const introLines = headings.length ? lines.slice(0, headings[0].lineIndex) : lines;
  const introHtml = renderMarkdownLines(introLines);
  const sections = buildSections(lines, headings);
  const sourcesSection = sections.find(
    (section) => section.title.toLowerCase() === "sources referenced",
  );
  const sources = extractSources(sourcesSection);
  const citedReportIds = extractReportIds(markdown);

  return {
    slug: metadata.slug,
    title: metadata.title,
    description: metadata.description,
    category: metadata.category,
    featured: metadata.featured,
    publishedDate: metadata.publishedDate,
    updatedDate: metadata.updatedDate,
    introHtml: introHtml || undefined,
    sections: sections.map(toSection),
    citedReportIds,
    sources,
  };
}

function collectHeadings(lines: string[]): HeadingMatch[] {
  const rawHeadings = lines
    .map((line, lineIndex) => {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (!match) {
        return null;
      }

      return {
        lineIndex,
        title: match[2].trim(),
        originalLevel: match[1].length,
      };
    })
    .filter(Boolean) as Array<{
    lineIndex: number;
    title: string;
    originalLevel: number;
  }>;

  if (!rawHeadings.length) {
    return [];
  }

  const distinctLevels = Array.from(
    new Set(rawHeadings.map((heading) => heading.originalLevel)),
  ).sort((a, b) => a - b);
  const levelCounts = new Map<number, number>();
  for (const heading of rawHeadings) {
    levelCounts.set(
      heading.originalLevel,
      (levelCounts.get(heading.originalLevel) ?? 0) + 1,
    );
  }

  const minLevel = distinctLevels[0];
  const baseLevel =
    (levelCounts.get(minLevel) ?? 0) === 1 && distinctLevels.length > 1
      ? distinctLevels[1]
      : minLevel;
  const slugCounts = new Map<string, number>();

  return rawHeadings.map((heading) => {
    const baseId = slugifyHeading(heading.title);
    const count = (slugCounts.get(baseId) ?? 0) + 1;
    slugCounts.set(baseId, count);

    return {
      lineIndex: heading.lineIndex,
      title: heading.title,
      originalLevel: heading.originalLevel,
      level:
        heading.originalLevel < baseLevel
          ? 1
          : heading.originalLevel - baseLevel + 1,
      id: count === 1 ? baseId : `${baseId}-${count}`,
    };
  });
}

function buildSections(lines: string[], headings: HeadingMatch[]): RawSectionNode[] {
  const roots: RawSectionNode[] = [];
  const stack: RawSectionNode[] = [];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const rawContentLines = lines.slice(
      heading.lineIndex + 1,
      nextHeading ? nextHeading.lineIndex : lines.length,
    );

    const node: RawSectionNode = {
      id: heading.id,
      title: heading.title,
      level: heading.level,
      defaultExpanded:
        heading.level === 1
          ? heading.title.trim().toLowerCase() === "key findings"
          : false,
      contentHtml: renderMarkdownLines(rawContentLines),
      children: [],
      rawContentLines,
    };

    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length) {
      stack[stack.length - 1].children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  }

  return roots;
}

function extractSources(
  section: RawSectionNode | undefined,
): ResearchReportSource[] {
  if (!section) {
    return [];
  }

  const sources: ResearchReportSource[] = [];

  for (const line of section.rawContentLines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) {
      continue;
    }

    const label = trimmed.slice(2).trim();
    const ids = extractReportIds(label);
    if (!ids.length) {
      continue;
    }

    sources.push({
      reportId: ids[0],
      label,
      resolvedHref: `/reports/${ids[0]}`,
    });
  }

  return sources;
}

function renderMarkdownLines(lines: string[]): string {
  const html: string[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) {
      return;
    }

    const text = paragraphBuffer.join(" ").trim();
    if (text) {
      html.push(`<p>${renderInlineMarkdown(text)}</p>`);
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listBuffer.length) {
      return;
    }

    html.push(
      `<ul>${listBuffer
        .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
        .join("")}</ul>`,
    );
    listBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listBuffer.push(trimmed.slice(2).trim());
      continue;
    }

    if (listBuffer.length) {
      if (/^\s{2,}\S/.test(line)) {
        listBuffer[listBuffer.length - 1] = `${listBuffer[listBuffer.length - 1]} ${trimmed}`;
      } else {
        flushList();
        paragraphBuffer.push(trimmed);
      }
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  flushList();
  return html.join("");
}

function renderInlineMarkdown(text: string): string {
  let html = escapeHtml(text);

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  html = html.replace(/\bReports\s+(\d+(?:\s*,\s*\d+)+)\b/g, (_match, ids) => {
    const parts = String(ids)
      .split(/\s*,\s*/)
      .map(
        (id) =>
          `<a href="/reports/${id}" class="text-orange-700 underline-offset-2 hover:underline">${id}</a>`,
      );
    return `Reports ${parts.join(", ")}`;
  });

  html = html.replace(/\bReport\s+(\d+)\b/g, (_match, id) => {
    return `<a href="/reports/${id}" class="text-orange-700 underline-offset-2 hover:underline">Report ${id}</a>`;
  });

  return html;
}

function extractReportIds(text: string): number[] {
  const ids = new Set<number>();
  let match: RegExpExecArray | null;

  const singularPattern = /\bReport\s+(\d+)\b/g;
  while ((match = singularPattern.exec(text)) !== null) {
    ids.add(Number(match[1]));
  }

  const pluralPattern = /\bReports\s+(\d+(?:\s*,\s*\d+)+)\b/g;
  while ((match = pluralPattern.exec(text)) !== null) {
    for (const rawId of match[1].split(/\s*,\s*/)) {
      ids.add(Number(rawId));
    }
  }

  return Array.from(ids).sort((a, b) => a - b);
}

function toSection(section: RawSectionNode): ResearchReportSection {
  return {
    id: section.id,
    title: section.title,
    level: section.level,
    defaultExpanded: section.defaultExpanded,
    contentHtml: section.contentHtml,
    children: section.children.map(toSection),
  };
}

function slugifyHeading(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return base || "section";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toListItem(report: ResearchReportPageData): ResearchReportListItem {
  return {
    slug: report.slug,
    title: report.title,
    description: report.description,
    category: report.category,
    featured: report.featured,
    publishedDate: report.publishedDate,
    updatedDate: report.updatedDate || report.updatedAt,
  };
}

function compareResearchReports(
  a: ResearchReportListItem,
  b: ResearchReportListItem,
): number {
  if (Boolean(a.featured) !== Boolean(b.featured)) {
    return a.featured ? -1 : 1;
  }

  const aDate = a.updatedDate || a.publishedDate || "";
  const bDate = b.updatedDate || b.publishedDate || "";
  if (aDate !== bDate) {
    return bDate.localeCompare(aDate);
  }

  return a.title.localeCompare(b.title);
}
