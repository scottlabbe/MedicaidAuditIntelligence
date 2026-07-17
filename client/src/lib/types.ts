export interface SearchFilters {
  query?: string;
  state?: string;
  agency?: string;
  year?: number;
  theme?: string;
  sourceStatus?: "available" | "record";
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
  totalFinancialImpact?: number;
  findingCount?: number;
  recommendationCount?: number;
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
  modelName?: string;
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

export interface IndexableStateSummary {
  code: string;
  name: string;
  slug: string;
  reportCount: number;
  latestReport?: ReportListItem;
}

export interface AgencySummary {
  slug: string;
  name: string;
  reportCount: number;
  latestReport?: ReportListItem;
}

export interface AgencyLandingPageData extends AgencySummary {
  reports: ReportListItem[];
}

export interface TopicSummary {
  slug: string;
  name: string;
  shortDescription: string;
  scope: string;
  reportCount: number;
}

export type TopicEvidenceSourceType =
  | "finding"
  | "recommendation"
  | "metadata";

export interface TopicEvidence {
  sourceType: TopicEvidenceSourceType;
  sourceLabel: string;
  text: string;
  rank: number;
}

export interface TopicReport {
  id: number;
  reportTitle: string;
  agency: string;
  jurisdiction: string;
  publicationYear: number;
  publicationMonth?: number;
  publicationDay?: number;
  rationale: string;
  evidence: TopicEvidence[];
  reportPath: string;
}

export interface TopicLandingPageData extends TopicSummary {
  definition: string;
  whyAuditorsCare: string;
  stateCount: number;
  hasFederalReports: boolean;
  agencyCount: number;
  publicationYearStart?: number;
  publicationYearEnd?: number;
  reports: TopicReport[];
}

export type TopicSlugResolution =
  | { kind: "canonical"; slug: string }
  | {
      kind: "alias";
      slug: string;
      canonicalSlug: string;
      redirectStatus: 301 | 308;
    }
  | { kind: "not_found"; slug: string };

export interface StateLandingPageData {
  code: string;
  name: string;
  slug: string;
  reportCount: number;
  latestReport?: ReportListItem;
  reports: ReportListItem[];
}

export interface ResearchReportSource {
  reportId: number;
  label: string;
  resolvedHref: string;
}

export interface ResearchReportListItem {
  slug: string;
  title: string;
  description: string;
  category: string;
  featured?: boolean;
  publishedDate?: string;
  updatedDate?: string;
  sourceCount?: number;
}

export interface ResearchReportSection {
  id: string;
  title: string;
  level: number;
  defaultExpanded: boolean;
  contentHtml: string;
  children?: ResearchReportSection[];
}

export interface ResearchReportPageData {
  slug: string;
  title: string;
  description: string;
  category: string;
  featured?: boolean;
  publishedDate?: string;
  updatedDate?: string;
  introHtml?: string;
  sections: ResearchReportSection[];
  citedReportIds: number[];
  sources: ResearchReportSource[];
  updatedAt?: string;
}

export interface HomeRouteData {
  stats: DashboardStats;
  latestReports: ReportListItem[];
  states: IndexableStateSummary[];
  topics: TopicSummary[];
  researchReports?: ResearchReportListItem[];
}

export interface ExploreRouteData {
  states: IndexableStateSummary[];
  featuredReports: ReportListItem[];
}

export interface InitialRouteData {
  routeType?: string;
  home?: HomeRouteData;
  explore?: ExploreRouteData;
  reportsIndex?: SearchResponse;
  statesIndex?: IndexableStateSummary[];
  agenciesIndex?: AgencySummary[];
  agencyPage?: AgencyLandingPageData;
  topicsIndex?: TopicSummary[];
  topicPage?: TopicLandingPageData;
  report?: ReportWithDetails;
  researchReports?: ResearchReportListItem[];
  researchReport?: ResearchReportPageData;
  dashboardStats?: DashboardStats;
  dashboardMapData?: StateLatestResponse;
  stateCode?: string;
  stateSearchResults?: SearchResponse;
}
