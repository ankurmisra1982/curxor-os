"use client";

import type { OutboundSend } from "@/lib/work-queue-types";

interface WorkRecoveryPanelProps {
  failed: OutboundSend[];
  onRetry: (sendId: string) => void;
  onRefresh: () => void;
}

export function WorkRecoveryPanel({ failed, onRetry, onRefresh }: WorkRecoveryPanelProps) {
  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex gap-2">
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:text-stark">
          Refresh
        </button>
      </div>
      {failed.length === 0 ? (
        <p className="text-[11px] text-muted">No failed sends — bridge healthy.</p>
      ) : (
        failed.map((send) => (
          <div key={send.id} className="border border-red-400/40 px-3 py-2">
            <p className="text-stark">{send.subject}</p>
            <p className="text-[10px] text-muted">{send.to}</p>
            <p className="text-[10px] text-red-400">{send.error}</p>
            <button type="button" onClick={() => onRetry(send.id)} className="mt-1 border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow">
              Retry send
            </button>
          </div>
        ))
      )}
    </div>
  );
}
