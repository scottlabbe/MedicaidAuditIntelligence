import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "./database";
import { resolveHtmlRoute } from "./seo";
import { storage } from "./storage";
import {
  reports,
  reportTopicAssignments,
  publicTopicDefinitions,
  publicTopics,
  topicTaxonomyRevisions,
} from "@shared/schema";

const CANONICAL_SLUGS = [
  "managed-care",
  "eligibility-enrollment",
  "capitation-payments",
  "pharmacy-benefit-managers",
  "data-quality-reporting",
  "program-oversight",
  "rebates",
];

test("returns the active topic register in taxonomy order", async () => {
  const topics = await storage.getTopicsWithCounts();

  assert.deepEqual(
    topics.map((topic) => topic.slug),
    CANONICAL_SLUGS,
  );
  topics.forEach((topic) => {
    assert.ok(topic.name);
    assert.ok(topic.shortDescription);
    assert.ok(topic.scope);
    assert.ok(topic.reportCount >= 0);
    assert.equal("query" in topic, false);
  });
});

test("topic detail exposes only active assignments and visible reports", async () => {
  for (const slug of CANONICAL_SLUGS) {
    const topic = await storage.getTopicLandingPage(slug);
    assert.ok(topic);
    assert.equal(topic.slug, slug);
    assert.equal(topic.reportCount, topic.reports.length);
    assert.ok(topic.definition);
    assert.ok(topic.whyAuditorsCare);
    assert.ok(topic.stateCount >= 0);
    assert.ok(topic.agencyCount >= 0);
    assert.equal(/reviewed/i.test(topic.definition), false);
    assert.equal(/reviewed/i.test(topic.whyAuditorsCare), false);

    const reportIds = topic.reports.map((report) => report.id);
    if (reportIds.length === 0) continue;

    const qualifyingRows = await db
      .select({ reportId: reports.id })
      .from(reportTopicAssignments)
      .innerJoin(reports, eq(reports.id, reportTopicAssignments.reportId))
      .innerJoin(
        publicTopics,
        eq(publicTopics.id, reportTopicAssignments.topicId),
      )
      .innerJoin(
        publicTopicDefinitions,
        eq(publicTopicDefinitions.topicId, publicTopics.id),
      )
      .innerJoin(
        topicTaxonomyRevisions,
        eq(
          topicTaxonomyRevisions.id,
          publicTopicDefinitions.taxonomyRevisionId,
        ),
      )
      .where(
        and(
          inArray(reports.id, reportIds),
          eq(publicTopicDefinitions.slug, slug),
          eq(topicTaxonomyRevisions.status, "active"),
          eq(reports.hidden, false),
          sql`${publicTopics.retiredAt} is null`,
          sql`${reportTopicAssignments.retiredAt} is null`,
        ),
      );

    assert.equal(new Set(qualifyingRows.map((row) => row.reportId)).size, reportIds.length);
    topic.reports.forEach((report) => {
      assert.ok(report.rationale);
      assert.ok(report.reportPath.startsWith("/reports/"));
      assert.equal("assignmentId" in report, false);
      assert.equal("modelConfidence" in report, false);
      report.evidence.forEach((evidence) => {
        assert.ok(["finding", "recommendation", "metadata"].includes(evidence.sourceType));
        assert.ok(evidence.text);
        assert.equal("textSha256" in evidence, false);
      });
    });
  }
});

test("topic report filtering uses the same reviewed assignments", async () => {
  const topic = await storage.getTopicLandingPage("managed-care");
  assert.ok(topic);

  const filtered = await storage.getReports(
    { theme: "managed-care", sortBy: "date_desc" },
    1,
    100,
  );
  assert.deepEqual(
    new Set(filtered.items.map((report) => report.id)),
    new Set(topic.reports.map((report) => report.id)),
  );

  const firstReport = filtered.items[0];
  assert.ok(firstReport);
  const combined = await storage.getReports(
    { theme: "managed-care", state: firstReport.state },
    1,
    100,
  );
  assert.ok(combined.items.length > 0);
  combined.items.forEach((report) => assert.equal(report.state, firstReport.state));
});

test("resolves aliases permanently and returns normal 404 behavior", async () => {
  const alias = await storage.resolveTopicSlug("program-integrity");
  assert.deepEqual(alias, {
    kind: "alias",
    slug: "program-integrity",
    canonicalSlug: "program-oversight",
    redirectStatus: 301,
  });

  const aliasRoute = await resolveHtmlRoute("/topics/program-integrity");
  assert.equal(aliasRoute.status, 301);
  assert.equal(aliasRoute.redirectTo, "/topics/program-oversight");

  const missingRoute = await resolveHtmlRoute("/topics/not-a-real-topic");
  assert.equal(missingRoute.status, 404);
});
