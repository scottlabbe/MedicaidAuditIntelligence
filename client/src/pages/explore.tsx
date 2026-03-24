import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Download, Filter, Grid, List, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import SearchFilters from "@/components/search/search-filters";
import ReportCard from "@/components/reports/report-card";
import PageMeta from "@/components/seo/PageMeta";
import type { SearchResponse, SearchFilters as SearchFiltersType } from "@/lib/types";
import { getStateEntryByCode } from "@shared/states";

export default function Explore() {
  const [location, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [sortBy, setSortBy] = useState("date_desc");
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== "").length;
  const stateEntry = getStateEntryByCode(filters.state);
  const shouldFetchResults = activeFilterCount > 0 || page > 1;
  const stateOnlyFilter =
    Boolean(stateEntry) &&
    !filters.query &&
    !filters.agency &&
    !filters.year &&
    sortBy === "date_desc";

  // Parse URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newFilters: SearchFiltersType = {};
    
    if (urlParams.get("query")) newFilters.query = urlParams.get("query")!;
    if (urlParams.get("state")) newFilters.state = urlParams.get("state")!;
    if (urlParams.get("agency")) newFilters.agency = urlParams.get("agency")!;
    if (urlParams.get("year")) newFilters.year = parseInt(urlParams.get("year")!);


    
    // Parse sortBy from URL
    if (urlParams.get("sortBy")) {
      setSortBy(urlParams.get("sortBy")!);
    }
    
    setFilters(newFilters);
  }, [location]);

  // Update URL when filters change
  useEffect(() => {
    if (stateOnlyFilter && stateEntry) {
      return;
    }

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
    
    // Add sortBy to URL if it's not the default
    if (sortBy && sortBy !== "date_desc") {
      params.set("sortBy", sortBy);
    }
    
    const newUrl = `/explore${params.toString() ? `?${params.toString()}` : ""}`;
    if (newUrl !== location) {
      setLocation(newUrl);
    }
  }, [filters, location, setLocation, sortBy, stateEntry, stateOnlyFilter]);

  const { data: searchResults, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/reports", { ...filters, sortBy }, page],
    enabled: shouldFetchResults,
    queryFn: async () => {
      const result = await apiClient.getReports({ ...filters, sortBy }, { page, pageSize: 24 });
      return result as SearchResponse;
    },
  });

  const handleFilterChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleRemoveFilter = (filterKey: keyof SearchFiltersType) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey];
    setFilters(newFilters);
  };
  useEffect(() => {
    if (!stateOnlyFilter || !stateEntry) {
      return;
    }

    const stateUrl = `/states/${stateEntry.slug}`;
    if (location !== stateUrl) {
      setLocation(stateUrl);
    }
  }, [location, setLocation, stateEntry, stateOnlyFilter]);

  const pageMeta = useMemo(() => {
    if (stateEntry) {
      return {
        title: `Medicaid Audit Reports in ${stateEntry.name}`,
        description: `Browse Medicaid audit reports for ${stateEntry.name}. Find audit findings, recommendations, and oversight insights.`,
      };
    }
    if (filters.query) {
      return {
        title: `"${filters.query}" - Medicaid Audit Search`,
        description: `Search results for "${filters.query}" in Medicaid audit reports. Find related findings, recommendations, and analysis.`,
      };
    }
    return {
      title: "Explore Medicaid Audit Reports",
      description: "Search and filter Medicaid audit reports by state, agency, year, and topic. Browse findings, recommendations, and financial impacts.",
    };
  }, [filters.query, stateEntry]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading reports: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageMeta
        title={pageMeta.title}
        description={pageMeta.description}
        canonicalPath="/explore"
        robots={activeFilterCount > 0 ? "noindex, follow" : "index, follow"}
      />
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Explore Reports</h1>
            <p className="text-muted-foreground">
              {shouldFetchResults
                ? searchResults
                  ? `${searchResults.total} reports found`
                  : "Loading reports..."
                : "Start with a state page or apply filters to load the interactive report explorer."}
            </p>
          </div>

          {/* Active Filters & Controls */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
            <div className="border-b border-border p-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Active Filters */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <span>Filters:</span>
                  </span>
                  {activeFilterCount === 0 ? (
                    <span className="text-sm text-muted-foreground">None applied</span>
                  ) : (
                    <div className="flex space-x-2">
                      {filters.query && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <span>Query: {filters.query}</span>
                          <button
                            onClick={() => handleRemoveFilter("query")}
                            className="hover:bg-secondary rounded-full p-0.5"
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {filters.state && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <span>{filters.state}</span>
                          <button
                            onClick={() => handleRemoveFilter("state")}
                            className="hover:bg-secondary rounded-full p-0.5"
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {filters.year && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <span>{filters.year}</span>
                          <button
                            onClick={() => handleRemoveFilter("year")}
                            className="hover:bg-secondary rounded-full p-0.5"
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-4 ml-auto">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Sort by Date (newest)</SelectItem>
                      <SelectItem value="date_asc">Sort by Date (oldest)</SelectItem>
                      <SelectItem value="title">Sort by Title</SelectItem>
                      <SelectItem value="state">Sort by State</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === "cards" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("cards")}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>


                </div>
              </div>
            </div>

            {/* Results */}
            <div className="p-6">
              {!shouldFetchResults ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Explore the indexed report library</h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Use the filters to load interactive search results, or start with the curated state landing pages linked above in the page content and footer.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link href="/dashboard">
                      <Button variant="outline">View Dashboard</Button>
                    </Link>
                    <Button onClick={() => setFilters({ year: new Date().getFullYear() })}>
                      Load Recent Reports
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="space-y-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex space-x-4 p-4">
                      <Skeleton className="w-12 h-12" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults?.items.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No reports found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search filters or terms.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setFilters({})}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {searchResults?.items.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults?.items.map((report) => (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="secondary">{report.state}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {report.auditOrganization}
                              </span>
                            </div>
                            <h3 className="font-semibold text-foreground mb-2">
                              {report.reportTitle}
                            </h3>
                            {report.conclusionExcerpt && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {report.conclusionExcerpt}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className="text-sm text-muted-foreground">
                              {report.publicationYear}
                            </span>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/reports/${report.id}`}>View</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {searchResults && searchResults.total > 24 && (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {Math.ceil(searchResults.total / 24)}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page >= Math.ceil(searchResults.total / 24)}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
