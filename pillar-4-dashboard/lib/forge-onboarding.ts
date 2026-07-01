import "server-only";

import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromForgeFre, resolveForgeGrowthLevel } from "./forge-growth";

/** After Forge FRE — sync forgeGrowthLevel only; never mutates experienceLevel. */
export async function syncExperienceAfterForgeFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromForgeFre(config);
  const settings = await readUserSettings();
  const growth = resolveForgeGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.forgeGrowthLevel ?? null,
  );

  if (settings.appearance.forgeGrowthLevel === growth) {
    return;
  }

  await updateUserSettings({
    appearance: { forgeGrowthLevel: growth },
  });
}
