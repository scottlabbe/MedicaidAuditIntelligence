import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { preloadRouteHref } from "@/lib/routeLoaders";

const NAV = [
  { href: "/reports", label: "Reports" },
  { href: "/states", label: "States" },
  { href: "/agencies", label: "Agencies" },
  { href: "/topics", label: "Topics" },
  { href: "/research", label: "Research" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prefetchHandlers = (href: string) => ({
    onMouseEnter: () => preloadRouteHref(href),
    onFocus: () => preloadRouteHref(href),
    onTouchStart: () => preloadRouteHref(href),
  });

  return (
    <header className="sticky top-0 z-50 border-b border-white/25 bg-primary text-primary-foreground">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          aria-label="Medicaid Audit Intelligence home"
          {...prefetchHandlers("/")}
        >
          <span className="max-w-[13rem] text-[15px] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:max-w-none sm:text-lg sm:leading-none">
            Medicaid Audit Intelligence
          </span>
        </Link>

        <nav
          className="hidden items-stretch self-stretch md:flex"
          aria-label="Primary navigation"
        >
          {NAV.map(({ href, label }) => {
            const active = location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center border-b-4 px-3 pt-1 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  active
                    ? "border-white"
                    : "border-transparent hover:border-white/55"
                }`}
                {...prefetchHandlers(href)}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 rounded-none border-l-border">
            <SheetHeader className="mb-8 text-left">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Browse Medicaid audit reports and evidence indexes.
              </SheetDescription>
            </SheetHeader>
            <nav className="border-t border-border" aria-label="Mobile navigation">
              {NAV.map(({ href, label }) => {
                const active = location.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`block border-b border-border px-1 py-4 text-base font-semibold ${
                      active
                        ? "text-primary"
                        : "text-foreground hover:text-primary"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                    {...prefetchHandlers(href)}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
