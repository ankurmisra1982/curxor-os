import { APP_ROUTES } from "./app-routes";
import { HOME_PATH } from "./ui-categories";
import type { OotbAppId } from "./ootb-apps";
import { isValidAppId } from "./ootb-apps";

/** Always reachable — agent factory is cross-cutting, not a FRE module pick. */
export const ALWAYS_ENABLED_APP_IDS: OotbAppId[] = ["claw-forge"];

export function normalizeSelectedApps(ids: string[]): OotbAppId[] {
  return ids.filter(isValidAppId);
}

export function isAppEnabled(appId: OotbAppId, selectedApps: OotbAppId[]): boolean {
  if (ALWAYS_ENABLED_APP_IDS.includes(appId)) return true;
  if (selectedApps.length === 0) return true;
  return selectedApps.includes(appId);
}

export function enabledAppRoutes(selectedApps: OotbAppId[]) {
  const selected = normalizeSelectedApps(selectedApps);
  return APP_ROUTES.filter((route) => isAppEnabled(route.id, selected));
}

export function appIdFromPathname(pathname: string): OotbAppId | null {
  const route = APP_ROUTES.find((r) => pathname === r.href || pathname.startsWith(`${r.href}/`));
  return route?.id ?? null;
}

export function isPathEnabled(pathname: string, selectedApps: OotbAppId[]): boolean {
  const appId = appIdFromPathname(pathname);
  if (!appId) return true;
  return isAppEnabled(appId, selectedApps);
}

export function selectedAppsKey(selectedApps: OotbAppId[]): string {
  return normalizeSelectedApps(selectedApps).join(",");
}

export function defaultAppHref(selectedApps: OotbAppId[]): string {
  void selectedApps;
  return HOME_PATH;
}
