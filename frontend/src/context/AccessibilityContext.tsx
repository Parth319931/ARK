/**
 * frontend/src/context/AccessibilityContext.tsx
 * Global accessibility settings — applied to the entire site via
 * attributes/CSS variables on <html>. Persists to localStorage instantly
 * and syncs to the backend (debounced) when the user is logged in.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { hasToken } from "@/lib/auth";

export type TextSize = "normal" | "large" | "extra-large";

interface AccessibilitySettings {
  seniorMode: boolean;
  textSize: TextSize;
  highContrast: number; // 0-100
  dyslexiaMode: number; // 0-100
}

interface AccessibilityContextValue extends AccessibilitySettings {
  toggleSeniorMode: () => void;
  setTextSize: (size: TextSize) => void;
  setHighContrast: (value: number) => void;
  setDyslexiaMode: (value: number) => void;
}

const STORAGE_KEY = "artharakshak_accessibility";

const DEFAULTS: AccessibilitySettings = {
  seniorMode: false,
  textSize: "normal",
  highContrast: 0,
  dyslexiaMode: 0,
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function loadFromStorage(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function applyToDocument(settings: AccessibilitySettings) {
  const root = document.documentElement;
  root.dataset.textSize = settings.textSize;
  root.style.setProperty("--contrast-level", String(settings.highContrast));
  root.style.setProperty("--dyslexia-level", String(settings.dyslexiaMode));
  root.classList.toggle("senior-mode", settings.seniorMode);
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadFromStorage);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedFromServer = useRef(false);

  // Apply to <html> on every change, and persist to localStorage immediately.
  useEffect(() => {
    applyToDocument(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // On mount, if logged in, pull saved settings from the server (server wins).
  useEffect(() => {
    if (!hasToken() || hasLoadedFromServer.current) return;
    hasLoadedFromServer.current = true;
    api
      .get<{
        senior_mode: boolean;
        text_size: TextSize;
        high_contrast: number;
        dyslexia_mode: number;
      }>("/accessibility")
      .then((data) => {
        setSettings({
          seniorMode: data.senior_mode,
          textSize: data.text_size,
          highContrast: data.high_contrast,
          dyslexiaMode: data.dyslexia_mode,
        });
      })
      .catch(() => {
        // Not logged in / no saved settings yet — keep local defaults.
      });
  }, []);

  // Debounced sync to backend whenever settings change (only if logged in).
  useEffect(() => {
    if (!hasToken()) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      api
        .put("/accessibility", {
          senior_mode: settings.seniorMode,
          text_size: settings.textSize,
          high_contrast: settings.highContrast,
          dyslexia_mode: settings.dyslexiaMode,
        })
        .catch(() => {
          // Silent fail is fine here — local state + localStorage already applied.
        });
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [settings]);

  function toggleSeniorMode() {
    setSettings((prev) => {
      const turningOn = !prev.seniorMode;
      return turningOn
        ? {
            seniorMode: true,
            textSize: "extra-large",
            highContrast: Math.max(prev.highContrast, 60),
            dyslexiaMode: Math.max(prev.dyslexiaMode, 40),
          }
        : { ...prev, seniorMode: false };
    });
  }

  function setTextSize(size: TextSize) {
    setSettings((prev) => ({ ...prev, textSize: size }));
  }

  function setHighContrast(value: number) {
    setSettings((prev) => ({ ...prev, highContrast: value }));
  }

  function setDyslexiaMode(value: number) {
    setSettings((prev) => ({ ...prev, dyslexiaMode: value }));
  }

  return (
    <AccessibilityContext.Provider
      value={{ ...settings, toggleSeniorMode, setTextSize, setHighContrast, setDyslexiaMode }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}