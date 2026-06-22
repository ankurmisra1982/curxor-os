import "server-only";

import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { publishDigitalIntent } from "./mesh-publish";
import { appendWorkSyncLog } from "./work-store";
import type { OutboundSend } from "./work-queue-types";
import { emitWorkXpEvent } from "./work-xp-events";
import { notifyWorkApprovalTelegram } from "./work-approval-telegram";

export async function notifyWorkPendingApproval(send: OutboundSend): Promise<{ demoLogged: boolean }> {
  const text = [
    "📬 Outreach Claw — send pending approval",
    `${send.id} · ${send.to}`,
    `Subject: ${send.subject.slice(0, 80)}`,
    "",
    "Open dashboard → Ops → Approval queue to approve or reject.",
  ].join("\n");

  for (const chatId of await listApprovalTelegramChatIds()) {
    await notifyWorkApprovalTelegram(chatId, send);
  }
  for (const channel of await listApprovalSlackChannelIds()) {
    await publishDigitalIntent({
      tool: "channel.slack.send",
      payload: { channel, text: text.slice(0, 4000) },
    });
  }

  await appendWorkSyncLog({
    connector: "approval",
    action: "approval_notify_demo",
    detail: `${send.id} · ${send.to} · pending_approval`,
  });

  await emitWorkXpEvent("approval_pending", { sendId: send.id, to: send.to });

  return { demoLogged: true };
}
