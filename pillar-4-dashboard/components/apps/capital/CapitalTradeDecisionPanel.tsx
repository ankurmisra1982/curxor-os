"use client";

import { buildTradeDecisionTimeline } from "@/lib/capital-trade-decision";
import type { CapitalTrade } from "@/lib/capital-queue-types";

function stepClass(status: "pass" | "warn" | "fail" | "info"): string {
  if (status === "pass") return "text-cursor-glow";
  if (status === "fail") return "text-red-400";
  if (status === "warn") return "text-amber-400";
  return "text-muted";
}

interface CapitalTradeDecisionPanelProps {
  trade: CapitalTrade | null;
}

export function CapitalTradeDecisionPanel({ trade }: CapitalTradeDecisionPanelProps) {
  if (!trade) {
    return <p className="font-mono text-[10px] text-muted">Select a trade in the log to see the decision timeline.</p>;
  }

  const steps = buildTradeDecisionTimeline(trade);

  return (
    <div className="space-y-1 border border-line/60 bg-panel/30 p-2 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-cursor-glow">Trade decision timeline</p>
      <p className="text-muted">
        {trade.id} · {trade.action.toUpperCase()} {trade.qty} {trade.ticker}
      </p>
      <ul className="mt-2 space-y-1">
        {steps.map((step) => (
          <li key={step.id} className="grid grid-cols-[auto_1fr] gap-2 border-t border-line/30 pt-1">
            <span className={stepClass(step.status)}>{step.status === "pass" ? "✓" : step.status === "fail" ? "✗" : "·"}</span>
            <div>
              <p className="text-stark">{step.label}</p>
              <p className="text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
