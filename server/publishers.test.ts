import assert from "node:assert/strict";
import test from "node:test";
import { resolveHtmlRoute } from "./seo";
import { storage } from "./storage";

test("public reports expose canonical publishers without replacing auditor evidence", async () => {
  const report = await storage.getReportById("179");

  assert.ok(report);
  assert.equal(report.publisherKey, "illinois-auditor-general");
  assert.equal(report.publisherName, "Illinois Office of the Auditor General");
  assert.equal(report.auditOrganization, "Sikich CPA LLC");
});

test("agency APIs group reports by canonical publisher key", async () => {
  const agencies = await storage.getAgenciesWithCounts();
  const keys = agencies.map((agency) => agency.slug);

  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes("hhs-oig"));
  assert.ok(!keys.includes("sikich-cpa-llc"));

  const illinois = agencies.find(
    (agency) => agency.slug === "illinois-auditor-general",
  );
  assert.ok(illinois);
  assert.equal(illinois.name, "Illinois Office of the Auditor General");
  assert.equal(illinois.reportCount, 4);
});

test("canonical and legacy agency filters resolve to the same report", async () => {
  const [canonical, legacy] = await Promise.all([
    storage.getReports({ agency: "illinois-auditor-general" }, 1, 100),
    storage.getReports({ agency: "Sikich CPA LLC" }, 1, 100),
  ]);

  assert.ok(canonical.items.some((report) => report.id === 179));
  assert.deepEqual(
    legacy.items.map((report) => report.id),
    [179],
  );
});

test("legacy agency slugs redirect to canonical publisher keys", async () => {
  const legacy = await resolveHtmlRoute("/agencies/sikich-cpa-llc");
  assert.equal(legacy.status, 301);
  assert.equal(legacy.redirectTo, "/agencies/illinois-auditor-general");

  const canonical = await resolveHtmlRoute(
    "/agencies/illinois-auditor-general",
  );
  assert.equal(canonical.status, 200);
  assert.equal(canonical.routeType, "agency");
  assert.equal(canonical.initialRouteData?.agencyPage?.reportCount, 4);
});

test("every public report has joined canonical publisher metadata", async () => {
  const results = await storage.getReports({}, 1, 500);

  assert.equal(results.items.length, Number(results.total));
  assert.ok(results.items.length > 0);
  assert.ok(
    results.items.every(
      (report) => Boolean(report.publisherKey) && Boolean(report.publisherName),
    ),
  );
});
