import assert from "node:assert/strict";
import test from "node:test";
import { storage } from "./storage";

const representativeReports = [
  { id: 46, source: "US", subjects: ["WI"] },
  { id: 159, source: "US", subjects: ["LA"] },
  { id: 167, source: "US", subjects: ["MS"] },
] as const;

for (const expected of representativeReports) {
  test(`report ${expected.id} exposes separate source and subject jurisdictions`, async () => {
    const report = await storage.getReportById(String(expected.id));
    assert.ok(report);
    assert.equal(report.sourceJurisdiction?.code, expected.source);
    assert.deepEqual(
      report.subjectJurisdictions.map((jurisdiction) => jurisdiction.code),
      [...expected.subjects],
    );
  });

  test(`report ${expected.id} appears once in Federal and subject results`, async () => {
    const [federal, subject] = await Promise.all([
      storage.getReports({ sourceJurisdiction: "US" }, 1, 100),
      storage.getReports({ jurisdiction: expected.subjects[0] }, 1, 100),
    ]);
    assert.equal(federal.items.filter((report) => report.id === expected.id).length, 1);
    assert.equal(subject.items.filter((report) => report.id === expected.id).length, 1);
  });
}

test("reviewed multi-jurisdiction report 42 exposes the complete bounded set", async () => {
  const report = await storage.getReportById("42");
  assert.ok(report);
  assert.equal(report.sourceJurisdiction?.code, "US");
  assert.equal(report.jurisdictionScopeType, "multi_jurisdiction");
  assert.deepEqual(
    report.subjectJurisdictions.map((jurisdiction) => jurisdiction.code).sort(),
    ["CA", "FL", "GA", "IL", "IN", "KS", "MI", "MN", "NC", "NY", "OH", "TN", "TX", "WI"].sort(),
  );
});

test("hidden incomplete uploads remain absent", async () => {
  const [report117, report175] = await Promise.all([
    storage.getReportById("117"),
    storage.getReportById("175"),
  ]);
  assert.equal(report117, undefined);
  assert.equal(report175, undefined);
});

test("legacy state filters translate to documented new semantics", async () => {
  const [legacyState, subjectState, legacyFederal, federalSource] = await Promise.all([
    storage.getReports({ state: "WI" }, 1, 100),
    storage.getReports({ jurisdiction: "WI" }, 1, 100),
    storage.getReports({ state: "US" }, 1, 100),
    storage.getReports({ sourceJurisdiction: "US" }, 1, 100),
  ]);
  assert.deepEqual(
    legacyState.items.map((report) => report.id),
    subjectState.items.map((report) => report.id),
  );
  assert.deepEqual(
    legacyFederal.items.map((report) => report.id),
    federalSource.items.map((report) => report.id),
  );
});
