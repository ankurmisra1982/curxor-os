"use client";

import { CapitalBacktestCompareChart } from "@/components/apps/capital/CapitalBacktestCompareChart";
import type { RuleBacktestSummary, RuleState } from "@/lib/capital-queue-types";

interface CapitalBacktestCurveProps {
  backtest: RuleBacktestSummary;
  ruleState?: RuleState;
  autoApproveEligible?: boolean | null;
  previewLoading?: boolean;
  maxNotionalUsd?: number;
  paperOnly?: boolean;
  autoApprovalEnabled?: boolean;
  autoApproveArmedRules?: boolean;
  onArm?: () => void;
  onExecute?: () => void;
  executeDisabled?: boolean;
}

export function CapitalBacktestCurve({
  backtest,
  ruleState,
  autoApproveEligible,
  previewLoading,
  maxNotionalUsd = 500,
  paperOnly = true,
  autoApprovalEnabled = false,
  autoApproveArmedRules = false,
  onArm,
  onExecute,
  executeDisabled,
}: CapitalBacktestCurveProps) {
  const strategy = backtest.equityCurve ?? [];
  const benchmark = backtest.benchmarkCurve ?? [];
  const armed = ruleState === "ARMED";

  const showEligibleBadge =
    autoApprovalEnabled &&
    autoApproveArmedRules &&
    !previewLoading &&
    autoApproveEligible != null;

  const badgeLabel = showEligibleBadge
    ? autoApproveEligible
      ? "Auto-approval eligible"
      : "Needs manual approval"
    : null;

  if (strategy.length < 2) {
    return (
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted">
          {backtest.note} · {backtest.fires90d} fires / 90d
        </p>
        {onArm && !armed ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onArm}
              className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow"
            >
              Arm rule
            </button>
            {previewLoading ? (
              <span className="text-[9px] text-muted">Checking auto-approval…</span>
            ) : badgeLabel ? (
              <span
                className={`border px-1 text-[9px] uppercase ${
                  autoApproveEligible
                    ? "border-cursor-glow/50 text-cursor-glow"
                    : "border-amber-500/40 text-amber-300"
                }`}
              >
                {badgeLabel}
              </span>
            ) : null}
          </div>
        ) : null}
        {armed && badgeLabel ? (
          <span
            className={`inline-block border px-1 text-[9px] uppercase ${
              autoApproveEligible
                ? "border-cursor-glow/50 text-cursor-glow"
                : "border-amber-500/40 text-amber-300"
            }`}
          >
            {badgeLabel}
          </span>
        ) : null}
      </div>
    );
  }

  const stratRet = backtest.strategyReturnPct;
  const benchRet = backtest.benchmarkReturnPct;
  const alpha =
    stratRet != null && benchRet != null ? Math.round((stratRet - benchRet) * 10) / 10 : null;

  const modeLabel = paperOnly ? "paper" : "live";

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] text-muted">
        Backtest · {backtest.fires90d} fires / 90d
        {stratRet != null ? ` · strategy ${stratRet > 0 ? "+" : ""}${stratRet}%` : ""}
        {benchRet != null ? ` · SPY ${benchRet > 0 ? "+" : ""}${benchRet}%` : ""}
        {alpha != null ? ` · α ${alpha > 0 ? "+" : ""}${alpha}%` : ""}
      </p>
      <CapitalBacktestCompareChart strategy={strategy} benchmark={benchmark} />

      <div className="flex flex-wrap items-center gap-2">
        {onArm && !armed ? (
          <>
            <button
              type="button"
              onClick={onArm}
              className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow"
            >
              Arm rule
            </button>
            <p className="text-[9px] text-muted">
              Activate — auto-runs on {modeLabel} when conditions fire (≤${maxNotionalUsd}, risk guard pass)
            </p>
          </>
        ) : null}
        {armed && badgeLabel ? (
          <span
            className={`border px-1 text-[9px] uppercase ${
              autoApproveEligible
                ? "border-cursor-glow/50 text-cursor-glow"
                : "border-amber-500/40 text-amber-300"
            }`}
          >
            {badgeLabel}
          </span>
        ) : !armed && previewLoading ? (
          <span className="text-[9px] text-muted">Checking auto-approval…</span>
        ) : !armed && badgeLabel ? (
          <span
            className={`border px-1 text-[9px] uppercase ${
              autoApproveEligible
                ? "border-cursor-glow/50 text-cursor-glow"
                : "border-amber-500/40 text-amber-300"
            }`}
          >
            {badgeLabel}
          </span>
        ) : null}
        {!armed && onExecute ? (
          <button
            type="button"
            onClick={onExecute}
            disabled={executeDisabled}
            className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:text-stark disabled:opacity-40"
          >
            Execute now
          </button>
        ) : null}
      </div>
    </div>
  );
}
