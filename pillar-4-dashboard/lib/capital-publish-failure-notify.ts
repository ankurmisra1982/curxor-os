import "server-only";

import { listApprovalSlackChannelIds } from "./content-approval-slack-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { publishDigitalIntent } from "./mesh-publish";
import type { CapitalTrade } from "./capital-queue-types";

const recent = new Map<string, number>();
const COOLDOWN_MS = 5 * 60_000;

function shouldNotify(tradeId: string): boolean {
  const now = Date.now();
  const last = recent.get(tradeId);
  if (last && now - last < COOLDOWN_MS) return false;
  recent.set(tradeId, now);
  return true;
}

function notifyEnabled(): boolean {
  const flag = process.env.CURXOR_CAPITAL_FAILURE_NOTIFY?.trim().toLowerCase();
  if (flag === "0" || flag === "false") return false;
  return true;
}

export async function notifyCapitalTradeFailure(trade: CapitalTrade, error: string): Promise<void> {
  if (!notifyEnabled() || !shouldNotify(trade.id)) return;

  const text = [
    "🚨 Capital Claw — trade failed",
    `${trade.id} · ${trade.action} ${trade.qty} ${trade.ticker}`,
    "",
    `Error: ${error.slice(0, 240)}`,
    "",
    "Open dashboard → Trade Recovery to retry.",
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
