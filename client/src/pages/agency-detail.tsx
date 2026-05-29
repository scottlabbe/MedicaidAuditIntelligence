import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Building2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import ReportCard from "@/components/reports/report-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AgencyLandingPageData } from "@/lib/types";

export default function AgencyDetail() {
  const [, params] = useRoute("/agencies/:slug");
  const slug = params?.slug || "";
  const { data, isLoading, error } = useQuery<AgencyLandingPageData>({
    queryKey: ["/api/agencies", slug],
    enabled: Boolean(slug),
    queryFn: () => apiClient.getAgencyBySlug(slug),
  });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <PageMeta title="Agency not found" description="The requested audit agency page could not be found." robots="noindex, follow" />
        <p className="text-destructive">Error loading agency: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageMeta
        title={data ? `${data.name} Medicaid Audit Reports` : "Medicaid Audit Agency Reports"}
        description={data ? `Browse ${data.reportCount} Medicaid audit reports from ${data.name}.` : "Browse Medicaid audit reports by oversight agency."}
        canonicalPath={`/agencies/${slug}`}
      />
      <Link href="/agencies">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All agencies
        </Button>
      </Link>
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          Audit Agency
        </div>
        <h1 className="text-3xl font-bold text-foreground">{data?.name || "Medicaid audit agency"}</h1>
        <p className="mt-3 text-muted-foreground">{data ? `${data.reportCount} indexed reports` : "Loading reports..."}</p>
      </header>
      {isLoading ? (
        <Card><CardContent className="p-8">Loading agency reports...</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data?.reports.map((report) => <ReportCard key={report.id} report={report} />)}
        </div>
      )}
    </div>
  );
}
