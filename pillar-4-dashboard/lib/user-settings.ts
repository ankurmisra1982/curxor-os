import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getProviderApiKey, hasProviderOAuth } from "./llm-credentials";
import { readFreState, writeFreState, validateAppIds } from "./fre-state";
import type { OotbAppId } from "./ootb-apps";
import {
  isExperienceLevel,
  isUiMode,
  resolveExperienceLevel,
  uiModeFromExperienceLevel,
  type ExperienceLevel,
} from "./experience-level";
import { isGrowthLevel } from "./os-growth-level";
import {
  DEFAULT_USER_SETTINGS,
  getUserSettingsPath,
  isBuildPlaneLinkStatus,
  isBuildPlaneWorkerStatus,
  type ColorScheme,
  type IntelligenceSource,
  type ThemeMode,
  type UiMode,
  type UserSettings,
  type UserSettingsPatch,
  DEFAULT_BUILD_PLANE,
} from "./user-settings-types";
import { sanitizeBuildPlane } from "./build-plane";

function isColorScheme(v: unknown): v is ColorScheme {
  return v === "curxor" || v === "ocean" || v === "amber" || v === "mono";
}

function isIntelligenceSource(v: unknown): v is IntelligenceSource {
  return v === "local" || v === "frontier" || v === "auto";
}

function isThemeMode(v: unknown): v is ThemeMode {
  return v === "dark" || v === "light" || v === "system";
}

function mergeBuildPlane(
  partial: UserSettingsPatch["buildPlane"],
  base: UserSettings["buildPlane"],
): UserSettings["buildPlane"] {
  const src = partial ?? {};
  const linkStatus = isBuildPlaneLinkStatus(src.linkStatus) ? src.linkStatus : base.linkStatus;
  const linkedAt =
    src.linkedAt === null
      ? null
      : typeof src.linkedAt === "string"
        ? src.linkedAt
        : linkStatus === "linked" && !base.linkedAt
          ? new Date().toISOString()
          : base.linkedAt;
  return {
    enabled: typeof src.enabled === "boolean" ? src.enabled : base.enabled,
    linkStatus,
    linkedAt: linkStatus === "disconnected" ? null : linkedAt,
    workerStatus: isBuildPlaneWorkerStatus(src.workerStatus) ? src.workerStatus : base.workerStatus,
    allowDelegation: typeof src.allowDelegation === "boolean" ? src.allowDelegation : base.allowDelegation,
    allowWriteTools: typeof src.allowWriteTools === "boolean" ? src.allowWriteTools : base.allowWriteTools,
    webhookSecret:
      src.webhookSecret === null
        ? null
        : typeof src.webhookSecret === "string"
          ? src.webhookSecret
          : base.webhookSecret,
  };
}

