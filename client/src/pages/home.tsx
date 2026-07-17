import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { getStateNameByCode } from "@shared/states";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import HeroSearch from "@/components/search/hero-search";
import PageMeta from "@/components/seo/PageMeta";
import type {
  DashboardStats,
  IndexableStateSummary,
  ReportListItem,
  ReportWithDetails,
  ResearchReportListItem,
  SearchResponse,
  TopicSummary,
} from "@/lib/types";
import { preloadRouteHref } from "@/lib/routeLoaders";
import { useSsrData } from "@/lib/ssrData";

const LATEST_REPORT_COUNT = 4;
const LATEST_REPORT_QUERY = [
  "/api/reports",
  { sortBy: "date_desc" },
  { page: 1, pageSize: LATEST_REPORT_COUNT },
] as const;

export default function Home() {
  const ssrData = useSsrData();
  const initialStateLinks =
    ssrData?.routeType === "home" ? ssrData.home?.states ?? [] : [];
  const initialTopics =
    ssrData?.routeType === "home" ? ssrData.home?.topics ?? [] : [];
  const initialResearch =
    ssrData?.routeType === "home" ? ssrData.home?.researchReports ?? [] : [];
  const [activeReportIndex, setActiveReportIndex] = useState(0);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => apiClient.getDashboardStats(),
  }) as { data: DashboardStats | undefined };

  const { data: stateLinks = initialStateLinks } = useQuery<IndexableStateSummary[]>({
    queryKey: ["/api/states"],
    queryFn: () => apiClient.getStates(),
    initialData: initialStateLinks.length > 0 ? initialStateLinks : undefined,
  });

  const { data: topicLinks = initialTopics } = useQuery<TopicSummary[]>({
    queryKey: ["/api/topics"],
    queryFn: () => apiClient.getTopics(),
    initialData: initialTopics.length > 0 ? initialTopics : undefined,
  });

  const { data: researchBriefs = initialResearch } = useQuery<
    ResearchReportListItem[]
  >({
    queryKey: ["/api/research-reports"],
    queryFn: () => apiClient.getResearchReports(),
    initialData: initialResearch.length > 0 ? initialResearch : undefined,
  });

  const {
    data: latestResponse,
    isLoading: reportsLoading,
    error: reportsError,
  } = useQuery<SearchResponse>({
    queryKey: LATEST_REPORT_QUERY,
    queryFn: () =>
      apiClient.getReports(
        { sortBy: "date_desc" },
        { page: 1, pageSize: LATEST_REPORT_COUNT },
      ) as Promise<SearchResponse>,
  });

  const latestReports = latestResponse?.items ?? [];
  const activeReport = latestReports[activeReportIndex];

  const { data: activeReportDetails } = useQuery<ReportWithDetails>({
    queryKey: ["/api/reports", String(activeReport?.id)],
    queryFn: () =>
      apiClient.getReportById(String(activeReport.id)) as Promise<ReportWithDetails>,
    enabled: Boolean(activeReport),
  });

  useEffect(() => {
    if (latestReports.length > 0 && activeReportIndex >= latestReports.length) {
      setActiveReportIndex(latestReports.length - 1);
    }
  }, [activeReportIndex, latestReports.length]);

  const prefetchHandlers = (href: string) => ({
    onMouseEnter: () => preloadRouteHref(href),
    onFocus: () => preloadRouteHref(href),
    onTouchStart: () => preloadRouteHref(href),
  });

  const agencyLinks = useMemo(() => {
    const seen = new Set<string>();
    return latestReports.filter((report) => {
      if (seen.has(report.auditOrganization)) return false;
      seen.add(report.auditOrganization);
      return true;
    }).slice(0, 2);
  }, [latestReports]);

  const yearLinks = useMemo(
    () =>
      Array.from(new Set(latestReports.map((report) => report.publicationYear)))
        .slice(0, 2),
    [latestReports],
  );

  return (
    <>
      <PageMeta
        title="Medicaid Audit Intelligence - Find Medicaid Audit Evidence"
        description={`Find and verify evidence from ${stats?.totalReports || 100}+ Medicaid audit reports across ${stats?.statesWithReports || 40} states, with direct links to original public sources.`}
        canonicalPath="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Medicaid Audit Intelligence",
            url: "https://www.medicaidintelligence.com",
            description:
              "A public evidence library for Medicaid audit findings, recommendations, financial impacts, and source documents.",
            founder: {
              "@type": "Person",
              name: "Scott Labbe",
              url: "https://scottlabbe.me",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Medicaid Audit Intelligence",
            url: "https://www.medicaidintelligence.com",
            potentialAction: {
              "@type": "SearchAction",
              target:
                "https://www.medicaidintelligence.com/explore?query={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />

      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <section
          className="border-b-2 border-primary py-12 sm:py-16 lg:py-20"
          aria-labelledby="homepage-title"
        >
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Public evidence library
          </p>
          <h1
            id="homepage-title"
            className="max-w-3xl text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl"
          >
            Find Medicaid audit findings
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Search by topic, state, publishing agency, report title, or finding
            language. Every record links back to its original public source.
          </p>
          <div className="mt-8 max-w-4xl">
            <HeroSearch />
          </div>
        </section>

        <section className="py-10 sm:py-14" aria-labelledby="latest-evidence-title">
          <div className="mb-5 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Ordered by publication date
              </p>
              <h2
                id="latest-evidence-title"
                className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
              >
                Latest evidence
              </h2>
            </div>

            {latestReports.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-2"
                aria-label="Latest evidence controls"
              >
                <span className="mr-1 font-mono text-xs text-muted-foreground">
                  {activeReportIndex + 1} of {latestReports.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActiveReportIndex((index) => Math.max(0, index - 1))
                  }
                  disabled={activeReportIndex === 0}
                  aria-controls="latest-evidence-docket"
                >
                  <ArrowLeft aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActiveReportIndex((index) =>
                      Math.min(latestReports.length - 1, index + 1),
                    )
                  }
                  disabled={activeReportIndex === latestReports.length - 1}
                  aria-controls="latest-evidence-docket"
                >
                  Next
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>

          {activeReport && (
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              Viewing report {activeReportIndex + 1} of {latestReports.length}:{" "}
              {activeReport.reportTitle}
            </p>
          )}

          {reportsLoading ? (
            <EvidenceDocketSkeleton />
          ) : reportsError ? (
            <div className="border border-border bg-muted p-6">
              <p className="font-semibold text-foreground">
                Latest evidence is temporarily unavailable.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Search or browse the full report library instead.
              </p>
              <Link
                href="/reports"
                className="mt-4 inline-block font-semibold text-primary underline underline-offset-4"
              >
                Browse all reports
              </Link>
            </div>
          ) : activeReport ? (
            <EvidenceDocket
              key={activeReport.id}
              report={activeReport}
              details={activeReportDetails}
              prefetchHandlers={prefetchHandlers}
            />
          ) : (
            <div className="border border-border p-6 text-muted-foreground">
              No published reports are available.
            </div>
          )}
        </section>

        <ResearchBriefs
          briefs={researchBriefs}
          prefetchHandlers={prefetchHandlers}
        />

        <TopicBand topics={topicLinks} prefetchHandlers={prefetchHandlers} />

        <BrowseEvidence
          states={stateLinks}
          agencies={agencyLinks}
          research={researchBriefs}
          years={yearLinks}
          prefetchHandlers={prefetchHandlers}
        />
      </div>
    </>
  );
}

function ResearchBriefs({
  briefs,
  prefetchHandlers,
}: {
  briefs: ResearchReportListItem[];
  prefetchHandlers: (href: string) => Record<string, () => void>;
}) {
  if (!briefs.length) return null;

  return (
    <section
      className="border-t-2 border-primary py-10 sm:py-14"
      aria-labelledby="research-briefs-title"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Research synthesis
          </p>
          <h2
            id="research-briefs-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
          >
            Cross-report research briefs
          </h2>
        </div>
        <Link
          href="/research"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4"
          {...prefetchHandlers("/research")}
        >
          View all research
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid border-l border-t border-border md:grid-cols-3">
        {briefs.slice(0, 3).map((brief) => {
          const briefHref = `/research/${brief.slug}`;
          return (
            <article
              key={brief.slug}
              className="flex flex-col border-b border-r border-border p-5"
            >
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                {brief.category}
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-6 tracking-[-0.01em] text-foreground">
                <Link
                  href={briefHref}
                  className="decoration-primary/40 underline-offset-4 hover:underline"
                  {...prefetchHandlers(briefHref)}
                >
                  {brief.title}
                </Link>
              </h3>
              <p className="mt-3 font-serif text-sm leading-6 text-muted-foreground">
                {truncateText(brief.description, 150)}
              </p>
              {typeof brief.sourceCount === "number" && (
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {brief.sourceCount} cited audit{" "}
                  {brief.sourceCount === 1 ? "report" : "reports"}
                </p>
              )}
              <Link
                href={briefHref}
                className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4"
                {...prefetchHandlers(briefHref)}
              >
                Read the brief
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TopicBand({
  topics,
  prefetchHandlers,
}: {
  topics: TopicSummary[];
  prefetchHandlers: (href: string) => Record<string, () => void>;
}) {
  const topTopics = [...topics]
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 6);

  if (!topTopics.length) return null;

  return (
    <section
      className="border-t-2 border-primary py-10 sm:py-14"
      aria-labelledby="topic-band-title"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Curated subjects
          </p>
          <h2
            id="topic-band-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
          >
            Browse by topic
          </h2>
        </div>
        <Link
          href="/topics"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4"
          {...prefetchHandlers("/topics")}
        >
          All topics
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <ul className="flex flex-wrap gap-3">
        {topTopics.map((topic) => {
          const topicHref = `/topics/${topic.slug}`;
          return (
            <li key={topic.slug}>
              <Link
                href={topicHref}
                className="inline-flex min-h-11 items-center gap-2.5 border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...prefetchHandlers(topicHref)}
              >
                {topic.name}
                <span className="font-mono text-[11px] font-normal text-muted-foreground">
                  {topic.reportCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function EvidenceDocket({
  report,
  details,
  prefetchHandlers,
}: {
  report: ReportListItem;
  details?: ReportWithDetails;
  prefetchHandlers: (href: string) => Record<string, () => void>;
}) {
  const reportHref = `/reports/${report.id}`;
  const summary = getReportSummary(report);
  const financialImpact =
    details?.totalFinancialImpact ?? report.totalFinancialImpact;

  return (
    <article
      id="latest-evidence-docket"
      className="border border-border border-t-4 border-t-primary bg-card"
    >
      <div className="grid md:grid-cols-[minmax(190px,0.72fr)_minmax(0,2.28fr)]">
        <dl className="border-b border-border bg-secondary p-5 md:border-b-0 md:border-r md:p-6">
          <DocketField
            label="Jurisdiction"
            value={getJurisdictionLabel(report.state)}
          />
          <DocketField label="Publishing agency" value={report.auditOrganization} />
          <DocketField label="Published" value={formatPublicationDate(report)} />
          <DocketField label="Report ID" value={`REPORT ${report.id}`} mono />
          <div className="mt-6 border-t border-primary/25 pt-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {report.originalReportSourceUrl
                ? "Original source available"
                : "Library record available"}
            </span>
          </div>
        </dl>

        <div className="p-5 sm:p-7 md:p-8">
          <h3 className="max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.015em] text-foreground sm:text-3xl">
            <Link
              href={reportHref}
              className="decoration-primary/50 underline-offset-4 hover:underline"
              {...prefetchHandlers(reportHref)}
            >
              {report.reportTitle}
            </Link>
          </h3>

          {summary && (
            <p className="mt-5 max-w-3xl font-serif text-lg leading-8 text-muted-foreground">
              {summary}
            </p>
          )}

          <dl className="mt-8 grid border-y border-border sm:grid-cols-3">
            {typeof financialImpact === "number" && financialImpact > 0 && (
              <Metric label="Financial impact" value={formatCurrency(financialImpact)} />
            )}
            <Metric
              label="Findings"
              value={details ? String(details.findings.length) : "—"}
            />
            <Metric
              label="Recommendations"
              value={details ? String(details.recommendations.length) : "—"}
            />
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={reportHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...prefetchHandlers(reportHref)}
            >
              Open evidence record
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {report.originalReportSourceUrl && (
              <a
                href={report.originalReportSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-border px-5 py-2.5 text-sm font-semibold text-foreground underline decoration-border underline-offset-4 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                View original report
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DocketField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-sm leading-5 text-foreground ${
          mono ? "font-mono" : "font-semibold"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border px-0 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}

function BrowseEvidence({
  states,
  agencies,
  research,
  years,
  prefetchHandlers,
}: {
  states: Array<{ code: string; name: string; slug: string; reportCount: number }>;
  agencies: ReportListItem[];
  research: ResearchReportListItem[];
  years: number[];
  prefetchHandlers: (href: string) => Record<string, () => void>;
}) {
  const browseGroups: Array<{
    label: string;
    href: string;
    intro: string;
    examples: Array<{ label: string; href: string; meta?: string }>;
  }> = [
    {
      label: "By state",
      href: "/states",
      intro: "Reports grouped by Medicaid jurisdiction.",
      examples: states.slice(0, 2).map((state) => ({
        label: state.name,
        meta: state.reportCount > 0 ? `${state.reportCount} reports` : undefined,
        href: `/states/${state.slug}`,
      })),
    },
    {
      label: "By agency",
      href: "/agencies",
      intro: "Publishing auditors and oversight offices.",
      examples: agencies.map((report) => ({
        label: report.auditOrganization,
        href: `/explore?agency=${encodeURIComponent(report.auditOrganization)}`,
      })),
    },
    {
      label: "Research",
      href: "/research",
      intro: "Cross-report analysis grounded in audit evidence.",
      examples: research.slice(0, 2).map((brief) => ({
        label: brief.title,
        href: `/research/${brief.slug}`,
      })),
    },
    {
      label: "By year",
      href: "/reports",
      intro: "Audit evidence by publication period.",
      examples: years.map((year) => ({
        label: String(year),
        href: `/explore?year=${year}`,
      })),
    },
  ];

  return (
    <section
      className="border-t-2 border-primary py-10 sm:py-14"
      aria-labelledby="browse-evidence-title"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Library index
      </p>
      <h2
        id="browse-evidence-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
      >
        Browse the evidence
      </h2>

      <div className="mt-6 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {browseGroups.map((group) => (
          <div
            key={group.label}
            className="flex min-h-64 flex-col border-b border-r border-border p-5"
          >
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              {group.label}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {group.intro}
            </p>
            <ul className="mt-5 space-y-3">
              {group.examples.map((example) => (
                <li key={`${group.label}-${example.label}`}>
                  <Link
                    href={example.href}
                    className="text-sm font-semibold text-foreground underline decoration-border underline-offset-4 hover:text-primary"
                    {...prefetchHandlers(example.href)}
                  >
                    {example.label}
                  </Link>
                  {example.meta ? (
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      {example.meta}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <Link
              href={group.href}
              className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4"
              {...prefetchHandlers(group.href)}
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidenceDocketSkeleton() {
  return (
    <div className="grid border border-border border-t-4 border-t-primary md:grid-cols-[minmax(190px,0.72fr)_minmax(0,2.28fr)]">
      <div className="space-y-5 bg-secondary p-6">
        {[52, 88, 64, 44].map((width) => (
          <div key={width}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-4" style={{ width: `${width}%` }} />
          </div>
        ))}
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

function getReportSummary(report: ReportListItem) {
  const summary =
    report.overallConclusion ||
    report.llmInsight ||
    report.potentialObjectiveSummary ||
    report.auditScope;

  if (!summary) return undefined;
  return summary.length > 420 ? `${summary.slice(0, 417).trim()}…` : summary;
}

function formatPublicationDate(report: ReportListItem) {
  if (!report.publicationMonth) return String(report.publicationYear);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: report.publicationDay ? "numeric" : undefined,
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(
      Date.UTC(
        report.publicationYear,
        report.publicationMonth - 1,
        report.publicationDay || 1,
      ),
    ),
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getJurisdictionLabel(stateCode: string) {
  if (stateCode === "US") return "Federal";
  return getStateNameByCode(stateCode) || stateCode;
}
