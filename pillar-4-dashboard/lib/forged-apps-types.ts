import type { ForgeProvisioningMode } from "./forge-provisioning";

export interface ForgedAppRecord {
  id: string;
  slug: string;
  name: string;
  intent: string;
  templateId: string;
  href: string;
  short: string;
  provisioningMode: Extract<ForgeProvisioningMode, "framework" | "imported">;
  meshConnected: boolean;
  clawProfileId: string | null;
  growthLevel: "L1" | "L2" | "L3" | "L4" | "L5";
  importSource: "bundle" | "openclaw" | null;
  createdAt: string;
  status?: "active" | "archived";
  archivedAt?: string | null;
}

export interface ForgedAppsState {
  apps: ForgedAppRecord[];
}
