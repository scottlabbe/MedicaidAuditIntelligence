import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tags } from "lucide-react";
import { apiClient } from "@/lib/api";
import PageMeta from "@/components/seo/PageMeta";
import { Card, CardContent } from "@/components/ui/card";
import type { TopicSummary } from "@/lib/types";

export default function TopicsIndex() {
  const { data: topics } = useQuery<TopicSummary[]>({
    queryKey: ["/api/topics"],
    queryFn: () => apiClient.getTopics(),
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageMeta
        title="Medicaid Audit Topics"
        description="Browse Medicaid audit reports by topic, including managed care, pharmacy benefit managers, eligibility, enrollment, and program integrity."
        canonicalPath="/topics"
      />
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          <Tags className="h-4 w-4" />
          Audit Topics
        </div>
        <h1 className="text-3xl font-bold text-foreground">Medicaid audit topics</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {topics?.map((topic) => (
          <Link key={topic.slug} href={`/topics/${topic.slug}`}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="p-5">
                <h2 className="font-semibold text-foreground">{topic.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{topic.description}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{topic.reportCount} related reports</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
