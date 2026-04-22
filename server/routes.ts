import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hmacAuth } from "./auth";
import { z } from "zod";
import { generateSitemap } from "./seo";
import {
  getResearchReportAsset,
  getResearchReportBySlug,
  listResearchReports,
  ResearchReportNotFoundError,
  ResearchReportValidationError,
} from "./researchReports";

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60;

// Middleware for rate limiting
function rateLimit(req: Request, res: Response, next: Function) {
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  
  let clientData = rateLimitStore.get(clientIp);
  
  if (!clientData || now > clientData.resetTime) {
    clientData = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitStore.set(clientIp, clientData);
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ 
      error: "Too many requests", 
      message: "Rate limit exceeded. Please try again later." 
    });
  }
  
  clientData.count++;
  next();
}

// Middleware for HMAC authentication (admin routes)
function requireHMAC(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }
    
    const token = authHeader.substring(7);
    const [mac, timestamp] = token.split("::");
    
    if (!mac || !timestamp) {
      return res.status(401).json({ error: "Invalid token format" });
    }
    
    // Check timestamp (prevent replay attacks - allow 5 minute window)
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    if (Math.abs(now - tokenTime) > 5 * 60 * 1000) {
      return res.status(401).json({ error: "Token expired" });
    }
    
    if (!hmacAuth.verifyToken(mac, timestamp, req.path)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
}

