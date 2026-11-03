import assert from "node:assert/strict";
import test from "node:test";
import { isPublicSourceUrl } from "@shared/sourceUrls";
import { resolveHtmlRoute } from "./seo";
import { storage } from "./storage";
import { renderSsrFailureHtml } from "./vite";

test("report collection pages beyond the last page return a real 404", async () => {
  const reports = await storage.getReports({}, 1, 1);
  const lastPage = Math.max(1, Math.ceil(Number(reports.total) / 24));
  const route = await resolveHtmlRoute(`/reports/page/${lastPage + 1}`);

  assert.equal(route.status, 404);
  assert.equal(route.routeType, "not_found");
  assert.equal(route.seoMeta?.robots, "noindex, follow");
});

test("source availability filters distinguish public URLs from provenance records", async () => {
  const [available, records] = await Promise.all([
    storage.getReports({ sourceStatus: "available" }, 1, 500),
    storage.getReports({ sourceStatus: "record" }, 1, 500),
  ]);

  assert.ok(available.items.length > 0);
  assert.ok(
    available.items.every((report) =>
      isPublicSourceUrl(report.originalReportSourceUrl),
    ),
  );
  assert.ok(
    records.items.every(
      (report) => !isPublicSourceUrl(report.originalReportSourceUrl),
    ),
  );
});

test("SSR failure markup is explicitly non-indexable", () => {
  const html = renderSsrFailureHtml();

  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(html, /Temporarily unavailable/);
});