function mergeSettings(partial: UserSettingsPatch, base: UserSettings): UserSettings {
  const uiMode = isUiMode(partial.appearance?.uiMode) ? partial.appearance.uiMode : base.appearance.uiMode;
  const experienceLevel: ExperienceLevel = isExperienceLevel(partial.appearance?.experienceLevel)
    ? partial.appearance.experienceLevel
    : isExperienceLevel(base.appearance.experienceLevel)
      ? base.appearance.experienceLevel
      : resolveExperienceLevel(uiMode, null);
  const syncedUiMode = isExperienceLevel(partial.appearance?.experienceLevel)
    ? uiModeFromExperienceLevel(partial.appearance.experienceLevel)
    : uiMode;

  return {
    version: 1,
    selectedApps: Array.isArray(partial.selectedApps)
      ? validateAppIds(partial.selectedApps.map(String))
      : base.selectedApps,
    forgedAppSlugs: Array.isArray(partial.forgedAppSlugs)
      ? partial.forgedAppSlugs.map(String).filter(Boolean)
      : base.forgedAppSlugs ?? [],
    appearance: {
      uiMode: syncedUiMode,
      experienceLevel,
      workGrowthLevel:
        partial.appearance?.workGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.workGrowthLevel)
            ? partial.appearance.workGrowthLevel
            : isGrowthLevel(base.appearance.workGrowthLevel)
              ? base.appearance.workGrowthLevel
              : null,
      creatorGrowthLevel:
        partial.appearance?.creatorGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.creatorGrowthLevel)
            ? partial.appearance.creatorGrowthLevel
            : isGrowthLevel(base.appearance.creatorGrowthLevel)
              ? base.appearance.creatorGrowthLevel
              : null,
      capitalGrowthLevel:
        partial.appearance?.capitalGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.capitalGrowthLevel)
            ? partial.appearance.capitalGrowthLevel
            : isGrowthLevel(base.appearance.capitalGrowthLevel)
              ? base.appearance.capitalGrowthLevel
              : null,
      vitalGrowthLevel:
        partial.appearance?.vitalGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.vitalGrowthLevel)
            ? partial.appearance.vitalGrowthLevel
            : isGrowthLevel(base.appearance.vitalGrowthLevel)
              ? base.appearance.vitalGrowthLevel
              : null,
      forgeGrowthLevel:
        partial.appearance?.forgeGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.forgeGrowthLevel)
            ? partial.appearance.forgeGrowthLevel
            : isGrowthLevel(base.appearance.forgeGrowthLevel)
              ? base.appearance.forgeGrowthLevel
              : null,
      swarmGrowthLevel:
        partial.appearance?.swarmGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.swarmGrowthLevel)
            ? partial.appearance.swarmGrowthLevel
            : isGrowthLevel(base.appearance.swarmGrowthLevel)
              ? base.appearance.swarmGrowthLevel
              : null,
      shopGrowthLevel:
        partial.appearance?.shopGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.shopGrowthLevel)
            ? partial.appearance.shopGrowthLevel
            : isGrowthLevel(base.appearance.shopGrowthLevel)
              ? base.appearance.shopGrowthLevel
              : null,
      kinGrowthLevel:
        partial.appearance?.kinGrowthLevel === null
          ? null
          : isGrowthLevel(partial.appearance?.kinGrowthLevel)
            ? partial.appearance.kinGrowthLevel
            : isGrowthLevel(base.appearance.kinGrowthLevel)
              ? base.appearance.kinGrowthLevel
              : null,
      workGamificationOptOut:
        typeof partial.appearance?.workGamificationOptOut === "boolean"
          ? partial.appearance.workGamificationOptOut
          : base.appearance.workGamificationOptOut === true,
      cafeTitleStyle:
        partial.appearance?.cafeTitleStyle === "neutral" || partial.appearance?.cafeTitleStyle === "mythic"
          ? partial.appearance.cafeTitleStyle
          : base.appearance.cafeTitleStyle ?? "mythic",
      colorScheme: isColorScheme(partial.appearance?.colorScheme)
        ? partial.appearance.colorScheme
        : base.appearance.colorScheme,
      themeMode: isThemeMode(partial.appearance?.themeMode)
        ? partial.appearance.themeMode
        : base.appearance.themeMode ?? "dark",
    },
    intelligence: {
      primarySource: isIntelligenceSource(partial.intelligence?.primarySource)
        ? partial.intelligence.primarySource
        : base.intelligence.primarySource,
      localModel:
        typeof partial.intelligence?.localModel === "string"
          ? partial.intelligence.localModel
          : base.intelligence.localModel,
      frontierProviderId:
        typeof partial.intelligence?.frontierProviderId === "string"
          ? partial.intelligence.frontierProviderId
          : partial.intelligence?.frontierProviderId === null
            ? null
            : base.intelligence.frontierProviderId,
      frontierModel:
        typeof partial.intelligence?.frontierModel === "string"
          ? partial.intelligence.frontierModel
          : partial.intelligence?.frontierModel === null
            ? null
            : base.intelligence.frontierModel,
      allowFrontierForChat:
        typeof partial.intelligence?.allowFrontierForChat === "boolean"
          ? partial.intelligence.allowFrontierForChat
          : base.intelligence.allowFrontierForChat,
      allowFrontierForPlanning:
        typeof partial.intelligence?.allowFrontierForPlanning === "boolean"
          ? partial.intelligence.allowFrontierForPlanning
          : base.intelligence.allowFrontierForPlanning,
      connectedProviders:
        partial.intelligence?.connectedProviders && typeof partial.intelligence.connectedProviders === "object"
          ? { ...base.intelligence.connectedProviders, ...partial.intelligence.connectedProviders }
          : base.intelligence.connectedProviders,
    },
    multiModel: {
      enabled:
        typeof partial.multiModel?.enabled === "boolean"
          ? partial.multiModel.enabled
          : base.multiModel.enabled,
      planningProviderId:
        typeof partial.multiModel?.planningProviderId === "string"
          ? partial.multiModel.planningProviderId
          : partial.multiModel?.planningProviderId === null
            ? null
            : base.multiModel.planningProviderId,
      codingProviderId:
        typeof partial.multiModel?.codingProviderId === "string"
          ? partial.multiModel.codingProviderId
          : partial.multiModel?.codingProviderId === null
            ? null
            : base.multiModel.codingProviderId,
      longContextProviderId:
        typeof partial.multiModel?.longContextProviderId === "string"
          ? partial.multiModel.longContextProviderId
          : partial.multiModel?.longContextProviderId === null
            ? null
            : base.multiModel.longContextProviderId,
    },
    mcp: {
      enabled: typeof partial.mcp?.enabled === "boolean" ? partial.mcp.enabled : base.mcp.enabled,
      servers: Array.isArray(partial.mcp?.servers) ? partial.mcp.servers : base.mcp.servers,
    },
    egress: {
      allowHosts: Array.isArray(partial.egress?.allowHosts)
        ? partial.egress.allowHosts.map(String)
        : base.egress.allowHosts,
    },
    buildPlane: mergeBuildPlane(partial.buildPlane, base.buildPlane ?? DEFAULT_BUILD_PLANE),
    updatedAt: new Date().toISOString(),
  };
}

