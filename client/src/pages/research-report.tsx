import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { getStateNameByCode } from "@shared/states";
import { apiClient } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import PageMeta from "@/components/seo/PageMeta";
import ResearchSection from "@/components/research/ResearchSection";
import type {
  ResearchReportPageData,
  ResearchReportSection,
  ResearchReportSource,
} from "@/lib/types";

const AI_RESEARCH_AGENT_ARTICLE_URL =
  "https://scottlabbe.me/articles/building-an-ai-research-agent/";

export default function ResearchReportPage() {
  const [, params] = useRoute("/research/:slug");
  const slug = params?.slug;

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["/api/research-reports", slug],
    enabled: !!slug,
    queryFn: () => apiClient.getResearchReportBySlug(slug!),
  }) as {
    data: ResearchReportPageData | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const pageDescription =
    report?.description ||
    "Research synthesis grounded in linked Medicaid audit evidence.";

  if (error) {
    return (
      <ResearchState
        title="Research report could not be loaded"
        message="Return to the research index and try opening the report again."
      />
    );
  }

  if (isLoading) {
    return <ResearchReportSkeleton />;
  }

  if (!report) {
    return (
      <ResearchState
        title="Research report not found"
        message="The requested research report is not available."
      />
    );
  }

  const contentSections = report.sections.filter(
    (section) => section.title.toLowerCase() !== "sources referenced",
  );
  const sourcesById = new Map(
    report.sources.map((source) => [source.reportId, source]),
  );

  return (
    <div className="min-h-screen bg-background">
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
          url: `https://www.medicaidintelligence.com/research/${report.slug}`,
          mainEntityOfPage: `https://www.medicaidintelligence.com/research/${report.slug}`,
          dateModified: report.updatedAt,
          author: {
            "@type": "Organization",
            name: "Medicaid Audit Intelligence",
          },
          publisher: {
            "@type": "Organization",
            name: "Medicaid Audit Intelligence",
            url: "https://www.medicaidintelligence.com",
          },
          citation: report.sources.map((source) => source.resolvedHref),
        }}
      />

      <div className="mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/research"
                className="underline decoration-primary/40 underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Research
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {report.category}
            </li>
          </ol>
        </nav>

        <header className="mt-7 border-b-2 border-primary pb-9">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Research synthesis
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <span>{report.sources.length} cited audit reports</span>
              {report.updatedAt && (
                <span>{formatResearchDate(report.updatedAt)}</span>
              )}
            </div>
          </div>

          <h1 className="mt-5 max-w-[900px] text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl lg:text-[44px]">
            {report.title}
          </h1>
          <p className="mt-5 max-w-[760px] font-serif text-lg leading-8 text-muted-foreground">
            {pageDescription}
          </p>
          <a
            href={AI_RESEARCH_AGENT_ARTICLE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            How this research was produced
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>

          {report.introHtml ? (
            <div
              className="research-prose prose mt-7 max-w-[760px] border-l-4 border-primary bg-muted px-5 py-4 prose-p:my-2 prose-a:font-sans prose-a:font-semibold prose-a:text-primary prose-a:underline"
              dangerouslySetInnerHTML={{ __html: report.introHtml }}
            />
          ) : null}
        </header>

        <MobileSectionIndex sections={contentSections} />

        <div className="mt-10 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
          <SectionIndex sections={contentSections} />

          <article className="min-w-0">
            <div className="space-y-10">
              {contentSections.map((section) => (
                <ResearchSection
                  key={section.id}
                  section={section}
                  sourcesById={sourcesById}
                />
              ))}
            </div>

            <SourceRegister sources={report.sources} />
          </article>
        </div>
      </div>
    </div>
  );
}

