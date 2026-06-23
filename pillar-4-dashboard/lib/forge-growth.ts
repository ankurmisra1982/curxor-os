import type { ExperienceLevel } from "./experience-level";
import {
  type ForgeGrowthIntent,
  FORGE_INTENT_TO_GROWTH,
  FORGE_GROWTH_INTENT_LABELS,
  type GrowthLevel,
  experienceLevelFromGrowth,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";
import { forgePersonaLabel } from "./forge-level-copy";

export function isForgeGrowthIntent(v: unknown): v is ForgeGrowthIntent {
  return typeof v === "string" && v in FORGE_INTENT_TO_GROWTH;
}

export function growthFromForgeIntent(intent: ForgeGrowthIntent): GrowthLevel {
  return FORGE_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel when Forge FRE config is saved. */
export function applyGrowthFromForgeFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isForgeGrowthIntent(config.forgeGrowthIntent)) {
    next.growthLevel = FORGE_INTENT_TO_GROWTH[config.forgeGrowthIntent];
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

export function resolveForgeGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isForgeGrowthIntent(config?.forgeGrowthIntent)) {
    return FORGE_INTENT_TO_GROWTH[config.forgeGrowthIntent];
  }
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromForgeGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface ForgeGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: ForgeGrowthIntent | null;
}

export function buildForgeGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): ForgeGrowthProfile {
  const growthLevel = resolveForgeGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isForgeGrowthIntent(config?.forgeGrowthIntent) ? config.forgeGrowthIntent : null;
  return {
    growthLevel,
    growthLabel: forgePersonaLabel(growthLevel),
    growthIntent,
  };
}

export { FORGE_GROWTH_INTENT_LABELS };
