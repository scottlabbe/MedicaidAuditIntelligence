import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Tags } from "lucide-react";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import ReportCard from "@/components/reports/report-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TopicLandingPageData } from "@/lib/types";

export default function TopicDetail() {
  const [, params] = useRoute("/topics/:slug");
  const slug = params?.slug || "";
  const { data, isLoading, error } = useQuery<TopicLandingPageData>({
    queryKey: ["/api/topics", slug],
    enabled: Boolean(slug),
    queryFn: () => apiClient.getTopicBySlug(slug),
  });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <PageMeta title="Topic not found" description="The requested audit topic page could not be found." robots="noindex, follow" />
        <p className="text-destructive">Error loading topic: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageMeta
        title={data ? `${data.name} Medicaid Audit Reports` : "Medicaid Audit Topic Reports"}
        description={data?.description || "Browse Medicaid audit reports by topic."}
        canonicalPath={`/topics/${slug}`}
      />
      <Link href="/topics">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All topics
        </Button>
      </Link>
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          <Tags className="h-4 w-4" />
          Audit Topic
        </div>
        <h1 className="text-3xl font-bold text-foreground">{data?.name || "Medicaid audit topic"}</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">{data?.description}</p>
      </header>
      {isLoading ? (
        <Card><CardContent className="p-8">Loading topic reports...</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data?.reports.map((report) => <ReportCard key={report.id} report={report} />)}
        </div>
      )}
    </div>
  );
}
