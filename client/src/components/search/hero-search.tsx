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
      <div className="relative border rounded-md bg-surface-2 focus-within:ring-2 focus-within:ring-orange-primary/20 focus-within:border-orange-primary transition-colors">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Search className="h-5 w-5 text-muted" />
        </div>
        <div className="flex">
          <Input
            type="text"
            placeholder="Search audit reports by keyword, state, agency, or topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 pl-10 pr-32 py-3 text-base bg-transparent border-0 focus:ring-0 focus:border-0 rounded-l-md rounded-r-none"
          />
          <Button 
            type="submit" 
            className="px-6 py-3 bg-orange-primary hover:bg-orange-dark text-white border-0 rounded-l-none rounded-r-md h-auto"
          >
            <span className="hidden sm:inline">Search</span>
            <ArrowRight className="h-4 w-4 sm:ml-2" />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted mt-2 text-center">
        Try searching for "eligibility", "provider enrollment", or "fraud"
      </p>
    </form>
  );
}