import "server-only";

import type { ClawContextRecord } from "./claw-mesh-protocol";
import type { ClawContextScope } from "./claw-mesh-protocol";
import { queryClawContextForBridge } from "./claw-context-store";
import type { BuildPlaneSettings } from "./user-settings-types";

/** Scopes the Build Plane bridge may read via inbound MCP (read-only in BP1). */
export const BRIDGE_READ_SCOPES: ClawContextScope[] = [
  "personal",
  "health",
  "work",
  "finance",
  "family",
  "hardware",
  "signals",
];

export class BuildPlaneAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildPlaneAccessError";
  }
}

export function assertBuildPlaneMcpAccess(buildPlane: BuildPlaneSettings): void {
  if (!buildPlane.enabled) {
    throw new BuildPlaneAccessError("Build Plane overlay is disabled — enable in Settings → Builder overlay");
  }
}

export function assertBridgeWriteAllowed(buildPlane: BuildPlaneSettings): void {
  assertBuildPlaneMcpAccess(buildPlane);
  if (!buildPlane.allowWriteTools) {
    throw new BuildPlaneAccessError("Inbound MCP write tools are disabled (allowWriteTools=false)");
  }
}

export async function readBridgeCcpSummary(limit = 32): Promise<
  Array<{
    scope: ClawContextScope;
    key: string;
    sourceAppId: string;
    profileId: string | null;
    preview: string;
    storedAt: string;
  }>
> {
  const records = await queryClawContextForBridge(limit);
  return records.map(summarizeBridgeRecord);
}

function summarizeBridgeRecord(record: ClawContextRecord) {
  const payload = JSON.stringify(record.envelope.payload);
  return {
    scope: record.envelope.scope,
    key: record.envelope.key,
    sourceAppId: record.envelope.sourceAppId,
    profileId: record.envelope.profileId,
    preview: payload.length > 240 ? `${payload.slice(0, 237)}…` : payload,
    storedAt: record.storedAt,
  };
}
