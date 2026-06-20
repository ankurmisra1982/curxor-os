"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UiMode = "simple" | "expert";

interface UiModeContextValue {
  mode: UiMode;
  isExpert: boolean;
  setMode: (mode: UiMode) => void;
  toggleMode: () => void;
}

const STORAGE_KEY = "curxor-ui-mode";

const UiModeContext = createContext<UiModeContextValue | null>(null);

export function UiModeProvider({
  children,
  initialMode = "simple",
}: {
  children: ReactNode;
  initialMode?: UiMode;
}) {
  const [mode, setModeState] = useState<UiMode>(initialMode);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "expert" || stored === "simple") setModeState(stored);
    } catch {
      /* private mode */
    }
  }, []);

  const setMode = useCallback((next: UiMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "simple" ? "expert" : "simple");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, isExpert: mode === "expert", setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}

export function useUiMode(): UiModeContextValue {
  const ctx = useContext(UiModeContext);
  if (!ctx) throw new Error("useUiMode must be used within UiModeProvider");
  return ctx;
}
