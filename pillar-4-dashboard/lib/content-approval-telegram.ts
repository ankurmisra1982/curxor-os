import "server-only";

import { publishDigitalIntent } from "./mesh-publish";
import {
  approvePost,
  approveReply,
  listApprovalQueue,
  rejectPost,
  rejectReply,
} from "./content-approval-service";
import {
  approvalTelegramConfigured,
  listApprovalTelegramChatIds,
  notifyApprovalViaTelegramEnabled,
} from "./content-approval-telegram-config";
import { pauseAllPublishing, resumeAllPublishing } from "./content-ops-controls";
import type { ContentPost } from "./content-queue-types";
import type { ContentReply } from "./content-replies-store";

export type ApprovalTelegramCommand =
  | { kind: "list" }
  | { kind: "approve"; target: "post" | "reply"; id: string }
  | { kind: "reject"; target: "post" | "reply"; id: string; reason?: string }
  | { kind: "pause"; reason?: string }
  | { kind: "resume" };

const POST_ID = /^POST-\d+$/i;
const BOT_SUFFIX = /@[\w_]+$/;

function stripBotSuffix(text: string): string {
  return text.replace(BOT_SUFFIX, "").trim();
}

export function parseApprovalTelegramText(text: string): ApprovalTelegramCommand | null {
  const t = stripBotSuffix(text.trim());
  if (!t.startsWith("/")) return null;

  if (/^\/approvals?\b/i.test(t)) return { kind: "list" };
  if (/^\/pause(?:@\w+)?(?:\s+(.*))?$/i.test(t)) {
    const m = t.match(/^\/pause(?:@\w+)?(?:\s+(.*))?$/i);
    return { kind: "pause", reason: m?.[1]?.trim() || undefined };
  }
  if (/^\/resume(?:@\w+)?\b/i.test(t)) return { kind: "resume" };

  const approve = t.match(/^\/approve(?:@\w+)?\s+(?:(reply)\s+)?(\S+)(?:\s+(.*))?$/i);
  if (approve) {
    const isReply = approve[1]?.toLowerCase() === "reply";
    const id = approve[2]!.toUpperCase();
    if (isReply) return { kind: "approve", target: "reply", id: approve[2]! };
    if (POST_ID.test(id)) return { kind: "approve", target: "post", id };
    return { kind: "approve", target: "reply", id: approve[2]! };
  }

  const reject = t.match(/^\/reject(?:@\w+)?\s+(?:(reply)\s+)?(\S+)(?:\s+(.*))?$/i);
  if (reject) {
    const isReply = reject[1]?.toLowerCase() === "reply";
    const id = reject[2]!.toUpperCase();
    const reason = reject[3]?.trim() || undefined;
    if (isReply) return { kind: "reject", target: "reply", id: reject[2]!, reason };
    if (POST_ID.test(id)) return { kind: "reject", target: "post", id, reason };
    return { kind: "reject", target: "reply", id: reject[2]!, reason };
  }

  return null;
}

export function parseApprovalTelegramCallback(data: string): ApprovalTelegramCommand | null {
  const parts = data.split(":");
  if (parts[0] !== "cap" || parts.length < 3) return null;
  const action = parts[1];
  const targetKind = parts[2];
  const id = parts.slice(3).join(":");
  if (!id) return null;

  if (action === "ap" && targetKind === "p") return { kind: "approve", target: "post", id: id.toUpperCase() };
  if (action === "ar" && targetKind === "r") return { kind: "approve", target: "reply", id };
  if (action === "rp" && targetKind === "p") return { kind: "reject", target: "post", id: id.toUpperCase(), reason: "Rejected via Telegram" };
  if (action === "rr" && targetKind === "r") return { kind: "reject", target: "reply", id, reason: "Rejected via Telegram" };
  return null;
}

export function isApprovalTelegramCommand(text: string): boolean {
  return parseApprovalTelegramText(text) !== null;
}

async function isAuthorizedChat(chatId: string): Promise<boolean> {
  const allowed = await listApprovalTelegramChatIds();
  if (allowed.length === 0) return false;
  return allowed.includes(chatId);
}

function actorForChat(chatId: string): string {
  return `telegram:${chatId}`;
}

function preview(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}

function postKeyboard(postId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `cap:ap:p:${postId}` },
        { text: "❌ Reject", callback_data: `cap:rp:p:${postId}` },
      ],
    ],
  };
}

function replyKeyboard(replyId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `cap:ar:r:${replyId}` },
        { text: "❌ Reject", callback_data: `cap:rr:r:${replyId}` },
      ],
    ],
  };
}

export async function sendTelegramApprovalMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const payload: Record<string, unknown> = { chat_id: chatId, text: text.slice(0, 4096) };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  const result = await publishDigitalIntent({
    tool: "channel.telegram.send",
    payload,
  });
  return { ok: result.ok, error: result.error };
}

async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await publishDigitalIntent({
    tool: "channel.telegram.send",
    payload: { callback_query_id: callbackQueryId, callback_answer: text.slice(0, 200) },
  });
}

