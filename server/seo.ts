import { storage } from "./storage";
import {
  getStateEntryByCode,
  getStateEntryBySlug,
} from "@shared/states";
import {
  getResearchReportBySlug,
  listResearchReports,
  listResearchReportSlugs,
  ResearchReportNotFoundError,
  ResearchReportValidationError,
} from "./researchReports";
import { resolveAgencySlugAlias } from "./agencyAliases";
import type { SearchFilters } from "../client/src/lib/types";

const SITE_URL =
  process.env.SITE_URL || "https://www.medicaidintelligence.com";
const SITE_NAME = "Medicaid Audit Intelligence";

export interface SeoMeta {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogType: string;
  jsonLd: object[];
  robots: string;
}

export interface ResolvedHtmlRoute {
  routeType:
    | "home"
    | "explore"
    | "reports_index"
    | "states_index"
    | "agencies_index"
    | "agency"
    | "topics_index"
    | "topic"
    | "dashboard"
    | "about"
    | "report"
    | "research_index"
    | "research"
    | "state"
    | "not_found"
    | "redirect";
  status: number;
  redirectTo?: string;
  seoMeta?: SeoMeta;
  snapshotHtml: string;
  initialRouteData?: Record<string, unknown>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.5 ? truncated.substring(0, lastSpace) : truncated) + "...";
}

function buildDateString(
  year: number,
  month?: number,
  day?: number,
): string {
  if (month && day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (month) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  return `${year}`;
}

function formatHumanDate(
  year?: number,
  month?: number,
  day?: number,
): string | undefined {
  if (!year) return undefined;

  if (month && day) {
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (month) {
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  }

  return String(year);
}

function formatIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Search and analyze Medicaid audit reports across states with structured findings, recommendations, and trends.",
  };
}

function getBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function renderPageShell(content: string): string {
  return `
    <section class="mx-auto max-w-5xl px-6 py-12">
      ${content}
    </section>
  `;
}

