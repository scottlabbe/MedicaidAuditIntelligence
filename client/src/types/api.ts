export interface Report {
  id: number;
  title: string;
  state: string;
  agency: string;
  publication_year: number;
  publication_month?: number;
  publication_day?: number;
  publication_date?: string;
  overall_conclusion?: string;
  audit_scope?: string;
  llm_insight?: string;
  potential_objective_summary?: string;
  original_report_source_url?: string;
  original_filename?: string;
  file_hash?: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  programs: string[];
  themes: string[];
  keywords: string[];
}

export interface Objective {
  id: number;
  report_id: number;
  text: string;
  created_at: string;
}

export interface Finding {
  id: number;
  report_id: number;
  text: string;
  severity?: 'info' | 'low' | 'medium' | 'high';
  created_at: string;
}

export interface Recommendation {
  id: number;
  report_id: number;
  related_finding_id?: number;
  text: string;
  created_at: string;
}

export interface ReportDetail extends Report {
  objectives: Objective[];
  findings: Finding[];
  recommendations: Recommendation[];
}

export interface SearchFilters {
  q?: string;
  state?: string;
  agency?: string;
  year?: number;
  theme?: string;
  program?: string;
  hasAiInsight?: boolean;
  featured?: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: 'date_desc' | 'date_asc' | 'relevance' | 'title_asc';
}

export interface SearchResult {
  items: Report[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  totalReports: number;
  statesWithReports: number;
  criticalFindings: number;
  recentReports: Report[];
  reportsByYear: { year: number; count: number }[];
  reportsByState: { state: string; count: number }[];
  reportsByTheme: { theme: string; count: number }[];
}

export interface EntityStats {
  state?: string;
  agency?: string;
  theme?: string;
  program?: string;
  reportCount: number;
}
