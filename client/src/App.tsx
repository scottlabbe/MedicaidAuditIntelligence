import { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RouteChunkErrorBoundary from "@/components/routing/RouteChunkErrorBoundary";
import RouteFallback from "@/components/routing/RouteFallback";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { lazyRoutes } from "@/lib/routeLoaders";

const {
  Explore,
  ReportDetail,
  ResearchIndexPage,
  ResearchReportPage,
  Dashboard,
  About,
  StateDetail,
} = lazyRoutes;

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="min-h-[calc(100vh-4rem)]">
        <RouteChunkErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/explore" component={Explore} />
              <Route path="/research" component={ResearchIndexPage} />
              <Route path="/research/:slug" component={ResearchReportPage} />
              <Route path="/reports/:id" component={ReportDetail} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