function renderLinkList(items: Array<{ href: string; label: string; meta?: string }>): string {
  if (!items.length) return "<p>No items available.</p>";

  return `
    <ul>
      ${items
        .map(
          (item) => `
            <li>
              <a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>${item.meta ? ` <span>${escapeHtml(item.meta)}</span>` : ""}
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function getNotFoundRoute(): ResolvedHtmlRoute {
  return {
    routeType: "not_found",
    status: 404,
    seoMeta: {
      title: `Page Not Found | ${SITE_NAME}`,
      description:
        "The requested page could not be found on Medicaid Audit Intelligence.",
      ogType: "website",
      jsonLd: [getOrganizationJsonLd()],
      robots: "noindex, follow",
    },
    snapshotHtml: renderPageShell(`
      <header>
        <h1>Page not found</h1>
        <p>The URL you requested does not exist or is no longer available.</p>
      </header>
      <p><a href="/">Return to the homepage</a> or <a href="/explore">browse reports</a>.</p>
    `),
  };
}

async function getHomeRoute(): Promise<ResolvedHtmlRoute> {
  let totalReports = 100;
  let statesWithReports = 40;
  let latestReports: any[] = [];
  let states: any[] = [];
  let topics: any[] = [];
  let researchReports: any[] = [];

  try {
    const [stats, latest, stateSummaries, topicSummaries, researchSummaries] =
      await Promise.all([
        storage.getDashboardStats(),
        storage.getReports({ sortBy: "date_desc" }, 1, 4),
        storage.getIndexableStates(8),
        storage.getTopicsWithCounts(),
        listResearchReports(),
      ]);
    totalReports = stats.totalReports;
    statesWithReports = stats.statesWithReports;
    latestReports = latest.items;
    states = stateSummaries;
    topics = topicSummaries;
    researchReports = researchSummaries;
  } catch {
    // Keep defaults if the database is unavailable.
  }

  return {
    routeType: "home",
    status: 200,
    seoMeta: {
      title: `${SITE_NAME} - Find Medicaid Audit Evidence`,
      description: `Find and verify evidence from ${totalReports}+ Medicaid audit reports across ${statesWithReports} states, with direct links to original public sources.`,
      canonicalUrl: SITE_URL,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [
        getOrganizationJsonLd(),
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description:
            "Search and analyze Medicaid audit reports across states with structured findings, recommendations, and trends.",
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/explore?query={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ],
    },
    snapshotHtml: renderPageShell(`
      <header>
        <h1>Find Medicaid audit findings</h1>
        <p>${escapeHtml(
          `Search ${totalReports}+ audit reports across ${statesWithReports} states by topic, state, publishing agency, report title, or finding language.`,
        )}</p>
      </header>
      <section>
        <h2>Latest evidence</h2>
        ${renderLinkList(
          latestReports.map((report: any) => ({
            href: `/reports/${report.id}`,
            label: report.reportTitle,
            meta: `${report.state} • ${report.auditOrganization} • ${report.publicationYear}`,
          })),
        )}
      </section>
      <section>
        <h2>Research briefs</h2>
        ${renderLinkList(
          researchReports.map((report: any) => ({
            href: `/research/${report.slug}`,
            label: report.title,
            meta: report.category,
          })),
        )}
      </section>
      <section>
        <h2>Browse state audit coverage</h2>
        ${renderLinkList(
          states.map((state: any) => ({
            href: `/states/${state.slug}`,
            label: `${state.name} Medicaid audit reports`,
            meta: `${state.reportCount} reports`,
          })),
        )}
      </section>
      <p><a href="/states">Browse by state</a>, <a href="/agencies">agency</a>, <a href="/topics">topic</a>, or <a href="/research">research</a>.</p>
    `),
    initialRouteData: {
      routeType: "home",
      home: {
        stats: {
          totalReports,
          statesWithReports,
          criticalFindings: 0,
          recentReports: latestReports,
        },
        latestReports,
        states,
        topics,
        researchReports,
      },
    },
  };
}

async function getExploreRoute(url: URL): Promise<ResolvedHtmlRoute> {
  const params = url.searchParams;
  const stateCode = params.get("state");
  const query = params.get("query");
  const year = params.get("year");
  const stateEntry = getStateEntryByCode(stateCode);
  const paramKeys = Array.from(params.keys());
  const onlyStateFilter = Boolean(stateEntry) && paramKeys.length === 1 && paramKeys[0] === "state";

  if (onlyStateFilter && stateEntry) {
    return {
      routeType: "redirect",
      status: 301,
      redirectTo: `/states/${stateEntry.slug}`,
      snapshotHtml: "",
    };
  }

  const hasFilters = paramKeys.length > 0;

  let title = `Explore Medicaid Audit Reports | ${SITE_NAME}`;
  let description =
    "Search and filter Medicaid audit reports by state, agency, year, and topic. Browse findings, recommendations, and financial impacts.";

  if (stateEntry) {
    title = `Medicaid Audit Reports in ${stateEntry.name} | ${SITE_NAME}`;
    description = `Browse Medicaid audit reports for ${stateEntry.name}. Find audit findings, recommendations, and oversight insights.`;
  } else if (query) {
    title = `"${truncate(query, 40)}" - Medicaid Audit Search | ${SITE_NAME}`;
    description = `Search results for "${truncate(query, 80)}" in Medicaid audit reports. Find related findings, recommendations, and analysis.`;
  }

  if (year) {
    title = title.replace(` | ${SITE_NAME}`, ` (${year}) | ${SITE_NAME}`);
  }

  let states: any[] = [];
  let featuredReports: any[] = [];

  try {
    const [stateSummaries, featured] = await Promise.all([
      storage.getIndexableStates(12),
      storage.getFeaturedReports(6),
    ]);
    states = stateSummaries;
    featuredReports = featured;
  } catch {
    // Serve page without the optional snapshot data.
  }

  return {
    routeType: "explore",
    status: 200,
    seoMeta: {
      title,
      description,
      canonicalUrl: `${SITE_URL}/explore`,
      ogType: "website",
      robots: hasFilters ? "noindex, follow" : "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Explore Medicaid Audit Reports",
          url: `${SITE_URL}/explore`,
          description,
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
      ],
    },
    snapshotHtml: renderPageShell(`
      <header>
        <h1>Explore Medicaid audit reports</h1>
        <p>${escapeHtml(
          hasFilters
            ? "Filtered search views help users refine results, but the main explore page remains the canonical entry point for search engines."
            : "Browse Medicaid audit reports by state, agency, publication date, and topic. Use the explore page to compare audit findings and move into full report detail pages.",
        )}</p>
      </header>
      <section>
        <h2>State landing pages</h2>
        ${renderLinkList(
          states.map((state: any) => ({
            href: `/states/${state.slug}`,
            label: `${state.name} Medicaid audits`,
            meta: `${state.reportCount} reports`,
          })),
        )}
      </section>
      <section>
        <h2>Recent featured reports</h2>
        ${renderLinkList(
          featuredReports.map((report: any) => ({
            href: `/reports/${report.id}`,
            label: report.reportTitle,
            meta: `${report.state} • ${report.publicationYear}`,
          })),
        )}
      </section>
    `),
    initialRouteData: {
      routeType: "explore",
      explore: {
        states,
        featuredReports,
      },
    },
  };
}

function getReportFilters(url: URL): SearchFilters {
  const filters: SearchFilters = {};
  const year = Number(url.searchParams.get("year"));
  const sourceStatus = url.searchParams.get("sourceStatus");
  const sortBy = url.searchParams.get("sortBy");

  if (url.searchParams.get("query")) {
    filters.query = url.searchParams.get("query") || undefined;
  }
  if (url.searchParams.get("state")) {
    filters.state = url.searchParams.get("state") || undefined;
  }
  if (url.searchParams.get("agency")) {
    filters.agency = url.searchParams.get("agency") || undefined;
  }
  if (Number.isInteger(year) && year > 0) filters.year = year;
  if (url.searchParams.get("theme")) {
    filters.theme = url.searchParams.get("theme") || undefined;
  }
  if (sourceStatus === "available" || sourceStatus === "record") {
    filters.sourceStatus = sourceStatus;
  }
  if (
    sortBy === "date_desc" ||
    sortBy === "date_asc" ||
    sortBy === "title" ||
    sortBy === "state"
  ) {
    filters.sortBy = sortBy;
  }

  return filters;
}

async function getReportsIndexRoute(
  page: number,
  url: URL,
): Promise<ResolvedHtmlRoute> {
  const safePage = Math.max(1, page);
  const filters = getReportFilters(url);
  const reportResults = await storage.getReports(filters, safePage, 24);
  const canonicalUrl =
    safePage === 1 ? `${SITE_URL}/reports` : `${SITE_URL}/reports/page/${safePage}`;
  const title =
    safePage === 1
      ? `Medicaid Audit Reports | ${SITE_NAME}`
      : `Medicaid Audit Reports - Page ${safePage} | ${SITE_NAME}`;
  const description =
    "Browse the full Medicaid Audit Intelligence report library with links to report summaries, findings, recommendations, and original source documents.";

  return {
    routeType: "reports_index",
    status: 200,
    seoMeta: {
      title,
      description,
      canonicalUrl,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Medicaid Audit Reports",
          url: canonicalUrl,
          description,
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
      ],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <header>
          <h1>Medicaid audit reports</h1>
          <p>${escapeHtml(description)}</p>
        </header>
        ${renderLinkList(
          reportResults.items.map((report) => ({
            href: `/reports/${report.id}`,
            label: report.reportTitle,
            meta: `${report.state} • ${report.auditOrganization} • ${report.publicationYear}`,
          })),
        )}
      </section>
    `),
    initialRouteData: {
      routeType: "reports_index",
      reportsIndex: reportResults,
    },
  };
}

async function getStatesIndexRoute(): Promise<ResolvedHtmlRoute> {
  const states = await storage.getIndexableStates(60);
  const description =
    "Browse Medicaid audit report coverage by state, including state-level findings, recommendations, and original source documents.";

  return {
    routeType: "states_index",
    status: 200,
    seoMeta: {
      title: `State Medicaid Audit Report Pages | ${SITE_NAME}`,
      description,
      canonicalUrl: `${SITE_URL}/states`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "State Medicaid Audit Report Pages",
          url: `${SITE_URL}/states`,
          description,
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
      ],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <header>
          <h1>State Medicaid audit report pages</h1>
          <p>${escapeHtml(description)}</p>
        </header>
        ${renderLinkList(
          states.map((state) => ({
            href: `/states/${state.slug}`,
            label: `${state.name} Medicaid audit reports`,
            meta: `${state.reportCount} reports`,
          })),
        )}
      </section>
    `),
    initialRouteData: {
      routeType: "states_index",
      statesIndex: states,
    },
  };
}

