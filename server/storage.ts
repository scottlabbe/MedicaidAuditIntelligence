import { eq, and, desc, asc, ilike, sql, or, inArray } from "drizzle-orm";

// Federal agencies for filtering federal reports
const FEDERAL_AGENCIES = [
  "HHS OIG",
  "Office of Inspector General, HHS", 
  "GAO",
  "Government Accountability Office",
  "Centers for Medicare & Medicaid Services",
  "CMS",
  "Medicaid.gov"
];
import { db } from "./database";
import {
  reports,
  objectives,
  findings,
  recommendations,
  programs,
  reportPrograms,
  aiProcessingLogs,
  topicTaxonomyRevisions,
  publicTopics,
  publicTopicDefinitions,
  publicTopicSlugAliases,
  reportTopicAssignments,
  reportTopicFindingEvidence,
  reportTopicRecommendationEvidence,
  reportTopicMetadataEvidence,
  type Report,
  type InsertReport,
  type User,
  type InsertUser,
  type KeywordWithCount,
  users,
} from "@shared/schema";

import type {
  ReportWithDetails,
  ReportListItem,
  SearchFilters,
  SearchResponse,
  DashboardStats,
  StateLatestResponse,
  IndexableStateSummary,
  StateLandingPageData,
  AgencySummary,
  AgencyLandingPageData,
  TopicSummary,
  TopicLandingPageData,
  TopicEvidence,
  TopicSlugResolution,
} from "../client/src/lib/types";
import { getStateEntryByCode } from "@shared/states";
import { getTopicGuideContent } from "@shared/topicGuides";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function metadataEvidenceLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    report_title: "Report title",
    audit_organization: "Publishing agency",
    audit_scope: "Audit scope",
    overall_conclusion: "Overall conclusion",
    potential_objective_summary: "Audit objective",
  };

  return labels[fieldName] || "Report metadata";
}

function evidenceTypeOrder(
  sourceType: TopicEvidence["sourceType"],
): number {
  return {
    finding: 0,
    recommendation: 1,
    metadata: 2,
  }[sourceType];
}

