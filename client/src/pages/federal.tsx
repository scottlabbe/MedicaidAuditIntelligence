import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import {
  EvidenceLedger,
  EvidenceLedgerSkeleton,
  formatPublicationDate,
} from "@/components/reports/evidence-ledger";
import type { FederalLandingPageData } from "@/lib/types";

export default function Federal() {
  const { data, isLoading, error, refetch } = useQuery<FederalLandingPageData>({
    queryKey: ["/api/federal"],
    queryFn: () => apiClient.getFederal(),
  });

  const description = data?.latestReport
    ? `Browse ${data.reportCount} Medicaid audit reports published or commissioned by federal authorities, with evidence through ${formatPublicationDate(data.latestReport)}.`
    : "Browse Medicaid audit reports published or commissioned by federal authorities.";

  return (
    <>
      <PageMeta
        title="Federal Medicaid Audit Reports"
        description={description}
        canonicalPath="/federal"
      />

      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/states"
                className="underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Jurisdictions
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Federal</li>
          </ol>
        </nav>

        <header className="mt-5 border-b-2 border-primary pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            US · Publishing authority
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
            Federal Medicaid audit evidence
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Reports published or commissioned by federal oversight authorities.
            A report may examine one jurisdiction, several jurisdictions, or a
            nationwide program.
          </p>
        </header>

        {error ? (
          <div className="border-b border-border py-10">
            <h2 className="text-xl font-semibold text-foreground">
              Federal reports could not be loaded
            </h2>
            <p className="mt-2 text-muted-foreground">
              Check the connection and try again.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-sm"
              onClick={() => void refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
            <aside className="border-t-2 border-primary bg-muted px-5 py-5 lg:col-start-2 lg:row-start-1">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Federal register
              </h2>
              <dl className="mt-5 space-y-5">
                <ContextField label="Source authority" value="Federal (US)" />
                <ContextField
                  label="Indexed reports"
                  value={isLoading ? "Loading…" : String(data?.reportCount || 0)}
                  mono
                />
                <ContextField
                  label="Latest publication"
                  value={
                    isLoading
                      ? "Loading…"
                      : data?.latestReport
                        ? formatPublicationDate(data.latestReport)
                        : "Not available"
                  }
                  mono
                />
              </dl>
              <div className="mt-6 border-t border-border pt-5">
                <Link
                  href="/reports?sourceJurisdiction=US"
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Search Federal reports
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </aside>

            <section
              className="mt-8 min-w-0 lg:col-start-1 lg:row-start-1 lg:mt-0"
              aria-labelledby="federal-evidence-heading"
            >
              <div className="border-b border-border pb-4">
                <h2
                  id="federal-evidence-heading"
                  className="font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Evidence register
                </h2>
                <p className="mt-1 text-lg font-semibold text-foreground" role="status">
                  {isLoading
                    ? "Loading reports…"
                    : `${data?.reportCount || 0} ${data?.reportCount === 1 ? "report" : "reports"}`}
                </p>
              </div>
              {isLoading ? (
                <EvidenceLedgerSkeleton />
              ) : data?.reports.length ? (
                <EvidenceLedger reports={data.reports} />
              ) : (
                <p className="border-b border-border py-10 text-muted-foreground">
                  No Federal-source reports are currently indexed.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

function ContextField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1.5 text-sm font-semibold leading-5 text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
