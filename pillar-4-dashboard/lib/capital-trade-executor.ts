import "server-only";

import { readAppFreState } from "./app-fre-state";
import { notifyCapitalTradeApproval } from "./capital-approval-notify";
import { canAutonomousTrade, requiresApprovalPerTrade } from "./capital-permissions";
import { checkTradeRisk } from "./capital-risk-guard";
import { publishDigitalIntent } from "./mesh-publish";
import type { CapitalRule, CapitalTrade, BrokerId } from "./capital-queue-types";
import {
  ensureCapitalQueue,
  fetchCapitalStatus,
  getCapitalRule,
  recordTrade,
  updateTrade,
} from "./capital-store";
import { notifyCapitalTradeFailure } from "./capital-publish-failure-notify";
import { shouldAutoApproveTrade, buildApprovalAuditNote } from "./capital-auto-approval";
import { isRobinhoodMcpLinked } from "./capital-robinhood-mcp";
import { isBrokerBridgeConfigured, brokerConfigLabel } from "./capital-broker-config";
import { canExecuteLiveTrades } from "./capital-live-gate";
import { fetchQuotesForSymbols } from "./capital-quotes";

export function requireCapitalTradeApproval(): boolean {
  const env = process.env.CURXOR_CAPITAL_REQUIRE_APPROVAL?.trim().toLowerCase();
  return env === "1" || env === "true";
}

export async function buildTradeIntent(input: {
  ticker: string;
  qty: number;
  action: "buy" | "sell";
  ruleId?: string;
  tradeId?: string;
  mode?: string;
  idempotencyKey?: string | null;
  takeProfitPct?: number | null;
  stopLossPct?: number | null;
  brokerId?: string;
  referencePrice?: number | null;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
}): Promise<{ tool: string; payload: Record<string, unknown> }> {
  const broker = input.brokerId ?? "alpaca";
  const tool =
    broker === "robinhood_mcp"
      ? "capital.execute_trade_robinhood"
      : "capital.execute_trade";
  return {
    tool,
    payload: {
      ticker: input.ticker,
      qty: input.qty,
      action: input.action,
      mode: input.mode ?? "paper",
      rule_id: input.ruleId,
      trade_id: input.tradeId,
      client_order_id: input.idempotencyKey ?? input.tradeId,
      take_profit_pct: input.takeProfitPct,
      stop_loss_pct: input.stopLossPct,
      take_profit_price: input.takeProfitPrice,
      stop_loss_price: input.stopLossPrice,
      reference_price: input.referencePrice,
      broker_id: input.brokerId ?? "alpaca",
    },
  };
}

