import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  size?: "default" | "large";
}

export default function SearchBar({
  placeholder = "Search by state, agency, topic, or keyword...",
  onSearch,
  className = "",
  size = "default"
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        setLocation(`/explore?q=${encodeURIComponent(query)}`);
      }
    }
  };

  const inputClasses = size === "large" 
    ? "w-full px-4 py-4 pl-12 pr-24 text-lg rounded-xl"
    : "w-full px-4 py-2 pl-10 pr-20 text-sm rounded-lg";

  const buttonClasses = size === "large"
    ? "absolute right-3 top-3 px-4 py-2 rounded-lg"
    : "absolute right-2 top-2 px-3 py-1 rounded-md text-sm";

  const iconClasses = size === "large"
    ? "absolute left-4 top-5 w-6 h-6 text-muted-foreground"
    : "absolute left-3 top-3 w-4 h-4 text-muted-foreground";

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={inputClasses}
      />
      <Search className={iconClasses} />
      <Button
        type="submit"
        className={`${buttonClasses} bg-primary hover:bg-primary/90 text-primary-foreground transition-colors`}
      >
        Search
      </Button>
    </form>
  );
}
