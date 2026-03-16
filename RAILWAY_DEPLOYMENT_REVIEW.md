# Railway Deployment Review — Medicaid Audit Intelligence

**Date:** February 24, 2026
**Reviewed by:** Claude
**Codebase:** MedicaidAuditIntelligence (Express + React + TypeScript)

---

## Issues Summary

### Critical (must fix before deploying)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 1 | Hardcoded HMAC fallback secret | `server/auth.ts:7` | Falls back to `"default-dev-secret-key-change-in-production"` if `INTERNAL_API_SECRET` is missing. An attacker could forge admin tokens. |
| 2 | Replit dev banner in production HTML | `client/index.html:14` | `<script src="https://replit.com/public/js/replit-dev-banner.js">` loads an external third-party script unconditionally in production. This is a supply chain risk and a visual/UX problem. |
| 3 | Replit Vite plugin always loaded | `vite.config.ts:4` | `@replit/vite-plugin-runtime-error-modal` is imported unconditionally (not gated by `REPL_ID`). It runs in the production build pipeline. The cartographer plugin IS gated correctly. |

### Should Fix (recommended before production)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 4 | Unused dependencies bloating install | `package.json` | `passport`, `passport-local`, `express-session`, `connect-pg-simple`, `memorystore`, `ws`, `next-themes` are in dependencies but never imported anywhere in the server or client code. Removing them speeds up installs and reduces attack surface. |
| 5 | Excessive Google Fonts loading | `client/index.html:8` | Loading 25+ font families in a single request (~200KB+). Most are unused. This severely impacts page load time and Lighthouse scores. |
| 6 | `credentials: "include"` on all API requests | `client/src/lib/api.ts:9`, `queryClient.ts:19,33` | Since there's no session/cookie auth, sending credentials on every request is unnecessary and could cause CORS issues if you ever add cross-origin access. |
| 7 | Request body limit too large | `server/index.ts:12` | `express.json({ limit: '50mb' })` is excessive for a read-only API. This enables denial-of-service via large payloads. |
| 8 | Rate limiter is in-memory only | `server/routes.ts:7-9` | `rateLimitStore` is a `Map` that resets on restart and doesn't work across multiple Railway replicas. Fine for single-instance, but worth noting. |
| 9 | No cache headers for static assets | `server/vite.ts:79` | `express.static(distPath)` has no `maxAge` set, so browsers re-request all static files on every visit. |
| 10 | `home-backup.tsx` in production | `client/src/pages/home-backup.tsx` | Dead code sitting in the build. Should be removed. |
| 11 | `attached_assets/` in project directory | Root directory | Contains ~200KB of Replit conversation snippets. While gitignored, it's still in the project directory. |
| 12 | Duplicate security headers | `server/index.ts` + `server/routes.ts` | Security headers (`X-Content-Type-Options`, `X-Frame-Options`, etc.) are set in both files. Consolidate to one location. |
| 13 | No `.env.example` file | Root | Anyone cloning the repo has no reference for required environment variables. |
| 14 | `timingSafeEqual` not used for HMAC comparison | `server/auth.ts:23-30` | The custom `compareHmac` function implements constant-time comparison manually. Node's built-in `crypto.timingSafeEqual` is more reliable and audited. |

### Nice to Have (non-blocking improvements)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 15 | No Neon connection retry/wakeup handling | `server/database.ts` | Neon auto-suspends idle databases. The first request after suspension may fail with a connection timeout. Consider adding retry logic or a health check that warms the connection. |
| 16 | No gzip/compression middleware | `server/index.ts` | Railway's edge may handle this, but adding `compression` middleware ensures API responses are compressed. |
| 17 | `searchHistory` table never written to | `shared/schema.ts:113-119` | Schema defines a `search_history` table but no code writes to it. Dead schema. |
| 18 | Legacy user schema still present | `shared/schema.ts` + `server/storage.ts` | `users` table, `getUser`, `getUserByUsername`, `createUser` methods exist but are unused. Leftover from a previous auth system. |
| 19 | Console logging in production | `server/routes.ts`, `server/storage.ts` | Many `console.error()` calls. Consider structured logging (e.g., pino) for production observability. |
| 20 | `reusePort: true` in server listen | `server/index.ts:87` | This option isn't harmful but is unusual for Railway and may not have the intended effect. |
| 21 | Missing SEO meta tags | `client/index.html` | No `<title>`, `<meta name="description">`, or Open Graph tags. Important for a public-facing portfolio project. |

