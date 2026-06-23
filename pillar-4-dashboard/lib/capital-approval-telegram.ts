import "server-only";

import { appendAgentAudit } from "./capital-agent-audit";
import { listApprovalTelegramChatIds } from "./content-approval-telegram-config";
import { sendTelegramApprovalMessage } from "./content-approval-telegram";
import type { CapitalTrade } from "./capital-queue-types";
import { ensureCapitalQueue, updateTrade } from "./capital-store";
import { submitTradeToBridge } from "./capital-trade-executor";

export type CapitalTradeApprovalTelegramCommand =
  | { kind: "approve"; tradeId: string }
  | { kind: "reject"; tradeId: string; reason?: string };

/** Prefix `cpt` — capital trade (Creator post/reply uses `cap`). */
export function capitalTradeApprovalKeyboard(tradeId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve trade", callback_data: `cpt:ap:${tradeId}` },
        { text: "❌ Reject", callback_data: `cpt:rj:${tradeId}` },
      ],
    ],
  };
}

export function parseCapitalTradeApprovalTelegramCallback(
  data: string,
): CapitalTradeApprovalTelegramCommand | null {
  const parts = data.split(":");
  if (parts[0] !== "cpt" || parts.length < 3) return null;
  const action = parts[1];
  const tradeId = parts.slice(2).join(":");
  if (!tradeId) return null;
  if (action === "ap") return { kind: "approve", tradeId };
  if (action === "rj") return { kind: "reject", tradeId, reason: "Rejected via Telegram" };
  return null;
}

async function isAuthorizedChat(chatId: string): Promise<boolean> {
  const allowed = await listApprovalTelegramChatIds();
  if (allowed.length === 0) return false;
  return allowed.includes(chatId);
}

export async function notifyCapitalTradeApprovalTelegram(
  chatId: string,
  trade: CapitalTrade,
): Promise<{ ok: boolean; error?: string }> {
  const text = [
    "📋 Capital Claw — trade pending approval",
    `${trade.id} · ${trade.action.toUpperCase()} ${trade.qty} ${trade.ticker}`,
    trade.approvalNote ? `Note: ${trade.approvalNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return sendTelegramApprovalMessage(chatId, text, capitalTradeApprovalKeyboard(trade.id));
}

export async function approvePendingCapitalTrade(
  tradeId: string,
  via: "telegram" | "api" = "api",
): Promise<{ ok: boolean; trade?: CapitalTrade; error?: string }> {
  const file = await ensureCapitalQueue();
  const trade = file.trades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== "pending_approval") {
    return { ok: false, error: "Trade not pending approval" };
  }
  await appendAgentAudit({
    kind: "execute",
    source: "claw",
    ticker: trade.ticker,
    qty: trade.qty,
    action: trade.action,
    tradeId,
    note: `Approved ${tradeId} via ${via}`,
  });
  return submitTradeToBridge(tradeId);
}

export async function rejectPendingCapitalTrade(
  tradeId: string,
  reason: string,
  via: "telegram" | "api" = "api",
): Promise<CapitalTrade | null> {
  const file = await ensureCapitalQueue();
  const trade = file.trades.find((t) => t.id === tradeId);
  if (!trade || trade.status !== "pending_approval") return null;
  const updated = await updateTrade(tradeId, {
    status: "failed",
    error: reason,
    approvalNote: `rejected · ${reason}`,
  });
  if (updated) {
    await appendAgentAudit({
      kind: "blocked",
      source: "claw",
      ticker: trade.ticker,
      qty: trade.qty,
      action: trade.action,
      tradeId,
      note: `Rejected ${tradeId} via ${via} · ${reason}`,
    });
  }
  return updated;
}

export async function tryHandleCapitalTradeApprovalTelegramCallback(
  callbackQueryId: string,
  chatId: string,
  data: string,
): Promise<{ handled: boolean; text?: string }> {
  const cmd = parseCapitalTradeApprovalTelegramCallback(data);
  if (!cmd) return { handled: false };

  if (!(await isAuthorizedChat(chatId))) {
    return { handled: true, text: "This chat is not authorized for Capital approval callbacks." };
  }

  if (cmd.kind === "approve") {
    const result = await approvePendingCapitalTrade(cmd.tradeId, "telegram");
    return {
      handled: true,
      text: result.ok
        ? `✅ ${cmd.tradeId} approved · ${result.trade?.status ?? "submitted"}`
        : `⚠️ Could not approve ${cmd.tradeId}: ${result.error ?? "unknown"}`,
    };
  }

  const trade = await rejectPendingCapitalTrade(
    cmd.tradeId,
    cmd.reason ?? "Rejected via Telegram",
    "telegram",
  );
  return {
    handled: true,
    text: trade ? `❌ ${cmd.tradeId} rejected.` : `❌ ${cmd.tradeId} is not pending approval.`,
  };
}
