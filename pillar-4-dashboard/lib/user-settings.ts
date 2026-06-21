import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getProviderApiKey, hasProviderOAuth } from "./llm-credentials";
import { readFreState, writeFreState, validateAppIds } from "./fre-state";
import type { OotbAppId } from "./ootb-apps";
import {
  DEFAULT_USER_SETTINGS,
  getUserSettingsPath,
  type ColorScheme,
  type IntelligenceSource,
  type ThemeMode,
  type UiMode,
  type UserSettings,
  type UserSettingsPatch,
} from "./user-settings-types";

function isUiMode(v: unknown): v is UiMode {
  return v === "simple" || v === "expert";
}

function isColorScheme(v: unknown): v is ColorScheme {
  return v === "curxor" || v === "ocean" || v === "amber" || v === "mono";
}

function isIntelligenceSource(v: unknown): v is IntelligenceSource {
  return v === "local" || v === "frontier" || v === "auto";
}

function isThemeMode(v: unknown): v is ThemeMode {
  return v === "dark" || v === "light" || v === "system";
}

function mergeSettings(partial: UserSettingsPatch, base: UserSettings): UserSettings {
  return {
    version: 1,
    selectedApps: Array.isArray(partial.selectedApps)
      ? validateAppIds(partial.selectedApps.map(String))
      : base.selectedApps,
    appearance: {
      uiMode: isUiMode(partial.appearance?.uiMode) ? partial.appearance.uiMode : base.appearance.uiMode,
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

  return {
    ...settings,
    intelligence: {
      ...settings.intelligence,
      connectedProviders,
    },
  };
}
