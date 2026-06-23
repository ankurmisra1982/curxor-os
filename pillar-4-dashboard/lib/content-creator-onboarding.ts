import "server-only";

import { experienceLevelFromGrowth } from "./os-growth-level";
import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromCreatorFre, resolveCreatorGrowthLevel } from "./creator-growth";

/**
 * After Creator Claw FRE — sync legacy experience tier from growth persona
 * unless the user explicitly chose Expert in Settings.
 */
export async function syncExperienceAfterCreatorFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromCreatorFre(config);
  const settings = await readUserSettings();
  const growth = resolveCreatorGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.creatorGrowthLevel ?? null,
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

/**
 * First Creator Claw FRE completion — nudge operators into Beginner mode
 * unless they already chose Expert in Settings (both uiMode and experienceLevel).
 */
export async function ensureBeginnerExperienceAfterCreatorFre(): Promise<void> {
  const settings = await readUserSettings();
  const explicitExpert =
    settings.appearance.experienceLevel === "expert" && settings.appearance.uiMode === "expert";

  if (explicitExpert) return;

  if (settings.appearance.experienceLevel === "beginner" && settings.appearance.uiMode === "simple") {
    return;
  }

  await updateUserSettings({
    appearance: {
      experienceLevel: "beginner",
      uiMode: "simple",
    },
  });
}
