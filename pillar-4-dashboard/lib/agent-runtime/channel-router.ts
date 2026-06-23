import "server-only";

import { assistAppAgent } from "../app-agent-assist";
import { readAppFreState } from "../app-fre-state";
import { publishDigitalIntent } from "../mesh-publish";
import type { OotbAppId } from "../ootb-apps";
import type { AgentChatTurn } from "../app-agent-types";

import { publishChannelTurnToCcp, publishInboxRollup } from "./channel-ccp-sync";
import {
  engageCaptureOnly,
  ingestChannelMessageToEngageInbox,
} from "../content-engage-ingest";
import {
  appendSessionTurn,
  channelHelpText,
  getChannelConfig,
  getOrCreateSession,
  listChannelSessions,
  parseChannelCommand,
  resolveAppIdForChat,
} from "./channel-store";
import { resolveProfileIdForSender } from "./channel-sender-resolver";
import type { ChannelType } from "./channel-types";
import {
  sendTelegramApprovalMessage,
  tryHandleApprovalTelegramCallback,
  tryHandleApprovalTelegramMessage,
} from "../content-approval-telegram";
import { tryHandleWorkApprovalTelegramCallback } from "../work-approval-telegram";
import { tryHandleCapitalTradeApprovalTelegramCallback } from "../capital-approval-telegram";
import { tryHandleApprovalSlackMessage } from "../content-approval-slack";

export interface InboundChannelMessage {
  channel: ChannelType;
  externalChatId: string;
  text: string;
  senderLabel?: string;
  /** Explicit app for webchat sessions (skips slash routing default). */
  appId?: OotbAppId;
  /** Override profile from dashboard workspace context. */
  profileId?: string | null;
  config?: Record<string, unknown>;
  skillId?: string;
  history?: AgentChatTurn[];
}

export interface ChannelReply {
  text: string;
  appId: OotbAppId;
  sessionId: string;
  profileId: string | null;
  activity?: string;
  mesh?: {
    kind: string;
    ok: boolean;
    seq?: number;
    id?: string;
    tool?: string;
    error?: string;
  };
  suggestedSkill?: string;
  autoDispatchSkill?: boolean;
  dispatchHints?: Record<string, unknown>;
}

const COMMAND_CHANNELS: ChannelType[] = ["telegram", "slack", "whatsapp", "imessage"];

export function webchatSessionId(appId: OotbAppId): string {
  return appId;
}

export async function handleInboundChannelMessage(msg: InboundChannelMessage): Promise<ChannelReply> {
  const config = await getChannelConfig();
  if (!config.enabled && msg.channel !== "webchat") {
    return {
      text: "Channel gateway is disabled. Enable it in Settings → Agent runtime.",
      appId: config.defaultAppId,
      sessionId: `${msg.channel}:${msg.externalChatId}`,
      profileId: null,
    };
  }

  const parsed =
    COMMAND_CHANNELS.includes(msg.channel) && !msg.skillId
      ? parseChannelCommand(msg.text)
      : { appId: null as OotbAppId | null, message: msg.text };

  const appId =
    msg.appId ??
    resolveAppIdForChat(config, msg.channel, msg.externalChatId, parsed.appId);

  const configProfileId =
    typeof msg.config?.selectedProfileId === "string" ? msg.config.selectedProfileId : null;
  const profileId = await resolveProfileIdForSender(msg.channel, msg.senderLabel, configProfileId);

  const session = await getOrCreateSession(msg.channel, msg.externalChatId, appId, {
    profileId,
    senderLabel: msg.senderLabel ?? null,
  });

  const userText = parsed.message.trim() || msg.text.trim();

  await ingestChannelMessageToEngageInbox({
    channel: msg.channel,
    externalChatId: msg.externalChatId,
    text: userText || msg.text,
    senderLabel: msg.senderLabel,
    appId,
    sessionId: session.id,
  });

  if (engageCaptureOnly(appId) && msg.channel !== "webchat" && !msg.skillId) {
    const ack =
      "Logged to Creator Claw engage inbox — open My Content → Engage to convert to a draft.";
    await appendSessionTurn(session.id, { role: "user", text: userText || msg.text });
    await appendSessionTurn(session.id, { role: "assistant", text: ack });
    await sendChannelReply(msg.channel, msg.externalChatId, ack);
    return {
      text: ack,
      appId,
      sessionId: session.id,
      profileId,
      activity: "[Engage] inbox capture",
    };
  }

  const freConfig = { ...(await readAppFreState(appId)).config, ...(msg.config ?? {}), selectedProfileId: profileId };

  if (
    COMMAND_CHANNELS.includes(msg.channel) &&
    !msg.skillId &&
    /^\/(start|help)\b/i.test(msg.text.trim())
  ) {
    const help = channelHelpText();
    return {
      text: help,
      appId,
      sessionId: session.id,
      profileId,
    };
  }

  // Server session is source of truth — avoids webchat/client history drift
  let history = session.history;
  if (userText && !msg.skillId) {
    const afterUser = await appendSessionTurn(session.id, { role: "user", text: userText });
    if (afterUser) history = afterUser.history.slice(0, -1);
  }

  const result = await assistAppAgent({
    appId,
    message: userText || msg.text,
    history,
    config: freConfig,
    skillId: msg.skillId,
    profileId,
    channel: msg.channel,
    sessionId: session.id,
  });

  const afterAssistant = await appendSessionTurn(session.id, { role: "assistant", text: result.reply });
  const updatedSession = afterAssistant ?? { ...session, profileId, appId };

  await publishChannelTurnToCcp({
    session: { ...updatedSession, profileId, appId },
    channel: msg.channel,
    userText: userText || msg.text,
    replyText: result.reply,
    senderLabel: msg.senderLabel,
  });

  const allSessions = await listChannelSessions();
  await publishInboxRollup(allSessions);

  return {
    text: result.reply,
    appId,
    sessionId: session.id,
    profileId,
    activity: result.activity,
    mesh: result.mesh,
    suggestedSkill: result.suggestedSkill,
    autoDispatchSkill: result.autoDispatchSkill,
    dispatchHints: result.dispatchHints,
  };
}

