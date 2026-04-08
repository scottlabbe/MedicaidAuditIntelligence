import { Link } from "wouter";
import { getStateEntryByCode } from "@shared/states";
import { preloadRouteHref } from "@/lib/routeLoaders";

const PRIMARY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore Reports" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
];

const FEATURED_STATES = ["IL", "TX", "CA", "NY"].flatMap((code) => {
  const state = getStateEntryByCode(code);
  return state ? [state] : [];
});

export default function Footer() {
  const prefetchHandlers = (href: string) => ({
    onMouseEnter: () => preloadRouteHref(href),
    onFocus: () => preloadRouteHref(href),
    onTouchStart: () => preloadRouteHref(href),
  });

  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <p className="text-lg font-semibold text-foreground">
              Medicaid Audit Intelligence
            </p>
            <p className="max-w-xl text-sm text-muted-foreground">
              Search and analyze Medicaid audit reports, compare oversight activity across states, and trace findings back to their original source documents.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Site Links</p>
            <nav className="space-y-2 text-sm">
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-muted-foreground hover:text-foreground"
                  {...prefetchHandlers(link.href)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-3">State Pages</p>
            <nav className="space-y-2 text-sm">
              {FEATURED_STATES.map((state) => (
                <Link
                  key={state.code}
                  href={`/states/${state.slug}`}
                  className="block text-muted-foreground hover:text-foreground"
                  {...prefetchHandlers(`/states/${state.slug}`)}
                >
                  {state.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-4 text-sm text-muted-foreground">
          © 2026 Medicaid Audit Intelligence
        </div>
      </div>
    </footer>
  );
}
