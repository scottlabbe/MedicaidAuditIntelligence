import { useState } from "react";
import { ExternalLink, AlertTriangle, Info, AlertCircle, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ReportWithDetails } from "@/lib/types";

interface ReportDetailTabsProps {
  report: ReportWithDetails;
}

const getSeverityIcon = (severity: string | null) => {
  switch (severity) {
    case "high":
      return <Zap className="w-4 h-4" />;
    case "medium":
      return <AlertTriangle className="w-4 h-4" />;
    case "low":
      return <AlertCircle className="w-4 h-4" />;
    case "info":
      return <Info className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getSeverityColor = (severity: string | null) => {
  switch (severity) {
    case "high":
      return "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200";
    case "medium":
      return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200";
    case "low":
      return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200";
    case "info":
      return "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/20 dark:border-slate-800 dark:text-slate-200";
    default:
      return "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/20 dark:border-slate-800 dark:text-slate-200";
  }
};

const getSeverityBadgeColor = (severity: string | null) => {
  switch (severity) {
    case "high":
      return "bg-rose-600 text-white";
    case "medium":
      return "bg-amber-600 text-white";
    case "low":
      return "bg-blue-600 text-white";
    case "info":
      return "bg-slate-600 text-white";
    default:
      return "bg-slate-600 text-white";
  }
};

export default function ReportDetailTabs({ report }: ReportDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <TabsList className="grid w-full grid-cols-6 h-auto p-0 bg-transparent">
          <TabsTrigger
            value="summary"
            className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none py-4 px-6"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="objectives"
            className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none py-4 px-6"
          >
            Objectives
          </TabsTrigger>
          <TabsTrigger
            value="scope"
            className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none py-4 px-6"
          >
            Scope
          </TabsTrigger>
          <TabsTrigger
            value="findings"
            className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none py-4 px-6"
          >
            Findings
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none py-4 px-6"
          >
            Recommendations
          </TabsTrigger>
          <TabsTrigger
            value="citations"
            className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none py-4 px-6"
          >
            Citations
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <TabsContent value="summary" className="mt-0">
          <div className="space-y-6">
            {/* Executive Summary */}
            {report.potentialObjectiveSummary && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Executive Summary</h3>
                <div className="prose prose-slate max-w-none dark:prose-invert">
                  <p className="text-muted-foreground leading-relaxed font-serif">
                    {report.potentialObjectiveSummary}
                  </p>
                </div>
              </div>
            )}

            {/* Overall Conclusion */}
            {report.overallConclusion && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Overall Conclusion</h3>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-amber-800 dark:text-amber-200 font-medium">
                        {report.overallConclusion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insight */}
            {report.llmInsight && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">AI-Generated Insight</h3>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground text-xs font-bold">AI</span>
                    </div>
                    <div>
                      <p className="text-foreground font-serif leading-relaxed">
                        {report.llmInsight}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Findings Summary */}
            {report.findings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Key Findings Summary</h3>
                <div className="space-y-3">
                  {report.findings.slice(0, 3).map((finding) => (
                    <div
                      key={finding.id}
                      className={`flex items-start space-x-3 p-4 rounded-xl border ${getSeverityColor(finding.severity)}`}
                    >
                      <Badge
                        className={`text-xs px-2 py-1 font-semibold ${getSeverityBadgeColor(finding.severity)}`}
                      >
                        {finding.severity?.charAt(0).toUpperCase() + (finding.severity?.slice(1) || "")}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">
                          {finding.text.length > 200 
                            ? `${finding.text.substring(0, 200)}...` 
                            : finding.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {report.findings.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      View the Findings tab to see all {report.findings.length} findings
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="objectives" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Audit Objectives</h3>
            {report.objectives.length > 0 ? (
              <div className="space-y-4">
                {report.objectives.map((objective, index) => (
                  <Card key={objective.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground text-sm font-semibold">
                            {objective.order || index + 1}
                          </span>
                        </div>
                        <p className="text-foreground font-serif leading-relaxed">
                          {objective.text}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No specific objectives documented for this audit</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scope" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Audit Scope</h3>
            {report.auditScope ? (
              <Card>
                <CardContent className="p-6">
                  <div className="prose prose-slate max-w-none dark:prose-invert">
                    <p className="text-muted-foreground leading-relaxed font-serif">
                      {report.auditScope}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No audit scope information available</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="findings" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Audit Findings ({report.findings.length})
            </h3>
            {report.findings.length > 0 ? (
              <div className="space-y-4">
                {report.findings.map((finding, index) => (
                  <Card key={finding.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`flex items-center space-x-2 p-2 rounded-lg ${getSeverityColor(finding.severity)}`}>
                            {getSeverityIcon(finding.severity)}
                            <Badge
                              className={`text-xs px-2 py-1 font-semibold ${getSeverityBadgeColor(finding.severity)}`}
                            >
                              {finding.severity?.toUpperCase() || "INFO"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Finding {finding.order || index + 1}
                            </span>
                          </div>
                          <p className="text-foreground font-serif leading-relaxed">
                            {finding.text}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No findings documented for this audit</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Recommendations ({report.recommendations.length})
            </h3>
            {report.recommendations.length > 0 ? (
              <div className="space-y-4">
                {report.recommendations.map((recommendation, index) => {
                  const relatedFinding = recommendation.relatedFindingId 
                    ? report.findings.find(f => f.id === recommendation.relatedFindingId)
                    : null;

                  return (
                    <Card key={recommendation.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                              {recommendation.order || index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                Recommendation {recommendation.order || index + 1}
                              </span>
                              {relatedFinding && (
                                <Badge variant="outline" className="text-xs">
                                  Related to Finding {relatedFinding.order || ""}
                                </Badge>
                              )}
                            </div>
                            <p className="text-foreground font-serif leading-relaxed">
                              {recommendation.text}
                            </p>
                            {relatedFinding && (
                              <div className="mt-3 p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Related Finding:</strong> {
                                    relatedFinding.text.length > 150 
                                      ? `${relatedFinding.text.substring(0, 150)}...`
                                      : relatedFinding.text
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recommendations provided for this audit</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="citations" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Citations & References</h3>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Primary Citation */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Primary Citation</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-mono text-sm text-foreground">
                        {report.title}. {report.agency}, {report.state}. 
                        {report.publicationDate || 
                          `${report.publicationYear}${report.publicationMonth ? `-${report.publicationMonth.toString().padStart(2, '0')}` : ''}${report.publicationDay ? `-${report.publicationDay.toString().padStart(2, '0')}` : ''}`}.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Source Information */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Source Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Agency:</span>
                        <p className="text-sm text-foreground">{report.agency}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">State:</span>
                        <p className="text-sm text-foreground">{report.state}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Publication Year:</span>
                        <p className="text-sm text-foreground">{report.publicationYear}</p>
                      </div>
                      {report.originalFilename && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Original File:</span>
                          <p className="text-sm text-foreground">{report.originalFilename}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Original Source Link */}
                  {report.originalReportSourceUrl && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Original Source</h4>
                        <a
                          href={report.originalReportSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Original Document</span>
                        </a>
                      </div>
                    </>
                  )}

                  {/* Keywords & Topics */}
                  {(report.keywords.length > 0 || report.themes.length > 0) && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Keywords & Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {report.themes.map((theme) => (
                            <Badge key={theme} variant="secondary">
                              {theme}
                            </Badge>
                          ))}
                          {report.keywords.map((keyword) => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
