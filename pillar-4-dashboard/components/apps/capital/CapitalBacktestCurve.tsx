"use client";

import { CapitalBacktestCompareChart } from "@/components/apps/capital/CapitalBacktestCompareChart";
import type { RuleBacktestSummary } from "@/lib/capital-queue-types";

interface CapitalBacktestCurveProps {
  backtest: RuleBacktestSummary;
}

export function CapitalBacktestCurve({ backtest }: CapitalBacktestCurveProps) {
  const strategy = backtest.equityCurve ?? [];
  const benchmark = backtest.benchmarkCurve ?? [];

  if (strategy.length < 2) {
    return (
      <p className="font-mono text-[10px] text-muted">
        {backtest.note} · {backtest.fires90d} fires / 90d
      </p>
    );
  }

  const stratRet = backtest.strategyReturnPct;
  const benchRet = backtest.benchmarkReturnPct;
  const alpha =
    stratRet != null && benchRet != null ? Math.round((stratRet - benchRet) * 10) / 10 : null;

  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] text-muted">
        Backtest · {backtest.fires90d} fires / 90d
        {stratRet != null ? ` · strategy ${stratRet > 0 ? "+" : ""}${stratRet}%` : ""}
        {benchRet != null ? ` · SPY ${benchRet > 0 ? "+" : ""}${benchRet}%` : ""}
        {alpha != null ? ` · α ${alpha > 0 ? "+" : ""}${alpha}%` : ""}
      </p>
      <CapitalBacktestCompareChart strategy={strategy} benchmark={benchmark} />
    </div>
  );
}
