import { eq, and, desc, asc, ilike, sql, or, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "./database";
import {
  reports,
  publishers,
  jurisdictions,
  reportJurisdictionAssignments,
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
  reportSlugAliases,
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
  JurisdictionRef,
  JurisdictionScopeType,
  FederalLandingPageData,
} from "../client/src/lib/types";
import { getTopicGuideContent } from "@shared/topicGuides";
import {
  buildReportSlugCandidates,
  isValidReportSlug,
  reportPath,
} from "@shared/reportSlugs";
import { PUBLIC_SOURCE_URL_PATTERN } from "@shared/sourceUrls";

function metadataEvidenceLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    report_title: "Report title",
    audit_organization: "Audit organization",
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
  getReportBySlug(slug: string): Promise<ReportWithDetails | undefined>;
  resolveReportSlugAlias(slug: string): Promise<string | undefined>;
  getFeaturedReports(limit?: number): Promise<ReportListItem[]>;
  createReport(report: InsertReport): Promise<Report>;
  getLatestReportsByState(limit: number, scope: 'state' | 'federal'): Promise<StateLatestResponse>;
  getIndexableStates(limit?: number): Promise<IndexableStateSummary[]>;
  getStateLandingPage(stateCode: string, limit?: number): Promise<StateLandingPageData | undefined>;
  getFederalLandingPage(limit?: number): Promise<FederalLandingPageData>;
  getAgenciesWithCounts(limit?: number): Promise<AgencySummary[]>;
  getAgencyLandingPage(slug: string, limit?: number): Promise<AgencyLandingPageData | undefined>;
  getTopicsWithCounts(): Promise<TopicSummary[]>;
  resolveTopicSlug(slug: string): Promise<TopicSlugResolution>;
  getTopicLandingPage(slug: string): Promise<TopicLandingPageData | undefined>;
  
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  private async addPublisherMetadata<T extends {
    publisherKey?: string | null;
  }>(items: T[]): Promise<Array<T & {
    publisherKey?: string;
    publisherName?: string;
    publisherJurisdictionCode?: string;
  }>> {
    const publisherKeys = Array.from(
      new Set(items.map((item) => item.publisherKey).filter(Boolean)),
    ) as string[];

    const publisherRows = publisherKeys.length
      ? await db
          .select({
            key: publishers.key,
            name: publishers.displayName,
            jurisdictionCode: publishers.jurisdictionCode,
          })
          .from(publishers)
          .where(inArray(publishers.key, publisherKeys))
      : [];
    const publisherByKey = new Map(
      publisherRows.map((publisher) => [publisher.key, publisher]),
    );

    return items.map((item) => {
      const publisher = item.publisherKey
        ? publisherByKey.get(item.publisherKey)
        : undefined;
      return {
        ...item,
        publisherKey: item.publisherKey ?? undefined,
        publisherName: publisher?.name,
        publisherJurisdictionCode: publisher?.jurisdictionCode ?? undefined,
      };
    });
  }

  private async addJurisdictionMetadata<T extends {
    id: number;
    sourceJurisdictionCode?: string | null;
    jurisdictionScopeType?: string | null;
  }>(items: T[]): Promise<Array<T & {
    sourceJurisdiction?: JurisdictionRef;
    subjectJurisdictions: JurisdictionRef[];
    jurisdictionScopeType: JurisdictionScopeType;
  }>> {
    if (items.length === 0) return [];

    const reportIds = items.map((item) => item.id);
    const sourceCodes = Array.from(
      new Set(items.map((item) => item.sourceJurisdictionCode).filter(Boolean)),
    ) as string[];

    const [subjectRows, sourceRows] = await Promise.all([
      db
        .select({
          reportId: reportJurisdictionAssignments.reportId,
          code: jurisdictions.code,
          name: jurisdictions.name,
          slug: jurisdictions.slug,
          kind: jurisdictions.kind,
        })
        .from(reportJurisdictionAssignments)
        .innerJoin(
          jurisdictions,
          eq(reportJurisdictionAssignments.jurisdictionCode, jurisdictions.code),
        )
        .where(
          and(
            inArray(reportJurisdictionAssignments.reportId, reportIds),
            eq(reportJurisdictionAssignments.reviewStatus, "reviewed"),
            isNull(reportJurisdictionAssignments.retiredAt),
            inArray(reportJurisdictionAssignments.relationship, [
              "primary_subject",
              "included_in_scope",
            ]),
          ),
        )
        .orderBy(asc(jurisdictions.name)),
      sourceCodes.length
        ? db
            .select({
              code: jurisdictions.code,
              name: jurisdictions.name,
              slug: jurisdictions.slug,
              kind: jurisdictions.kind,
            })
            .from(jurisdictions)
            .where(inArray(jurisdictions.code, sourceCodes))
        : Promise.resolve([]),
    ]);

    const sourceByCode = new Map(
      sourceRows.map((row) => [row.code, row as JurisdictionRef]),
    );
    const subjectsByReport = new Map<number, JurisdictionRef[]>();
    for (const row of subjectRows) {
      const entries = subjectsByReport.get(row.reportId) || [];
      entries.push({
        code: row.code,
        name: row.name,
        slug: row.slug,
        kind: row.kind as JurisdictionRef["kind"],
      });
      subjectsByReport.set(row.reportId, entries);
    }

    return items.map((item) => ({
      ...item,
      sourceJurisdiction: item.sourceJurisdictionCode
        ? sourceByCode.get(item.sourceJurisdictionCode)
        : undefined,
      subjectJurisdictions: subjectsByReport.get(item.id) || [],
      jurisdictionScopeType: (item.jurisdictionScopeType || "unknown") as JurisdictionScopeType,
    }));
  }

  private async toReportListItems(items: any[]): Promise<ReportListItem[]> {
    const normalized = items.map((item) => ({
      ...item,
      publicationMonth: item.publicationMonth ?? undefined,
      publicationDay: item.publicationDay ?? undefined,
      overallConclusion: item.overallConclusion ?? undefined,
      llmInsight: item.llmInsight ?? undefined,
      potentialObjectiveSummary: item.potentialObjectiveSummary ?? undefined,
      auditScope: item.auditScope ?? undefined,
      originalReportSourceUrl: item.originalReportSourceUrl ?? undefined,
      totalFinancialImpact: item.totalFinancialImpact ?? undefined,
      findingCount:
        item.findingCount === undefined ? undefined : Number(item.findingCount) || 0,
      recommendationCount:
        item.recommendationCount === undefined
          ? undefined
          : Number(item.recommendationCount) || 0,
      originalFilename: item.originalFilename ?? undefined,
      fileHash: item.fileHash ?? undefined,
      featured: item.featured ?? undefined,
      status: item.status ?? undefined,
      createdAt: item.createdAt ?? undefined,
      updatedAt: item.updatedAt ?? undefined,
      keywords: [],
      programs: [],
      conclusionExcerpt: item.overallConclusion
        ? item.overallConclusion.substring(0, 200) +
          (item.overallConclusion.length > 200 ? "..." : "")
        : undefined,
    }));

    const withPublishers = await this.addPublisherMetadata(normalized);
    return this.addJurisdictionMetadata(withPublishers) as Promise<ReportListItem[]>;
  }

  async getReports(filters: SearchFilters = {}, page = 1, pageSize = 24): Promise<SearchResponse> {
    const offset = (page - 1) * pageSize;
    
    // Base query
    let query: any = db
      .select({
        id: reports.id,
        slug: reports.slug,
        reportTitle: reports.reportTitle,
        state: reports.state,
        sourceJurisdictionCode: reports.sourceJurisdictionCode,
        jurisdictionScopeType: reports.jurisdictionScopeType,
        publisherKey: reports.publisherKey,
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
          where ${findings.reportId} = ${sql.raw('"reports"."id"')}
        )`,
        recommendationCount: sql<number>`(
          select count(*)
          from ${recommendations}
          where ${recommendations.reportId} = ${sql.raw('"reports"."id"')}
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
      const searchTerm = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(reports.reportTitle, searchTerm),
          ilike(reports.auditOrganization, searchTerm),
          sql`EXISTS (
            SELECT 1
            FROM ${publishers} publisher
            WHERE publisher.key = ${reports.publisherKey}
              AND publisher.display_name ILIKE ${searchTerm}
          )`,
          ilike(reports.overallConclusion, searchTerm),
          ilike(reports.potentialObjectiveSummary, searchTerm),
          ilike(reports.auditScope, searchTerm),
          sql`EXISTS (
            SELECT 1
            FROM ${findings}
            WHERE ${findings.reportId} = ${reports.id}
              AND ${findings.findingText} ILIKE ${searchTerm}
          )`,
          sql`EXISTS (
            SELECT 1
            FROM ${recommendations}
            WHERE ${recommendations.reportId} = ${reports.id}
              AND ${recommendations.recommendationText} ILIKE ${searchTerm}
          )`
        )
      );
    }

    const subjectJurisdiction =
      filters.jurisdiction ||
      (filters.state && filters.state !== "US" ? filters.state : undefined);
    const sourceJurisdiction =
      filters.sourceJurisdiction || (filters.state === "US" ? "US" : undefined);

    if (subjectJurisdiction) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM ${reportJurisdictionAssignments} jurisdiction_assignment
        WHERE jurisdiction_assignment.report_id = ${reports.id}
          AND jurisdiction_assignment.jurisdiction_code = ${subjectJurisdiction}
          AND jurisdiction_assignment.review_status = 'reviewed'
          AND jurisdiction_assignment.retired_at IS NULL
          AND jurisdiction_assignment.relationship IN ('primary_subject', 'included_in_scope')
      )`);
    }

    if (sourceJurisdiction) {
      conditions.push(eq(reports.sourceJurisdictionCode, sourceJurisdiction));
    }

    if (filters.agency) {
      const legacyAgencyTerm = `%${filters.agency}%`;
      conditions.push(or(
        eq(reports.publisherKey, filters.agency),
        ilike(reports.auditOrganization, legacyAgencyTerm),
        sql`EXISTS (
          SELECT 1
          FROM ${publishers} publisher
          WHERE publisher.key = ${reports.publisherKey}
            AND publisher.display_name ILIKE ${legacyAgencyTerm}
        )`,
      ));
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
        sql`BTRIM(${reports.originalReportSourceUrl}) ~* ${PUBLIC_SOURCE_URL_PATTERN}`,
      );
    } else if (filters.sourceStatus === "record") {
      conditions.push(
        sql`${reports.originalReportSourceUrl} is null or not (BTRIM(${reports.originalReportSourceUrl}) ~* ${PUBLIC_SOURCE_URL_PATTERN})`,
      );
    }

    // Filter out hidden reports
    conditions.push(eq(reports.hidden, false));
    conditions.push(isNotNull(reports.slug));

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
      case "jurisdiction":
        sortedQuery = query.orderBy(
          sql`COALESCE((
            SELECT MIN(j.name)
            FROM report_jurisdiction_assignments a
            JOIN jurisdictions j ON j.code = a.jurisdiction_code
            WHERE a.report_id = ${reports.id}
              AND a.review_status = 'reviewed'
              AND a.retired_at IS NULL
              AND a.relationship IN ('primary_subject', 'included_in_scope')
          ), 'ZZZ')`,
          desc(reports.publicationYear),
        );
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

    const total = Number(totalResult[0]?.count) || 0;

    // Return items with basic data (no complex relationships for now)
    const enhancedItems = await this.toReportListItems(items);

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

    const [reportListItem] = await this.toReportListItems([report[0]]);

    return {
      ...reportListItem,
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

  async getReportBySlug(slug: string): Promise<ReportWithDetails | undefined> {
    const match = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.slug, slug), eq(reports.hidden, false)))
      .limit(1);

    return match[0] ? this.getReportById(String(match[0].id)) : undefined;
  }

  async resolveReportSlugAlias(slug: string): Promise<string | undefined> {
    const match = await db
      .select({ slug: reports.slug })
      .from(reportSlugAliases)
      .innerJoin(reports, eq(reportSlugAliases.reportId, reports.id))
      .where(and(
        eq(reportSlugAliases.aliasSlug, slug),
        isNull(reportSlugAliases.retiredAt),
        eq(reports.hidden, false),
      ))
      .limit(1);

    return match[0]?.slug || undefined;
  }

  async getFeaturedReports(limit = 6): Promise<ReportListItem[]> {
    const items = await db
      .select({
        id: reports.id,
        slug: reports.slug,
        reportTitle: reports.reportTitle,
        state: reports.state,
        sourceJurisdictionCode: reports.sourceJurisdictionCode,
        jurisdictionScopeType: reports.jurisdictionScopeType,
        publisherKey: reports.publisherKey,
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
      .where(and(
        eq(reports.featured, true),
        eq(reports.hidden, false),
        isNotNull(reports.slug),
      ))
      .orderBy(desc(reports.publicationYear), desc(reports.publicationMonth))
      .limit(limit);

    return this.toReportListItems(items);
  }

  async createReport(report: InsertReport): Promise<Report> {
    let slug = report.slug || undefined;
    if (slug && !isValidReportSlug(slug)) {
      throw new Error(`Invalid report slug: ${slug}`);
    }

    if (!slug) {
      const candidates = buildReportSlugCandidates({
        id: 0,
        title: report.reportTitle,
        publicationYear: report.publicationYear,
        state: report.state,
        sourceUid: report.sourceUid,
      });

      for (const candidate of candidates) {
        const existing = await db
          .select({ id: reports.id })
          .from(reports)
          .where(eq(reports.slug, candidate))
          .limit(1);
        if (!existing[0]) {
          slug = candidate;
          break;
        }
      }
    }

    if (!slug) {
      throw new Error("Could not allocate a unique report slug");
    }

    const result = await db.insert(reports).values({ ...report, slug } as any).returning();
    return result[0];
  }

  async getLatestReportsByState(limit = 3, scope: 'state' | 'federal' = 'state'): Promise<StateLatestResponse> {
    const safeLimit = Math.min(limit, 5);
    
    if (scope === 'federal') {
      const federalReports = await db
        .select({
          id: reports.id,
          slug: reports.slug,
          reportTitle: reports.reportTitle,
          publisherKey: reports.publisherKey,
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
            eq(reports.sourceJurisdictionCode, "US"),
            isNotNull(reports.slug),
          )
        )
        .orderBy(
          desc(reports.publicationYear),
          desc(reports.publicationMonth),
          desc(reports.publicationDay)
        )
        .limit(safeLimit);
      const federalReportsWithPublishers = await this.addPublisherMetadata(federalReports);

      const byKey: Record<string, any[]> = {
        FED: federalReportsWithPublishers.map(r => ({
          id: r.id,
          title: r.reportTitle,
          agency: r.publisherName || "Publisher pending",
          publicationDate: new Date(
            r.publicationYear,
            (r.publicationMonth || 1) - 1,
            r.publicationDay || 1
          ).toISOString(),
          url: reportPath(r),
        }))
      };

      return { byKey, updatedAt: new Date().toISOString() };
    }

    const stateReports = await db.execute(sql`
      WITH ranked AS (
        SELECT 
          reports.id,
          reports.slug,
          reports.report_title,
          assignment.jurisdiction_code,
          publisher.display_name AS publisher_name,
          reports.publication_year,
          reports.publication_month,
          reports.publication_day,
          ROW_NUMBER() OVER (
            PARTITION BY assignment.jurisdiction_code
            ORDER BY reports.publication_year DESC,
                     COALESCE(reports.publication_month, 1) DESC,
                     COALESCE(reports.publication_day, 1) DESC,
                     reports.id DESC
          ) as rn
        FROM reports
        JOIN report_jurisdiction_assignments assignment
          ON assignment.report_id = reports.id
        JOIN jurisdictions jurisdiction
          ON jurisdiction.code = assignment.jurisdiction_code
        LEFT JOIN publishers publisher
          ON publisher.key = reports.publisher_key
        WHERE COALESCE(reports.hidden, false) = false
          AND reports.slug IS NOT NULL
          AND assignment.review_status = 'reviewed'
          AND assignment.retired_at IS NULL
          AND assignment.relationship IN ('primary_subject', 'included_in_scope')
          AND jurisdiction.kind IN ('state', 'district', 'territory')
      )
      SELECT * FROM ranked WHERE rn <= ${safeLimit}
    `);

    const byKey: Record<string, any[]> = {};
    for (const row of stateReports.rows as any[]) {
      const state = row.jurisdiction_code;
      if (!byKey[state]) byKey[state] = [];
      
      byKey[state].push({
        id: row.id,
        title: row.report_title,
        state,
        agency: row.publisher_name || "Publisher pending",
        publicationDate: new Date(
          row.publication_year,
          (row.publication_month || 1) - 1,
          row.publication_day || 1
        ).toISOString(),
        url: reportPath({ id: row.id, slug: row.slug }),
      });
    }

    return { byKey, updatedAt: new Date().toISOString() };
  }

  async getIndexableStates(limit = 50): Promise<IndexableStateSummary[]> {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          reports.id,
          reports.slug,
          reports.report_title,
          reports.state,
          reports.source_jurisdiction_code,
          reports.jurisdiction_scope_type,
          reports.publisher_key,
          reports.audit_organization,
          reports.publication_year,
          reports.publication_month,
          reports.publication_day,
          reports.overall_conclusion,
          reports.llm_insight,
          reports.potential_objective_summary,
          reports.audit_scope,
          reports.original_report_source_url,
          reports.original_filename,
          reports.file_hash,
          reports.featured,
          reports.status,
          reports.created_at,
          reports.updated_at,
          jurisdiction.code AS jurisdiction_code,
          jurisdiction.name AS jurisdiction_name,
          jurisdiction.slug AS jurisdiction_slug,
          COUNT(*) OVER (PARTITION BY jurisdiction.code) AS report_count,
          ROW_NUMBER() OVER (
            PARTITION BY jurisdiction.code
            ORDER BY reports.publication_year DESC,
                     COALESCE(reports.publication_month, 1) DESC,
                     COALESCE(reports.publication_day, 1) DESC,
                     reports.id DESC
          ) AS rn
        FROM reports
        JOIN report_jurisdiction_assignments assignment
          ON assignment.report_id = reports.id
        JOIN jurisdictions jurisdiction
          ON jurisdiction.code = assignment.jurisdiction_code
        WHERE COALESCE(hidden, false) = false
          AND reports.slug IS NOT NULL
          AND assignment.review_status = 'reviewed'
          AND assignment.retired_at IS NULL
          AND assignment.relationship IN ('primary_subject', 'included_in_scope')
          AND jurisdiction.kind IN ('state', 'district', 'territory')
          AND jurisdiction.active = true
      )
      SELECT *
      FROM ranked
      WHERE rn = 1
      ORDER BY report_count DESC, jurisdiction_name ASC
      LIMIT ${limit}
    `);

    const rows = result.rows as any[];
    const latestReports = await this.toReportListItems(rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        reportTitle: row.report_title,
        state: row.state,
        sourceJurisdictionCode: row.source_jurisdiction_code,
        jurisdictionScopeType: row.jurisdiction_scope_type,
        publisherKey: row.publisher_key,
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
      })));

    return rows.map((row, index) => ({
        code: row.jurisdiction_code,
        name: row.jurisdiction_name,
        slug: row.jurisdiction_slug,
        reportCount: Number(row.report_count) || 0,
        latestReport: latestReports[index],
      }));
  }

  async getStateLandingPage(stateCode: string, limit = 12): Promise<StateLandingPageData | undefined> {
    const [jurisdiction] = await db
      .select({
        code: jurisdictions.code,
        name: jurisdictions.name,
        slug: jurisdictions.slug,
      })
      .from(jurisdictions)
      .where(
        and(
          eq(jurisdictions.code, stateCode.toUpperCase()),
          inArray(jurisdictions.kind, ["state", "district", "territory"]),
          eq(jurisdictions.active, true),
        ),
      )
      .limit(1);
    if (!jurisdiction) return undefined;

    const results = await this.getReports(
      { jurisdiction: jurisdiction.code, sortBy: "date_desc" },
      1,
      limit,
    );

    if (results.total === 0) {
      return undefined;
    }

    return {
      code: jurisdiction.code,
      name: jurisdiction.name,
      slug: jurisdiction.slug,
      reportCount: results.total,
      latestReport: results.items[0],
      reports: results.items,
    };
  }

  async getFederalLandingPage(limit = 24): Promise<FederalLandingPageData> {
    const results = await this.getReports(
      { sourceJurisdiction: "US", sortBy: "date_desc" },
      1,
      limit,
    );

    return {
      code: "US",
      name: "Federal",
      slug: "federal",
      reportCount: results.total,
      latestReport: results.items[0],
      reports: results.items,
    };
  }

  async getAgenciesWithCounts(limit = 200): Promise<AgencySummary[]> {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          report.id,
          report.slug,
          report.report_title,
          report.state,
          report.source_jurisdiction_code,
          report.jurisdiction_scope_type,
          report.publisher_key,
          publisher.display_name AS publisher_name,
          publisher.jurisdiction_code AS publisher_jurisdiction_code,
          report.audit_organization,
          report.publication_year,
          report.publication_month,
          report.publication_day,
          report.overall_conclusion,
          report.llm_insight,
          report.potential_objective_summary,
          report.audit_scope,
          report.original_report_source_url,
          report.original_filename,
          report.file_hash,
          report.featured,
          report.status,
          report.created_at,
          report.updated_at,
          COUNT(*) OVER (PARTITION BY report.publisher_key) AS report_count,
          ROW_NUMBER() OVER (
            PARTITION BY report.publisher_key
            ORDER BY report.publication_year DESC,
                     COALESCE(report.publication_month, 1) DESC,
                     COALESCE(report.publication_day, 1) DESC,
                     report.id DESC
          ) AS rn
        FROM reports report
        JOIN publishers publisher
          ON publisher.key = report.publisher_key
        WHERE COALESCE(report.hidden, false) = false
          AND report.slug IS NOT NULL
      )
      SELECT *
      FROM ranked
      WHERE rn = 1
      ORDER BY report_count DESC, publisher_name ASC
      LIMIT ${limit}
    `);

    const rows = result.rows as any[];
    const latestReports = await this.toReportListItems(rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      reportTitle: row.report_title,
      state: row.state,
      sourceJurisdictionCode: row.source_jurisdiction_code,
      jurisdictionScopeType: row.jurisdiction_scope_type,
      publisherKey: row.publisher_key,
      auditOrganization: row.audit_organization,
      publicationYear: row.publication_year,
      publicationMonth: row.publication_month,
      publicationDay: row.publication_day,
      overallConclusion: row.overall_conclusion,
      llmInsight: row.llm_insight,
      potentialObjectiveSummary: row.potential_objective_summary,
      auditScope: row.audit_scope,
      originalReportSourceUrl: row.original_report_source_url,
      originalFilename: row.original_filename,
      fileHash: row.file_hash,
      featured: row.featured,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));

    return rows.map((row, index) => ({
        slug: row.publisher_key,
        name: row.publisher_name,
        jurisdictionCode: row.publisher_jurisdiction_code || undefined,
        reportCount: Number(row.report_count) || 0,
        latestReport: latestReports[index],
      }));
  }

  async getAgencyLandingPage(slug: string, limit = 24): Promise<AgencyLandingPageData | undefined> {
    const agencies = await this.getAgenciesWithCounts(500);
    const agency = agencies.find((item) => item.slug === slug);
    if (!agency) return undefined;

    const results = await this.getReports(
      { agency: agency.slug, sortBy: "date_desc" },
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

  async getTopicLandingPage(slug: string): Promise<TopicLandingPageData | undefined> {
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
        slug: reports.slug,
        reportTitle: reports.reportTitle,
        publisherKey: reports.publisherKey,
        agency: publishers.displayName,
        state: reports.state,
        sourceJurisdictionCode: reports.sourceJurisdictionCode,
        jurisdictionScopeType: reports.jurisdictionScopeType,
        publicationYear: reports.publicationYear,
        publicationMonth: reports.publicationMonth,
        publicationDay: reports.publicationDay,
        rationale: reportTopicAssignments.rationale,
        totalCount: sql<number>`count(*) over()`,
      })
      .from(reportTopicAssignments)
      .innerJoin(reports, eq(reportTopicAssignments.reportId, reports.id))
      .leftJoin(publishers, eq(reports.publisherKey, publishers.key))
      .where(
        and(
          eq(reportTopicAssignments.topicId, topic.topicId),
          sql`${reportTopicAssignments.retiredAt} is null`,
          eq(reports.hidden, false),
          isNotNull(reports.slug),
        ),
      )
      .orderBy(
        desc(reports.publicationYear),
        desc(reports.publicationMonth),
        desc(reports.publicationDay),
        desc(reports.id),
      );

    const assignmentIds = reportRows.map((report) => report.assignmentId);
    const evidenceByAssignment = new Map<string, TopicEvidence[]>();

    if (assignmentIds.length > 0) {
      const [findingRows, recommendationRows, metadataRows] = await Promise.all([
        db
          .select({
            assignmentId: reportTopicFindingEvidence.assignmentId,
            sourceId: reportTopicFindingEvidence.findingId,
            text: reportTopicFindingEvidence.snapshot,
            rank: reportTopicFindingEvidence.rank,
          })
          .from(reportTopicFindingEvidence)
          .where(inArray(reportTopicFindingEvidence.assignmentId, assignmentIds)),
        db
          .select({
            assignmentId: reportTopicRecommendationEvidence.assignmentId,
            sourceId: reportTopicRecommendationEvidence.recommendationId,
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
          sourceId: row.sourceId,
          sourceLabel: "Finding",
          text: row.text,
          rank: row.rank,
        }),
      );
      recommendationRows.forEach((row) =>
        addEvidence(row.assignmentId, {
          sourceType: "recommendation",
          sourceId: row.sourceId,
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

    const jurisdictionMetadata = await this.addJurisdictionMetadata(
      reportRows.map((report) => ({
        id: report.id,
        sourceJurisdictionCode: report.sourceJurisdictionCode,
        jurisdictionScopeType: report.jurisdictionScopeType,
      })),
    );
    const metadataByReport = new Map(
      jurisdictionMetadata.map((metadata) => [metadata.id, metadata]),
    );
    const representedSubjectCodes = new Set(
      jurisdictionMetadata.flatMap((metadata) =>
        metadata.subjectJurisdictions
          .filter((jurisdiction) => jurisdiction.kind !== "federal")
          .map((jurisdiction) => jurisdiction.code),
      ),
    );

    return {
      slug: topic.slug,
      name: topic.name,
      shortDescription: guide?.definition || topic.shortDescription,
      scope: topic.scope,
      definition: guide?.definition || topic.shortDescription,
      whyAuditorsCare: guide?.whyAuditorsCare || topic.scope,
      reportCount: Number(reportRows[0]?.totalCount) || 0,
      stateCount: representedSubjectCodes.size,
      hasFederalReports: jurisdictionMetadata.some(
        (report) => report.sourceJurisdiction?.code === "US",
      ),
      agencyCount: new Set(
        reportRows.map((report) => report.publisherKey).filter(Boolean),
      ).size,
      publicationYearStart:
        reportRows.length > 0
          ? Math.min(...reportRows.map((report) => report.publicationYear))
          : undefined,
      publicationYearEnd:
        reportRows.length > 0
          ? Math.max(...reportRows.map((report) => report.publicationYear))
          : undefined,
      reports: reportRows.map((report) => {
        const metadata = metadataByReport.get(report.id);
        const subjectJurisdictions = metadata?.subjectJurisdictions || [];
        const jurisdiction =
          metadata?.jurisdictionScopeType === "national"
            ? "National"
            : subjectJurisdictions.length > 0
              ? subjectJurisdictions.map((subject) => subject.name).join(", ")
              : "Not assigned";
        return {
          id: report.id,
          reportTitle: report.reportTitle,
          agency: report.agency || "Publisher pending",
          jurisdiction,
          sourceJurisdiction: metadata?.sourceJurisdiction,
          subjectJurisdictions,
          jurisdictionScopeType: metadata?.jurisdictionScopeType || "unknown",
          publicationYear: report.publicationYear,
          publicationMonth: report.publicationMonth ?? undefined,
          publicationDay: report.publicationDay ?? undefined,
          rationale: report.rationale,
          evidence: evidenceByAssignment.get(report.assignmentId) || [],
          reportPath: reportPath(report),
        };
      }),
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalReportsResult,
      statesResult,
      jurisdictionsResult,
      federalResult,
      findingsResult,
      recentReportsResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(reports).where(and(
        eq(reports.hidden, false),
        isNotNull(reports.slug),
      )),
      db
        .select({ count: sql<number>`count(distinct ${reportJurisdictionAssignments.jurisdictionCode})` })
        .from(reportJurisdictionAssignments)
        .innerJoin(reports, eq(reports.id, reportJurisdictionAssignments.reportId))
        .innerJoin(jurisdictions, eq(jurisdictions.code, reportJurisdictionAssignments.jurisdictionCode))
        .where(and(
          eq(reports.hidden, false),
          isNotNull(reports.slug),
          eq(reportJurisdictionAssignments.reviewStatus, "reviewed"),
          isNull(reportJurisdictionAssignments.retiredAt),
          inArray(reportJurisdictionAssignments.relationship, ["primary_subject", "included_in_scope"]),
          inArray(jurisdictions.kind, ["state", "district"]),
        )),
      db
        .select({ count: sql<number>`count(distinct ${reportJurisdictionAssignments.jurisdictionCode})` })
        .from(reportJurisdictionAssignments)
        .innerJoin(reports, eq(reports.id, reportJurisdictionAssignments.reportId))
        .innerJoin(jurisdictions, eq(jurisdictions.code, reportJurisdictionAssignments.jurisdictionCode))
        .where(and(
          eq(reports.hidden, false),
          isNotNull(reports.slug),
          eq(reportJurisdictionAssignments.reviewStatus, "reviewed"),
          isNull(reportJurisdictionAssignments.retiredAt),
          inArray(reportJurisdictionAssignments.relationship, ["primary_subject", "included_in_scope"]),
          inArray(jurisdictions.kind, ["state", "district", "territory"]),
        )),
      db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(and(
          eq(reports.hidden, false),
          isNotNull(reports.slug),
          eq(reports.sourceJurisdictionCode, "US"),
        )),
      db
        .select({ count: sql<number>`count(*)` })
        .from(findings)
        .innerJoin(reports, eq(reports.id, findings.reportId))
        .where(and(eq(reports.hidden, false), isNotNull(reports.slug))),
      this.getFeaturedReports(4),
    ]);

    const statesWithSubjectCoverage = Number(statesResult[0]?.count) || 0;

    return {
      totalReports: Number(totalReportsResult[0]?.count) || 0,
      statesWithSubjectCoverage,
      jurisdictionsWithSubjectCoverage: Number(jurisdictionsResult[0]?.count) || 0,
      federalSourceReportCount: Number(federalResult[0]?.count) || 0,
      statesWithReports: statesWithSubjectCoverage,
      criticalFindings: Number(findingsResult[0]?.count) || 0,
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
