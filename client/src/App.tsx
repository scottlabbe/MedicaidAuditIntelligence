import { Suspense } from "react";
import type { ComponentType } from "react";
import { Router as WouterRouter, Switch, Route } from "wouter";
import { queryClient as defaultQueryClient } from "./lib/queryClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RouteChunkErrorBoundary from "@/components/routing/RouteChunkErrorBoundary";
import RouteFallback from "@/components/routing/RouteFallback";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { lazyRoutes } from "@/lib/routeLoaders";
import { SsrDataProvider } from "@/lib/ssrData";
import type { InitialRouteData } from "@/lib/types";

const {
  Explore,
  ReportDetail,
  ResearchIndexPage,
  ResearchReportPage,
  Dashboard,
  About,
  StateDetail,
  ReportsIndex,
  StatesIndex,
  AgenciesIndex,
  AgencyDetail,
  TopicsIndex,
  TopicDetail,
} = lazyRoutes;

export interface RouteComponents {
  Explore: ComponentType<any>;
  ReportsIndex: ComponentType<any>;
  StatesIndex: ComponentType<any>;
  AgenciesIndex: ComponentType<any>;
  AgencyDetail: ComponentType<any>;
  TopicsIndex: ComponentType<any>;
  TopicDetail: ComponentType<any>;
  ReportDetail: ComponentType<any>;
  ResearchIndexPage: ComponentType<any>;
  ResearchReportPage: ComponentType<any>;
  Dashboard: ComponentType<any>;
  About: ComponentType<any>;
  StateDetail: ComponentType<any>;
}

const defaultRouteComponents: RouteComponents = {
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

interface AppProps {
  queryClient?: QueryClient;
  ssrPath?: string;
  ssrSearch?: string;
  initialRouteData?: InitialRouteData;
  routeComponents?: RouteComponents;
}

function AppRoutes({
  routeComponents = defaultRouteComponents,
}: {
  routeComponents?: RouteComponents;
}) {
  const {
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
  } = routeComponents;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="min-h-[calc(100vh-4rem)]">
        <RouteChunkErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/explore" component={Explore} />
              <Route path="/reports" component={ReportsIndex} />
              <Route path="/reports/page/:page" component={ReportsIndex} />
              <Route path="/agencies" component={AgenciesIndex} />
              <Route path="/agencies/:slug" component={AgencyDetail} />
              <Route path="/topics" component={TopicsIndex} />
              <Route path="/topics/:slug" component={TopicDetail} />
              <Route path="/research" component={ResearchIndexPage} />
              <Route path="/research/:slug" component={ResearchReportPage} />
              <Route path="/reports/:id" component={ReportDetail} />
              <Route path="/states" component={StatesIndex} />
              <Route path="/states/:slug" component={StateDetail} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/about" component={About} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </RouteChunkErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

function App({
  queryClient = defaultQueryClient,
  ssrPath,
  ssrSearch,
  initialRouteData,
  routeComponents,
}: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SsrDataProvider initialRouteData={initialRouteData}>
          <WouterRouter ssrPath={ssrPath} ssrSearch={ssrSearch}>
            <AppRoutes routeComponents={routeComponents} />
          </WouterRouter>
        </SsrDataProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
