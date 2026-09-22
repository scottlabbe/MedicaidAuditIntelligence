export interface PageAudit {
  url: string;
  pageFamily: string;
  status: number | null;
  finalUrl: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  title: string | null;
  description: string | null;
  h1Text: string | null;
  h1Count: number;
  jsonLdValid: boolean;
  error: string | null;
}

export interface ReportLedgerPageAudit {
  url: string;
  status: number | null;
  finalUrl: string | null;
  page: number | null;
  pageSize: number | null;
  total: number | null;
  pageCount: number | null;
  itemIds: number[];
  error: string | null;
}

export interface ReportLedgerAudit {
  checkedAt: string;
  consistent: boolean;
  issues: string[];
  pages: ReportLedgerPageAudit[];
}

export interface SiteAudit {
  siteUrl: string;
  checkedAt: string;
  sitemapUrl: string;
  sitemapStatus: number | null;
  sitemapUrlCount: number;
  sampledUrlCount: number;
  llmsTxtStatus: number | null;
  pages: PageAudit[];
  reportLedger: ReportLedgerAudit;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseSitemapUrls(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi))
    .map((match) => decodeXml(match[1].trim()))
    .filter((value) => value.startsWith("http://") || value.startsWith("https://"));
}

function getMetaContent(html: string, name: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const nameMatch = tag.match(/\bname=["']([^"']+)["']/i);
    if (nameMatch?.[1].toLowerCase() !== name.toLowerCase()) continue;
    return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? "";
  }
  return null;
}

function getCanonical(html: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1].toLowerCase().split(/\s+/) ?? [];
    if (!rel.includes("canonical")) continue;
    return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? null;
  }
  return null;
}

function plainText(value: string): string {
  return decodeXml(value.replace(/<[^>]+>/g, " "))
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageFamily(url: string): string {
  const firstSegment = new URL(url).pathname.split("/").filter(Boolean)[0];
  return firstSegment ?? "home";
}

export function inspectHtml(url: string, status: number, finalUrl: string, html: string): PageAudit {
  const jsonLd = Array.from(
    html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ).map((match) => match[1].trim());
  const jsonLdValid = jsonLd.every((block) => {
    try {
      JSON.parse(block);
      return true;
    } catch {
      return false;
    }
  });
  const title = plainText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null;
  const description = getMetaContent(html, "description")?.trim() || null;
  const h1Matches = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi));

  return {
    url,
    pageFamily: pageFamily(finalUrl),
    status,
    finalUrl,
    canonicalUrl: getCanonical(html),
    robots: getMetaContent(html, "robots"),
    title,
    description,
    h1Text: h1Matches.length === 1 ? plainText(h1Matches[0][1]) || null : null,
    h1Count: h1Matches.length,
    jsonLdValid,
    error: null,
  };
}

function parseInitialRouteData(html: string): unknown {
  const scripts = Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi));
  for (const script of scripts) {
    const content = script[1];
    const marker = "window.__INITIAL_ROUTE_DATA__";
    const markerIndex = content.indexOf(marker);
    if (markerIndex < 0) continue;
    const assignmentIndex = content.indexOf("=", markerIndex + marker.length);
    if (assignmentIndex < 0) continue;
    return JSON.parse(content.slice(assignmentIndex + 1).trim().replace(/;\s*$/, ""));
  }
  throw new Error("missing initial route data");
}

