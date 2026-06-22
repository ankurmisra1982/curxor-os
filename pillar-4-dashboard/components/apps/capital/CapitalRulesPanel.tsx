"use client";



import { useEffect, useState } from "react";



import { CapitalBacktestCurve } from "@/components/apps/capital/CapitalBacktestCurve";

import { CapitalOrderPreviewPanel } from "@/components/apps/capital/CapitalOrderPreviewPanel";

import { CapitalRuleBuilder } from "@/components/apps/capital/CapitalRuleBuilder";

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

  defaultAsset?: string;

  onRunDemoTour?: () => void;

  onQuickCreateDipRule?: (asset: string) => void;

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

  defaultAsset,

  onRunDemoTour,

  onQuickCreateDipRule,

}: CapitalRulesPanelProps) {

  const selected = rules.find((r) => r.id === selectedRuleId);

  const [preview, setPreview] = useState<TradePreview | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);



  useEffect(() => {
    if (!selected || selected.state !== "ARMED") {
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



  return (

    <div className="space-y-2 font-mono text-xs">

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
          <p className="text-stark">No rules yet — start with a guided demo or a quick dip rule.</p>
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

        <div className="space-y-2 border border-line/60 p-2">

          {selected.backtest ? <CapitalBacktestCurve backtest={selected.backtest} /> : null}

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

            <button

              type="button"

              onClick={() => onExecute(selected.id)}

              disabled={selected.state !== "ARMED" || Boolean(preview?.riskNote)}

              className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow disabled:opacity-40"

            >

              Confirm & execute

            </button>

          </div>

        </div>

      ) : null}

    </div>

  );

}


