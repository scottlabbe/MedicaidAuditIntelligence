import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReportDetailTabs from "@/components/reports/report-detail-tabs";
import PageMeta from "@/components/seo/PageMeta";
import type { ReportWithDetails } from "@/lib/types";
import { getStateEntryByCode } from "@shared/states";

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:id");
  const reportId = params?.id;

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["/api/reports", reportId],
    enabled: !!reportId,
    queryFn: () => apiClient.getReportById(reportId!),
  }) as { data: ReportWithDetails | undefined; isLoading: boolean; error: Error | null };

  const reportJsonLd = useMemo(() => {
    if (!report) return undefined;
    const dateStr = [
      report.publicationYear,
      report.publicationMonth ? String(report.publicationMonth).padStart(2, "0") : null,
      report.publicationDay ? String(report.publicationDay).padStart(2, "0") : null,
    ].filter(Boolean).join("-");
    return {
      "@context": "https://schema.org",
      "@type": "Report",
      name: report.reportTitle,
      author: { "@type": "Organization", name: report.auditOrganization },
      datePublished: dateStr,
      description: report.overallConclusion?.substring(0, 155) || "",
      about: { "@type": "GovernmentService", name: "Medicaid" },
      spatialCoverage: { "@type": "Place", name: report.state },
      publisher: {
        "@type": "Organization",
        name: "Medicaid Audit Intelligence",
        url: "https://www.medicaidintelligence.com",
      },
    };
  }, [report]);

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

  const stateEntry = report ? getStateEntryByCode(report.state) : undefined;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageMeta
          title={reportId ? `Audit Report ${reportId}` : "Audit Report"}
          description="View detailed Medicaid audit report with findings, recommendations, and analysis."
          canonicalPath={reportId ? `/reports/${reportId}` : undefined}
          ogType="article"
        />
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
        <PageMeta
          title="Report not found"
          description="The requested audit report could not be found."
          robots="noindex, follow"
        />
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
      {report && (
        <PageMeta
          title={report.reportTitle}
          description={
            (report.overallConclusion || report.llmInsight || "View detailed Medicaid audit report with findings, recommendations, and analysis.").substring(0, 155)
          }
          canonicalPath={`/reports/${reportId}`}
          ogType="article"
          jsonLd={reportJsonLd}
        />
      )}
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
                  {stateEntry ? (
                    <Link href={`/states/${stateEntry.slug}`}>
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                        {stateEntry.name}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {report.state}
                    </Badge>
                  )}
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
            

          </div>

          {/* Tabs Content */}
          <ReportDetailTabs report={report} />
        </Card>
      </div>
    </div>
  );
}
