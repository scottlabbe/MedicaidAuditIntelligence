import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uuid,
  doublePrecision,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const severityEnum = pgEnum("severity", ["info", "low", "medium", "high"]);

// Core tables
export const reports = pgTable("reports", {
  id: integer("id").primaryKey(),
  sourceUid: uuid("source_uid").notNull().unique(),
  reportTitle: varchar("report_title").notNull(),
  auditOrganization: varchar("audit_organization").notNull(),
  publicationYear: integer("publication_year").notNull(),
  publicationMonth: integer("publication_month"),
  publicationDay: integer("publication_day"),
  overallConclusion: text("overall_conclusion"),
  llmInsight: text("llm_insight"),
  potentialObjectiveSummary: text("potential_objective_summary"),
  originalReportSourceUrl: varchar("original_report_source_url"),
  state: varchar("state").notNull(),
  totalFinancialImpact: integer("total_financial_impact"),
  auditPeriodStartDate: varchar("audit_period_start_date"),
  auditPeriodEndDate: varchar("audit_period_end_date"), 
  auditPeriodDescription: text("audit_period_description"),
  originalFilename: varchar("original_filename"),
  fileHash: varchar("file_hash").unique(),
  pdfStoragePath: varchar("pdf_storage_path"),
  fileSizeBytes: integer("file_size_bytes"),
  featured: boolean("featured").default(false),
  status: varchar("status"),
  processingStatus: varchar("processing_status"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  auditScope: text("audit_scope"),
  hidden: boolean("hidden").default(false),
});

export const objectives = pgTable("objectives", {
  id: integer("id").primaryKey(),
  sourceUid: uuid("source_uid").notNull().unique(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  objectiveText: text("objective_text").notNull(),
});

export const findings = pgTable("findings", {
  id: integer("id").primaryKey(),
  sourceUid: uuid("source_uid").notNull().unique(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  findingText: text("finding_text").notNull(),
  financialImpact: integer("financial_impact"),
});

export const recommendations = pgTable("recommendations", {
  id: integer("id").primaryKey(),
  sourceUid: uuid("source_uid").notNull().unique(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  recommendationText: text("recommendation_text").notNull(),
  relatedFindingId: integer("related_finding_id").references(() => findings.id),
});

export const topicTaxonomyRevisions = pgTable(
  "public_topic_taxonomy_revisions",
  {
    id: uuid("id").primaryKey(),
    version: varchar("version", { length: 80 }).notNull().unique(),
    schemaVersion: varchar("schema_version", { length: 80 }).notNull(),
    definitionSha256: varchar("definition_sha256", { length: 64 })
      .notNull()
      .unique(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "ck_public_topic_taxonomy_status",
      sql`${table.status} IN ('draft', 'active', 'retired')`,
    ),
    uniqueIndex("uq_public_topic_taxonomy_active")
      .on(table.status)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const publicTopics = pgTable("public_topics", {
  id: uuid("id").primaryKey(),
  topicKey: varchar("topic_key", { length: 80 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
});

export const publicTopicDefinitions = pgTable(
  "public_topic_definitions",
  {
    id: uuid("id").primaryKey(),
    taxonomyRevisionId: uuid("taxonomy_revision_id")
      .notNull()
      .references(() => topicTaxonomyRevisions.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => publicTopics.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    shortDescription: text("short_description").notNull(),
    scope: text("scope").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    uniqueIndex("uq_public_topic_definition_revision_topic").on(
      table.taxonomyRevisionId,
      table.topicId,
    ),
    uniqueIndex("uq_public_topic_definition_revision_slug").on(
      table.taxonomyRevisionId,
      table.slug,
    ),
    check("ck_public_topic_definition_sort_order", sql`${table.sortOrder} > 0`),
  ],
);

export const publicTopicSlugAliases = pgTable(
  "public_topic_slug_aliases",
  {
    aliasSlug: varchar("alias_slug", { length: 120 }).primaryKey(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => publicTopics.id, { onDelete: "restrict" }),
    redirectStatus: integer("redirect_status").notNull().default(301),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "ck_public_topic_alias_redirect",
      sql`${table.redirectStatus} IN (301, 308)`,
    ),
  ],
);

export const topicImportRuns = pgTable(
  "topic_import_runs",
  {
    id: uuid("id").primaryKey(),
    bundleId: uuid("bundle_id").notNull().unique(),
    payloadSha256: varchar("payload_sha256", { length: 64 }).notNull().unique(),
    schemaVersion: varchar("schema_version", { length: 80 }).notNull(),
    taxonomyRevisionId: uuid("taxonomy_revision_id")
      .notNull()
      .references(() => topicTaxonomyRevisions.id, { onDelete: "restrict" }),
    signatureKeyId: varchar("signature_key_id", { length: 120 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    actor: varchar("actor", { length: 120 }).notNull(),
    validationSummary: jsonb("validation_summary").notNull().default({}),
    errorDetails: text("error_details"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "ck_topic_import_runs_status",
      sql`${table.status} IN ('previewed', 'publishing', 'published', 'rejected', 'rolled_back')`,
    ),
    index("ix_topic_import_runs_status_received").on(table.status, table.receivedAt),
  ],
);

export const topicImportReportItems = pgTable(
  "topic_import_report_items",
  {
    id: uuid("id").primaryKey(),
    importRunId: uuid("import_run_id")
      .notNull()
      .references(() => topicImportRuns.id, { onDelete: "cascade" }),
    reportId: integer("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "restrict" }),
    reportSourceUid: uuid("report_source_uid").notNull(),
    sourceContentSha256: varchar("source_content_sha256", { length: 64 }).notNull(),
    classifierInputSha256: varchar("classifier_input_sha256", { length: 64 }).notNull(),
    replacementMode: varchar("replacement_mode", { length: 60 }).notNull(),
    beforeAssignmentSetSha256: varchar("before_assignment_set_sha256", {
      length: 64,
    }),
    afterAssignmentSetSha256: varchar("after_assignment_set_sha256", {
      length: 64,
    }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    diff: jsonb("diff").notNull(),
  },
  (table) => [
    uniqueIndex("uq_topic_import_report_item").on(
      table.importRunId,
      table.reportId,
    ),
    check(
      "ck_topic_import_report_item_status",
      sql`${table.status} IN ('valid', 'invalid', 'published', 'rolled_back')`,
    ),
    check(
      "ck_topic_import_replacement_mode",
      sql`${table.replacementMode} = 'replace-all-reviewed-topics'`,
    ),
  ],
);

export const reportTopicAssignments = pgTable(
  "report_topic_assignments",
  {
    id: uuid("id").primaryKey(),
    reportId: integer("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => publicTopics.id, { onDelete: "restrict" }),
    importRunId: uuid("import_run_id")
      .notNull()
      .references(() => topicImportRuns.id, { onDelete: "restrict" }),
    sourceAssignmentUid: uuid("source_assignment_uid").notNull().unique(),
    sourceReviewUid: uuid("source_review_uid").notNull(),
    sourceReportDigest: varchar("source_report_digest", { length: 64 }).notNull(),
    rationale: text("rationale").notNull(),
    modelConfidence: doublePrecision("model_confidence"),
    confidenceCalibrated: boolean("confidence_calibrated")
      .notNull()
      .default(false),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    retirementReason: text("retirement_reason"),
    replacedByAssignmentId: uuid("replaced_by_assignment_id"),
  },
  (table) => [
    uniqueIndex("uq_report_topic_assignment_active")
      .on(table.reportId, table.topicId)
      .where(sql`${table.retiredAt} IS NULL`),
    index("ix_report_topic_assignment_topic_active")
      .on(table.topicId, table.reportId)
      .where(sql`${table.retiredAt} IS NULL`),
    check(
      "ck_report_topic_assignment_confidence",
      sql`${table.modelConfidence} IS NULL OR (${table.modelConfidence} >= 0 AND ${table.modelConfidence} <= 1)`,
    ),
    check(
      "ck_report_topic_assignment_calibration",
      sql`${table.confidenceCalibrated} = false`,
    ),
  ],
);

export const reportTopicFindingEvidence = pgTable(
  "report_topic_finding_evidence",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => reportTopicAssignments.id, { onDelete: "cascade" }),
    findingId: integer("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "restrict" }),
    findingSourceUid: uuid("finding_source_uid").notNull(),
    textSha256: varchar("text_sha256", { length: 64 }).notNull(),
    snapshot: text("snapshot").notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assignmentId, table.findingId] }),
    check("ck_report_topic_finding_rank", sql`${table.rank} > 0`),
  ],
);

export const reportTopicRecommendationEvidence = pgTable(
  "report_topic_recommendation_evidence",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => reportTopicAssignments.id, { onDelete: "cascade" }),
    recommendationId: integer("recommendation_id")
      .notNull()
      .references(() => recommendations.id, { onDelete: "restrict" }),
    recommendationSourceUid: uuid("recommendation_source_uid").notNull(),
    textSha256: varchar("text_sha256", { length: 64 }).notNull(),
    snapshot: text("snapshot").notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assignmentId, table.recommendationId] }),
    check("ck_report_topic_recommendation_rank", sql`${table.rank} > 0`),
  ],
);

export const reportTopicMetadataEvidence = pgTable(
  "report_topic_metadata_evidence",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => reportTopicAssignments.id, { onDelete: "cascade" }),
    fieldName: varchar("field_name", { length: 80 }).notNull(),
    valueSha256: varchar("value_sha256", { length: 64 }).notNull(),
    snapshot: text("snapshot").notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assignmentId, table.fieldName] }),
    check(
      "ck_report_topic_metadata_field",
      sql`${table.fieldName} IN ('report_title', 'audit_organization', 'audit_scope', 'overall_conclusion', 'potential_objective_summary')`,
    ),
    check("ck_report_topic_metadata_rank", sql`${table.rank} > 0`),
  ],
);