/** Outbound via eno2 digital bridge — LLM never calls external APIs directly. */
export async function sendChannelReply(
  channel: ChannelType,
  externalChatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (channel === "webchat") {
    return { ok: true };
  }
  if (channel === "telegram") {
    const result = await publishDigitalIntent({
      tool: "channel.telegram.send",
      payload: { chat_id: externalChatId, text: text.slice(0, 4096) },
    });
    return { ok: result.ok, error: result.error };
  }
  if (channel === "slack") {
    const result = await publishDigitalIntent({
      tool: "channel.slack.send",
      payload: { channel: externalChatId, text: text.slice(0, 4000) },
    });
    return { ok: result.ok, error: result.error };
  }
  if (channel === "whatsapp") {
    const result = await publishDigitalIntent({
      tool: "channel.whatsapp.send",
      payload: { to: externalChatId, text: text.slice(0, 4096) },
    });
    return { ok: result.ok, error: result.error };
  }
  if (channel === "imessage") {
    const result = await publishDigitalIntent({
      tool: "channel.imessage.send",
      payload: { chat_guid: externalChatId, text: text.slice(0, 4000) },
    });
    return { ok: result.ok, error: result.error };
  }
  return { ok: false, error: `Channel ${channel} outbound not configured` };
}

export async function handleWebchatMessage(input: {
  appId: OotbAppId;
  message: string;
  history?: AgentChatTurn[];
  config?: Record<string, unknown>;
  skillId?: string;
}): Promise<ChannelReply> {
  return handleInboundChannelMessage({
    channel: "webchat",
    externalChatId: webchatSessionId(input.appId),
    text: input.message,
    appId: input.appId,
    history: input.history,
    config: input.config,
    skillId: input.skillId,
    senderLabel: "dashboard",
  });
}

export async function handleSlackEvent(payload: Record<string, unknown>): Promise<ChannelReply | null> {
  if (payload.type !== "event_callback") return null;
  const event = payload.event as Record<string, unknown> | undefined;
  if (!event || event.type !== "message") return null;
  if (event.subtype === "bot_message" || event.bot_id) return null;
  const text = typeof event.text === "string" ? event.text : "";
  if (!text.trim()) return null;
  const channelId = typeof event.channel === "string" ? event.channel : "";
  if (!channelId) return null;

  const approval = await tryHandleApprovalSlackMessage(channelId, text);
  if (approval.handled && approval.text) {
    await sendChannelReply("slack", channelId, approval.text);
    return {
      text: approval.text,
      appId: "my-content-creator",
      sessionId: `slack:${channelId}`,
      profileId: null,
      activity: "[Approval] slack command",
    };
  }

  const reply = await handleInboundChannelMessage({
    channel: "slack",
    externalChatId: channelId,
    text,
    senderLabel: typeof event.user === "string" ? event.user : undefined,
  });

  await sendChannelReply("slack", channelId, reply.text);
  return reply;
}

