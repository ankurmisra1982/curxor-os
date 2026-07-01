"use client";

import { useEffect, useRef } from "react";

import type { TextScale } from "@/lib/user-settings-types";
import { applyTextScale } from "@/lib/text-scale";
import type { ExperienceLevel } from "@/lib/experience-level";
import type { ColorScheme, ThemeMode, UiMode } from "@/lib/user-settings-types";

import { useTheme } from "./ThemeProvider";
import { useExperienceLevel } from "./UiModeProvider";

interface SettingsBootstrapProps {
  initialUiMode?: UiMode;
  initialExperienceLevel?: ExperienceLevel;
  initialColorScheme?: ColorScheme;
  initialThemeMode?: ThemeMode;
  initialTextScale?: TextScale;
}

export function SettingsBootstrap({
  initialExperienceLevel,
  initialColorScheme,
  initialThemeMode,
  initialTextScale,
}: SettingsBootstrapProps) {
  const { setLevel } = useExperienceLevel();
  const { setColorScheme, setThemeMode } = useTheme();

  const setLevelRef = useRef(setLevel);
  const setColorSchemeRef = useRef(setColorScheme);
  const setThemeModeRef = useRef(setThemeMode);
  setLevelRef.current = setLevel;
  setColorSchemeRef.current = setColorScheme;
  setThemeModeRef.current = setThemeMode;

  useEffect(() => {
    if (initialExperienceLevel) setLevelRef.current(initialExperienceLevel);
    if (initialColorScheme) setColorSchemeRef.current(initialColorScheme);
    if (initialThemeMode) setThemeModeRef.current(initialThemeMode);
    if (initialTextScale) applyTextScale(initialTextScale);
  }, [initialExperienceLevel, initialColorScheme, initialThemeMode, initialTextScale]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          settings?: {
            appearance?: {
              experienceLevel?: ExperienceLevel;
              colorScheme?: ColorScheme;
              themeMode?: ThemeMode;
              textScale?: TextScale;
            };
          };
        };
        const appearance = data.settings?.appearance;
        if (appearance?.experienceLevel) {
          setLevelRef.current(appearance.experienceLevel);
        }
        if (appearance?.colorScheme) setColorSchemeRef.current(appearance.colorScheme);
        if (appearance?.themeMode) setThemeModeRef.current(appearance.themeMode);
        if (appearance?.textScale) applyTextScale(appearance.textScale);
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
