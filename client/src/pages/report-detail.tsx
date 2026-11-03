import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportRecord } from "@/components/reports/report-record";
import PageMeta from "@/components/seo/PageMeta";
import type { ReportWithDetails } from "@/lib/types";
import { reportPath } from "@shared/reportSlugs";
import { normalizePublicSourceUrl } from "@shared/sourceUrls";
import { getPublisherName } from "@/lib/publishers";

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:slug");
  const reportSlug = params?.slug;

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["/api/reports/by-slug", reportSlug],
    enabled: !!reportSlug,
    queryFn: () => apiClient.getReportBySlug(reportSlug!),
  }) as {
    data: ReportWithDetails | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const reportJsonLd = useMemo(() => {
    if (!report) return undefined;
    const dateStr = [
      report.publicationYear,
      report.publicationMonth
        ? String(report.publicationMonth).padStart(2, "0")
        : null,
      report.publicationDay
        ? String(report.publicationDay).padStart(2, "0")
        : null,
    ]
      .filter(Boolean)
      .join("-");
    const sourceUrl = normalizePublicSourceUrl(report.originalReportSourceUrl);

    return {
      "@context": "https://schema.org",
      "@type": "Report",
      name: report.reportTitle,
      url: `https://www.medicaidintelligence.com${reportPath(report)}`,
      mainEntityOfPage: `https://www.medicaidintelligence.com${reportPath(report)}`,
      author: { "@type": "Organization", name: report.auditOrganization },
      datePublished: dateStr,
      dateModified: report.updatedAt,
      description: report.overallConclusion?.substring(0, 155) || "",
      about: { "@type": "GovernmentService", name: "Medicaid" },
      spatialCoverage:
        report.jurisdictionScopeType === "national"
          ? { "@type": "Place", name: "United States" }
          : report.subjectJurisdictions.map((jurisdiction) => ({
              "@type": "Place",
              name: jurisdiction.name,
            })),
      ...(sourceUrl ? { isBasedOn: sourceUrl } : {}),
      publisher: {
        "@type": "Organization",
        name: getPublisherName(report),
        ...(report.publisherKey
          ? {
              url: `https://www.medicaidintelligence.com/agencies/${report.publisherKey}`,
            }
          : {}),
      },
    };
  }, [report]);

  if (error) {
    return (
      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <PageMeta
          title="Audit Report"
          description="View detailed Medicaid audit report findings, recommendations, and original source evidence."
          ogType="article"
        />
        <Card className="rounded-sm border-border p-8 text-center shadow-none">
          <CardContent>
            <p className="text-destructive">
              Error loading report: {error.message}
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-sm">
              <Link href="/reports">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <ReportRecordSkeleton />;
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <PageMeta
          title="Report not found"
          description="The requested audit report could not be found."
          robots="noindex, follow"
        />
        <Card className="rounded-sm border-border p-8 text-center shadow-none">
          <CardContent>
            <p className="text-muted-foreground">Report not found</p>
            <Button asChild variant="outline" className="mt-4 rounded-sm">
              <Link href="/reports">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={report.reportTitle}
        description={(
          report.overallConclusion ||
          report.llmInsight ||
          "View this Medicaid audit report's findings, recommendations, and original source."
        ).substring(0, 155)}
        canonicalPath={reportPath(report)}
        ogType="article"
        jsonLd={reportJsonLd}
      />
      <ReportRecord report={report} />
    </>
  );
}

function ReportRecordSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14"
      aria-hidden="true"
    >
      <Skeleton className="h-5 w-56" />
      <div className="mt-6 border-t-4 border-primary pt-6">
        <Skeleton className="h-4 w-52" />
        <Skeleton className="mt-4 h-12 w-full max-w-4xl" />
        <Skeleton className="mt-3 h-12 w-4/5 max-w-3xl" />
        <div className="mt-8 grid border-y border-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="border-b border-border p-4 sm:p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-5 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,760px)_minmax(220px,1fr)]">
        <div className="space-y-10">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-52 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
