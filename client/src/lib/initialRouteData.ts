import { queryClient } from "./queryClient";
import type {
  DashboardStats,
  ReportWithDetails,
  SearchResponse,
  StateLatestResponse,
} from "./types";

declare global {
  interface Window {
    __INITIAL_ROUTE_DATA__?: {
      routeType?: string;
      report?: ReportWithDetails;
      dashboardStats?: DashboardStats;
      dashboardMapData?: StateLatestResponse;
      stateCode?: string;
      stateSearchResults?: SearchResponse;
    };
  }
}

export function primeInitialRouteData() {
  const initialRouteData = window.__INITIAL_ROUTE_DATA__;
  if (!initialRouteData) {
    return;
  }

  if (initialRouteData.routeType === "report" && initialRouteData.report) {
    queryClient.setQueryData(
      ["/api/reports", String(initialRouteData.report.id)],
      initialRouteData.report,
    );
  }

  if (initialRouteData.routeType === "dashboard") {
    if (initialRouteData.dashboardStats) {
      queryClient.setQueryData(
        ["/api/dashboard/stats"],
        initialRouteData.dashboardStats,
      );
    }

    if (initialRouteData.dashboardMapData) {
      queryClient.setQueryData(
        ["/api/reports/state-latest", "state"],
        initialRouteData.dashboardMapData,
      );
    }
  }

  if (
    initialRouteData.routeType === "state" &&
    initialRouteData.stateCode &&
    initialRouteData.stateSearchResults
  ) {
    queryClient.setQueryData(
      ["/api/reports", "state-page", initialRouteData.stateCode],
      initialRouteData.stateSearchResults,
    );
  }

  delete window.__INITIAL_ROUTE_DATA__;
}
