import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { apiClient } from "@/lib/api";
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

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageMeta
        title="Research"
        description="Cross-report Medicaid oversight analysis grounded in authoritative audit evidence."
        canonicalPath="/research"
        ogType="website"
      />

      <header className="max-w-[760px]">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Research
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-foreground sm:text-4xl">
          Medicaid oversight research
        </h1>
        <p className="mt-4 font-serif text-lg leading-8 text-muted-foreground">
          Cross-report analysis grounded in the audit library. Each research
          brief connects recurring findings to the original evidence records.
        </p>
        <a
          href={AI_RESEARCH_AGENT_ARTICLE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          How this research is produced
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </header>

      <section className="mt-12" aria-labelledby="research-briefs-heading">
        <div className="flex items-end justify-between gap-4 border-b-2 border-primary pb-3">
          <h2
            id="research-briefs-heading"
            className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-foreground"
          >
            Research briefs
          </h2>
          {!isLoading && !error && (
            <span className="font-mono text-xs text-muted-foreground">
              {reports?.length ?? 0}{" "}
              {reports?.length === 1 ? "brief" : "briefs"}
            </span>
          )}
        </div>

        {isLoading ? (
          <ResearchRegisterSkeleton />
        ) : error ? (
          <div className="border-b border-border py-8" role="alert">
            <h3 className="text-lg font-semibold">
              Research briefs could not be loaded
            </h3>
            <p className="mt-2 text-muted-foreground">
              Refresh the page to try again.
            </p>
          </div>
        ) : reports?.length ? (
          <div className="border-b border-border">
            {reports.map((report) => (
              <article
                key={report.slug}
                className="grid border-b border-border py-7 last:border-b-0 md:grid-cols-[160px_minmax(0,1fr)_150px] md:gap-7"
              >
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {report.category}
                  </p>
                  {typeof report.sourceCount === "number" && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {report.sourceCount} cited audit{" "}
                      {report.sourceCount === 1 ? "report" : "reports"}
                    </p>
                  )}
                </div>

                <div className="mt-4 md:mt-0">
                  <h3 className="text-xl font-semibold leading-7 tracking-[-0.01em]">
                    <Link
                      href={`/research/${report.slug}`}
                      className="decoration-primary/40 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {report.title}
                    </Link>
                  </h3>
                  <p className="mt-3 max-w-[680px] font-serif leading-7 text-muted-foreground">
                    {report.description}
                  </p>
                </div>

                <div className="mt-5 border-t border-border pt-4 md:mt-0 md:border-t-0 md:pt-0">
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    {formatReportDate(report)}
                  </p>
                  <Link
                    href={`/research/${report.slug}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Open research
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-b border-border py-8">
            <h3 className="text-lg font-semibold">
              No research briefs are available
            </h3>
            <p className="mt-2 text-muted-foreground">
              Search the audit library for individual evidence records.
            </p>
          </div>
        )}
      </section>

      <aside className="mt-10 border-l-4 border-primary bg-muted px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <p className="font-semibold">Need an individual audit report?</p>
        <Link
          href="/reports"
          className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mt-0"
        >
          Search the audit library
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}

function ResearchRegisterSkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="grid border-b border-border py-7 md:grid-cols-[160px_minmax(0,1fr)_150px] md:gap-7"
        >
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-4 space-y-3 md:mt-0">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="mt-5 space-y-3 md:mt-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatReportDate(report: ResearchReportListItem): string {
  const date = report.updatedDate || report.publishedDate;
  if (!date) return "Date not listed";

  const prefix = report.updatedDate ? "Updated" : "Published";
  return `${prefix} ${new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
}
