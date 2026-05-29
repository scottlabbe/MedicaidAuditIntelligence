import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient } from "@tanstack/react-query";
import App, { type RouteComponents } from "./App";
import { primeInitialRouteData } from "./lib/initialRouteData";
import type { InitialRouteData } from "./lib/types";
import Explore from "./pages/explore";
import ReportsIndex from "./pages/reports-index";
import StatesIndex from "./pages/states-index";
import AgenciesIndex from "./pages/agencies-index";
import AgencyDetail from "./pages/agency-detail";
import TopicsIndex from "./pages/topics-index";
import TopicDetail from "./pages/topic-detail";
import ReportDetail from "./pages/report-detail";
import ResearchIndexPage from "./pages/research-index";
import ResearchReportPage from "./pages/research-report";
import Dashboard from "./pages/dashboard";
import About from "./pages/about";
import StateDetail from "./pages/state-detail";
import "./index.css";

const routeComponents: RouteComponents = {
  Explore,
  ReportsIndex,
  StatesIndex,
  AgenciesIndex,
  AgencyDetail,
  TopicsIndex,
  TopicDetail,
  ReportDetail,
  ResearchIndexPage,
  ResearchReportPage,
  Dashboard,
  About,
  StateDetail,
};

export interface ServerRenderResult {
  appHtml: string;
  headHtml: string;
}

export function render(url: string, initialRouteData?: InitialRouteData): ServerRenderResult {
  const parsedUrl = new URL(url, "https://www.medicaidintelligence.com");
  const helmetContext: Record<string, any> = {};
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 5 * 60 * 1000,
      },
      mutations: {
        retry: false,
      },
    },
  });

  primeInitialRouteData(queryClient, initialRouteData);

  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <App
        queryClient={queryClient}
        ssrPath={parsedUrl.pathname}
        ssrSearch={parsedUrl.search}
        initialRouteData={initialRouteData}
        routeComponents={routeComponents}
      />
    </HelmetProvider>,
  );

  const { helmet } = helmetContext;
  const headHtml = helmet
    ? [
        helmet.title.toString(),
        helmet.priority?.toString?.() ?? "",
        helmet.meta.toString(),
        helmet.link.toString(),
        helmet.script.toString(),
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return { appHtml, headHtml };
}
