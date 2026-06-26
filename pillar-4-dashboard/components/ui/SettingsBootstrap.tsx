"use client";

import { useEffect, useRef } from "react";

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

  const setLevelRef = useRef(setLevel);
  const setModeRef = useRef(setMode);
  const setColorSchemeRef = useRef(setColorScheme);
  const setThemeModeRef = useRef(setThemeMode);
  setLevelRef.current = setLevel;
  setModeRef.current = setMode;
  setColorSchemeRef.current = setColorScheme;
  setThemeModeRef.current = setThemeMode;

  // Layout SSR props — applied once before the API round-trip.
  useEffect(() => {
    if (initialExperienceLevel) setLevelRef.current(initialExperienceLevel);
    else if (initialUiMode) setModeRef.current(initialUiMode);
    if (initialColorScheme) setColorSchemeRef.current(initialColorScheme);
    if (initialThemeMode) setThemeModeRef.current(initialThemeMode);
  }, [initialExperienceLevel, initialUiMode, initialColorScheme, initialThemeMode]);

  // Saved server settings win on cold load (over layout props and localStorage).
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
        if (appearance?.experienceLevel) setLevelRef.current(appearance.experienceLevel);
        else if (appearance?.uiMode) setModeRef.current(appearance.uiMode);
        if (appearance?.colorScheme) setColorSchemeRef.current(appearance.colorScheme);
        if (appearance?.themeMode) setThemeModeRef.current(appearance.themeMode);
      } catch {
        /* offline */
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
