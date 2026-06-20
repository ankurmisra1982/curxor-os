import type { OotbAppId } from "./ootb-apps";
import { APP_ROUTES } from "./app-routes";

export const HOME_PATH = "/home";
export const SETTINGS_PATH = "/settings";

export type ClawCategoryId = "home" | "wealth" | "work" | "physical" | "forge";

export interface ClawCategory {
  id: ClawCategoryId;
  label: string;
  description: string;
}

export const CLAW_CATEGORIES: ClawCategory[] = [
  { id: "home", label: "Home", description: "Overview and quick actions" },
  { id: "wealth", label: "Wealth & growth", description: "Money and audience on your terms" },
  { id: "work", label: "Work & commerce", description: "Outreach and fulfillment desks" },
  { id: "physical", label: "Signals & swarm", description: "Feeds, fleets, and engagement" },
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

export function buildNavItems(selectedAppIds: OotbAppId[]): NavItem[] {
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

  return [home, ...items];
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
