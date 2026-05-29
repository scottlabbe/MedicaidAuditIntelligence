import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapPin } from "lucide-react";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { IndexableStateSummary } from "@/lib/types";

export default function StatesIndex() {
  const { data: states, isLoading, error } = useQuery<IndexableStateSummary[]>({
    queryKey: ["/api/states"],
    queryFn: () => apiClient.getStates(),
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageMeta
        title="State Medicaid Audit Report Pages"
        description="Browse Medicaid audit report coverage by state, including state-level findings, recommendations, and original source documents."
        canonicalPath="/states"
        jsonLd={states ? buildItemList(states) : undefined}
      />

      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          State Coverage
        </div>
        <h1 className="text-3xl font-bold text-foreground">State Medicaid audit report pages</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Use these state hubs to reach Medicaid audit reports grouped by jurisdiction.
        </p>
      </header>

      {error ? (
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-destructive">Error loading state pages: {error.message}</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(12)].map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {states?.map((state) => (
            <Link
              key={state.code}
              href={`/states/${state.slug}`}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <span className="block font-semibold text-foreground">
                {state.name} Medicaid audit reports
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {state.reportCount} reports
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function buildItemList(states: IndexableStateSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: states.map((state, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://www.medicaidintelligence.com/states/${state.slug}`,
      name: `${state.name} Medicaid audit reports`,
    })),
  };
}
