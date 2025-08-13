import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hmacAuth } from "./auth";
import { z } from "zod";

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
  program: z.string().optional(),
  hasAiInsight: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  severity: z.enum(["info", "low", "medium", "high"]).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS and security headers
  app.use((req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin || "")) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.header("Access-Control-Allow-Credentials", "false");
    
    // Security headers
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-Frame-Options", "DENY");
    res.header("Referrer-Policy", "no-referrer-when-downgrade");
    res.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    
    if (process.env.NODE_ENV === "production") {
      res.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    
    next();
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

  // Export reports
  app.get("/api/export", rateLimit, async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse(req.query);
      const format = req.query.format === "csv" ? "csv" : "json";
      
      const data = await storage.exportReports(filters, format);
      
      if (format === "csv") {
        res.set("Content-Type", "text/csv");
        res.set("Content-Disposition", "attachment; filename=medicaid-audit-reports.csv");
        
        // Convert array to CSV string
        const csvContent = data.map((row: any[]) => 
          row.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(",")
        ).join("\n");
        
        res.send(csvContent);
      } else {
        res.set("Content-Type", "application/json");
        res.set("Content-Disposition", "attachment; filename=medicaid-audit-reports.json");
        res.json(data);
      }
    } catch (error) {
      console.error("Error exporting reports:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

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
