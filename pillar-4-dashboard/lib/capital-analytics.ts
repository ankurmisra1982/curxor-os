import "server-only";

import type { CapitalRule, CapitalTrade, CapitalPosition } from "./capital-queue-types";
import type { CapitalTradeAnalytics, PortfolioBenchmark, RuleScorecard } from "./capital-analytics-types";

export type { CapitalTradeAnalytics, PortfolioBenchmark, RuleScorecard } from "./capital-analytics-types";

const EXECUTED = new Set(["filled", "simulated", "submitted"]);

function tradeNotional(t: CapitalTrade): number | null {
  if (t.filledPrice == null || !Number.isFinite(t.filledPrice)) return null;
  return Math.round(t.filledPrice * t.qty * 100) / 100;
}

/** Win rate from sells priced above average prior buy cost for that symbol. */
function computeSellWinRate(trades: CapitalTrade[]): number | null {
  const sorted = [...trades]
    .filter((t) => EXECUTED.has(t.status))
    .sort((a, b) => Date.parse(a.filledAt ?? a.createdAt) - Date.parse(b.filledAt ?? b.createdAt));

  const avgCost = new Map<string, { qty: number; cost: number }>();
  let wins = 0;
  let sells = 0;

  for (const t of sorted) {
    const sym = t.ticker.toUpperCase();
    const px = t.filledPrice ?? 0;
    if (px <= 0) continue;

    if (t.action === "buy") {
      const row = avgCost.get(sym) ?? { qty: 0, cost: 0 };
      row.cost += px * t.qty;
      row.qty += t.qty;
      avgCost.set(sym, row);
    } else if (t.action === "sell") {
      sells += 1;
      const row = avgCost.get(sym);
      const entry = row && row.qty > 0 ? row.cost / row.qty : px;
      if (px > entry) wins += 1;
      if (row) {
        row.qty = Math.max(0, row.qty - t.qty);
        row.cost = row.qty > 0 ? entry * row.qty : 0;
        avgCost.set(sym, row);
      }
    }
  }

  return sells > 0 ? Math.round((wins / sells) * 1000) / 10 : null;
}

export function buildCapitalTradeAnalytics(
  trades: CapitalTrade[],
  dailyPnlPct: number | null,
): CapitalTradeAnalytics {
  const todayStart = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const executed = trades.filter((t) => EXECUTED.has(t.status));
  const filledToday = executed.filter(
    (t) => t.filledAt && Date.parse(t.filledAt) >= todayStart,
  ).length;

  const bySource: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const t of trades) {
    const src = t.source ?? "manual";
    bySource[src] = (bySource[src] ?? 0) + 1;
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  }

  const winRatePct = computeSellWinRate(trades);

  const notionals = executed.map(tradeNotional).filter((n): n is number => n != null);
  const avgNotionalUsd =
    notionals.length > 0
      ? Math.round((notionals.reduce((a, b) => a + b, 0) / notionals.length) * 100) / 100
      : null;

  return {
    filledToday,
    filledTotal: trades.filter((t) => t.status === "filled").length,
    simulatedTotal: trades.filter((t) => t.status === "simulated").length,
    pendingApproval: trades.filter((t) => t.status === "pending_approval").length,
    failedTotal: trades.filter((t) => t.status === "failed").length,
    winRatePct,
    avgNotionalUsd,
    bySource,
    byStatus,
    dailyPnlPct,
  };
}

export function buildRuleScorecards(rules: CapitalRule[], trades: CapitalTrade[]): RuleScorecard[] {
  return rules.map((rule) => {
    const ruleTrades = trades.filter((t) => t.ruleId === rule.id && EXECUTED.has(t.status));
    const bt = rule.backtest;
    const strat = bt?.strategyReturnPct ?? null;
    const bench = bt?.benchmarkReturnPct ?? null;
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      asset: rule.asset,
      kind: rule.kind,
      state: rule.state,
      firesBacktest: bt?.fires90d ?? 0,
      fillsLive: ruleTrades.length,
      lastFiredAt: rule.lastFiredAt ?? ruleTrades[0]?.filledAt ?? null,
      strategyReturnPct: strat,
      benchmarkReturnPct: bench,
      alphaVsSpyPct:
        strat != null && bench != null ? Math.round((strat - bench) * 10) / 10 : null,
    };
  });
}

export function buildPortfolioBenchmark(
  trades: CapitalTrade[],
  positions: CapitalPosition[],
  dailyPnlPct: number | null,
  spyDailyPct: number | null = null,
): PortfolioBenchmark {
  const asOf = new Date().toISOString();

  const totalMv = positions.reduce((s, p) => s + (p.marketValue ?? 0), 0);
  const totalCost = positions.reduce((s, p) => s + p.qty * (p.avgEntryPrice || 0), 0);
  let portfolioReturnPct: number | null =
    totalCost > 0 && totalMv > 0 ? Math.round(((totalMv - totalCost) / totalCost) * 1000) / 10 : dailyPnlPct;

  if (portfolioReturnPct == null && positions.length === 0) {
    portfolioReturnPct = dailyPnlPct;
  }

  const spyReturnPct: number | null = spyDailyPct ?? dailyPnlPct;

  const alphaPct =
    portfolioReturnPct != null && spyReturnPct != null
      ? Math.round((portfolioReturnPct - spyReturnPct) * 10) / 10
      : null;

  return {
    portfolioReturnPct,
    spyReturnPct,
    alphaPct,
    label:
      spyDailyPct != null
        ? "Portfolio cost basis vs SPY 1d"
        : portfolioReturnPct != null
          ? "Portfolio vs desk daily P&L"
          : "Awaiting positions",
    asOf,
  };
}
