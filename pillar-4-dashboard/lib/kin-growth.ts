import type { ExperienceLevel } from "./experience-level";
import {
  type KinGrowthIntent,
  KIN_INTENT_TO_GROWTH,
  KIN_GROWTH_INTENT_LABELS,
  type GrowthLevel,
  experienceLevelFromGrowth,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

export function isKinGrowthIntent(v: unknown): v is KinGrowthIntent {
  return typeof v === "string" && v in KIN_INTENT_TO_GROWTH;
}

export function growthFromKinIntent(intent: KinGrowthIntent): GrowthLevel {
  return KIN_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel when Kin FRE config is saved. */
export function applyGrowthFromKinFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isKinGrowthIntent(config.growthIntent)) {
    next.growthLevel = KIN_INTENT_TO_GROWTH[config.growthIntent];
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

export function resolveKinGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isKinGrowthIntent(config?.growthIntent)) return KIN_INTENT_TO_GROWTH[config.growthIntent];
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromKinGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface KinGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: KinGrowthIntent | null;
}

export function buildKinGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): KinGrowthProfile {
  const growthLevel = resolveKinGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isKinGrowthIntent(config?.growthIntent) ? config.growthIntent : null;
  return {
    growthLevel,
    growthLabel: growthLabel("my-family", growthLevel),
    growthIntent,
  };
}

export { KIN_GROWTH_INTENT_LABELS };
