"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  EXPERIENCE_LEVEL_DESCRIPTIONS,
  EXPERIENCE_LEVEL_LABELS,
  experienceLevelFromUiMode,
  meetsExperienceLevel,
  resolveExperienceLevel,
  uiModeFromExperienceLevel,
  type ExperienceLevel,
  type UiMode,
} from "@/lib/experience-level";

export type { UiMode, ExperienceLevel };

interface ExperienceContextValue {
  /** @deprecated use level */
  mode: UiMode;
  level: ExperienceLevel;
  isEssential: boolean;
  isBeginner: boolean;
  isStandard: boolean;
  isExpert: boolean;
  /** @deprecated use isExpert */
  isExpertLegacy: boolean;
  setLevel: (level: ExperienceLevel) => void;
  /** @deprecated use setLevel */
  setMode: (mode: UiMode) => void;
  toggleMode: () => void;
  meetsLevel: (required: ExperienceLevel) => boolean;
  levelLabel: string;
  levelDescription: string;
}

const STORAGE_KEY = "curxor-experience-level";
const LEGACY_STORAGE_KEY = "curxor-ui-mode";

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function UiModeProvider({
  children,
  initialMode = "simple",
  initialLevel,
}: {
  children: ReactNode;
  initialMode?: UiMode;
  initialLevel?: ExperienceLevel;
}) {
  const resolvedInitial = initialLevel ?? resolveExperienceLevel(initialMode, null);
  const [level, setLevelState] = useState<ExperienceLevel>(resolvedInitial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (
        stored === "essential" ||
        stored === "beginner" ||
        stored === "standard" ||
        stored === "expert"
      ) {
        setLevelState(stored);
        return;
      }
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy === "expert" || legacy === "simple") {
        setLevelState(experienceLevelFromUiMode(legacy));
      }
    } catch {
      /* private mode */
    }
  }, []);

  const setLevel = useCallback((next: ExperienceLevel) => {
    setLevelState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem(LEGACY_STORAGE_KEY, uiModeFromExperienceLevel(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback(
    (mode: UiMode) => {
      setLevel(experienceLevelFromUiMode(mode));
    },
    [setLevel],
  );

  const toggleMode = useCallback(() => {
    if (level === "essential") return;
    setLevel(level === "expert" ? "beginner" : "expert");
  }, [level, setLevel]);

  const mode = uiModeFromExperienceLevel(level);

  const value = useMemo(
    () => ({
      mode,
      level,
      isEssential: level === "essential",
      isBeginner: level === "beginner",
      isStandard: level === "standard",
      isExpert: level === "expert",
      isExpertLegacy: level === "expert",
      setLevel,
      setMode,
      toggleMode,
      meetsLevel: (required: ExperienceLevel) => meetsExperienceLevel(level, required),
      levelLabel: EXPERIENCE_LEVEL_LABELS[level],
      levelDescription: EXPERIENCE_LEVEL_DESCRIPTIONS[level],
    }),
    [level, mode, setLevel, setMode, toggleMode],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperienceLevel(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperienceLevel must be used within UiModeProvider");
  return ctx;
}

/** @deprecated use useExperienceLevel */
export function useUiMode(): ExperienceContextValue {
  return useExperienceLevel();
}
