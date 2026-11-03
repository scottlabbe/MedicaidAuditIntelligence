import assert from "node:assert/strict";
import test from "node:test";
import { generateSitemap, resolveHtmlRoute } from "./seo";
import { storage } from "./storage";
import { reportPath } from "@shared/reportSlugs";

test("canonical report slugs render and legacy numeric URLs redirect", async () => {
  const results = await storage.getReports({ sortBy: "date_desc" }, 1, 1);
  const report = results.items[0];
  assert.ok(report?.slug, "expected a visible report with a public slug");

  const canonicalPath = reportPath(report);
  const canonical = await resolveHtmlRoute(canonicalPath);
  assert.equal(canonical.status, 200);
  assert.equal(canonical.routeType, "report");
  assert.equal(
    canonical.seoMeta?.canonicalUrl,
    `https://www.medicaidintelligence.com${canonicalPath}`,
  );

  const numeric = await resolveHtmlRoute(`/reports/${report.id}?from=legacy`);
  assert.equal(numeric.status, 301);
  assert.equal(numeric.redirectTo, `${canonicalPath}?from=legacy`);

  const singular = await resolveHtmlRoute(`/report/${report.id}`);
  assert.equal(singular.status, 301);
  assert.equal(singular.redirectTo, canonicalPath);
});

test("the sitemap emits canonical slug URLs instead of numeric report URLs", async () => {
  const results = await storage.getReports({ sortBy: "date_desc" }, 1, 1);
  const report = results.items[0];
  assert.ok(report?.slug);

  const sitemap = await generateSitemap();
  assert.match(sitemap, new RegExp(`<loc>https://www\\.medicaidintelligence\\.com${reportPath(report)}</loc>`));
  assert.doesNotMatch(
    sitemap,
    new RegExp(`<loc>https://www\\.medicaidintelligence\\.com/reports/${report.id}</loc>`),
  );
});

test("unknown report slugs return a real 404", async () => {
  const route = await resolveHtmlRoute("/reports/not-a-real-medicaid-report-slug");
  assert.equal(route.status, 404);
  assert.equal(route.routeType, "not_found");
});
