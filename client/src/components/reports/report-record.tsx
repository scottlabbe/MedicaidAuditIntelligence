import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { ReportWithDetails } from "@/lib/types";
import { jurisdictionHref } from "@/lib/jurisdictions";
import {
  getPublisherHref,
  getPublisherName,
  hasDistinctAuditOrganization,
} from "@/lib/publishers";
import { cn } from "@/lib/utils";
import { reportPath } from "@shared/reportSlugs";
import { normalizePublicSourceUrl } from "@shared/sourceUrls";

const SITE_URL = "https://www.medicaidintelligence.com";

type CopyState = "idle" | "copied" | "failed";

export function ReportRecord({ report }: { report: ReportWithDetails }) {
  const citation = createCitation(report);
  const permalink = `${SITE_URL}${reportPath(report)}`;
  const topics = Array.from(
    new Set([...report.keywords, ...report.programs].filter(hasText)),
  );
  const largestFindingAmount = report.findings.reduce<number | undefined>(
    (largest, finding) => {
      if (typeof finding.financialImpact !== "number") return largest;
      return largest === undefined
        ? finding.financialImpact
        : Math.max(largest, finding.financialImpact);
    },
    undefined,
  );
  const hasLargestFindingAmount =
    largestFindingAmount !== undefined && largestFindingAmount > 0;

  const sections = [
    report.overallConclusion && { id: "conclusion", label: "Conclusion" },
    report.auditScope && { id: "scope", label: "Scope" },
    report.findings.length > 0 && {
      id: "findings",
      label: `Findings (${report.findings.length})`,
    },
    {
      id: "recommendations",
      label: `Recommendations (${report.recommendations.length})`,
    },
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  return (
    <article className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8 sm:py-12">
      <ReportBreadcrumb report={report} />
      <RecordHeader report={report} citation={citation} permalink={permalink} />

      <section
        aria-label="At a glance"
        className={cn(
          "mt-8 grid border border-border bg-muted sm:grid-cols-2",
          hasLargestFindingAmount && "lg:grid-cols-3",
        )}
      >
        <GlanceTile label="Findings" value={String(report.findings.length)} />
        <GlanceTile
          label="Recommendations"
          value={String(report.recommendations.length)}
          note={
            report.recommendations.length === 0
              ? "No formal recommendations were issued in this record."
              : undefined
          }
        />
        {hasLargestFindingAmount && (
          <GlanceTile
            label="Largest finding amount"
            value={formatCurrency(largestFindingAmount)}
            note="Highest amount tied to one indexed finding."
          />
        )}
      </section>

      <div className="mt-12 grid items-start gap-14 lg:grid-cols-[minmax(0,760px)_minmax(220px,1fr)] lg:gap-12">
        <div className="min-w-0">
          {report.overallConclusion && (
            <ProseSection id="conclusion" title="Overall conclusion">
              {report.overallConclusion}
            </ProseSection>
          )}

          {report.auditScope && (
            <ProseSection id="scope" title="Scope">
              {report.auditScope}
            </ProseSection>
          )}

          {report.findings.length > 0 && (
            <section id="findings" className="scroll-mt-24 pt-2">
              <SectionHeading
                title="Findings"
                count={report.findings.length}
                helper="Each finding has a stable link."
              />
              <ol className="m-0 list-none p-0">
                {report.findings.map((finding) => (
                  <EvidenceRow
                    key={finding.id}
                    id={`finding-${finding.id}`}
                    identifier={`F-${String(finding.id).padStart(3, "0")}`}
                    text={finding.findingText}
                    amount={finding.financialImpact}
                    permalink={`${permalink}#finding-${finding.id}`}
                    copyLabel="Copy finding link"
                  />
                ))}
              </ol>
            </section>
          )}

          <section id="recommendations" className="scroll-mt-24 pt-12">
            <SectionHeading
              title="Recommendations"
              count={report.recommendations.length}
            />
            {report.recommendations.length > 0 ? (
              <ol className="m-0 list-none p-0">
                {report.recommendations.map((recommendation) => (
                  <EvidenceRow
                    key={recommendation.id}
                    id={`recommendation-${recommendation.id}`}
                    identifier={`R-${String(recommendation.id).padStart(3, "0")}`}
                    text={recommendation.recommendationText}
                    permalink={`${permalink}#recommendation-${recommendation.id}`}
                    copyLabel="Copy recommendation link"
                    context={
                      recommendation.relatedFindingId
                        ? `Related finding F-${String(
                            recommendation.relatedFindingId,
                          ).padStart(3, "0")}`
                        : undefined
                    }
                  />
                ))}
              </ol>
            ) : (
              <p className="bg-muted px-5 py-4 text-sm leading-6 text-foreground">
                This record contains no formal recommendations.
              </p>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-8" aria-label="Report reference">
          <RailBlock title="On this page">
            <nav aria-label="Report sections">
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </RailBlock>

          {topics.length > 0 && (
            <RailBlock title="Topics">
              <ul className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <li key={topic}>
                    <Link
                      href={`/reports?query=${encodeURIComponent(topic)}`}
                      className="inline-flex min-h-11 items-center rounded-sm border border-border bg-muted px-3 py-2 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {topic}
                    </Link>
                  </li>
                ))}
              </ul>
            </RailBlock>
          )}

          <RailBlock title="Cite this record">
            <p className="break-words bg-muted px-4 py-4 font-mono text-xs leading-6 text-foreground">
              {citation}
            </p>
            <CopyButton
              value={citation}
              idleLabel="Copy citation"
              className="mt-3 print:hidden"
            />
          </RailBlock>

          <RailBlock title="Provenance">
            <p className="text-sm leading-6 text-muted-foreground">
              Record fields were extracted from the source document with AI
              assistance. Check consequential details against the original.
            </p>
            <Link
              href="/about#method"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Read the methodology
            </Link>
          </RailBlock>
        </aside>
      </div>
    </article>
  );
}

