import { queryClient } from "./queryClient";
import type {
  SearchFilters,
  PaginationParams,
  ResearchReportListItem,
  ResearchReportPageData,
  StateLatestResponse,
} from "./types";

const API_BASE = "/api";

export class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  // Reports
  async getReports(filters?: SearchFilters, pagination?: PaginationParams) {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    
    if (pagination) {
      Object.entries(pagination).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    return this.request<any>(`/reports${queryString ? `?${queryString}` : ""}`);
  }

  async getReportById(id: string) {
    return this.request(`/reports/${id}`);
  }

  async getResearchReportBySlug(slug: string) {
    return this.request<ResearchReportPageData>(`/research-reports/${slug}`);
  }

  async getResearchReports() {
    return this.request<ResearchReportListItem[]>("/research-reports");
  }

  async getFeaturedReports(limit?: number) {
    const params = limit ? `?limit=${limit}` : "";
    return this.request(`/reports/featured${params}`);
  }

  // Dashboard
  async getDashboardStats() {
    return this.request("/dashboard/stats");
  }

  async getLatestReportsByState(opts: { limit?: number; scope?: 'state' | 'federal' } = {}) {
    const limit = opts.limit ?? 3;
    const scope = opts.scope ?? 'state';
    return this.request<StateLatestResponse>(`/reports/state-latest?limit=${limit}&scope=${scope}`);
  }



  // Search utilities
  invalidateReports() {
    queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
  }

  invalidateDashboard() {
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  }
}

export const apiClient = new ApiClient();
