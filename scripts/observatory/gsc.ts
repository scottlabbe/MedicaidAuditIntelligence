import fs from "node:fs/promises";
import path from "node:path";

export interface GscRow {
  query: string | null;
  page: string | null;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
}

export interface GscSummary {
  schemaVersion: 1;
  importedAt: string;
  inputs: Array<{
    file: string;
    modifiedAt: string;
    rows: number;
    dimension: "query" | "page" | "query_page" | "mixed";
    clicks: number;
    impressions: number;
    ctr: number | null;
  }>;
  rowCount: number;
  queries: GscRow[];
  pages: GscRow[];
  queryPages: GscRow[];
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (quoted) {
      if (character === '"' && raw[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("CSV contains an unterminated quoted field");
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value.trim().length));
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function parseMetric(value: string | undefined, label: string): number {
  const normalized = (value ?? "").replace(/,/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`invalid ${label} value ${JSON.stringify(value)}`);
  }
  return parsed;
}

function parseOptionalMetric(value: string | undefined, label: string): number | null {
  const normalized = (value ?? "").replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized.replace(/%$/, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`invalid ${label} value ${JSON.stringify(value)}`);
  }
  return normalized.endsWith("%") ? parsed / 100 : parsed;
}

export function parseGscCsv(raw: string, fileName = "GSC.csv"): GscRow[] {
  const csv = parseCsv(raw);
  if (csv.length < 2) {
    throw new Error(`${fileName} has no data rows`);
  }

  const headers = csv[0].map(normalizeHeader);
  const queryIndex = findColumn(headers, ["query", "queries", "top queries"]);
  const pageIndex = findColumn(headers, ["page", "pages", "top pages", "landing page"]);
  const clicksIndex = findColumn(headers, ["clicks"]);
  const impressionsIndex = findColumn(headers, ["impressions"]);
  const ctrIndex = findColumn(headers, ["ctr", "average ctr"]);
  const positionIndex = findColumn(headers, ["position", "average position"]);

  if (queryIndex < 0 && pageIndex < 0) {
    throw new Error(`${fileName} must contain a Query or Page column`);
  }
  if (clicksIndex < 0 || impressionsIndex < 0) {
    throw new Error(`${fileName} must contain Clicks and Impressions columns`);
  }

  return csv.slice(1).map((values, index) => {
    try {
      const query = queryIndex >= 0 ? values[queryIndex]?.trim() || null : null;
      const page = pageIndex >= 0 ? values[pageIndex]?.trim() || null : null;
      if (!query && !page) {
        throw new Error("row has neither a query nor page");
      }
      const clicks = parseMetric(values[clicksIndex], "clicks");
      const impressions = parseMetric(values[impressionsIndex], "impressions");
      const ctr = ctrIndex >= 0 ? parseOptionalMetric(values[ctrIndex], "CTR") : null;
      const position = positionIndex >= 0
        ? parseOptionalMetric(values[positionIndex], "position")
        : null;
      return { query, page, clicks, impressions, ctr, position };
    } catch (error) {
      throw new Error(`${fileName} row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

function aggregateRows(rows: GscRow[], key: (row: GscRow) => string | null): GscRow[] {
  const groups = new Map<string, { rows: GscRow[]; clicks: number; impressions: number }>();
  for (const row of rows) {
    const value = key(row);
    if (!value) continue;
    const group = groups.get(value) ?? { rows: [], clicks: 0, impressions: 0 };
    group.rows.push(row);
    group.clicks += row.clicks;
    group.impressions += row.impressions;
    groups.set(value, group);
  }

  return Array.from(groups.entries()).map(([value, group]) => {
    const positionRows = group.rows.filter((row) => row.position !== null && row.impressions > 0);
    const weightedPositionDenominator = positionRows.reduce((sum, row) => sum + row.impressions, 0);
    const position = weightedPositionDenominator
      ? positionRows.reduce((sum, row) => sum + (row.position ?? 0) * row.impressions, 0)
        / weightedPositionDenominator
      : null;
    const first = group.rows[0];
    return {
      query: first.query === value ? value : null,
      page: first.page === value ? value : null,
      clicks: group.clicks,
      impressions: group.impressions,
      ctr: group.impressions ? group.clicks / group.impressions : null,
      position,
    };
  }).sort((left, right) => right.impressions - left.impressions || right.clicks - left.clicks);
}

export async function buildGscSummary(filePaths: string[]): Promise<GscSummary> {
  if (!filePaths.length) {
    throw new Error("provide at least one --input CSV file");
  }

  const inputs: GscSummary["inputs"] = [];
  const rows: GscRow[] = [];
  for (const filePath of filePaths) {
    const [raw, stats] = await Promise.all([fs.readFile(filePath, "utf8"), fs.stat(filePath)]);
    const parsed = parseGscCsv(raw, path.basename(filePath));
    rows.push(...parsed);
    const queryOnly = parsed.every((row) => row.query && !row.page);
    const pageOnly = parsed.every((row) => row.page && !row.query);
    const queryPage = parsed.every((row) => row.query && row.page);
    const clicks = parsed.reduce((sum, row) => sum + row.clicks, 0);
    const impressions = parsed.reduce((sum, row) => sum + row.impressions, 0);
    inputs.push({
      file: path.basename(filePath),
      modifiedAt: stats.mtime.toISOString(),
      rows: parsed.length,
      dimension: queryOnly ? "query" : pageOnly ? "page" : queryPage ? "query_page" : "mixed",
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : null,
    });
  }

  return {
    schemaVersion: 1,
    importedAt: new Date().toISOString(),
    inputs,
    rowCount: rows.length,
    queries: aggregateRows(rows, (row) => row.query).slice(0, 100),
    pages: aggregateRows(rows, (row) => row.page).slice(0, 100),
    queryPages: rows
      .filter((row) => row.query && row.page)
      .sort((left, right) => right.impressions - left.impressions || right.clicks - left.clicks)
      .slice(0, 200),
  };
}
