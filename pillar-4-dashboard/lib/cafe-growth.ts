import type { ExperienceLevel } from "./experience-level";
import {
  type GrowthLevel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

/** Derive Cafe growth level from FRE config or legacy experience tier. */
export function resolveCafeGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
): GrowthLevel {
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  return growthLevelFromExperience(experienceLevel);
}
