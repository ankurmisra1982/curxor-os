import "server-only";

import { publishClawContext } from "../claw-context-store";
import type { ClawContextScope } from "../claw-mesh-protocol";
import type { OotbAppId } from "../ootb-apps";
import { getProfileDisplayName } from "./channel-sender-resolver";
import type { ChannelSession, ChannelType } from "./channel-types";

const SESSION_TTL = 7 * 24 * 3600;

function inboxScopeForApp(appId: OotbAppId): ClawContextScope {
  switch (appId) {
    case "my-vital":
      return "health";
    case "my-family":
      return "family";
    case "my-capital":
      return "finance";
    case "tesla-optimus-engine":
    case "robotaxi-fleet-manager":
      return "hardware";
    case "my-content-creator":
      return "work";
    default:
      return "work";
  }
}

export interface ChannelTurnPayload {
  session: ChannelSession;
  channel: ChannelType;
  userText: string;
  replyText: string;
  senderLabel?: string;
}

export async function publishChannelTurnToCcp(input: ChannelTurnPayload): Promise<void> {
  const { session, channel, userText, replyText, senderLabel } = input;
  const profileName = await getProfileDisplayName(session.profileId);
  const preview = replyText.slice(0, 160) || userText.slice(0, 160);

  const payload = {
    sessionId: session.id,
    channel,
    externalChatId: session.externalChatId,
    appId: session.appId,
    profileId: session.profileId,
    profileName,
    senderLabel: senderLabel ?? session.senderLabel,
    lastUser: userText.slice(0, 500),
    lastReply: replyText.slice(0, 500),
    preview,
    updatedAt: new Date().toISOString(),
  };

  await Promise.all([
    publishClawContext("bridge", {
      scope: "work",
      key: `inbox.${session.id}`,
      payload,
      profileId: session.profileId,
      ttlSeconds: SESSION_TTL,
    }),
    publishClawContext("bridge", {
      scope: inboxScopeForApp(session.appId),
      key: `inbox.${session.id}`,
      payload,
      profileId: session.profileId,
      ttlSeconds: SESSION_TTL,
    }),
    publishClawContext("bridge", {
      scope: "personal",
      key: `comms.latest.${session.id}`,
      payload: { ...payload, unified: true },
      profileId: session.profileId,
      ttlSeconds: SESSION_TTL,
    }),
  ]);
}

export async function publishInboxRollup(sessions: ChannelSession[]): Promise<void> {
  const sorted = [...sessions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const top = sorted.slice(0, 24).map((s) => ({
    sessionId: s.id,
    channel: s.channel,
    appId: s.appId,
    profileId: s.profileId,
    preview: s.lastPreview,
    updatedAt: s.updatedAt,
  }));

  await publishClawContext("bridge", {
    scope: "work",
    key: "inbox.rollup",
    payload: {
      sessionCount: sessions.length,
      sessions: top,
      updatedAt: new Date().toISOString(),
    },
    profileId: null,
    ttlSeconds: 3600,
  });
}
