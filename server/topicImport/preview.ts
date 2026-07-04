import { randomUUID } from "node:crypto";
import { or, eq } from "drizzle-orm";

import { topicImportRuns } from "@shared/schema";
import { db, sqlClient } from "../database";
import type { TopicEvidenceBundle } from "./bundleSchema";
import type { ValidatedTopicImport } from "./validation";

export interface PreviewRecord {
  importRunId: string;
  status: string;
  idempotent: boolean;
}

export async function recordTopicImportPreview(
  bundle: TopicEvidenceBundle,
  validation: ValidatedTopicImport,
  actor: string,
): Promise<PreviewRecord> {
  const [existing] = await db
    .select()
    .from(topicImportRuns)
    .where(
      or(
        eq(topicImportRuns.bundleId, bundle.bundleId),
        eq(topicImportRuns.payloadSha256, bundle.integrity.payloadSha256),
      ),
    )
    .limit(1);
  if (existing) {
    if (
      existing.bundleId !== bundle.bundleId ||
      existing.payloadSha256 !== bundle.integrity.payloadSha256
    ) {
      throw new Error(
        "Bundle ID or payload digest conflicts with a prior import",
      );
    }
    return {
      importRunId: existing.id,
      status: existing.status,
      idempotent: true,
    };
  }

  const importRunId = randomUUID();
  const validationSummary = JSON.stringify({
    reportCount: validation.reports.length,
    assignmentCount: validation.assignmentCount,
    taxonomyStatus: validation.taxonomyStatus,
    checks: [
      "contract-valid",
      "signature-valid",
      "taxonomy-matched",
      "reports-visible",
      "evidence-owned-and-current",
    ],
  });

  await sqlClient.transaction(
    (tx) => [
      tx`
        INSERT INTO topic_import_runs (
          id,
          bundle_id,
          payload_sha256,
          schema_version,
          taxonomy_revision_id,
          signature_key_id,
          status,
          actor,
          validation_summary
        ) VALUES (
          ${importRunId},
          ${bundle.bundleId},
          ${bundle.integrity.payloadSha256},
          ${bundle.schemaVersion},
          ${validation.taxonomyRevisionId},
          ${bundle.integrity.keyId},
          'previewed',
          ${actor},
          ${validationSummary}::jsonb
        )
      `,
      ...validation.reports.map(
        (report) => tx`
          INSERT INTO topic_import_report_items (
            id,
            import_run_id,
            report_id,
            report_source_uid,
            source_content_sha256,
            classifier_input_sha256,
            replacement_mode,
            before_assignment_set_sha256,
            after_assignment_set_sha256,
            status,
            diff
          ) VALUES (
            ${randomUUID()},
            ${importRunId},
            ${report.reportId},
            ${report.reportSourceUid},
            ${
              bundle.reports.find(
                (item) =>
                  item.sourceIdentity.reportUid === report.reportSourceUid,
              )!.sourceContentSha256
            },
            ${
              bundle.reports.find(
                (item) =>
                  item.sourceIdentity.reportUid === report.reportSourceUid,
              )!.classifierInputSha256
            },
            'replace-all-reviewed-topics',
            ${report.beforeAssignmentSetSha256},
            ${report.afterAssignmentSetSha256},
            'valid',
            ${JSON.stringify(report.diff)}::jsonb
          )
        `,
      ),
    ],
    { isolationLevel: "Serializable" },
  );

  return { importRunId, status: "previewed", idempotent: false };
}
