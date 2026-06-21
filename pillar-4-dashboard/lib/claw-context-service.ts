import "server-only";

import { randomUUID } from "node:crypto";

import { publishClawContext, queryClawContext } from "./claw-context-store";
import type { ClawContextScope } from "./claw-mesh-protocol";
import { CCP_REGISTRY } from "./claw-mesh-protocol";
import { listFamilyProfiles } from "./family-profiles";
import { syncVitalContextToMesh } from "./vital-health-store";
import type { OotbAppId } from "./ootb-apps";

export { CCP_REGISTRY };

/** Publish all family profiles to the Claw Context mesh. */
export async function syncFamilyContextToMesh(): Promise<void> {
  const file = await listFamilyProfiles();
  for (const member of file.members) {
    await publishClawContext("my-family", {
      scope: "family",
      key: `members.${member.id}`,
      payload: {
        displayName: member.displayName,
        role: member.role,
        personality: member.personality,
        sharedScopes: member.sharedScopes,
        deviceCount: member.devices.length,
      },
      profileId: member.id,
      ttlSeconds: null,
    });
    if (member.devices.length > 0) {
      await publishClawContext("my-family", {
        scope: "family",
        key: `devices.${member.id}`,
        payload: { devices: member.devices },
        profileId: member.id,
        ttlSeconds: 3600,
      });
    }
  }
}

/** Bootstrap demo context slices for hardware and work Claws. */
export async function seedDefaultContextIfEmpty(): Promise<void> {
  const existing = await queryClawContext({ appId: "tesla-optimus-engine", limit: 1 });
  if (existing.length > 0) return;

  await publishClawContext("system", {
    scope: "hardware",
    key: "optimus.status",
    payload: { unitId: "OPTIMUS-01", mode: "standby", safetyProfile: "standard" },
    ttlSeconds: 3600,
  });

  await syncVitalContextToMesh(null);
  await syncFamilyContextToMesh();
}

export async function getMergedContextForAgent(
  appId: OotbAppId,
  profileId?: string | null,
): Promise<Record<ClawContextScope, Record<string, unknown>>> {
  await seedDefaultContextIfEmpty();
  const records = await queryClawContext({ appId, profileId, limit: 40 });

  const merged: Partial<Record<ClawContextScope, Record<string, unknown>>> = {};
  for (const record of records) {
    const scope = record.envelope.scope;
    if (!merged[scope]) merged[scope] = {};
    merged[scope]![record.envelope.key] = record.envelope.payload;
  }
  return merged as Record<ClawContextScope, Record<string, unknown>>;
}

export async function buildContextPromptBlock(appId: OotbAppId, profileId?: string | null): Promise<string> {
  const merged = await getMergedContextForAgent(appId, profileId);
  const keys = Object.keys(merged);
  if (keys.length === 0) return "";

  return `\nClaw Context Protocol (shared mesh knowledge):\n${JSON.stringify(merged, null, 2).slice(0, 3000)}`;
}

export async function publishAppContext(
  appId: OotbAppId,
  scope: ClawContextScope,
  key: string,
  payload: Record<string, unknown>,
  profileId?: string | null,
): Promise<{ id: string }> {
  const record = await publishClawContext(appId, {
    scope,
    key,
    payload,
    profileId,
    ttlSeconds: 3600,
  });
  return { id: record.envelope.id };
}
