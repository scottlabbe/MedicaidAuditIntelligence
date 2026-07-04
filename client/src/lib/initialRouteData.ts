import { queryClient } from "./queryClient";
import type { InitialRouteData } from "./types";
import type { QueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    __INITIAL_ROUTE_DATA__?: InitialRouteData;
  }
}

export function primeInitialRouteData(
  client: QueryClient = queryClient,
  initialRouteData: InitialRouteData | undefined =
    typeof window !== "undefined" ? window.__INITIAL_ROUTE_DATA__ : undefined,
) {
  if (!initialRouteData) {
    return;
  }

  if (initialRouteData.routeType === "home" && initialRouteData.home) {
    client.setQueryData(
      ["/api/dashboard/stats"],
      initialRouteData.home.stats,
    );
    client.setQueryData(
      [
        "/api/reports",
        { sortBy: "date_desc" },
        { page: 1, pageSize: 4 },
      ],
      {
        items: initialRouteData.home.latestReports,
        total: initialRouteData.home.stats.totalReports,
        page: 1,
        pageSize: 4,
        filters: { sortBy: "date_desc" },
      },
    );
    client.setQueryData(["/api/topics"], initialRouteData.home.topics);
  }

  if (
    initialRouteData.routeType === "reports_index" &&
    initialRouteData.reportsIndex
  ) {
    client.setQueryData(
      [
        "/api/reports",
        initialRouteData.reportsIndex.filters,
        initialRouteData.reportsIndex.page,
      ],
      initialRouteData.reportsIndex,
    );
  }

  if (
    initialRouteData.routeType === "states_index" &&
    initialRouteData.statesIndex
  ) {
    client.setQueryData(["/api/states"], initialRouteData.statesIndex);
  }

  if (
    initialRouteData.routeType === "agencies_index" &&
    initialRouteData.agenciesIndex
  ) {
    client.setQueryData(["/api/agencies"], initialRouteData.agenciesIndex);
  }

  if (
    initialRouteData.routeType === "agency" &&
    initialRouteData.agencyPage
  ) {
    client.setQueryData(
      ["/api/agencies", initialRouteData.agencyPage.slug],
      initialRouteData.agencyPage,
    );
  }

  if (
    initialRouteData.routeType === "topics_index" &&
    initialRouteData.topicsIndex
  ) {
    client.setQueryData(["/api/topics"], initialRouteData.topicsIndex);
  }

  if (
    initialRouteData.routeType === "topic" &&
    initialRouteData.topicPage
  ) {
    client.setQueryData(
      ["/api/topics", initialRouteData.topicPage.slug],
      initialRouteData.topicPage,
    );
  }

  if (initialRouteData.routeType === "report" && initialRouteData.report) {
    client.setQueryData(
      ["/api/reports", String(initialRouteData.report.id)],
      initialRouteData.report,
    );
  }

  if (
    initialRouteData.routeType === "research_index" &&
    initialRouteData.researchReports
  ) {
    client.setQueryData(
      ["/api/research-reports"],
      initialRouteData.researchReports,
    );
  }

  if (
    initialRouteData.routeType === "research" &&
    initialRouteData.researchReport
  ) {
    client.setQueryData(
      ["/api/research-reports", initialRouteData.researchReport.slug],
      initialRouteData.researchReport,
    );
  }

  if (initialRouteData.routeType === "dashboard") {
    if (initialRouteData.dashboardStats) {
      client.setQueryData(
        ["/api/dashboard/stats"],
        initialRouteData.dashboardStats,
      );
    }

    if (initialRouteData.dashboardMapData) {
      client.setQueryData(
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
    client.setQueryData(
      ["/api/reports", "state-page", initialRouteData.stateCode],
      initialRouteData.stateSearchResults,
    );
  }

  if (typeof window !== "undefined") {
    delete window.__INITIAL_ROUTE_DATA__;
  }
}
