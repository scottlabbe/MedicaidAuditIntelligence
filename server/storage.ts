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
        title: reports.title,
        state: reports.state,
        agency: reports.agency,
        publicationYear: reports.publicationYear,
        publicationMonth: reports.publicationMonth,
        publicationDay: reports.publicationDay,
        publicationDate: reports.publicationDate,
        overallConclusion: reports.overallConclusion,
        llmInsight: reports.llmInsight,
        potentialObjectiveSummary: reports.potentialObjectiveSummary,
        auditScope: reports.auditScope,
        originalReportSourceUrl: reports.originalReportSourceUrl,
        originalFilename: reports.originalFilename,
        fileHash: reports.fileHash,
        featured: reports.featured,
        hasAiInsight: reports.hasAiInsight,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
      })
      .from(reports);

    // Apply filters
    const conditions = [];

    if (filters.query) {
      conditions.push(
        or(
          ilike(reports.title, `%${filters.query}%`),
          ilike(reports.agency, `%${filters.query}%`),
          ilike(reports.overallConclusion, `%${filters.query}%`)
        )
      );
    }

    if (filters.state) {
      conditions.push(eq(reports.state, filters.state));
    }

    if (filters.agency) {
      conditions.push(ilike(reports.agency, `%${filters.agency}%`));
    }

    if (filters.year) {
      conditions.push(eq(reports.publicationYear, filters.year));
    }

    if (filters.featured !== undefined) {
      conditions.push(eq(reports.featured, filters.featured));
    }

    if (filters.hasAiInsight !== undefined) {
      conditions.push(eq(reports.hasAiInsight, filters.hasAiInsight));
    }

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

    // Enhance items with related data
    const enhancedItems: ReportListItem[] = await Promise.all(
      items.map(async (item) => {
        const [keywordData, themeData, programData] = await Promise.all([
          this.getReportKeywords(item.id),
          this.getReportThemes(item.id),
          this.getReportPrograms(item.id),
        ]);

        return {
          ...item,
          keywords: keywordData,
          themes: themeData,
          programs: programData,
          conclusionExcerpt: item.overallConclusion ? 
            item.overallConclusion.substring(0, 200) + (item.overallConclusion.length > 200 ? "..." : "") :
            undefined,
        };
      })
    );

    return {
      items: enhancedItems,
      total,
      page,
      pageSize,
      filters,
    };
  }

  async getReportById(id: string): Promise<ReportWithDetails | undefined> {
    const report = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    
    if (!report[0]) {
      return undefined;
    }

    const [objectivesList, findingsList, recommendationsList, keywordsList, themesList, programsList] = await Promise.all([
      db.select().from(objectives).where(eq(objectives.reportId, id)).orderBy(objectives.order),
      db.select().from(findings).where(eq(findings.reportId, id)).orderBy(findings.order),
      db.select().from(recommendations).where(eq(recommendations.reportId, id)).orderBy(recommendations.order),
      this.getReportKeywords(id),
      this.getReportThemes(id),
      this.getReportPrograms(id),
    ]);

    return {
      ...report[0],
      objectives: objectivesList,
      findings: findingsList,
      recommendations: recommendationsList,
      keywords: keywordsList,
      themes: themesList,
      programs: programsList,
    };
  }

  async getFeaturedReports(limit = 6): Promise<ReportListItem[]> {
    const items = await db
      .select()
      .from(reports)
      .where(eq(reports.featured, true))
      .orderBy(desc(reports.publicationYear), desc(reports.publicationMonth))
      .limit(limit);

    return Promise.all(
      items.map(async (item) => {
        const [keywordData, themeData, programData] = await Promise.all([
          this.getReportKeywords(item.id),
          this.getReportThemes(item.id),
          this.getReportPrograms(item.id),
        ]);

        return {
          ...item,
          keywords: keywordData,
          themes: themeData,
          programs: programData,
          conclusionExcerpt: item.overallConclusion ? 
            item.overallConclusion.substring(0, 200) + (item.overallConclusion.length > 200 ? "..." : "") :
            undefined,
        };
      })
    );
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report).returning();
    return result[0];
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [totalReportsResult, statesResult, criticalFindingsResult, recentReportsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(reports),
      db.select({ count: sql<number>`count(distinct state)` }).from(reports),
      db.select({ count: sql<number>`count(*)` }).from(findings).where(eq(findings.severity, "high")),
      this.getFeaturedReports(4),
    ]);

    return {
      totalReports: totalReportsResult[0]?.count || 0,
      statesWithReports: statesResult[0]?.count || 0,
      criticalFindings: criticalFindingsResult[0]?.count || 0,
      recentReports: recentReportsResult,
    };
  }

  async exportReports(filters: SearchFilters = {}, format: "csv" | "json" = "json"): Promise<any> {
    const { items } = await this.getReports(filters, 1, 1000); // Export up to 1000 reports
    
    if (format === "csv") {
      // Convert to CSV format
      const headers = ["ID", "Title", "State", "Agency", "Publication Date", "Themes", "Programs"];
      const rows = items.map(item => [
        item.id,
        item.title,
        item.state,
        item.agency,
        item.publicationDate || `${item.publicationYear}-${item.publicationMonth || 1}-${item.publicationDay || 1}`,
        item.themes.join(", "),
        item.programs.join(", ")
      ]);
      
      return [headers, ...rows];
    }
    
    return items;
  }

  private async getReportKeywords(reportId: string): Promise<string[]> {
    const result = await db
      .select({ keyword: keywords.keyword })
      .from(reportKeywords)
      .innerJoin(keywords, eq(reportKeywords.keywordId, keywords.id))
      .where(eq(reportKeywords.reportId, reportId));
    
    return result.map(r => r.keyword);
  }

  private async getReportThemes(reportId: string): Promise<string[]> {
    const result = await db
      .select({ name: themes.name })
      .from(reportKeywords)
      .innerJoin(keywords, eq(reportKeywords.keywordId, keywords.id))
      .innerJoin(keywordThemes, eq(keywords.id, keywordThemes.keywordId))
      .innerJoin(themes, eq(keywordThemes.themeId, themes.id))
      .where(eq(reportKeywords.reportId, reportId));
    
    return Array.from(new Set(result.map(r => r.name)));
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
