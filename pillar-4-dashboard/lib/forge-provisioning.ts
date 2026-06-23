/** How a forged claw connects to CurXor OS frameworks (Forge P1+). */
export type ForgeProvisioningMode = "island" | "framework" | "imported";

export type ForgeMintRoute = "create" | "provision-app" | "import";

export interface ForgeConnectionModeOption {
  id: ForgeProvisioningMode;
  label: string;
  shortLabel: string;
  description: string;
  /** Which mint API the wizard calls for this mode. */
  mintRoute: ForgeMintRoute;
}

export const FORGE_CONNECTION_MODES: ForgeConnectionModeOption[] = [
  {
    id: "framework",
    label: "CurXor OS framework",
    shortLabel: "Framework",
    description: "Full desk — FRE, agent workspace, growth gates, and nav at /my-claw/{slug}.",
    mintRoute: "provision-app",
  },
  {
    id: "island",
    label: "Fresh island",
    shortLabel: "Island",
    description: "Engine profile only — model stack + intent. No OS nav, mesh, or leveling.",
    mintRoute: "create",
  },
  {
    id: "imported",
    label: "Bring your claw",
    shortLabel: "Imported",
    description: "Import SOUL / TOOLS / HEARTBEAT bundle — island workspace or full framework desk.",
    mintRoute: "import",
  },
];

export function isForgeProvisioningMode(v: unknown): v is ForgeProvisioningMode {
  return v === "island" || v === "framework" || v === "imported";
}

/** Legacy profiles without a mode are treated as island (honest default). */
export function resolveProvisioningMode(v: unknown): ForgeProvisioningMode {
  if (isForgeProvisioningMode(v)) return v;
  return "island";
}

/** POST /api/claw/create — island engine profiles only. */
export function islandCreateAvailable(mode: ForgeProvisioningMode): boolean {
  return mode === "island";
}

/** Wizard connection picker — all three paths are live. */
export function wizardProvisioningModeAvailable(mode: ForgeProvisioningMode): boolean {
  return mode === "island" || mode === "framework" || mode === "imported";
}

/** @deprecated Use wizardProvisioningModeAvailable or islandCreateAvailable. */
export function provisioningModeAvailable(mode: ForgeProvisioningMode): boolean {
  return wizardProvisioningModeAvailable(mode);
}

export function provisioningModeMintRoute(mode: ForgeProvisioningMode): ForgeMintRoute {
  return FORGE_CONNECTION_MODES.find((m) => m.id === mode)?.mintRoute ?? "create";
}

export function createRejectsNonIslandError(mode: ForgeProvisioningMode): string {
  const route = provisioningModeMintRoute(mode);
  if (mode === "framework") {
    return `Provisioning mode "framework" is not available on /api/claw/create — use POST /api/claw/provision-app.`;
  }
  if (mode === "imported") {
    return `Provisioning mode "imported" is not available on /api/claw/create — use POST /api/claw/import.`;
  }
  return `Provisioning mode "${mode}" is not available on /api/claw/create — use ${route}.`;
}

export function provisioningModeLabel(mode: ForgeProvisioningMode): string {
  return FORGE_CONNECTION_MODES.find((m) => m.id === mode)?.shortLabel ?? "Island";
}

export function provisioningModeDescription(mode: ForgeProvisioningMode): string {
  return FORGE_CONNECTION_MODES.find((m) => m.id === mode)?.description ?? "";
}

export function provisioningModeBadgeClass(mode: ForgeProvisioningMode): string {
  if (mode === "island") {
    return "border border-line/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted";
  }
  if (mode === "framework") {
    return "border border-cursor-glow/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-cursor-glow/80";
  }
  return "border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-stark/70";
}
