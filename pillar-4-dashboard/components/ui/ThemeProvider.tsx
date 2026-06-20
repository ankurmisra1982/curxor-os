"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { applyThemeToDocument, resolveThemeMode } from "@/lib/theme-presets";
import type { ColorScheme, ThemeMode } from "@/lib/user-settings-types";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  themeMode: ThemeMode;
  setColorScheme: (scheme: ColorScheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const SCHEME_KEY = "curxor-color-scheme";
const MODE_KEY = "curxor-theme-mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialScheme = "curxor",
  initialThemeMode = "dark",
}: {
  children: ReactNode;
  initialScheme?: ColorScheme;
  initialThemeMode?: ThemeMode;
}) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(initialScheme);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode);

  useEffect(() => {
    applyThemeToDocument(colorScheme, themeMode);
  }, [colorScheme, themeMode]);

  useEffect(() => {
    try {
      const storedScheme = localStorage.getItem(SCHEME_KEY);
      if (storedScheme === "curxor" || storedScheme === "ocean" || storedScheme === "amber" || storedScheme === "mono") {
        setColorSchemeState(storedScheme);
      }
      const storedMode = localStorage.getItem(MODE_KEY);
      if (storedMode === "dark" || storedMode === "light" || storedMode === "system") {
        setThemeModeState(storedMode);
      }
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyThemeToDocument(colorScheme, "system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeMode, colorScheme]);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      applyThemeToDocument(scheme, themeMode);
      try {
        localStorage.setItem(SCHEME_KEY, scheme);
      } catch {
        /* ignore */
      }
    },
    [themeMode],
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      applyThemeToDocument(colorScheme, mode);
      try {
        localStorage.setItem(MODE_KEY, mode);
      } catch {
        /* ignore */
      }
    },
    [colorScheme],
  );

  const value = useMemo(
    () => ({ colorScheme, themeMode, setColorScheme, setThemeMode }),
    [colorScheme, themeMode, setColorScheme, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useResolvedTheme(): "dark" | "light" {
  const { themeMode } = useTheme();
  return resolveThemeMode(themeMode);
}
