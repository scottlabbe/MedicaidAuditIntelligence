import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import PageMeta from "@/components/seo/PageMeta";
import { apiClient } from "@/lib/api";
import type { TopicSummary } from "@/lib/types";

export default function TopicsIndex() {
  const {
    data: topics,
    isLoading,
    error,
    refetch,
  } = useQuery<TopicSummary[]>({
    queryKey: ["/api/topics"],
    queryFn: () => apiClient.getTopics(),
  });

  return (
    <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
      <PageMeta
        title="Medicaid Audit Topics"
        description="Browse Medicaid audit topic guides with definitions, findings, recommendations, and related reports."
        canonicalPath="/topics"
      />

      <header className="max-w-[760px] border-b-2 border-primary pb-8 sm:pb-10">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Subject guide register
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl">
          Medicaid audit topics
        </h1>
        <p className="mt-5 font-serif text-lg leading-8 text-muted-foreground sm:text-xl">
          Use these guides to understand recurring Medicaid audit issues, the
          findings that support them, and the actions auditors recommend.
        </p>
      </header>

      <section className="mt-10 sm:mt-12" aria-labelledby="topic-register-heading">
        <div className="flex items-end justify-between gap-5 border-b border-border pb-3">
          <h2
            id="topic-register-heading"
            className="text-xl font-bold text-foreground sm:text-2xl"
          >
            Active topics
          </h2>
          <p className="hidden font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground sm:block">
            Related reports
          </p>
        </div>

        {error ? (
          <div className="border-b border-border py-8">
            <p>The topic register could not be loaded.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div aria-label="Loading topic register">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                key={index}
                className="grid animate-pulse gap-4 border-b border-border py-7 motion-reduce:animate-none sm:grid-cols-[minmax(0,1fr)_8rem]"
              >
                <div>
                  <div className="h-7 w-52 bg-muted" />
                  <div className="mt-4 h-12 max-w-2xl bg-muted" />
                </div>
                <div className="h-5 w-20 bg-muted sm:justify-self-end" />
              </div>
            ))}
          </div>
        ) : (
          <ol className="border-b border-border">
            {topics?.map((topic) => (
              <li key={topic.slug} className="border-t border-border first:border-t-0">
                <Link
                  href={`/topics/${topic.slug}`}
                  className="group grid gap-5 py-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-8 sm:py-8"
                >
                  <div>
                    <h3 className="text-xl font-bold leading-7 text-primary underline decoration-1 underline-offset-4 group-hover:text-accent-foreground sm:text-2xl">
                      {topic.name}
                    </h3>
                    <p className="mt-3 max-w-3xl font-serif text-base leading-7 text-foreground">
                      {topic.shortDescription}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {topic.reportCount}{" "}
                      {topic.reportCount === 1 ? "report" : "reports"}
                    </p>
                    <span className="mt-4 hidden items-center justify-end gap-2 text-sm font-semibold text-primary group-hover:text-accent-foreground sm:flex">
                      Open guide
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
