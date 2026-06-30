/**
 * frontend/src/components/RequireAuth.tsx
 * Wrap protected routes/pages with this to enforce authentication.
 *
 * While the session is being restored (isLoading), renders a minimal
 * loading state instead of redirecting — prevents a flash-redirect to
 * /login for users who are actually logged in but whose session hasn't
 * finished restoring yet.
 */
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppContext } from "@/context/AppContext";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading your session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect is in-flight via the effect above; render nothing meanwhile.
    return null;
  }

  return <>{children}</>;
}
