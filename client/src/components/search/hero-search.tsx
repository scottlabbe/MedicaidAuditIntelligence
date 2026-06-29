import { useState } from "react";
import { Search } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    setLocation(
      trimmedQuery
        ? `/explore?query=${encodeURIComponent(trimmedQuery)}`
        : "/explore",
    );
  };

  return (
    <form onSubmit={handleSearch} role="search">
      <label htmlFor="homepage-evidence-search" className="sr-only">
        Search Medicaid audit evidence
      </label>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-0">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="homepage-evidence-search"
            type="search"
            placeholder="Topic, state, agency, report title, or finding"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-14 rounded-sm border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:relative focus-visible:z-10 focus-visible:ring-ring sm:rounded-r-none"
          />
        </div>
        <Button
          type="submit"
          className="h-14 rounded-sm px-7 text-base sm:rounded-l-none"
        >
          Search evidence
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Examples: managed care, provider enrollment, improper payments
      </p>
    </form>
  );
}
