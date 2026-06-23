import type { ExperienceLevel } from "./experience-level";
import {
  type SwarmGrowthIntent,
  SWARM_INTENT_TO_GROWTH,
  SWARM_GROWTH_INTENT_LABELS,
  type GrowthLevel,
  experienceLevelFromGrowth,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

export function isSwarmGrowthIntent(v: unknown): v is SwarmGrowthIntent {
  return typeof v === "string" && v in SWARM_INTENT_TO_GROWTH;
}

export function growthFromSwarmIntent(intent: SwarmGrowthIntent): GrowthLevel {
  return SWARM_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel when Swarm FRE config is saved. */
export function applyGrowthFromSwarmFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isSwarmGrowthIntent(config.growthIntent)) {
    next.growthLevel = SWARM_INTENT_TO_GROWTH[config.growthIntent];
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

export function resolveSwarmGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isSwarmGrowthIntent(config?.growthIntent)) return SWARM_INTENT_TO_GROWTH[config.growthIntent];
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromSwarmGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface SwarmGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: SwarmGrowthIntent | null;
}

export function buildSwarmGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): SwarmGrowthProfile {
  const growthLevel = resolveSwarmGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isSwarmGrowthIntent(config?.growthIntent) ? config.growthIntent : null;
  return {
    growthLevel,
    growthLabel: growthLabel("robotaxi-fleet-manager", growthLevel),
    growthIntent,
  };
}

export { SWARM_GROWTH_INTENT_LABELS };
