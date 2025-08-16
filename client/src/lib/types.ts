export interface SearchFilters {
  query?: string;
  state?: string;
  agency?: string;
  year?: number;
  program?: string;
  hasAiInsight?: boolean;
  featured?: boolean;
  severity?: "info" | "low" | "medium" | "high";
  sortBy?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// Import base types from schema
export type { Report, InsertReport, Objective, Finding, Recommendation } from "@shared/schema";

// Extended types for UI
export interface ReportListItem {
  id: number;
  reportTitle: string;
  state: string;
  auditOrganization: string;
  publicationYear: number;
  publicationMonth?: number;
  publicationDay?: number;
  overallConclusion?: string;
  llmInsight?: string;
  potentialObjectiveSummary?: string;
  auditScope?: string;
  originalReportSourceUrl?: string;
  originalFilename?: string;
  fileHash?: string;
  featured?: boolean;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  keywords: string[];

  programs: string[];
  conclusionExcerpt?: string;
}

export interface ReportWithDetails extends ReportListItem {
  objectives: Array<{
    id: number;
    reportId: number;
    objectiveText: string;
  }>;
  findings: Array<{
    id: number;
    reportId: number;
    findingText: string;
    financialImpact?: number;
  }>;
  recommendations: Array<{
    id: number;
    reportId: number;
    recommendationText: string;
    relatedFindingId?: number;
  }>;
}

export interface SearchResponse {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: SearchFilters;
}

export interface DashboardStats {
  totalReports: number;
  statesWithReports: number;
  criticalFindings: number;
  recentReports: ReportListItem[];
}

export interface ReportPreview {
  id: number;
  title: string;
  state?: string;
  agency: string;
  publicationDate: string;
  url: string;
}

export interface StateLatestResponse {
  byKey: Record<string, ReportPreview[]>;
  updatedAt: string;
}
