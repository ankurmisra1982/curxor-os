"use client";

import { useEffect } from "react";

import { useTheme } from "@/components/ui/ThemeProvider";
import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import type { ExperienceLevel } from "@/lib/experience-level";
import type { ColorScheme, ThemeMode, UiMode } from "@/lib/user-settings-types";

interface SettingsBootstrapProps {
  initialUiMode?: UiMode;
  initialExperienceLevel?: ExperienceLevel;
  initialColorScheme?: ColorScheme;
  initialThemeMode?: ThemeMode;
}

export function SettingsBootstrap({
  initialUiMode,
  initialExperienceLevel,
  initialColorScheme,
  initialThemeMode,
}: SettingsBootstrapProps) {
  const { setLevel, setMode } = useExperienceLevel();
  const { setColorScheme, setThemeMode } = useTheme();

  useEffect(() => {
    if (initialExperienceLevel) setLevel(initialExperienceLevel);
    else if (initialUiMode) setMode(initialUiMode);
    if (initialColorScheme) setColorScheme(initialColorScheme);
    if (initialThemeMode) setThemeMode(initialThemeMode);
  }, [
    initialExperienceLevel,
    initialUiMode,
    initialColorScheme,
    initialThemeMode,
    setLevel,
    setMode,
    setColorScheme,
    setThemeMode,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          settings?: {
            appearance?: {
              uiMode?: UiMode;
              experienceLevel?: ExperienceLevel;
              colorScheme?: ColorScheme;
              themeMode?: ThemeMode;
            };
          };
        };
        const appearance = data.settings?.appearance;
        if (appearance?.experienceLevel) setLevel(appearance.experienceLevel);
        else if (appearance?.uiMode) setMode(appearance.uiMode);
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
  }, [setLevel, setMode, setColorScheme, setThemeMode]);

  return null;
}
