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
  titlePresent: boolean;
  descriptionPresent: boolean;
  h1Count: number;
  wordCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  jsonLdBlocks: number;
  jsonLdValid: boolean;
  error: string | null;
}

export interface SiteAudit {
  siteUrl: string;
  checkedAt: string;
  sitemapUrl: string;
  sitemapStatus: number | null;
  sitemapUrlCount: number;
  sampledUrlCount: number;
  sitemapCountsByFamily: Array<{ family: string; count: number }>;
  sampledCountsByFamily: Array<{ family: string; count: number }>;
  llmsTxtStatus: number | null;
  failures: PageAudit[];
  pages: PageAudit[];
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

function countByFamily(urls: string[]): Array<{ family: string; count: number }> {
  const counts = new Map<string, number>();
  for (const url of urls) {
    const family = pageFamily(url);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return Array.from(counts, ([family, count]) => ({ family, count }))
    .sort((left, right) => right.count - left.count || left.family.localeCompare(right.family));
}

function linkCounts(html: string, pageUrl: string): { internalLinkCount: number; externalLinkCount: number } {
  const pageOrigin = new URL(pageUrl).origin;
  let internalLinkCount = 0;
  let externalLinkCount = 0;
  for (const match of Array.from(html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi))) {
    try {
      const target = new URL(match[1], pageUrl);
      if (!['http:', 'https:'].includes(target.protocol)) continue;
      if (target.origin === pageOrigin) internalLinkCount += 1;
      else externalLinkCount += 1;
    } catch {
      // Ignore malformed and non-navigational href values in this diagnostic count.
    }
  }
  return { internalLinkCount, externalLinkCount };
}

export function inspectHtml(url: string, status: number, finalUrl: string, html: string): PageAudit {
  const jsonLd = Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1].trim());
  let jsonLdValid = true;
  for (const block of jsonLd) {
    try {
      JSON.parse(block);
    } catch {
      jsonLdValid = false;
    }
  }
  const title = plainText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null;
  const description = getMetaContent(html, "description")?.trim() || null;
  const h1Matches = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi));
  const h1Text = h1Matches.length === 1 ? plainText(h1Matches[0][1]) || null : null;
  const contentText = plainText(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " "),
  );
  const links = linkCounts(html, finalUrl);

  return {
    url,
    pageFamily: pageFamily(finalUrl),
    status,
    finalUrl,
    canonicalUrl: getCanonical(html),
    robots: getMetaContent(html, "robots"),
    title,
    description,
    h1Text,
    titlePresent: Boolean(title),
    descriptionPresent: Boolean(description),
    h1Count: h1Matches.length,
    wordCount: contentText ? contentText.split(/\s+/).length : 0,
    ...links,
    jsonLdBlocks: jsonLd.length,
    jsonLdValid,
    error: null,
  };
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
      titlePresent: false,
      descriptionPresent: false,
      h1Count: 0,
      wordCount: 0,
      internalLinkCount: 0,
      externalLinkCount: 0,
      jsonLdBlocks: 0,
      jsonLdValid: false,
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
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  }));
  return results;
}

function selectSample(urls: string[], limit: number): string[] {
  if (limit <= 0 || urls.length <= limit) return urls;
  const selected = new Set<string>();
  const routePrefixes = ["/reports/", "/states/", "/agencies/", "/topics/", "/research/"];
  selected.add(urls[0]);
  for (const prefix of routePrefixes) {
    const match = urls.find((url) => new URL(url).pathname.startsWith(prefix));
    if (match) selected.add(match);
  }
  const step = Math.max(1, Math.floor(urls.length / limit));
  for (let index = 0; index < urls.length && selected.size < limit; index += step) {
    selected.add(urls[index]);
  }
  for (const url of urls) {
    if (selected.size >= limit) break;
    selected.add(url);
  }
  return Array.from(selected);
}

export async function auditSite(siteUrl: string, limit = 30): Promise<SiteAudit> {
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
  const [pages, llmsResponse] = await Promise.all([
    mapWithConcurrency(sampled, 5, auditPage),
    fetch(`${normalized}/llms.txt`, { redirect: "follow" }).catch(() => null),
  ]);
  const failures = pages.filter((page) =>
    page.error
    || page.status !== 200
    || !page.titlePresent
    || !page.descriptionPresent
    || page.h1Count !== 1
    || !page.canonicalUrl
    || !page.jsonLdValid
  );

  return {
    siteUrl: normalized,
    checkedAt: new Date().toISOString(),
    sitemapUrl,
    sitemapStatus: sitemapResponse.status,
    sitemapUrlCount: urls.length,
    sampledUrlCount: sampled.length,
    sitemapCountsByFamily: countByFamily(urls),
    sampledCountsByFamily: countByFamily(sampled),
    llmsTxtStatus: llmsResponse?.status ?? null,
    failures,
    pages,
  };
}
