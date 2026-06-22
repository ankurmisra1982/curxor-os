"use client";

import {
  provisioningModeBadgeClass,
  provisioningModeDescription,
  provisioningModeLabel,
  resolveProvisioningMode,
  type ForgeProvisioningMode,
} from "@/lib/forge-provisioning";

interface ForgeProvisioningBadgeProps {
  mode: ForgeProvisioningMode | undefined;
}

export function ForgeProvisioningBadge({ mode }: ForgeProvisioningBadgeProps) {
  const resolved = resolveProvisioningMode(mode);
  return (
    <span
      title={provisioningModeDescription(resolved)}
      className={provisioningModeBadgeClass(resolved)}
    >
      {provisioningModeLabel(resolved)}
    </span>
  );
}
