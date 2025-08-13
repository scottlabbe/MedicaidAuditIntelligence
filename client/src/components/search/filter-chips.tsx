import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchFilters } from "@/lib/types";

interface FilterChipsProps {
  filters: SearchFilters;
  onRemoveFilter: (key: keyof SearchFilters) => void;
  onClearAll: () => void;
}

export default function FilterChips({ filters, onRemoveFilter, onClearAll }: FilterChipsProps) {
  const activeFilters = Object.entries(filters).filter(([, value]) => 
    value !== undefined && value !== "" && value !== null
  );

  if (activeFilters.length === 0) {
    return null;
  }

  const getFilterLabel = (key: string, value: any) => {
    switch (key) {
      case 'query':
        return `"${value}"`;
      case 'state':
        return `State: ${value}`;
      case 'agency':
        return `Agency: ${value}`;
      case 'year':
        return `Year: ${value}`;
      case 'theme':
        return `Theme: ${value}`;
      case 'program':
        return `Program: ${value}`;
      case 'hasAiInsight':
        return value ? 'Has AI Insight' : 'No AI Insight';
      case 'featured':
        return value ? 'Featured' : 'Not Featured';
      default:
        return `${key}: ${value}`;
    }
  };

  const getChipColor = (key: string) => {
    switch (key) {
      case 'state':
        return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200';
      case 'year':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200';
      case 'theme':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200';
      case 'hasAiInsight':
        return 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900 dark:text-rose-200';
      case 'featured':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium text-foreground">Active filters:</span>
      
      {activeFilters.map(([key, value]) => (
        <Button
          key={key}
          variant="ghost"
          size="sm"
          className={`text-sm px-3 py-1 rounded-full flex items-center space-x-1 ${getChipColor(key)}`}
          onClick={() => onRemoveFilter(key as keyof SearchFilters)}
        >
          <span>{getFilterLabel(key, value)}</span>
          <X className="w-3 h-3" />
        </Button>
      ))}

      {activeFilters.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearAll}
          className="text-sm px-3 py-1 rounded-full"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
