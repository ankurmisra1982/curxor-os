import "server-only";

import { experienceLevelFromGrowth } from "./os-growth-level";
import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromFre, resolveWorkGrowthLevel } from "./work-growth";
import { applyTemplatePack, seedNonprofitPresetIfEmpty } from "./work-template-packs";

/**
 * After Work Claw FRE — sync legacy experience tier from growth persona
 * unless the user explicitly chose Expert in Settings.
 */
export async function syncExperienceAfterWorkFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromFre(config);
  const settings = await readUserSettings();
  const growth = resolveWorkGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.workGrowthLevel ?? null,
  );
  const targetExperience = experienceLevelFromGrowth(growth);

  const explicitExpert =
    settings.appearance.experienceLevel === "expert" && settings.appearance.uiMode === "expert";
  if (explicitExpert) return;

  if (
    settings.appearance.experienceLevel === targetExperience &&
    settings.appearance.uiMode === (targetExperience === "expert" ? "expert" : "simple")
  ) {
    return;
  }

  await updateUserSettings({
    appearance: {
      experienceLevel: targetExperience,
      uiMode: targetExperience === "expert" ? "expert" : "simple",
    },
  });
}

/** FRE completion side effects: template pack + nonprofit seed. */
export async function bootstrapWorkGrowthDesk(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromFre(config);
  const packId =
    typeof enriched.defaultTemplatePack === "string" ? enriched.defaultTemplatePack : undefined;
  if (packId) {
    await applyTemplatePack(packId).catch(() => undefined);
  }
  if (enriched.growthIntent === "nonprofit_advocacy") {
    await seedNonprofitPresetIfEmpty().catch(() => undefined);
  }
}
