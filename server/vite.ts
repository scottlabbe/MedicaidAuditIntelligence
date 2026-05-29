import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { escapeScriptJson, resolveHtmlRoute } from "./seo";

type ServerRenderer = typeof import("../client/src/entry-server");

function injectSsrHtml(
  template: string,
  appHtml: string,
  headHtml: string,
  initialRouteData?: Record<string, unknown>,
) {
  let html = template;

  html = html.replace(/<title>.*?<\/title>/, "");
  html = html.replace(/<meta name="description"[^>]*\/?>/, "");
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${appHtml}</div>`,
  );

  if (initialRouteData) {
    html = html.replace(
      "</body>",
      `<script>window.__INITIAL_ROUTE_DATA__ = ${escapeScriptJson(initialRouteData)};</script>\n</body>`,
    );
  }

  html = html.replace("</head>", `${headHtml}\n</head>`);
  return html;
}

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      // Resolve route behavior before Vite transforms the document.
      try {
        const resolvedRoute = await resolveHtmlRoute(url);
        if (resolvedRoute.redirectTo) {
          res.redirect(resolvedRoute.status, resolvedRoute.redirectTo);
          return;
        }

        const renderer = await vite.ssrLoadModule(
          "/src/entry-server.tsx",
        ) as ServerRenderer;
        const { appHtml, headHtml } = renderer.render(
          url,
          resolvedRoute.initialRouteData as any,
        );
        template = injectSsrHtml(
          template,
          appHtml,
          headHtml,
          resolvedRoute.initialRouteData,
        );
        res.status(resolvedRoute.status);
      } catch (e) {
        console.warn("SSR failed for", url, e);
      }

      const page = await vite.transformIndexHtml(url, template);
      res.set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  const assetsPath = path.join(distPath, "assets");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Cache the index.html template in memory for fast SEO injection
  const indexHtmlPath = path.resolve(distPath, "index.html");
  const indexHtmlTemplate = fs.readFileSync(indexHtmlPath, "utf-8");

  if (fs.existsSync(assetsPath)) {
    app.use(
      "/assets",
      express.static(assetsPath, {
        maxAge: "1y",
        immutable: true,
      }),
    );
  }

  app.use(
    express.static(distPath, {
      index: false,
      maxAge: "1h",
    }),
  );

  // Fall through to index.html with route-aware SEO and status handling.
  app.use("*", async (req, res) => {
    try {
      const resolvedRoute = await resolveHtmlRoute(req.originalUrl);
      if (resolvedRoute.redirectTo) {
        res.redirect(resolvedRoute.status, resolvedRoute.redirectTo);
        return;
      }

      const rendererPath = path.resolve(
        import.meta.dirname,
        "server",
        "entry-server.js",
      );
      const renderer = await import(pathToFileURL(rendererPath).href) as ServerRenderer;
      const { appHtml, headHtml } = renderer.render(
        req.originalUrl,
        resolvedRoute.initialRouteData as any,
      );
      const html = injectSsrHtml(
        indexHtmlTemplate,
        appHtml,
        headHtml,
        resolvedRoute.initialRouteData,
      );
      res.status(resolvedRoute.status).set({ "Content-Type": "text/html" }).send(html);
    } catch (e) {
      console.warn("SSR failed, serving base HTML:", e);
      res.status(200).set({ "Content-Type": "text/html" }).send(indexHtmlTemplate);
    }
  });
}
