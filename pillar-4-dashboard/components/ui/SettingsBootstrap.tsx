"use client";

import { useEffect } from "react";

import { useTheme } from "@/components/ui/ThemeProvider";
import { useUiMode } from "@/components/ui/UiModeProvider";
import type { ColorScheme, ThemeMode, UiMode } from "@/lib/user-settings-types";

interface SettingsBootstrapProps {
  initialUiMode?: UiMode;
  initialColorScheme?: ColorScheme;
  initialThemeMode?: ThemeMode;
}

export function SettingsBootstrap({
  initialUiMode,
  initialColorScheme,
  initialThemeMode,
}: SettingsBootstrapProps) {
  const { setMode } = useUiMode();
  const { setColorScheme, setThemeMode } = useTheme();

  useEffect(() => {
    if (initialUiMode) setMode(initialUiMode);
    if (initialColorScheme) setColorScheme(initialColorScheme);
    if (initialThemeMode) setThemeMode(initialThemeMode);
  }, [initialUiMode, initialColorScheme, initialThemeMode, setMode, setColorScheme, setThemeMode]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          settings?: {
            appearance?: { uiMode?: UiMode; colorScheme?: ColorScheme; themeMode?: ThemeMode };
          };
        };
        const appearance = data.settings?.appearance;
        if (appearance?.uiMode) setMode(appearance.uiMode);
        if (appearance?.colorScheme) setColorScheme(appearance.colorScheme);
        if (appearance?.themeMode) setThemeMode(appearance.themeMode);
      } catch {
        /* offline */
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [setMode, setColorScheme, setThemeMode]);

  return null;
}
