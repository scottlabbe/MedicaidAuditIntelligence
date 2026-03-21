import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/seo/PageMeta";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <PageMeta
        title="Page Not Found"
        description="The requested page could not be found on Medicaid Audit Intelligence."
        robots="noindex, follow"
      />
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you requested does not exist or is no longer available.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/">
              <Button size="sm">Home</Button>
            </Link>
            <Link href="/explore">
              <Button variant="outline" size="sm">Explore Reports</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
