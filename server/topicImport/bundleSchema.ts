import { z } from "zod";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const uuid = z.string().uuid();

const findingEvidenceSchema = z
  .object({
    sourceType: z.literal("finding"),
    sourceUid: uuid,
    websiteId: z.number().int().positive().nullable(),
    textSha256: sha256,
    snapshot: z.string().min(1).max(20_000),
    rank: z.number().int().positive(),
  })
  .strict();

const recommendationEvidenceSchema = z
  .object({
    sourceType: z.literal("recommendation"),
    sourceUid: uuid,
    websiteId: z.number().int().positive().nullable(),
    textSha256: sha256,
    snapshot: z.string().min(1).max(20_000),
    rank: z.number().int().positive(),
  })
  .strict();

const reportMetadataEvidenceSchema = z
  .object({
    sourceType: z.literal("report_metadata"),
    fieldName: z.enum([
      "report_title",
      "audit_organization",
      "audit_scope",
      "overall_conclusion",
      "potential_objective_summary",
    ]),
    valueSha256: sha256,
    snapshot: z.string().min(1).max(20_000),
    rank: z.number().int().positive(),
  })
  .strict();

const evidenceSchema = z.discriminatedUnion("sourceType", [
  findingEvidenceSchema,
  recommendationEvidenceSchema,
  reportMetadataEvidenceSchema,
]);

const assignmentSchema = z
  .object({
    assignmentUid: uuid,
    topicKey: z.string().min(1).max(80),
    operation: z.literal("activate"),
    rationale: z.string().min(1).max(2_000),
    modelConfidence: z.number().min(0).max(1).nullable(),
    confidenceCalibrated: z.literal(false),
    evidence: z.array(evidenceSchema).min(1).max(20),
  })
  .strict()
  .superRefine((assignment, context) => {
    const ranks = assignment.evidence.map((item) => item.rank);
    if (new Set(ranks).size !== ranks.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Evidence ranks must be unique within an assignment",
        path: ["evidence"],
      });
    }
  });

const reportSchema = z
  .object({
    sourceIdentity: z.object({ reportUid: uuid }).strict(),
    websiteIdentity: z
      .object({ reportId: z.number().int().positive() })
      .strict()
      .nullable()
      .optional(),
    sourceContentSha256: sha256,
    classifierInputSha256: sha256,
    review: z
      .object({
        state: z.literal("complete"),
        reviewId: uuid,
        reviewerId: z.string().min(1).max(120),
        completedAt: z.string().datetime(),
      })
      .strict(),
    replacement: z
      .object({
        mode: z.literal("replace-all-reviewed-topics"),
        previousAssignmentSetSha256: sha256.nullable(),
        retireTopicKeys: z.array(z.string().min(1).max(80)).max(20),
      })
      .strict(),
    assignments: z.array(assignmentSchema).max(20),
    validation: z
      .object({
        status: z.literal("valid"),
        checks: z.array(z.string().min(1).max(120)),
      })
      .strict(),
  })
  .strict()
  .superRefine((report, context) => {
    const assignmentKeys = report.assignments.map((item) => item.topicKey);
    if (new Set(assignmentKeys).size !== assignmentKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A report cannot contain duplicate topic assignments",
        path: ["assignments"],
      });
    }
    if (new Set(report.replacement.retireTopicKeys).size !== report.replacement.retireTopicKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "retireTopicKeys must be unique",
        path: ["replacement", "retireTopicKeys"],
      });
    }
  });

export const topicEvidenceBundleSchema = z
  .object({
    schemaVersion: z.literal("topic-evidence-bundle/1"),
    bundleId: uuid,
    bundleKind: z.literal("reviewed-report-snapshot-delta"),
    createdAt: z.string().datetime(),
    producer: z
      .object({
        sourceSystem: z.literal("medicaid-report-ai-miner"),
        codeRevision: z.string().min(1).max(120),
        classificationRunId: uuid,
      })
      .strict(),
    taxonomy: z
      .object({
        version: z.string().min(1).max(80),
        sha256,
      })
      .strict(),
    classifier: z
      .object({
        provider: z.string().min(1).max(40),
        model: z.string().min(1).max(120),
        modelRevision: z.string().max(120).nullable().optional(),
        promptVersion: z.string().min(1).max(80),
        outputSchemaVersion: z.literal("topic-proposal/1"),
      })
      .strict(),
    reports: z.array(reportSchema).max(100),
    integrity: z
      .object({
        canonicalization: z.literal("RFC8785-JCS"),
        payloadSha256: sha256,
        signatureAlgorithm: z.literal("Ed25519"),
        keyId: z.string().min(1).max(120),
        detachedSignature: z.string().min(1).max(256),
      })
      .strict(),
  })
  .strict()
  .superRefine((bundle, context) => {
    const reportUids = bundle.reports.map(
      (report) => report.sourceIdentity.reportUid,
    );
    if (new Set(reportUids).size !== reportUids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A bundle cannot contain duplicate report source UIDs",
        path: ["reports"],
      });
    }
  });

export type TopicEvidenceBundle = z.infer<typeof topicEvidenceBundleSchema>;

export function parseTopicEvidenceBundle(value: unknown): TopicEvidenceBundle {
  return topicEvidenceBundleSchema.parse(value);
}
