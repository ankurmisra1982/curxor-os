"use client";

import type { CapitalTrade } from "@/lib/capital-queue-types";

interface CapitalRecoveryPanelProps {
  failed: CapitalTrade[];
  onRetry: (tradeId: string) => void;
  onRefresh: () => void;
}

export function CapitalRecoveryPanel({ failed, onRetry, onRefresh }: CapitalRecoveryPanelProps) {
  return (
    <div className="space-y-2 font-mono text-xs">
      <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:text-stark">
        Refresh
      </button>
      {failed.length === 0 ? (
        <p className="text-[11px] text-muted">No failed trades — Alpaca bridge healthy.</p>
      ) : (
        failed.map((t) => (
          <div key={t.id} className="border border-red-400/40 px-3 py-2">
            <p className="text-stark">
              {t.action} {t.qty} {t.ticker}
            </p>
            <p className="text-[10px] text-red-400">{t.error}</p>
            <button type="button" onClick={() => onRetry(t.id)} className="mt-1 border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow">
              Retry trade
            </button>
          </div>
        ))
      )}
    </div>
  );
}
