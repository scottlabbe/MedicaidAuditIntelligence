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
  keywords,
  themes,
  programs,
  reportKeywords,
  reportPrograms,
  keywordThemes,
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
} from "../client/src/lib/types";

export interface IStorage {
  // Reports
  getReports(filters?: SearchFilters, page?: number, pageSize?: number): Promise<SearchResponse>;
  getReportById(id: string): Promise<ReportWithDetails | undefined>;
  getFeaturedReports(limit?: number): Promise<ReportListItem[]>;
  createReport(report: InsertReport): Promise<Report>;
  getLatestReportsByState(limit: number, scope: 'state' | 'federal'): Promise<StateLatestResponse>;
  
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
    let query = db
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

    if (filters.featured !== undefined) {
      conditions.push(eq(reports.featured, filters.featured));
    }

    // Filter out hidden reports
    conditions.push(eq(reports.hidden, false));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(reports);
    
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }

    // Apply sorting based on sortBy parameter
    let sortedQuery = query;
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
    const enhancedItems: ReportListItem[] = items.map((item) => ({
      ...item,
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

    return {
      ...report[0],
      objectives: objectivesList,
      findings: findingsList,
      recommendations: recommendationsList,
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

    return items.map((item) => ({
      ...item,
      keywords: [],
      programs: [],
      conclusionExcerpt: item.overallConclusion ? 
        item.overallConclusion.substring(0, 200) + (item.overallConclusion.length > 200 ? "..." : "") :
        undefined,
    }));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report).returning();
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
    const result = await db
      .select({
        keyword: keywords.keyword,
        reportCount: sql<number>`count(distinct ${reportKeywords.reportId})`,
      })
      .from(keywords)
      .leftJoin(reportKeywords, eq(keywords.id, reportKeywords.keywordId))
      .leftJoin(reports, and(
        eq(reportKeywords.reportId, reports.id),
        eq(reports.hidden, false)
      ))
      .groupBy(keywords.id, keywords.keyword)
      .having(sql`count(distinct ${reportKeywords.reportId}) >= 2`) // Filter out keywords with < 2 reports
      .orderBy(sql`count(distinct ${reportKeywords.reportId}) DESC`)
      .limit(limit);

    return result.map(row => ({
      keyword: row.keyword,
      reportCount: row.reportCount || 0,
    }));
  }



  private async getReportKeywords(reportId: string): Promise<string[]> {
    const result = await db
      .select({ keyword: keywords.keyword })
      .from(reportKeywords)
      .innerJoin(keywords, eq(reportKeywords.keywordId, keywords.id))
      .where(eq(reportKeywords.reportId, reportId));
    
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
