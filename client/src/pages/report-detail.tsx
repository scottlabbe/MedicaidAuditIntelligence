import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Download, BarChart3, ExternalLink, Shield } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import ReportDetailTabs from "@/components/reports/report-detail-tabs";
import type { ReportWithDetails } from "@/lib/types";

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:id");
  const { toast } = useToast();
  const reportId = params?.id;

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["/api/reports", reportId],
    enabled: !!reportId,
  }) as { data: ReportWithDetails | undefined; isLoading: boolean; error: Error | null };



  const handleAddToComparison = () => {
    // TODO: Implement comparison functionality
    toast({
      title: "Added to comparison",
      description: "Report has been added to your comparison list.",
    });
  };

  const formatDate = (report: ReportWithDetails) => {
    if (report.publicationDay && report.publicationMonth && report.publicationYear) {
      return new Date(report.publicationYear, report.publicationMonth - 1, report.publicationDay).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    
    if (report.publicationMonth) {
      return `${new Date(0, report.publicationMonth - 1).toLocaleDateString("en-US", { month: "long" })} ${report.publicationYear}`;
    }
    
    return report.publicationYear?.toString() || 'Unknown';
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading report: {error.message}</p>
            <Link href="/explore">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Explore
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-muted-foreground">Report not found</p>
            <Link href="/explore">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Explore
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/explore">
            <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Explore
            </Button>
          </Link>
        </div>

        {/* Report Detail */}
        <Card className="bg-card border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {report.state}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {report.auditOrganization}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Published {formatDate(report)}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-black mb-3 leading-tight">
                  {report.reportTitle}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                onClick={handleAddToComparison}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Compare</span>
              </Button>
            </div>
          </div>

          {/* Tabs Content */}
          <ReportDetailTabs report={report} />
        </Card>
      </div>
    </div>
  );
}
