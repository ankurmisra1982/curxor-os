"use client";

import { useMemo, useState } from "react";

import type { CapitalTrade } from "@/lib/capital-queue-types";

function statusClass(status: CapitalTrade["status"]): string {
  if (status === "filled" || status === "dry_run" || status === "simulated") return "text-cursor-glow";
  if (status === "failed") return "text-red-400";
  if (status === "pending_approval" || status === "blocked_risk") return "text-amber-400";
  return "text-stark";
}

type ApprovalFilter = "all" | "auto" | "manual_approval" | "blocked";

const FILTERS: Array<{ id: ApprovalFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "auto", label: "Auto-approved" },
  { id: "manual_approval", label: "Needed approval" },
  { id: "blocked", label: "Blocked / failed" },
];

function matchesFilter(trade: CapitalTrade, filter: ApprovalFilter): boolean {
  const note = (trade.approvalNote ?? "").toLowerCase();
  if (filter === "all") return true;
  if (filter === "auto") return note.includes("auto-approved") || note.includes("auto approved");
  if (filter === "manual_approval") {
    return (
      trade.status === "pending_approval" ||
      note.includes("approval required") ||
      note.includes("pending approval")
    );
  }
  return trade.status === "blocked_risk" || trade.status === "failed" || note.startsWith("blocked");
}

interface CapitalTradeLogPanelProps {
  trades: CapitalTrade[];
  onRetry: (tradeId: string) => void;
  onApprove: (tradeId: string) => void;
  selectedTradeId?: string | null;
  onSelect?: (tradeId: string) => void;
}

export function CapitalTradeLogPanel({
  trades,
  onRetry,
  onApprove,
  selectedTradeId,
  onSelect,
}: CapitalTradeLogPanelProps) {
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const filtered = useMemo(
    () => trades.filter((t) => matchesFilter(t, filter)).slice(0, 12),
    [filter, trades],
  );

  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`border px-2 py-0.5 text-[9px] uppercase ${
              filter === f.id ? "border-cursor-glow text-cursor-glow" : "border-line text-muted hover:text-stark"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-[11px] text-muted">No trades match this filter.</p>
      ) : (
        filtered.map((t) => (
          <div
            key={t.id}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={onSelect ? () => onSelect(t.id) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(t.id);
                  }
                : undefined
            }
            className={`grid grid-cols-[1fr_auto] gap-2 border px-3 py-2 ${
              selectedTradeId === t.id ? "border-cursor-glow bg-panel/50" : "border-line"
            } ${onSelect ? "cursor-pointer" : ""}`}
          >
            <div>
              <p className="text-stark">
                {t.action.toUpperCase()} {t.qty} {t.ticker}
              </p>
              <p className="text-[10px] text-muted">
                {t.id}
                {t.ruleId ? ` · ${t.ruleId}` : ""}
                {t.source ? ` · ${t.source}` : ""}
                {t.filledPrice != null ? ` · @ ${t.filledPrice}` : ""}
              </p>
              {t.approvalNote ? (
                <p className="mt-0.5 text-[10px] font-medium text-cursor-glow">{t.approvalNote}</p>
              ) : null}
              {t.error ? <p className="text-[10px] text-red-400">{t.error}</p> : null}
            </div>
            <div className="text-right">
              <p className={`text-[10px] uppercase ${statusClass(t.status)}`}>{t.status}</p>
              {t.status === "failed" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(t.id);
                  }}
                  className="mt-1 border border-line px-1 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
                >
                  Retry
                </button>
              ) : null}
              {t.status === "pending_approval" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(t.id);
                  }}
                  className="mt-1 border border-cursor-glow px-1 py-0.5 text-[9px] uppercase text-cursor-glow"
                >
                  Submit
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
