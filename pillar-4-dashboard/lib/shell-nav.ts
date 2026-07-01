import { isPreviewApp } from "./claw-preview-apps";
import type { ForgedAppRecord } from "./forged-apps-types";
import { getOotbApp, type OotbAppId } from "./ootb-apps";
import {
  UNIVERSAL_SHELL_APP_IDS,
  type UniversalShellAppId,
  type ShellNavLayer,
  isUniversalShellApp,
  frePickableApps,
  stripUniversalFromSelected,
  isFrePickableApp,
} from "./ol1-layer";
import { ASK_PATH, HOME_PATH, categoryForApp, type ClawCategoryId } from "./ui-categories";

export type { ShellNavLayer } from "./ol1-layer";

export type ClawHonestyTier = "production" | "mint" | "preview";

export {
  UNIVERSAL_SHELL_APP_IDS,
  type UniversalShellAppId,
  isUniversalShellApp,
  isFrePickableApp,
  frePickableApps,
  stripUniversalFromSelected,
};

const PRODUCTION_TIER_A: OotbAppId[] = ["my-capital", "my-content-creator", "my-work"];

export interface ShellNavEntry {
  href: string;
  name: string;
  short: string;
  layer: ShellNavLayer;
  appId: OotbAppId | null;
  category: ClawCategoryId;
  honestyTier: ClawHonestyTier;
}

export interface UniversalNavEntry {
  href: string;
  name: string;
  short: string;
  honestyTier: ClawHonestyTier;
  appId: OotbAppId | "patron-ask";
}

export function clawHonestyTier(appId: OotbAppId): ClawHonestyTier {
  if (appId === "claw-forge") return "mint";
  if (PRODUCTION_TIER_A.includes(appId)) return "production";
  if (isPreviewApp(appId) || appId === "claw-cafe") return "preview";
  return "preview";
}

export function universalNavLabel(appId: UniversalShellAppId): string {
  switch (appId) {
    case "claw-cafe":
      return "Claw Cafe";
    case "tesla-optimus-engine":
      return "Signal";
    case "my-family":
      return "Kin";
    default:
      return getOotbApp(appId).name;
  }
}

export function buildUniversalNavEntries(): UniversalNavEntry[] {
  const apps: UniversalNavEntry[] = UNIVERSAL_SHELL_APP_IDS.map((id) => {
    const app = getOotbApp(id);
    return {
      href: app.href,
      name: universalNavLabel(id),
      short: id === "claw-cafe" ? "CAFE" : app.short,
      honestyTier: clawHonestyTier(id),
      appId: id,
    };
  });

  apps.push({
    href: ASK_PATH,
    name: "Ask",
    short: "ASK",
    honestyTier: "production",
    appId: "patron-ask",
  });

  return apps;
}

export function buildOperateNavEntries(
  selectedAppIds: OotbAppId[],
  forgedApps: ForgedAppRecord[] = [],
): ShellNavEntry[] {
  const home: ShellNavEntry = {
    href: HOME_PATH,
    name: "Home",
    short: "HOME",
    layer: "home",
    appId: null,
    category: "home",
    honestyTier: "production",
  };

  const universalSet = new Set<string>(UNIVERSAL_SHELL_APP_IDS);

  const operateIds = new Set<OotbAppId>();
  for (const id of selectedAppIds) {
    if (!universalSet.has(id)) operateIds.add(id);
  }
  operateIds.add("claw-forge");

  const entries: ShellNavEntry[] = [home];

  for (const id of operateIds) {
    const app = getOotbApp(id);
    entries.push({
      href: app.href,
      name: id === "my-work" ? "Outreach Claw" : app.name,
      short: app.short,
      layer: "operate",
      appId: id,
      category: categoryForApp(id),
      honestyTier: clawHonestyTier(id),
    });
  }

  for (const forged of forgedApps) {
    entries.push({
      href: forged.href,
      name: forged.name,
      short: forged.short,
      layer: "operate",
      appId: null,
      category: "forge",
      honestyTier: "mint",
    });
  }

  return entries;
}

export function honestyTierClass(tier: ClawHonestyTier): string {
  switch (tier) {
    case "production":
      return "text-stark";
    case "mint":
      return "text-cursor-glow";
    case "preview":
      return "text-muted opacity-75";
  }
}