export function RecordHeader({
  report,
  citation,
  permalink,
}: {
  report: ReportWithDetails;
  citation: string;
  permalink: string;
}) {
  const sourceUrl = normalizePublicSourceUrl(report.originalReportSourceUrl);
  const fields = [
    report.subjectJurisdictions.length > 0 && {
      label: "Jurisdiction",
      content: (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {report.subjectJurisdictions.map((jurisdiction) => (
            <Link
              key={jurisdiction.code}
              href={jurisdictionHref(jurisdiction)}
              className="text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {jurisdiction.name}
            </Link>
          ))}
        </span>
      ),
    },
    {
      label: "Publishing agency",
      content: getPublisherHref(report) ? (
        <Link
          href={getPublisherHref(report)!}
          className="text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {getPublisherName(report)}
        </Link>
      ) : getPublisherName(report),
    },
    hasDistinctAuditOrganization(report) && {
      label: "Audit organization",
      content: report.auditOrganization,
    },
    {
      label: "Publication date",
      content: formatPublicationDate(report),
      mono: true,
    },
    {
      label: "Source record",
      content: sourceUrl
        ? "Original document linked"
        : "Metadata record",
    },
  ].filter(Boolean) as Array<{
    label: string;
    content: React.ReactNode;
    mono?: boolean;
  }>;

  return (
    <header className="mt-6 border-t-4 border-primary pt-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Evidence record
      </p>
      <h1 className="mt-3 max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-4xl lg:text-5xl">
        {report.reportTitle}
      </h1>

      <dl className="mt-8 grid border-y border-border sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field, index) => (
          <div
            key={field.label}
            className={cn(
              "border-b border-border px-4 py-5 sm:px-5 lg:border-b-0",
              index % 2 === 0 ? "sm:border-r" : "sm:border-r-0",
              index < fields.length - 1 && "lg:border-r",
            )}
          >
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {field.label}
            </dt>
            <dd
              className={cn(
                "mt-2 break-words text-sm font-semibold leading-5 text-foreground",
                field.mono && "font-mono",
              )}
            >
              {field.content}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {sourceUrl && (
          <Button asChild className="min-h-11 rounded-sm px-5">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open original report
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        )}
        <CopyButton value={citation} idleLabel="Copy citation" />
        <CopyButton value={permalink} idleLabel="Copy permalink" linkIcon />
        {sourceUrl && (
          <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Original source available
          </span>
        )}
      </div>

      {sourceUrl && (
        <p className="mt-4 hidden break-all font-mono text-xs leading-5 print:block">
          Original source: {sourceUrl}
        </p>
      )}
    </header>
  );
}

