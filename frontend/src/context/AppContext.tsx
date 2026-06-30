/**
 * frontend/src/context/AppContext.tsx
 * Global app state: current user, auth actions, and lightweight
 * profile preferences (language, incomeType) mirrored from the user.
 *
 * Session restore: on mount, if a token exists in localStorage, calls
 * GET /api/auth/me to rehydrate the user. If that fails (expired/invalid
 * token), the token is cleared and the user is treated as logged out.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import { getToken, setToken, clearToken } from "@/lib/auth";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  language: string;
  income_type: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AppContextValue {
  user: User | null;
  isLoading: boolean; // true while restoring session on initial load
  isAuthenticated: boolean;
  language: string;
  incomeType: string | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, fullName?: string) => Promise<User>;
  logout: () => void;
  setLanguage: (language: string) => void;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
    } catch (err) {
      // Invalid/expired token — api.ts already clears it on 401,
      // but clear defensively for any other failure too.
      clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const signup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const res = await api.post<AuthResponse>("/auth/signup", {
        email,
        password,
        full_name: fullName,
      });
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  const setLanguage = useCallback((language: string) => {
    setUser((prev) => (prev ? { ...prev, language } : prev));
    // Persisting language to the backend (PATCH /api/users/me) can be
    // wired up once the profile/settings feature routes exist.
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return;
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      }
    }
  }, []);

  const value: AppContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    language: user?.language ?? "en",
    incomeType: user?.income_type ?? null,
    login,
    signup,
    logout,
    setLanguage,
    refreshUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return ctx;
}
