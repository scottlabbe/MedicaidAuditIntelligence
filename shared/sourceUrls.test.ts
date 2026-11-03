import assert from "node:assert/strict";
import test from "node:test";
import { isPublicSourceUrl, normalizePublicSourceUrl } from "./sourceUrls";

test("isPublicSourceUrl accepts public HTTP and HTTPS sources", () => {
  assert.equal(isPublicSourceUrl("https://oig.hhs.gov/report.pdf"), true);
  assert.equal(isPublicSourceUrl(" http://example.gov/report "), true);
  assert.equal(
    normalizePublicSourceUrl(" https://example.gov/report "),
    "https://example.gov/report",
  );
});

test("isPublicSourceUrl rejects internal provenance and empty values", () => {
  assert.equal(isPublicSourceUrl("Manual Upload: OAS-25-02-074.pdf"), false);
  assert.equal(isPublicSourceUrl("/uploads/report.pdf"), false);
  assert.equal(isPublicSourceUrl(""), false);
  assert.equal(isPublicSourceUrl(null), false);
  assert.equal(isPublicSourceUrl(undefined), false);
  assert.equal(normalizePublicSourceUrl("Manual Upload: report.pdf"), undefined);
});
