import { hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { primeInitialRouteData } from "./lib/initialRouteData";
import { preloadRouteForPath } from "./lib/routeLoaders";
import { queryClient } from "./lib/queryClient";

function registerChunkRecoveryHandler() {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const reloadKey = "chunk-reload-attempted";

    if (sessionStorage.getItem(reloadKey)) {
      return;
    }

    sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  });
}

async function bootstrap() {
  const initialRouteData = window.__INITIAL_ROUTE_DATA__;
  primeInitialRouteData(queryClient, initialRouteData);
  registerChunkRecoveryHandler();

  if (typeof window !== "undefined") {
    try {
      await preloadRouteForPath(window.location.pathname);
    } catch (error) {
      console.warn("Initial route preload failed", error);
    }
  }

  hydrateRoot(
    document.getElementById("root")!,
    <HelmetProvider>
      <App queryClient={queryClient} initialRouteData={initialRouteData} />
    </HelmetProvider>
  );
}

void bootstrap();
