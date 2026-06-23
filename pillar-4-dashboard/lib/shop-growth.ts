import type { ExperienceLevel } from "./experience-level";
import {
  type ShopGrowthIntent,
  SHOP_INTENT_TO_GROWTH,
  SHOP_GROWTH_INTENT_LABELS,
  type GrowthLevel,
  experienceLevelFromGrowth,
  growthLabel,
  growthLevelFromExperience,
  isGrowthLevel,
} from "./os-growth-level";

export function isShopGrowthIntent(v: unknown): v is ShopGrowthIntent {
  return typeof v === "string" && v in SHOP_INTENT_TO_GROWTH;
}

export function growthFromShopIntent(intent: ShopGrowthIntent): GrowthLevel {
  return SHOP_INTENT_TO_GROWTH[intent];
}

/** Derive growthLevel when Arbitrage FRE config is saved. */
export function applyGrowthFromShopFre(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  if (isShopGrowthIntent(config.growthIntent)) {
    next.growthLevel = SHOP_INTENT_TO_GROWTH[config.growthIntent];
  } else if (isGrowthLevel(config.growthLevel)) {
    next.growthLevel = config.growthLevel;
  }
  return next;
}

export function resolveShopGrowthLevel(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): GrowthLevel {
  if (settingsOverride && isGrowthLevel(settingsOverride)) return settingsOverride;
  if (config?.growthLevel && isGrowthLevel(config.growthLevel)) return config.growthLevel;
  if (isShopGrowthIntent(config?.growthIntent)) return SHOP_INTENT_TO_GROWTH[config.growthIntent];
  return growthLevelFromExperience(experienceLevel);
}

export function syncExperienceFromShopGrowth(growth: GrowthLevel): ExperienceLevel {
  return experienceLevelFromGrowth(growth);
}

export interface ShopGrowthProfile {
  growthLevel: GrowthLevel;
  growthLabel: string;
  growthIntent: ShopGrowthIntent | null;
}

export function buildShopGrowthProfile(
  config: Record<string, unknown> | undefined,
  experienceLevel: ExperienceLevel,
  settingsOverride?: GrowthLevel | null,
): ShopGrowthProfile {
  const growthLevel = resolveShopGrowthLevel(config, experienceLevel, settingsOverride);
  const growthIntent = isShopGrowthIntent(config?.growthIntent) ? config.growthIntent : null;
  return {
    growthLevel,
    growthLabel: growthLabel("my-shop", growthLevel),
    growthIntent,
  };
}

export { SHOP_GROWTH_INTENT_LABELS };
