import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { getStateNameByCode } from "@shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportListItem } from "@/lib/types";

export function EvidenceLedger({ reports }: { reports: ReportListItem[] }) {
  return (
    <div className="border-b border-border">
      {reports.map((report) => (
        <EvidenceDocket key={report.id} report={report} />
      ))}
    </div>
  );
}

export function EvidenceDocket({ report }: { report: ReportListItem }) {
  const reportHref = `/reports/${report.id}`;
  const summary = getReportSummary(report);

  return (
    <article className="grid border-t border-border py-6 first:border-t-0 lg:grid-cols-[118px_150px_minmax(0,1fr)_128px] lg:gap-5 lg:py-7">
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-border pb-4 lg:block lg:border-b-0 lg:pb-0">
        <LedgerField
          label="Published"
          value={formatPublicationDate(report)}
          mono
        />
        <LedgerField
          label="Jurisdiction"
          value={getJurisdictionLabel(report.state)}
        />
      </dl>

      <dl className="border-b border-border py-4 lg:border-b-0 lg:py-0">
        <LedgerField label="Publishing agency" value={report.auditOrganization} />
        <LedgerField label="Report ID" value={`REPORT ${report.id}`} mono />
      </dl>

      <div className="py-5 lg:py-0">
        <h3 className="text-xl font-semibold leading-7 tracking-[-0.01em] text-foreground">
          <Link
            href={reportHref}
            className="decoration-primary/50 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {report.reportTitle}
          </Link>
        </h3>
        {summary && (
          <p className="mt-3 font-serif text-base leading-7 text-muted-foreground">
            {summary}
          </p>
        )}
        {(typeof report.findingCount === "number" ||
          typeof report.recommendationCount === "number") && (
          <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3">
            {typeof report.findingCount === "number" && (
              <InlineMetric label="Findings" value={report.findingCount} />
            )}
            {typeof report.recommendationCount === "number" && (
              <InlineMetric
                label="Recommendations"
                value={report.recommendationCount}
              />
            )}
          </dl>
        )}
        <Link
          href={reportHref}
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Open evidence record
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <dl className="border-t border-border pt-4 lg:border-t-0 lg:pt-0">
        {typeof report.totalFinancialImpact === "number" &&
          report.totalFinancialImpact > 0 && (
            <LedgerField
              label="Financial impact"
              value={formatCurrency(report.totalFinancialImpact)}
              mono
              emphasis
            />
          )}
        <div className="mt-4 border-t border-border pt-4 first:mt-0 first:border-t-0 first:pt-0">
          <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Source status
          </dt>
          <dd className="mt-2">
            {report.originalReportSourceUrl ? (
              <a
                href={report.originalReportSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-start gap-1.5 text-sm font-semibold leading-5 text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                Original source
                <ExternalLink
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">
                Library record
              </span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function LedgerField({
  label,
  value,
  mono = false,
  emphasis = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1.5 break-words text-sm leading-5 ${
          mono ? "font-mono" : "font-semibold"
        } ${emphasis ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function EvidenceLedgerSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, item) => (
        <div
          key={item}
          className="grid gap-5 border-b border-border py-7 lg:grid-cols-[118px_150px_minmax(0,1fr)_128px]"
        >
          <div className="space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function formatPublicationDate(report?: ReportListItem) {
  if (!report) return "No publication indexed";
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

function getReportSummary(report: ReportListItem) {
  const summary = [
    report.overallConclusion,
    report.llmInsight,
    report.potentialObjectiveSummary,
    report.auditScope,
  ].find(hasEvidenceText);
  if (!summary) return undefined;
  return summary.length > 280 ? `${summary.slice(0, 277).trim()}…` : summary;
}

function hasEvidenceText(value?: string): value is string {
  if (!value?.trim()) return false;
  return !["none", "null", "n/a", "not available"].includes(
    value.trim().toLocaleLowerCase(),
  );
}