async function getAgenciesIndexRoute(): Promise<ResolvedHtmlRoute> {
  const agencies = await storage.getAgenciesWithCounts(200);
  const description =
    "Browse Medicaid audit reports by publishing oversight agency, auditor, inspector general, or legislative audit office.";

  return {
    routeType: "agencies_index",
    status: 200,
    seoMeta: {
      title: `Medicaid Audit Agencies | ${SITE_NAME}`,
      description,
      canonicalUrl: `${SITE_URL}/agencies`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [getOrganizationJsonLd()],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <h1>Medicaid audit agencies</h1>
        <p>${escapeHtml(description)}</p>
        ${renderLinkList(
          agencies.map((agency) => ({
            href: `/agencies/${agency.slug}`,
            label: agency.name,
            meta: `${agency.reportCount} reports`,
          })),
        )}
      </section>
    `),
    initialRouteData: {
      routeType: "agencies_index",
      agenciesIndex: agencies,
    },
  };
}

async function getAgencyRoute(slug: string): Promise<ResolvedHtmlRoute> {
  const aliasTarget = resolveAgencySlugAlias(slug);
  if (aliasTarget) {
    return {
      routeType: "redirect",
      status: 301,
      redirectTo: `/agencies/${aliasTarget}`,
      snapshotHtml: "",
    };
  }

  const agency = await storage.getAgencyLandingPage(slug, 24);
  if (!agency) {
    return getNotFoundRoute();
  }

  const description = `Browse ${agency.reportCount} Medicaid audit reports from ${agency.name}.`;

  return {
    routeType: "agency",
    status: 200,
    seoMeta: {
      title: `${agency.name} Medicaid Audit Reports | ${SITE_NAME}`,
      description,
      canonicalUrl: `${SITE_URL}/agencies/${agency.slug}`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [getOrganizationJsonLd()],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <h1>${escapeHtml(agency.name)} Medicaid audit reports</h1>
        <p>${escapeHtml(description)}</p>
        ${renderLinkList(
          agency.reports.map((report) => ({
            href: `/reports/${report.id}`,
            label: report.reportTitle,
            meta: `${report.state} • ${report.publicationYear}`,
          })),
        )}
      </section>
    `),
    initialRouteData: {
      routeType: "agency",
      agencyPage: agency,
    },
  };
}