export function inspectReportLedgerHtml(
  url: string,
  expectedPage: number,
  status: number,
  finalUrl: string,
  html: string,
): ReportLedgerPageAudit {
  try {
    const routeData = parseInitialRouteData(html) as {
      routeType?: unknown;
      reportsIndex?: {
        items?: Array<{ id?: unknown }>;
        page?: unknown;
        pageSize?: unknown;
        total?: unknown;
      };
    };
    if (routeData.routeType !== "reports_index" || !routeData.reportsIndex) {
      throw new Error("initial route data is not a reports index");
    }
    const page = Number(routeData.reportsIndex.page);
    const pageSize = Number(routeData.reportsIndex.pageSize);
    const total = Number(routeData.reportsIndex.total);
    if (
      !Number.isInteger(page)
      || !Number.isInteger(pageSize)
      || pageSize <= 0
      || !Number.isInteger(total)
      || total < 0
    ) {
      throw new Error("invalid reports pagination values");
    }
    if (page !== expectedPage) {
      throw new Error(`expected page ${expectedPage}, received page ${page}`);
    }
    const itemIds = (routeData.reportsIndex.items ?? []).map((item) => Number(item.id));
    if (itemIds.some((id) => !Number.isInteger(id) || id < 1)) {
      throw new Error("invalid report identifier");
    }
    return {
      url,
      status,
      finalUrl,
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      itemIds,
      error: null,
    };
  } catch (error) {
    return {
      url,
      status,
      finalUrl,
      page: null,
      pageSize: null,
      total: null,
      pageCount: null,
      itemIds: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchText(url: string): Promise<{ response: Response; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "MedicaidAuditIntelligence-OpportunityObservatory/1.0" },
    });
    return { response, text: await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

async function auditPage(url: string): Promise<PageAudit> {
  try {
    const { response, text } = await fetchText(url);
    return inspectHtml(url, response.status, response.url, text);
  } catch (error) {
    return {
      url,
      pageFamily: pageFamily(url),
      status: null,
      finalUrl: null,
      canonicalUrl: null,
      robots: null,
      title: null,
      description: null,
      h1Text: null,
      h1Count: 0,
      jsonLdValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function auditReportLedgerPage(
  url: string,
  expectedPage: number,
): Promise<ReportLedgerPageAudit> {
  try {
    const { response, text } = await fetchText(url);
    return inspectReportLedgerHtml(url, expectedPage, response.status, response.url, text);
  } catch (error) {
    return {
      url,
      status: null,
      finalUrl: null,
      page: null,
      pageSize: null,
      total: null,
      pageCount: null,
      itemIds: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function mapWithConcurrency<T, U>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(values.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(values[index]);
      }
    }),
  );
  return results;
}

function selectSample(urls: string[], limit: number): string[] {
  if (limit <= 0) return [];
  const byPath = new Map(urls.map((url) => [new URL(url).pathname.replace(/\/$/, "") || "/", url]));
  const selected = new Set<string>();
  const indexPaths = [
    "/",
    "/reports",
    "/reports/page/2",
    "/states",
    "/agencies",
    "/topics",
    "/research",
  ];
  for (const path of indexPaths) {
    const url = byPath.get(path);
    if (url) selected.add(url);
  }
  const detailPrefixes = ["/reports/", "/states/", "/agencies/", "/topics/", "/research/"];
  for (const prefix of detailPrefixes) {
    const match = urls.find((url) => {
      const pathname = new URL(url).pathname;
      return pathname.startsWith(prefix) && !pathname.startsWith("/reports/page/");
    });
    if (match) selected.add(match);
  }
  return Array.from(selected).slice(0, limit);
}

function assessReportLedger(pages: ReportLedgerPageAudit[]): ReportLedgerAudit {
  const issues: string[] = [];
  for (const page of pages) {
    if (page.error) issues.push(`${page.url}: ${page.error}`);
    if (page.status !== null && page.status !== 200) {
      issues.push(`${page.url}: returned HTTP ${page.status}`);
    }
  }
  const valid = pages.filter((page) => !page.error);
  if (valid.length === 2) {
    const [first, second] = valid;
    if (first.pageSize !== second.pageSize) issues.push("page sizes differ");
    if (first.total !== second.total) issues.push("report totals differ");
    if (first.pageCount !== second.pageCount) issues.push("page counts differ");
    const duplicateIds = first.itemIds.filter((id) => second.itemIds.includes(id));
    if (duplicateIds.length) issues.push(`adjacent pages repeat report IDs: ${duplicateIds.join(", ")}`);
    for (const page of valid) {
      if (new Set(page.itemIds).size !== page.itemIds.length) {
        issues.push(`${page.url}: contains duplicate report IDs`);
      }
      const offset = ((page.page ?? 1) - 1) * (page.pageSize ?? 0);
      const expected = Math.max(0, Math.min(page.pageSize ?? 0, (page.total ?? 0) - offset));
      if (page.itemIds.length !== expected) {
        issues.push(`${page.url}: expected ${expected} report IDs, received ${page.itemIds.length}`);
      }
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    consistent: issues.length === 0,
    issues,
    pages,
  };
}

export async function auditSite(siteUrl: string, limit = 15): Promise<SiteAudit> {
  const normalized = siteUrl.replace(/\/$/, "");
  const sitemapUrl = `${normalized}/sitemap.xml`;
  const { response: sitemapResponse, text: sitemap } = await fetchText(sitemapUrl);
  if (!sitemapResponse.ok) {
    throw new Error(`sitemap returned ${sitemapResponse.status}`);
  }
  const urls = parseSitemapUrls(sitemap);
  if (!urls.length) {
    throw new Error("sitemap contains no URLs");
  }
  const sampled = selectSample(urls, limit);
  const [pages, ledgerPages, llmsResponse] = await Promise.all([
    mapWithConcurrency(sampled, 5, auditPage),
    Promise.all([
      auditReportLedgerPage(`${normalized}/reports`, 1),
      auditReportLedgerPage(`${normalized}/reports/page/2`, 2),
    ]),
    fetch(`${normalized}/llms.txt`, { redirect: "follow" }).catch(() => null),
  ]);

  return {
    siteUrl: normalized,
    checkedAt: new Date().toISOString(),
    sitemapUrl,
    sitemapStatus: sitemapResponse.status,
    sitemapUrlCount: urls.length,
    sampledUrlCount: sampled.length,
    llmsTxtStatus: llmsResponse?.status ?? null,
    pages,
    reportLedger: assessReportLedger(ledgerPages),
  };
}
