import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, FileText, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReportCard from "@/components/reports/report-card";
import PageMeta from "@/components/seo/PageMeta";
import type { SearchResponse } from "@/lib/types";
import { getStateEntryBySlug } from "@shared/states";

function formatDate(
  year?: number,
  month?: number,
  day?: number,
): string | undefined {
  if (!year) return undefined;

  if (month && day) {
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (month) {
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  }

  return String(year);
}

export default function StateDetail() {
  const [, params] = useRoute("/states/:slug");
  const slug = params?.slug;
  const stateEntry = useMemo(() => getStateEntryBySlug(slug), [slug]);

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/reports", "state-page", stateEntry?.code],
    enabled: Boolean(stateEntry?.code),
    queryFn: () =>
      apiClient.getReports(
        { state: stateEntry!.code, sortBy: "date_desc" },
        { page: 1, pageSize: 12 },
      ) as Promise<SearchResponse>,
  });

  const latestReport = data?.items[0];
  const latestDate = latestReport
    ? formatDate(
        latestReport.publicationYear,
        latestReport.publicationMonth,
        latestReport.publicationDay,
      )
    : undefined;

  if (!stateEntry) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageMeta
          title="State page not found"
          description="The requested state audit page does not exist."
          robots="noindex, follow"
        />
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-muted-foreground">State page not found.</p>
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

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageMeta
          title={`${stateEntry.name} Medicaid Audit Reports`}
          description={`Browse Medicaid audit reports for ${stateEntry.name}.`}
          canonicalPath={`/states/${stateEntry.slug}`}
        />
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading state page: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && data && data.total === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageMeta
          title={`${stateEntry.name} Medicaid Audit Reports`}
          description={`Browse Medicaid audit reports for ${stateEntry.name}.`}
          robots="noindex, follow"
        />
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-muted-foreground">No indexed reports are available for this state.</p>
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

  const description = latestDate
    ? `Browse ${data?.total || 0} Medicaid audit reports for ${stateEntry.name}. Review findings, recommendations, and the latest oversight activity published through ${latestDate}.`
    : `Browse ${data?.total || 0} Medicaid audit reports for ${stateEntry.name}. Review findings, recommendations, and oversight activity from public audit sources.`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageMeta
        title={`Medicaid Audit Reports in ${stateEntry.name}`}
        description={description}
        canonicalPath={`/states/${stateEntry.slug}`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Medicaid Audit Reports in ${stateEntry.name}`,
            url: `https://www.medicaidintelligence.com/states/${stateEntry.slug}`,
            description,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://www.medicaidintelligence.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Explore",
                item: "https://www.medicaidintelligence.com/explore",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: `${stateEntry.name} Medicaid Audit Reports`,
                item: `https://www.medicaidintelligence.com/states/${stateEntry.slug}`,
              },
            ],
          },
        ]}
      />

      <div className="mb-8">
        <Link href="/explore">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </Link>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{stateEntry.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {stateEntry.name} Medicaid Audit Reports
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Review Medicaid audit findings, recommendations, and oversight activity for {stateEntry.name}. Use this page to jump into report summaries or continue exploring the full library.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {isLoading ? (
          [...Array(3)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Indexed Reports</p>
                <p className="text-3xl font-bold text-foreground mt-2">{data?.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Latest Publication</p>
                <p className="text-lg font-semibold text-foreground mt-2">{latestDate || "Unknown"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Next Step</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">View Dashboard</Button>
                  </Link>
                  <Link href="/explore">
                    <Button size="sm">Explore All Reports</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Recent Reports</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data?.items.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
