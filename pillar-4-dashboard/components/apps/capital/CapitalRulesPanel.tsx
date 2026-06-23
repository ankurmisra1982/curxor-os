"use client";

import { useEffect, useRef, useState } from "react";

import { CapitalBacktestCurve } from "@/components/apps/capital/CapitalBacktestCurve";
import { CapitalOrderPreviewPanel } from "@/components/apps/capital/CapitalOrderPreviewPanel";
import { CapitalRuleBuilder } from "@/components/apps/capital/CapitalRuleBuilder";
import { autoApprovalSummary, type AutoApprovalPolicy } from "@/lib/capital-auto-approval-types";
import type { CapitalRule, TradePreview } from "@/lib/capital-queue-types";

interface CapitalRulesPanelProps {
  rules: CapitalRule[];
  selectedRuleId: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onExecute: (id: string) => void;
  onBacktest?: (id: string) => void;
  onCreate?: () => void;
  onCreateStructured?: (input: {
    name: string;
    asset: string;
    conditionType: CapitalRule["conditionType"];
    conditionParams: Record<string, number | string>;
    action: CapitalRule["action"];
    qty: number;
    takeProfitPct?: number;
    stopLossPct?: number;
    kind?: "signal" | "rebalance";
    targetWeight?: number;
    driftThresholdPct?: number;
  }) => void;
  onDescribeRule?: (description: string) => Promise<{ ok: boolean; ruleId?: string; error?: string }>;
  defaultAsset?: string;
  onRunDemoTour?: () => void;
  onQuickCreateDipRule?: (asset: string) => void;
  autoApproval?: AutoApprovalPolicy;
}

