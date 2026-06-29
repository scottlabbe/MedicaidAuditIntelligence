import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { getStateNameByCode } from "@shared/states";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import {
  EvidenceLedger,
  EvidenceLedgerSkeleton,
  formatPublicationDate,
} from "@/components/reports/evidence-ledger";
import type { AgencyLandingPageData } from "@/lib/types";

export default function AgencyDetail() {
  const [, params] = useRoute("/agencies/:slug");
  const slug = params?.slug || "";
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<AgencyLandingPageData>({
    queryKey: ["/api/agencies", slug],
    enabled: Boolean(slug),
    queryFn: () => apiClient.getAgencyBySlug(slug),
  });

  const jurisdictions = useMemo(() => {
    if (!data) return [];
    return Array.from(
      new Set(data.reports.map((report) => jurisdictionName(report.state))),
    ).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const coveragePeriod = useMemo(() => {
    if (!data?.reports.length) return undefined;
    const years = data.reports.map((report) => report.publicationYear);
    const oldest = Math.min(...years);
    const newest = Math.max(...years);
    return oldest === newest ? String(newest) : `${oldest}–${newest}`;
  }, [data]);

  const notFound = Boolean(error && error.message.includes("API Error 404"));

  if (notFound) {
    return <AgencyNotFound />;
  }

  const title = data?.name || "Medicaid audit publishing agency";
  const description = data
    ? `Browse ${data.reportCount} Medicaid audit reports published by ${data.name}, with findings, recommendations, and original public sources.`
    : "Browse Medicaid audit reports by publishing oversight agency.";

  return (
    <>
      <PageMeta
        title={data ? `${data.name} Medicaid Audit Reports` : title}
        description={description}
        canonicalPath={`/agencies/${slug}`}
      />

      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/agencies"
                className="underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Agencies
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="min-w-0 truncate" aria-current="page">
              {data?.name || "Publishing agency"}
            </li>
          </ol>
        </nav>

        <header className="mt-5 border-b-2 border-primary pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Publishing agency
          </p>
          <h1 className="mt-3 break-words text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Reports attributed to this exact publisher identity in the indexed
            source metadata.
          </p>
        </header>

        {error ? (
          <div className="border-b border-border py-10">
            <h2 className="text-xl font-semibold text-foreground">
              Agency reports could not be loaded
            </h2>
            <p className="mt-2 text-muted-foreground">
              Check the connection and try again.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-sm"
              onClick={() => {
                void refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
            <AgencyContext
              data={data}
              jurisdictions={jurisdictions}
              coveragePeriod={coveragePeriod}
              loading={isLoading}
            />

            <section
              className="mt-8 min-w-0 lg:col-start-1 lg:row-start-1 lg:mt-0"
              aria-labelledby="agency-evidence-heading"
            >
              <div className="border-b border-border pb-4">
                <h2
                  id="agency-evidence-heading"
                  className="font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Evidence register
                </h2>
                <p className="mt-1 text-lg font-semibold text-foreground" role="status">
                  {isLoading
                    ? "Loading reports…"
                    : `${data?.reportCount || 0} ${
                        data?.reportCount === 1 ? "report" : "reports"
                      }`}
                </p>
              </div>

              {isLoading ? (
                <EvidenceLedgerSkeleton />
              ) : data?.reports.length ? (
                <EvidenceLedger reports={data.reports} />
              ) : (
                <div className="border-b border-border py-10">
                  <h2 className="text-xl font-semibold text-foreground">
                    No reports are indexed for this publisher
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Return to the agency register to choose another publisher.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

function AgencyContext({
  data,
  jurisdictions,
  coveragePeriod,
  loading,
}: {
  data?: AgencyLandingPageData;
  jurisdictions: string[];
  coveragePeriod?: string;
  loading: boolean;
}) {
  return (
    <aside
      className="border-t-2 border-primary bg-muted px-5 py-5 lg:col-start-2 lg:row-start-1"
      aria-labelledby="agency-context-heading"
    >
      <h2
        id="agency-context-heading"
        className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary"
      >
        Indexed coverage
      </h2>
      <dl className="mt-5 space-y-5">
        <ContextField
          label="Indexed reports"
          value={loading ? "Loading…" : String(data?.reportCount || 0)}
          mono
        />
        <ContextField
          label="Publication period"
          value={loading ? "Loading…" : coveragePeriod || "Not available"}
          mono
        />
        <ContextField
          label="Jurisdictions in these reports"
          value={
            loading
              ? "Loading…"
              : jurisdictions.length
                ? jurisdictions.join(", ")
                : "Not available"
          }
        />
        <ContextField
          label="Latest publication"
          value={
            loading
              ? "Loading…"
              : data?.latestReport
                ? formatPublicationDate(data.latestReport)
                : "Not available"
          }
          mono
        />
      </dl>
      {data && (
        <div className="mt-6 border-t border-border pt-5">
          <Link
            href={`/reports?agency=${encodeURIComponent(data.name)}`}
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Search this publisher
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </aside>
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
      <dd
        className={`mt-1.5 break-words text-sm font-semibold leading-5 text-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function AgencyNotFound() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8">
      <PageMeta
        title="Agency not found"
        description="The requested audit agency page could not be found."
        robots="noindex, follow"
      />
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Publisher register
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground">
        Agency not found
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The requested publisher identity is not part of the agency register.
      </p>
      <Link
        href="/agencies"
        className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        View all agencies
      </Link>
    </div>
  );
}

function jurisdictionName(code: string) {
  if (code === "US") return "Federal";
  return getStateNameByCode(code) || code;
}
