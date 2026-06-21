import "server-only";

import type {
  CapitalPermissions,
  CapitalPosition,
  CapitalRiskLimits,
  CapitalTrade,
  TradeSource,
} from "./capital-queue-types";
import { defaultRiskLimits } from "./capital-defaults";

export interface RiskCheckInput {
  ticker: string;
  action: "buy" | "sell";
  qty: number;
  portfolioValue: number | null;
  buyingPower: number | null;
  positions: CapitalPosition[];
  trades: CapitalTrade[];
  riskLimits: CapitalRiskLimits;
  permissions: CapitalPermissions;
  autoTradesToday: number;
  dailyPnlPct: number;
  /** When set, daily auto-trade cap applies only to autonomous-style sources. */
  source?: TradeSource;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason: string;
  suggestedQty?: number;
}

function startOfTodayUtc(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function checkTradeRisk(input: RiskCheckInput): RiskCheckResult {
  const {
    ticker,
    action,
    qty,
    portfolioValue,
    positions,
    trades,
    riskLimits,
    permissions,
    autoTradesToday,
    dailyPnlPct,
  } = input;

  if (dailyPnlPct <= -Math.abs(riskLimits.maxDailyLossPct)) {
    return { allowed: false, reason: `Daily loss circuit breaker (${dailyPnlPct.toFixed(2)}%)` };
  }

  const countsTowardAutoCap =
    input.source === "autonomous" || input.source === "tradingview" || input.source === "agent";
  if (
    countsTowardAutoCap &&
    permissions.maxAutoTradesPerDay > 0 &&
    autoTradesToday >= permissions.maxAutoTradesPerDay
  ) {
    return { allowed: false, reason: `Auto trade daily cap reached (${permissions.maxAutoTradesPerDay})` };
  }

  const pos = positions.find((p) => p.symbol === ticker);
  if (action === "buy" && pos && pos.qty > 0) {
    return { allowed: false, reason: `Position already open for ${ticker} — no duplicate entry` };
  }
  if (action === "sell" && (!pos || pos.qty <= 0)) {
    return { allowed: false, reason: `No long position to sell for ${ticker}` };
  }

  if (portfolioValue && portfolioValue > 0 && qty > 0) {
    const estNotional = qty * (pos?.avgEntryPrice ?? 100);
    const pct = (estNotional / portfolioValue) * 100;
    if (pct > riskLimits.maxPositionPct) {
      const maxNotional = (portfolioValue * riskLimits.maxPositionPct) / 100;
      const price = pos?.avgEntryPrice ?? 100;
      const suggestedQty = Math.max(0.001, Math.floor((maxNotional / price) * 1000) / 1000);
      return {
        allowed: false,
        reason: `Position ${pct.toFixed(1)}% exceeds max ${riskLimits.maxPositionPct}%`,
        suggestedQty,
      };
    }
  }

  if (riskLimits.pdtGuard) {
    const today = startOfTodayUtc();
    const dayTrades = trades.filter(
      (t) =>
        t.status === "filled" &&
        t.filledAt?.startsWith(today) &&
        (t.ticker === ticker || t.action === "sell"),
    ).length;
    if (dayTrades >= 3) {
      return { allowed: false, reason: "PDT guard — 3 day trades today (paper caution)" };
    }
  }

  return { allowed: true, reason: "ok" };
}

export function riskLimitsForProfile(riskProfile: string): CapitalRiskLimits {
  return defaultRiskLimits(riskProfile);
}
