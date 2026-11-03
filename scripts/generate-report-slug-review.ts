/**
 * Generates a compact, offline CSV for reviewing proposed public report slugs.
 * This script is read-only: it never updates the database.
 *
 * Run with:
 *   npm run reports:slugs:review
 *   npm run reports:slugs:review -- --output reviews/my-review.csv
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../server/database";
import {
  buildReportSlugProposals,
  type ReportSlugInput,
} from "../shared/reportSlugs";

interface ReportReviewRow extends ReportSlugInput {
  auditOrganization: string;
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function safeSpreadsheetValue(value: unknown): string {
  const normalized = String(value ?? "").replace(/\r?\n|\r/g, " ").trim();
  return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function csvCell(value: unknown): string {
  const safe = safeSpreadsheetValue(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

const outputPath = resolve(
  argumentValue("--output") || "reviews/report-slug-review.csv",
);

const result = await db.execute(sql`
  SELECT
    id,
    source_uid::text AS "sourceUid",
    report_title AS title,
    audit_organization AS "auditOrganization",
    publication_year AS "publicationYear",
    state
  FROM reports
  WHERE COALESCE(hidden, FALSE) = FALSE
  ORDER BY id
`);

const rows = result.rows as unknown as ReportReviewRow[];
const proposals = buildReportSlugProposals(rows);
const detailsById = new Map(rows.map((row) => [row.id, row]));

const headers = [
  "report_id",
  "report_title",
  "audit_organization",
  "publication_year",
  "state",
  "proposed_slug",
  "needs_attention",
  "attention_reason",
  "review_decision",
  "approved_slug",
  "reviewer_notes",
];

const csvRows = proposals.map((proposal) => {
  const details = detailsById.get(proposal.id);
  return [
    proposal.id,
    proposal.title,
    details?.auditOrganization || "",
    proposal.publicationYear,
    proposal.state || "",
    proposal.proposedSlug,
    proposal.needsAttention ? "yes" : "no",
    proposal.attentionReason,
    "",
    "",
    "",
  ].map(csvCell).join(",");
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `\uFEFF${headers.map(csvCell).join(",")}\n${csvRows.join("\n")}\n`, "utf8");

const attentionCount = proposals.filter((proposal) => proposal.needsAttention).length;
console.log(`Wrote ${proposals.length} visible reports to ${outputPath}`);
console.log(`${attentionCount} proposal(s) flagged for extra attention`);
