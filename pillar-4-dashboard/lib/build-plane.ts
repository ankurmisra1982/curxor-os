import type { BuildPlaneSettings, SanitizedBuildPlaneSettings } from "./user-settings-types";

export function sanitizeBuildPlane(buildPlane: BuildPlaneSettings): SanitizedBuildPlaneSettings {
  return {
    enabled: buildPlane.enabled,
    linkStatus: buildPlane.linkStatus,
    linkedAt: buildPlane.linkedAt,
    workerStatus: buildPlane.workerStatus,
    allowDelegation: buildPlane.allowDelegation,
    allowWriteTools: buildPlane.allowWriteTools,
    hasWebhookSecret: Boolean(buildPlane.webhookSecret),
    hasWebhookUrl: Boolean(buildPlane.webhookUrl?.trim()),
  };
}

export function isBuildPlaneLinked(buildPlane: BuildPlaneSettings): boolean {
  return buildPlane.linkStatus === "linked";
}
