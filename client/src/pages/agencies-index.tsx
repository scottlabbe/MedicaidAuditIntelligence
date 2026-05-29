import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Building2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencySummary } from "@/lib/types";

export default function AgenciesIndex() {
  const { data: agencies, isLoading, error } = useQuery<AgencySummary[]>({
    queryKey: ["/api/agencies"],
    queryFn: () => apiClient.getAgencies(),
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageMeta
        title="Medicaid Audit Agencies"
        description="Browse Medicaid audit reports by publishing oversight agency, auditor, inspector general, or legislative audit office."
        canonicalPath="/agencies"
      />
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          Audit Agencies
        </div>
        <h1 className="text-3xl font-bold text-foreground">Medicaid audit agencies</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Browse reports by the agency or oversight office that published the audit.
        </p>
      </header>
      {error ? (
        <p className="text-destructive">Error loading agencies: {error.message}</p>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...Array(9)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agencies?.map((agency) => (
            <Link key={agency.slug} href={`/agencies/${agency.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="p-5">
                  <h2 className="font-semibold text-foreground">{agency.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{agency.reportCount} reports</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
