import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
const siteUrl = process.env.SITE_URL || "https://medicaidintelligence.com";
const canonicalSiteUrl = new URL(siteUrl);
const canonicalProtocol = canonicalSiteUrl.protocol.replace(":", "");
const canonicalHost = canonicalSiteUrl.host;
const canonicalHostname = canonicalSiteUrl.hostname.toLowerCase();

function getRequestProtocol(req: Request): string {
  const forwardedProto = req.header("x-forwarded-proto");
  return forwardedProto?.split(",")[0].trim() || req.protocol;
}

function getRequestHost(req: Request): string | null {
  const forwardedHost = req.header("x-forwarded-host");
  return forwardedHost?.split(",")[0].trim() || req.header("host") || null;
}

function shouldRedirectHost(requestHostname: string): boolean {
  if (canonicalHostname.startsWith("www.")) {
    return requestHostname === canonicalHostname.slice(4);
  }

  return requestHostname === `www.${canonicalHostname}`;
}

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Security headers middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    const requestProtocol = getRequestProtocol(req);
    const requestHost = getRequestHost(req);
    const requestHostname = requestHost?.split(":")[0].toLowerCase();
    const needsProtocolRedirect = requestProtocol !== canonicalProtocol;
    const needsHostRedirect = requestHostname ? shouldRedirectHost(requestHostname) : false;

    if (needsProtocolRedirect || needsHostRedirect) {
      const redirectHost = needsHostRedirect ? canonicalHost : (requestHost || canonicalHost);
      res.redirect(301, `${canonicalProtocol}://${redirectHost}${req.originalUrl}`);
      return;
    }
  }
  
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && res.statusCode >= 400) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    console.error(`Error ${status}: ${message}`, err);

    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`🚀 Medicaid Audit Intelligence serving on port ${port}`);
    log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.DATABASE_URL) {
      log(`🗄️ Database connected`);
    } else {
      log(`⚠️ No DATABASE_URL found - using fallback storage`);
    }
  });
})();
