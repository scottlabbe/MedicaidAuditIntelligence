import {
  Mail,
  ExternalLink,
  FileText,
  Zap,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 section-spacing">
      {/* Hero Section */}
      <div className="text-center content-spacing">
        <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
          About Medicaid Audit Intelligence
        </h1>
      </div>

      {/* Purpose Section */}
      <section className="mb-12">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              Purpose
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg leading-relaxed">
            Medicaid Audit Intelligence centralizes recently published
            Medicaid-related audit reports for program managers, auditors, and
            others who want a wide-angle view of issues reported by oversight
            agencies.
          </CardContent>
        </Card>
      </section>

      {/* Main Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-8">
          What This Tool Does
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                Data Transformation
              </CardTitle>
            </CardHeader>
            <CardContent>
              The platform turns unstructured audit PDFs into structured records
              you can search, compare, and use to power downstream processes
              (dashboards, a reference library, and more).
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-primary" />
                AI Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              All data elements are extracted by OpenAI models from publicly
              available audit reports. Most fields are captured as close to the
              original wording as possible, with selective AI-generated
              summaries.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* AI Usage Details */}
      <section className="mb-12">
        <Card className="card-shadow border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-orange-600" />
              How AI is Used
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              All data elements are extracted by OpenAI models from publicly
              available audit reports. Most fields, such as{" "}
              <strong>objective</strong>, <strong>overall conclusion</strong>,
              and <strong>findings</strong>, are captured as close to the
              original wording as possible. Two fields are intentionally
              AI-generated summaries for improved readability and analysis:
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">AI Scope Summary</Badge>
              <Badge variant="secondary">Ai Generated Insight</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Data Quality */}
      <section className="mb-12">
        <Card className="card-shadow border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              Data Quality & Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              AI systems can make mistakes. Links to the original source
              documents are provided for verification, and corrections are
              welcome.
            </p>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Found an error?</p>
                <p className="text-sm text-muted-foreground">
                  If you spot an error in the extracted data, please email us
                  for corrections.
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Extraction Workflow */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-8">
          Extraction Workflow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                Report Collection
              </CardTitle>
            </CardHeader>
            <CardContent>
              Relevant Medicaid audit reports are compiled from state and
              federal oversight sites.
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                Model Extraction
              </CardTitle>
            </CardHeader>
            <CardContent>
              Each report is processed by two lightweight OpenAI models to
              extract fields according to a predefined schema.
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                Normalization
              </CardTitle>
            </CardHeader>
            <CardContent>
              Outputs are standardized (e.g., dates, agency names) for
              consistent search and comparison.
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  4
                </div>
                Review & Publish
              </CardTitle>
            </CardHeader>
            <CardContent>
              Records are checked and published with citations back to the
              source PDF.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center py-12 bg-gradient-to-r from-orange-50/50 to-amber-50/50 rounded-2xl">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Ready to Explore?
        </h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
          Start searching through our comprehensive database of Medicaid audit
          reports.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/explore">
            <Button size="lg" className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Browse All Reports
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              View Dashboard
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
