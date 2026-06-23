"use client";

import type { CapitalTrade } from "@/lib/capital-queue-types";

interface CapitalPendingTradesBannerProps {
  trades: CapitalTrade[];
  highlightTradeId?: string | null;
  onApprove: (tradeId: string) => void;
  onApproveAll: () => void;
  onViewTradeLog?: () => void;
}

function sourceLabel(source: CapitalTrade["source"]): string {
  if (source === "agent") return "agent";
  if (source === "autonomous") return "rule";
  if (source === "pilot_copy") return "pilot";
  if (source === "tradingview") return "tradingview";
  return "manual";
}

export function CapitalPendingTradesBanner({
  trades,
  highlightTradeId,
  onApprove,
  onApproveAll,
  onViewTradeLog,
}: CapitalPendingTradesBannerProps) {
  const pending = trades.filter((t) => t.status === "pending_approval");
  if (pending.length === 0) return null;

  return (
    <div id="capital-pending-approvals" className="border border-amber-500/50 bg-amber-500/10 px-4 py-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-amber-300">
          {pending.length} trade{pending.length === 1 ? "" : "s"} awaiting approval — auto-approval off or over cap
        </p>
        <div className="flex flex-wrap gap-2">
          {onViewTradeLog ? (
            <button
              type="button"
              onClick={onViewTradeLog}
              className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
            >
              View trade log
            </button>
          ) : null}
          {pending.length > 1 ? (
            <button
              type="button"
              onClick={onApproveAll}
              className="border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
            >
              Approve all
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {pending.slice(0, 4).map((t) => (
          <div
            key={t.id}
            data-trade-id={t.id}
            className={`flex flex-wrap items-center justify-between gap-2 border-t pt-1 ${
              highlightTradeId === t.id
                ? "border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/50"
                : "border-amber-500/20"
            }`}
          >
            <div>
              <span className="text-stark">
                {t.action.toUpperCase()} {t.qty} {t.ticker}
              </span>
              <span className="text-muted"> · {sourceLabel(t.source)}</span>
              {t.approvalNote ? <p className="text-[10px] text-amber-200/90">{t.approvalNote}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => onApprove(t.id)}
              className="border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
            >
              Approve & submit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
