import "server-only";

import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { publishDigitalIntent } from "./mesh-publish";
import type { OutboundSend } from "./work-queue-types";

const recentFailureAlerts = new Map<string, number>();
const COOLDOWN_MS = 5 * 60_000;

function shouldNotify(sendId: string): boolean {
  const now = Date.now();
  const last = recentFailureAlerts.get(sendId);
  if (last && now - last < COOLDOWN_MS) return false;
  recentFailureAlerts.set(sendId, now);
  return true;
}

function notifyEnabled(): boolean {
  const flag = process.env.CURXOR_WORK_FAILURE_NOTIFY?.trim().toLowerCase();
  if (flag === "0" || flag === "false") return false;
  return true;
}

export async function notifyWorkSendFailure(send: OutboundSend, error: string): Promise<void> {
  if (!notifyEnabled() || !shouldNotify(send.id)) return;

  const text = [
    "🚨 Outreach Claw — send failed",
    `${send.id} · ${send.to}`,
    `Subject: ${send.subject.slice(0, 80)}`,
    "",
    `Error: ${error.slice(0, 240)}`,
    "",
    "Open dashboard → Outreach Recovery to retry.",
  ].join("\n");

  for (const chatId of await listApprovalTelegramChatIds()) {
    await sendTelegramApprovalMessage(chatId, text);
  }
  for (const channel of await listApprovalSlackChannelIds()) {
    await publishDigitalIntent({
      tool: "channel.slack.send",
      payload: { channel, text: text.slice(0, 4000) },
    });
  }
}
