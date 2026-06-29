import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { Link } from "wouter";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPublicationDate } from "@/components/reports/evidence-ledger";
import type { AgencySummary } from "@/lib/types";

export default function AgenciesIndex() {
  const [query, setQuery] = useState("");
  const {
    data: agencies = [],
    isLoading,
    error,
    refetch,
  } = useQuery<AgencySummary[]>({
    queryKey: ["/api/agencies"],
    queryFn: () => apiClient.getAgencies(),
  });

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleAgencies = useMemo(
    () =>
      [...agencies]
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter(
          (agency) =>
            !normalizedQuery ||
            agency.name.toLocaleLowerCase().includes(normalizedQuery),
        ),
    [agencies, normalizedQuery],
  );

  return (
    <>
      <PageMeta
        title="Medicaid Audit Agencies"
        description="Browse Medicaid audit reports by publishing oversight agency, auditor, inspector general, or legislative audit office."
        canonicalPath="/agencies"
        jsonLd={agencies.length ? buildItemList(agencies) : undefined}
      />

      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <header className="border-b-2 border-primary pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Publisher register
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
            Medicaid audit publishing agencies
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Find reports by the oversight body named in the source document.
          </p>

          <div className="mt-7 max-w-2xl">
            <label
              className="font-semibold text-foreground"
              htmlFor="agency-search"
            >
              Search publishing agencies
            </label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="agency-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by agency or oversight office"
                className="h-12 rounded-sm border-foreground pl-12 text-base"
              />
            </div>
          </div>
        </header>

        <aside className="mt-6 border-l-4 border-primary bg-secondary px-5 py-4 text-sm leading-6 text-foreground">
          Agency names follow indexed source metadata. Similarly named offices may
          appear as separate publisher records.
        </aside>

        <section className="pt-8" aria-labelledby="agency-register-heading">
          <div className="border-b border-border pb-4">
            <h2
              id="agency-register-heading"
              className="font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground"
            >
              Agency register
            </h2>
            <p className="mt-1 text-lg font-semibold text-foreground" role="status">
              {isLoading
                ? "Loading agencies…"
                : `${visibleAgencies.length} ${
                    visibleAgencies.length === 1 ? "agency" : "agencies"
                  }`}
            </p>
          </div>

          <div className="hidden grid-cols-[minmax(280px,1.2fr)_100px_minmax(260px,1fr)] gap-5 border-b border-border bg-muted px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:grid">
            <span>Publishing agency</span>
            <span>Reports</span>
            <span>Latest publication</span>
          </div>

          {error ? (
            <LoadError
              onRetry={() => {
                void refetch();
              }}
            />
          ) : isLoading ? (
            <AgencyDirectorySkeleton />
          ) : visibleAgencies.length ? (
            <div className="border-b border-border">
              {visibleAgencies.map((agency) => (
                <AgencyRegisterRow
                  key={`${agency.slug}-${agency.name}`}
                  agency={agency}
                />
              ))}
            </div>
          ) : (
            <div className="border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">
                No agencies match “{query.trim()}”
              </h2>
              <p className="mt-2 text-muted-foreground">
                Check the spelling or clear the search to view the full register.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 rounded-sm"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function AgencyRegisterRow({ agency }: { agency: AgencySummary }) {
  return (
    <Link
      href={`/agencies/${agency.slug}`}
      className="group grid min-h-11 border-t border-border px-1 py-5 first:border-t-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:grid-cols-[minmax(280px,1.2fr)_100px_minmax(260px,1fr)] md:gap-5 md:px-4"
    >
      <span className="text-lg font-semibold leading-7 text-foreground underline decoration-primary/35 underline-offset-4 group-hover:decoration-primary md:text-base md:leading-6">
        {agency.name}
      </span>
      <span className="mt-2 font-mono text-sm text-foreground md:mt-0">
        {agency.reportCount} {agency.reportCount === 1 ? "report" : "reports"}
      </span>
      <span className="mt-4 border-t border-border pt-4 md:mt-0 md:border-t-0 md:pt-0">
        <span className="block font-mono text-xs text-muted-foreground">
          {formatPublicationDate(agency.latestReport)}
        </span>
        {agency.latestReport && (
          <span className="mt-1.5 flex items-start justify-between gap-3 text-sm font-semibold leading-5 text-foreground">
            <span>{agency.latestReport.reportTitle}</span>
            <ArrowRight
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          </span>
        )}
      </span>
    </Link>
  );
}

function AgencyDirectorySkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 border-b border-border px-1 py-5 md:grid-cols-[minmax(280px,1.2fr)_100px_minmax(260px,1fr)] md:gap-5 md:px-4"
        >
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-16" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border-b border-border py-10">
      <h2 className="text-xl font-semibold text-foreground">
        Agencies could not be loaded
      </h2>
      <p className="mt-2 text-muted-foreground">
        Check the connection and try again.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5 rounded-sm"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}

function buildItemList(agencies: AgencySummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [...agencies]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((agency, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://www.medicaidintelligence.com/agencies/${agency.slug}`,
        name: agency.name,
      })),
  };
}
