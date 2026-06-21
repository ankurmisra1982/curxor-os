import "server-only";

import type { OotbAppId } from "./ootb-apps";
import type { ChannelType } from "./agent-runtime/channel-types";
import { envFlag } from "./digital-env";
import { addEngageSuggestion, type EngageSuggestion } from "./content-engage-bridge";

const ENGAGE_APP_IDS = new Set<OotbAppId>(["claw-cafe", "my-content-creator"]);

const CHANNEL_LABEL: Record<ChannelType, string> = {
  telegram: "Telegram",
  slack: "Slack",
  whatsapp: "WhatsApp",
  imessage: "iMessage",
  webchat: "Dashboard",
};

export function shouldIngestChannelToEngage(channel: ChannelType, appId: OotbAppId): boolean {
  if (channel === "webchat") return false;
  if (!envFlag("CURXOR_ENGAGE_INBOX_AUTO", true)) return false;

  const skipApps = (process.env.CURXOR_ENGAGE_INBOX_SKIP_APPS ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (skipApps.includes(appId)) return false;

  if (ENGAGE_APP_IDS.has(appId)) return true;

  const channels = (process.env.CURXOR_ENGAGE_INBOX_CHANNELS ?? "telegram,slack,whatsapp,imessage")
    .split(/[\s,]+/)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  return channels.includes(channel);
}

export function engageCaptureOnly(appId: OotbAppId): boolean {
  if (appId !== "claw-cafe") return false;
  return envFlag("CURXOR_ENGAGE_CAPTURE_ONLY", true);
}

export async function ingestChannelMessageToEngageInbox(input: {
  channel: ChannelType;
  externalChatId: string;
  text: string;
  senderLabel?: string;
  appId: OotbAppId;
  sessionId?: string;
}): Promise<EngageSuggestion | null> {
  const text = input.text.trim();
  if (!text || !shouldIngestChannelToEngage(input.channel, input.appId)) return null;

  const author = input.senderLabel?.trim() || input.externalChatId;
  const platformHint = mapChannelToPlatformHint(input.channel, input.appId);

  return addEngageSuggestion({
    source: "inbox",
    channel: `${CHANNEL_LABEL[input.channel]} · ${input.externalChatId.slice(0, 12)}`,
    author,
    text,
    platform: platformHint,
    channelType: input.channel,
    externalChatId: input.externalChatId,
    routedAppId: input.appId,
    sessionId: input.sessionId ?? null,
  });
}

function mapChannelToPlatformHint(channel: ChannelType, appId: OotbAppId): string | null {
  if (appId === "my-content-creator") return null;
  if (channel === "slack") return "linkedin";
  if (channel === "telegram") return "x";
  return null;
}
