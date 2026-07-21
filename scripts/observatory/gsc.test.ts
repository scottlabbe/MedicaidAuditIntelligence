import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGscSummary, parseCsv, parseGscCsv } from "./gsc.ts";

test("parseCsv handles quoted commas and escaped quotes", () => {
  assert.deepEqual(
    parseCsv('Query,Clicks\n"managed care, audits",4\n"a ""quoted"" query",2\n'),
    [
      ["Query", "Clicks"],
      ["managed care, audits", "4"],
      ['a "quoted" query', "2"],
    ],
  );
});

test("parseGscCsv accepts a Search Console query export", () => {
  const rows = parseGscCsv(
    "Top queries,Clicks,Impressions,CTR,Position\nmedicaid audits,12,300,4%,8.5\n",
  );
  assert.deepEqual(rows, [{
    query: "medicaid audits",
    page: null,
    clicks: 12,
    impressions: 300,
    ctr: 0.04,
    position: 8.5,
  }]);
});

test("parseGscCsv rejects exports without a dimension", () => {
  assert.throws(
    () => parseGscCsv("Clicks,Impressions\n1,2\n"),
    /Query or Page column/,
  );
});

test("buildGscSummary keeps query and page export totals separate", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "observatory-gsc-"));
  const queries = path.join(directory, "Queries.csv");
  const pages = path.join(directory, "Pages.csv");
  await Promise.all([
    fs.writeFile(queries, "Top queries,Clicks,Impressions\nmedicaid audits,10,100\n", "utf8"),
    fs.writeFile(pages, "Top pages,Clicks,Impressions\nhttps://example.gov/,10,100\n", "utf8"),
  ]);
  const summary = await buildGscSummary([queries, pages]);
  assert.deepEqual(summary.inputs.map((input) => ({
    dimension: input.dimension,
    clicks: input.clicks,
    impressions: input.impressions,
  })), [
    { dimension: "query", clicks: 10, impressions: 100 },
    { dimension: "page", clicks: 10, impressions: 100 },
  ]);
  assert.equal("totals" in summary, false);
});
