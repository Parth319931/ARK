/**
 * frontend/src/routes/__root.tsx
 * Root route: wraps the entire app with AppProvider (auth/session) and
 * GuardianMemoryProvider (per-user guardian data), renders the Navbar,
 * and hosts the TanStack Router <Outlet />.
 *
 * Session restore happens automatically inside AppProvider's useEffect
 * on mount (see context/AppContext.tsx) — no extra wiring needed here.
 */
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppProvider } from "@/context/AppContext";
import { GuardianMemoryProvider } from "@/context/GuardianMemory";
import { Navbar } from "@/components/layout/Navbar";


export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AccessibilityProvider>
      <AppProvider>
        <GuardianMemoryProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
          {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
        </GuardianMemoryProvider>
      </AppProvider>
    </AccessibilityProvider>
  );
}
