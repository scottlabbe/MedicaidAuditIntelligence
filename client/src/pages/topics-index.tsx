import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import PageMeta from "@/components/seo/PageMeta";
import { getKeywordDefinition } from "@/lib/keywordDefinitions";
import type { KeywordWithCount } from "@shared/schema";

export default function TopicsIndex() {
  const [, setLocation] = useLocation();
  const [requestedKeyword, setRequestedKeyword] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("keyword");
  });
  const { data: keywords, isLoading, error, refetch } = useQuery<KeywordWithCount[]>({
    queryKey: ["/api/keywords/top", 24],
    queryFn: async () => {
      const response = await fetch("/api/keywords/top?limit=24");
      if (!response.ok) {
        throw new Error("The topic register could not be loaded.");
      }
      return response.json() as Promise<KeywordWithCount[]>;
    },
  });

  useEffect(() => {
    const syncKeywordFromUrl = () => {
      setRequestedKeyword(new URLSearchParams(window.location.search).get("keyword"));
    };

    window.addEventListener("popstate", syncKeywordFromUrl);
    return () => window.removeEventListener("popstate", syncKeywordFromUrl);
  }, []);

  const selectedKeyword = keywords?.find(
    ({ keyword }) => keyword.toLocaleLowerCase() === requestedKeyword?.toLocaleLowerCase(),
  );
  const featuredKeywords = keywords?.slice(0, 4) ?? [];

  const selectKeyword = (keyword: string) => {
    setRequestedKeyword(keyword);
    setLocation(`/topics?keyword=${encodeURIComponent(keyword)}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const showAllTopics = () => {
    setRequestedKeyword(null);
    setLocation("/topics");
  };

  return (
    <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
      <PageMeta
        title={selectedKeyword ? `${selectedKeyword.keyword} — Medicaid Topic Definition` : "Medicaid Audit Topics"}
        description={
          selectedKeyword
            ? `A plain-language definition of ${selectedKeyword.keyword} in Medicaid oversight.`
            : "Browse and select frequently used terms from the Medicaid Audit Intelligence evidence library."
        }
        canonicalPath="/topics"
      />

      {selectedKeyword ? (
        <header className="border-b-2 border-primary pb-10 sm:pb-14">
          <button
            type="button"
            onClick={showAllTopics}
            className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-primary underline decoration-1 underline-offset-4 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All topics
          </button>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Topic definition
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight tracking-[-0.035em] text-foreground sm:text-[48px] sm:leading-[1.08]">
            {selectedKeyword.keyword}
          </h1>
          <p className="mt-6 max-w-[760px] font-serif text-xl leading-8 text-foreground sm:text-2xl sm:leading-9">
            {getKeywordDefinition(selectedKeyword.keyword)}
          </p>
        </header>
      ) : (
        <>
          <header className="max-w-[760px]">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Subject index
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-[44px] sm:leading-[1.1]">
              Topics
            </h1>
            <p className="mt-4 font-serif text-lg leading-8 text-muted-foreground">
              Select a term used across the audit library to read its plain-language definition.
            </p>
          </header>

          <section className="mt-12" aria-labelledby="frequent-topics-heading">
            <div className="flex items-end justify-between gap-4 border-b-2 border-primary pb-3">
              <h2 id="frequent-topics-heading" className="text-xl font-bold text-foreground sm:text-2xl">
                Most frequent terms
              </h2>
              <p className="hidden font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground sm:block">
                Current corpus
              </p>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2" aria-label="Loading most frequent topics">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="min-h-48 animate-pulse border-b border-border py-7 motion-reduce:animate-none md:px-7 md:even:border-l">
                    <div className="h-3 w-24 bg-muted" />
                    <div className="mt-5 h-7 w-1/2 bg-muted" />
                    <div className="mt-5 h-20 bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <ol className="grid md:grid-cols-2">
                {featuredKeywords.map((item, index) => (
                  <li
                    key={item.keyword}
                    className="border-b border-border py-7 md:px-7 md:even:border-l"
                  >
                    <button
                      type="button"
                      onClick={() => selectKeyword(item.keyword)}
                      className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                    >
                      <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")} · {item.reportCount} indexed reports
                      </span>
                      <span className="mt-3 block text-xl font-bold text-primary underline decoration-1 underline-offset-4 group-hover:text-accent-foreground sm:text-2xl">
                        {item.keyword}
                      </span>
                      <span className="mt-4 block font-serif text-base leading-7 text-foreground">
                        {getKeywordDefinition(item.keyword)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      <section className="mt-14 sm:mt-16" aria-labelledby="all-topics-heading">
        <div className="border-b-2 border-primary pb-3">
          <h2 id="all-topics-heading" className="text-xl font-bold text-foreground sm:text-2xl">
            {selectedKeyword ? "Choose another topic" : "All topics"}
          </h2>
        </div>

        {error ? (
          <div className="border-b border-border py-8">
            <p className="text-foreground">The topic register could not be loaded.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading topic register">
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="h-20 animate-pulse border-b border-border py-5 motion-reduce:animate-none sm:px-5 sm:even:border-l lg:border-l">
                <div className="h-5 w-2/3 bg-muted" />
                <div className="mt-2 h-3 w-20 bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3">
            {keywords?.map((item) => {
              const selected = selectedKeyword?.keyword === item.keyword;
              return (
                <li key={item.keyword} className="border-b border-border sm:px-5 sm:even:border-l lg:border-l">
                  <button
                    type="button"
                    onClick={() => selectKeyword(item.keyword)}
                    aria-pressed={selected}
                    className={`flex min-h-20 w-full items-center justify-between gap-4 px-2 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                      selected ? "bg-secondary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="font-semibold leading-6 text-primary underline decoration-1 underline-offset-4">
                      {item.keyword}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {item.reportCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
