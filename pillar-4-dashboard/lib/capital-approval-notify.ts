import "server-only";

import type { CapitalRule, CapitalTrade } from "./capital-queue-types";
import { notifyCapitalTradeApprovalTelegram } from "./capital-approval-telegram";
import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { loadDigitalEnv } from "./digital-env";
import { publishDigitalIntent } from "./mesh-publish";

async function notifyCapitalApprovalEmail(text: string): Promise<void> {
  const env = await loadDigitalEnv();
  const to =
    process.env.CURXOR_CAPITAL_APPROVAL_EMAIL?.trim() ||
    env.CURXOR_CAPITAL_APPROVAL_EMAIL?.trim() ||
    env.SMTP_FROM?.trim();
  if (!to || !env.SMTP_HOST?.trim() || !env.SMTP_FROM?.trim()) return;
  await publishDigitalIntent({
    tool: "work.email.send",
    payload: {
      to,
      subject: "Capital Claw — trade awaiting approval",
      body: text.slice(0, 8000),
    },
  });
}

export async function notifyCapitalTradeApproval(trade: CapitalTrade, rule?: CapitalRule | null): Promise<void> {
  const text = [
    "📋 Capital Claw — trade approval required",
    `${trade.id} · ${trade.action.toUpperCase()} ${trade.qty} ${trade.ticker}`,
    rule ? `Rule: ${rule.name} (${rule.id})` : "",
    trade.riskDecision ? `Risk: ${trade.riskDecision}` : "",
    trade.approvalNote ? `Note: ${trade.approvalNote}` : "",
    "",
    "Tap Approve below or open dashboard → Trade log.",
  ]
    .filter(Boolean)
    .join("\n");

  for (const chatId of await listApprovalTelegramChatIds()) {
    await notifyCapitalTradeApprovalTelegram(chatId, trade);
  }
  for (const channel of await listApprovalSlackChannelIds()) {
    await publishDigitalIntent({
      tool: "channel.slack.send",
      payload: { channel, text: text.slice(0, 4000) },
    });
  }
  await notifyCapitalApprovalEmail(text);
}