async function getTopicsIndexRoute(): Promise<ResolvedHtmlRoute> {
  const topics = await storage.getTopicsWithCounts();
  const description =
    "Browse Medicaid audit topic guides with definitions, findings, recommendations, and related reports.";

  return {
    routeType: "topics_index",
    status: 200,
    seoMeta: {
      title: `Medicaid Audit Topics | ${SITE_NAME}`,
      description,
      canonicalUrl: `${SITE_URL}/topics`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [getOrganizationJsonLd()],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <h1>Medicaid audit topics</h1>
        <p>${escapeHtml(description)}</p>
        ${renderLinkList(
          topics.map((topic) => ({
            href: `/topics/${topic.slug}`,
            label: topic.name,
            meta: `${topic.reportCount} ${topic.reportCount === 1 ? "report" : "reports"}`,
          })),
        )}
      </section>
    `),
    initialRouteData: {
      routeType: "topics_index",
      topicsIndex: topics,
    },
  };
}

async function getTopicRoute(slug: string): Promise<ResolvedHtmlRoute> {
  const resolution = await storage.resolveTopicSlug(slug);
  if (resolution.kind === "alias") {
    return {
      routeType: "redirect",
      status: resolution.redirectStatus,
      redirectTo: `/topics/${resolution.canonicalSlug}`,
      snapshotHtml: "",
    };
  }
  if (resolution.kind === "not_found") {
    return getNotFoundRoute();
  }

  const topic = await storage.getTopicLandingPage(resolution.slug, 100);
  if (!topic) {
    return getNotFoundRoute();
  }
  const findings = topic.reports
    .flatMap((report) =>
      report.evidence
        .filter((evidence) => evidence.sourceType === "finding")
        .map((evidence) => ({ evidence, report })),
    )
    .slice(0, 3);
  const recommendations = topic.reports
    .flatMap((report) =>
      report.evidence
        .filter((evidence) => evidence.sourceType === "recommendation")
        .map((evidence) => ({ evidence, report })),
    )
    .slice(0, 3);

  return {
    routeType: "topic",
    status: 200,
    seoMeta: {
      title: `${topic.name} Medicaid Audit Guide | ${SITE_NAME}`,
      description: topic.definition,
      canonicalUrl: `${SITE_URL}/topics/${topic.slug}`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [getOrganizationJsonLd()],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <h1>${escapeHtml(topic.name)} Medicaid audit guide</h1>
        <h2>Definition</h2>
        <p>${escapeHtml(topic.definition)}</p>
        <h2>Why auditors care</h2>
        <p>${escapeHtml(topic.whyAuditorsCare)}</p>
        <h2>Supporting findings</h2>
        <ul>
          ${findings.map(({ evidence, report }) => `
            <li>
              <blockquote>${escapeHtml(evidence.text)}</blockquote>
              <a href="${report.reportPath}">${escapeHtml(report.reportTitle)}</a>
            </li>
          `).join("")}
        </ul>
        <h2>Recommendations</h2>
        <ul>
          ${recommendations.map(({ evidence, report }) => `
            <li>
              <blockquote>${escapeHtml(evidence.text)}</blockquote>
              <a href="${report.reportPath}">${escapeHtml(report.reportTitle)}</a>
            </li>
          `).join("")}
        </ul>
        <h2>Related reports</h2>
        ${renderLinkList(
          topic.reports.map((report) => ({
            href: report.reportPath,
            label: report.reportTitle,
            meta: `${report.jurisdiction} • ${report.agency} • ${report.publicationYear}`,
          })),
        )}
      </section>
    `),
    initialRouteData: {
      routeType: "topic",
      topicPage: topic,
    },
  };
}

