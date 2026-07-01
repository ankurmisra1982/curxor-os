import type { ExperienceLevel } from "./experience-level";
import { EXPERIENCE_LEVEL_ORDER } from "./experience-level";
import {
  type GrowthLevel,
  experienceLevelFromGrowth,
  meetsGrowthLevel,
} from "./os-growth-level";

/** Map growth level to legacy tier gate for unmigrated ExperienceAppSection panels. */
export function capitalLegacyExperience(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

/** Whether growth meets a legacy minLevel on unmigrated sections (CL2+ replaces with section matrix). */
export function capitalMeetsLegacyExperience(growth: GrowthLevel, minLevel: ExperienceLevel): boolean {
  const mapped = capitalLegacyExperience(growth);
  return EXPERIENCE_LEVEL_ORDER[mapped] >= EXPERIENCE_LEVEL_ORDER[minLevel];
}

export function capitalMeetsGrowth(user: GrowthLevel, required: GrowthLevel): boolean {
  return meetsGrowthLevel(user, required);
}