---

## 1. Replit Cleanup — Specific Changes

### Files to remove
- **`attached_assets/`** — Replit conversation history (already gitignored, but remove from working directory)

### Files to edit

**`client/index.html`** — Remove the Replit banner script (line 14):
```html
<!-- DELETE THIS LINE -->
<script type="text/javascript" src="https://replit.com/public/js/replit-dev-banner.js"></script>
```

**`vite.config.ts`** — Remove the unconditional Replit import and gate all Replit plugins:
```typescript
// BEFORE (line 4):
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// AFTER: Remove that import entirely. Change the plugins array to:
plugins: [
  react(),
  ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [
        (await import("@replit/vite-plugin-runtime-error-modal")).default(),
        (await import("@replit/vite-plugin-cartographer")).then((m) => m.cartographer()),
      ]
    : []),
],
```

**`package.json`** — Move Replit packages to devDependencies (they already are) and remove unused dependencies:

Remove from `dependencies`:
- `connect-pg-simple`
- `express-session`
- `memorystore`
- `passport`
- `passport-local`
- `ws`
- `next-themes`
- `input-otp`
- `react-resizable-panels`
- `cmdk`

Remove from `devDependencies`:
- `@types/connect-pg-simple`
- `@types/express-session`
- `@types/passport`
- `@types/passport-local`
- `@types/ws`

**`.gitignore`** — Already correctly ignores Replit files. No changes needed.

---

## 2. Security Review — Detailed Findings

### HMAC Authentication (Critical Fix)

**`server/auth.ts` line 7** — The fallback secret must be removed:

```typescript
// BEFORE:
this.secret = secret || process.env.INTERNAL_API_SECRET || "default-dev-secret-key-change-in-production";

// AFTER:
this.secret = secret || process.env.INTERNAL_API_SECRET || "";
if (!this.secret) {
  throw new Error("INTERNAL_API_SECRET environment variable is required");
}
```

Additionally, replace the custom HMAC comparison with Node's built-in:

