import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, FileText, BarChart3, Home } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelect = (value: string) => {
    onOpenChange(false);
    if (value.startsWith("/")) {
      setLocation(value);
    } else {
      // Handle search query
      setLocation(`/explore?query=${encodeURIComponent(value)}`);
    }
  };

  const navigationItems = [
    {
      icon: Home,
      title: "Home",
      subtitle: "Return to homepage",
      value: "/",
    },
    {
      icon: Search,
      title: "Explore Reports",
      subtitle: "Search and filter all audit reports",
      value: "/explore",
    },
    {
      icon: BarChart3,
      title: "Dashboard",
      subtitle: "View statistics and trends",
      value: "/dashboard",
    },
  ];

  const searchSuggestions = [
    "California medicaid fraud",
    "provider screening audit",
    "data quality issues",
    "managed care oversight",
    "program integrity",
    "state:TX year:2024",
    "theme:\"Financial Oversight\"",
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search reports or navigate..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.value}
                value={item.value}
                onSelect={handleSelect}
              >
                <Icon className="mr-2 h-4 w-4" />
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.subtitle}</div>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {query.length > 0 && (
          <CommandGroup heading="Search">
            <CommandItem value={query} onSelect={handleSelect}>
              <Search className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">Search for "{query}"</div>
                <div className="text-sm text-muted-foreground">Find reports matching your query</div>
              </div>
            </CommandItem>
          </CommandGroup>
        )}

        {query.length === 0 && (
          <CommandGroup heading="Search Suggestions">
            {searchSuggestions.map((suggestion) => (
              <CommandItem
                key={suggestion}
                value={suggestion}
                onSelect={handleSelect}
              >
                <Search className="mr-2 h-4 w-4" />
                <div className="font-medium">{suggestion}</div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
