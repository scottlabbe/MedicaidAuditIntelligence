import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, FileText, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CommandPalette from "@/components/ui/command-palette";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Explore", href: "/explore" },
  { name: "Dashboard", href: "/dashboard" },
];

export default function Header() {
  const [location] = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleKeyboardShortcut = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCommandOpen(true);
    }
  };

  // Listen for keyboard shortcuts
  useState(() => {
    document.addEventListener("keydown", handleKeyboardShortcut);
    return () => document.removeEventListener("keydown", handleKeyboardShortcut);
  });

  return (
    <>
      <header className="sticky top-0 z-50 warm-shadow" style={{ backgroundColor: '#FFFDFB', borderBottom: '1px solid #FDE68A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-black">
                  Medicaid Audit Explorer
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`font-medium transition-colors ${
                      location === item.href
                        ? "text-orange-primary"
                        : "text-secondary hover:text-orange-primary"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Global Search Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandOpen(true)}
                className="flex items-center space-x-2 bg-surface-2 hover:bg-surface-3 border focus-ring"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search reports...</span>
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-background rounded text-xs text-muted border">
                  ⌘K
                </kbd>
              </Button>

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-semibold">Menu</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <nav className="space-y-4">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`block py-2 px-3 rounded-lg transition-colors ${
                          location === item.href
                            ? "bg-orange-primary text-white"
                            : "hover:bg-surface-2"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