```typescript
import { createHmac, timingSafeEqual } from "crypto";

private compareHmac(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

### SQL Injection — PASS
All queries use Drizzle ORM's parameterized builders or Drizzle's `sql` tagged template literal, which properly parameterizes values. The raw SQL in `getLatestReportsByState` and `getTopKeywords` correctly uses `${variable}` inside `sql` backticks (Drizzle parameterizes these). No string concatenation in SQL.

### XSS — PASS
React auto-escapes all rendered content. No use of `dangerouslySetInnerHTML`. Search queries go through Zod validation and are used in `ilike()` operators (parameterized). Report text is rendered as text content, not HTML.

### CORS — PASS (with note)
CORS is controlled by `ALLOWED_ORIGINS` env var, split by comma. Only matching origins get `Access-Control-Allow-Origin`. When no origins are configured, no CORS headers are sent (safe default). Only `GET` and `OPTIONS` are allowed.

### Rate Limiting — PASS (with caveat)
60 requests/minute per IP. In-memory store resets on restart. Adequate for single-instance Railway deployment. If you scale to multiple instances, consider Redis-backed rate limiting.

### Error Handling — PASS
Stack traces are only included in error responses when `NODE_ENV === 'development'`. Production responses return generic error messages.

---

## 3. Railway Readiness — Assessment

### Port binding — PASS
`server/index.ts:85` reads `process.env.PORT` with fallback to 5000. Binds to `0.0.0.0`. Railway sets `PORT` dynamically — this will work.

### Build and start scripts — PASS
```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
"start": "NODE_ENV=production node dist/index.js"
```
Railway will run `npm install`, then `npm run build`, then `npm run start`. These scripts are correct.

### SSL/Database — PASS
Uses `@neondatabase/serverless` which handles SSL natively (Neon's HTTP driver always uses HTTPS). No manual SSL configuration needed.

### Static file serving — PASS
Vite builds to `dist/public/`. The `serveStatic()` function serves from the correct path relative to the bundled server (`server/public` = `dist/public`). SPA fallback to `index.html` is configured.

### Health check — PASS
`GET /api/health` returns `{ status: "ok" }`. Railway can use this for health checks.

### Ephemeral filesystem — PASS
No file writes. All data is in PostgreSQL via Neon. Static assets are built at deploy time and served from the bundled output.

### HTTPS redirect — CAUTION
`server/index.ts:17-20` redirects HTTP to HTTPS based on `x-forwarded-proto`. This works correctly with Railway's reverse proxy since `trust proxy` is set to `1`.

---

## 4. Environment Variables for Railway

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string. Format: `postgresql://user:pass@host/db?sslmode=require` |
| `INTERNAL_API_SECRET` | Yes | Secret key for HMAC authentication on admin endpoints. Generate with `openssl rand -hex 32` |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Auto | Railway sets this automatically. Do not set manually. |
| `ALLOWED_ORIGINS` | Optional | Comma-separated list of allowed CORS origins (e.g., `https://medicaidaudit.org`). Leave empty if frontend is served from the same origin. |

---

## 5. Recommended `.gitignore` Update

Add these entries:

```gitignore
# Railway
.railway/

# Package lock (optional — some teams prefer to commit this)
# package-lock.json

# Neon
.neonctl

# Runtime
*.pid
```

---

## 6. Recommended `.env.example`

Create this file for developer reference:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
INTERNAL_API_SECRET=generate-with-openssl-rand-hex-32

# Optional
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:5000
```

---

## 7. Google Fonts Optimization

The current `index.html` loads 25+ font families. Replace with only the fonts actually used:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Check your Tailwind config and component styles to identify which fonts are actually referenced, and only load those.

---

## 8. Static Asset Caching

Update `serveStatic()` in `server/vite.ts`:

```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}`);
  }

  // Vite-hashed assets can be cached aggressively
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Other static files with shorter cache
  app.use(express.static(distPath, {
    maxAge: "1h",
  }));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

---

## 9. Blocking Issues Summary

Before deploying to Railway, you **must** fix:

1. **Remove the hardcoded HMAC fallback secret** (`server/auth.ts:7`) — security vulnerability
2. **Remove the Replit banner script** (`client/index.html:14`) — loads third-party code in production
3. **Set `INTERNAL_API_SECRET` and `DATABASE_URL`** as Railway environment variables

Everything else is working correctly for Railway deployment. The build scripts, port binding, database connection, static file serving, and health checks are all compatible.

---

## 10. Deployment Checklist

- [ ] Fix hardcoded HMAC secret in `server/auth.ts`
- [ ] Remove Replit banner script from `client/index.html`
- [ ] Gate Replit Vite plugin in `vite.config.ts`
- [ ] Remove unused dependencies from `package.json`
- [ ] Trim Google Fonts to only those used
- [ ] Create `.env.example` for documentation
- [ ] Set Railway environment variables: `DATABASE_URL`, `INTERNAL_API_SECRET`, `NODE_ENV=production`
- [ ] Configure Railway health check: `GET /api/health`
- [ ] Add static asset cache headers
- [ ] Remove `home-backup.tsx`
- [ ] Remove `attached_assets/` from working directory
- [ ] Test build locally: `npm run build && npm run start`
- [ ] Point `medicaidaudit.org` DNS to Railway
