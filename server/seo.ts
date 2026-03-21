import { storage } from "./storage";

const SITE_URL =
  process.env.SITE_URL || "https://medicaidintelligence.com";
const SITE_NAME = "Medicaid Audit Intelligence";

// US state code to full name mapping
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

export interface SeoMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: string;
  jsonLd: object[];
}

/**
 * Escape HTML entities to prevent XSS in injected meta content
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Truncate text to a max length, breaking at word boundaries
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.5 ? truncated.substring(0, lastSpace) : truncated) + "...";
}

/**
 * Build a publication date string from year/month/day
 */
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

/**
 * Get SEO metadata for a given URL path.
 * Queries the database when needed (e.g. for individual report pages).
 */
export async function getSeoMeta(urlPath: string): Promise<SeoMeta> {
  // Strip query string for route matching, keep for canonical
  const [pathname] = urlPath.split("?");
  const canonicalPath = pathname === "/" ? "" : pathname;

  // --- Report detail: /reports/:id ---
  const reportMatch = pathname.match(/^\/reports\/(\d+)$/);
  if (reportMatch) {
    return getReportMeta(reportMatch[1], canonicalPath);
  }

  // --- Explore page ---
  if (pathname === "/explore") {
    return getExploreMeta(urlPath, canonicalPath);
  }

  // --- Dashboard ---
  if (pathname === "/dashboard") {
    return {
      title: `Medicaid Audit Dashboard - Statistics & Coverage Map | ${SITE_NAME}`,
      description:
        "Interactive dashboard with Medicaid audit statistics, state coverage map, and trend analysis. Explore audit findings and program insights across all 50 states.",
      canonicalUrl: `${SITE_URL}/dashboard`,
      ogType: "website",
      jsonLd: [getOrganizationJsonLd()],
    };
  }

  // --- About ---
  if (pathname === "/about") {
    return {
      title: `About ${SITE_NAME}`,
      description:
        "Learn how Medicaid Audit Intelligence transforms government audit reports into searchable, structured data using AI-powered extraction and analysis.",
      canonicalUrl: `${SITE_URL}/about`,
      ogType: "website",
      jsonLd: [getOrganizationJsonLd()],
    };
  }

  // --- Home (default) ---
  return getHomeMeta();
}

async function getHomeMeta(): Promise<SeoMeta> {
  let totalReports = 100;
  let statesWithReports = 40;
  try {
    const stats = await storage.getDashboardStats();
    totalReports = stats.totalReports;
    statesWithReports = stats.statesWithReports;
  } catch {
    // Use defaults if DB is unavailable
  }

  return {
    title: `${SITE_NAME} - Search & Analyze Medicaid Audit Reports`,
    description: `Search and analyze ${totalReports}+ Medicaid audit reports across ${statesWithReports} states. Explore findings, recommendations, and financial impacts from state and federal oversight agencies.`,
    canonicalUrl: SITE_URL,
    ogType: "website",
    jsonLd: [
      getOrganizationJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: `Search and analyze Medicaid audit reports across states with structured findings, recommendations, and trends.`,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/explore?query={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

async function getReportMeta(
  id: string,
  canonicalPath: string,
): Promise<SeoMeta> {
  try {
    const report = await storage.getReportById(id);
    if (report) {
      const stateName = STATE_NAMES[report.state] || report.state;
      const title = `${report.reportTitle} | ${SITE_NAME}`;
      const descSource =
        report.overallConclusion || report.llmInsight || report.potentialObjectiveSummary || "";
      const description = truncate(descSource, 155);
      const dateStr = buildDateString(
        report.publicationYear,
        report.publicationMonth,
        report.publicationDay,
      );

      return {
        title,
        description,
        canonicalUrl: `${SITE_URL}${canonicalPath}`,
        ogType: "article",
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
              name: stateName,
            },
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
            },
          },
        ],
      };
    }
  } catch {
    // Fall through to default
  }

  return {
    title: `Audit Report | ${SITE_NAME}`,
    description: "View detailed Medicaid audit report with findings, recommendations, and analysis.",
    canonicalUrl: `${SITE_URL}${canonicalPath}`,
    ogType: "article",
    jsonLd: [getOrganizationJsonLd()],
  };
}

function getExploreMeta(
  fullUrl: string,
  canonicalPath: string,
): SeoMeta {
  const params = new URLSearchParams(fullUrl.split("?")[1] || "");
  const stateCode = params.get("state");
  const query = params.get("query");
  const year = params.get("year");

  let title = `Explore Medicaid Audit Reports | ${SITE_NAME}`;
  let description =
    "Search and filter Medicaid audit reports by state, agency, year, and topic. Browse findings, recommendations, and financial impacts.";

  if (stateCode && STATE_NAMES[stateCode]) {
    title = `Medicaid Audit Reports in ${STATE_NAMES[stateCode]} | ${SITE_NAME}`;
    description = `Browse Medicaid audit reports for ${STATE_NAMES[stateCode]}. Find audit findings, recommendations, and oversight insights.`;
  } else if (query) {
    title = `"${truncate(query, 40)}" - Medicaid Audit Search | ${SITE_NAME}`;
    description = `Search results for "${truncate(query, 80)}" in Medicaid audit reports. Find related findings, recommendations, and analysis.`;
  }

  if (year) {
    title = title.replace(` | ${SITE_NAME}`, ` (${year}) | ${SITE_NAME}`);
  }

  // Canonical for explore is always the base path (no query params)
  return {
    title,
    description,
    canonicalUrl: `${SITE_URL}/explore`,
    ogType: "website",
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
  };
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

/**
 * Inject SEO meta tags into the HTML template.
 * Replaces the static <title> and <meta description>, and appends
 * OG tags, canonical, Twitter cards, and JSON-LD before </head>.
 */
export function injectSeoIntoHtml(html: string, meta: SeoMeta): string {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);

  // Replace existing title
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${safeTitle}</title>`,
  );

  // Replace existing meta description
  html = html.replace(
    /<meta name="description"[^>]*\/?>/,
    `<meta name="description" content="${safeDesc}" />`,
  );

  // Build injection block
  const tags = [
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`,
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDesc}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDesc}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`,
  ];

  html = html.replace("</head>", `${tags.join("\n")}\n</head>`);

  return html;
}

/**
 * Generate a full XML sitemap from the database.
 */
export async function generateSitemap(): Promise<string> {
  const urls: Array<{
    loc: string;
    lastmod?: string;
    changefreq: string;
    priority: string;
  }> = [];

  // Static pages
  urls.push(
    { loc: SITE_URL, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/explore`, changefreq: "daily", priority: "0.9" },
    { loc: `${SITE_URL}/dashboard`, changefreq: "weekly", priority: "0.5" },
    { loc: `${SITE_URL}/about`, changefreq: "monthly", priority: "0.3" },
  );

  // Dynamic report pages
  try {
    const result = await storage.getReports({}, 1, 5000);
    for (const report of result.items) {
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
  } catch (err) {
    console.error("Error generating sitemap report entries:", err);
  }

  // Build XML
  const urlEntries = urls
    .map((u) => {
      let entry = `  <url>\n    <loc>${escapeHtml(u.loc)}</loc>`;
      if (u.lastmod) entry += `\n    <lastmod>${u.lastmod}</lastmod>`;
      entry += `\n    <changefreq>${u.changefreq}</changefreq>`;
      entry += `\n    <priority>${u.priority}</priority>`;
      entry += `\n  </url>`;
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}
