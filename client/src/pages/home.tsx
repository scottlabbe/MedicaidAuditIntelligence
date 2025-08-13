import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, MapPin, Zap } from "lucide-react";
import { Link } from "wouter";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import HeroSearch from "@/components/search/hero-search";
import StatsCard from "@/components/dashboard/stats-card";
import ReportCard from "@/components/reports/report-card";
import type { DashboardStats, ReportListItem } from "@/lib/types";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => apiClient.getDashboardStats(),
  });

  const { data: featuredReports, isLoading: reportsLoading } = useQuery<ReportListItem[]>({
    queryKey: ["/api/reports/featured"],
    queryFn: () => apiClient.getFeaturedReports(6),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Find insights from {stats?.totalReports || 105}+ Medicaid audit reports
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Search, compare, and analyze audit findings across states, agencies, and topics 
          to inform program management decisions.
        </p>
        
        <HeroSearch />
      </div>

      {/* Featured Reports Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Featured Reports</h2>
          <Link href="/explore">
            <Button variant="outline" className="flex items-center space-x-2">
              <span>View all reports</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        
        {reportsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <CardContent className="p-0">
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredReports?.map((report) => (
              <ReportCard key={report.id} report={report} />
            )) || (
              <div className="col-span-full text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No featured reports available</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Dashboard Preview Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Quick Insights</h2>
          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center space-x-2">
              <span>View full dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <CardContent className="p-0">
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-12" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatsCard
                title="Total Reports"
                value={stats?.totalReports || 0}
                subtitle="Last 5 years"
                trend="+12%"
                icon={FileText}
                color="indigo"
              />
              <StatsCard
                title="States Covered"
                value={stats?.statesWithReports || 0}
                subtitle="84% coverage"
                trend="50 states"
                icon={MapPin}
                color="emerald"
              />
              <StatsCard
                title="Critical Findings"
                value={stats?.criticalFindings || 0}
                subtitle="Requiring immediate action"
                trend="High"
                icon={Zap}
                color="amber"
              />
            </>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-muted/50 dark:bg-muted/20 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Ready to explore audit insights?
        </h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
          Start searching through our comprehensive database of Medicaid audit reports to find 
          the information you need for better program management.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/explore">
            <Button size="lg" className="flex items-center space-x-2">
              <span>Start Exploring</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              View Dashboard
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}