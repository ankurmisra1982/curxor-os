"use client";

import type { TradePreview } from "@/lib/capital-queue-types";

interface CapitalOrderPreviewPanelProps {
  preview: TradePreview | null;
  loading?: boolean;
}

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export function CapitalOrderPreviewPanel({ preview, loading }: CapitalOrderPreviewPanelProps) {
  if (loading) {
    return <p className="font-mono text-[10px] text-muted">Building order preview…</p>;
  }
  if (!preview) {
    return <p className="font-mono text-[10px] text-muted">Select an armed rule to preview before submit.</p>;
  }

  return (
    <div className="border border-line bg-panel/40 p-2 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-cursor-glow">Order preview</p>
      <div className="mt-2 grid gap-1 md:grid-cols-2">
        <p>
          <span className="text-muted">Action · </span>
          <span className="text-stark">
            {preview.action.toUpperCase()} {preview.qty} {preview.ticker}
          </span>
        </p>
        <p>
          <span className="text-muted">Ref price · </span>
          <span className="text-stark">{formatUsd(preview.referencePrice)}</span>
        </p>
        <p>
          <span className="text-muted">Est. notional · </span>
          <span className="text-stark">{formatUsd(preview.estimatedNotionalUsd)}</span>
        </p>
        <p>
          <span className="text-muted">Broker · </span>
          <span className="text-stark">{preview.brokerId}</span>
        </p>
        <p>
          <span className="text-muted">Buying power · </span>
          <span className="text-stark">{formatUsd(preview.buyingPower)}</span>
        </p>
        <p>
          <span className="text-muted">Auto-approve · </span>
          <span className={preview.autoApproveEligible ? "text-cursor-glow" : "text-muted"}>
            {preview.autoApproveEligible ? "eligible" : "manual approval"}
          </span>
        </p>
      </div>
      {preview.riskNote ? (
        <p className="mt-2 border-l-2 border-red-400/60 pl-2 text-red-300">{preview.riskNote}</p>
      ) : (
        <p className="mt-2 text-muted">Risk guard passed — confirm to publish via digital bridge.</p>
      )}
    </div>
  );
}