export async function executeCapitalTrade(input: {
  ruleId?: string;
  ticker?: string;
  qty?: number;
  action?: "buy" | "sell";
  source?: CapitalTrade["source"];
  brokerId?: BrokerId;
  pilotId?: string | null;
  subscriptionId?: string | null;
  idempotencyKey?: string | null;
  skipAutonomousGate?: boolean;
  skipRiskGuard?: boolean;
}): Promise<{ ok: boolean; trade?: CapitalTrade; error?: string }> {
  const file = await ensureCapitalQueue();
  if (file.tradingPaused) {
    return { ok: false, error: "Trading paused (crisis mode)" };
  }

  const fre = await readAppFreState("my-capital");
  const tradingMode = typeof fre.config.tradingMode === "string" ? fre.config.tradingMode : "paper";

  if (tradingMode === "live") {
    const liveGate = await canExecuteLiveTrades();
    if (!liveGate.allowed) {
      return { ok: false, error: liveGate.reason ?? "Live trading not permitted" };
    }
  }

  let rule: CapitalRule | null = null;
  if (input.ruleId) {
    rule = await getCapitalRule(input.ruleId);
    if (!rule) return { ok: false, error: "Rule not found" };
    if (rule.state !== "ARMED" && !input.skipAutonomousGate) {
      return { ok: false, error: `Rule ${rule.id} is ${rule.state}` };
    }
  }

  const source = input.source ?? "manual";
  if (
    source === "autonomous" &&
    !input.skipAutonomousGate &&
    !canAutonomousTrade(file.permissions)
  ) {
    return { ok: false, error: "Autonomous trading not permitted — grant permission in Capital desk" };
  }

  const brokerId = input.brokerId ?? rule?.brokerId ?? file.permissions.activeBrokerId ?? "alpaca";
  const ticker = (input.ticker ?? rule?.asset ?? "").trim().toUpperCase();
  const action = input.action ?? rule?.action ?? "buy";
  const qty = input.qty ?? rule?.qty ?? 1;
  if (!ticker) return { ok: false, error: "Missing ticker" };

  if (input.idempotencyKey) {
    const existing = file.trades.find((t) => t.idempotencyKey === input.idempotencyKey);
    if (existing) {
      return {
        ok: existing.status !== "failed" && existing.status !== "blocked_risk",
        trade: existing,
        error: existing.error ?? undefined,
      };
    }
  }

  const status = await fetchCapitalStatus();
  if (!input.skipRiskGuard) {
    const risk = checkTradeRisk({
      ticker: ticker.replace("-", ""),
      action,
      qty,
      portfolioValue: status.portfolioValue,
      buyingPower: status.buyingPower,
      positions: file.positions,
      trades: file.trades,
      riskLimits: file.riskLimits,
      permissions: file.permissions,
      autoTradesToday: file.autoTradesToday,
      dailyPnlPct: file.dailyPnlPct,
      source,
    });
    if (!risk.allowed) {
      const blocked = await recordTrade({
        ruleId: rule?.id ?? null,
        pilotId: input.pilotId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        ticker,
        action,
        qty,
        status: "blocked_risk",
        mode: tradingMode,
        brokerId,
        orderId: null,
        filledPrice: null,
        error: risk.reason,
        intentId: null,
        idempotencyKey: input.idempotencyKey ?? null,
        riskDecision: risk.reason,
        takeProfitPct: rule?.takeProfitPct ?? null,
        stopLossPct: rule?.stopLossPct ?? null,
        source,
        approvalNote: `blocked · ${risk.reason}`,
        submittedAt: null,
        filledAt: null,
      });
      return { ok: false, trade: blocked, error: risk.reason };
    }
  }

  if (tradingMode === "dry_run") {
    const trade = await recordTrade({
      ruleId: rule?.id ?? null,
      pilotId: input.pilotId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      ticker,
      action,
      qty,
      status: "dry_run",
      mode: tradingMode,
      brokerId,
      orderId: null,
      filledPrice: null,
      error: null,
      intentId: null,
      idempotencyKey: input.idempotencyKey ?? null,
      riskDecision: "ok",
      takeProfitPct: rule?.takeProfitPct ?? null,
      stopLossPct: rule?.stopLossPct ?? null,
      source,
      approvalNote: "dry run · logged only",
      submittedAt: null,
      filledAt: new Date().toISOString(),
    });
    return { ok: true, trade };
  }

  const needsApproval =
    !(
      (await shouldAutoApproveFromStore(source, ticker, qty, tradingMode))
    ) &&
    (requireCapitalTradeApproval() ||
      (requiresApprovalPerTrade(file.permissions) &&
        (source === "autonomous" || source === "agent" || source === "tradingview")));

  const quotesForAudit = await fetchQuotesForSymbols([ticker]);
  const auditNotional = (quotesForAudit[0]?.close ?? 100) * qty;
  const autoApproved =
    !needsApproval &&
    shouldAutoApproveTrade({
      policy: file.autoApproval,
      permissions: file.permissions,
      tradingMode,
      source,
      notionalUsd: auditNotional,
    });
  const approvalNote = buildApprovalAuditNote({
    autoApproved,
    needsApproval: needsApproval && !input.skipAutonomousGate,
    policy: file.autoApproval,
    tradingMode,
    notionalUsd: auditNotional,
    source,
  });

  const trade = await recordTrade({
    ruleId: rule?.id ?? null,
    pilotId: input.pilotId ?? null,
    subscriptionId: input.subscriptionId ?? null,
    ticker,
    action,
    qty,
    status: needsApproval && !input.skipAutonomousGate ? "pending_approval" : "queued",
    mode: tradingMode,
    brokerId,
    orderId: null,
    filledPrice: null,
    error: null,
    intentId: null,
    idempotencyKey: input.idempotencyKey ?? null,
    riskDecision: "ok",
    takeProfitPct: rule?.takeProfitPct ?? null,
    stopLossPct: rule?.stopLossPct ?? null,
    source,
    approvalNote,
    submittedAt: null,
    filledAt: null,
  });

  if (needsApproval && !input.skipAutonomousGate) {
    await notifyCapitalTradeApproval(trade, rule);
    const { emitCapitalXpEvent } = await import("./capital-xp-events");
    void emitCapitalXpEvent("trade_pending_approval", { tradeId: trade.id, asset: ticker, appId: "my-capital" });
    return { ok: true, trade };
  }

  return submitTradeToBridge(trade.id);
}

