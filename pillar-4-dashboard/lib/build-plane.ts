import { buildWorkerWizardSteps, workerWizardProgress } from "./build-worker-wizard-steps";
import type { BuildPlaneSettings, SanitizedBuildPlaneSettings } from "./user-settings-types";

export function sanitizeBuildPlane(buildPlane: BuildPlaneSettings): SanitizedBuildPlaneSettings {
  const progress = workerWizardProgress(buildPlane);
  return {
    enabled: buildPlane.enabled,
    linkStatus: buildPlane.linkStatus,
    linkedAt: buildPlane.linkedAt,
    workerStatus: buildPlane.workerStatus,
    allowDelegation: buildPlane.allowDelegation,
    allowWriteTools: buildPlane.allowWriteTools,
    hasWebhookSecret: Boolean(buildPlane.webhookSecret),
    hasWebhookUrl: Boolean(buildPlane.webhookUrl?.trim()),
    workerHost: buildPlane.workerHost ?? null,
    workerSshPort: buildPlane.workerSshPort ?? 22,
    workerSshUser: buildPlane.workerSshUser ?? "curxor",
    workerLastProbeAt: buildPlane.workerLastProbeAt ?? null,
    workerWizardCompletedAt: buildPlane.workerWizardCompletedAt ?? null,
    workerWizardProgress: progress,
  };
}

export function isBuildPlaneLinked(buildPlane: BuildPlaneSettings): boolean {
  return buildPlane.linkStatus === "linked";
}
