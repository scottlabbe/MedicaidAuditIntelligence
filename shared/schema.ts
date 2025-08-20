import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const severityEnum = pgEnum("severity", ["info", "low", "medium", "high"]);

// Core tables
export const reports = pgTable("reports", {
  id: integer("id").primaryKey(),
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
  reportId: integer("report_id").references(() => reports.id).notNull(),
  objectiveText: text("objective_text").notNull(),
});

export const findings = pgTable("findings", {
  id: integer("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  findingText: text("finding_text").notNull(),
  financialImpact: integer("financial_impact"),
});

export const recommendations = pgTable("recommendations", {
  id: integer("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id).notNull(),
  recommendationText: text("recommendation_text").notNull(),
  relatedFindingId: integer("related_finding_id").references(() => findings.id),
});

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
