import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, FileStack, LibraryBig, Star } from "lucide-react";
import { Link } from "wouter";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageMeta from "@/components/seo/PageMeta";
import type { ResearchReportListItem } from "@/lib/types";

const AI_RESEARCH_AGENT_ARTICLE_URL =
  "https://scottlabbe.me/articles/building-an-ai-research-agent/";

export default function ResearchIndexPage() {
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["/api/research-reports"],
    queryFn: () => apiClient.getResearchReports(),
  }) as {
    data: ResearchReportListItem[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
        <PageMeta
          title="Research"
          description="Research reports for Medicaid oversight topics."
          robots="noindex, follow"
        />
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading research reports: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-8">
      <PageMeta
        title="Research"
        description="Explore research reports with linked Medicaid audit citations and expandable analysis."
        canonicalPath="/research"
        ogType="website"
      />

      <section className="rounded-[2rem] border border-orange-200/80 bg-gradient-to-br from-orange-50/90 via-background to-amber-50/70 px-8 py-9 warm-shadow-lg">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="gap-2 border border-orange-300/60 bg-orange-100 text-orange-950">
            <LibraryBig className="h-3.5 w-3.5" />
            Research Library
          </Badge>
          <span className="text-sm font-medium text-orange-900/75">
            Long-form oversight analysis linked to report detail pages
          </span>
        </div>
        <h1 className="max-w-4xl text-4xl font-black tracking-tight text-orange-950 lg:text-5xl">
          Research reports
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          Browse topic-level research reports built from the Medicaid audit library. Each report links directly to the underlying audit report detail pages for source review.
        </p>
        <a
          href={AI_RESEARCH_AGENT_ARTICLE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-900 underline-offset-4 hover:underline"
        >
          Learn how the AI-generated research projects were created
          <ExternalLink className="h-4 w-4" />
        </a>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="rounded-3xl">
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-5 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reports?.length ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {reports.map((report) => (
            <Link key={report.slug} href={`/research/${report.slug}`}>
              <Card className="h-full cursor-pointer rounded-3xl border border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg">
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-900">
                      {report.category}
                    </Badge>
                    {report.featured ? (
                      <Badge variant="secondary" className="gap-1 border border-orange-300/60 bg-orange-100 text-orange-950">
                        <Star className="h-3 w-3" />
                        Featured
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold leading-tight text-foreground">
                      {report.title}
                    </h2>
                    <p className="leading-relaxed text-muted-foreground">
                      {report.description}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
                    <span>
                      {formatReportDate(report)}
                    </span>
                    <span className="inline-flex items-center gap-2 font-medium text-orange-700">
                      Open report
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="p-10 text-center">
            <FileStack className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">
              No research reports available yet
            </h2>
            <p className="mt-2 text-muted-foreground">
              Add a report folder with `report.md` and `metadata.json` under `reports/` to publish it here.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-start">
        <Link href="/explore">
          <Button variant="outline" className="gap-2">
            View audit report library
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function formatReportDate(report: ResearchReportListItem): string {
  if (report.updatedDate) {
    return `Updated ${new Date(report.updatedDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  }

  if (report.publishedDate) {
    return `Published ${new Date(report.publishedDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  }

  return "Research report";
}
