import type { ExperienceLevel } from "./experience-level";
import {
  type GrowthLevel,
  experienceLevelFromGrowth,
  meetsGrowthLevel,
} from "./os-growth-level";

const LEGACY_ORDER: Record<ExperienceLevel, number> = {
  beginner: 0,
  standard: 1,
  expert: 2,
};

/** Map growth level to legacy 3-tier gate for unmigrated ExperienceAppSection panels. */
export function capitalLegacyExperience(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

/** Whether growth meets a legacy minLevel on unmigrated sections (CL2+ replaces with section matrix). */
export function capitalMeetsLegacyExperience(growth: GrowthLevel, minLevel: ExperienceLevel): boolean {
  const mapped = capitalLegacyExperience(growth);
  return LEGACY_ORDER[mapped] >= LEGACY_ORDER[minLevel];
}

export function capitalMeetsGrowth(user: GrowthLevel, required: GrowthLevel): boolean {
  return meetsGrowthLevel(user, required);
}