// Note: Using existing keyword_mappings table with canonical_keyword and report_count fields

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const reportPrograms = pgTable("report_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").references(() => reports.id).notNull(),
  programId: varchar("program_id").references(() => programs.id).notNull(),
});

// Operational tables
export const aiProcessingLogs = pgTable("ai_processing_logs", {
  id: integer("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  modelName: varchar("model_name").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  inputCost: integer("input_cost"), // Using integer to match database type (double precision mapped to number)
  outputCost: integer("output_cost"),
  totalCost: integer("total_cost"),
  processingTimeMs: integer("processing_time_ms"),
  extractionStatus: varchar("extraction_status"),
  errorDetails: text("error_details"),
  createdAt: timestamp("created_at"),
});

export const scrapingQueue = pgTable("scraping_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").default(5),
  retryCount: integer("retry_count").default(0),
  lastAttempt: timestamp("last_attempt"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const duplicateChecks = pgTable("duplicate_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").references(() => reports.id).notNull(),
  potentialDuplicateId: varchar("potential_duplicate_id").references(() => reports.id).notNull(),
  similarity: integer("similarity"),
  status: text("status").default("pending"),
  reviewedAt: timestamp("reviewed_at"),
});

export const searchHistory = pgTable("search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  filters: jsonb("filters"),
  resultCount: integer("result_count"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
});

// Keyword aggregation type
export interface KeywordWithCount {
  keyword: string;
  reportCount: number;
}

export const insertFindingSchema = createInsertSchema(findings).omit({
  id: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
});

// Types
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = z.infer<typeof insertObjectiveSchema>;
export type Finding = typeof findings.$inferSelect;
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;

// Legacy user types (kept for backwards compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
