import { useState } from "react";
import { Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ReportWithDetails } from "@/lib/types";

interface ReportDetailTabsProps {
  report: ReportWithDetails;
}

// small helpers to tolerate snake_case/camelCase
const get = <T,>(o: any, a: string, b?: string): T | undefined =>
  o?.[a] ?? (b ? o?.[b] : undefined);

export default function ReportDetailTabs({ report }: ReportDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("summary");

  // normalize fields once
  const overallConclusion = get<string>(
    report,
    "overallConclusion",
    "overall_conclusion",
  );
  const auditScope = get<string>(report, "auditScope", "audit_scope");
  const aiScopeSummary = get<string>(
    report,
    "potentialObjectiveSummary",
    "potential_objective_summary",
  );
  const aiInsight = get<string>(report, "llmInsight", "llm_insight");

  const findings = (report as any).findings ?? [];
  const recommendations = (report as any).recommendations ?? [];
  const objectives = (report as any).objectives ?? [];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="border-b border-border">
        <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-transparent">
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
        </TabsList>
      </div>

      <div className="p-6">
        {/* SUMMARY */}
        <TabsContent value="summary" className="mt-0">
          <div className="space-y-6">
            {/* Overall Conclusion */}
            {overallConclusion && (
              <div className="mt-10">
                <h3 className="text-xl font-semibold mb-3 text-primary">
                  Overall Conclusion
                </h3>
                <Card className="bg-card border warm-shadow relative">
                  <CardContent className="p-6">
                    <div className="absolute left-0 top-0 h-full w-1 bg-orange-primary rounded-l-md" />
                    <p className="leading-relaxed text-primary pl-2">
                      {overallConclusion}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Separator */}
            {overallConclusion && auditScope && (
              <Separator className="my-6 border-slate-200" />
            )}

            {/* Original Scope (moved here) */}
            {auditScope && (
              <div className="mt-10">
                <h3 className="text-xl font-semibold mb-3 text-primary">
                  Audit Scope
                </h3>
                <Card className="bg-card border warm-shadow">
                  <CardContent className="p-6">
                    <p className="text-secondary leading-relaxed">
                      {auditScope}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Separator */}
            {(overallConclusion || auditScope) && findings.length > 0 && (
              <Separator className="my-6 border-slate-200" />
            )}

            {/* Key Findings Summary (simple, no labels) */}
            {findings.length > 0 && (
              <div className="mt-10">
                <h3 className="text-xl font-semibold mb-3 text-primary">
                  Key Findings Summary
                </h3>
                <div className="space-y-4">
                  {findings.slice(0, 3).map((f: any, i: number) => {
                    const text =
                      get<string>(f, "findingText", "finding_text") ?? "";
                    const preview =
                      text.length > 360 ? `${text.slice(0, 360)}…` : text;
                    return (
                      <Card
                        key={f.id ?? i}
                        className="bg-card border warm-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-2 text-secondary flex items-center justify-center text-sm font-semibold">
                              {f.order ?? i + 1}
                            </div>
                            <p className="leading-relaxed text-primary">
                              {preview}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {findings.length > 3 && (
                    <p className="text-sm text-slate-600 text-center py-2">
                      View the Findings tab to see all {findings.length}{" "}
                      findings
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Separator */}
            {(overallConclusion || auditScope || findings.length > 0) &&
              (aiScopeSummary || aiInsight) && (
                <Separator className="my-6 border-slate-200" />
              )}

            {/* AI-Assisted (AI Scope Summary + AI Insight) */}
            {(aiScopeSummary || aiInsight) && (
              <div className="mt-10">
                <h3 className="text-xl font-semibold mb-3 text-primary">
                  AI-Assisted
                </h3>
                <div className="bg-orange-light border border-orange-primary/20 rounded-xl p-5 space-y-4 warm-shadow">
                  {aiScopeSummary && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary mb-1">
                        AI Scope Summary
                      </p>
                      <p className="font-serif leading-relaxed text-primary">
                        {aiScopeSummary}
                      </p>
                    </div>
                  )}
                  {aiInsight && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary mb-1">
                        AI-Generated Insight
                      </p>
                      <p className="font-serif leading-relaxed text-primary">
                        {aiInsight}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* OBJECTIVES */}
        <TabsContent value="objectives" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4 text-primary">
              Audit Objectives
            </h3>
            {objectives.length ? (
              <div className="space-y-4">
                {objectives.map((o: any, idx: number) => {
                  const text =
                    get<string>(o, "objectiveText", "objective_text") ?? "";
                  return (
                    <Card
                      key={o.id ?? idx}
                      className="bg-card border warm-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-surface-2 text-secondary rounded-full flex items-center justify-center text-sm font-semibold">
                            {o.order ?? idx + 1}
                          </div>
                          <p className="leading-relaxed text-primary">
                            {text}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  No specific objectives documented for this audit
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* FINDINGS */}
        <TabsContent value="findings" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4 text-primary">
              Audit Findings ({findings.length})
            </h3>
            {findings.length ? (
              <div className="space-y-4">
                {findings.map((f: any, idx: number) => {
                  const text =
                    get<string>(f, "findingText", "finding_text") ?? "";
                  return (
                    <Card
                      key={f.id ?? idx}
                      className="bg-card border warm-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-surface-2 text-secondary rounded-full flex items-center justify-center text-sm font-semibold">
                            {f.order ?? idx + 1}
                          </div>
                          <p className="leading-relaxed text-primary">
                            {text}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  No findings documented for this audit
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4 text-primary">
              Recommendations ({recommendations.length})
            </h3>
            {recommendations.length ? (
              <div className="space-y-4">
                {recommendations.map((r: any, idx: number) => {
                  const text =
                    get<string>(
                      r,
                      "recommendationText",
                      "recommendation_text",
                    ) ?? "";
                  return (
                    <Card
                      key={r.id ?? idx}
                      className="bg-card border warm-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-surface-2 text-secondary rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold">
                              {r.order ?? idx + 1}
                            </span>
                          </div>
                          <p className="leading-relaxed text-primary">
                            {text}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  No recommendations provided for this audit
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
