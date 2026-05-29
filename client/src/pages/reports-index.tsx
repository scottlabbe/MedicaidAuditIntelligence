import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { apiClient } from "@/lib/api";
import ReportCard from "@/components/reports/report-card";
import PageMeta from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchResponse } from "@/lib/types";

const PAGE_SIZE = 24;

export default function ReportsIndex() {
  const [, pageParams] = useRoute("/reports/page/:page");
  const page = Math.max(1, Number(pageParams?.page || 1));

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/reports", { sortBy: "date_desc" }, page],
    queryFn: () =>
      apiClient.getReports(
        { sortBy: "date_desc" },
        { page, pageSize: PAGE_SIZE },
      ) as Promise<SearchResponse>,
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE)),
    [data?.total],
  );
  const canonicalPath = page === 1 ? "/reports" : `/reports/page/${page}`;

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <PageMeta
          title="Medicaid Audit Reports"
          description="Browse Medicaid audit report summaries, findings, recommendations, and source documents."
          canonicalPath={canonicalPath}
        />
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading reports: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageMeta
        title={page === 1 ? "Medicaid Audit Reports" : `Medicaid Audit Reports - Page ${page}`}
        description="Browse the full Medicaid Audit Intelligence report library with links to report summaries, findings, recommendations, and original source documents."
        canonicalPath={canonicalPath}
        jsonLd={data ? [buildDataset(), buildItemList(data, page)] : buildDataset()}
      />

      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          Report Library
        </div>
        <h1 className="text-3xl font-bold text-foreground">Medicaid audit reports</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Browse every indexed Medicaid audit report. Each listing links to a crawlable detail page with conclusions, findings, recommendations, and the original public source document.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(9)].map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {data && totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Report pages">
          {page > 1 ? (
            <Link href={page === 2 ? "/reports" : `/reports/page/${page - 1}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            </Link>
          ) : null}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/reports/page/${page + 1}`}>
              <Button variant="outline">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </nav>
      )}
    </div>
  );
}

function buildItemList(data: SearchResponse, page: number) {
  const offset = (page - 1) * PAGE_SIZE;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: data.items.map((report, index) => ({
      "@type": "ListItem",
      position: offset + index + 1,
      url: `https://www.medicaidintelligence.com/reports/${report.id}`,
      name: report.reportTitle,
    })),
  };
}

function buildDataset() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Medicaid Audit Intelligence Report Database",
    description:
      "Searchable corpus of Medicaid audit reports with structured findings, recommendations, state coverage, audit agencies, and source document links.",
    url: "https://www.medicaidintelligence.com/reports",
    creator: {
      "@type": "Organization",
      name: "Medicaid Audit Intelligence",
    },
    keywords: [
      "Medicaid audits",
      "program integrity",
      "managed care",
      "pharmacy benefit managers",
      "eligibility",
    ],
    isAccessibleForFree: true,
  };
}
