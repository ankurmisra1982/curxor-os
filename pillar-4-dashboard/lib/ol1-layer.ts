import { OOTB_APPS, type OotbAppId } from "./ootb-apps";

export type ShellNavLayer = "home" | "universal" | "operate";

/** OL1 — universal surfaces (not FRE “employees”). */
export const UNIVERSAL_SHELL_APP_IDS = [
  "claw-cafe",
  "tesla-optimus-engine",
  "my-family",
] as const satisfies readonly OotbAppId[];

export type UniversalShellAppId = (typeof UNIVERSAL_SHELL_APP_IDS)[number];

/** Default kiosk label when Claw Cafe FRE config is unset (Patron Hall). */
export const CAFE_DEFAULT_KIOSK_NAME = "Patron Hall";

const UNIVERSAL_SET = new Set<string>(UNIVERSAL_SHELL_APP_IDS);

export function isUniversalShellApp(appId: OotbAppId): boolean {
  return UNIVERSAL_SET.has(appId);
}

export function isFrePickableApp(appId: OotbAppId): boolean {
  return appId !== "claw-forge" && !isUniversalShellApp(appId);
}

export function frePickableApps() {
  return OOTB_APPS.filter((a) => isFrePickableApp(a.id));
}

export function stripUniversalFromSelected(ids: OotbAppId[]): OotbAppId[] {
  return ids.filter((id) => isFrePickableApp(id));
}
