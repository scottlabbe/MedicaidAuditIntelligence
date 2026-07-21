import assert from "node:assert/strict";
import test from "node:test";
import { inspectHtml, parseSitemapUrls } from "./audit-site.ts";

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
  assert.equal(audit.descriptionPresent, true);
  assert.equal(audit.internalLinkCount, 1);
  assert.equal(audit.externalLinkCount, 1);
  assert.ok(audit.wordCount >= 8);
  assert.equal(audit.jsonLdValid, true);
});
