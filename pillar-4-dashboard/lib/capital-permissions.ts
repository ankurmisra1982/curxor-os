import "server-only";

import type { CapitalPermissions, AutonomousMode, BrokerId } from "./capital-queue-types";
import { defaultPermissions as basePermissions } from "./capital-defaults";
import { ensureCapitalQueue, writeCapitalFilePartial } from "./capital-store";

export { basePermissions as defaultPermissions };

export function canAutonomousTrade(permissions: CapitalPermissions): boolean {
  return permissions.autonomousMode === "auto_armed_rules";
}

export function requiresApprovalPerTrade(permissions: CapitalPermissions): boolean {
  return permissions.autonomousMode === "approval_each";
}

export async function grantAutonomousPermission(mode: AutonomousMode, brokers?: BrokerId[]): Promise<CapitalPermissions> {
  const file = await ensureCapitalQueue();
  file.permissions = {
    ...file.permissions,
    autonomousMode: mode,
    autonomousGrantedAt: mode === "off" ? null : new Date().toISOString(),
    allowedBrokers: brokers ?? file.permissions.allowedBrokers,
  };
  await writeCapitalFilePartial(file);
  return file.permissions;
}

export async function setTradingViewSecret(secret: string | null): Promise<void> {
  const file = await ensureCapitalQueue();
  file.permissions.tradingviewWebhookSecret = secret;
  await writeCapitalFilePartial(file);
}