export async function formatApprovalQueueMessage(): Promise<string> {
  const queue = await listApprovalQueue();
  if (queue.posts.length === 0 && queue.replies.length === 0) {
    return "Creator Claw — no items awaiting approval.";
  }

  const lines = ["Creator Claw — pending approval:", ""];
  for (const p of queue.posts) {
    lines.push(`📄 ${p.id} · ${p.platform} · ${p.channel}`);
    lines.push(`   ${preview(p.draftText)}`);
    lines.push(`   /approve ${p.id}  ·  /reject ${p.id}`);
    lines.push("");
  }
  for (const r of queue.replies) {
    lines.push(`💬 reply ${r.id.slice(0, 8)}… · ${r.platform}`);
    lines.push(`   ${preview(r.replyText)}`);
    lines.push(`   /approve reply ${r.id}  ·  /reject reply ${r.id}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

async function executeApprovalCommand(
  cmd: ApprovalTelegramCommand,
  chatId: string,
): Promise<string> {
  const actor = actorForChat(chatId);

  if (cmd.kind === "list") {
    return await formatApprovalQueueMessage();
  }

  if (cmd.kind === "pause") {
    await pauseAllPublishing(cmd.reason ?? "Paused via Telegram", actor);
    return "⛔ All publishing paused.";
  }

  if (cmd.kind === "resume") {
    await resumeAllPublishing(actor);
    return "✅ Publishing resumed.";
  }

  if (cmd.kind === "approve") {
    if (cmd.target === "post") {
      try {
        const result = await approvePost(cmd.id, actor);
        return result.ok
          ? `✅ ${cmd.id} approved — publish intent submitted.`
          : `⚠️ ${cmd.id} approved but bridge failed: ${result.error ?? "unknown error"}`;
      } catch (err) {
        return `❌ Could not approve ${cmd.id}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    try {
      const result = await approveReply(cmd.id, actor);
      return result.ok
        ? `✅ Reply approved — publish intent submitted.`
        : `⚠️ Reply approved but bridge failed: ${result.error ?? "unknown error"}`;
    } catch (err) {
      return `❌ Could not approve reply: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (cmd.target === "post") {
    const post = await rejectPost(cmd.id, cmd.reason, actor);
    return post ? `❌ ${cmd.id} rejected.` : `❌ ${cmd.id} is not pending approval.`;
  }
  const reply = await rejectReply(cmd.id, cmd.reason, actor);
  return reply ? "❌ Reply rejected." : "❌ Reply is not pending approval.";
}

export async function tryHandleApprovalTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ handled: boolean; text?: string }> {
  const cmd = parseApprovalTelegramText(text);
  if (!cmd) return { handled: false };

  if (!(await isAuthorizedChat(chatId))) {
    const configured = await approvalTelegramConfigured();
    return {
      handled: true,
      text: configured
        ? "This chat is not authorized for approval commands. Add your chat ID to CURXOR_APPROVAL_TELEGRAM_CHAT_IDS."
        : "Telegram approval is not configured. Set CURXOR_APPROVAL_TELEGRAM_CHAT_IDS or approvalTelegramChatIds in Creator Claw FRE.",
    };
  }

  const response = await executeApprovalCommand(cmd, chatId);
  return { handled: true, text: response };
}

export async function tryHandleApprovalTelegramCallback(
  callbackQueryId: string,
  chatId: string,
  data: string,
): Promise<{ handled: boolean; text?: string }> {
  const cmd = parseApprovalTelegramCallback(data);
  if (!cmd) return { handled: false };

  if (!(await isAuthorizedChat(chatId))) {
    await answerCallbackQuery(callbackQueryId, "Unauthorized");
    return { handled: true, text: "Unauthorized chat." };
  }

  const response = await executeApprovalCommand(cmd, chatId);
  await answerCallbackQuery(callbackQueryId, response.slice(0, 200));
  return { handled: true, text: response };
}

export async function notifyPostPendingApproval(post: ContentPost): Promise<void> {
  if (!(await notifyApprovalViaTelegramEnabled())) return;

  const chatIds = await listApprovalTelegramChatIds();
  const text = [
    "🔔 Creator Claw — post needs approval",
    `${post.id} · ${post.platform} · ${post.channel}`,
    preview(post.draftText, 200),
    "",
    `/approve ${post.id}`,
    `/reject ${post.id}`,
  ].join("\n");

  for (const chatId of chatIds) {
    await sendTelegramApprovalMessage(chatId, text, postKeyboard(post.id));
  }
}

export async function notifyReplyPendingApproval(reply: ContentReply): Promise<void> {
  if (!(await notifyApprovalViaTelegramEnabled())) return;

  const chatIds = await listApprovalTelegramChatIds();
  const text = [
    "🔔 Creator Claw — reply needs approval",
    `${reply.platform} · post ${reply.postId}`,
    preview(reply.replyText, 200),
    "",
    `/approve reply ${reply.id}`,
    `/reject reply ${reply.id}`,
  ].join("\n");

  for (const chatId of chatIds) {
    await sendTelegramApprovalMessage(chatId, text, replyKeyboard(reply.id));
  }
}

export async function getApprovalTelegramStatus(): Promise<{
  configured: boolean;
  notifyEnabled: boolean;
  chatIdCount: number;
}> {
  const chatIds = await listApprovalTelegramChatIds();
  return {
    configured: chatIds.length > 0,
    notifyEnabled: await notifyApprovalViaTelegramEnabled(),
    chatIdCount: chatIds.length,
  };
}
