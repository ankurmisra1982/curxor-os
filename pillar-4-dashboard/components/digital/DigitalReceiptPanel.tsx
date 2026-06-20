"use client";

import type { DigitalReceipt } from "@/lib/digital-protocol";
import { formatPostReceipt } from "@/lib/digital-protocol";

interface DigitalReceiptPanelProps {
  title: string;
  toolFilter: string;
  receipts: DigitalReceipt[];
  latest: DigitalReceipt | null;
  connected: boolean;
  formatReceipt?: (receipt: DigitalReceipt) => string;
}

export function DigitalReceiptPanel({
  title,
  toolFilter,
  receipts,
  latest,
  connected,
  formatReceipt = formatPostReceipt,
}: DigitalReceiptPanelProps) {
  const filtered = receipts.filter((r) => r.tool === toolFilter);

  return (
    <section className="border border-line bg-void">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stark">{title}</h2>
          <p className="mt-1 font-mono text-[10px] text-muted">
            telemetry/digital_in · bridge receipts · SSE live
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? "animate-pulse-cursor bg-cursor-glow shadow-cursor" : "bg-line"}`}
          />
          <span className={connected ? "text-cursor-glow" : "text-muted"}>{connected ? "LIVE" : "OFFLINE"}</span>
        </div>
      </header>
      <div className="max-h-48 overflow-y-auto p-4 font-mono text-xs">
        {latest && latest.tool === toolFilter ? (
          <div
            className={`mb-3 border px-3 py-2 ${latest.ok ? "border-cursor-glow/50 bg-surface" : "border-red-900/50 bg-panel"}`}
          >
            <div className="text-[10px] uppercase tracking-widest text-muted">Latest</div>
            <div className={latest.ok ? "text-cursor-glow" : "text-red-400"}>{formatReceipt(latest)}</div>
          </div>
        ) : null}
        {filtered.length === 0 ? (
          <p className="text-muted">Awaiting digital bridge receipts…</p>
        ) : (
          filtered
            .slice()
            .reverse()
            .map((r) => (
              <div key={r.id + r.timestamp} className="border-b border-line/40 py-2 last:border-0">
                <span className="text-[10px] text-muted">{r.timestamp}</span>
                <div className={r.ok ? "text-stark" : "text-red-400"}>{formatReceipt(r)}</div>
              </div>
            ))
        )}
      </div>
    </section>
  );
}
