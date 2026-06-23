"use client";

import { useCallback, useEffect, useState } from "react";

import type { PilotLeaderboardRow, PilotLeaderboardWindow } from "@/lib/capital-alpha-types";

const WINDOWS: { id: PilotLeaderboardWindow; label: string }[] = [
  { id: "w1", label: "24h" },
  { id: "m1", label: "7d" },
  { id: "m3", label: "30d" },
  { id: "y1", label: "1Y" },
];

interface CapitalPilotLeaderboardPanelProps {
  onPilotClick?: (pilotId: string) => void;
}

export function CapitalPilotLeaderboardPanel({ onPilotClick }: CapitalPilotLeaderboardPanelProps) {
  const [window, setWindow] = useState<PilotLeaderboardWindow>("m1");
  const [rows, setRows] = useState<PilotLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (win: PilotLeaderboardWindow) => {
    setLoading(true);
    try {
      const res = await fetch("/api/capital/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pilot_leaderboard", window: win }),
      });
      const json = (await res.json()) as { rows?: PilotLeaderboardRow[] };
      if (json.rows) setRows(json.rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(window);
  }, [window, load]);

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted uppercase tracking-widest">Pilot leaderboard</p>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWindow(w.id)}
              className={`border px-1.5 py-0.5 ${window === w.id ? "border-cursor-glow text-cursor-glow" : "border-line/50 text-muted"}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      {loading && rows.length === 0 ? <p className="text-muted">Loading…</p> : null}
      {rows.map((r, i) => (
        <button
          key={r.pilotId}
          type="button"
          onClick={() => onPilotClick?.(r.pilotId)}
          className="flex w-full items-center justify-between border-b border-line/30 py-1 text-left hover:text-cursor-glow"
        >
          <span className="text-stark">
            #{i + 1} {r.name}
            {r.subscribed ? <span className="ml-1 text-cursor-glow">· subscribed</span> : null}
          </span>
          <span className={r.returnPct >= 0 ? "text-cursor-glow" : "text-red-400"}>
            {r.returnPct >= 0 ? "+" : ""}
            {r.returnPct.toFixed(1)}%
          </span>
        </button>
      ))}
    </div>
  );
}
