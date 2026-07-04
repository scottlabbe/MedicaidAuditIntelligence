import { and, eq } from "drizzle-orm";

import {
  topicImportReportItems,
  topicImportRuns,
  topicTaxonomyRevisions,
} from "@shared/schema";
import { db, sqlClient } from "../database";
import type { TopicEvidenceBundle } from "./bundleSchema";
import type { ValidatedTopicImport } from "./validation";

export interface PublishResult {
  importRunId: string;
  status: "published";
  idempotent: boolean;
}

export async function activateTopicTaxonomy(
  version: string,
  definitionSha256: string,
): Promise<string> {
  const [taxonomy] = await db
    .select()
    .from(topicTaxonomyRevisions)
    .where(
      and(
        eq(topicTaxonomyRevisions.version, version),
        eq(topicTaxonomyRevisions.definitionSha256, definitionSha256),
      ),
    )
    .limit(1);
  if (!taxonomy) {
    throw new Error(`Taxonomy ${version} / ${definitionSha256} was not found`);
  }
  if (taxonomy.status === "active") {
    return taxonomy.id;
  }
  if (taxonomy.status !== "draft") {
    throw new Error(
      `Only a draft taxonomy can be activated; current status is ${taxonomy.status}`,
    );
  }

  await sqlClient.transaction(
    (tx) => [
      tx`
        UPDATE public_topic_taxonomy_revisions
        SET status = 'retired', retired_at = CURRENT_TIMESTAMP
        WHERE status = 'active' AND id <> ${taxonomy.id}
      `,
      tx`
        UPDATE public_topic_taxonomy_revisions
        SET status = 'active',
            activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
            retired_at = NULL
        WHERE id = ${taxonomy.id} AND status = 'draft'
      `,
      tx`
        SELECT 1 / CASE WHEN COUNT(*) = 1 THEN 1 ELSE 0 END
        FROM public_topic_taxonomy_revisions
        WHERE id = ${taxonomy.id} AND status = 'active'
      `,
    ],
    { isolationLevel: "Serializable" },
  );
  return taxonomy.id;
}