async function getDashboardRoute(): Promise<ResolvedHtmlRoute> {
  let stats: { totalReports: number; statesWithReports: number } | undefined;
  let states: any[] = [];
  let mapData: any;

  try {
    [stats, states, mapData] = await Promise.all([
      storage.getDashboardStats(),
      storage.getIndexableStates(10),
      storage.getLatestReportsByState(3, "state"),
    ]);
  } catch {
    stats = undefined;
  }

  return {
    routeType: "dashboard",
    status: 200,
    seoMeta: {
      title: `Medicaid Audit Dashboard - Statistics & Coverage Map | ${SITE_NAME}`,
      description:
        "Interactive dashboard with Medicaid audit statistics, state coverage map, and trend analysis. Explore audit findings and program insights across all 50 states.",
      canonicalUrl: `${SITE_URL}/dashboard`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [getOrganizationJsonLd()],
    },
    snapshotHtml: renderPageShell(`
      <header>
        <h1>Medicaid audit dashboard</h1>
        <p>${escapeHtml(
          stats
            ? `Review ${stats.totalReports} audit reports across ${stats.statesWithReports} states, monitor critical findings, and navigate into state and report-level detail pages.`
            : "Review Medicaid audit coverage, state-level findings, and report volume trends across the dataset.",
        )}</p>
      </header>
      <section>
        <h2>State coverage</h2>
        ${renderLinkList(
          states.map((state: any) => ({
            href: `/states/${state.slug}`,
            label: `${state.name} coverage`,
            meta: `${state.reportCount} reports`,
          })),
        )}
      </section>
      <p><a href="/explore">Explore reports</a> or return to the <a href="/">homepage</a>.</p>
    `),
    initialRouteData:
      stats && mapData
        ? {
            routeType: "dashboard",
            dashboardStats: stats,
            dashboardMapData: mapData,
          }
        : undefined,
  };
}

function getAboutRoute(): ResolvedHtmlRoute {
  return {
    routeType: "about",
    status: 200,
    seoMeta: {
      title: `About ${SITE_NAME}`,
      description:
        "Learn how Medicaid Audit Intelligence transforms government audit reports into searchable, structured data using AI-powered extraction and analysis.",
      canonicalUrl: `${SITE_URL}/about`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [getOrganizationJsonLd()],
    },
    snapshotHtml: renderPageShell(`
      <header>
        <h1>About Medicaid Audit Intelligence</h1>
        <p>Medicaid Audit Intelligence centralizes Medicaid-related audit reports and turns source PDFs into searchable, structured records for analysis and review.</p>
      </header>
      <section>
        <h2>How the site works</h2>
        <p>Audit reports are collected from public oversight sources, normalized into a common schema, and published with links back to the original documents.</p>
      </section>
      <p><a href="/explore">Explore the report library</a>.</p>
    `),
  };
}

async function getReportRoute(id: string): Promise<ResolvedHtmlRoute> {
  const report = await storage.getReportById(id);
  if (!report) {
    return getNotFoundRoute();
  }

  const stateEntry = getStateEntryByCode(report.state);
  const description = truncate(
    report.overallConclusion ||
      report.llmInsight ||
      report.potentialObjectiveSummary ||
      "View detailed Medicaid audit report with findings, recommendations, and analysis.",
    155,
  );
  const dateStr = buildDateString(
    report.publicationYear,
    report.publicationMonth,
    report.publicationDay,
  );
  const findingsPreview = report.findings.slice(0, 3);
  const publishedLabel =
    formatHumanDate(
      report.publicationYear,
      report.publicationMonth,
      report.publicationDay,
    ) || String(report.publicationYear);

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Explore", url: `${SITE_URL}/explore` },
    ...(stateEntry
      ? [{ name: stateEntry.name, url: `${SITE_URL}/states/${stateEntry.slug}` }]
      : []),
    { name: report.reportTitle, url: `${SITE_URL}/reports/${report.id}` },
  ];

  return {
    routeType: "report",
    status: 200,
    seoMeta: {
      title: `${report.reportTitle} | ${SITE_NAME}`,
      description,
      canonicalUrl: `${SITE_URL}/reports/${report.id}`,
      ogType: "article",
      robots: "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Report",
          name: report.reportTitle,
          author: {
            "@type": "Organization",
            name: report.auditOrganization,
          },
          datePublished: dateStr,
          description,
          about: {
            "@type": "GovernmentService",
            name: "Medicaid",
          },
          spatialCoverage: {
            "@type": "Place",
            name: stateEntry?.name || report.state,
          },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
        getBreadcrumbJsonLd(breadcrumbItems),
      ],
    },
    snapshotHtml: renderPageShell(`
      <article>
        <header>
          <p>${escapeHtml(report.auditOrganization)} • ${escapeHtml(publishedLabel)}${stateEntry ? ` • <a href="/states/${stateEntry.slug}">${escapeHtml(stateEntry.name)}</a>` : ""}</p>
          <h1>${escapeHtml(report.reportTitle)}</h1>
          <p>${escapeHtml(description)}</p>
        </header>
        ${report.overallConclusion ? `<section><h2>Overall conclusion</h2><p>${escapeHtml(report.overallConclusion)}</p></section>` : ""}
        ${findingsPreview.length ? `
          <section>
            <h2>Key findings</h2>
            <ol>
              ${findingsPreview
                .map(
                  (finding) => `
                    <li>${escapeHtml(truncate(finding.findingText, 420))}</li>
                  `,
                )
                .join("")}
            </ol>
          </section>
        ` : ""}
        ${report.originalReportSourceUrl ? `<p><a href="${escapeHtml(report.originalReportSourceUrl)}">View the original audit report PDF</a></p>` : ""}
        <p><a href="/explore">Browse more reports</a>${stateEntry ? ` or <a href="/states/${stateEntry.slug}">see all ${escapeHtml(stateEntry.name)} reports</a>` : ""}.</p>
      </article>
    `),
    initialRouteData: {
      routeType: "report",
      report,
    },
  };
}

