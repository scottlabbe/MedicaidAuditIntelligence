import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, FileStack, LibraryBig } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageMeta from "@/components/seo/PageMeta";
import ResearchSection from "@/components/research/ResearchSection";
import type { ResearchReportPageData } from "@/lib/types";

export default function ResearchReportPage() {
  const [, params] = useRoute("/research/:slug");
  const slug = params?.slug;
  const [activeHashId, setActiveHashId] = useState(getHashId());

  useEffect(() => {
    const updateHash = () => setActiveHashId(getHashId());
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["/api/research-reports", slug],
    enabled: !!slug,
    queryFn: () => apiClient.getResearchReportBySlug(slug!),
  }) as {
    data: ResearchReportPageData | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  useEffect(() => {
    if (!report || !activeHashId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(activeHashId)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [activeHashId, report]);

  const pageDescription = useMemo(() => {
    return (
      report?.description ||
      "Research report with linked Medicaid audit citations and expandable sections."
    );
  }, [report]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
        <PageMeta
          title="Research Report"
          description="Research report page"
          robots="noindex, follow"
        />
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading research report: {error.message}</p>
            <Link href="/research">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Research
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
        <PageMeta
          title="Research report not found"
          description="The requested research report could not be found."
          robots="noindex, follow"
        />
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-muted-foreground">Research report not found</p>
            <Link href="/research">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Research
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <PageMeta
        title={report.title}
        description={pageDescription}
        canonicalPath={`/research/${report.slug}`}
        ogType="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: report.title,
          description: pageDescription,
          dateModified: report.updatedAt,
        }}
      />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        <div>
          <Link href="/research">
            <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Research
            </Button>
          </Link>

          <div className="research-report-shell overflow-hidden rounded-[2rem] border border-orange-200/80 bg-gradient-to-br from-orange-50/90 via-background to-amber-50/70 warm-shadow-lg">
            <div className="research-report-title border-b border-orange-200/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.98),rgba(255,237,213,0.96)_48%,rgba(255,251,235,0.98))] px-8 py-8 lg:px-10 lg:py-10">
              <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-orange-200/70 pb-5">
                <Badge variant="secondary" className="gap-2 border border-orange-300/60 bg-orange-100 text-orange-950">
                  <LibraryBig className="h-3.5 w-3.5" />
                  Research Report
                </Badge>
                <Badge variant="outline" className="gap-2 border-orange-300/70 bg-white/90 text-orange-900">
                  <FileStack className="h-3.5 w-3.5" />
                  {report.sources.length} linked audit reports
                </Badge>
                {report.updatedAt ? (
                  <span className="text-sm font-medium text-orange-900/75">
                    Updated {new Date(report.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <p className="max-w-4xl text-sm font-semibold uppercase tracking-[0.22em] text-orange-800/80">
                  {report.category}
                </p>
                <h1 className="max-w-5xl text-4xl font-black leading-tight tracking-tight text-orange-950 lg:text-5xl">
                  {report.title}
                </h1>
                <p className="max-w-4xl text-lg leading-relaxed text-slate-700">
                  {pageDescription}
                </p>
              </div>

              {report.introHtml ? (
                <div
                  className="prose mt-6 max-w-4xl text-sm text-slate-700 prose-p:my-2 prose-a:text-orange-700 prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: report.introHtml }}
                />
              ) : null}
            </div>

            <div className="px-5 py-6 lg:px-6 lg:py-7">
              <div className="space-y-5">
                {report.sections.map((section) => (
                  <ResearchSection
                    key={section.id}
                    section={section}
                    activeHashId={activeHashId}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getHashId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = window.location.hash.replace(/^#/, "").trim();
  return raw || undefined;
}
