/**
 * frontend/src/context/GuardianMemory.tsx
 * Holds per-user "guardian" state: guardian score, notifications, and
 * activity history (scam checks, voice sessions, etc.).
 *
 * FOUNDATION SCOPE: the actual feature endpoints (/api/guardian/score,
 * /api/guardian/notifications, /api/guardian/history) don't exist yet.
 * This provider establishes the data shape, fetch lifecycle, and the
 * critical per-user isolation rule:
 *
 *   - Data is fetched fresh whenever the logged-in user changes.
 *   - Data is wiped immediately on logout (isAuthenticated -> false)
 *     so a second account logging in on the same browser NEVER sees
 *     a flash of the previous account's data.
 *
 * Must be mounted INSIDE AppProvider, since it reads useAppContext().
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { useAppContext } from "./AppContext";

export interface GuardianNotification {
  id: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
  read: boolean;
}

export interface GuardianHistoryItem {
  id: number;
  type: "scam_check" | "voice_session" | "scheme_match" | "simulation";
  summary: string;
  created_at: string;
}

interface GuardianMemoryValue {
  guardianScore: number | null;
  notifications: GuardianNotification[];
  history: GuardianHistoryItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const GuardianMemoryContext = createContext<GuardianMemoryValue | undefined>(
  undefined
);

const EMPTY_STATE = {
  guardianScore: null as number | null,
  notifications: [] as GuardianNotification[],
  history: [] as GuardianHistoryItem[],
};

export function GuardianMemoryProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAppContext();
  const [guardianScore, setGuardianScore] = useState<number | null>(
    EMPTY_STATE.guardianScore
  );
  const [notifications, setNotifications] = useState<GuardianNotification[]>(
    EMPTY_STATE.notifications
  );
  const [history, setHistory] = useState<GuardianHistoryItem[]>(
    EMPTY_STATE.history
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearAll = useCallback(() => {
    setGuardianScore(EMPTY_STATE.guardianScore);
    setNotifications(EMPTY_STATE.notifications);
    setHistory(EMPTY_STATE.history);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      clearAll();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // These endpoints are placeholders for the upcoming guardian/dashboard
      // feature routes. They are intentionally not called yet to avoid
      // 404 noise before those routes exist on the backend.
      //
      // const score = await api.get<{ score: number }>("/guardian/score");
      // const notifs = await api.get<GuardianNotification[]>("/guardian/notifications");
      // const hist = await api.get<GuardianHistoryItem[]>("/guardian/history");
      // setGuardianScore(score.score);
      // setNotifications(notifs);
      // setHistory(hist);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guardian data.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, clearAll]);

  // Re-fetch whenever the logged-in user changes; wipe immediately on logout.
  useEffect(() => {
    if (!isAuthenticated) {
      clearAll();
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const value: GuardianMemoryValue = {
    guardianScore,
    notifications,
    history,
    isLoading,
    error,
    refresh,
  };

  return (
    <GuardianMemoryContext.Provider value={value}>
      {children}
    </GuardianMemoryContext.Provider>
  );
}

export function useGuardianMemory(): GuardianMemoryValue {
  const ctx = useContext(GuardianMemoryContext);
  if (!ctx) {
    throw new Error(
      "useGuardianMemory must be used within a GuardianMemoryProvider"
    );
  }
  return ctx;
}