export async function readUserSettings(): Promise<UserSettings> {
  const filePath = getUserSettingsPath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as UserSettingsPatch;
    return mergeSettings(parsed, DEFAULT_USER_SETTINGS);
  } catch {
    const fre = await readFreState();
    const fromFre: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      selectedApps: validateAppIds(fre.selectedApps),
      updatedAt: fre.provisionedAt ?? new Date().toISOString(),
    };
    return fromFre;
  }
}

export async function writeUserSettings(settings: UserSettings): Promise<UserSettings> {
  const filePath = getUserSettingsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const next = { ...settings, updatedAt: new Date().toISOString() };
  await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o640 });
  return next;
}

export async function updateUserSettings(patch: UserSettingsPatch): Promise<UserSettings> {
  const current = await readUserSettings();
  const next = mergeSettings(patch, current);
  return writeUserSettings(next);
}

/** Keep FRE selectedApps in sync so middleware and nav stay consistent. */
export async function syncFreSelectedApps(apps: OotbAppId[]): Promise<void> {
  const fre = await readFreState();
  if (!fre.initialized) return;
  await writeFreState({
    ...fre,
    selectedApps: apps,
  });
}

export async function updateSelectedClaws(apps: OotbAppId[]): Promise<UserSettings> {
  const validated = validateAppIds(apps.map(String));
  if (validated.length === 0) {
    throw new Error("At least one Claw must remain enabled");
  }
  const next = await updateUserSettings({ selectedApps: validated });
  await syncFreSelectedApps(validated);
  return next;
}

export async function appendForgedAppSlug(slug: string): Promise<UserSettings> {
  const current = await readUserSettings();
  const slugs = current.forgedAppSlugs ?? [];
  if (slugs.includes(slug)) return current;
  return updateUserSettings({ forgedAppSlugs: [...slugs, slug] });
}

export async function removeForgedAppSlug(slug: string): Promise<UserSettings> {
  const current = await readUserSettings();
  const slugs = (current.forgedAppSlugs ?? []).filter((s) => s !== slug);
  if (slugs.length === (current.forgedAppSlugs ?? []).length) return current;
  return updateUserSettings({ forgedAppSlugs: slugs });
}

export async function sanitizeSettingsForClient(settings: UserSettings): Promise<UserSettings> {
  const connectedProviders: UserSettings["intelligence"]["connectedProviders"] = {};

  for (const [id, conn] of Object.entries(settings.intelligence.connectedProviders)) {
    const hasApiKey = Boolean(await getProviderApiKey(id));
    const oauthLinked = await hasProviderOAuth(id);
    connectedProviders[id] = {
      ...conn,
      hasApiKey,
      oauthLinked,
      subscriptionLinked: conn.subscriptionLinked || oauthLinked,
    };
  }

  const sanitizedBp = sanitizeBuildPlane(settings.buildPlane ?? DEFAULT_BUILD_PLANE);

  return {
    ...settings,
    buildPlane: {
      enabled: sanitizedBp.enabled,
      linkStatus: sanitizedBp.linkStatus,
      linkedAt: sanitizedBp.linkedAt,
      workerStatus: sanitizedBp.workerStatus,
      allowDelegation: sanitizedBp.allowDelegation,
      allowWriteTools: sanitizedBp.allowWriteTools,
      webhookSecret: null,
    },
    intelligence: {
      ...settings.intelligence,
      connectedProviders,
    },
  };
}
