import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { canonicalize } from "json-canonicalize";

import {
  findings,
  publicTopicDefinitions,
  publicTopics,
  recommendations,
  reportTopicAssignments,
  reports,
  topicTaxonomyRevisions,
} from "@shared/schema";
import { db } from "../database";
import type { TopicEvidenceBundle } from "./bundleSchema";

type BundleReport = TopicEvidenceBundle["reports"][number];

export interface ValidatedReportImport {
  reportId: number;
  reportSourceUid: string;
  beforeAssignmentSetSha256: string | null;
  afterAssignmentSetSha256: string;
  diff: {
    added: string[];
    changed: string[];
    removed: string[];
  };
}

export interface ValidatedTopicImport {
  taxonomyRevisionId: string;
  taxonomyStatus: string;
  reports: ValidatedReportImport[];
  assignmentCount: number;
}

function normalizeEntityText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/[^\S\n]+/g, " ");
}

function entityTextSha256(value: string): string {
  return createHash("sha256")
    .update(normalizeEntityText(value), "utf8")
    .digest("hex");
}

function assignmentSetSha256(value: unknown): string {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

async function validateFindingEvidence(
  evidence: Extract<
    BundleReport["assignments"][number]["evidence"][number],
    { sourceType: "finding" }
  >,
  reportId: number,
): Promise<void> {
  const [finding] = await db
    .select()
    .from(findings)
    .where(eq(findings.sourceUid, evidence.sourceUid))
    .limit(1);
  if (!finding || finding.reportId !== reportId) {
    throw new Error(
      `Finding ${evidence.sourceUid} does not belong to report ${reportId}`,
    );
  }
  if (evidence.websiteId !== null && evidence.websiteId !== finding.id) {
    throw new Error(`Finding ${evidence.sourceUid} website ID does not match`);
  }
  const currentHash = entityTextSha256(finding.findingText);
  const snapshotHash = entityTextSha256(evidence.snapshot);
  if (
    currentHash !== evidence.textSha256 ||
    snapshotHash !== evidence.textSha256
  ) {
    throw new Error(`Finding ${evidence.sourceUid} evidence text changed`);
  }
}

async function validateRecommendationEvidence(
  evidence: Extract<
    BundleReport["assignments"][number]["evidence"][number],
    { sourceType: "recommendation" }
  >,
  reportId: number,
): Promise<void> {
  const [recommendation] = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.sourceUid, evidence.sourceUid))
    .limit(1);
  if (!recommendation || recommendation.reportId !== reportId) {
    throw new Error(
      `Recommendation ${evidence.sourceUid} does not belong to report ${reportId}`,
    );
  }
  if (
    evidence.websiteId !== null &&
    evidence.websiteId !== recommendation.id
  ) {
    throw new Error(
      `Recommendation ${evidence.sourceUid} website ID does not match`,
    );
  }
  const currentHash = entityTextSha256(recommendation.recommendationText);
  const snapshotHash = entityTextSha256(evidence.snapshot);
  if (
    currentHash !== evidence.textSha256 ||
    snapshotHash !== evidence.textSha256
  ) {
    throw new Error(
      `Recommendation ${evidence.sourceUid} evidence text changed`,
    );
  }
}

function validateMetadataEvidence(
  evidence: Extract<
    BundleReport["assignments"][number]["evidence"][number],
    { sourceType: "report_metadata" }
  >,
  report: typeof reports.$inferSelect,
): void {
  const values = {
    report_title: report.reportTitle,
    audit_organization: report.auditOrganization,
    audit_scope: report.auditScope,
    overall_conclusion: report.overallConclusion,
    potential_objective_summary: report.potentialObjectiveSummary,
  };
  const current = values[evidence.fieldName];
  if (!current) {
    throw new Error(
      `Report ${report.id} metadata ${evidence.fieldName} is empty`,
    );
  }
  if (
    entityTextSha256(current) !== evidence.valueSha256 ||
    entityTextSha256(evidence.snapshot) !== evidence.valueSha256
  ) {
    throw new Error(
      `Report ${report.id} metadata ${evidence.fieldName} changed`,
    );
  }
}

