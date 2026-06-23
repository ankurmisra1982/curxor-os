import "server-only";

import { experienceLevelFromGrowth } from "./os-growth-level";
import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromForgeFre, resolveForgeGrowthLevel } from "./forge-growth";

/**
 * After Forge FRE — sync legacy experience tier + forgeGrowthLevel from persona
 * unless the user explicitly chose Expert in Settings.
 */
export async function syncExperienceAfterForgeFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromForgeFre(config);
  const settings = await readUserSettings();
  const growth = resolveForgeGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.forgeGrowthLevel ?? null,
  );
  const targetExperience = experienceLevelFromGrowth(growth);

  const explicitExpert =
    settings.appearance.experienceLevel === "expert" && settings.appearance.uiMode === "expert";
  if (explicitExpert) {
    if (settings.appearance.forgeGrowthLevel !== growth) {
      await updateUserSettings({ appearance: { forgeGrowthLevel: growth } });
    }
    return;
  }

  const targetUiMode = targetExperience === "expert" ? "expert" : "simple";
  if (
    settings.appearance.experienceLevel === targetExperience &&
    settings.appearance.uiMode === targetUiMode &&
    settings.appearance.forgeGrowthLevel === growth
  ) {
    return;
  }

  await updateUserSettings({
    appearance: {
      experienceLevel: targetExperience,
      uiMode: targetUiMode,
      forgeGrowthLevel: growth,
    },
  });
}
