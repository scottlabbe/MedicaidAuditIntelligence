import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { KeywordWithCount } from "@shared/schema";

export default function KeywordSection() {
  const [, setLocation] = useLocation();

  const { data: keywords, isLoading } = useQuery({
    queryKey: ["/api/keywords/top"],
    queryFn: async () => {
      const response = await fetch("/api/keywords/top");
      if (!response.ok) {
        throw new Error("Failed to fetch keywords");
      }
      return response.json() as Promise<KeywordWithCount[]>;
    },
  });

  const handleKeywordClick = (keyword: string) => {
    setLocation(`/explore?query=${encodeURIComponent(keyword)}`);
  };

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Popular Keywords</h2>
        <Link href="/explore">
          <Button variant="outline" className="flex items-center space-x-2 border text-secondary hover:bg-surface-2 focus-ring">
            <span>View all keywords</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="p-4">
              <CardContent className="p-0">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {keywords?.map((item) => (
            <Card 
              key={item.keyword} 
              className="cursor-pointer card-hover border warm-shadow rounded-xl transition-all hover:scale-105"
              onClick={() => handleKeywordClick(item.keyword)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground text-sm leading-tight line-clamp-1">
                    {item.keyword}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs px-2 py-1 bg-orange-light text-orange-primary border-orange-primary/20">
                  {item.reportCount} report{item.reportCount !== 1 ? 's' : ''}
                </Badge>
              </CardContent>
            </Card>
          )) || (
            <div className="col-span-full text-center py-12">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No keywords available</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}