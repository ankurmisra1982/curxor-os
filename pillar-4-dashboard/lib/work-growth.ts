import type { ExperienceLevel } from "./experience-level";
import {
  type GrowthLevel,
  type WorkGrowthIntent,
  WORK_INTENT_TO_GROWTH,
  WORK_GROWTH_INTENT_LABELS,
  experienceLevelFromGrowth,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";
import { defaultTemplatePackForGrowth } from "./work-template-packs-data";

export const INTENT_DEFAULT_TEMPLATE_PACK: Record<WorkGrowthIntent, string> = {
  student_hobbies: "student_opportunities",
  side_hustle: "etsy_support",
  nonprofit_advocacy: "nonprofit_donor",
  solo_business: "solo_client",
  executive_team: "solo_client",
};

export function isWorkGrowthIntent(v: unknown): v is WorkGrowthIntent {
  return typeof v === "string" && v in WORK_INTENT_TO_GROWTH;
}

export function growthFromIntent(intent: WorkGrowthIntent): GrowthLevel {
  return WORK_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel + defaultTemplatePack when FRE config is saved. */
export function applyGrowthFromFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  let growth: GrowthLevel | null = null;
  if (isWorkGrowthIntent(config.growthIntent)) {
    growth = WORK_INTENT_TO_GROWTH[config.growthIntent];
    next.growthLevel = growth;
    if (!next.defaultTemplatePack) {
      next.defaultTemplatePack = INTENT_DEFAULT_TEMPLATE_PACK[config.growthIntent];
    }
  } else if (isGrowthLevel(config.growthLevel)) {
    growth = config.growthLevel;
  }
  if (!next.defaultTemplatePack && growth) {
    next.defaultTemplatePack = defaultTemplatePackForGrowth(growth, config.organizingFirst);
  }
  return next;
}

export function resolveWorkGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isWorkGrowthIntent(config?.growthIntent)) return WORK_INTENT_TO_GROWTH[config.growthIntent];
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface WorkGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: WorkGrowthIntent | null;
  defaultTemplatePack: string | null;
  organizingFirst: string | null;
}

export function buildWorkGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): WorkGrowthProfile {
  const growthLevel = resolveWorkGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isWorkGrowthIntent(config?.growthIntent) ? config.growthIntent : null;
  const organizingFirst = typeof config?.organizingFirst === "string" ? config.organizingFirst : null;
  const defaultTemplatePack =
    typeof config?.defaultTemplatePack === "string"
      ? config.defaultTemplatePack
      : defaultTemplatePackForGrowth(growthLevel, organizingFirst);

  return {
    growthLevel,
    growthLabel: growthLabel("my-work", growthLevel),
    growthIntent,
    defaultTemplatePack,
    organizingFirst,
  };
}

export { WORK_GROWTH_INTENT_LABELS };
