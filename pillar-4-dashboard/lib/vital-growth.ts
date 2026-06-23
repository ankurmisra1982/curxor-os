import type { ExperienceLevel } from "./experience-level";
import {
  type VitalGrowthIntent,
  VITAL_INTENT_TO_GROWTH,
  VITAL_GROWTH_INTENT_LABELS,
  type GrowthLevel,
  experienceLevelFromGrowth,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

export function isVitalGrowthIntent(v: unknown): v is VitalGrowthIntent {
  return typeof v === "string" && v in VITAL_INTENT_TO_GROWTH;
}

export function growthFromVitalIntent(intent: VitalGrowthIntent): GrowthLevel {
  return VITAL_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel when Vital FRE config is saved. */
export function applyGrowthFromVitalFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isVitalGrowthIntent(config.growthIntent)) {
    next.growthLevel = VITAL_INTENT_TO_GROWTH[config.growthIntent];
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

export function resolveVitalGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isVitalGrowthIntent(config?.growthIntent)) return VITAL_INTENT_TO_GROWTH[config.growthIntent];
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromVitalGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface VitalGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: VitalGrowthIntent | null;
}

export function buildVitalGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): VitalGrowthProfile {
  const growthLevel = resolveVitalGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isVitalGrowthIntent(config?.growthIntent) ? config.growthIntent : null;
  return {
    growthLevel,
    growthLabel: growthLabel("my-vital", growthLevel),
    growthIntent,
  };
}

export { VITAL_GROWTH_INTENT_LABELS };