function ReportBreadcrumb({ report }: { report: ReportWithDetails }) {
  const jurisdiction = report.subjectJurisdictions[0] || report.sourceJurisdiction;
  const jurisdictionLabel =
    report.jurisdictionScopeType === "national"
      ? "Federal"
      : jurisdiction?.name || "Jurisdiction";
  const jurisdictionPath =
    report.jurisdictionScopeType === "national"
      ? "/federal"
      : jurisdiction
        ? jurisdictionHref(jurisdiction)
        : "/states";

  return (
    <nav aria-label="Breadcrumb" className="print:hidden">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link
            href="/reports"
            className="underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Reports
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            href={jurisdictionPath}
            className="underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {jurisdictionLabel}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="max-w-[28rem] truncate" aria-current="page">
          {report.reportTitle}
        </li>
      </ol>
    </nav>
  );
}

function GlanceTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-b border-border px-5 py-5 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.03em] text-primary">
        {value}
      </p>
      {note && (
        <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}

function ProseSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 pb-12">
      <h2 className="border-b border-border pb-3 text-2xl font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <p className="mt-5 font-serif text-lg leading-8 text-foreground">
        {children}
      </p>
    </section>
  );
}

function SectionHeading({
  title,
  count,
  helper,
}: {
  title: string;
  count: number;
  helper?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b-2 border-primary pb-3 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
        {title} <span className="font-mono text-lg text-muted-foreground">({count})</span>
      </h2>
      {helper && (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  );
}

function EvidenceRow({
  id,
  identifier,
  text,
  amount,
  permalink,
  copyLabel,
  context,
}: {
  id: string;
  identifier: string;
  text: string;
  amount?: number;
  permalink: string;
  copyLabel: string;
  context?: string;
}) {
  return (
    <li
      id={id}
      className="report-evidence-anchor scroll-mt-24 border-b border-border py-6 sm:grid sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-5"
    >
      <a
        href={`#${id}`}
        aria-label={`Link to ${identifier}`}
        className="inline-flex min-h-11 items-center self-start font-mono text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {identifier}
      </a>
      <div className="min-w-0">
        <p className="font-serif text-[17px] leading-8 text-foreground">{text}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {typeof amount === "number" && amount > 0 && (
            <span className="inline-flex min-h-9 items-center rounded-sm bg-secondary px-3 font-mono text-xs font-semibold text-primary">
              {formatCurrency(amount)}
            </span>
          )}
          {context && (
            <span className="font-mono text-xs text-muted-foreground">{context}</span>
          )}
          <CopyButton
            value={permalink}
            idleLabel={copyLabel}
            compact
            linkIcon
          />
        </div>
      </div>
    </li>
  );
}

function RailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t-2 border-primary pt-4">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CopyButton({
  value,
  idleLabel,
  compact = false,
  linkIcon = false,
  className,
}: {
  value: string;
  idleLabel: string;
  compact?: boolean;
  linkIcon?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("failed");
      window.setTimeout(() => setState("idle"), 2400);
    }
  };

  const label =
    state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : idleLabel;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "rounded-sm",
        compact
          ? "min-h-11 border-0 px-0 text-xs text-primary underline decoration-primary/30 underline-offset-4 hover:bg-transparent"
          : "min-h-11",
        className,
      )}
      onClick={() => void handleCopy()}
      aria-live="polite"
    >
      {state === "copied" ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : linkIcon ? (
        <LinkIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

function createCitation(report: ReportWithDetails) {
  return `${getPublisherName(report)}. (${report.publicationYear}). ${report.reportTitle}. ${SITE_URL}${reportPath(report)}`;
}

function formatPublicationDate(report: ReportWithDetails) {
  if (report.publicationMonth) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
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
  return String(report.publicationYear);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function hasText(value?: string): value is string {
  if (!value?.trim()) return false;
  return !["none", "null", "n/a", "not available"].includes(
    value.trim().toLocaleLowerCase(),
  );
}
