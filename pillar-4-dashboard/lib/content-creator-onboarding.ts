import "server-only";

import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromCreatorFre, resolveCreatorGrowthLevel } from "./creator-growth";

/** After Creator FRE — sync creatorGrowthLevel only; never mutates experienceLevel. */
export async function syncExperienceAfterCreatorFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromCreatorFre(config);
  const settings = await readUserSettings();
  const growth = resolveCreatorGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.creatorGrowthLevel ?? null,
  );

  if (settings.appearance.creatorGrowthLevel === growth) {
    return;
  }

  await updateUserSettings({
    appearance: { creatorGrowthLevel: growth },
  });
}

/** @deprecated FRE no longer nudges global experience tier. */
export async function ensureBeginnerExperienceAfterCreatorFre(): Promise<void> {
  /* UX-7 no-op */
}
