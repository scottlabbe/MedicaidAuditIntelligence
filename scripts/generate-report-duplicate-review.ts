/**
 * Generates a read-only CSV of visible report pairs that may represent the
 * same source report. It never updates or hides report records.
 *
 * Run with:
 *   npm run reports:duplicates:review
 *   npm run reports:duplicates:review -- --output reviews/my-review.csv
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../server/database";

interface DuplicateReviewRow {
  confidence: string;
  matchReasons: string;
  leftId: number;
  leftSlug: string;
  leftTitle: string;
  leftPublisherKey: string;
  leftPublicationDate: string;
  leftState: string;
  leftSourceUrl: string;
  leftFileHash: string;
  leftFindingCount: number;
  leftRecommendationCount: number;
  rightId: number;
  rightSlug: string;
  rightTitle: string;
  rightPublisherKey: string;
  rightPublicationDate: string;
  rightState: string;
  rightSourceUrl: string;
  rightFileHash: string;
  rightFindingCount: number;
  rightRecommendationCount: number;
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
  argumentValue("--output") || "reviews/report-duplicate-review.csv",
);

const result = await db.execute(sql`
  WITH candidate_pairs AS (
    SELECT
      left_report.id AS left_id,
      right_report.id AS right_id,
      ARRAY_REMOVE(ARRAY[
        CASE
          WHEN NULLIF(BTRIM(left_report.file_hash), '') IS NOT NULL
            AND left_report.file_hash = right_report.file_hash
          THEN 'exact_file_hash'
        END,
        CASE
          WHEN left_report.original_report_source_url ~* '^https?://'
            AND LOWER(BTRIM(left_report.original_report_source_url)) =
                LOWER(BTRIM(right_report.original_report_source_url))
          THEN 'exact_public_source_url'
        END,
        CASE
          WHEN left_report.publication_year = right_report.publication_year
            AND REGEXP_REPLACE(LOWER(left_report.report_title), '[^a-z0-9]+', '', 'g') =
                REGEXP_REPLACE(LOWER(right_report.report_title), '[^a-z0-9]+', '', 'g')
          THEN 'normalized_title_and_year'
        END
      ], NULL) AS match_reasons
    FROM reports left_report
    JOIN reports right_report ON left_report.id < right_report.id
    WHERE COALESCE(left_report.hidden, FALSE) = FALSE
      AND COALESCE(right_report.hidden, FALSE) = FALSE
      AND (
        (
          NULLIF(BTRIM(left_report.file_hash), '') IS NOT NULL
          AND left_report.file_hash = right_report.file_hash
        )
        OR (
          left_report.original_report_source_url ~* '^https?://'
          AND LOWER(BTRIM(left_report.original_report_source_url)) =
              LOWER(BTRIM(right_report.original_report_source_url))
        )
        OR (
          left_report.publication_year = right_report.publication_year
          AND REGEXP_REPLACE(LOWER(left_report.report_title), '[^a-z0-9]+', '', 'g') =
              REGEXP_REPLACE(LOWER(right_report.report_title), '[^a-z0-9]+', '', 'g')
        )
      )
  )
  SELECT
    CASE
      WHEN 'exact_file_hash' = ANY(pair.match_reasons)
        OR 'exact_public_source_url' = ANY(pair.match_reasons)
      THEN 'high'
      ELSE 'review'
    END AS confidence,
    ARRAY_TO_STRING(pair.match_reasons, '; ') AS "matchReasons",
    left_report.id AS "leftId",
    left_report.slug AS "leftSlug",
    left_report.report_title AS "leftTitle",
    left_report.publisher_key AS "leftPublisherKey",
    CONCAT_WS('-',
      left_report.publication_year,
      LPAD(left_report.publication_month::text, 2, '0'),
      LPAD(left_report.publication_day::text, 2, '0')
    ) AS "leftPublicationDate",
    left_report.state AS "leftState",
    left_report.original_report_source_url AS "leftSourceUrl",
    left_report.file_hash AS "leftFileHash",
    (SELECT COUNT(*) FROM findings WHERE findings.report_id = left_report.id) AS "leftFindingCount",
    (SELECT COUNT(*) FROM recommendations WHERE recommendations.report_id = left_report.id) AS "leftRecommendationCount",
    right_report.id AS "rightId",
    right_report.slug AS "rightSlug",
    right_report.report_title AS "rightTitle",
    right_report.publisher_key AS "rightPublisherKey",
    CONCAT_WS('-',
      right_report.publication_year,
      LPAD(right_report.publication_month::text, 2, '0'),
      LPAD(right_report.publication_day::text, 2, '0')
    ) AS "rightPublicationDate",
    right_report.state AS "rightState",
    right_report.original_report_source_url AS "rightSourceUrl",
    right_report.file_hash AS "rightFileHash",
    (SELECT COUNT(*) FROM findings WHERE findings.report_id = right_report.id) AS "rightFindingCount",
    (SELECT COUNT(*) FROM recommendations WHERE recommendations.report_id = right_report.id) AS "rightRecommendationCount"
  FROM candidate_pairs pair
  JOIN reports left_report ON left_report.id = pair.left_id
  JOIN reports right_report ON right_report.id = pair.right_id
  ORDER BY
    CASE
      WHEN 'exact_file_hash' = ANY(pair.match_reasons)
        OR 'exact_public_source_url' = ANY(pair.match_reasons)
      THEN 0
      ELSE 1
    END,
    left_report.id,
    right_report.id
`);

const rows = result.rows as unknown as DuplicateReviewRow[];
const headers = [
  "confidence",
  "match_reasons",
  "left_report_id",
  "left_slug",
  "left_title",
  "left_publisher_key",
  "left_publication_date",
  "left_state",
  "left_source_url",
  "left_file_hash",
  "left_finding_count",
  "left_recommendation_count",
  "right_report_id",
  "right_slug",
  "right_title",
  "right_publisher_key",
  "right_publication_date",
  "right_state",
  "right_source_url",
  "right_file_hash",
  "right_finding_count",
  "right_recommendation_count",
  "review_decision",
  "survivor_report_id",
  "reviewer_notes",
];

const csvRows = rows.map((row) => [
  row.confidence,
  row.matchReasons,
  row.leftId,
  row.leftSlug,
  row.leftTitle,
  row.leftPublisherKey,
  row.leftPublicationDate,
  row.leftState,
  row.leftSourceUrl,
  row.leftFileHash,
  row.leftFindingCount,
  row.leftRecommendationCount,
  row.rightId,
  row.rightSlug,
  row.rightTitle,
  row.rightPublisherKey,
  row.rightPublicationDate,
  row.rightState,
  row.rightSourceUrl,
  row.rightFileHash,
  row.rightFindingCount,
  row.rightRecommendationCount,
  "",
  "",
  "",
].map(csvCell).join(","));

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `\uFEFF${headers.map(csvCell).join(",")}\n${csvRows.join("\n")}\n`,
  "utf8",
);

const highConfidenceCount = rows.filter(
  (row) => row.confidence === "high",
).length;
console.log(`Wrote ${rows.length} duplicate candidate pair(s) to ${outputPath}`);
console.log(`${highConfidenceCount} high-confidence pair(s) require review`);
