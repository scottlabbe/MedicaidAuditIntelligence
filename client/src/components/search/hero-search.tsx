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
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search audit reports by keyword, state, agency, or topic..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-32 py-3 text-base"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          <Button type="submit" className="mr-1 rounded-l-none">
            <span className="hidden sm:inline">Search</span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2 text-center">
        Try searching for "eligibility", "provider enrollment", or "fraud"
      </p>
    </form>
  );
}