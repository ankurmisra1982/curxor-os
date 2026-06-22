"use client";

import { useState } from "react";

interface CrmConflictRow {
  id: string;
  email: string;
  field: string;
  localValue: string;
  remoteValue: string;
  leadId: string;
  resolvedAt?: string | null;
}

interface WorkCrmConflictPanelProps {
  conflicts: CrmConflictRow[];
  busyId?: string | null;
  onResolve: (conflictId: string, resolution: "keep_local" | "take_remote") => void;
}

export function WorkCrmConflictPanel({ conflicts, busyId, onResolve }: WorkCrmConflictPanelProps) {
  const [localBusy, setLocalBusy] = useState<string | null>(null);
  const busy = busyId ?? localBusy;

  if (conflicts.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No CRM field conflicts — local and remote records align (or Twenty is in demo mode).
      </p>
    );
  }

  const resolve = (id: string, resolution: "keep_local" | "take_remote") => {
    setLocalBusy(id);
    onResolve(id, resolution);
    window.setTimeout(() => setLocalBusy(null), 400);
  };

  return (
    <div className="space-y-2 font-mono text-[10px]">
      {conflicts.map((row) => (
        <div key={row.id} className="border border-amber-500/40 px-3 py-2">
          <p className="text-stark">
            {row.email} · <span className="uppercase text-amber-400">{row.field}</span>
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="border border-line/60 px-2 py-1">
              <p className="text-muted uppercase">Local</p>
              <p className="text-stark">{row.localValue}</p>
            </div>
            <div className="border border-line/60 px-2 py-1">
              <p className="text-muted uppercase">Remote</p>
              <p className="text-stark">{row.remoteValue}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              disabled={busy === row.id}
              onClick={() => resolve(row.id, "keep_local")}
              className="border border-cursor-glow px-1.5 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
            >
              Keep local
            </button>
            <button
              type="button"
              disabled={busy === row.id}
              onClick={() => resolve(row.id, "take_remote")}
              className="border border-line px-1.5 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-40"
            >
              Use remote
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
