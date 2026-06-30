/**
 * frontend/src/components/layout/Navbar.tsx
 * Top navigation bar. Shows all feature links when logged in (some route
 * to pages that are still placeholders — see the route files listed in
 * NAV_ITEMS below). Shows login/signup links when logged out.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { useAppContext } from "@/context/AppContext";

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/scam-shield", label: "Scam Shield" },
  { to: "/financial-calendar", label: "Financial Calendar" },
  { to: "/future-self", label: "Future Self" },
  { to: "/ai-assistant", label: "AI Assistant" },
  { to: "/government-schemes", label: "Government Schemes" },
  { to: "/community", label: "Community" },
  { to: "/accessibility", label: "Accessibility" },
];

export function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAppContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="text-lg">🛡️ ArthaRakshak</span>
        </Link>

        {isAuthenticated && (
          <nav className="hidden flex-1 items-center gap-1 overflow-x-auto text-sm lg:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-colors ${isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-3 text-sm">
          {isLoading ? null : isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-muted-foreground sm:inline">
                {user?.full_name || user?.email}
              </span>
              <button
                onClick={logout}
                className="rounded-md border px-3 py-1.5 font-medium transition-colors hover:bg-muted"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-muted"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {isAuthenticated && (
        <nav className="flex items-center gap-1 overflow-x-auto border-t px-4 py-1.5 text-xs lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}