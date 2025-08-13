import { queryClient } from "./queryClient";
import type { SearchFilters, PaginationParams } from "./types";

const API_BASE = "/api";

export class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: "include",
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
    return this.request(`/reports${queryString ? `?${queryString}` : ""}`);
  }

  async getReportById(id: string) {
    return this.request(`/reports/${id}`);
  }

  async getFeaturedReports(limit?: number) {
    const params = limit ? `?limit=${limit}` : "";
    return this.request(`/reports/featured${params}`);
  }

  // Dashboard
  async getDashboardStats() {
    return this.request("/dashboard/stats");
  }

  // Export
  async exportReports(filters?: SearchFilters, format: "csv" | "json" = "json") {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    
    params.append("format", format);
    
    const response = await fetch(`${API_BASE}/export?${params.toString()}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    if (format === "csv") {
      return response.text();
    }
    
    return response.json();
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
