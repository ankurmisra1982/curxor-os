import { applyGrowthFromShopFre, resolveShopGrowthLevel, syncExperienceFromShopGrowth } from "./shop-growth";
import { readUserSettings, updateUserSettings } from "./user-settings";

export async function syncExperienceAfterShopFre(config: Record<string, unknown>): Promise<void> {
  const settings = await readUserSettings();
  const growth = resolveShopGrowthLevel(config, settings.appearance.experienceLevel, null);
  const experienceLevel = syncExperienceFromShopGrowth(growth);
  if (settings.appearance.experienceLevel === experienceLevel) return;
  await updateUserSettings({
    appearance: { experienceLevel },
  });
}

export { applyGrowthFromShopFre };
