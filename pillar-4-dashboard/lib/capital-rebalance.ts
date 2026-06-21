import "server-only";

import type { CapitalPosition, CapitalRule } from "./capital-queue-types";

export interface RebalanceSignal {
  ruleId: string;
  ticker: string;
  action: "buy" | "sell";
  qty: number;
  reason: string;
}

export function evaluateRebalanceRules(
  rules: CapitalRule[],
  positions: CapitalPosition[],
  portfolioValue: number | null,
): RebalanceSignal[] {
  if (!portfolioValue || portfolioValue <= 0) return [];
  const signals: RebalanceSignal[] = [];

  for (const rule of rules) {
    if (rule.kind !== "rebalance" || rule.state !== "ARMED") continue;
    const target = rule.targetWeight;
    const drift = rule.driftThresholdPct ?? 10;
    if (target == null) continue;

    const pos = positions.find((p) => p.symbol === rule.asset.replace("-", ""));
    const currentPct = pos ? (pos.marketValue / portfolioValue) * 100 : 0;
    const delta = currentPct - target;

    if (Math.abs(delta) < drift) continue;

    const notional = (Math.abs(delta) / 100) * portfolioValue;
    const price = pos?.avgEntryPrice || 100;
    const qty = Math.max(0.01, Math.round((notional / price) * 100) / 100);
    signals.push({
      ruleId: rule.id,
      ticker: rule.asset,
      action: delta > 0 ? "sell" : "buy",
      qty,
      reason: `Drift ${delta.toFixed(1)}% vs target ${target}%`,
    });
  }
  return signals;
}
