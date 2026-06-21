import "server-only";

import { listFamilyProfiles } from "../family-profiles";
import type { FamilyChannelHandle } from "../family-types";
import type { ChannelType } from "./channel-types";

export function normalizeChannelAddress(channel: FamilyChannelHandle["channel"] | ChannelType, raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (channel === "email") return trimmed;
  if (channel === "whatsapp" || channel === "telegram" || channel === "imessage") {
    return trimmed.replace(/[^\d+a-z@._-]/gi, "");
  }
  return trimmed.replace(/^@/, "");
}

export async function resolveProfileIdForSender(
  channel: ChannelType,
  senderLabel: string | undefined,
  fallbackProfileId?: string | null,
): Promise<string | null> {
  if (fallbackProfileId) return fallbackProfileId;
  if (!senderLabel?.trim()) {
    const file = await listFamilyProfiles();
    return file.primaryProfileId;
  }

  const normalized = normalizeChannelAddress(channel, senderLabel);
  const file = await listFamilyProfiles();

  for (const member of file.members) {
    for (const handle of member.channelHandles ?? []) {
      if (handle.channel !== channel && !(channel === "webchat" && handle.channel === "email")) continue;
      const memberAddr = normalizeChannelAddress(handle.channel, handle.address);
      if (memberAddr === normalized || normalized.includes(memberAddr) || memberAddr.includes(normalized)) {
        return member.id;
      }
    }
    for (const device of member.devices) {
      if (device.hardwareRef && normalizeChannelAddress(channel, device.hardwareRef) === normalized) {
        return member.id;
      }
    }
  }

  return file.primaryProfileId;
}

export async function getProfileDisplayName(profileId: string | null): Promise<string | null> {
  if (!profileId) return null;
  const map = await getProfileNameMap();
  return map.get(profileId) ?? null;
}

export async function getProfileNameMap(): Promise<Map<string, string>> {
  const file = await listFamilyProfiles();
  return new Map(file.members.map((m) => [m.id, m.displayName]));
}
