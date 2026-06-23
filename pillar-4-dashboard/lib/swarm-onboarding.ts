import "server-only";

import { experienceLevelFromGrowth } from "./os-growth-level";
import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromSwarmFre, resolveSwarmGrowthLevel } from "./swarm-growth";

export async function syncExperienceAfterSwarmFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromSwarmFre(config);
  const settings = await readUserSettings();
  const growth = resolveSwarmGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.swarmGrowthLevel ?? null,
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

export async function ensureBeginnerExperienceAfterSwarmFre(): Promise<void> {
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
