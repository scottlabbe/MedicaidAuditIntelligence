import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useRoute } from "wouter";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import type {
  TopicEvidenceSourceType,
  TopicLandingPageData,
  TopicReport,
} from "@/lib/types";

const INITIAL_EVIDENCE_COUNT = 3;

interface GuideEvidenceItem {
  key: string;
  text: string;
  rank: number;
  report: TopicReport;
}

export default function TopicDetail() {
  const [, params] = useRoute("/topics/:slug");
  const slug = params?.slug || "";
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const { data, isLoading, error } = useQuery<TopicLandingPageData>({
    queryKey: ["/api/topics", slug],
    enabled: Boolean(slug),
    queryFn: () => apiClient.getTopicBySlug(slug),
  });

  const findings = useMemo(
    () => buildGuideEvidence(data, "finding"),
    [data],
  );
  const recommendations = useMemo(
    () => buildGuideEvidence(data, "recommendation"),
    [data],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <PageMeta
          title="Topic not found"
          description="The requested audit topic page could not be found."
          robots="noindex, follow"
        />
        <Link
          href="/topics"
          className="inline-flex items-center gap-2 font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All topics
        </Link>
        <h1 className="mt-10 text-3xl font-bold">Topic not found</h1>
        <p className="mt-4 text-muted-foreground">
          The requested topic is not part of the active public taxonomy.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
      <PageMeta
        title={data ? `${data.name} Medicaid Audit Guide` : "Medicaid Audit Topic Guide"}
        description={data?.definition || "Browse Medicaid audit evidence by topic."}
        canonicalPath={data ? `/topics/${data.slug}` : `/topics/${slug}`}
      />

      <Link
        href="/topics"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All topics
      </Link>

      <header className="mt-8 border-b-2 border-primary pb-9 sm:mt-10 sm:pb-12">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Medicaid audit topic guide
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
          {data?.name || "Medicaid audit topic"}
        </h1>
      </header>

      {isLoading ? (
        <TopicGuideSkeleton />
      ) : data ? (
        <div className="mt-10 grid gap-12 lg:grid-cols-[220px_minmax(0,760px)] lg:gap-16">
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start" aria-label="Topic guide contents">
            <nav className="border-y border-border py-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                In this guide
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><GuideAnchor href="#definition">Definition</GuideAnchor></li>
                <li><GuideAnchor href="#why-auditors-care">Why auditors care</GuideAnchor></li>
                <li><GuideAnchor href="#supporting-findings">Supporting findings</GuideAnchor></li>
                <li><GuideAnchor href="#recommendations">Recommendations</GuideAnchor></li>
                <li><GuideAnchor href="#related-reports">Related reports</GuideAnchor></li>
              </ul>
            </nav>

            <CoverageLedger data={data} />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              State coverage reflects each report’s recorded jurisdiction.
            </p>
          </aside>

          <article className="min-w-0">
            <GuideSection id="definition" title="Definition">
              <p className="font-serif text-xl leading-8 text-foreground sm:text-2xl sm:leading-9">
                {data.definition}
              </p>
            </GuideSection>

            <GuideSection id="why-auditors-care" title="Why auditors care">
              <p className="font-serif text-lg leading-8 text-foreground">
                {data.whyAuditorsCare}
              </p>
            </GuideSection>

            <section
              className="border-b border-border pb-12 pt-12 lg:hidden"
              aria-labelledby="evidence-coverage-heading"
            >
              <h2
                id="evidence-coverage-heading"
                className="mb-5 border-b border-border pb-3 text-2xl font-bold tracking-[-0.015em] text-foreground"
              >
                Evidence coverage
              </h2>
              <CoverageLedger data={data} />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                State coverage reflects each report’s recorded jurisdiction.
              </p>
            </section>

            <GuideSection
              id="supporting-findings"
              title="Supporting findings"
              countLabel={`${findings.length} ${findings.length === 1 ? "finding" : "findings"}`}
            >
              <EvidenceSchedule
                items={
                  showAllFindings
                    ? findings
                    : findings.slice(0, INITIAL_EVIDENCE_COUNT)
                }
                emptyText="No finding excerpts are available for this topic."
              />
              <EvidenceToggle
                total={findings.length}
                expanded={showAllFindings}
                itemLabel="findings"
                onClick={() => setShowAllFindings((expanded) => !expanded)}
              />
            </GuideSection>

            <GuideSection
              id="recommendations"
              title="Recommendations"
              countLabel={`${recommendations.length} ${recommendations.length === 1 ? "recommendation" : "recommendations"}`}
            >
              <EvidenceSchedule
                items={
                  showAllRecommendations
                    ? recommendations
                    : recommendations.slice(0, INITIAL_EVIDENCE_COUNT)
                }
                emptyText="No recommendation excerpts are available for this topic."
              />
              <EvidenceToggle
                total={recommendations.length}
                expanded={showAllRecommendations}
                itemLabel="recommendations"
                onClick={() =>
                  setShowAllRecommendations((expanded) => !expanded)
                }
              />
            </GuideSection>

            <GuideSection
              id="related-reports"
              title="Related reports"
              countLabel={`${data.reports.length} ${data.reports.length === 1 ? "report" : "reports"}`}
            >
              {data.reports.length > 0 ? (
                <ul className="divide-y divide-border border-y border-border">
                  {data.reports.map((report) => (
                    <li key={report.id}>
                      <Link
                        href={report.reportPath}
                        className="group flex items-start justify-between gap-5 py-4 font-semibold leading-6 text-primary underline decoration-1 underline-offset-4 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span>{report.reportTitle}</span>
                        <ArrowRight
                          className="mt-1 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  No reports are currently assigned to this topic.
                </p>
              )}
            </GuideSection>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function GuideSection({
  id,
  title,
  countLabel,
  children,
}: {
  id: string;
  title: string;
  countLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-border pb-12 pt-2 first:pt-0 sm:pb-14 [&+section]:pt-12 sm:[&+section]:pt-14"
      aria-labelledby={`${id}-heading`}
    >
      <div className="mb-6 flex flex-col items-start gap-1 border-b border-border pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
        <h2
          id={`${id}-heading`}
          className="text-2xl font-bold tracking-[-0.015em] text-foreground"
        >
          {title}
        </h2>
        {countLabel && (
          <p className="shrink-0 font-mono text-xs text-muted-foreground">
            {countLabel}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function EvidenceSchedule({
  items,
  emptyText,
}: {
  items: GuideEvidenceItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ol className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li key={item.key} className="py-6">
          <blockquote className="border-l-4 border-primary pl-5 font-serif text-lg leading-8 text-foreground">
            {item.text}
          </blockquote>
          <p className="mt-4 pl-6 text-sm leading-6 text-muted-foreground">
            <Link
              href={item.report.reportPath}
              className="font-semibold text-primary underline decoration-1 underline-offset-4 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {item.report.reportTitle}
            </Link>
            <span aria-hidden="true"> · </span>
            {item.report.agency}
            <span aria-hidden="true"> · </span>
            {formatPublicationDate(item.report)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function EvidenceToggle({
  total,
  expanded,
  itemLabel,
  onClick,
}: {
  total: number;
  expanded: boolean;
  itemLabel: string;
  onClick: () => void;
}) {
  if (total <= INITIAL_EVIDENCE_COUNT) return null;

  const remaining = total - INITIAL_EVIDENCE_COUNT;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-1 underline-offset-4 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {expanded ? (
        <>
          Show fewer {itemLabel}
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </>
      ) : (
        <>
          Show {remaining} more {itemLabel}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

function GuideAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-primary underline decoration-1 underline-offset-4 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </a>
  );
}

function CoverageField({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function CoverageLedger({ data }: { data: TopicLandingPageData }) {
  return (
    <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4 lg:block lg:divide-y lg:divide-border">
      <CoverageField label="Reports" value={String(data.reportCount)} />
      <CoverageField
        label="States represented"
        value={formatStateCoverage(data.stateCount, data.hasFederalReports)}
      />
      <CoverageField label="Publishing agencies" value={String(data.agencyCount)} />
      <CoverageField
        label="Publication period"
        value={formatPublicationRange(
          data.publicationYearStart,
          data.publicationYearEnd,
        )}
      />
    </dl>
  );
}

function TopicGuideSkeleton() {
  return (
    <div className="mt-10 grid animate-pulse gap-12 motion-reduce:animate-none lg:grid-cols-[220px_minmax(0,760px)] lg:gap-16">
      <div className="h-72 bg-muted" />
      <div>
        <div className="h-8 w-40 bg-muted" />
        <div className="mt-7 h-32 bg-muted" />
        <div className="mt-14 h-8 w-52 bg-muted" />
        <div className="mt-7 h-40 bg-muted" />
      </div>
    </div>
  );
}

function buildGuideEvidence(
  data: TopicLandingPageData | undefined,
  sourceType: TopicEvidenceSourceType,
): GuideEvidenceItem[] {
  if (!data) return [];

  return data.reports
    .flatMap((report) =>
      report.evidence
        .filter((evidence) => evidence.sourceType === sourceType)
        .map((evidence, index) => ({
          key: `${report.id}-${sourceType}-${evidence.rank}-${index}`,
          text: evidence.text,
          rank: evidence.rank,
          report,
        })),
    )
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.report.publicationYear - a.report.publicationYear ||
        (b.report.publicationMonth || 0) - (a.report.publicationMonth || 0) ||
        (b.report.publicationDay || 0) - (a.report.publicationDay || 0) ||
        b.report.id - a.report.id,
    );
}

function formatStateCoverage(
  stateCount: number,
  hasFederalReports: boolean,
): string {
  if (stateCount === 0 && hasFederalReports) return "Federal only";
  if (hasFederalReports) return `${stateCount} + federal`;
  return String(stateCount);
}

function formatPublicationRange(
  startYear?: number,
  endYear?: number,
): string {
  if (!startYear || !endYear) return "No reports";
  return startYear === endYear ? String(startYear) : `${startYear}–${endYear}`;
}

function formatPublicationDate(report: TopicReport): string {
  if (!report.publicationMonth) return String(report.publicationYear);

  const date = new Date(
    report.publicationYear,
    report.publicationMonth - 1,
    report.publicationDay || 1,
  );
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: report.publicationDay ? "numeric" : undefined,
    year: "numeric",
  });
}
