"use client";

import type { CapitalTrade } from "@/lib/capital-queue-types";

function statusClass(status: CapitalTrade["status"]): string {
  if (status === "filled" || status === "dry_run" || status === "simulated") return "text-cursor-glow";
  if (status === "failed") return "text-red-400";
  if (status === "pending_approval" || status === "blocked_risk") return "text-amber-400";
  return "text-stark";
}

interface CapitalRecentTradesStripProps {
  trades: CapitalTrade[];
  onViewAll?: () => void;
}

export function CapitalRecentTradesStrip({ trades, onViewAll }: CapitalRecentTradesStripProps) {
  const recent = [...trades].slice(0, 5);
  if (recent.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No trades yet — run the demo tour in Go Live or arm a rule to execute.
      </p>
    );
  }

  return (
    <div className="space-y-1 font-mono text-[10px]">
      <div className="flex items-center justify-between">
        <p className="uppercase tracking-widest text-muted">Recent trades</p>
        {onViewAll ? (
          <button type="button" onClick={onViewAll} className="text-[9px] uppercase text-cursor-glow">
            View all
          </button>
        ) : null}
      </div>
      {recent.map((t) => (
        <div key={t.id} className="flex justify-between border-b border-line/40 py-1">
          <span className="text-stark">
            {t.action.toUpperCase()} {t.qty} {t.ticker}
          </span>
          <span className={statusClass(t.status)}>
            {t.status}
            {t.filledPrice != null ? ` · $${t.filledPrice.toFixed(2)}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
