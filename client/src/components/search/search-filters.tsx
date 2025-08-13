import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SearchFilters } from "@/lib/types";

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);



const PROGRAMS = [
  "Medicaid",
  "CHIP",
  "Managed Care",
  "Fee-for-Service",
  "SNAP",
  "TANF"
];

export default function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters };
    if (value === "" || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== "").length;

  return (
    <Card className="border border-slate-200 rounded-2xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 focus-ring hover:bg-slate-50 filter-transition">
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <Filter className="w-5 h-5 text-slate-600" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-200">
                    {activeFilterCount}
                  </span>
                )}
              </CardTitle>
              <X className={`w-4 h-4 text-slate-500 transition-transform filter-transition ${isOpen ? "rotate-45" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="mt-2 border-slate-300 text-slate-600 hover:bg-slate-50 focus-ring"
            >
              Clear all
            </Button>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Search Query */}
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                placeholder="Enter keywords..."
                value={filters.query || ""}
                onChange={(e) => updateFilter("query", e.target.value)}
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={filters.state || ""}
                onValueChange={(value) => updateFilter("state", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agency */}
            <div className="space-y-2">
              <Label htmlFor="agency">Agency</Label>
              <Input
                id="agency"
                placeholder="Enter agency name..."
                value={filters.agency || ""}
                onChange={(e) => updateFilter("agency", e.target.value)}
              />
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year">Publication Year</Label>
              <Select
                value={filters.year?.toString() || ""}
                onValueChange={(value) => updateFilter("year", value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}


            {/* Program */}
            <div className="space-y-2">
              <Label htmlFor="program">Program</Label>
              <Select
                value={filters.program || ""}
                onValueChange={(value) => updateFilter("program", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programs</SelectItem>
                  {PROGRAMS.map((program) => (
                    <SelectItem key={program} value={program}>
                      {program}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasAiInsight"
                  checked={filters.hasAiInsight || false}
                  onCheckedChange={(checked) => updateFilter("hasAiInsight", checked || undefined)}
                />
                <Label htmlFor="hasAiInsight" className="text-sm">
                  Has AI Insight
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={filters.featured || false}
                  onCheckedChange={(checked) => updateFilter("featured", checked || undefined)}
                />
                <Label htmlFor="featured" className="text-sm">
                  Featured Reports
                </Label>
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label htmlFor="severity">Finding Severity</Label>
              <Select
                value={filters.severity || ""}
                onValueChange={(value) => updateFilter("severity", value === "all" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
