/**
 * frontend/src/components/layout/Navbar.tsx
 * Top navigation bar. Shows login/signup links when logged out, and
 * the user's name/email + logout when logged in.
 *
 * Feature nav links (Dashboard, Scam Shield, Voice Guardian, AI Assistant,
 * Future Self, Schemes) are left as placeholders/comments until those
 * routes exist.
 */
import { Link } from "@tanstack/react-router";
import { useAppContext } from "@/context/AppContext";

export function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAppContext();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">🛡️ ArthaRakshak</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {/* Feature links — wired up once those routes are built:
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/scam-shield">Scam Shield</Link>
          <Link to="/voice-guardian">Voice Guardian</Link>
          <Link to="/assistant">AI Assistant</Link>
          <Link to="/future-self">Future Self</Link>
          <Link to="/schemes">Schemes</Link>
          */}

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
        </nav>
      </div>
    </header>
  );
}
