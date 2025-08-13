import { Calendar, MapPin, Building, Copy, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ReportListItem } from "@/lib/types";

interface ReportCardProps {
  report: ReportListItem;
}

export default function ReportCard({ report }: ReportCardProps) {
  const { toast } = useToast();

  const handleCopyCitation = () => {
    const citation = `${report.auditOrganization} (${report.publicationYear}). ${report.reportTitle}. State: ${report.state}.`;
    navigator.clipboard.writeText(citation);
    toast({
      title: "Citation copied",
      description: "Report citation has been copied to clipboard",
    });
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex space-x-2">
            <Badge variant="secondary" className="text-xs">
              {report.state}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {report.publicationYear}
            </Badge>
          </div>
          {report.featured && (
            <Badge variant="default" className="text-xs">
              Featured
            </Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
          {report.reportTitle}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Building className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{report.auditOrganization}</span>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Published {report.publicationYear}</span>
          </div>
        </div>

        {report.conclusionExcerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {report.conclusionExcerpt}
          </p>
        )}

        <div className="flex flex-wrap gap-2">

        </div>
      </CardContent>
      
      <CardFooter className="p-6 pt-0 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyCitation}
          className="text-muted-foreground hover:text-foreground"
        >
          <Copy className="w-4 h-4 mr-1" />
          <span className="text-xs">Cite</span>
        </Button>
        
        <Link href={`/reports/${report.id}`}>
          <Button size="sm" className="flex items-center space-x-1">
            <span>View Summary</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}