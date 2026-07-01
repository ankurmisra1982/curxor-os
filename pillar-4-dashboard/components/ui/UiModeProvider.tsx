"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  EXPERIENCE_LEVEL_DESCRIPTIONS,
  EXPERIENCE_LEVEL_LABELS,
  meetsExperienceLevel,
  resolveExperienceLevel,
  type ExperienceLevel,
  type UiMode,
} from "@/lib/experience-level";

export type { UiMode, ExperienceLevel };

interface ExperienceContextValue {
  layoutMode: UiMode;
  /** @deprecated use layoutMode */
  mode: UiMode;
  level: ExperienceLevel;
  isEssential: boolean;
  isBeginner: boolean;
  isStandard: boolean;
  isExpert: boolean;
  isLayoutExpert: boolean;
  /** @deprecated use isLayoutExpert */
  isExpertLegacy: boolean;
  setLevel: (level: ExperienceLevel) => void;
  setLayoutMode: (mode: UiMode) => void;
  /** @deprecated use setLayoutMode */
  setMode: (mode: UiMode) => void;
  toggleLayout: () => void;
  /** @deprecated use toggleLayout */
  toggleMode: () => void;
  meetsLevel: (required: ExperienceLevel) => boolean;
  levelLabel: string;
  levelDescription: string;
}

const EXPERIENCE_STORAGE_KEY = "curxor-experience-level";
const LAYOUT_STORAGE_KEY = "curxor-layout-mode";
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
  const resolvedInitialLevel = initialLevel ?? resolveExperienceLevel(initialMode, null);
  const [level, setLevelState] = useState<ExperienceLevel>(resolvedInitialLevel);
  const [layoutMode, setLayoutModeState] = useState<UiMode>(initialMode);

  useEffect(() => {
    try {
      const storedLevel = localStorage.getItem(EXPERIENCE_STORAGE_KEY);
      if (
        storedLevel === "essential" ||
        storedLevel === "beginner" ||
        storedLevel === "standard" ||
        storedLevel === "expert"
      ) {
        setLevelState(storedLevel);
      }
      const storedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (storedLayout === "expert" || storedLayout === "simple") {
        setLayoutModeState(storedLayout);
        return;
      }
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy === "expert" || legacy === "simple") {
        setLayoutModeState(legacy);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const setLevel = useCallback((next: ExperienceLevel) => {
    setLevelState(next);
    try {
      localStorage.setItem(EXPERIENCE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setLayoutMode = useCallback((mode: UiMode) => {
    setLayoutModeState(mode);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
      localStorage.setItem(LEGACY_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLayout = useCallback(() => {
    setLayoutMode(layoutMode === "expert" ? "simple" : "expert");
  }, [layoutMode, setLayoutMode]);

  const isLayoutExpert = layoutMode === "expert";

  const value = useMemo(
    () => ({
      layoutMode,
      mode: layoutMode,
      level,
      isEssential: level === "essential",
      isBeginner: level === "beginner",
      isStandard: level === "standard",
      isExpert: level === "expert",
      isLayoutExpert,
      isExpertLegacy: isLayoutExpert,
      setLevel,
      setLayoutMode,
      setMode: setLayoutMode,
      toggleLayout,
      toggleMode: toggleLayout,
      meetsLevel: (required: ExperienceLevel) => meetsExperienceLevel(level, required),
      levelLabel: EXPERIENCE_LEVEL_LABELS[level],
      levelDescription: EXPERIENCE_LEVEL_DESCRIPTIONS[level],
    }),
    [layoutMode, level, setLevel, setLayoutMode, toggleLayout, isLayoutExpert],
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
