import type { ExperienceLevel } from "./experience-level";
import {
  type CapitalGrowthIntent,
  CAPITAL_INTENT_TO_GROWTH,
  CAPITAL_GROWTH_INTENT_LABELS,
  type GrowthLevel,
  experienceLevelFromGrowth,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

export function isCapitalGrowthIntent(v: unknown): v is CapitalGrowthIntent {
  return typeof v === "string" && v in CAPITAL_INTENT_TO_GROWTH;
}

export function growthFromCapitalIntent(intent: CapitalGrowthIntent): GrowthLevel {
  return CAPITAL_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel when Capital FRE config is saved. */
export function applyGrowthFromCapitalFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isCapitalGrowthIntent(config.growthIntent)) {
    next.growthLevel = CAPITAL_INTENT_TO_GROWTH[config.growthIntent];
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

export function resolveCapitalGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isCapitalGrowthIntent(config?.growthIntent)) return CAPITAL_INTENT_TO_GROWTH[config.growthIntent];
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromCapitalGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface CapitalGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: CapitalGrowthIntent | null;
}

export function buildCapitalGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): CapitalGrowthProfile {
  const growthLevel = resolveCapitalGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isCapitalGrowthIntent(config?.growthIntent) ? config.growthIntent : null;
  return {
    growthLevel,
    growthLabel: growthLabel("my-capital", growthLevel),
    growthIntent,
  };
}

export { CAPITAL_GROWTH_INTENT_LABELS };
