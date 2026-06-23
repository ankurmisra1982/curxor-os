import type { ExperienceLevel } from "./experience-level";
import {
  type CreatorGrowthIntent,
  CREATOR_INTENT_TO_GROWTH,
  CREATOR_GROWTH_INTENT_LABELS,
  type GrowthLevel,
  experienceLevelFromGrowth,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

export function isCreatorGrowthIntent(v: unknown): v is CreatorGrowthIntent {
  return typeof v === "string" && v in CREATOR_INTENT_TO_GROWTH;
}

export function growthFromCreatorIntent(intent: CreatorGrowthIntent): GrowthLevel {
  return CREATOR_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel when Creator FRE config is saved. */
export function applyGrowthFromCreatorFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isCreatorGrowthIntent(config.growthIntent)) {
    next.growthLevel = CREATOR_INTENT_TO_GROWTH[config.growthIntent];
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

export function resolveCreatorGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isCreatorGrowthIntent(config?.growthIntent)) return CREATOR_INTENT_TO_GROWTH[config.growthIntent];
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromCreatorGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface CreatorGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: CreatorGrowthIntent | null;
}

export function buildCreatorGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): CreatorGrowthProfile {
  const growthLevel = resolveCreatorGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isCreatorGrowthIntent(config?.growthIntent) ? config.growthIntent : null;
  return {
    growthLevel,
    growthLabel: growthLabel("my-content-creator", growthLevel),
    growthIntent,
  };
}

export { CREATOR_GROWTH_INTENT_LABELS };
