"use client";

import { useCallback, useEffect, useState } from "react";

import type { TeamClawState } from "@/lib/team-status";

interface TeamStatusRow {
  appId: string;
  label: string;
  state: TeamClawState;
  detail?: string;
}

const DOT_CLASS: Record<TeamClawState, string> = {
  idle: "bg-muted",
  running: "bg-cursor-glow animate-pulse",
  awaiting: "bg-amber-400",
  paused: "bg-amber-600",
};

interface TeamStatusPanelProps {
  compact?: boolean;
}

export function TeamStatusPanel({ compact = false }: TeamStatusPanelProps) {
  const [rows, setRows] = useState<TeamStatusRow[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/shell/team-status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { claws: TeamStatusRow[] };
      setRows(data.claws ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (rows.length === 0) return null;

  return (
    <div className={compact ? "space-y-2" : "border-t border-line pt-3"}>
      {!compact ? (
        <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted">Team status</p>
      ) : null}
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.appId} className="flex items-center justify-between gap-2 font-sans text-xs">
            <span className="flex items-center gap-2 text-stark">
              <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[row.state]}`} aria-hidden />
              {row.label}
            </span>
            {row.detail ? <span className="font-mono text-[9px] text-muted">{row.detail}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
