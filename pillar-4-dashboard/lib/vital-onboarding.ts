import "server-only";

import { experienceLevelFromGrowth } from "./os-growth-level";
import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromVitalFre, resolveVitalGrowthLevel } from "./vital-growth";

export async function syncExperienceAfterVitalFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromVitalFre(config);
  const settings = await readUserSettings();
  const growth = resolveVitalGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.vitalGrowthLevel ?? null,
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

export async function ensureBeginnerExperienceAfterVitalFre(): Promise<void> {
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
