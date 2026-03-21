import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import Explore from "@/pages/explore";
import ReportDetail from "@/pages/report-detail";
import Dashboard from "@/pages/dashboard";
import About from "@/pages/about";
import NotFound from "@/pages/not-found";
import StateDetail from "@/pages/state-detail";

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="min-h-[calc(100vh-4rem)]">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/explore" component={Explore} />
          <Route path="/reports/:id" component={ReportDetail} />
          <Route path="/states/:slug" component={StateDetail} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/about" component={About} />
          <Route component={NotFound} />
        </Switch>
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