export async function handleTelegramUpdate(update: Record<string, unknown>): Promise<ChannelReply | null> {
  const callback = update.callback_query as Record<string, unknown> | undefined;
  if (callback) {
    const data = typeof callback.data === "string" ? callback.data : "";
    const cqId = typeof callback.id === "string" ? callback.id : String(callback.id ?? "");
    const from = callback.message as Record<string, unknown> | undefined;
    const chat = from?.chat as Record<string, unknown> | undefined;
    const chatId = chat ? String(chat.id ?? "") : "";
    if (data && cqId && chatId) {
      const workApproval = await tryHandleWorkApprovalTelegramCallback(cqId, chatId, data);
      if (workApproval.handled && workApproval.text) {
        await sendTelegramApprovalMessage(chatId, workApproval.text);
        return {
          text: workApproval.text,
          appId: "my-work",
          sessionId: `telegram:${chatId}`,
          profileId: null,
          activity: "[Approval] work telegram callback",
        };
      }

      const capitalApproval = await tryHandleCapitalTradeApprovalTelegramCallback(cqId, chatId, data);
      if (capitalApproval.handled && capitalApproval.text) {
        await sendTelegramApprovalMessage(chatId, capitalApproval.text);
        return {
          text: capitalApproval.text,
          appId: "my-capital",
          sessionId: `telegram:${chatId}`,
          profileId: null,
          activity: "[Approval] capital telegram callback",
        };
      }

      const approval = await tryHandleApprovalTelegramCallback(cqId, chatId, data);
      if (approval.handled && approval.text) {
        await sendTelegramApprovalMessage(chatId, approval.text);
        return {
          text: approval.text,
          appId: "my-content-creator",
          sessionId: `telegram:${chatId}`,
          profileId: null,
          activity: "[Approval] telegram callback",
        };
      }
    }
    return null;
  }

  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return null;
  const chat = message.chat as Record<string, unknown> | undefined;
  const text = typeof message.text === "string" ? message.text : "";
  if (!chat || !text) return null;
  const chatId = String(chat.id ?? "");
  if (!chatId) return null;

  const approval = await tryHandleApprovalTelegramMessage(chatId, text);
  if (approval.handled && approval.text) {
    await sendTelegramApprovalMessage(chatId, approval.text);
    return {
      text: approval.text,
      appId: "my-content-creator",
      sessionId: `telegram:${chatId}`,
      profileId: null,
      activity: "[Approval] telegram command",
    };
  }

  const reply = await handleInboundChannelMessage({
    channel: "telegram",
    externalChatId: chatId,
    text,
    senderLabel: typeof chat.username === "string" ? chat.username : String(chat.id ?? ""),
  });

  await sendChannelReply("telegram", chatId, reply.text);
  return reply;
}

export async function handleWhatsAppWebhook(body: Record<string, unknown>): Promise<ChannelReply[]> {
  const replies: ChannelReply[] = [];
  const entry = body.entry as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(entry)) return replies;

  for (const item of entry) {
    const changes = item.changes as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;
      const messages = value.messages as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(messages)) continue;
      for (const message of messages) {
        const from = typeof message.from === "string" ? message.from : "";
        const textObj = message.text as Record<string, unknown> | undefined;
        const text = typeof textObj?.body === "string" ? textObj.body : "";
        if (!from || !text.trim()) continue;

        const reply = await handleInboundChannelMessage({
          channel: "whatsapp",
          externalChatId: from,
          text,
          senderLabel: from,
        });
        await sendChannelReply("whatsapp", from, reply.text);
        replies.push(reply);
      }
    }
  }
  return replies;
}

export async function handleIMessageWebhook(body: Record<string, unknown>): Promise<ChannelReply | null> {
  const type = typeof body.type === "string" ? body.type : "";
  if (type !== "new-message" && type !== "updated-message") return null;

  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return null;
  const text = typeof data.text === "string" ? data.text : "";
  if (!text.trim()) return null;
  if (data.isFromMe === true) return null;

  const chats = data.chats as Array<Record<string, unknown>> | undefined;
  const chatGuid =
    (Array.isArray(chats) && typeof chats[0]?.guid === "string" ? chats[0].guid : null) ||
    (typeof data.chatGuid === "string" ? data.chatGuid : null);
  if (!chatGuid) return null;

  const handle = data.handle as Record<string, unknown> | undefined;
  const senderLabel =
    typeof handle?.address === "string" ? handle.address : typeof data.sender === "string" ? data.sender : chatGuid;

  const reply = await handleInboundChannelMessage({
    channel: "imessage",
    externalChatId: chatGuid,
    text,
    senderLabel,
  });

  await sendChannelReply("imessage", chatGuid, reply.text);
  return reply;
}
