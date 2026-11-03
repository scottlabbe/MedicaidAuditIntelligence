import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Search,
} from "lucide-react";
import { STATE_ENTRIES } from "@shared/states";
import { reportPath } from "@shared/reportSlugs";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidenceLedger } from "@/components/reports/evidence-ledger";
import { useSsrData } from "@/lib/ssrData";
import type {
  AgencySummary,
  ReportListItem,
  SearchFilters,
  SearchResponse,
  TopicSummary,
} from "@/lib/types";

const PAGE_SIZE = 24;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1999 }, (_, index) => CURRENT_YEAR - index);

export default function ReportsIndex() {
  const [location, setLocation] = useLocation();
  const ssrData = useSsrData();
  const initialFilters =
    ssrData?.routeType === "reports_index"
      ? ssrData.reportsIndex?.filters
      : undefined;
  const [search, setSearch] = useState(() =>
    typeof window !== "undefined"
      ? window.location.search
      : initialFilters
        ? buildReportsSearch(initialFilters)
        : "",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const parsed = useMemo(
    () => parseReportsLocation(`${location}${search}`),
    [location, search],
  );
  const [queryDraft, setQueryDraft] = useState(parsed.filters.query || "");

  useEffect(() => {
    const syncSearchFromUrl = () => setSearch(window.location.search);
    window.addEventListener("popstate", syncSearchFromUrl);
    return () => window.removeEventListener("popstate", syncSearchFromUrl);
  }, []);

  useEffect(() => {
    setQueryDraft(parsed.filters.query || "");
  }, [parsed.filters.query]);

  const { data: agencies = [] } = useQuery<AgencySummary[]>({
    queryKey: ["/api/agencies"],
    queryFn: () => apiClient.getAgencies(),
  });

  const { data: topics = [] } = useQuery<TopicSummary[]>({
    queryKey: ["/api/topics"],
    queryFn: () => apiClient.getTopics(),
  });

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/reports", parsed.filters, parsed.page],
    queryFn: () =>
      apiClient.getReports(parsed.filters, {
        page: parsed.page,
        pageSize: PAGE_SIZE,
      }) as Promise<SearchResponse>,
  });

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));
  const activeFilterCount = countActiveFilters(parsed.filters);
  const canonicalPath =
    parsed.page === 1 ? "/reports" : `/reports/page/${parsed.page}`;

  const navigateToReports = (href: string) => {
    setSearch(href.includes("?") ? href.slice(href.indexOf("?")) : "");
    setLocation(href);
  };

  const updateFilters = (changes: Partial<SearchFilters>) => {
    const next = { ...parsed.filters, ...changes };
    Object.keys(next).forEach((key) => {
      const typedKey = key as keyof SearchFilters;
      if (next[typedKey] === "" || next[typedKey] === undefined) {
        delete next[typedKey];
      }
    });
    navigateToReports(buildReportsHref(1, next));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters({ query: queryDraft.trim() || undefined });
  };

  const clearFilters = () => {
    const sortBy = parsed.filters.sortBy;
    setQueryDraft("");
    navigateToReports(buildReportsHref(1, sortBy ? { sortBy } : {}));
  };

  return (
    <>
      <PageMeta
        title={
          parsed.page === 1
            ? "Medicaid Audit Reports"
            : `Medicaid Audit Reports - Page ${parsed.page}`
        }
        description="Browse Medicaid audit reports with publishing agency, jurisdiction, financial impact, findings, recommendations, and original public sources."
        canonicalPath={canonicalPath}
        robots={activeFilterCount > 0 ? "noindex, follow" : "index, follow"}
        jsonLd={
          data
            ? [buildCollectionPage(canonicalPath), buildItemList(data, parsed.page)]
            : buildCollectionPage(canonicalPath)
        }
      />

      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
        <header className="border-b-2 border-primary pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Public audit ledger
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
            Medicaid audit reports
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Search the complete report library and verify each record against its
            publishing agency and original public source.
          </p>

          <form
            className="mt-7 flex max-w-4xl flex-col gap-2 sm:flex-row"
            role="search"
            onSubmit={submitSearch}
          >
            <label className="sr-only" htmlFor="report-search">
              Search reports, findings, agencies, or audit language
            </label>
            <Input
              id="report-search"
              type="search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Search reports, findings, agencies, or audit language"
              className="h-12 rounded-sm border-foreground px-4 text-base"
            />
            <Button type="submit" className="h-12 rounded-sm px-6">
              <Search aria-hidden="true" />
              Search reports
            </Button>
          </form>
        </header>

        <div className="py-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <aside aria-labelledby="filter-heading">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between border-y border-border py-3 text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
              aria-expanded={filtersOpen}
              aria-controls="report-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <span>
                Filter reports
                {activeFilterCount > 0 ? ` — ${activeFilterCount} active` : ""}
              </span>
              <ChevronDown
                className={`h-4 w-4 ${filtersOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            <div
              id="report-filters"
              className={`${filtersOpen ? "block" : "hidden"} border-b border-border py-5 lg:block lg:border-b-0 lg:py-0`}
            >
              <div className="mb-5 hidden items-baseline justify-between border-b border-border pb-3 lg:flex">
                <h2
                  id="filter-heading"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-foreground"
                >
                  Filter reports
                </h2>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <FilterSelect
                  id="jurisdiction-filter"
                  label="Subject jurisdiction"
                  value={parsed.filters.jurisdiction || ""}
                  onChange={(value) => updateFilters({ jurisdiction: value || undefined })}
                >
                  <option value="">All subject jurisdictions</option>
                  {STATE_ENTRIES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  id="source-jurisdiction-filter"
                  label="Publishing authority"
                  value={parsed.filters.sourceJurisdiction || ""}
                  onChange={(value) =>
                    updateFilters({ sourceJurisdiction: value || undefined })
                  }
                >
                  <option value="">All publishing authorities</option>
                  <option value="US">Federal</option>
                  {STATE_ENTRIES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  id="topic-filter"
                  label="Topic"
                  value={parsed.filters.theme || ""}
                  onChange={(value) => updateFilters({ theme: value || undefined })}
                >
                  <option value="">All topics</option>
                  {topics.map((topic) => (
                    <option key={topic.slug} value={topic.slug}>
                      {topic.name}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  id="year-filter"
                  label="Publication year"
                  value={parsed.filters.year ? String(parsed.filters.year) : ""}
                  onChange={(value) =>
                    updateFilters({ year: value ? Number(value) : undefined })
                  }
                >
                  <option value="">All years</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  id="agency-filter"
                  label="Publishing agency"
                  value={parsed.filters.agency || ""}
                  onChange={(value) => updateFilters({ agency: value || undefined })}
                >
                  <option value="">All agencies</option>
                  {agencies.map((agency) => (
                    <option key={agency.slug} value={agency.slug}>
                      {agency.name}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  id="source-filter"
                  label="Original source"
                  value={parsed.filters.sourceStatus || ""}
                  onChange={(value) =>
                    updateFilters({
                      sourceStatus:
                        (value as SearchFilters["sourceStatus"]) || undefined,
                    })
                  }
                >
                  <option value="">Any source status</option>
                  <option value="available">Original source available</option>
                  <option value="record">Library record only</option>
                </FilterSelect>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-11 text-left text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </aside>

          <section
            className="mt-8 min-w-0 lg:mt-0"
            aria-labelledby="evidence-register-heading"
          >
            <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="evidence-register-heading"
                  className="font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Evidence register
                </h2>
                <p className="mt-1 text-lg font-semibold text-foreground" role="status">
                  {isLoading
                    ? "Loading reports…"
                    : `${data?.total || 0} ${data?.total === 1 ? "report" : "reports"}`}
                </p>
              </div>

              <FilterSelect
                id="sort-reports"
                label="Order"
                value={parsed.filters.sortBy || "date_desc"}
                compact
                onChange={(value) => updateFilters({ sortBy: value })}
              >
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="title">Report title</option>
                <option value="jurisdiction">Subject jurisdiction</option>
              </FilterSelect>
            </div>

            {error ? (
              <div className="border-b border-border py-8">
                <h2 className="font-semibold text-foreground">
                  Reports could not be loaded
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Check the connection and try this search again.
                </p>
              </div>
            ) : isLoading ? (
              <ReportLedgerSkeleton />
            ) : data?.items.length ? (
              <EvidenceLedger reports={data.items} />
            ) : (
              <div className="border-b border-border py-10">
                <h2 className="text-xl font-semibold text-foreground">
                  No reports match these filters
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  Remove a filter or search for a broader audit subject.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 rounded-sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              </div>
            )}

            {data && totalPages > 1 && (
              <nav
                className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-primary pt-5"
                aria-label="Report pages"
              >
                {parsed.page > 1 ? (
                  <Link
                    href={buildReportsHref(parsed.page - 1, parsed.filters)}
                    className="inline-flex min-h-11 items-center gap-2 border border-border px-4 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  Page {parsed.page} of {totalPages}
                </span>
                {parsed.page < totalPages ? (
                  <Link
                    href={buildReportsHref(parsed.page + 1, parsed.filters)}
                    className="inline-flex min-h-11 items-center gap-2 border border-border px-4 py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  compact = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "w-full sm:w-44" : undefined}>
      <label
        htmlFor={id}
        className={`block font-semibold text-foreground ${
          compact
            ? "mb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            : "mb-2 text-sm"
        }`}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {children}
      </select>
    </div>
  );
}

function ReportLedgerSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
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

function parseReportsLocation(location: string): {
  page: number;
  filters: SearchFilters;
} {
  const [pathname, queryString = ""] = location.split("?");
  const pageMatch = pathname.match(/^\/reports\/page\/(\d+)$/);
  const params = new URLSearchParams(queryString);
  const year = Number(params.get("year"));
  const sourceStatus = params.get("sourceStatus");
  const filters: SearchFilters = {};

  if (params.get("query")) filters.query = params.get("query") || undefined;
  if (params.get("jurisdiction")) {
    filters.jurisdiction = params.get("jurisdiction") || undefined;
  }
  if (params.get("sourceJurisdiction")) {
    filters.sourceJurisdiction = params.get("sourceJurisdiction") || undefined;
  }
  const legacyState = params.get("state");
  if (legacyState && !filters.jurisdiction && !filters.sourceJurisdiction) {
    if (legacyState.toUpperCase() === "US") {
      filters.sourceJurisdiction = "US";
    } else {
      filters.jurisdiction = legacyState.toUpperCase();
    }
  }
  if (params.get("agency")) filters.agency = params.get("agency") || undefined;
  if (Number.isInteger(year) && year > 0) filters.year = year;
  if (params.get("theme")) filters.theme = params.get("theme") || undefined;
  if (sourceStatus === "available" || sourceStatus === "record") {
    filters.sourceStatus = sourceStatus;
  }
  if (params.get("sortBy")) filters.sortBy = params.get("sortBy") || undefined;

  return {
    page: Math.max(1, Number(pageMatch?.[1] || 1)),
    filters,
  };
}

function buildReportsHref(page: number, filters: SearchFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const path = page === 1 ? "/reports" : `/reports/page/${page}`;
  return `${path}${params.size ? `?${params.toString()}` : ""}`;
}

function buildReportsSearch(filters: SearchFilters): string {
  const href = buildReportsHref(1, filters);
  return href.includes("?") ? href.slice(href.indexOf("?")) : "";
}

function countActiveFilters(filters: SearchFilters) {
  return Object.entries(filters).filter(
    ([key, value]) => key !== "sortBy" && value !== undefined && value !== "",
  ).length;
}

function buildItemList(data: SearchResponse, page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: data.items.map((report, index) => ({
      "@type": "ListItem",
      position: offset + index + 1,
      url: `https://www.medicaidintelligence.com${reportPath(report)}`,
      name: report.reportTitle,
    })),
  };
}

function buildCollectionPage(canonicalPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Medicaid Audit Reports",
    description:
      "Browse Medicaid audit reports with publishing agency, jurisdiction, financial impact, findings, recommendations, and original public sources.",
    url: `https://www.medicaidintelligence.com${canonicalPath}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Medicaid Audit Intelligence",
      url: "https://www.medicaidintelligence.com",
    },
  };
}
