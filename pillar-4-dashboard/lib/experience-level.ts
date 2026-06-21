/** Shared experience level types — safe for client and server. */

export type ExperienceLevel = "beginner" | "standard" | "expert";

/** @deprecated use ExperienceLevel — kept for settings backward compatibility */
export type UiMode = "simple" | "expert";

export const EXPERIENCE_LEVELS: ExperienceLevel[] = ["beginner", "standard", "expert"];

export const EXPERIENCE_LEVEL_ORDER: Record<ExperienceLevel, number> = {
  beginner: 0,
  standard: 1,
  expert: 2,
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  standard: "Standard",
  expert: "Expert",
};

export const EXPERIENCE_LEVEL_DESCRIPTIONS: Record<ExperienceLevel, string> = {
  beginner: "Guided workflow — tips, fewer panels, essentials only",
  standard: "Full creator tools with contextual suggestions",
  expert: "All panels, mesh telemetry, advanced ops & experiments",
};

export function isExperienceLevel(v: unknown): v is ExperienceLevel {
  return v === "beginner" || v === "standard" || v === "expert";
}

export function isUiMode(v: unknown): v is UiMode {
  return v === "simple" || v === "expert";
}

export function meetsExperienceLevel(user: ExperienceLevel, required: ExperienceLevel): boolean {
  return EXPERIENCE_LEVEL_ORDER[user] >= EXPERIENCE_LEVEL_ORDER[required];
}

/** Map legacy uiMode + optional new field to canonical level. */
export function resolveExperienceLevel(
  uiMode: UiMode,
  experienceLevel?: ExperienceLevel | null,
): ExperienceLevel {
  if (experienceLevel && isExperienceLevel(experienceLevel)) return experienceLevel;
  return uiMode === "expert" ? "expert" : "beginner";
}

export function uiModeFromExperienceLevel(level: ExperienceLevel): UiMode {
  return level === "expert" ? "expert" : "simple";
}

export function experienceLevelFromUiMode(mode: UiMode): ExperienceLevel {
  return mode === "expert" ? "expert" : "beginner";
}
