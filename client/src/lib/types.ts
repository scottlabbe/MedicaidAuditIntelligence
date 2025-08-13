export interface SearchFilters {
  query?: string;
  state?: string;
  agency?: string;
  year?: number;
  theme?: string;
  program?: string;
  hasAiInsight?: boolean;
  featured?: boolean;
  severity?: "info" | "low" | "medium" | "high";
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export * from "@shared/schema";
