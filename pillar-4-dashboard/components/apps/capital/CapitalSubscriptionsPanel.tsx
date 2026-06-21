"use client";

import type { CapitalPilot, PilotSignal, PilotSubscription } from "@/lib/capital-queue-types";

interface CapitalSubscriptionsPanelProps {
  subscriptions: PilotSubscription[];
  pilots: CapitalPilot[];
  signals: PilotSignal[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onUnsubscribe: (id: string) => void;
  onSync: (id: string) => void;
}

export function CapitalSubscriptionsPanel({
  subscriptions,
  pilots,
  signals,
  onPause,
  onResume,
  onUnsubscribe,
  onSync,
}: CapitalSubscriptionsPanelProps) {
  const pilotName = (id: string) => pilots.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="space-y-3 font-mono text-xs">
      {subscriptions.length === 0 ? (
        <p className="text-[11px] text-muted">No active pilot subscriptions — browse the marketplace above.</p>
      ) : (
        subscriptions.map((s) => (
          <div key={s.id} className="border border-line px-3 py-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-stark">{pilotName(s.pilotId)}</span>
              <span className={s.state === "active" ? "text-cursor-glow" : "text-muted"}>{s.state}</span>
            </div>
            <p className="text-muted">
              {s.id} · ${s.allocationUsd.toLocaleString()} · {s.brokerId}
              {s.lastSyncedAt ? ` · synced ${new Date(s.lastSyncedAt).toLocaleString()}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.state === "active" ? (
                <button type="button" onClick={() => onPause(s.id)} className="border border-line px-1 py-0.5 text-[9px] uppercase">
                  Pause
                </button>
              ) : (
                <button type="button" onClick={() => onResume(s.id)} className="border border-cursor-glow px-1 py-0.5 text-[9px] uppercase text-cursor-glow">
                  Resume
                </button>
              )}
              <button type="button" onClick={() => onSync(s.id)} className="border border-line px-1 py-0.5 text-[9px] uppercase">
                Re-sync weights
              </button>
              <button type="button" onClick={() => onUnsubscribe(s.id)} className="border border-line px-1 py-0.5 text-[9px] uppercase text-red-400">
                Unsubscribe
              </button>
            </div>
          </div>
        ))
      )}
      {signals.length > 0 ? (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Recent pilot signals</p>
          {signals.slice(0, 5).map((sig) => (
            <div key={sig.id} className="border-b border-line/40 py-1 text-[10px] text-muted">
              {sig.action.toUpperCase()} {sig.pilotQty} {sig.ticker} · copied {sig.copiedCount} sub(s)
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
