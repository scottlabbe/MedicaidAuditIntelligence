import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { primeInitialRouteData } from "./lib/initialRouteData";
import { preloadRouteForPath } from "./lib/routeLoaders";

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
  primeInitialRouteData();
  registerChunkRecoveryHandler();

  if (typeof window !== "undefined") {
    try {
      await preloadRouteForPath(window.location.pathname);
    } catch (error) {
      console.warn("Initial route preload failed", error);
    }
  }

  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
}

void bootstrap();