async function getResearchRoute(slug: string): Promise<ResolvedHtmlRoute> {
  try {
    const report = await getResearchReportBySlug(slug);

    return {
      routeType: "research",
      status: 200,
      seoMeta: {
        title: `${report.title} | ${SITE_NAME}`,
        description: report.description,
        canonicalUrl: `${SITE_URL}/research/${report.slug}`,
        ogType: "article",
        robots: "index, follow",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: report.title,
            description: report.description,
            dateModified: report.updatedAt,
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
            },
          },
          getBreadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: "Research", url: `${SITE_URL}/research` },
            { name: report.title, url: `${SITE_URL}/research/${report.slug}` },
          ]),
        ],
      },
      snapshotHtml: renderPageShell(`
        <article>
          <header>
            <p>${escapeHtml(report.category)}</p>
            <h1>${escapeHtml(report.title)}</h1>
            <p>${escapeHtml(report.description)}</p>
          </header>
          ${report.introHtml ? `<section>${report.introHtml}</section>` : ""}
          ${renderResearchSections(report.sections)}
          <p><a href="/research">Browse all research reports</a> or <a href="/explore">explore the audit report library</a>.</p>
        </article>
      `),
      initialRouteData: {
        routeType: "research",
        researchReport: report,
      },
    };
  } catch (error) {
    if (error instanceof ResearchReportNotFoundError) {
      return getNotFoundRoute();
    }

    if (error instanceof ResearchReportValidationError) {
      if (process.env.NODE_ENV === "development") {
        return {
          routeType: "research",
          status: 500,
          seoMeta: {
            title: "Research report validation error",
            description: error.message,
            canonicalUrl: `${SITE_URL}/research/${slug}`,
            ogType: "article",
            robots: "noindex, nofollow",
            jsonLd: [],
          },
          snapshotHtml: renderPageShell(`
            <article>
              <h1>Research report validation error</h1>
              <p>${escapeHtml(error.message)}</p>
            </article>
          `),
        };
      }

      return getNotFoundRoute();
    }

    throw error;
  }
}

