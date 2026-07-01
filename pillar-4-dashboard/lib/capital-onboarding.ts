import "server-only";

import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromCapitalFre, resolveCapitalGrowthLevel } from "./capital-growth";

/** After Capital FRE — sync capitalGrowthLevel only; never mutates experienceLevel. */
export async function syncExperienceAfterCapitalFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromCapitalFre(config);
  const settings = await readUserSettings();
  const growth = resolveCapitalGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.capitalGrowthLevel ?? null,
  );

  if (settings.appearance.capitalGrowthLevel === growth) {
    return;
  }

  await updateUserSettings({
    appearance: { capitalGrowthLevel: growth },
  });
}

/** @deprecated FRE no longer nudges global experience tier. */
export async function ensureBeginnerExperienceAfterCapitalFre(): Promise<void> {
  /* UX-7 no-op */
}
