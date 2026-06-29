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
import type { IndexableStateSummary } from "@/lib/types";

export default function StatesIndex() {
  const [query, setQuery] = useState("");
  const {
    data: states = [],
    isLoading,
    error,
    refetch,
  } = useQuery<IndexableStateSummary[]>({
    queryKey: ["/api/states"],
    queryFn: () => apiClient.getStates(),
  });

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleStates = useMemo(
    () =>
      [...states]
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter(
          (state) =>
            !normalizedQuery ||
            state.name.toLocaleLowerCase().includes(normalizedQuery) ||
            state.code.toLocaleLowerCase().includes(normalizedQuery),
        ),
    [normalizedQuery, states],
  );

  return (
    <>
      <PageMeta
        title="State Medicaid Audit Report Pages"
        description="Browse Medicaid audit report coverage by state, including state-level findings, recommendations, and original source documents."
        canonicalPath="/states"
        jsonLd={states.length ? buildItemList(states) : undefined}
      />

      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <header className="border-b-2 border-primary pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Jurisdiction register
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
            Medicaid audit evidence by state
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Find reports associated with a Medicaid jurisdiction. Only states
            with indexed evidence are listed.
          </p>

          <div className="mt-7 max-w-2xl">
            <label className="font-semibold text-foreground" htmlFor="state-search">
              Search states
            </label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="state-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by state name or code"
                className="h-12 rounded-sm border-foreground pl-12 text-base"
              />
            </div>
          </div>
        </header>

        <section className="pt-8" aria-labelledby="state-register-heading">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2
                id="state-register-heading"
                className="font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground"
              >
                State coverage register
              </h2>
              <p className="mt-1 text-lg font-semibold text-foreground" role="status">
                {isLoading
                  ? "Loading states…"
                  : `${visibleStates.length} ${
                      visibleStates.length === 1 ? "state" : "states"
                    }`}
              </p>
            </div>
          </div>

          <div className="hidden grid-cols-[80px_minmax(180px,0.8fr)_100px_minmax(260px,1.4fr)] gap-5 border-b border-border bg-muted px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:grid">
            <span>Code</span>
            <span>State</span>
            <span>Reports</span>
            <span>Latest publication</span>
          </div>

          {error ? (
            <LoadError
              subject="States"
              onRetry={() => {
                void refetch();
              }}
            />
          ) : isLoading ? (
            <DirectorySkeleton />
          ) : visibleStates.length ? (
            <div className="border-b border-border">
              {visibleStates.map((state) => (
                <StateRegisterRow key={state.code} state={state} />
              ))}
            </div>
          ) : (
            <EmptySearch subject="states" query={query} onClear={() => setQuery("")} />
          )}
        </section>
      </div>
    </>
  );
}

function StateRegisterRow({ state }: { state: IndexableStateSummary }) {
  return (
    <Link
      href={`/states/${state.slug}`}
      className="group grid min-h-11 border-t border-border px-1 py-5 first:border-t-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:grid-cols-[80px_minmax(180px,0.8fr)_100px_minmax(260px,1.4fr)] md:gap-5 md:px-4"
    >
      <span className="font-mono text-sm font-semibold text-primary">
        {state.code}
      </span>
      <span className="mt-1 text-lg font-semibold text-foreground underline decoration-primary/35 underline-offset-4 group-hover:decoration-primary md:mt-0 md:text-base">
        {state.name}
      </span>
      <span className="mt-2 font-mono text-sm text-foreground md:mt-0">
        {state.reportCount} {state.reportCount === 1 ? "report" : "reports"}
      </span>
      <span className="mt-4 border-t border-border pt-4 md:mt-0 md:border-t-0 md:pt-0">
        <span className="block font-mono text-xs text-muted-foreground">
          {formatPublicationDate(state.latestReport)}
        </span>
        {state.latestReport && (
          <span className="mt-1.5 flex items-start justify-between gap-3 text-sm font-semibold leading-5 text-foreground">
            <span>{state.latestReport.reportTitle}</span>
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

function DirectorySkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 border-b border-border px-1 py-5 md:grid-cols-[80px_minmax(180px,0.8fr)_100px_minmax(260px,1.4fr)] md:gap-5 md:px-4"
        >
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-5 w-36" />
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

function LoadError({
  subject,
  onRetry,
}: {
  subject: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-b border-border py-10">
      <h2 className="text-xl font-semibold text-foreground">
        {subject} could not be loaded
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

function EmptySearch({
  subject,
  query,
  onClear,
}: {
  subject: string;
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="border-b border-border py-10">
      <h2 className="text-xl font-semibold text-foreground">
        No {subject} match “{query.trim()}”
      </h2>
      <p className="mt-2 text-muted-foreground">
        Check the spelling or clear the search to view the full register.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5 rounded-sm"
        onClick={onClear}
      >
        Clear search
      </Button>
    </div>
  );
}

function buildItemList(states: IndexableStateSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [...states]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((state, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://www.medicaidintelligence.com/states/${state.slug}`,
        name: `${state.name} Medicaid audit reports`,
      })),
  };
}