async function getResearchIndexRoute(): Promise<ResolvedHtmlRoute> {
  const reports = await listResearchReports();
  const description =
    reports.length > 0
      ? `Browse ${reports.length} research reports with linked Medicaid audit citations and topic-level analysis.`
      : "Browse research reports with linked Medicaid audit citations and topic-level analysis.";

  return {
    routeType: "research_index",
    status: 200,
    seoMeta: {
      title: `Research Reports | ${SITE_NAME}`,
      description,
      canonicalUrl: `${SITE_URL}/research`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Research Reports",
          url: `${SITE_URL}/research`,
          description,
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
        getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Research", url: `${SITE_URL}/research` },
        ]),
      ],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <header>
          <h1>Research reports</h1>
          <p>${escapeHtml(description)}</p>
        </header>
        ${reports.length ? renderLinkList(
          reports.map((report) => ({
            href: `/research/${report.slug}`,
            label: report.title,
            meta: `${report.category}${report.updatedDate ? ` • Updated ${escapeHtml(formatIsoDate(report.updatedDate) || "")}` : ""}`,
          })),
        ) : "<p>No research reports are available yet.</p>"}
      </section>
    `),
    initialRouteData: {
      routeType: "research_index",
      researchReports: reports,
    },
  };
}

async function getStateRoute(slug: string): Promise<ResolvedHtmlRoute> {
  const stateEntry = getStateEntryBySlug(slug);
  if (!stateEntry) {
    return getNotFoundRoute();
  }

  const statePage = await storage.getStateLandingPage(stateEntry.code, 12);
  if (!statePage) {
    return getNotFoundRoute();
  }

  const latestReport = statePage.latestReport;
  const latestDate = latestReport
    ? formatHumanDate(
        latestReport.publicationYear,
        latestReport.publicationMonth,
        latestReport.publicationDay,
      )
    : undefined;
  const description = latestDate
    ? `Browse ${statePage.reportCount} Medicaid audit reports for ${statePage.name}. Review findings, recommendations, and the latest oversight activity published through ${latestDate}.`
    : `Browse ${statePage.reportCount} Medicaid audit reports for ${statePage.name}. Review findings, recommendations, and oversight activity from public audit sources.`;

  return {
    routeType: "state",
    status: 200,
    seoMeta: {
      title: `Medicaid Audit Reports in ${statePage.name} | ${SITE_NAME}`,
      description,
      canonicalUrl: `${SITE_URL}/states/${statePage.slug}`,
      ogType: "website",
      robots: "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Medicaid Audit Reports in ${statePage.name}`,
          url: `${SITE_URL}/states/${statePage.slug}`,
          description,
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
        getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Explore", url: `${SITE_URL}/explore` },
          {
            name: `${statePage.name} Medicaid Audit Reports`,
            url: `${SITE_URL}/states/${statePage.slug}`,
          },
        ]),
      ],
    },
    snapshotHtml: renderPageShell(`
      <section>
        <header>
          <h1>${escapeHtml(statePage.name)} Medicaid audit reports</h1>
          <p>${escapeHtml(description)}</p>
        </header>
        <p>${escapeHtml(
          latestDate
            ? `Latest report published ${latestDate}.`
            : "This page groups recent Medicaid audit reports for the state.",
        )}</p>
        <section>
          <h2>Recent reports</h2>
          ${renderLinkList(
            statePage.reports.map((report) => ({
              href: `/reports/${report.id}`,
              label: report.reportTitle,
              meta: `${report.auditOrganization} • ${formatHumanDate(
                report.publicationYear,
                report.publicationMonth,
                report.publicationDay,
              ) || report.publicationYear}`,
            })),
          )}
        </section>
        <p><a href="/explore">Explore all reports</a> or <a href="/dashboard">view the dashboard</a>.</p>
      </section>
    `),
    initialRouteData: {
      routeType: "state",
      stateCode: statePage.code,
      stateSearchResults: {
        items: statePage.reports,
        total: statePage.reportCount,
        page: 1,
        pageSize: statePage.reports.length,
        filters: {
          state: statePage.code,
          sortBy: "date_desc",
        },
      },
    },
  };
}

export async function resolveHtmlRoute(urlPath: string): Promise<ResolvedHtmlRoute> {
  const url = new URL(urlPath, SITE_URL);
  const pathname = url.pathname;

  if (pathname === "/") {
    return getHomeRoute();
  }

  if (pathname === "/explore") {
    return getExploreRoute(url);
  }

  if (pathname === "/reports") {
    return getReportsIndexRoute(1, url);
  }

  const reportPageMatch = pathname.match(/^\/reports\/page\/(\d+)$/);
  if (reportPageMatch) {
    const page = Number(reportPageMatch[1]);
    if (page === 1) {
      return {
        routeType: "redirect",
        status: 301,
        redirectTo: "/reports",
        snapshotHtml: "",
      };
    }
    return getReportsIndexRoute(page, url);
  }

  if (pathname === "/states") {
    return getStatesIndexRoute();
  }

  if (pathname === "/agencies") {
    return getAgenciesIndexRoute();
  }

  const agencyMatch = pathname.match(/^\/agencies\/([a-z0-9-]+)$/);
  if (agencyMatch) {
    return getAgencyRoute(agencyMatch[1]);
  }

  if (pathname === "/topics") {
    return getTopicsIndexRoute();
  }

  const topicMatch = pathname.match(/^\/topics\/([a-z0-9-]+)$/);
  if (topicMatch) {
    return getTopicRoute(topicMatch[1]);
  }

  if (pathname === "/dashboard") {
    return getDashboardRoute();
  }

  if (pathname === "/about") {
    return getAboutRoute();
  }

  if (pathname === "/research") {
    return getResearchIndexRoute();
  }

  const researchMatch = pathname.match(/^\/research\/([a-z0-9-]+)$/);
  if (researchMatch) {
    return getResearchRoute(researchMatch[1]);
  }

  if (pathname.startsWith("/research/")) {
    return getNotFoundRoute();
  }

  const reportMatch = pathname.match(/^\/reports\/(\d+)$/);
  if (reportMatch) {
    return getReportRoute(reportMatch[1]);
  }

  if (pathname.startsWith("/reports/")) {
    return getNotFoundRoute();
  }

  const stateMatch = pathname.match(/^\/states\/([a-z0-9-]+)$/);
  if (stateMatch) {
    return getStateRoute(stateMatch[1]);
  }

  return getNotFoundRoute();
}

