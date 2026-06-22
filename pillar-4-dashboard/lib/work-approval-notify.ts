import "server-only";

import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { publishDigitalIntent } from "./mesh-publish";
import type { OutboundSend } from "./work-queue-types";

export async function notifyWorkPendingApproval(send: OutboundSend): Promise<void> {
  const text = [
    "📬 Outreach Claw — send pending approval",
    `${send.id} · ${send.to}`,
    `Subject: ${send.subject.slice(0, 80)}`,
    "",
    "Open dashboard → Ops → Approval queue to approve or reject.",
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
