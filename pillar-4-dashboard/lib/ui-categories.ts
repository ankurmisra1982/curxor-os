import type { OotbAppId } from "./ootb-apps";
import { APP_ROUTES } from "./app-routes";
import type { ForgedAppRecord } from "./forged-apps-types";

export const HOME_PATH = "/home";
export const SETTINGS_PATH = "/settings";

export type ClawCategoryId = "home" | "wealth" | "work" | "physical" | "life" | "forge";

export interface ClawCategory {
  id: ClawCategoryId;
  label: string;
  description: string;
}

export const CLAW_CATEGORIES: ClawCategory[] = [
  { id: "home", label: "Home", description: "Overview and quick actions" },
  { id: "wealth", label: "Wealth & growth", description: "Money and audience on your terms" },
  { id: "work", label: "Work & commerce", description: "Outreach and fulfillment desks" },
  { id: "physical", label: "Signals & swarm", description: "Feeds, fleets, robots, and engagement" },
  { id: "life", label: "Life & family", description: "Longevity, health, and household context" },
  { id: "forge", label: "Create", description: "Mint new digital employees" },
];

const APP_CATEGORY: Record<OotbAppId, ClawCategoryId> = {
  "my-capital": "wealth",
  "my-content-creator": "wealth",
  "my-work": "work",
  "my-shop": "work",
  "tesla-optimus-engine": "physical",
  "robotaxi-fleet-manager": "physical",
  "claw-cafe": "physical",
  "my-vital": "life",
  "my-family": "life",
  "claw-forge": "forge",
};

export function categoryForApp(appId: OotbAppId): ClawCategoryId {
  return APP_CATEGORY[appId];
}

export interface NavItem {
  href: string;
  name: string;
  short: string;
  appId: OotbAppId | null;
  category: ClawCategoryId;
  noviceLabel: string;
}

export function forgedNavItems(apps: ForgedAppRecord[]): NavItem[] {
  return apps.map((a) => ({
    href: a.href,
    name: a.name,
    short: a.short,
    appId: null,
    category: "forge" as ClawCategoryId,
    noviceLabel: a.name,
  }));
}

export function buildNavItems(selectedAppIds: OotbAppId[], forgedApps: ForgedAppRecord[] = []): NavItem[] {
  const home: NavItem = {
    href: HOME_PATH,
    name: "Home",
    short: "HOME",
    appId: null,
    category: "home",
    noviceLabel: "Start here",
  };

  const routes = APP_ROUTES.filter((r) => {
    if (r.id === "claw-forge") return true;
    if (selectedAppIds.length === 0) return true;
    return selectedAppIds.includes(r.id);
  });

  const items = routes.map((r) => ({
    href: r.href,
    name: r.name,
    short: r.short,
    appId: r.id,
    category: categoryForApp(r.id),
    noviceLabel: r.name,
  }));

  // Forged desks are optional — primary AppNav omits them; Command Palette + Forge fleet include them.
  return [home, ...items, ...forgedNavItems(forgedApps)];
}

export function groupedNavItems(items: NavItem[]): { category: ClawCategory; items: NavItem[] }[] {
  const groups = new Map<ClawCategoryId, NavItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }

  return CLAW_CATEGORIES.filter((c) => groups.has(c.id)).map((category) => ({
    category,
    items: groups.get(category.id)!,
  }));
}
