import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/explore?query=${encodeURIComponent(query.trim())}`);
    } else {
      setLocation("/explore");
    }
  };

  return (
    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
      <div className="relative border rounded-2xl bg-card/70 border-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex">
          <Input
            type="text"
            placeholder="Search audit reports by keyword, state, agency, or topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 h-auto pl-12 pr-4 py-3 text-base bg-transparent border-0 focus:ring-0 focus:border-0 rounded-l-2xl rounded-r-none text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="lg"
            className="px-6 py-3 rounded-l-none rounded-r-2xl h-auto"
          >
            <span className="hidden sm:inline">Search</span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3 text-center">
        Try searching for "managed care", "provider enrollment", or "fraud"
      </p>
    </form>
  );
}