export interface IStorage {
  // Reports
  getReports(filters?: SearchFilters, page?: number, pageSize?: number): Promise<SearchResponse>;
  getReportById(id: string): Promise<ReportWithDetails | undefined>;
  getFeaturedReports(limit?: number): Promise<ReportListItem[]>;
  createReport(report: InsertReport): Promise<Report>;
  getLatestReportsByState(limit: number, scope: 'state' | 'federal'): Promise<StateLatestResponse>;
  getIndexableStates(limit?: number): Promise<IndexableStateSummary[]>;
  getStateLandingPage(stateCode: string, limit?: number): Promise<StateLandingPageData | undefined>;
  getAgenciesWithCounts(limit?: number): Promise<AgencySummary[]>;
  getAgencyLandingPage(slug: string, limit?: number): Promise<AgencyLandingPageData | undefined>;
  getTopicsWithCounts(): Promise<TopicSummary[]>;
  resolveTopicSlug(slug: string): Promise<TopicSlugResolution>;
  getTopicLandingPage(slug: string, limit?: number): Promise<TopicLandingPageData | undefined>;
  
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getReports(filters: SearchFilters = {}, page = 1, pageSize = 24): Promise<SearchResponse> {
    const offset = (page - 1) * pageSize;
    
    // Base query
    let query: any = db
      .select({
        id: reports.id,
        reportTitle: reports.reportTitle,
        state: reports.state,
        auditOrganization: reports.auditOrganization,
        publicationYear: reports.publicationYear,
        publicationMonth: reports.publicationMonth,
        publicationDay: reports.publicationDay,
        overallConclusion: reports.overallConclusion,
        llmInsight: reports.llmInsight,
        potentialObjectiveSummary: reports.potentialObjectiveSummary,
        auditScope: reports.auditScope,
        originalReportSourceUrl: reports.originalReportSourceUrl,
        totalFinancialImpact: reports.totalFinancialImpact,
        findingCount: sql<number>`(
          select count(*)
          from ${findings}
          where ${findings.reportId} = ${reports.id}
        )`,
        recommendationCount: sql<number>`(
          select count(*)
          from ${recommendations}
          where ${recommendations.reportId} = ${reports.id}
        )`,
        originalFilename: reports.originalFilename,
        fileHash: reports.fileHash,
        featured: reports.featured,
        status: reports.status,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
      })
      .from(reports);

    // Apply filters
    const conditions = [];

    if (filters.query) {
      conditions.push(
        or(
          ilike(reports.reportTitle, `%${filters.query}%`),
          ilike(reports.auditOrganization, `%${filters.query}%`),
          ilike(reports.overallConclusion, `%${filters.query}%`)
        )
      );
    }

    if (filters.state) {
      conditions.push(eq(reports.state, filters.state));
    }

    if (filters.agency) {
      conditions.push(ilike(reports.auditOrganization, `%${filters.agency}%`));
    }

    if (filters.year) {
      conditions.push(eq(reports.publicationYear, filters.year));
    }

    if (filters.theme) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM ${reportTopicAssignments} assignment
        INNER JOIN ${publicTopics} topic
          ON topic.id = assignment.topic_id
        INNER JOIN ${publicTopicDefinitions} definition
          ON definition.topic_id = topic.id
        INNER JOIN ${topicTaxonomyRevisions} revision
          ON revision.id = definition.taxonomy_revision_id
        WHERE assignment.report_id = ${reports.id}
          AND definition.slug = ${filters.theme}
          AND revision.status = 'active'
          AND topic.retired_at IS NULL
          AND assignment.retired_at IS NULL
      )`);
    }

    if (filters.sourceStatus === "available") {
      conditions.push(
        sql`${reports.originalReportSourceUrl} is not null and ${reports.originalReportSourceUrl} <> ''`,
      );
    } else if (filters.sourceStatus === "record") {
      conditions.push(
        sql`${reports.originalReportSourceUrl} is null or ${reports.originalReportSourceUrl} = ''`,
      );
    }

    // Filter out hidden reports
    conditions.push(eq(reports.hidden, false));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count
    let totalQuery: any = db
      .select({ count: sql<number>`count(*)` })
      .from(reports);
    
    if (conditions.length > 0) {
      totalQuery = totalQuery.where(and(...conditions));
    }

    // Apply sorting based on sortBy parameter
    let sortedQuery: any = query;
    const sortBy = filters.sortBy || "date_desc";
    
    switch (sortBy) {
      case "date_asc":
        sortedQuery = query.orderBy(
          reports.publicationYear,
          reports.publicationMonth,
          reports.publicationDay
        );
        break;
      case "title":
        sortedQuery = query.orderBy(reports.reportTitle);
        break;
      case "state":
        sortedQuery = query.orderBy(reports.state, desc(reports.publicationYear));
        break;
      case "date_desc":
      default:
        sortedQuery = query.orderBy(
          desc(reports.publicationYear),
          desc(reports.publicationMonth),
          desc(reports.publicationDay)
        );
        break;
    }

    const [items, totalResult] = await Promise.all([
      sortedQuery
        .limit(pageSize)
        .offset(offset),
      totalQuery
    ]);

    const total = totalResult[0]?.count || 0;

    // Return items with basic data (no complex relationships for now)
    const enhancedItems: ReportListItem[] = items.map((item: any) => ({
      ...item,
      publicationMonth: item.publicationMonth ?? undefined,
      publicationDay: item.publicationDay ?? undefined,
      overallConclusion: item.overallConclusion ?? undefined,
      llmInsight: item.llmInsight ?? undefined,
      potentialObjectiveSummary: item.potentialObjectiveSummary ?? undefined,
      auditScope: item.auditScope ?? undefined,
      originalReportSourceUrl: item.originalReportSourceUrl ?? undefined,
      totalFinancialImpact: item.totalFinancialImpact ?? undefined,
      findingCount: Number(item.findingCount) || 0,
      recommendationCount: Number(item.recommendationCount) || 0,
      originalFilename: item.originalFilename ?? undefined,
      fileHash: item.fileHash ?? undefined,
      featured: item.featured ?? undefined,
      status: item.status ?? undefined,
      createdAt: item.createdAt ?? undefined,
      updatedAt: item.updatedAt ?? undefined,
      keywords: [],
      programs: [],
      conclusionExcerpt: item.overallConclusion ? 
        item.overallConclusion.substring(0, 200) + (item.overallConclusion.length > 200 ? "..." : "") :
        undefined,
    }));

    return {
      items: enhancedItems,
      total,
      page,
      pageSize,
      filters,
    };
  }

  async getReportById(id: string): Promise<ReportWithDetails | undefined> {
    const reportId = parseInt(id);
    if (isNaN(reportId)) {
      return undefined;
    }
    
    const report = await db.select().from(reports).where(and(eq(reports.id, reportId), eq(reports.hidden, false))).limit(1);
    
    if (!report[0]) {
      return undefined;
    }

    const [objectivesList, findingsList, recommendationsList] = await Promise.all([
      db.select().from(objectives).where(eq(objectives.reportId, reportId)),
      db.select().from(findings).where(eq(findings.reportId, reportId)),
      db.select().from(recommendations).where(eq(recommendations.reportId, reportId)),
    ]);

    // Get model name from the most recent AI processing log for this report
    let modelName: string | undefined = undefined;
    try {
      const aiLog = await db
        .select({ modelName: aiProcessingLogs.modelName })
        .from(aiProcessingLogs)
        .where(eq(aiProcessingLogs.reportId, reportId))
        .orderBy(desc(aiProcessingLogs.createdAt))
        .limit(1);
      
      modelName = aiLog[0]?.modelName;
    } catch (error) {
      console.warn("Could not fetch model name for report", reportId, ":", error);
    }

    return {
      ...report[0],
      publicationMonth: report[0].publicationMonth ?? undefined,
      publicationDay: report[0].publicationDay ?? undefined,
      overallConclusion: report[0].overallConclusion ?? undefined,
      llmInsight: report[0].llmInsight ?? undefined,
      potentialObjectiveSummary: report[0].potentialObjectiveSummary ?? undefined,
      auditScope: report[0].auditScope ?? undefined,
      originalReportSourceUrl: report[0].originalReportSourceUrl ?? undefined,
      totalFinancialImpact: report[0].totalFinancialImpact ?? undefined,
      originalFilename: report[0].originalFilename ?? undefined,
      fileHash: report[0].fileHash ?? undefined,
      featured: report[0].featured ?? undefined,
      status: report[0].status ?? undefined,
      createdAt: report[0].createdAt ?? undefined,
      updatedAt: report[0].updatedAt ?? undefined,
      modelName: modelName,
      objectives: objectivesList,
      findings: findingsList.map(f => ({
        ...f,
        financialImpact: f.financialImpact ?? undefined,
      })),
      recommendations: recommendationsList.map(r => ({
        ...r,
        relatedFindingId: r.relatedFindingId ?? undefined,
      })),
      keywords: [],
      programs: [],
    };
  }

  async getFeaturedReports(limit = 6): Promise<ReportListItem[]> {
    const items = await db
      .select({
        id: reports.id,
        reportTitle: reports.reportTitle,
        state: reports.state,
        auditOrganization: reports.auditOrganization,
        publicationYear: reports.publicationYear,
        publicationMonth: reports.publicationMonth,
        publicationDay: reports.publicationDay,
        overallConclusion: reports.overallConclusion,
        llmInsight: reports.llmInsight,
        potentialObjectiveSummary: reports.potentialObjectiveSummary,
        auditScope: reports.auditScope,
        originalReportSourceUrl: reports.originalReportSourceUrl,
        totalFinancialImpact: reports.totalFinancialImpact,
        originalFilename: reports.originalFilename,
        fileHash: reports.fileHash,
        featured: reports.featured,
        status: reports.status,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
      })
      .from(reports)
      .where(and(eq(reports.featured, true), eq(reports.hidden, false)))
      .orderBy(desc(reports.publicationYear), desc(reports.publicationMonth))
      .limit(limit);

    return items.map((item: any) => ({
      ...item,
      publicationMonth: item.publicationMonth ?? undefined,
      publicationDay: item.publicationDay ?? undefined,
      overallConclusion: item.overallConclusion ?? undefined,
      llmInsight: item.llmInsight ?? undefined,
      potentialObjectiveSummary: item.potentialObjectiveSummary ?? undefined,
      auditScope: item.auditScope ?? undefined,
      originalReportSourceUrl: item.originalReportSourceUrl ?? undefined,
      totalFinancialImpact: item.totalFinancialImpact ?? undefined,
      originalFilename: item.originalFilename ?? undefined,
      fileHash: item.fileHash ?? undefined,
      featured: item.featured ?? undefined,
      status: item.status ?? undefined,
      createdAt: item.createdAt ?? undefined,
      updatedAt: item.updatedAt ?? undefined,
      keywords: [],
      programs: [],
      conclusionExcerpt: item.overallConclusion ? 
        item.overallConclusion.substring(0, 200) + (item.overallConclusion.length > 200 ? "..." : "") :
        undefined,
    }));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report as any).returning();
    return result[0];
  }

  async getLatestReportsByState(limit = 3, scope: 'state' | 'federal' = 'state'): Promise<StateLatestResponse> {
    const safeLimit = Math.min(limit, 5);
    
    if (scope === 'federal') {
      // Get federal reports
      const federalReports = await db
        .select({
          id: reports.id,
          reportTitle: reports.reportTitle,
          auditOrganization: reports.auditOrganization,
          publicationYear: reports.publicationYear,
          publicationMonth: reports.publicationMonth,
          publicationDay: reports.publicationDay,
          originalReportSourceUrl: reports.originalReportSourceUrl,
        })
        .from(reports)
        .where(
          and(
            eq(reports.hidden, false),
            inArray(reports.auditOrganization, FEDERAL_AGENCIES)
          )
        )
        .orderBy(
          desc(reports.publicationYear),
          desc(reports.publicationMonth),
          desc(reports.publicationDay)
        )
        .limit(safeLimit);

      const byKey: Record<string, any[]> = {
        FED: federalReports.map(r => ({
          id: r.id,
          title: r.reportTitle,
          agency: r.auditOrganization,
          publicationDate: new Date(
            r.publicationYear,
            (r.publicationMonth || 1) - 1,
            r.publicationDay || 1
          ).toISOString(),
          url: r.originalReportSourceUrl || `/report/${r.id}`,
        }))
      };

      return { byKey, updatedAt: new Date().toISOString() };
    }

    // Get state reports - using window function for latest N per state
    const stateReports = await db.execute(sql`
      WITH ranked AS (
        SELECT 
          id,
          report_title,
          state,
          audit_organization,
          publication_year,
          publication_month,
          publication_day,
          original_report_source_url,
          ROW_NUMBER() OVER (
            PARTITION BY state 
            ORDER BY publication_year DESC, 
                     COALESCE(publication_month, 1) DESC,
                     COALESCE(publication_day, 1) DESC
          ) as rn
        FROM reports
        WHERE COALESCE(hidden, false) = false
          AND state IS NOT NULL
          AND state != ''
      )
      SELECT * FROM ranked WHERE rn <= ${safeLimit}
    `);

    // Group by state
    const byKey: Record<string, any[]> = {};
    for (const row of stateReports.rows as any[]) {
      const state = row.state;
      if (!byKey[state]) byKey[state] = [];
      
      byKey[state].push({
        id: row.id,
        title: row.report_title,
        state: row.state,
        agency: row.audit_organization,
        publicationDate: new Date(
          row.publication_year,
          (row.publication_month || 1) - 1,
          row.publication_day || 1
        ).toISOString(),
        url: row.original_report_source_url || `/report/${row.id}`,
      });
    }

    return { byKey, updatedAt: new Date().toISOString() };
  }

  async getIndexableStates(limit = 50): Promise<IndexableStateSummary[]> {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          id,
          report_title,
          state,
          audit_organization,
          publication_year,
          publication_month,
          publication_day,
          overall_conclusion,
          llm_insight,
          potential_objective_summary,
          audit_scope,
          original_report_source_url,
          original_filename,
          file_hash,
          featured,
          status,
          created_at,
          updated_at,
          COUNT(*) OVER (PARTITION BY state) AS report_count,
          ROW_NUMBER() OVER (
            PARTITION BY state
            ORDER BY publication_year DESC,
                     COALESCE(publication_month, 1) DESC,
                     COALESCE(publication_day, 1) DESC,
                     id DESC
          ) AS rn
        FROM reports
        WHERE COALESCE(hidden, false) = false
          AND state IS NOT NULL
          AND state != ''
      )
      SELECT *
      FROM ranked
      WHERE rn = 1
      ORDER BY report_count DESC, state ASC
      LIMIT ${limit}
    `);

    return (result.rows as any[]).reduce<IndexableStateSummary[]>((items, row) => {
      const stateEntry = getStateEntryByCode(row.state);
      if (!stateEntry) {
        return items;
      }

      const latestReport: ReportListItem = {
        id: row.id,
        reportTitle: row.report_title,
        state: row.state,
        auditOrganization: row.audit_organization,
        publicationYear: row.publication_year,
        publicationMonth: row.publication_month ?? undefined,
        publicationDay: row.publication_day ?? undefined,
        overallConclusion: row.overall_conclusion ?? undefined,
        llmInsight: row.llm_insight ?? undefined,
        potentialObjectiveSummary: row.potential_objective_summary ?? undefined,
        auditScope: row.audit_scope ?? undefined,
        originalReportSourceUrl: row.original_report_source_url ?? undefined,
        originalFilename: row.original_filename ?? undefined,
        fileHash: row.file_hash ?? undefined,
        featured: row.featured ?? undefined,
        status: row.status ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
        keywords: [],
        programs: [],
        conclusionExcerpt: row.overall_conclusion
          ? row.overall_conclusion.substring(0, 200) + (row.overall_conclusion.length > 200 ? "..." : "")
          : undefined,
      };

      items.push({
        code: stateEntry.code,
        name: stateEntry.name,
        slug: stateEntry.slug,
        reportCount: Number(row.report_count) || 0,
        latestReport,
      });

      return items;
    }, []);
  }

  async getStateLandingPage(stateCode: string, limit = 12): Promise<StateLandingPageData | undefined> {
    const stateEntry = getStateEntryByCode(stateCode);
    if (!stateEntry) {
      return undefined;
    }

    const results = await this.getReports(
      { state: stateEntry.code, sortBy: "date_desc" },
      1,
      limit,
    );

    if (results.total === 0) {
      return undefined;
    }

    return {
      code: stateEntry.code,
      name: stateEntry.name,
      slug: stateEntry.slug,
      reportCount: results.total,
      latestReport: results.items[0],
      reports: results.items,
    };
  }

  async getAgenciesWithCounts(limit = 200): Promise<AgencySummary[]> {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          id,
          report_title,
          state,
          audit_organization,
          publication_year,
          publication_month,
          publication_day,
          overall_conclusion,
          llm_insight,
          potential_objective_summary,
          audit_scope,
          original_report_source_url,
          original_filename,
          file_hash,
          featured,
          status,
          created_at,
          updated_at,
          COUNT(*) OVER (PARTITION BY audit_organization) AS report_count,
          ROW_NUMBER() OVER (
            PARTITION BY audit_organization
            ORDER BY publication_year DESC,
                     COALESCE(publication_month, 1) DESC,
                     COALESCE(publication_day, 1) DESC,
                     id DESC
          ) AS rn
        FROM reports
        WHERE COALESCE(hidden, false) = false
          AND audit_organization IS NOT NULL
          AND audit_organization != ''
      )
      SELECT *
      FROM ranked
      WHERE rn = 1
      ORDER BY report_count DESC, audit_organization ASC
      LIMIT ${limit}
    `);

    const slugCounts = new Map<string, number>();

    return (result.rows as any[]).map((row) => {
      const baseSlug = slugify(row.audit_organization);
      const occurrence = (slugCounts.get(baseSlug) || 0) + 1;
      slugCounts.set(baseSlug, occurrence);

      return {
        slug: occurrence === 1 ? baseSlug : `${baseSlug}--${occurrence}`,
        name: row.audit_organization,
        reportCount: Number(row.report_count) || 0,
        latestReport: {
          id: row.id,
          reportTitle: row.report_title,
          state: row.state,
          auditOrganization: row.audit_organization,
          publicationYear: row.publication_year,
          publicationMonth: row.publication_month ?? undefined,
          publicationDay: row.publication_day ?? undefined,
          overallConclusion: row.overall_conclusion ?? undefined,
          llmInsight: row.llm_insight ?? undefined,
          potentialObjectiveSummary: row.potential_objective_summary ?? undefined,
          auditScope: row.audit_scope ?? undefined,
          originalReportSourceUrl: row.original_report_source_url ?? undefined,
          originalFilename: row.original_filename ?? undefined,
          fileHash: row.file_hash ?? undefined,
          featured: row.featured ?? undefined,
          status: row.status ?? undefined,
          createdAt: row.created_at ?? undefined,
          updatedAt: row.updated_at ?? undefined,
          keywords: [],
          programs: [],
          conclusionExcerpt: row.overall_conclusion
            ? row.overall_conclusion.substring(0, 200) +
              (row.overall_conclusion.length > 200 ? "..." : "")
            : undefined,
        },
      };
    });
  }

  async getAgencyLandingPage(slug: string, limit = 24): Promise<AgencyLandingPageData | undefined> {
    const agencies = await this.getAgenciesWithCounts(500);
    const agency = agencies.find((item) => item.slug === slug);
    if (!agency) return undefined;

    const results = await this.getReports(
      { agency: agency.name, sortBy: "date_desc" },
      1,
      limit,
    );

    return {
      ...agency,
      reportCount: results.total,
      latestReport: results.items[0],
      reports: results.items,
    };
  }

  async getTopicsWithCounts(): Promise<TopicSummary[]> {
    const result = await db
      .select({
        slug: publicTopicDefinitions.slug,
        name: publicTopicDefinitions.name,
        shortDescription: publicTopicDefinitions.shortDescription,
        scope: publicTopicDefinitions.scope,
        reportCount: sql<number>`count(distinct case
          when ${reportTopicAssignments.retiredAt} is null
            and ${reports.hidden} = false
          then ${reports.id}
        end)`,
        sortOrder: publicTopicDefinitions.sortOrder,
      })
      .from(publicTopicDefinitions)
      .innerJoin(
        topicTaxonomyRevisions,
        eq(
          publicTopicDefinitions.taxonomyRevisionId,
          topicTaxonomyRevisions.id,
        ),
      )
      .innerJoin(
        publicTopics,
        eq(publicTopicDefinitions.topicId, publicTopics.id),
      )
      .leftJoin(
        reportTopicAssignments,
        eq(reportTopicAssignments.topicId, publicTopics.id),
      )
      .leftJoin(reports, eq(reports.id, reportTopicAssignments.reportId))
      .where(
        and(
          eq(topicTaxonomyRevisions.status, "active"),
          sql`${publicTopics.retiredAt} is null`,
        ),
      )
      .groupBy(
        publicTopicDefinitions.slug,
        publicTopicDefinitions.name,
        publicTopicDefinitions.shortDescription,
        publicTopicDefinitions.scope,
        publicTopicDefinitions.sortOrder,
      )
      .orderBy(asc(publicTopicDefinitions.sortOrder));

    return result.map(({ sortOrder: _sortOrder, ...topic }) => {
      const guide = getTopicGuideContent(topic.slug);
      return {
        ...topic,
        shortDescription: guide?.definition || topic.shortDescription,
        reportCount: Number(topic.reportCount) || 0,
      };
    });
  }

  async resolveTopicSlug(slug: string): Promise<TopicSlugResolution> {
    const canonical = await db
      .select({ slug: publicTopicDefinitions.slug })
      .from(publicTopicDefinitions)
      .innerJoin(
        topicTaxonomyRevisions,
        eq(
          publicTopicDefinitions.taxonomyRevisionId,
          topicTaxonomyRevisions.id,
        ),
      )
      .innerJoin(
        publicTopics,
        eq(publicTopicDefinitions.topicId, publicTopics.id),
      )
      .where(
        and(
          eq(publicTopicDefinitions.slug, slug),
          eq(topicTaxonomyRevisions.status, "active"),
          sql`${publicTopics.retiredAt} is null`,
        ),
      )
      .limit(1);

    if (canonical[0]) {
      return { kind: "canonical", slug: canonical[0].slug };
    }

    const alias = await db
      .select({
        canonicalSlug: publicTopicDefinitions.slug,
        redirectStatus: publicTopicSlugAliases.redirectStatus,
      })
      .from(publicTopicSlugAliases)
      .innerJoin(
        publicTopics,
        eq(publicTopicSlugAliases.topicId, publicTopics.id),
      )
      .innerJoin(
        publicTopicDefinitions,
        eq(publicTopicDefinitions.topicId, publicTopics.id),
      )
      .innerJoin(
        topicTaxonomyRevisions,
        eq(
          publicTopicDefinitions.taxonomyRevisionId,
          topicTaxonomyRevisions.id,
        ),
      )
      .where(
        and(
          eq(publicTopicSlugAliases.aliasSlug, slug),
          eq(topicTaxonomyRevisions.status, "active"),
          sql`${publicTopicSlugAliases.retiredAt} is null`,
          sql`${publicTopics.retiredAt} is null`,
        ),
      )
      .limit(1);

    if (!alias[0]) {
      return { kind: "not_found", slug };
    }

    return {
      kind: "alias",
      slug,
      canonicalSlug: alias[0].canonicalSlug,
      redirectStatus: alias[0].redirectStatus as 301 | 308,
    };
  }

  async getTopicLandingPage(slug: string, limit = 24): Promise<TopicLandingPageData | undefined> {
    const topicRows = await db
      .select({
        topicId: publicTopics.id,
        slug: publicTopicDefinitions.slug,
        name: publicTopicDefinitions.name,
        shortDescription: publicTopicDefinitions.shortDescription,
        scope: publicTopicDefinitions.scope,
      })
      .from(publicTopicDefinitions)
      .innerJoin(
        topicTaxonomyRevisions,
        eq(
          publicTopicDefinitions.taxonomyRevisionId,
          topicTaxonomyRevisions.id,
        ),
      )
      .innerJoin(
        publicTopics,
        eq(publicTopicDefinitions.topicId, publicTopics.id),
      )
      .where(
        and(
          eq(publicTopicDefinitions.slug, slug),
          eq(topicTaxonomyRevisions.status, "active"),
          sql`${publicTopics.retiredAt} is null`,
        ),
      )
      .limit(1);

    const topic = topicRows[0];
    if (!topic) return undefined;
    const guide = getTopicGuideContent(topic.slug);

    const reportRows = await db
      .select({
        assignmentId: reportTopicAssignments.id,
        id: reports.id,
        reportTitle: reports.reportTitle,
        agency: reports.auditOrganization,
        jurisdiction: reports.state,
        publicationYear: reports.publicationYear,
        publicationMonth: reports.publicationMonth,
        publicationDay: reports.publicationDay,
        rationale: reportTopicAssignments.rationale,
        totalCount: sql<number>`count(*) over()`,
      })
      .from(reportTopicAssignments)
      .innerJoin(reports, eq(reportTopicAssignments.reportId, reports.id))
      .where(
        and(
          eq(reportTopicAssignments.topicId, topic.topicId),
          sql`${reportTopicAssignments.retiredAt} is null`,
          eq(reports.hidden, false),
        ),
      )
      .orderBy(
        desc(reports.publicationYear),
        desc(reports.publicationMonth),
        desc(reports.publicationDay),
        desc(reports.id),
      )
      .limit(limit);

    const assignmentIds = reportRows.map((report) => report.assignmentId);
    const evidenceByAssignment = new Map<string, TopicEvidence[]>();

    if (assignmentIds.length > 0) {
      const [findingRows, recommendationRows, metadataRows] = await Promise.all([
        db
          .select({
            assignmentId: reportTopicFindingEvidence.assignmentId,
            text: reportTopicFindingEvidence.snapshot,
            rank: reportTopicFindingEvidence.rank,
          })
          .from(reportTopicFindingEvidence)
          .where(inArray(reportTopicFindingEvidence.assignmentId, assignmentIds)),
        db
          .select({
            assignmentId: reportTopicRecommendationEvidence.assignmentId,
            text: reportTopicRecommendationEvidence.snapshot,
            rank: reportTopicRecommendationEvidence.rank,
          })
          .from(reportTopicRecommendationEvidence)
          .where(
            inArray(
              reportTopicRecommendationEvidence.assignmentId,
              assignmentIds,
            ),
          ),
        db
          .select({
            assignmentId: reportTopicMetadataEvidence.assignmentId,
            fieldName: reportTopicMetadataEvidence.fieldName,
            text: reportTopicMetadataEvidence.snapshot,
            rank: reportTopicMetadataEvidence.rank,
          })
          .from(reportTopicMetadataEvidence)
          .where(inArray(reportTopicMetadataEvidence.assignmentId, assignmentIds)),
      ]);

      const addEvidence = (assignmentId: string, evidence: TopicEvidence) => {
        const entries = evidenceByAssignment.get(assignmentId) || [];
        entries.push(evidence);
        evidenceByAssignment.set(assignmentId, entries);
      };

      findingRows.forEach((row) =>
        addEvidence(row.assignmentId, {
          sourceType: "finding",
          sourceLabel: "Finding",
          text: row.text,
          rank: row.rank,
        }),
      );
      recommendationRows.forEach((row) =>
        addEvidence(row.assignmentId, {
          sourceType: "recommendation",
          sourceLabel: "Recommendation",
          text: row.text,
          rank: row.rank,
        }),
      );
      metadataRows.forEach((row) =>
        addEvidence(row.assignmentId, {
          sourceType: "metadata",
          sourceLabel: metadataEvidenceLabel(row.fieldName),
          text: row.text,
          rank: row.rank,
        }),
      );

      evidenceByAssignment.forEach((entries) => {
        entries.sort(
          (a, b) =>
            a.rank - b.rank ||
            evidenceTypeOrder(a.sourceType) - evidenceTypeOrder(b.sourceType),
        );
      });
    }

    return {
      slug: topic.slug,
      name: topic.name,
      shortDescription: guide?.definition || topic.shortDescription,
      scope: topic.scope,
      definition: guide?.definition || topic.shortDescription,
      whyAuditorsCare: guide?.whyAuditorsCare || topic.scope,
      reportCount: Number(reportRows[0]?.totalCount) || 0,
      stateCount: new Set(
        reportRows
          .map((report) => report.jurisdiction)
          .filter((jurisdiction) => jurisdiction && jurisdiction !== "US"),
      ).size,
      hasFederalReports: reportRows.some(
        (report) => report.jurisdiction === "US",
      ),
      agencyCount: new Set(reportRows.map((report) => report.agency)).size,
      publicationYearStart:
        reportRows.length > 0
          ? Math.min(...reportRows.map((report) => report.publicationYear))
          : undefined,
      publicationYearEnd:
        reportRows.length > 0
          ? Math.max(...reportRows.map((report) => report.publicationYear))
          : undefined,
      reports: reportRows.map((report) => ({
        id: report.id,
        reportTitle: report.reportTitle,
        agency: report.agency,
        jurisdiction: report.jurisdiction,
        publicationYear: report.publicationYear,
        publicationMonth: report.publicationMonth ?? undefined,
        publicationDay: report.publicationDay ?? undefined,
        rationale: report.rationale,
        evidence: evidenceByAssignment.get(report.assignmentId) || [],
        reportPath: `/reports/${report.id}`,
      })),
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [totalReportsResult, statesResult, findingsResult, recentReportsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.hidden, false)),
      db.select({ count: sql<number>`count(distinct state)` }).from(reports).where(eq(reports.hidden, false)),
      db.select({ count: sql<number>`count(*)` }).from(findings),
      this.getFeaturedReports(4),
    ]);

    return {
      totalReports: totalReportsResult[0]?.count || 0,
      statesWithReports: statesResult[0]?.count || 0,
      criticalFindings: findingsResult[0]?.count || 0,
      recentReports: recentReportsResult,
    };
  }

  async getTopKeywords(limit: number = 12): Promise<KeywordWithCount[]> {
    const result = await db.execute(sql`
      SELECT canonical_keyword as keyword, report_count as "reportCount"
      FROM keyword_mappings 
      WHERE report_count >= 2 
        AND (hidden = false OR hidden IS NULL)
      ORDER BY report_count DESC 
      LIMIT ${limit}
    `);

    return (result.rows as any[]).map(row => ({
      keyword: row.keyword,
      reportCount: row.reportCount || 0,
    }));
  }



  private async getReportKeywords(reportId: string): Promise<string[]> {
    const result = await db
      .select({ keyword: sql<string>`keyword_text` })
      .from(sql`report_keywords_association rka`)
      .innerJoin(sql`keywords k`, sql`rka.keyword_id = k.id`)
      .where(sql`rka.report_id = ${reportId}`);
    
    return result.map(r => r.keyword);
  }



  private async getReportPrograms(reportId: string): Promise<string[]> {
    const result = await db
      .select({ name: programs.name })
      .from(reportPrograms)
      .innerJoin(programs, eq(reportPrograms.programId, programs.id))
      .where(eq(reportPrograms.reportId, reportId));
    
    return result.map(r => r.name);
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
