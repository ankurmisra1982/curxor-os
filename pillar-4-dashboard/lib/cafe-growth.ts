import type { ExperienceLevel } from "./experience-level";
import {
  type GrowthLevel,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

/** Derive growthLevel when Claw Cafe FRE config is saved. */
export function applyGrowthFromCafeFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isGrowthLevel(config.cafeGrowthIntent)) {
    next.growthLevel = config.cafeGrowthIntent;
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

/** Derive Cafe growth level from FRE cafeGrowthIntent, growthLevel, or experience tier. */
export function resolveCafeGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isGrowthLevel(config?.cafeGrowthIntent)) return config.cafeGrowthIntent;
  return growthLevelFromExperience(experienceLevel);
}

export interface CafeGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  cafeGrowthIntent: GrowthLevel | null;
}

export function buildCafeGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): CafeGrowthProfile {
  const growthLevel = resolveCafeGrowthLevel(config, experienceLevel, settingsOverride);
  const cafeGrowthIntent = isGrowthLevel(config?.cafeGrowthIntent) ? config.cafeGrowthIntent : null;
  return {
    growthLevel,
    growthLabel: growthLabel("claw-cafe", growthLevel),
    cafeGrowthIntent,
  };
}