export async function publishTopicImport(
  bundle: TopicEvidenceBundle,
  validation: ValidatedTopicImport,
): Promise<PublishResult> {
  const [importRun] = await db
    .select()
    .from(topicImportRuns)
    .where(eq(topicImportRuns.bundleId, bundle.bundleId))
    .limit(1);
  if (!importRun) {
    throw new Error("Bundle must be previewed before publication");
  }
  if (importRun.payloadSha256 !== bundle.integrity.payloadSha256) {
    throw new Error("Previewed bundle digest does not match publication bundle");
  }
  if (importRun.status === "published") {
    return {
      importRunId: importRun.id,
      status: "published",
      idempotent: true,
    };
  }
  if (importRun.status !== "previewed") {
    throw new Error(`Import run cannot publish from status ${importRun.status}`);
  }
  if (validation.taxonomyStatus !== "active") {
    throw new Error(
      `Taxonomy must be active before publication; current status is ${validation.taxonomyStatus}`,
    );
  }

  const previewItems = await db
    .select()
    .from(topicImportReportItems)
    .where(eq(topicImportReportItems.importRunId, importRun.id));
  const previewByReport = new Map(
    previewItems.map((item) => [item.reportId, item]),
  );
  for (const report of validation.reports) {
    const preview = previewByReport.get(report.reportId);
    if (!preview) {
      throw new Error(`Report ${report.reportId} was not part of the preview`);
    }
    if (
      preview.beforeAssignmentSetSha256 !==
        report.beforeAssignmentSetSha256 ||
      preview.afterAssignmentSetSha256 !== report.afterAssignmentSetSha256
    ) {
      throw new Error(
        `Report ${report.reportId} changed after preview; preview the bundle again`,
      );
    }
  }

  const expectedAssignments = bundle.reports.reduce(
    (count, report) => count + report.assignments.length,
    0,
  );
  const expectedEvidence = bundle.reports.reduce(
    (count, report) =>
      count +
      report.assignments.reduce(
        (assignmentCount, assignment) =>
          assignmentCount + assignment.evidence.length,
        0,
      ),
    0,
  );

  await sqlClient.transaction(
    (tx) => [
      tx`
        UPDATE topic_import_runs
        SET status = 'publishing'
        WHERE id = ${importRun.id} AND status = 'previewed'
      `,
      ...bundle.reports.map(
        (report) => tx`
          UPDATE report_topic_assignments
          SET retired_at = CURRENT_TIMESTAMP,
              retirement_reason = ${
                `Replaced by reviewed topic import ${importRun.id}`
              }
          WHERE report_id = ${
            validation.reports.find(
              (item) =>
                item.reportSourceUid === report.sourceIdentity.reportUid,
            )!.reportId
          }
            AND retired_at IS NULL
        `,
      ),
      ...bundle.reports.flatMap((report) => {
        const validatedReport = validation.reports.find(
          (item) =>
            item.reportSourceUid === report.sourceIdentity.reportUid,
        )!;
        return report.assignments.map(
          (assignment) => tx`
            INSERT INTO report_topic_assignments (
              id,
              report_id,
              topic_id,
              import_run_id,
              source_assignment_uid,
              source_review_uid,
              source_report_digest,
              rationale,
              model_confidence,
              confidence_calibrated
            )
            SELECT
              ${assignment.assignmentUid},
              ${validatedReport.reportId},
              topic.id,
              ${importRun.id},
              ${assignment.assignmentUid},
              ${report.review.reviewId},
              ${report.sourceContentSha256},
              ${assignment.rationale},
              ${assignment.modelConfidence},
              FALSE
            FROM public_topics AS topic
            JOIN public_topic_definitions AS definition
              ON definition.topic_id = topic.id
             AND definition.taxonomy_revision_id = ${
               validation.taxonomyRevisionId
             }
            WHERE topic.topic_key = ${assignment.topicKey}
          `,
        );
      }),
      ...bundle.reports.flatMap((report) => {
        const validatedReport = validation.reports.find(
          (item) =>
            item.reportSourceUid === report.sourceIdentity.reportUid,
        )!;
        return report.assignments.flatMap((assignment) =>
          assignment.evidence.map((evidence) => {
            if (evidence.sourceType === "finding") {
              return tx`
                INSERT INTO report_topic_finding_evidence (
                  assignment_id,
                  finding_id,
                  finding_source_uid,
                  text_sha256,
                  snapshot,
                  rank
                )
                SELECT
                  ${assignment.assignmentUid},
                  finding.id,
                  ${evidence.sourceUid},
                  ${evidence.textSha256},
                  ${evidence.snapshot},
                  ${evidence.rank}
                FROM findings AS finding
                WHERE finding.source_uid = ${evidence.sourceUid}
                  AND finding.report_id = ${validatedReport.reportId}
              `;
            }
            if (evidence.sourceType === "recommendation") {
              return tx`
                INSERT INTO report_topic_recommendation_evidence (
                  assignment_id,
                  recommendation_id,
                  recommendation_source_uid,
                  text_sha256,
                  snapshot,
                  rank
                )
                SELECT
                  ${assignment.assignmentUid},
                  recommendation.id,
                  ${evidence.sourceUid},
                  ${evidence.textSha256},
                  ${evidence.snapshot},
                  ${evidence.rank}
                FROM recommendations AS recommendation
                WHERE recommendation.source_uid = ${evidence.sourceUid}
                  AND recommendation.report_id = ${validatedReport.reportId}
              `;
            }
            return tx`
              INSERT INTO report_topic_metadata_evidence (
                assignment_id,
                field_name,
                value_sha256,
                snapshot,
                rank
              ) VALUES (
                ${assignment.assignmentUid},
                ${evidence.fieldName},
                ${evidence.valueSha256},
                ${evidence.snapshot},
                ${evidence.rank}
              )
            `;
          }),
        );
      }),
      tx`
        UPDATE report_topic_assignments AS retired
        SET replaced_by_assignment_id = replacement.id
        FROM report_topic_assignments AS replacement
        WHERE retired.import_run_id <> ${importRun.id}
          AND retired.retired_at IS NOT NULL
          AND retired.replaced_by_assignment_id IS NULL
          AND replacement.import_run_id = ${importRun.id}
          AND replacement.report_id = retired.report_id
          AND replacement.topic_id = retired.topic_id
      `,
      tx`
        SELECT 1 / CASE WHEN COUNT(*) = ${bundle.reports.length} THEN 1 ELSE 0 END
        FROM reports
        WHERE id = ANY(${
          validation.reports.map((report) => report.reportId)
        }::int[])
          AND hidden = FALSE
      `,
      tx`
        SELECT 1 / CASE WHEN COUNT(*) = ${expectedAssignments} THEN 1 ELSE 0 END
        FROM report_topic_assignments
        WHERE import_run_id = ${importRun.id}
      `,
      tx`
        SELECT 1 / CASE WHEN (
          (SELECT COUNT(*)
           FROM report_topic_finding_evidence AS evidence
           JOIN report_topic_assignments AS assignment
             ON assignment.id = evidence.assignment_id
           WHERE assignment.import_run_id = ${importRun.id})
          +
          (SELECT COUNT(*)
           FROM report_topic_recommendation_evidence AS evidence
           JOIN report_topic_assignments AS assignment
             ON assignment.id = evidence.assignment_id
           WHERE assignment.import_run_id = ${importRun.id})
          +
          (SELECT COUNT(*)
           FROM report_topic_metadata_evidence AS evidence
           JOIN report_topic_assignments AS assignment
             ON assignment.id = evidence.assignment_id
           WHERE assignment.import_run_id = ${importRun.id})
        ) = ${expectedEvidence} THEN 1 ELSE 0 END
      `,
      tx`
        UPDATE topic_import_report_items
        SET status = 'published'
        WHERE import_run_id = ${importRun.id}
      `,
      tx`
        UPDATE topic_import_runs
        SET status = 'published', published_at = CURRENT_TIMESTAMP
        WHERE id = ${importRun.id} AND status = 'publishing'
      `,
    ],
    { isolationLevel: "Serializable" },
  );

  return {
    importRunId: importRun.id,
    status: "published",
    idempotent: false,
  };
}