export async function submitTradeToBridge(tradeId: string): Promise<{ ok: boolean; trade?: CapitalTrade; error?: string }> {
  const file = await ensureCapitalQueue();
  const trade = file.trades.find((t) => t.id === tradeId);
  if (!trade) return { ok: false, error: "Trade not found" };

  const nonResubmit = new Set<CapitalTrade["status"]>([
    "submitted",
    "filled",
    "simulated",
    "dry_run",
    "blocked_risk",
  ]);
  if (nonResubmit.has(trade.status)) {
    return {
      ok: trade.status === "filled" || trade.status === "simulated",
      trade,
      error: trade.status === "submitted" ? "Trade already submitted" : undefined,
    };
  }

  if (trade.mode === "live") {
    const liveGate = await canExecuteLiveTrades();
    if (!liveGate.allowed) {
      const failed = await updateTrade(tradeId, {
        status: "failed",
        error: liveGate.reason ?? "Live trading blocked",
      });
      return { ok: false, trade: failed ?? undefined, error: liveGate.reason };
    }
  }

  const rule = trade.ruleId ? file.rules.find((r) => r.id === trade.ruleId) : null;
  const tpPct = trade.takeProfitPct ?? rule?.takeProfitPct ?? null;
  const slPct = trade.stopLossPct ?? rule?.stopLossPct ?? null;
  const quotes = await fetchQuotesForSymbols([trade.ticker]);
  const ref = quotes[0]?.close ?? null;

  const bridgeConfigured =
    trade.brokerId === "robinhood_mcp"
      ? await isRobinhoodMcpLinked()
      : await isBrokerBridgeConfigured(trade.brokerId);
  if (!bridgeConfigured && trade.mode !== "dry_run") {
    const simulated = await simulateDemoFill(tradeId, ref);
    return { ok: true, trade: simulated ?? undefined };
  }

  const takeProfitPrice =
    ref && tpPct != null && tpPct > 0 ? roundPrice(ref * (1 + tpPct / 100), trade.ticker) : null;
  const stopLossPrice =
    ref && slPct != null && slPct > 0 ? roundPrice(ref * (1 - slPct / 100), trade.ticker) : null;

  const digital = await buildTradeIntent({
    ticker: trade.ticker,
    qty: trade.qty,
    action: trade.action,
    ruleId: trade.ruleId ?? undefined,
    tradeId: trade.id,
    mode: trade.mode,
    idempotencyKey: trade.idempotencyKey,
    takeProfitPct: tpPct,
    stopLossPct: slPct,
    takeProfitPrice,
    stopLossPrice,
    referencePrice: ref,
    brokerId: trade.brokerId,
  });

  const result = await publishDigitalIntent(digital);
  if (result.ok) {
    const updated = await updateTrade(tradeId, {
      status: "submitted",
      intentId: result.id,
      submittedAt: new Date().toISOString(),
      error: null,
    });
    return { ok: true, trade: updated ?? undefined };
  }

  const err = result.error ?? "Bridge submit failed";
  const failed = await updateTrade(tradeId, { status: "failed", error: err });
  if (failed) await notifyCapitalTradeFailure(failed, err);
  return { ok: false, trade: failed ?? undefined, error: err };
}

