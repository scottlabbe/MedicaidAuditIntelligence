import { lazy } from "react";
import type { ComponentType } from "react";

type RouteModule = { default: ComponentType<any> };
type RouteLoader = () => Promise<RouteModule>;

const loaders = {
  explore: () => import("@/pages/explore"),
  reportsIndex: () => import("@/pages/reports-index"),
  statesIndex: () => import("@/pages/states-index"),
  agenciesIndex: () => import("@/pages/agencies-index"),
  agencyDetail: () => import("@/pages/agency-detail"),
  topicsIndex: () => import("@/pages/topics-index"),
  topicDetail: () => import("@/pages/topic-detail"),
  researchIndex: () => import("@/pages/research-index"),
  researchReport: () => import("@/pages/research-report"),
  reportDetail: () => import("@/pages/report-detail"),
  stateDetail: () => import("@/pages/state-detail"),
  dashboard: () => import("@/pages/dashboard"),
  about: () => import("@/pages/about"),
} satisfies Record<string, RouteLoader>;

export const lazyRoutes = {
  Explore: lazy(loaders.explore),
  ReportsIndex: lazy(loaders.reportsIndex),
  StatesIndex: lazy(loaders.statesIndex),
  AgenciesIndex: lazy(loaders.agenciesIndex),
  AgencyDetail: lazy(loaders.agencyDetail),
  TopicsIndex: lazy(loaders.topicsIndex),
  TopicDetail: lazy(loaders.topicDetail),
  ResearchIndexPage: lazy(loaders.researchIndex),
  ResearchReportPage: lazy(loaders.researchReport),
  ReportDetail: lazy(loaders.reportDetail),
  StateDetail: lazy(loaders.stateDetail),
  Dashboard: lazy(loaders.dashboard),
  About: lazy(loaders.about),
};

function stripQueryAndHash(pathname: string): string {
  return pathname.split("#")[0].split("?")[0];
}

function getLoaderForPath(pathname: string): RouteLoader | null {
  const path = stripQueryAndHash(pathname);

  if (path === "/explore") return loaders.explore;
  if (path === "/reports" || /^\/reports\/page\/\d+$/.test(path)) return loaders.reportsIndex;
  if (path === "/states") return loaders.statesIndex;
  if (path === "/agencies") return loaders.agenciesIndex;
  if (/^\/agencies\/[a-z0-9-]+$/.test(path)) return loaders.agencyDetail;
  if (path === "/topics") return loaders.topicsIndex;
  if (/^\/topics\/[a-z0-9-]+$/.test(path)) return loaders.topicDetail;
  if (path === "/research") return loaders.researchIndex;
  if (/^\/research\/[a-z0-9-]+$/.test(path)) return loaders.researchReport;
  if (/^\/reports\/\d+$/.test(path)) return loaders.reportDetail;
  if (/^\/states\/[a-z0-9-]+$/.test(path)) return loaders.stateDetail;
  if (path === "/dashboard") return loaders.dashboard;
  if (path === "/about") return loaders.about;

  return null;
}

export async function preloadRouteForPath(pathname: string): Promise<void> {
  const loader = getLoaderForPath(pathname);
  if (!loader) {
    return;
  }

  await loader();
}

function normalizeHrefToPath(href: string): string | null {
  if (!href) return null;

  if (href.startsWith("/")) {
    return href;
  }

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function preloadRouteHref(href: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const path = normalizeHrefToPath(href);
  if (!path) {
    return;
  }

  void preloadRouteForPath(path);
}
