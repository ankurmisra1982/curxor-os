"use client";

import type { SwarmWorkloadItem } from "@/lib/swarm-workload-types";
import { SWARM_SOURCE_LABELS } from "@/lib/swarm-workload-types";

interface SwarmWorkloadPanelProps {
  workloads: SwarmWorkloadItem[];
  selectedId: string | null;
  onSelect: (item: SwarmWorkloadItem) => void;
  onAssign: (item: SwarmWorkloadItem) => void;
  onComplete: (item: SwarmWorkloadItem) => void;
  loading?: boolean;
}

export function SwarmWorkloadPanel({
  workloads,
  selectedId,
  onSelect,
  onAssign,
  onComplete,
  loading,
}: SwarmWorkloadPanelProps) {
  if (workloads.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No cross-claw workloads yet — hand off from Work, Capital, or Creator desks.
      </p>
    );
  }

  return (
    <div className="space-y-2 font-mono text-xs">
      {workloads.map((item) => {
        const sourceLabel = SWARM_SOURCE_LABELS[item.source] ?? item.source;
        const isSelected = selectedId === item.id;
        return (
          <div
            key={item.id}
            className={`border px-3 py-2 ${isSelected ? "border-cursor-glow bg-surface" : "border-line bg-panel"}`}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(item)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-cursor-glow">{item.title}</span>
                <span className="text-[10px] uppercase text-muted">{item.status}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted">
                {sourceLabel} → {item.targetCell} · {item.priority}
              </p>
              {item.detail ? <p className="mt-1 text-[10px] text-muted">{item.detail}</p> : null}
            </button>
            {item.status === "pending" ? (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onAssign(item)}
                  className="border border-cursor-glow px-2 py-0.5 text-[10px] uppercase text-cursor-glow disabled:opacity-40"
                >
                  Route
                </button>
              </div>
            ) : null}
            {item.status === "assigned" ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => onComplete(item)}
                className="mt-2 border border-line px-2 py-0.5 text-[10px] uppercase text-muted hover:border-cursor-glow hover:text-cursor-glow disabled:opacity-40"
              >
                Mark done
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
