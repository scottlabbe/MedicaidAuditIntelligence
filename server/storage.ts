import { eq, and, desc, ilike, sql, or, inArray } from "drizzle-orm";
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
  type ReportWithDetails,
  type ReportListItem,
  type SearchFilters,
  type SearchResponse,
  type DashboardStats,
  type User,
  type InsertUser,
  users,
} from "@shared/schema";

export interface IStorage {
  // Reports
  getReports(filters?: SearchFilters, page?: number, pageSize?: number): Promise<SearchResponse>;
  getReportById(id: string): Promise<ReportWithDetails | undefined>;
  getFeaturedReports(limit?: number): Promise<ReportListItem[]>;
  createReport(report: InsertReport): Promise<Report>;
  
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  
  // Export
  exportReports(filters?: SearchFilters, format?: "csv" | "json"): Promise<any>;
  
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

    const [items, totalResult] = await Promise.all([
      query
        .orderBy(desc(reports.publicationYear), desc(reports.publicationMonth), desc(reports.publicationDay))
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
    
    const report = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    
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
