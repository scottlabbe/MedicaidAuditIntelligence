import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { getStateEntryBySlug } from "@shared/states";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import {
  EvidenceLedger,
  EvidenceLedgerSkeleton,
  formatPublicationDate,
} from "@/components/reports/evidence-ledger";
import type { SearchResponse } from "@/lib/types";

export default function StateDetail() {
  const [, params] = useRoute("/states/:slug");
  const slug = params?.slug;
  const stateEntry = useMemo(() => getStateEntryBySlug(slug), [slug]);
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<SearchResponse>({
    queryKey: ["/api/reports", "state-page", stateEntry?.code],
    enabled: Boolean(stateEntry?.code),
    queryFn: () =>
      apiClient.getReports(
        { state: stateEntry!.code, sortBy: "date_desc" },
        { page: 1, pageSize: 24 },
      ) as Promise<SearchResponse>,
  });

  if (!stateEntry) {
    return <StateNotFound />;
  }

  const latestReport = data?.items[0];
  const description = latestReport
    ? `Browse ${data?.total || 0} Medicaid audit reports for ${
        stateEntry.name
      }. Review findings, recommendations, and oversight activity published through ${formatPublicationDate(
        latestReport,
      )}.`
    : `Browse Medicaid audit reports for ${stateEntry.name} with findings, recommendations, and original public sources.`;

  return (
    <>
      <PageMeta
        title={`Medicaid Audit Reports in ${stateEntry.name}`}
        description={description}
        canonicalPath={`/states/${stateEntry.slug}`}
        robots={!isLoading && data?.total === 0 ? "noindex, follow" : undefined}
        jsonLd={buildStateJsonLd(stateEntry.name, stateEntry.slug, description)}
      />

      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/states"
                className="underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                States
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{stateEntry.name}</li>
          </ol>
        </nav>

        <header className="mt-5 border-b-2 border-primary pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {stateEntry.code} · Medicaid jurisdiction
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
            {stateEntry.name} Medicaid audit evidence
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Review reports connected to {stateEntry.name} Medicaid oversight,
            ordered by publication date.
          </p>
        </header>

        {error ? (
          <div className="border-b border-border py-10">
            <h2 className="text-xl font-semibold text-foreground">
              {stateEntry.name} reports could not be loaded
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
        ) : !isLoading && data?.total === 0 ? (
          <EmptyState name={stateEntry.name} />
        ) : (
          <div className="py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
            <StateContext
              name={stateEntry.name}
              code={stateEntry.code}
              total={data?.total}
              latestDate={
                latestReport ? formatPublicationDate(latestReport) : undefined
              }
              loading={isLoading}
            />

            <section
              className="mt-8 min-w-0 lg:col-start-1 lg:row-start-1 lg:mt-0"
              aria-labelledby="state-evidence-heading"
            >
              <div className="border-b border-border pb-4">
                <h2
                  id="state-evidence-heading"
                  className="font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Evidence register
                </h2>
                <p className="mt-1 text-lg font-semibold text-foreground" role="status">
                  {isLoading
                    ? "Loading reports…"
                    : `${data?.total || 0} ${
                        data?.total === 1 ? "report" : "reports"
                      }`}
                </p>
              </div>

              {isLoading ? (
                <EvidenceLedgerSkeleton />
              ) : data?.items.length ? (
                <EvidenceLedger reports={data.items} />
              ) : null}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

function StateContext({
  name,
  code,
  total,
  latestDate,
  loading,
}: {
  name: string;
  code: string;
  total?: number;
  latestDate?: string;
  loading: boolean;
}) {
  return (
    <aside
      className="border-t-2 border-primary bg-muted px-5 py-5 lg:col-start-2 lg:row-start-1"
      aria-labelledby="state-context-heading"
    >
      <h2
        id="state-context-heading"
        className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary"
      >
        Coverage
      </h2>
      <dl className="mt-5 space-y-5">
        <ContextField label="Jurisdiction" value={`${name} (${code})`} />
        <ContextField
          label="Indexed reports"
          value={loading ? "Loading…" : String(total || 0)}
          mono
        />
        <ContextField
          label="Latest publication"
          value={loading ? "Loading…" : latestDate || "Not available"}
          mono
        />
      </dl>
      <div className="mt-6 border-t border-border pt-5">
        <Link
          href={`/reports?state=${code}`}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Search {name} reports
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
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
        className={`mt-1.5 text-sm font-semibold leading-5 text-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ name }: { name: string }) {
  return (
    <div className="border-b border-border py-10">
      <h2 className="text-xl font-semibold text-foreground">
        No indexed reports are available for {name}
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        The public library does not currently contain a report assigned to this
        jurisdiction.
      </p>
      <Link
        href="/reports"
        className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        View all reports
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function StateNotFound() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8">
      <PageMeta
        title="State not found"
        description="The requested state audit page does not exist."
        robots="noindex, follow"
      />
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        State register
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground">
        State not found
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The requested jurisdiction is not part of the state register.
      </p>
      <Link
        href="/states"
        className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        View all states
      </Link>
    </div>
  );
}

function buildStateJsonLd(name: string, slug: string, description: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${name} Medicaid audit evidence`,
      url: `https://www.medicaidintelligence.com/states/${slug}`,
      description,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.medicaidintelligence.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "States",
          item: "https://www.medicaidintelligence.com/states",
        },
        {
          "@type": "ListItem",
          position: 3,
          name,
          item: `https://www.medicaidintelligence.com/states/${slug}`,
        },
      ],
    },
  ];
}