// Validation schemas
const searchFiltersSchema = z.object({
  query: z.string().optional(),
  state: z.string().length(2).optional(),
  agency: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
  theme: z.string().optional(),
  sortBy: z.enum(["date_desc", "date_asc", "title", "state"]).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS headers
  app.use((req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin || "")) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.header("Access-Control-Allow-Credentials", "false");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    
    next();
  });

  // SEO endpoints (before API routes)

  app.get("/robots.txt", (_req, res) => {
    const siteUrl = process.env.SITE_URL || "https://www.medicaidintelligence.com";
    res.type("text/plain").send(
`# Medicaid Intelligence robots.txt
# Managed manually in application code (Cloudflare managed robots.txt remains OFF)

############################################
# Section 1: Standard Search Engines (allow)
############################################
User-agent: Googlebot
Allow: /
Disallow: /api/

User-agent: Bingbot
Allow: /
Disallow: /api/

User-agent: DuckDuckBot
Allow: /
Disallow: /api/

User-agent: Applebot
Allow: /
Disallow: /api/

User-agent: Slurp
Allow: /
Disallow: /api/

############################################
# Section 2: AI Crawlers (explicitly allow)
############################################
# OpenAI
User-agent: OAI-SearchBot
Allow: /
Disallow: /api/

User-agent: GPTBot
Allow: /
Disallow: /api/

User-agent: ChatGPT-User
Allow: /
Disallow: /api/

# Anthropic
User-agent: ClaudeBot
Allow: /
Disallow: /api/

User-agent: Claude-SearchBot
Allow: /
Disallow: /api/

User-agent: Claude-User
Allow: /
Disallow: /api/

# Perplexity
User-agent: PerplexityBot
Allow: /
Disallow: /api/

User-agent: Perplexity-User
Allow: /
Disallow: /api/

# Google AI controls (Gemini/Vertex control token)
User-agent: Google-Extended
Allow: /
Disallow: /api/

# Amazon
User-agent: Amazonbot
Allow: /
Disallow: /api/

User-agent: Amzn-SearchBot
Allow: /
Disallow: /api/

User-agent: Amzn-User
Allow: /
Disallow: /api/

# Meta AI
User-agent: meta-externalagent
Allow: /
Disallow: /api/

# Apple Intelligence control token
User-agent: Applebot-Extended
Allow: /
Disallow: /api/

############################################
# Section 3: Blocked Bad Bots (disallow all)
############################################
# Aggressive SEO/link index scrapers
User-agent: AhrefsBot
Disallow: /

User-agent: AhrefsSiteAudit
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: SemrushBot-BA
Disallow: /

User-agent: SemrushBot-SI
Disallow: /

User-agent: SemrushBot-SWA
Disallow: /

User-agent: SemrushBot-OCOB
Disallow: /

User-agent: SplitSignalBot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: MJ12bot
Disallow: /

# Self-identifying scanner / harvester / copier agents
User-agent: sqlmap
Disallow: /

User-agent: Nikto
Disallow: /

User-agent: Nmap Scripting Engine
Disallow: /

User-agent: WPScan
Disallow: /

User-agent: EmailCollector
Disallow: /

User-agent: EmailSiphon
Disallow: /

User-agent: EmailWolf
Disallow: /

User-agent: HTTrack
Disallow: /

User-agent: WebCopier
Disallow: /

############################################
# Section 4: Default rules for unknown bots
############################################
User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml`
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const sitemap = await generateSitemap();
      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Public endpoints (with rate limiting)

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get reports with filtering and pagination
  app.get("/api/reports", rateLimit, async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse(req.query);
      const pagination = paginationSchema.parse(req.query);
      
      const result = await storage.getReports(filters, pagination.page, pagination.pageSize);
      
      // Cache control
      res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
      res.json(result);
    } catch (error) {
      console.error("Error fetching reports:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get featured reports (must come before /:id route)
  app.get("/api/reports/featured", rateLimit, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
      
      if (limit < 1 || limit > 20) {
        return res.status(400).json({ error: "Limit must be between 1 and 20" });
      }
      
      const reports = await storage.getFeaturedReports(limit);
      
      res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
      res.json(reports);
    } catch (error) {
      console.error("Error fetching featured reports:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get latest reports by state (must come before /:id route)
  app.get("/api/reports/state-latest", rateLimit, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 3, 5);
      const scope = req.query.scope === 'federal' ? 'federal' : 'state';
      
      const result = await storage.getLatestReportsByState(limit, scope);
      
      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      res.json(result);
    } catch (error) {
      console.error("Error fetching state latest reports:", error);
      res.status(500).json({ error: "Failed to load state latest reports" });
    }
  });

  app.get("/api/research-reports", rateLimit, async (_req, res) => {
    try {
      const reports = await listResearchReports();
      res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
      res.json(reports);
    } catch (error) {
      console.error("Error fetching research reports:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/research-reports/:slug", rateLimit, async (req, res) => {
    try {
      const report = await getResearchReportBySlug(req.params.slug);
      res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
      res.json(report);
    } catch (error) {
      if (error instanceof ResearchReportNotFoundError) {
        return res.status(404).json({ error: "Research report not found" });
      }

      if (error instanceof ResearchReportValidationError) {
        const status = process.env.NODE_ENV === "development" ? 500 : 404;
        return res.status(status).json({
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Research report not found",
        });
      }

      console.error("Error fetching research report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/research-reports/:slug/assets/:assetPath(*)", rateLimit, async (req, res) => {
    try {
      const { slug, assetPath } = req.params;
      if (!slug || !assetPath) {
        return res.status(404).json({ error: "Research report asset not found" });
      }

      const asset = await getResearchReportAsset(slug, assetPath);
      res.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      res.type(asset.contentType);
      return res.sendFile(asset.absolutePath);
    } catch (error) {
      if (
        error instanceof ResearchReportNotFoundError ||
        error instanceof ResearchReportValidationError
      ) {
        return res.status(404).json({ error: "Research report asset not found" });
      }

      console.error("Error fetching research report asset:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single report by ID
  app.get("/api/reports/:id", rateLimit, async (req, res) => {
    try {
      const reportId = req.params.id;
      
      if (!reportId || typeof reportId !== "string") {
        return res.status(400).json({ error: "Invalid report ID" });
      }
      
      const report = await storage.getReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      // No cache for individual reports to ensure freshness
      res.set("Cache-Control", "private, no-cache");
      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", rateLimit, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Top keywords
  app.get("/api/keywords/top", rateLimit, async (req, res) => {
    try {
      const limitParam = req.query.limit;
      const limit = limitParam ? Math.min(Math.max(parseInt(limitParam as string), 1), 24) : 12;
      
      const keywords = await storage.getTopKeywords(limit);
      
      res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
      res.json(keywords);
    } catch (error) {
      console.error("Error fetching top keywords:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Export reports


  // Protected admin endpoints (require HMAC auth)
  
  // Admin health check
  app.get("/api/admin/health", requireHMAC, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        dbStats: stats
      });
    } catch (error) {
      console.error("Admin health check failed:", error);
      res.status(500).json({ error: "Database connection failed" });
    }
  });

  // Reindex search (placeholder for future implementation)
  app.post("/api/admin/reindex", requireHMAC, async (req, res) => {
    try {
      // TODO: Implement search reindexing when materialized views are added
      res.json({ status: "ok", message: "Reindex completed" });
    } catch (error) {
      console.error("Reindex failed:", error);
      res.status(500).json({ error: "Reindex failed" });
    }
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error("Unhandled error:", err);
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
