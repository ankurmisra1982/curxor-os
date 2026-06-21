import "server-only";

import {
  bridgeTierLabel,
  type BridgeTier,
  type SocialChannelDef,
  SOCIAL_CHANNELS,
  type SocialPlatformId,
} from "./social-channels";
import { loadDigitalEnv } from "./digital-env";

export interface SocialChannelStatus extends SocialChannelDef {
  configured: boolean;
  enabledInFre: boolean;
  statusLabel: string;
}

function digitalEnvPath(): string {
  return process.env.CURXOR_DIGITAL_ENV_PATH ?? "/etc/curxor/digital.env";
}

function isConfigured(env: Record<string, string>, keys: string[]): boolean {
  if (keys.length === 0) return false;
  return keys.every((k) => Boolean(env[k]?.trim()));
}

function statusLabel(ch: SocialChannelDef, configured: boolean): string {
  if (ch.bridgeTier === "live" && configured) return "Ready to publish";
  if (ch.bridgeTier === "live" && !configured) return "Add credentials to digital.env";
  if (ch.bridgeTier === "messaging" && configured) return "Messaging bridge ready";
  if (ch.bridgeTier === "messaging" && !configured) return "Configure messaging keys";
  if (configured) return "Credentials on box — bridge shipping soon";
  return bridgeTierLabel(ch.bridgeTier);
}

export async function fetchSocialChannelStatuses(
  freChannels: string[] = [],
): Promise<SocialChannelStatus[]> {
  const env = await loadDigitalEnv();
  const freSet = new Set(freChannels);

  return SOCIAL_CHANNELS.map((ch) => {
    const configured = isConfigured(env, ch.envKeys);
    const enabledInFre = freSet.has(ch.id);
    return {
      ...ch,
      configured,
      enabledInFre,
      statusLabel: statusLabel(ch, configured),
    };
  });
}

export async function fetchCreatorChannelStatuses(freChannels: string[]): Promise<{
  platforms: SocialChannelStatus[];
  liveCount: number;
  configuredCount: number;
  enabledCount: number;
}> {
  const all = await fetchSocialChannelStatuses(freChannels);
  const platforms = all.filter((p) => p.creatorClaw);
  return {
    platforms,
    liveCount: platforms.filter((p) => p.bridgeTier === "live" && p.configured).length,
    configuredCount: platforms.filter((p) => p.configured).length,
    enabledCount: platforms.filter((p) => p.enabledInFre).length,
  };
}

export function resolvePublishTool(platform: SocialPlatformId): {
  tool: string;
  tier: BridgeTier;
} {
  const ch = SOCIAL_CHANNELS.find((c) => c.id === platform);
  if (!ch?.bridgeTool) return { tool: "content.publish_post", tier: "draft_only" };
  return { tool: ch.bridgeTool, tier: ch.bridgeTier };
}
