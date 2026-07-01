import "server-only";

import { readUserSettings, updateUserSettings } from "./user-settings";
import { applyGrowthFromFre, resolveWorkGrowthLevel } from "./work-growth";
import { applyTemplatePack, seedNonprofitPresetIfEmpty } from "./work-template-packs";

/** After Work FRE — sync workGrowthLevel only; never mutates experienceLevel. */
export async function syncExperienceAfterWorkFre(config: Record<string, unknown>): Promise<void> {
  const enriched = applyGrowthFromFre(config);
  const settings = await readUserSettings();
  const growth = resolveWorkGrowthLevel(
    enriched,
    settings.appearance.experienceLevel,
    settings.appearance.workGrowthLevel ?? null,
  );

  if (settings.appearance.workGrowthLevel === growth) {
    return;
  }

  await updateUserSettings({
    appearance: { workGrowthLevel: growth },
  });
}

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