async function validateReport(
  item: BundleReport,
  topicIdsByKey: Map<string, string>,
): Promise<ValidatedReportImport> {
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.sourceUid, item.sourceIdentity.reportUid))
    .limit(1);
  if (!report) {
    throw new Error(`Unknown report source UID ${item.sourceIdentity.reportUid}`);
  }
  if (report.hidden) {
    throw new Error(`Report ${report.id} is hidden`);
  }
  if (
    item.websiteIdentity &&
    item.websiteIdentity.reportId !== report.id
  ) {
    throw new Error(`Report ${report.id} website identity does not match`);
  }

  for (const assignment of item.assignments) {
    if (!topicIdsByKey.has(assignment.topicKey)) {
      throw new Error(`Unknown topic key ${assignment.topicKey}`);
    }
    for (const evidence of assignment.evidence) {
      if (evidence.sourceType === "finding") {
        await validateFindingEvidence(evidence, report.id);
      } else if (evidence.sourceType === "recommendation") {
        await validateRecommendationEvidence(evidence, report.id);
      } else {
        validateMetadataEvidence(evidence, report);
      }
    }
  }

  const current = await db
    .select({
      topicKey: publicTopics.topicKey,
      sourceAssignmentUid: reportTopicAssignments.sourceAssignmentUid,
      rationale: reportTopicAssignments.rationale,
      sourceReportDigest: reportTopicAssignments.sourceReportDigest,
    })
    .from(reportTopicAssignments)
    .innerJoin(
      publicTopics,
      eq(reportTopicAssignments.topicId, publicTopics.id),
    )
    .where(
      and(
        eq(reportTopicAssignments.reportId, report.id),
        isNull(reportTopicAssignments.retiredAt),
      ),
    );
  const currentSet = current
    .map((assignment) => ({
      topicKey: assignment.topicKey,
      sourceAssignmentUid: assignment.sourceAssignmentUid,
      rationale: assignment.rationale,
      sourceReportDigest: assignment.sourceReportDigest,
    }))
    .sort((left, right) => left.topicKey.localeCompare(right.topicKey));
  const beforeDigest =
    currentSet.length > 0 ? assignmentSetSha256(currentSet) : null;
  if (
    item.replacement.previousAssignmentSetSha256 !== null &&
    item.replacement.previousAssignmentSetSha256 !== beforeDigest
  ) {
    throw new Error(
      `Report ${report.id} assignment set changed since bundle creation`,
    );
  }

  const incomingByTopic = new Map(
    item.assignments.map((assignment) => [assignment.topicKey, assignment]),
  );
  const currentByTopic = new Map(
    currentSet.map((assignment) => [assignment.topicKey, assignment]),
  );
  const added = Array.from(incomingByTopic.keys()).filter(
    (topicKey) => !currentByTopic.has(topicKey),
  );
  const removed = Array.from(currentByTopic.keys()).filter(
    (topicKey) => !incomingByTopic.has(topicKey),
  );
  const changed = Array.from(incomingByTopic.entries())
    .filter(([topicKey, assignment]) => {
      const existing = currentByTopic.get(topicKey);
      return (
        existing !== undefined &&
        (existing.sourceAssignmentUid !== assignment.assignmentUid ||
          existing.rationale !== assignment.rationale ||
          existing.sourceReportDigest !== item.sourceContentSha256)
      );
    })
    .map(([topicKey]) => topicKey);

  const afterSet = item.assignments
    .map((assignment) => ({
      topicKey: assignment.topicKey,
      sourceAssignmentUid: assignment.assignmentUid,
      rationale: assignment.rationale,
      sourceReportDigest: item.sourceContentSha256,
    }))
    .sort((left, right) => left.topicKey.localeCompare(right.topicKey));

  return {
    reportId: report.id,
    reportSourceUid: item.sourceIdentity.reportUid,
    beforeAssignmentSetSha256: beforeDigest,
    afterAssignmentSetSha256: assignmentSetSha256(afterSet),
    diff: {
      added: added.sort(),
      changed: changed.sort(),
      removed: removed.sort(),
    },
  };
}

export async function validateTopicImport(
  bundle: TopicEvidenceBundle,
): Promise<ValidatedTopicImport> {
  const [taxonomy] = await db
    .select()
    .from(topicTaxonomyRevisions)
    .where(
      and(
        eq(topicTaxonomyRevisions.version, bundle.taxonomy.version),
        eq(
          topicTaxonomyRevisions.definitionSha256,
          bundle.taxonomy.sha256,
        ),
      ),
    )
    .limit(1);
  if (!taxonomy) {
    throw new Error(
      `No website taxonomy matches ${bundle.taxonomy.version} / ${bundle.taxonomy.sha256}`,
    );
  }

  const definitions = await db
    .select({
      topicId: publicTopics.id,
      topicKey: publicTopics.topicKey,
    })
    .from(publicTopicDefinitions)
    .innerJoin(
      publicTopics,
      eq(publicTopicDefinitions.topicId, publicTopics.id),
    )
    .where(
      eq(publicTopicDefinitions.taxonomyRevisionId, taxonomy.id),
    );
  const topicIdsByKey = new Map(
    definitions.map((definition) => [
      definition.topicKey,
      definition.topicId,
    ]),
  );
  const validatedReports = [];
  for (const report of bundle.reports) {
    validatedReports.push(await validateReport(report, topicIdsByKey));
  }

  return {
    taxonomyRevisionId: taxonomy.id,
    taxonomyStatus: taxonomy.status,
    reports: validatedReports,
    assignmentCount: bundle.reports.reduce(
      (count, report) => count + report.assignments.length,
      0,
    ),
  };
}
