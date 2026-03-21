import { queryClient } from "./queryClient";
import type { ReportWithDetails } from "./types";

declare global {
  interface Window {
    __INITIAL_ROUTE_DATA__?: {
      routeType?: string;
      report?: ReportWithDetails;
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

  delete window.__INITIAL_ROUTE_DATA__;
}
