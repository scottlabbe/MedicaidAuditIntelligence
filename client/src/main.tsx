import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { primeInitialRouteData } from "./lib/initialRouteData";

primeInitialRouteData();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
