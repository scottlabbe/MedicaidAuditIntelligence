import assert from "node:assert/strict";
import test from "node:test";
import { inspectHtml, inspectReportLedgerHtml, parseSitemapUrls } from "./audit-site.ts";

test("parseSitemapUrls decodes XML entities", () => {
  assert.deepEqual(
    parseSitemapUrls("<urlset><url><loc>https://example.gov/a?x=1&amp;y=2</loc></url></urlset>"),
    ["https://example.gov/a?x=1&y=2"],
  );
});

test("inspectHtml records core discovery facts", () => {
  const audit = inspectHtml(
    "https://example.gov/reports/1",
    200,
    "https://example.gov/reports/1",
    `<!doctype html><html><head><title>Report</title><meta name="description" content="Evidence"><meta name="robots" content="index, follow"><link rel="canonical" href="https://example.gov/reports/1"><script type="application/ld+json">{"@type":"Report"}</script></head><body><h1>Report</h1><p>Medicaid audit evidence for reviewers.</p><a href="/topics/payments">Topic</a><a href="https://oig.hhs.gov/report">Source</a></body></html>`,
  );
  assert.equal(audit.pageFamily, "reports");
  assert.equal(audit.h1Count, 1);
  assert.equal(audit.h1Text, "Report");
  assert.equal(audit.title, "Report");
  assert.equal(audit.canonicalUrl, "https://example.gov/reports/1");
  assert.equal(audit.description, "Evidence");
  assert.equal(audit.jsonLdValid, true);
});

test("inspectReportLedgerHtml reads deterministic SSR pagination data", () => {
  const audit = inspectReportLedgerHtml(
    "https://example.gov/reports/page/2",
    2,
    200,
    "https://example.gov/reports/page/2",
    `<html><body><script>window.__INITIAL_ROUTE_DATA__ = {"routeType":"reports_index","reportsIndex":{"items":[{"id":25},{"id":26}],"total":"26","page":2,"pageSize":24}};</script></body></html>`,
  );

  assert.equal(audit.error, null);
  assert.equal(audit.page, 2);
  assert.equal(audit.pageSize, 24);
  assert.equal(audit.total, 26);
  assert.equal(audit.pageCount, 2);
  assert.deepEqual(audit.itemIds, [25, 26]);
});