export function CapitalRulesPanel({
  rules,
  selectedRuleId,
  onSelect,
  onToggle,
  onExecute,
  onBacktest,
  onCreate,
  onCreateStructured,
  onDescribeRule,
  defaultAsset,
  onRunDemoTour,
  onQuickCreateDipRule,
  autoApproval,
}: CapitalRulesPanelProps) {
  const selected = rules.find((r) => r.id === selectedRuleId);
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [describeText, setDescribeText] = useState("");
  const [describeBusy, setDescribeBusy] = useState(false);
  const [describeError, setDescribeError] = useState<string | null>(null);
  const backtestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    setPreviewLoading(true);

    void fetch("/api/capital/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        action: "preview_trade",
        ticker: selected.asset,
        qty: selected.qty,
        actionTrade: selected.action,
        brokerId: selected.brokerId,
      }),
    })
      .then((res) => res.json())
      .then((json: { preview?: TradePreview }) => {
        if (!controller.signal.aborted) setPreview(json.preview ?? null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreview(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });

    return () => controller.abort();
  }, [selected?.id, selected?.asset, selected?.qty, selected?.action, selected?.brokerId, selected?.state]);

  const submitDescribe = () => {
    if (!onDescribeRule || !describeText.trim()) return;
    setDescribeBusy(true);
    setDescribeError(null);
    void onDescribeRule(describeText.trim())
      .then((result) => {
        if (!result.ok) {
          setDescribeError(result.error ?? "Could not create rule");
          return;
        }
        setDescribeText("");
        if (result.ruleId) {
          onSelect(result.ruleId);
          requestAnimationFrame(() => {
            backtestRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
      })
      .finally(() => setDescribeBusy(false));
  };

  const policy = autoApproval;

  return (
    <div className="space-y-2 font-mono text-xs">
      {onDescribeRule ? (
        <div className="border border-cursor-glow/40 bg-panel p-3">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-cursor-glow">Describe your strategy</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={describeText}
              onChange={(e) => setDescribeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitDescribe();
              }}
              placeholder='e.g. "Buy NVDA on 5% dip, sell half on +10%"'
              className="min-w-0 flex-1 border border-line bg-transparent px-2 py-1 text-[10px] text-stark placeholder:text-muted"
            />
            <button
              type="button"
              disabled={describeBusy || !describeText.trim()}
              onClick={submitDescribe}
              className="shrink-0 border border-cursor-glow px-2 py-1 text-[10px] uppercase text-cursor-glow disabled:opacity-40"
            >
              {describeBusy ? "Building…" : "Build rule"}
            </button>
          </div>
          {describeError ? <p className="mt-1 text-[10px] text-red-400">{describeError}</p> : null}
          <p className="mt-1 text-[9px] text-muted">
            One sentence → structured rule + backtest. Composer-style — runs locally on your box.
          </p>
        </div>
      ) : null}

      <div className="mb-2 border border-line bg-panel p-3 text-[10px] text-muted">
        WHEN [condition] THEN [action] — rules evaluate locally; trades publish to telemetry/digital_out
      </div>

      {onCreateStructured ? (
        <CapitalRuleBuilder defaultAsset={defaultAsset} onCreate={onCreateStructured} />
      ) : onCreate ? (
        <div className="flex justify-end">
          <button type="button" onClick={onCreate} className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow">
            + Rule
          </button>
        </div>
      ) : null}

      {rules.length === 0 ? (
        <div className="border border-line/60 bg-panel px-3 py-3 text-[10px] text-muted">
          <p className="text-stark">No rules yet — describe a strategy above or start with a guided demo.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {onRunDemoTour ? (
              <button
                type="button"
                onClick={onRunDemoTour}
                className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow"
              >
                Run demo tour
              </button>
            ) : null}
            {onQuickCreateDipRule ? (
              <button
                type="button"
                onClick={() => onQuickCreateDipRule(defaultAsset ?? "SPY")}
                className="border border-line px-2 py-0.5 uppercase text-stark hover:border-cursor-glow hover:text-cursor-glow"
              >
                Quick dip rule · {defaultAsset ?? "SPY"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-widest text-muted">
            <th className="py-2 text-left">Rule</th>
            <th className="py-2 text-left">Asset</th>
            <th className="py-2 text-left">Kind</th>
            <th className="py-2 text-right">State</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`cursor-pointer border-b border-line/50 ${selectedRuleId === r.id ? "bg-surface" : ""}`}
            >
              <td className="py-2">
                <div className="text-cursor-glow">{r.id}</div>
                <div className="text-[10px] text-stark">{r.name}</div>
                <div className="text-[10px] text-muted">{r.conditionType ?? r.condition}</div>
                {r.backtest ? (
                  <div className="text-[10px] text-muted">Backtest: {r.backtest.fires90d} fires / 90d</div>
                ) : null}
                {r.state === "ARMED" && policy ? (
                  <div className="mt-1 text-[9px]">
                    {policy.enabled && policy.autoApproveArmedRules ? (
                      <span className="text-cursor-glow">{autoApprovalSummary(policy)}</span>
                    ) : (
                      <span className="text-amber-300">Manual approval required</span>
                    )}
                  </div>
                ) : null}
              </td>
              <td className="py-2">
                {r.asset}
                <div className="text-[10px] text-muted">
                  {r.action} · qty {r.qty}
                </div>
              </td>
              <td className="py-2 text-[10px] text-muted">{r.kind ?? "signal"}</td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(r.id);
                  }}
                  className={r.state === "ARMED" ? "text-cursor-glow" : "text-muted"}
                >
                  {r.state}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected ? (
        <div ref={backtestRef} className="space-y-2 border border-line/60 p-2">
          {selected.backtest ? (
            <CapitalBacktestCurve
              backtest={selected.backtest}
              ruleState={selected.state}
              autoApproveEligible={preview?.autoApproveEligible ?? null}
              previewLoading={previewLoading}
              maxNotionalUsd={policy?.maxNotionalUsd ?? 500}
              paperOnly={policy?.paperOnly ?? true}
              autoApprovalEnabled={policy?.enabled ?? false}
              autoApproveArmedRules={policy?.autoApproveArmedRules ?? false}
              onArm={() => {
                if (selected.state !== "ARMED") onToggle(selected.id);
              }}
              onExecute={() => onExecute(selected.id)}
              executeDisabled={selected.state !== "ARMED" || Boolean(preview?.riskNote)}
            />
          ) : null}

          <CapitalOrderPreviewPanel preview={preview} loading={previewLoading} />

          <div className="flex flex-wrap gap-2">
            {onBacktest ? (
              <button
                type="button"
                onClick={() => onBacktest(selected.id)}
                className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:text-stark"
              >
                Re-run backtest
              </button>
            ) : null}
            {selected.state === "ARMED" ? (
              <button
                type="button"
                onClick={() => onExecute(selected.id)}
                disabled={Boolean(preview?.riskNote)}
                className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:text-stark disabled:opacity-40"
              >
                Execute now
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