export async function markTradeFilledFromReceipt(
  tradeId: string,
  receipt: { order_id?: string; filled_price?: string | number; status?: string },
): Promise<CapitalTrade | null> {
  const price =
    typeof receipt.filled_price === "number"
      ? receipt.filled_price
      : receipt.filled_price
        ? Number.parseFloat(String(receipt.filled_price))
        : null;
  return updateTrade(tradeId, {
    status: "filled",
    orderId: receipt.order_id ? String(receipt.order_id) : null,
    filledPrice: Number.isFinite(price) ? price : null,
    filledAt: new Date().toISOString(),
    error: null,
  });
}

function roundPrice(value: number, ticker: string): number {
  const decimals = ticker.includes("-") || ticker.includes("/") ? 4 : 2;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Demo-mode fill when broker bridge is not configured — uses quote cache price. */
async function simulateDemoFill(tradeId: string, refPrice: number | null): Promise<CapitalTrade | null> {
  const file = await ensureCapitalQueue();
  const trade = file.trades.find((t) => t.id === tradeId);
  const fill =
    refPrice != null && refPrice > 0
      ? refPrice
      : trade?.ticker.includes("-")
        ? 100
        : 50;
  return updateTrade(tradeId, {
    status: "simulated",
    filledPrice: roundPrice(fill, trade?.ticker ?? "SPY"),
    filledAt: new Date().toISOString(),
    orderId: `SIM-${tradeId.slice(-6)}`,
    error: null,
    approvalNote: `${trade?.approvalNote ?? ""} · simulated fill · not sent to broker`.trim(),
  });
}

async function shouldAutoApproveFromStore(
  source: CapitalTrade["source"],
  ticker: string,
  qty: number,
  tradingMode: string,
): Promise<boolean> {
  const file = await ensureCapitalQueue();
  const quotes = await fetchQuotesForSymbols([ticker]);
  const ref = quotes[0]?.close ?? 100;
  return shouldAutoApproveTrade({
    policy: file.autoApproval,
    permissions: file.permissions,
    tradingMode,
    source,
    notionalUsd: ref * qty,
  });
}

export async function previewTrade(input: {
  ticker: string;
  qty: number;
  action: "buy" | "sell";
  ruleId?: string;
  brokerId?: BrokerId;
}): Promise<{
  ok: boolean;
  preview?: {
    ticker: string;
    action: string;
    qty: number;
    referencePrice: number | null;
    estimatedNotionalUsd: number | null;
    brokerId: string;
    buyingPower: number | null;
    autoApproveEligible: boolean;
    riskNote: string | null;
  };
  error?: string;
}> {
  const file = await ensureCapitalQueue();
  const fre = await readAppFreState("my-capital");
  const tradingMode = typeof fre.config.tradingMode === "string" ? fre.config.tradingMode : "paper";
  const ticker = input.ticker.trim().toUpperCase();
  const brokerId = input.brokerId ?? file.permissions.activeBrokerId ?? "alpaca";
  const quotes = await fetchQuotesForSymbols([ticker]);
  const ref = quotes[0]?.close ?? null;
  const notional = ref != null ? ref * input.qty : null;
  const status = await fetchCapitalStatus();
  const autoApproveEligible =
    notional != null &&
    shouldAutoApproveTrade({
      policy: file.autoApproval,
      permissions: file.permissions,
      tradingMode,
      source: "manual",
      notionalUsd: notional,
    });
  const risk = checkTradeRisk({
    ticker: ticker.replace("-", ""),
    action: input.action,
    qty: input.qty,
    portfolioValue: status.portfolioValue,
    buyingPower: status.buyingPower,
    positions: file.positions,
    trades: file.trades,
    riskLimits: file.riskLimits,
    permissions: file.permissions,
    autoTradesToday: file.autoTradesToday,
    dailyPnlPct: file.dailyPnlPct,
    source: "manual",
  });
  return {
    ok: true,
    preview: {
      ticker,
      action: input.action,
      qty: input.qty,
      referencePrice: ref,
      estimatedNotionalUsd: notional,
      brokerId,
      buyingPower: status.buyingPower,
      autoApproveEligible,
      riskNote: risk.allowed ? null : risk.reason,
    },
  };
}