function SectionIndex({ sections }: { sections: ResearchReportSection[] }) {
  return (
    <nav
      aria-label="Research report sections"
      className="sticky top-24 hidden self-start border-t-2 border-primary pt-4 lg:block"
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        In this report
      </p>
      <ul className="mt-4 space-y-3">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="block text-sm font-semibold leading-5 text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileSectionIndex({
  sections,
}: {
  sections: ResearchReportSection[];
}) {
  return (
    <details className="mt-7 border-y border-border lg:hidden">
      <summary className="min-h-12 cursor-pointer py-3 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        In this report
      </summary>
      <nav aria-label="Research report sections" className="pb-5">
        <ul className="space-y-3">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block py-1 text-sm font-semibold leading-5 text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}

function SourceRegister({ sources }: { sources: ResearchReportSource[] }) {
  return (
    <section
      id="sources-referenced"
      className="mt-12 scroll-mt-24 border-t-2 border-primary pt-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Evidence register
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Sources referenced</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {sources.length} audit {sources.length === 1 ? "report" : "reports"}
        </span>
      </div>

      <div className="border-b border-border">
        {sources.map((source) => {
          const details = parseSourceLabel(source);
          return (
            <article
              key={source.reportId}
              className="grid border-b border-border py-6 last:border-b-0 md:grid-cols-[110px_minmax(0,1fr)_145px] md:gap-6"
            >
              <dl className="grid grid-cols-2 gap-4 md:block">
                <SourceField
                  label="Report ID"
                  value={`REPORT ${source.reportId}`}
                  mono
                />
                {details.jurisdiction && (
                  <SourceField
                    label="Jurisdiction"
                    value={details.jurisdiction}
                  />
                )}
              </dl>

              <div className="mt-4 border-t border-border pt-4 md:mt-0 md:border-t-0 md:pt-0">
                <h3 className="text-lg font-semibold leading-6">
                  <Link
                    href={source.resolvedHref}
                    className="decoration-primary/40 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {details.title}
                  </Link>
                </h3>
                {details.agency && (
                  <p className="mt-3 text-sm font-semibold leading-5 text-muted-foreground">
                    {details.agency}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-border pt-4 md:mt-0 md:border-t-0 md:pt-0">
                {details.date && (
                  <SourceField label="Published" value={details.date} mono />
                )}
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Source status
                </p>
                <p className="mt-1.5 text-sm font-semibold">Indexed evidence</p>
                <Link
                  href={source.resolvedHref}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Review audit
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SourceField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1.5 break-words text-sm leading-5 ${
          mono ? "font-mono" : "font-semibold"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function parseSourceLabel(source: ResearchReportSource) {
  const pattern =
    /^\[Report \d+\]\s+(.+?)\s+\(state=([^;]+);\s*organization=(.+?);\s*publication_date=([^)]+)\)/;
  const match = source.label.match(pattern);

  if (!match) {
    return {
      title: source.label.replace(/^\[Report \d+\]\s*/, ""),
      jurisdiction: undefined,
      agency: undefined,
      date: undefined,
    };
  }

  const stateCode = match[2].trim();
  return {
    title: match[1].trim(),
    jurisdiction:
      stateCode === "US"
        ? "Federal"
        : getStateNameByCode(stateCode) || stateCode,
    agency: match[3].trim(),
    date: new Date(`${match[4].trim()}T00:00:00Z`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  };
}

function formatResearchDate(value: string) {
  return `Updated ${new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
}

function ResearchState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-12 sm:px-6 lg:px-8">
      <PageMeta
        title={title}
        description={message}
        robots="noindex, follow"
      />
      <div className="max-w-[680px] border-y-2 border-primary py-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-muted-foreground">{message}</p>
        <Link
          href="/research"
          className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to research
        </Link>
      </div>
    </div>
  );
}

function ResearchReportSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1120px] px-5 py-10 sm:px-6 lg:px-8"
      aria-busy="true"
    >
      <Skeleton className="h-4 w-40" />
      <div className="mt-7 border-b-2 border-primary pb-9">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-5 h-11 w-4/5" />
        <Skeleton className="mt-4 h-5 w-full max-w-[760px]" />
        <Skeleton className="mt-3 h-5 w-3/4 max-w-[760px]" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        <div className="space-y-5">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