export function injectSeoIntoHtml(html: string, route: ResolvedHtmlRoute): string {
  const meta = route.seoMeta;
  if (!meta) {
    return html;
  }

  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const tags = [
    meta.canonicalUrl
      ? `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`
      : "",
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDesc}" />`,
    meta.canonicalUrl
      ? `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`
      : "",
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDesc}" />`,
    `<meta name="robots" content="${escapeHtml(meta.robots)}" />`,
    ...meta.jsonLd.map((item) => `<script type="application/ld+json">${JSON.stringify(item)}</script>`),
  ].filter(Boolean);

  html = html.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*\/?>/,
    `<meta name="description" content="${safeDesc}" />`,
  );
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${route.snapshotHtml}</div>`,
  );
  if (route.initialRouteData) {
    html = html.replace(
      "</body>",
      `<script>window.__INITIAL_ROUTE_DATA__ = ${escapeScriptJson(route.initialRouteData)};</script>\n</body>`,
    );
  }
  html = html.replace("</head>", `${tags.join("\n")}\n</head>`);

  return html;
}

export async function generateSitemap(): Promise<string> {
  const urls: Array<{
    loc: string;
    lastmod?: string;
    changefreq: string;
    priority: string;
  }> = [];

  urls.push(
    { loc: SITE_URL, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/explore`, changefreq: "daily", priority: "0.9" },
    { loc: `${SITE_URL}/reports`, changefreq: "daily", priority: "0.9" },
    { loc: `${SITE_URL}/states`, changefreq: "weekly", priority: "0.8" },
    { loc: `${SITE_URL}/agencies`, changefreq: "weekly", priority: "0.7" },
    { loc: `${SITE_URL}/topics`, changefreq: "weekly", priority: "0.7" },
    { loc: `${SITE_URL}/research`, changefreq: "weekly", priority: "0.7" },
    { loc: `${SITE_URL}/dashboard`, changefreq: "weekly", priority: "0.6" },
    { loc: `${SITE_URL}/about`, changefreq: "monthly", priority: "0.4" },
  );

  try {
    const [statePages, reportResults, researchSlugs, agencyPages, topicPages] = await Promise.all([
      storage.getIndexableStates(60),
      storage.getReports({}, 1, 5000),
      listResearchReportSlugs(),
      storage.getAgenciesWithCounts(200),
      storage.getTopicsWithCounts(),
    ]);

    const reportPageCount = Math.ceil(reportResults.total / 24);
    for (let page = 2; page <= reportPageCount; page++) {
      urls.push({
        loc: `${SITE_URL}/reports/page/${page}`,
        changefreq: "daily",
        priority: "0.7",
      });
    }

    for (const state of statePages) {
      urls.push({
        loc: `${SITE_URL}/states/${state.slug}`,
        lastmod: state.latestReport?.updatedAt
          ? new Date(state.latestReport.updatedAt).toISOString().split("T")[0]
          : undefined,
        changefreq: "weekly",
        priority: "0.8",
      });
    }

    for (const agency of agencyPages) {
      urls.push({
        loc: `${SITE_URL}/agencies/${agency.slug}`,
        lastmod: agency.latestReport?.updatedAt
          ? new Date(agency.latestReport.updatedAt).toISOString().split("T")[0]
          : undefined,
        changefreq: "weekly",
        priority: "0.6",
      });
    }

    for (const topic of topicPages) {
      urls.push({
        loc: `${SITE_URL}/topics/${topic.slug}`,
        changefreq: "weekly",
        priority: "0.6",
      });
    }

    for (const report of reportResults.items) {
      const lastmod = report.updatedAt
        ? new Date(report.updatedAt).toISOString().split("T")[0]
        : undefined;
      urls.push({
        loc: `${SITE_URL}/reports/${report.id}`,
        lastmod,
        changefreq: "monthly",
        priority: "0.8",
      });
    }

    for (const slug of researchSlugs) {
      try {
        const report = await getResearchReportBySlug(slug);
        urls.push({
          loc: `${SITE_URL}/research/${slug}`,
          lastmod: report.updatedAt?.split("T")[0],
          changefreq: "weekly",
          priority: "0.6",
        });
      } catch (error) {
        if (
          error instanceof ResearchReportNotFoundError ||
          error instanceof ResearchReportValidationError
        ) {
          continue;
        }
        throw error;
      }
    }
  } catch (err) {
    console.error("Error generating sitemap entries:", err);
  }

  const urlEntries = urls
    .map((url) => {
      let entry = `  <url>\n    <loc>${escapeHtml(url.loc)}</loc>`;
      if (url.lastmod) entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
      entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
      entry += `\n    <priority>${url.priority}</priority>`;
      entry += `\n  </url>`;
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

function renderResearchSections(
  sections: Array<{
    id: string;
    title: string;
    contentHtml: string;
    children?: Array<any>;
  }>,
): string {
  return sections
    .map((section) => {
      return `
        <section id="${escapeHtml(section.id)}">
          <h2>${escapeHtml(section.title)}</h2>
          ${section.contentHtml || ""}
          ${section.children?.length ? renderResearchSections(section.children) : ""}
        </section>
      `;
    })
    .join("");
}
