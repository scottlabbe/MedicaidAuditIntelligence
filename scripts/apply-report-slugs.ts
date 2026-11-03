/**
 * Validates the offline review CSV against the current database and optionally
 * applies the approved mapping in one atomic UPDATE statement.
 *
 * Dry run:
 *   npm run reports:slugs:apply -- --approve-all-proposed
 * Apply after explicit approval:
 *   npm run reports:slugs:apply -- --approve-all-proposed --apply
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../server/database";
import {
  buildReportSlugCandidates,
  isValidReportSlug,
} from "../shared/reportSlugs";

interface DatabaseReportRow {
  id: number;
  slug: string | null;
  sourceUid: string;
  title: string;
  publicationYear: number;
  state: string;
  hidden: boolean;
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (quoted || rows.length < 2) throw new Error("Review CSV is malformed or empty");

  const [headers, ...dataRows] = rows;
  return dataRows
    .filter((values) => values.some(Boolean))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

const apply = process.argv.includes("--apply");
const approveAllProposed = process.argv.includes("--approve-all-proposed");
const reviewPath = resolve(
  argumentValue("--review") || "reviews/report-slug-review.csv",
);

const schemaCheck = await db.execute(sql`
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'reports'
      AND column_name = 'slug'
  ) AS present
`);

if (!(schemaCheck.rows[0] as { present?: boolean } | undefined)?.present) {
  throw new Error("reports.slug does not exist; apply migration 0003 first");
}

const reviewRows = parseCsv(await readFile(reviewPath, "utf8"));
const databaseResult = await db.execute(sql`
  SELECT
    id,
    slug,
    source_uid::text AS "sourceUid",
    report_title AS title,
    publication_year AS "publicationYear",
    state,
    COALESCE(hidden, FALSE) AS hidden
  FROM reports
  ORDER BY id
`);
const databaseRows = databaseResult.rows as unknown as DatabaseReportRow[];
const visibleRows = databaseRows.filter((row) => !row.hidden);
const visibleById = new Map(visibleRows.map((row) => [row.id, row]));

if (reviewRows.length !== visibleRows.length) {
  throw new Error(
    `Review CSV has ${reviewRows.length} rows but the database has ${visibleRows.length} visible reports`,
  );
}

const approved = new Map<number, string>();
for (const row of reviewRows) {
  const id = Number(row.report_id);
  if (!Number.isInteger(id) || !visibleById.has(id)) {
    throw new Error(`Review CSV contains unknown report ID: ${row.report_id}`);
  }

  const decision = row.review_decision.trim().toLowerCase();
  let slug: string;
  if (decision === "change") {
    slug = row.approved_slug.trim();
  } else if (decision === "approve" || approveAllProposed) {
    slug = row.approved_slug.trim() || row.proposed_slug.trim();
  } else {
    throw new Error(`Report ${id} has not been approved`);
  }

  if (!isValidReportSlug(slug)) {
    throw new Error(`Report ${id} has an invalid approved slug: ${slug}`);
  }
  approved.set(id, slug);
}

const usedSlugs = new Set(approved.values());
if (usedSlugs.size !== approved.size) {
  throw new Error("Approved visible report slugs are not unique");
}

for (const report of databaseRows.filter((row) => row.hidden)) {
  const slug = buildReportSlugCandidates({
    id: report.id,
    title: report.title,
    publicationYear: report.publicationYear,
    state: report.state,
    sourceUid: report.sourceUid,
  }).find((candidate) => !usedSlugs.has(candidate));

  if (!slug) throw new Error(`Could not allocate a slug for hidden report ${report.id}`);
  approved.set(report.id, slug);
  usedSlugs.add(slug);
}

const conflicts = databaseRows.filter((row) => {
  const nextSlug = approved.get(row.id);
  return row.slug && row.slug !== nextSlug;
});
if (conflicts.length) {
  throw new Error(
    `Refusing to replace existing slugs for report IDs: ${conflicts.map((row) => row.id).join(", ")}`,
  );
}

console.log(`Validated ${visibleRows.length} approved public slugs from ${reviewPath}`);
console.log(`Prepared ${databaseRows.length - visibleRows.length} hidden report slug(s)`);

if (!apply) {
  console.log("Dry run complete; no database rows were changed");
  process.exit(0);
}

const values = Array.from(approved, ([id, slug]) => sql`(${id}::integer, ${slug}::text)`);
await db.execute(sql`
  UPDATE reports AS report
  SET slug = approved.slug
  FROM (VALUES ${sql.join(values, sql`, `)}) AS approved(id, slug)
  WHERE report.id = approved.id
`);

const verification = await db.execute(sql`
  SELECT
    COUNT(*) FILTER (WHERE slug IS NULL) AS missing,
    COUNT(*) AS total,
    COUNT(DISTINCT slug) AS unique_slugs
  FROM reports
`);
const counts = verification.rows[0] as {
  missing: string | number;
  total: string | number;
  unique_slugs: string | number;
};

if (Number(counts.missing) !== 0 || Number(counts.total) !== Number(counts.unique_slugs)) {
  throw new Error("Post-update slug verification failed");
}

console.log(`Applied and verified ${counts.total} unique report slugs`);
