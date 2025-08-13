import { useQuery } from "@tanstack/react-query";
import { FileText, MapPin, Zap, TrendingUp, Calendar, Building } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/dashboard/stats-card";
import type { DashboardStats } from "@/lib/types";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => apiClient.getDashboardStats(),
  });

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading dashboard: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of Medicaid audit reports and key insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
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
              subtitle="Comprehensive audit database"
              trend="+12%"
              icon={FileText}
              color="indigo"
            />
            <StatsCard
              title="States Covered"
              value={stats?.statesWithReports || 0}
              subtitle="Nationwide coverage"
              trend="50 states"
              icon={MapPin}
              color="emerald"
            />
            <StatsCard
              title="Critical Findings"
              value={stats?.criticalFindings || 0}
              subtitle="High-priority issues"
              trend="High"
              icon={Zap}
              color="amber"
            />
            <StatsCard
              title="Recent Reports"
              value={stats?.recentReports?.length || 0}
              subtitle="This month"
              trend="New"
              icon={Calendar}
              color="indigo"
            />
          </>
        )}
      </div>

      {/* Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recentReports?.length ? (
              <div className="space-y-4">
                {stats.recentReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">
                        {report.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {report.state} • {report.agency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.publicationYear}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent reports available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Coverage Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total States</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.statesWithReports || 0}/50
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Coverage Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.statesWithReports ? Math.round((stats.statesWithReports / 50) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Critical Issues</span>
                  <span className="text-sm text-destructive font-medium">
                    {stats?.criticalFindings || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Reports</span>
                  <span className="text-sm text-primary font-medium">
                    {stats?.totalReports || 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">
                  {stats?.totalReports || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Reports in database
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-emerald-600 mb-2">
                  {stats?.statesWithReports || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  States with coverage
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-amber-600 mb-2">
                  {stats?.criticalFindings || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Critical findings identified
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
