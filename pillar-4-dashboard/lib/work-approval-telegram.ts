import "server-only";

import { approveSend, rejectSend } from "./work-store";
import { executeOutboundSend } from "./work-send-executor";
import { appendAgentAudit } from "./work-agent-audit";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import type { OutboundSend } from "./work-queue-types";

export type WorkApprovalTelegramCommand =
  | { kind: "approve"; sendId: string }
  | { kind: "reject"; sendId: string; reason?: string };

export function workSendApprovalKeyboard(sendId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve send", callback_data: `wrk:ap:${sendId}` },
        { text: "❌ Reject", callback_data: `wrk:rj:${sendId}` },
      ],
    ],
  };
}

export function parseWorkApprovalTelegramCallback(data: string): WorkApprovalTelegramCommand | null {
  const parts = data.split(":");
  if (parts[0] !== "wrk" || parts.length < 3) return null;
  const action = parts[1];
  const sendId = parts.slice(2).join(":");
  if (!sendId) return null;
  if (action === "ap") return { kind: "approve", sendId };
  if (action === "rj") return { kind: "reject", sendId, reason: "Rejected via Telegram" };
  return null;
}

async function isAuthorizedChat(chatId: string): Promise<boolean> {
  const allowed = await listApprovalTelegramChatIds();
  if (allowed.length === 0) return false;
  return allowed.includes(chatId);
}

export async function notifyWorkApprovalTelegram(
  chatId: string,
  send: OutboundSend,
): Promise<{ ok: boolean; error?: string }> {
  const text = [
    "📬 Work Claw — send pending approval",
    `${send.id} · ${send.to}`,
    `Subject: ${send.subject.slice(0, 80)}`,
  ].join("\n");
  return sendTelegramApprovalMessage(chatId, text, workSendApprovalKeyboard(send.id));
}

export async function tryHandleWorkApprovalTelegramCallback(
  callbackQueryId: string,
  chatId: string,
  data: string,
): Promise<{ handled: boolean; text?: string }> {
  const cmd = parseWorkApprovalTelegramCallback(data);
  if (!cmd) return { handled: false };

  if (!(await isAuthorizedChat(chatId))) {
    return { handled: true, text: "This chat is not authorized for Work approval callbacks." };
  }

  if (cmd.kind === "approve") {
    const send = await approveSend(cmd.sendId);
    if (!send) return { handled: true, text: `❌ ${cmd.sendId} is not pending approval.` };
    await appendAgentAudit({
      kind: "approval",
      source: "telegram_callback",
      note: `Approved ${cmd.sendId} via inline keyboard`,
      sendId: cmd.sendId,
    });
    const result = await executeOutboundSend(cmd.sendId);
    return {
      handled: true,
      text: result.ok ? `✅ ${cmd.sendId} approved and queued.` : `⚠️ Approved but send failed: ${result.error ?? "unknown"}`,
    };
  }

  const send = await rejectSend(cmd.sendId, cmd.reason ?? "Rejected via Telegram");
  if (!send) return { handled: true, text: `❌ ${cmd.sendId} not found or not pending.` };
  await appendAgentAudit({
    kind: "approval",
    source: "telegram_callback",
    note: `Rejected ${cmd.sendId} via inline keyboard`,
    sendId: cmd.sendId,
  });
  return { handled: true, text: `❌ ${cmd.sendId} rejected.` };
}
